import { motion, type Variants } from "framer-motion";
import type { ReactNode } from "react";

const EASE = [0.16, 1, 0.3, 1] as const;

interface RevealProps {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
  once?: boolean;
  amount?: number;
}

export function Reveal({ children, delay = 0, y = 28, className, once = true, amount = 0.3 }: RevealProps) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, amount }}
      transition={{ duration: 0.9, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

export function RevealScale({ children, delay = 0, className, once = true, amount = 0.3 }: RevealProps) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, scale: 0.94 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once, amount }}
      transition={{ duration: 1.1, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

export const staggerContainer: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.12, delayChildren: 0.05 },
  },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: EASE } },
};

export function Eyebrow({
  children,
  accent = "from-bloom-green to-bloom-gold",
}: {
  children: ReactNode;
  accent?: string;
}) {
  return (
    <span className="inline-flex items-center gap-2 text-[0.7rem] font-medium uppercase tracking-[0.28em] text-white/45">
      <span className={`h-px w-6 bg-gradient-to-r ${accent}`} />
      {children}
    </span>
  );
}
