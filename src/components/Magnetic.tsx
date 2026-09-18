import { useRef, type ReactNode } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { useReducedMotion } from "../hooks/useReducedMotion";

type MagneticProps = {
  children: ReactNode;
  className?: string;
  /** how far the element is allowed to travel, in px */
  strength?: number;
  /** element scale on hover */
  hoverScale?: number;
};

/**
 * Magnetic hover: the element leans toward the pointer while it is nearby,
 * then springs home. Small detail, very "designed" — used on every CTA.
 */
export function Magnetic({ children, className, strength = 8, hoverScale = 1.02 }: MagneticProps) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 220, damping: 18, mass: 0.5 });
  const sy = useSpring(y, { stiffness: 220, damping: 18, mass: 0.5 });
  const scale = useMotionValue(1);
  const sScale = useSpring(scale, { stiffness: 300, damping: 24 });

  const handleMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (reduced || event.pointerType === "touch") return;
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const relativeX = (event.clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
    const relativeY = (event.clientY - (rect.top + rect.height / 2)) / (rect.height / 2);
    x.set(relativeX * strength);
    y.set(relativeY * strength * 0.6);
  };

  const reset = () => {
    x.set(0);
    y.set(0);
    scale.set(1);
  };

  return (
    <motion.div
      ref={ref}
      className={className}
      style={{ x: sx, y: sy, scale: sScale, transformStyle: "preserve-3d" }}
      onPointerMove={handleMove}
      onPointerEnter={() => !reduced && scale.set(hoverScale)}
      onPointerLeave={reset}
    >
      {children}
    </motion.div>
  );
}
