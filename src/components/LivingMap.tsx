import { useEffect, useRef, useState } from "react";
import { useScroll, useMotionValueEvent } from "framer-motion";
import { BloomGlyph } from "./Logo";
import { useReducedMotion } from "../hooks/useReducedMotion";
import {
  DEFAULT_DISTANCE,
  DEFAULT_FLATTEN_Y,
  DEFAULT_FOCAL,
  NODES,
  RING_RADII,
  ringOutline,
  advanceParticle,
  connectionPoint,
  depthAlpha,
  makeParticle,
  nodeAtPointer,
  nodePosition,
  particleFade,
  pointerInfluence,
  project,
  rotateX,
  rotateY,
  withAlpha,
  type Camera,
  type Particle,
  type Pointer,
  type Projected,
  type Vec3,
} from "../lib/constellation";

const PARTICLES_PER_ARC = 14;
const ARC_SAMPLES = 26;
const RING_SAMPLES = 96;
const MAX_DPR = 1.5;
const IDLE_SPIN_DEG_PER_SEC = 3.4;
const BASE_TILT = -16;
const HOVER_RADIUS = 104;
const LABEL_MIN_WIDTH = 700;
/** The stage width the world layout is tuned for. */
const DESIGN_WIDTH = 1024;

/** Pre-rendered glow sprites — far cheaper than shadowBlur per particle. */
function makeSprite(color: string): HTMLCanvasElement {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, withAlpha(color, 1));
  gradient.addColorStop(0.28, withAlpha(color, 0.55));
  gradient.addColorStop(1, withAlpha(color, 0));
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  return canvas;
}

/**
 * The Living Map.
 *
 * The nine surfaces and their connections to the mark, rendered as a real 3D
 * system: arcs bow through space, particles stream along them, the whole field
 * turns with scroll, and the pointer bends whatever comes near it. Hovering a
 * surface focuses it — its arc lights, its label lifts, and the readout below
 * tells you what it does. Clicking one takes you there.
 *
 * It is a canvas because it is a continuous field, not a set of elements: one
 * composited pass per frame, no layout, no DOM churn.
 */
