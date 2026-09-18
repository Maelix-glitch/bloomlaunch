import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { useReducedMotion } from "../hooks/useReducedMotion";

const STEPS = [
  "Understand",
  "Track",
  "Discover",
  "Improve",
  "Guidance",
  "Consistency",
  "Progress",
  "Become",
];

/**
 * The eight-step arc of the product, drawn as a single line that fills as the
 * visitor scrolls. Each node lights in turn, so the rail doubles as a progress
 * indicator between the hero and the story chapters.
 */
export function StoryPath() {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const inView = useInView(ref, { once: true, amount: 0.5 });

  return (
    <section id="story" className="relative overflow-hidden border-y border-white/[0.06] bg-[#050506] py-14">
      <div className="mx-auto max-w-5xl px-6">
        <p className="mb-8 text-center text-[0.62rem] uppercase tracking-[0.4em] text-white/30">
          The arc
        </p>

        <div ref={ref} className="relative">
          {/* Rail */}
          <div className="absolute left-0 right-0 top-[5px] h-px bg-white/[0.08]" />
          <motion.div
            className="absolute left-0 top-[5px] h-px origin-left bg-gradient-to-r from-[#7fb88f] via-[#cdbd7e] to-[#e8b158]"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: inView ? 1 : 0 }}
            transition={{ duration: reduced ? 0 : 2.1, ease: [0.16, 1, 0.3, 1] }}
            style={{ right: 0, boxShadow: "0 0 12px rgba(232,177,88,0.4)" }}
          />

          <ol className="relative grid grid-cols-2 gap-y-9 sm:grid-cols-4 lg:grid-cols-8">
            {STEPS.map((step, i) => (
              <motion.li
                key={step}
                initial={{ opacity: 0, y: 8 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: reduced ? 0 : 0.12 * i, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col items-center gap-3 text-center"
              >
                <span className="relative flex h-[11px] w-[11px] items-center justify-center">
                  <span className="h-[11px] w-[11px] rounded-full border border-white/20 bg-[#050506]" />
                  <motion.span
                    className="absolute h-[5px] w-[5px] rounded-full bg-[#e8b158]"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={inView ? { scale: 1, opacity: 1 } : {}}
                    transition={{ duration: 0.5, delay: reduced ? 0 : 0.16 * i + 0.2 }}
                    style={{ boxShadow: "0 0 10px rgba(232,177,88,0.9)" }}
                  />
                </span>
                <span className="text-[0.68rem] uppercase tracking-[0.2em] text-white/45">{step}</span>
              </motion.li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
