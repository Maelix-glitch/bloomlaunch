import { useEffect, useRef } from "react";
import { useReducedMotion } from "../hooks/useReducedMotion";

const MAX_DPR = 1.5;
const PARTICLE_COUNT = 90;
const RING_LIFETIME = 1.35; // seconds
const MAX_RINGS = 5;

type Particle = {
  angle: number;
  radius: number;
  size: number;
  speed: number;
  drift: number;
  phase: number;
};

type Ring = { born: number; strength: number };

/**
 * The field behind the countdown.
 *
 * A ring is emitted on every real second boundary — read from the clock, not
 * from a timer — so the pulse is locked to the countdown itself. Particles
 * drift and twinkle, and the whole field leans away from the pointer.
 *
 * When the countdown reaches zero the rings stop and one large burst fires:
 * the moment the launch happens.
 */
export function CountdownField({
  live,
  className = "",
}: {
  live: boolean;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();
  const liveRef = useRef(live);
  const burstRef = useRef<() => void>(() => {});

  useEffect(() => {
    liveRef.current = live;
    if (live) burstRef.current();
  }, [live]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const parent = canvas?.parentElement;
    if (!canvas || !parent) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let raf: number | null = null;
    let running = false;
    let visible = true;
    let lastSecond = -1;
    let burstAt = 0;
    const rings: Ring[] = [];

    const particles: Particle[] = [];
    for (let i = 0; i < PARTICLE_COUNT; i += 1) {
      const seed = Math.sin(i * 12.9898) * 43758.5453;
      const r = seed - Math.floor(seed);
      const seed2 = Math.sin(i * 78.233) * 12345.6789;
      const r2 = seed2 - Math.floor(seed2);
      particles.push({
        angle: r * Math.PI * 2,
        radius: 0.08 + r2 * 0.42,
        size: 0.6 + r * 1.6,
        speed: (0.02 + r2 * 0.05) * (i % 2 === 0 ? 1 : -1),
        drift: 0.5 + r * 1.5,
        phase: r2 * Math.PI * 2,
      });
    }

    let pointerX = 0.5;
    let pointerY = 0.5;
    let pointerTarget = 0.5;

    const resize = () => {
      const rect = parent.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      width = Math.max(1, Math.round(rect.width));
      height = Math.max(1, Math.round(rect.height));
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = (now: number) => {
      ctx.clearRect(0, 0, width, height);
      const cx = width / 2;
      const cy = height / 2;
      const base = Math.min(width, height);

      pointerX += (pointerTarget - pointerX) * 0.05;
      const leanX = (pointerX - 0.5) * 0.06;
      const leanY = (pointerY - 0.5) * 0.06;

      // --- pulse rings ----------------------------------------------------
      if (!reduced) {
        const second = Math.floor(now / 1000);
        if (second !== lastSecond) {
          lastSecond = second;
          if (!liveRef.current) rings.push({ born: now, strength: 1 });
          if (rings.length > MAX_RINGS) rings.shift();
        }
      }

      ctx.globalCompositeOperation = "lighter";

      for (let i = rings.length - 1; i >= 0; i -= 1) {
        const ring = rings[i];
        const age = (now - ring.born) / 1000 / RING_LIFETIME;
        if (age >= 1) {
          rings.splice(i, 1);
          continue;
        }
        // Ease out so the ring leaps away and settles, like a heartbeat.
        const eased = 1 - (1 - age) * (1 - age) * (1 - age);
        const radius = base * (0.1 + eased * 0.62);
        const alpha = (1 - age) * (1 - age) * 0.5;
        ctx.beginPath();
        ctx.ellipse(cx + leanX * base, cy + leanY * base, radius, radius * 0.62, 0, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(232,177,88,${alpha.toFixed(3)})`;
        ctx.lineWidth = 1 + (1 - age) * 1.6;
        ctx.stroke();

        ctx.beginPath();
        ctx.ellipse(cx + leanX * base, cy + leanY * base, radius * 0.72, radius * 0.72 * 0.62, 0, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(127,184,143,${(alpha * 0.6).toFixed(3)})`;
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }

      // --- launch burst ---------------------------------------------------
      if (burstAt) {
        const age = (now - burstAt) / 1000;
        if (age > 3) burstAt = 0;
        else {
          const eased = 1 - Math.pow(1 - Math.min(age / 2.4, 1), 4);
          for (let k = 0; k < 3; k += 1) {
            const radius = base * (0.06 + eased * (0.5 + k * 0.28));
            const alpha = Math.max(0, 1 - age / 2.4) * (0.42 - k * 0.1);
            ctx.beginPath();
            ctx.arc(cx, cy, radius, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(243,230,201,${alpha.toFixed(3)})`;
            ctx.lineWidth = 2.2 - k * 0.6;
            ctx.stroke();
          }
        }
      }

      // --- particles ------------------------------------------------------
      const t = now / 1000;
      for (const particle of particles) {
        const angle = particle.angle + t * particle.speed;
        const pulse = Math.sin(t * particle.drift + particle.phase) * 0.035;
        const radius = base * (particle.radius + pulse);
        const x = cx + Math.cos(angle) * radius + leanX * base * 1.6;
        const y = cy + Math.sin(angle) * radius * 0.62 + leanY * base * 1.6;
        const twinkle = 0.35 + 0.35 * Math.sin(t * 2.1 + particle.phase);
        const alpha = twinkle * (1 - particle.radius * 1.4);

        ctx.beginPath();
        ctx.arc(x, y, particle.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(243,230,201,${Math.max(alpha, 0.04).toFixed(3)})`;
        ctx.fill();
      }

      ctx.globalCompositeOperation = "source-over";
    };

    const frame = (now: number) => {
      raf = null;
      if (!running) return;
      draw(now);
      raf = requestAnimationFrame(frame);
    };

    const start = () => {
      if (running || reduced) return;
      running = true;
      raf = requestAnimationFrame(frame);
    };
    const stop = () => {
      running = false;
      if (raf !== null) cancelAnimationFrame(raf);
      raf = null;
    };

    const onMove = (event: PointerEvent) => {
      const rect = parent.getBoundingClientRect();
      pointerTarget = (event.clientX - rect.left) / Math.max(rect.width, 1);
      pointerY = (event.clientY - rect.top) / Math.max(rect.height, 1);
      pointerX = pointerTarget;
    };

    let resizeFrame: number | null = null;
    const observer = new ResizeObserver(() => {
      if (resizeFrame !== null) return;
      resizeFrame = requestAnimationFrame(() => {
        resizeFrame = null;
        resize();
        if (!running) draw(performance.now());
      });
    });
    observer.observe(parent);

    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (visible && document.visibilityState === "visible") start();
        else stop();
      },
      { rootMargin: "80px" }
    );
    io.observe(parent);

    const onVisibility = () => {
      if (document.visibilityState === "visible" && visible) start();
      else stop();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pointermove", onMove, { passive: true });

    resize();
    // Reduced motion gets one static field with a single ring, no loop.
    if (reduced) {
      rings.push({ born: performance.now() - 500, strength: 1 });
      draw(performance.now());
    } else {
      start();
    }

    // The section flips `live` when the countdown lands; that fires the burst.
    burstRef.current = () => {
      burstAt = performance.now();
      if (reduced) draw(performance.now());
      else start();
    };

    return () => {
      stop();
      observer.disconnect();
      io.disconnect();
      if (resizeFrame !== null) cancelAnimationFrame(resizeFrame);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pointermove", onMove);
      burstRef.current = () => {};
    };
  }, [reduced]);

  return <canvas ref={canvasRef} aria-hidden="true" className={className} />;
}
