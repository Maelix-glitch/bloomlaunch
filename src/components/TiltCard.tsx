import { useRef, type ReactNode } from "react";
import { motion, useMotionTemplate, useMotionValue, useSpring } from "framer-motion";
import { useReducedMotion } from "../hooks/useReducedMotion";

type TiltCardProps = {
  children: ReactNode;
  className?: string;
  /** maximum rotation in degrees */
  max?: number;
  /** depth of the inner content lift, in px */
  depth?: number;
  /** gold spotlight following the pointer */
  spotlight?: boolean;
};

/**
 * Pointer-driven 3D tilt with a specular highlight and a spotlight that
 * tracks the cursor across the surface. Applied to product panels and
 * collectible cards so the page reads as physical objects rather than
 * flat screenshots.
 */
export function TiltCard({ children, className, max = 7, depth = 26, spotlight = true }: TiltCardProps) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);

  const rotateX = useMotionValue(0);
  const rotateY = useMotionValue(0);
  const pointerX = useMotionValue(50);
  const pointerY = useMotionValue(50);

  const springConfig = { stiffness: 180, damping: 20, mass: 0.6 };
  const sx = useSpring(rotateX, springConfig);
  const sy = useSpring(rotateY, springConfig);

  const transform = useMotionTemplate`perspective(1400px) rotateX(${sx}deg) rotateY(${sy}deg)`;
  const spotlightBackground = useMotionTemplate`radial-gradient(42% 42% at ${pointerX}% ${pointerY}%, rgba(232,177,88,0.16), rgba(232,177,88,0) 70%)`;
  const sheenBackground = useMotionTemplate`linear-gradient(${pointerX}deg, rgba(255,255,255,0.09), rgba(255,255,255,0) 45%)`;

  const handleMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (reduced || event.pointerType === "touch") return;
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const px = (event.clientX - rect.left) / rect.width;
    const py = (event.clientY - rect.top) / rect.height;
    pointerX.set(px * 100);
    pointerY.set(py * 100);
    rotateY.set((px - 0.5) * max * 2);
    rotateX.set(-(py - 0.5) * max * 2);
  };

  const reset = () => {
    rotateX.set(0);
    rotateY.set(0);
    pointerX.set(50);
    pointerY.set(50);
  };

  return (
    <motion.div
      ref={ref}
      className={className}
      style={{ transform, transformStyle: "preserve-3d" }}
      onPointerMove={handleMove}
      onPointerLeave={reset}
    >
      <div style={{ transform: `translateZ(${depth}px)`, transformStyle: "preserve-3d" }} className="relative h-full w-full">
        {children}
        {spotlight && (
          <>
            <motion.div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 rounded-[inherit]"
              style={{ background: spotlightBackground }}
            />
            <motion.div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-40 mix-blend-overlay"
              style={{ background: sheenBackground }}
            />
          </>
        )}
      </div>
    </motion.div>
  );
}
