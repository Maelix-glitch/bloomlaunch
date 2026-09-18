import { motion, useScroll, useTransform } from "framer-motion";
import { useCountdown } from "../hooks/useCountdown";
import { useReducedMotion } from "../hooks/useReducedMotion";

/** Pads a unit and drops it once the window is shorter than that unit. */
function parts(hours: number, minutes: number, seconds: number) {
  if (hours > 0) return [`${hours}h`, `${String(minutes).padStart(2, "0")}m`, `${String(seconds).padStart(2, "0")}s`];
  if (minutes > 0) return [`${minutes}m`, `${String(seconds).padStart(2, "0")}s`];
  return [`${seconds}s`];
}

/**
 * A compact live countdown that appears once the hero has scrolled past, so the
 * deadline travels with the visitor through the whole site rather than living in
 * one section. It is a link, so it also serves as a way back to the launch block.
 */
export function NavCountdown() {
  const reduced = useReducedMotion();
  const { remaining, live } = useCountdown({ precision: "seconds" });
  const { scrollY } = useScroll();

  // Hidden over the hero (which has its own countdown below it), revealed after.
  const opacity = useTransform(scrollY, [200, 420], [0, 1]);
  const y = useTransform(scrollY, [200, 420], [-12, 0]);

  const units = parts(remaining.hours, remaining.minutes, remaining.seconds);
  const urgent = !live && remaining.total <= 60 * 60 * 1000;

  return (
    <motion.div
      className="pointer-events-none fixed inset-x-0 top-[62px] z-[45] flex justify-center px-6 sm:top-[70px]"
      style={{ opacity, y }}
      aria-hidden={false}
    >
      <motion.a
        href="#launch"
        data-cursor="hover"
        initial={false}
        className="pointer-events-auto flex items-center gap-2.5 rounded-full border px-3.5 py-1.5 backdrop-blur-xl transition-colors"
        style={{
          borderColor: live ? "rgba(127,184,143,0.4)" : urgent ? "rgba(232,177,88,0.4)" : "rgba(255,255,255,0.12)",
          background: "rgba(5,5,6,0.72)",
        }}
      >
        <span className="relative flex h-1.5 w-1.5 items-center justify-center" aria-hidden="true">
          <span
            className="absolute h-1.5 w-1.5 rounded-full"
            style={{
              background: live ? "#7fb88f" : "#e8b158",
              boxShadow: `0 0 10px ${live ? "#7fb88f" : "#e8b158"}`,
            }}
          />
          {!reduced && !live && (
            <span className="absolute h-1.5 w-1.5 animate-ping rounded-full bg-[#e8b158]/70" />
          )}
        </span>

        <span className="text-[0.58rem] uppercase tracking-[0.24em] text-white/35">
          {live ? "Live" : "Opens in"}
        </span>

        {!live && (
          <span className="flex items-baseline gap-1.5 font-mono text-[0.72rem] tabular-nums text-white/85">
            {units.map((unit) => (
              <span key={unit}>{unit}</span>
            ))}
          </span>
        )}
      </motion.a>
    </motion.div>
  );
}
