import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { TiltCard } from "./TiltCard";

const EASE = [0.16, 1, 0.3, 1] as const;

const GLOWS = {
  gold: "rgba(232,177,88,0.18)",
  violet: "rgba(141,123,242,0.2)",
  pink: "rgba(225,145,179,0.18)",
  green: "rgba(127,184,143,0.18)",
  blue: "rgba(91,143,242,0.18)",
} as const;

export type GlowKey = keyof typeof GLOWS;

/**
 * The glass-and-metal surface every Bloom surface is presented in: a real
 * browser window with a live URL pill, a specular sweep, and a pointer-driven
 * 3D tilt. Nothing inside is altered — the product UI underneath is untouched.
 */
export function PanelFrame({
  children,
  glow = "gold",
  className = "",
  url = "bloom.app",
  tilt = true,
  maxTilt = 6,
}: {
  children: ReactNode;
  glow?: GlowKey;
  className?: string;
  url?: string;
  tilt?: boolean;
  maxTilt?: number;
}) {
  const reduced = useReducedMotion();

  const window = (
    <div className="relative overflow-hidden rounded-[1.15rem] border border-white/[0.09] bg-[#08090c] shadow-[0_50px_140px_-40px_rgba(0,0,0,0.95)]">
      {/* Ambient top light, like a screen catching a window */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-white/[0.05] to-transparent" />

      <div className="relative flex items-center gap-3 border-b border-white/[0.07] bg-white/[0.02] px-4 py-2.5 backdrop-blur-sm">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-white/12" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/12" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/12" />
        </div>
        <div className="mx-auto flex max-w-[60%] items-center gap-1.5 truncate rounded-full border border-white/[0.06] bg-black/40 px-3 py-1 text-[0.62rem] tracking-wide text-white/35">
          <span className="h-1.5 w-1.5 rounded-full bg-[#7fb88f]/80" />
          {url}
        </div>
        <span className="hidden w-10 text-right text-[0.6rem] uppercase tracking-[0.2em] text-white/15 sm:block">
          Live
        </span>
      </div>

      <div className="relative">{children}</div>

      {/* Specular sweep + edge falloff */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.015] to-white/[0.05]" />
      <div className="pointer-events-none absolute inset-0 rounded-[1.15rem] ring-1 ring-inset ring-white/[0.04]" />
    </div>
  );

  return (
    <div className={`perspective-dramatic ${className}`}>
      <motion.div
        initial={reduced ? undefined : { opacity: 0, y: 40, scale: 0.97 }}
        whileInView={reduced ? undefined : { opacity: 1, y: 0, scale: 1 }}
        viewport={{ once: true, amount: 0.18 }}
        transition={{ duration: 1.05, ease: EASE }}
        className="relative"
        style={{ transformStyle: "preserve-3d" }}
      >
        <div
          aria-hidden="true"
          className="absolute -inset-8 -z-10 rounded-[2.5rem] blur-[60px]"
          style={{ background: `radial-gradient(55% 55% at 50% 40%, ${GLOWS[glow]}, transparent 72%)` }}
        />
        {tilt && !reduced ? (
          <TiltCard max={maxTilt} depth={18} className="rounded-[1.15rem]">
            {window}
          </TiltCard>
        ) : (
          window
        )}
      </motion.div>
    </div>
  );
}

/**
 * Physical device shell, kept for full-bleed product moments.
 */
export function MacBookFrame({ children }: { children: ReactNode }) {
  return (
    <div className="relative mx-auto w-full max-w-[1100px]" style={{ transformStyle: "preserve-3d" }}>
      <div className="relative rounded-t-[1.1rem] border-[6px] border-b-0 border-[#1c1d22] bg-[#08090c] p-[10px] shadow-[0_60px_160px_-40px_rgba(0,0,0,0.95)]">
        <div className="absolute left-1/2 top-1 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-black/60" />
        <div className="overflow-hidden rounded-[0.5rem] border border-white/5 bg-black">{children}</div>
      </div>
      <div className="relative h-[16px] rounded-b-[0.6rem] bg-gradient-to-b from-[#232429] to-[#101114]">
        <div className="absolute left-1/2 top-0 h-[6px] w-[16%] -translate-x-1/2 rounded-b-xl bg-[#0a0a0c]" />
      </div>
      <div className="mx-auto h-[7px] w-[55%] rounded-b-2xl bg-gradient-to-b from-[#17181c] to-[#08090a]" />
    </div>
  );
}
