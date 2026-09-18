import { motion, useScroll, useSpring } from "framer-motion";

/**
 * Hairline gold progress bar pinned to the top of the document — a quiet
 * signal of how much story is left.
 */
export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 140, damping: 26, mass: 0.4 });

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-px">
      <motion.div
        className="h-full origin-left bg-gradient-to-r from-[#7fb88f] via-[#cdbd7e] to-[#e8b158]"
        style={{ scaleX, boxShadow: "0 0 14px rgba(232,177,88,0.55)" }}
      />
    </div>
  );
}
