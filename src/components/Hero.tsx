import { useRef } from "react";
import { motion, useScroll, useSpring, useTransform, useMotionTemplate } from "framer-motion";
import { useFrameScrubber } from "../hooks/useFrameScrubber";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { POSTER_URL, STILL_URL, FRAME_COUNT } from "../lib/frameSequence";
import { REDUCED_MOTION_STILL_INDEX } from "../lib/scrub";
import { Magnetic } from "./Magnetic";

/**
 * Cinematic scroll-driven hero.
 *
 * The Bloom frame sequence (192 cinematic frames) is painted to a canvas and
 * scrubbed by scroll position: the laptop ignites, the connection map blooms
 * out of the mark, then the surfaces dock into place. Every value derives from
 * scroll progress rather than a timeline, so the sequence plays forwards,
 * backwards, and at any speed without ever drifting out of sync.
 */
export function Hero() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });
  const p = useSpring(scrollYProgress, { stiffness: 110, damping: 26, mass: 0.4 });

  // Scene brightness is applied inside the canvas so the graded pixels cost
  // nothing extra to composite. It opens near 1 so handing over from the
  // ungraded poster is invisible, then dims as the story resolves.
  const brightness = useTransform(p, [0, 0.12, 0.3, 0.7, 1], [0.95, 1, 1, 0.9, 0.66]);

  useFrameScrubber({
    canvasRef,
    progress: scrollYProgress,
    enabled: !reduced,
    // If the canvas is ever shown without motion it holds the composed end state.
    stillIndex: REDUCED_MOTION_STILL_INDEX,
    brightness,
    smoothing: 80,
  });

  // Scene lighting, driven by the same progress value as the frames.
  const vignette = useTransform(p, [0, 0.4, 1], [0.85, 0.5, 0.72]);
  const grainOpacity = useTransform(p, [0, 0.5, 1], [0.2, 0.1, 0.18]);
  const bloomGlow = useTransform(p, [0, 0.25, 0.45, 0.75], [0.3, 0.7, 0.45, 0.18]);

  // Opening statement hands over to the product, then to the closing line.
  const titleOpacity = useTransform(p, [0, 0.12, 0.22], [1, 1, 0]);
  const titleY = useTransform(p, [0, 0.22], [0, -34]);
  const titleBlur = useTransform(p, [0.1, 0.22], ["blur(0px)", "blur(7px)"]);

  const finalOpacity = useTransform(p, [0.64, 0.79], [0, 1]);
  const finalY = useTransform(p, [0.64, 0.82], [26, 0]);
  const ctaOpacity = useTransform(p, [0.76, 0.9], [0, 1]);

  const frameReadout = useTransform(p, (v) =>
    String(Math.min(FRAME_COUNT, Math.max(1, Math.round(v * (FRAME_COUNT - 1)) + 1))).padStart(3, "0")
  );
  const canvasScale = useTransform(p, [0, 0.5, 1], [1.06, 1, 1.04]);
  const vignetteBackground = useMotionTemplate`radial-gradient(72% 62% at 50% 46%, rgba(0,0,0,0) 38%, rgba(0,0,0,${vignette}) 100%)`;

  return (
    <section id="hero" ref={sectionRef} className="relative h-[420vh]">
      <div className="sticky top-0 h-screen w-full overflow-hidden bg-[#050506]">
        {reduced ? (
          <img
            src={STILL_URL}
            alt="Bloom's nine surfaces connected to a laptop by the Bloom mark"
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <>
            {/* Frame one paints instantly, before the sequence decodes */}
            <img
              src={POSTER_URL}
              alt=""
              aria-hidden="true"
              fetchPriority="high"
              className="absolute inset-0 h-full w-full object-contain"
            />
            <motion.div className="absolute inset-0" style={{ scale: canvasScale }}>
              <canvas ref={canvasRef} className="block h-full w-full" aria-hidden="true" />
            </motion.div>
          </>
        )}

        {/* Warm bloom emanating from the mark */}
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            opacity: reduced ? 0.3 : bloomGlow,
            background: "radial-gradient(34% 30% at 50% 47%, rgba(232,177,88,0.22), rgba(232,177,88,0) 72%)",
          }}
        />

        {/* Cinematic vignette + film grain */}
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{ background: vignetteBackground }}
        />
        <motion.div
          aria-hidden="true"
          className="bg-noise pointer-events-none absolute inset-0"
          style={{ opacity: grainOpacity }}
        />

        {/* Opening statement */}
        <motion.div
          style={reduced ? undefined : { opacity: titleOpacity, y: titleY, filter: titleBlur }}
          className="pointer-events-none absolute inset-x-0 top-[9vh] z-20 flex flex-col items-center px-6 text-center"
        >
          <span className="text-[0.62rem] uppercase tracking-[0.42em] text-white/40">
            Bloom · Your life, in bloom
          </span>
          <h1 className="mt-6 font-display text-[2.7rem] leading-[1.06] text-white sm:text-[3.6rem] lg:text-[4rem]">
            Your life.
            <br />
            <span className="italic text-[#f3e6c9]">In bloom.</span>
          </h1>
          <p className="mt-5 max-w-md text-[0.95rem] leading-relaxed text-white/55">
            Mood, cycle, habits, trackers, coaching and rewards — one intelligent ecosystem,
            growing around you.
          </p>
        </motion.div>

        {/* Closing statement, revealed as the ecosystem docks into place */}
        <motion.div
          style={reduced ? undefined : { opacity: finalOpacity, y: finalY }}
          className="absolute inset-x-0 bottom-[7vh] z-20 flex flex-col items-center px-6 text-center"
        >
          <h2 className="font-display text-[1.9rem] leading-[1.1] text-white drop-shadow-[0_2px_30px_rgba(0,0,0,0.9)] sm:text-[2.5rem]">
            One mark. <span className="italic text-white/65">Nine surfaces.</span>
          </h2>
          <motion.div
            style={reduced ? undefined : { opacity: ctaOpacity }}
            className="mt-7 flex flex-wrap items-center justify-center gap-4"
          >
            <Magnetic>
              <a
                href="#ecosystem"
                data-cursor="hover"
                className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full bg-white px-6 py-3 text-[0.85rem] font-medium text-black transition-shadow hover:shadow-[0_18px_50px_-12px_rgba(232,177,88,0.55)]"
              >
                <span className="relative z-10">Explore Bloom</span>
                <span className="relative z-10 transition-transform duration-300 group-hover:translate-x-0.5">→</span>
                <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-[#f3e6c9] to-white transition-transform duration-500 group-hover:translate-x-0" />
              </a>
            </Magnetic>
            <Magnetic>
              <a
                href="#mood"
                data-cursor="hover"
                className="inline-flex items-center rounded-full border border-white/20 px-6 py-3 text-[0.85rem] font-medium text-white/80 backdrop-blur-sm transition-colors hover:border-white/40 hover:text-white"
              >
                See how it works
              </a>
            </Magnetic>
          </motion.div>
        </motion.div>

        {/* Scrub indicator — a real readout of your position in the sequence */}
        <div className="absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 items-center gap-4">
          <span className="text-[0.6rem] uppercase tracking-[0.3em] text-white/30">Scroll</span>
          <div className="relative h-px w-24 bg-white/15">
            <motion.div
              className="absolute inset-y-0 left-0 w-full origin-left bg-gradient-to-r from-[#7fb88f] to-[#e8b158]"
              style={{ scaleX: p }}
            />
          </div>
          <motion.span className="font-mono text-[0.6rem] tabular-nums tracking-[0.2em] text-white/30">
            {frameReadout}
          </motion.span>
        </div>
      </div>
    </section>
  );
}
