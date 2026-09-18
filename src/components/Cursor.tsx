import { useEffect, useState } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { useReducedMotion } from "../hooks/useReducedMotion";

type Variant = "default" | "hover" | "view" | "hide";

const INTERACTIVE = "a, button, [role='button'], [data-cursor]";

/**
 * Bloom's custom pointer: a precise gold dot with a lagging, inverting ring.
 * Interactive elements get a drawn-out ring and an optional micro-label
 * (`data-cursor-label`), the hero gets a "scroll" lens. Native cursor is only
 * hidden once this component has mounted, so the site stays usable if JS fails.
 */
export function Cursor() {
  const reduced = useReducedMotion();
  const [enabled, setEnabled] = useState(false);
  const [visible, setVisible] = useState(false);
  const [pressed, setPressed] = useState(false);
  const [variant, setVariant] = useState<Variant>("default");
  const [label, setLabel] = useState<string | null>(null);

  const x = useMotionValue(-200);
  const y = useMotionValue(-200);
  const ringX = useSpring(x, { stiffness: 250, damping: 26, mass: 0.55 });
  const ringY = useSpring(y, { stiffness: 250, damping: 26, mass: 0.55 });
  const dotX = useSpring(x, { stiffness: 1200, damping: 60, mass: 0.25 });
  const dotY = useSpring(y, { stiffness: 1200, damping: 60, mass: 0.25 });

  useEffect(() => {
    if (reduced) return;
    const fine = window.matchMedia("(pointer: fine)");
    const apply = () => {
      const on = fine.matches;
      setEnabled(on);
      document.documentElement.classList.toggle("has-bloom-cursor", on);
    };
    apply();
    fine.addEventListener("change", apply);
    return () => {
      fine.removeEventListener("change", apply);
      document.documentElement.classList.remove("has-bloom-cursor");
    };
  }, [reduced]);

  useEffect(() => {
    if (!enabled) return;

    const onMove = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      x.set(event.clientX);
      y.set(event.clientY);
      setVisible(true);
    };

    const onOver = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      const target = event.target as HTMLElement | null;
      const el = target?.closest?.(INTERACTIVE) as HTMLElement | null;
      if (!el) {
        setVariant("default");
        setLabel(null);
        return;
      }
      const requested = el.dataset.cursor as Variant | undefined;
      setVariant(requested ?? "hover");
      setLabel(el.dataset.cursorLabel ?? null);
    };

    const onDown = () => setPressed(true);
    const onUp = () => setPressed(false);
    const onLeave = () => setVisible(false);
    const onEnter = () => setVisible(true);

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerover", onOver, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });
    document.addEventListener("pointerleave", onLeave);
    document.addEventListener("pointerenter", onEnter);

    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerover", onOver);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      document.removeEventListener("pointerleave", onLeave);
      document.removeEventListener("pointerenter", onEnter);
    };
  }, [enabled, x, y]);

  if (!enabled) return null;

  const ringScale = pressed ? 0.82 : variant === "view" ? 2.4 : variant === "hover" ? 1.9 : 1;
  const ringOpacity = variant === "hide" ? 0 : visible ? 1 : 0;

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[9999]">
      <motion.div
        className="absolute left-0 top-0 flex items-center justify-center rounded-full border"
        style={{ x: ringX, y: ringY, width: 34, height: 34, marginLeft: -17, marginTop: -17 }}
        animate={{
          scale: ringScale,
          opacity: ringOpacity,
          borderColor: variant === "default" ? "rgba(255,255,255,0.45)" : "rgba(232,177,88,0.85)",
          backgroundColor: variant === "view" || variant === "hover" ? "rgba(232,177,88,0.06)" : "rgba(232,177,88,0)",
          backdropFilter: variant === "view" ? "blur(2px)" : "blur(0px)",
        }}
        transition={{ type: "spring", stiffness: 320, damping: 26, mass: 0.5 }}
      >
        <motion.span
          className="select-none whitespace-nowrap text-[0.5rem] font-medium uppercase tracking-[0.22em] text-[#f3e6c9]"
          animate={{ opacity: label ? 1 : 0 }}
          transition={{ duration: 0.2 }}
        >
          {label}
        </motion.span>
      </motion.div>

      <motion.div
        className="absolute left-0 top-0 h-[5px] w-[5px] rounded-full bg-[#e8b158]"
        style={{ x: dotX, y: dotY, marginLeft: -2.5, marginTop: -2.5, boxShadow: "0 0 12px rgba(232,177,88,0.9)" }}
        animate={{ scale: pressed ? 0.6 : variant === "default" ? 1 : 0.35, opacity: visible ? 1 : 0 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
      />
    </div>
  );
}