export function LivingMap({ className = "" }: { className?: string }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: wrapRef,
    offset: ["start end", "end start"],
  });

  const [focused, setFocused] = useState(-1);
  const [loaded, setLoaded] = useState(false);

  // Everything mutable lives in refs so the render loop is created once.
  const scrollRef = useRef(0);
  useMotionValueEvent(scrollYProgress, "change", (value) => {
    scrollRef.current = value;
  });

  const pointerRef = useRef<Pointer>({ x: 0, y: 0, active: false });
  const focusRef = useRef(-1);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const sprites = new Map<string, HTMLCanvasElement>();
    const spriteFor = (color: string) => {
      let sprite = sprites.get(color);
      if (!sprite) {
        sprite = makeSprite(color);
        sprites.set(color, sprite);
      }
      return sprite;
    };

    const baseWorld: Vec3[] = NODES.map(nodePosition);
    let world: Vec3[] = baseWorld.map((p) => ({ ...p }));
    // The stage is a different size on every screen; scale the whole system to
    // fill it rather than letting it shrink into the middle on small canvases.
    const applyFit = () => {
      const fit = Math.min(1.15, Math.max(0.42, width / DESIGN_WIDTH));
      world = baseWorld.map((p) => ({ x: p.x * fit, y: p.y * fit, z: p.z }));
    };

    // Deterministic particle set: a fixed composition every visit.
    const particles: Particle[] = [];
    for (let n = 0; n < NODES.length; n += 1) {
      for (let i = 0; i < PARTICLES_PER_ARC; i += 1) {
        particles.push(makeParticle(n, n * 100 + i * 7 + 3));
      }
    }
    // Phones get a lighter field: the composition is identical, just fewer
    // sprites per arc, which keeps the frame budget comfortable on mobile GPUs.
    let particleBudget = particles.length;

    let width = 0;
    let height = 0;
    let dpr = 1;
    let raf: number | null = null;
    let running = false;
    let visible = true;
    let last = 0;
    let spin = 0;
    let hovered = -1;

    const camera = (): Camera => ({
      width,
      height,
      focal: Math.max(DEFAULT_FOCAL * (width / 1200), 620),
      distance: DEFAULT_DISTANCE,
      flattenY: DEFAULT_FLATTEN_Y,
    });

    const resize = () => {
      const rect = wrap.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      width = Math.max(1, Math.round(rect.width));
      height = Math.max(1, Math.round(rect.height));
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = true;
      ctx.lineCap = "round";
      applyFit();
      particleBudget = width < 700 ? Math.round(particles.length * 0.55) : particles.length;
    };

    const draw = () => {
      const cam = camera();
      const progress = scrollRef.current;
      // Scroll turns the system; idle spin keeps it breathing when still.
      const yaw = spin + (progress - 0.5) * 46;
      const tilt = BASE_TILT + (progress - 0.5) * 9;

      ctx.clearRect(0, 0, width, height);

      const projected: Projected[] = [];
      const rotated: Vec3[] = [];
      for (let i = 0; i < world.length; i += 1) {
        const r = rotateX(rotateY(world[i], yaw), tilt);
        rotated.push(r);
        projected.push(project(r, cam));
      }

      const pointer = pointerRef.current;
      const near = nodeAtPointer(projected, pointer, HOVER_RADIUS);
      if (near !== hovered) {
        hovered = near;
        focusRef.current = near;
        setFocused(near);
      }

      const center: Projected = { x: width / 2, y: height / 2, scale: 1, depth: 0.5 };
      const showLabels = width >= LABEL_MIN_WIDTH;

      // --- orbit guides ---------------------------------------------------
      // Drawn first and very faintly: they are what makes the three rings read
      // as a designed system rather than a scatter of dots.
      for (let ring = RING_RADII.length - 1; ring >= 0; ring -= 1) {
        const fit = Math.min(1.15, Math.max(0.42, width / DESIGN_WIDTH));
        ctx.beginPath();
        const outline = ringOutline(ring, RING_SAMPLES);
        for (let i = 0; i < outline.length; i += 1) {
          const point = {
            x: outline[i].x * fit,
            y: outline[i].y * fit,
            z: outline[i].z,
          };
          const sp = project(rotateX(rotateY(point, yaw), tilt), cam);
          if (i === 0) ctx.moveTo(sp.x, sp.y);
          else ctx.lineTo(sp.x, sp.y);
        }
        ctx.strokeStyle = withAlpha("#ffffff", ring === 1 ? 0.05 : 0.032);
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // --- connections, far rings first so near ones read on top ---------
      const order = NODES.map((_, i) => i).sort((a, b) => rotated[a].z - rotated[b].z);

      for (const i of order) {
        const node = NODES[i];
        const p = projected[i];
        const alpha = depthAlpha(p.depth, 0.2, 0.72);
        const hot = i === hovered;
        const gradient = ctx.createLinearGradient(p.x, p.y, center.x, center.y);
        gradient.addColorStop(0, withAlpha(node.color, hot ? 0.95 : alpha));
        gradient.addColorStop(0.5, withAlpha(node.color, (hot ? 0.6 : alpha) * 0.7));
        gradient.addColorStop(1, withAlpha("#e8b158", hot ? 0.85 : 0.34));

        ctx.beginPath();
        for (let s = 0; s <= ARC_SAMPLES; s += 1) {
          const t = s / ARC_SAMPLES;
          const point = connectionPoint(rotated[i], { x: 0, y: 0, z: 0 }, t);
          const sp = project(rotateX(rotateY(point, yaw), tilt), cam);
          if (s === 0) ctx.moveTo(sp.x, sp.y);
          else ctx.lineTo(sp.x, sp.y);
        }
        ctx.strokeStyle = gradient;
        ctx.lineWidth = hot ? 1.7 : 1;
        ctx.stroke();
      }

      // --- particles ------------------------------------------------------
      ctx.globalCompositeOperation = "lighter";
      for (let index = 0; index < particleBudget; index += 1) {
        const particle = particles[index];
        const node = NODES[particle.node];
        const point = connectionPoint(rotated[particle.node], { x: 0, y: 0, z: 0 }, particle.t);
        const sp = project(rotateX(rotateY(point, yaw), tilt), cam);

        const influence = pointerInfluence(sp, pointer);
        const fade = particleFade(particle.t);
        const alpha = fade * depthAlpha(sp.depth, 0.25, 0.95) * (0.55 + influence.glow * 0.45);
        const radius = particle.size * sp.scale * (1.5 + influence.glow * 1.6);
        const sprite = spriteFor(node.color);

        ctx.globalAlpha = Math.min(alpha, 1);
        ctx.drawImage(sprite, influence.x - radius * 2, influence.y - radius * 2, radius * 4, radius * 4);
        ctx.globalAlpha = Math.min(alpha * 1.6, 1);
        ctx.drawImage(sprite, influence.x - radius * 0.55, influence.y - radius * 0.55, radius * 1.1, radius * 1.1);
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";

      // --- the core -------------------------------------------------------
      // A concentrated burst at the mark, so every arc visibly terminates in
      // something rather than fading into an empty middle.
      ctx.globalCompositeOperation = "lighter";
      const coreSprite = spriteFor("#e8b158");
      const coreSize = 108 * Math.max(cam.focal / DEFAULT_FOCAL, 0.6);
      ctx.globalAlpha = 0.5;
      ctx.drawImage(coreSprite, center.x - coreSize / 2, center.y - coreSize / 2, coreSize, coreSize);
      ctx.globalAlpha = 0.4;
      ctx.drawImage(coreSprite, center.x - coreSize * 0.16, center.y - coreSize * 0.16, coreSize * 0.32, coreSize * 0.32);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";

      // --- nodes ----------------------------------------------------------
      for (const i of order) {
        const node = NODES[i];
        const p = projected[i];
        const hot = i === hovered;
        const alpha = depthAlpha(p.depth, 0.32, 1);
        const radius = (hot ? 7.5 : 5.2) * Math.max(p.scale * 1.6, 0.75);

        ctx.globalCompositeOperation = "lighter";
        ctx.globalAlpha = hot ? 0.95 : alpha * 0.6;
        const glow = spriteFor(node.color);
        ctx.drawImage(glow, p.x - radius * 5, p.y - radius * 5, radius * 10, radius * 10);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = "source-over";

        ctx.beginPath();
        ctx.arc(p.x, p.y, radius * 0.5, 0, Math.PI * 2);
        ctx.fillStyle = hot ? "#ffffff" : withAlpha(node.color, alpha);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        ctx.strokeStyle = withAlpha(node.color, hot ? 0.9 : alpha * 0.42);
        ctx.lineWidth = 1;
        ctx.stroke();

        if (showLabels) {
          ctx.font = `${hot ? 500 : 400} ${hot ? 13 : 12}px Inter, ui-sans-serif, system-ui, sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillStyle = hot ? "#ffffff" : withAlpha("#ffffff", alpha * 0.5);
          ctx.fillText(node.label, p.x, p.y + radius + 15);
        }
      }
    };

    const frame = (now: number) => {
      raf = null;
      if (!running) return;
      const dt = last ? Math.min((now - last) / 1000, 0.05) : 0.016;
      last = now;

      if (!reduced) {
        spin = (spin + IDLE_SPIN_DEG_PER_SEC * dt) % 360;
        for (let i = 0; i < particles.length; i += 1) {
          particles[i] = advanceParticle(particles[i], dt);
        }
      }

      draw();
      raf = requestAnimationFrame(frame);
    };

    const start = () => {
      if (running || reduced) return;
      running = true;
      last = 0;
      raf = requestAnimationFrame(frame);
    };

    const stop = () => {
      running = false;
      if (raf !== null) cancelAnimationFrame(raf);
      raf = null;
    };

    // --- pointer ---------------------------------------------------------
    const onMove = (event: PointerEvent) => {
      const rect = wrap.getBoundingClientRect();
      pointerRef.current = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
        active: true,
      };
      // A still field with no loop running still needs to react to hover.
      if (!reduced && !running) start();
    };
    const onLeave = () => {
      pointerRef.current = { x: 0, y: 0, active: false };
      if (hovered !== -1) {
        hovered = -1;
        focusRef.current = -1;
        setFocused(-1);
      }
      if (!reduced) draw();
    };

    wrap.addEventListener("pointermove", onMove, { passive: true });
    wrap.addEventListener("pointerleave", onLeave);

    // --- sizing, visibility ----------------------------------------------
    let resizeFrame: number | null = null;
    const observer = new ResizeObserver(() => {
      if (resizeFrame !== null) return;
      resizeFrame = requestAnimationFrame(() => {
        resizeFrame = null;
        resize();
        if (!running) draw();
      });
    });
    observer.observe(wrap);

    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (visible && document.visibilityState === "visible") start();
        else stop();
      },
      { rootMargin: "120px" }
    );
    io.observe(wrap);

    const onVisibility = () => {
      if (document.visibilityState === "visible" && visible) start();
      else stop();
    };
    document.addEventListener("visibilitychange", onVisibility);

    resize();
    // First paint, and a second once webfonts land so canvas labels use Inter.
    draw();
    setLoaded(true);
    if (document.fonts?.ready) {
      void document.fonts.ready.then(() => {
        if (!running) draw();
      });
    }
    if (!reduced) start();

    return () => {
      stop();
      observer.disconnect();
      io.disconnect();
      if (resizeFrame !== null) cancelAnimationFrame(resizeFrame);
      wrap.removeEventListener("pointermove", onMove);
      wrap.removeEventListener("pointerleave", onLeave);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [reduced]);

  const active = focused >= 0 ? NODES[focused] : null;

  return (
    <div className={className}>
      <div
        ref={wrapRef}
        className="relative mx-auto h-[440px] w-full max-w-5xl sm:h-[520px] lg:h-[600px]"
      >
        {/* The mark itself stays a crisp SVG at the exact centre of the system */}
        <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
          <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-[#0c0d11] ring-1 ring-white/10">
            <div className="absolute h-36 w-36 animate-breathe rounded-full bg-[radial-gradient(circle,rgba(232,177,88,0.3),transparent_70%)]" />
            <div className="absolute h-44 w-44 rounded-full border border-white/[0.05]" />
            <BloomGlyph size={44} strokeWidth={9} />
          </div>
        </div>

        <canvas
          ref={canvasRef}
          aria-hidden="true"
          className="absolute inset-0 h-full w-full transition-opacity duration-700"
          style={{ opacity: loaded ? 1 : 0 }}
        />
      </div>

      {/* Focus readout — the map doubles as a way to navigate the product */}
      <div className="relative mx-auto mt-8 flex h-[86px] max-w-xl flex-col items-center justify-center px-6 text-center">
        {active ? (
          <>
            <div className="flex items-center gap-2.5">
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: active.color, boxShadow: `0 0 10px ${active.color}` }}
              />
              <span className="font-display text-[1.05rem] text-white">{active.label}</span>
            </div>
            <p className="mt-2 text-[0.85rem] text-white/50">{active.blurb}</p>
            <span className="mt-1.5 text-[0.6rem] uppercase tracking-[0.28em] text-[#e8b158]/70">
              Click to open
            </span>
          </>
        ) : (
          <p className="text-[0.7rem] uppercase tracking-[0.32em] text-white/25">
            Nine surfaces · move your cursor through the system
          </p>
        )}
      </div>

      {/* The map is a picture; these are the real controls, so keyboard and
          touch visitors get the same nine destinations. */}
      <nav
        aria-label="The nine surfaces"
        className="mx-auto mt-2 flex max-w-4xl flex-wrap items-center justify-center gap-2 px-6"
      >
        {NODES.map((node, i) => (
          <a
            key={node.label}
            href={node.href}
            data-cursor="hover"
            onPointerEnter={() => setFocused(i)}
            onPointerLeave={() => setFocused((current) => (current === i ? -1 : current))}
            onFocus={() => setFocused(i)}
            onBlur={() => setFocused((current) => (current === i ? -1 : current))}
            className="rounded-full border px-3.5 py-1.5 text-[0.72rem] transition-colors duration-300"
            style={{
              borderColor: focused === i ? `${node.color}88` : "rgba(255,255,255,0.1)",
              color: focused === i ? node.color : "rgba(255,255,255,0.5)",
              background: focused === i ? `${node.color}14` : "transparent",
            }}
          >
            {node.label}
          </a>
        ))}
      </nav>
    </div>
  );
}

