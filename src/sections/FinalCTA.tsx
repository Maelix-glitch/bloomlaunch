import { useRef } from "react";
import { motion, useScroll, useSpring, useTransform } from "framer-motion";
import { BloomMark } from "../components/Logo";
import { RevealScale } from "../components/Reveal";
import { Magnetic } from "../components/Magnetic";
import { useReducedMotion } from "../hooks/useReducedMotion";

export function FinalCTA() {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end end"] });
  const p = useSpring(scrollYProgress, { stiffness: 90, damping: 24, mass: 0.5 });

  const haloScale = useTransform(p, [0, 1], [0.8, 1.5]);
  const haloOpacity = useTransform(p, [0, 0.6, 1], [0.15, 0.5, 0.35]);
  const markY = useTransform(p, [0, 1], [36, 0]);
  const markRotate = useTransform(p, [0, 1], [-8, 0]);

  return (
    <section
      id="cta"
      ref={ref}
      className="relative flex min-h-[80vh] items-center justify-center overflow-hidden bg-[#050506] py-32"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(45%_45%_at_50%_45%,rgba(232,177,88,0.1),transparent_70%)]" />

      <RevealScale className="relative flex flex-col items-center px-6 text-center">
        <div className="relative mb-9 flex items-center justify-center">
          <motion.div
            aria-hidden="true"
            className="absolute h-32 w-32 rounded-full bg-[radial-gradient(circle,rgba(232,177,88,0.3),transparent_70%)]"
            style={reduced ? undefined : { scale: haloScale, opacity: haloOpacity }}
          />
          <motion.div style={reduced ? undefined : { y: markY, rotate: markRotate }}>
            <BloomMark size={64} />
          </motion.div>
        </div>

        <h2 className="font-display text-[2.6rem] italic leading-tight text-white sm:text-[3.6rem]">
          Ready to bloom?
        </h2>
        <p className="mt-5 max-w-sm text-[0.98rem] text-white/50">
          Your life, understood, guided, and gently kept — one ecosystem away.
        </p>

        <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
          <Magnetic strength={10}>
            <a
              href="#top"
              data-cursor="hover"
              className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full bg-white px-8 py-3.5 text-[0.9rem] font-medium text-black transition-shadow hover:shadow-[0_20px_60px_-14px_rgba(232,177,88,0.6)]"
            >
              <span className="relative z-10">Enter Bloom</span>
              <span className="relative z-10 transition-transform duration-300 group-hover:translate-x-0.5">→</span>
              <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-[#f3e6c9] to-white transition-transform duration-500 group-hover:translate-x-0" />
            </a>
          </Magnetic>
          <a
            href="#ecosystem"
            data-cursor="hover"
            className="inline-flex items-center rounded-full border border-white/20 px-7 py-3.5 text-[0.9rem] font-medium text-white/80 backdrop-blur-sm transition-colors hover:border-white/40 hover:text-white"
          >
            Tour the ecosystem
          </a>
        </div>

        <p className="mt-8 text-[0.65rem] uppercase tracking-[0.32em] text-white/25">
          Nine surfaces · One intelligence
        </p>
      </RevealScale>
    </section>
  );
}
