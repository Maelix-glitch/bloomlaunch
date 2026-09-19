import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { BloomGlyph } from "./Logo";
import { useMotionPreference } from "../hooks/useMotionPreference";
import { useFrameSequenceStatus } from "../hooks/useFrameSequenceStatus";
import { frameSequence } from "../lib/frameSequence";
import { acquireScrollLock } from "../lib/scrollLock";

const EASE = [0.16, 1, 0.3, 1] as const;
const CIRCUMFERENCE = 2 * Math.PI * 62;

type Phase = "loading" | "revealing" | "gone";

/**
 * The overture. Starts the hero sequence downloading, reports honest progress,
 * then lifts away in two curtains to reveal the site already in motion — the
 * preloader does real work, it isn't a fake delay.
 */
export function Preloader({ onDone }: { onDone: () => void }) {
  const { playing } = useMotionPreference();
  const reduced = !playing;
  const status = useFrameSequenceStatus();
  const [phase, setPhase] = useState<Phase>("loading");
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  // Kick off the download — the hero shares this exact promise. When the
  // animation is switched off we fetch only the first frame, and the rest is
  // pulled later if the visitor asks for it.
  useEffect(() => {
    frameSequence.start(reduced ? "still" : "sequence");
  }, [reduced]);

  // Hold the page still while the overture plays, and release it the moment
  // the curtains start moving (or after the failsafe). Refcounted, so the
  // gate's own hold (or anyone else's) survives this release.
  useEffect(() => {
    if (phase !== "loading") return;
    return acquireScrollLock();
  }, [phase]);

  const ready = reduced || status.coarseReady || status.unsupported;
  const progress = reduced ? 1 : Math.max(status.ratio, status.loaded > 0 ? 0.04 : 0);

  useEffect(() => {
    if (!ready) return;
    const t = setTimeout(() => setPhase("revealing"), reduced ? 150 : 620);
    return () => clearTimeout(t);
  }, [ready, reduced]);

  // Never trap the visitor, whatever the network does.
  useEffect(() => {
    const t = setTimeout(() => setPhase((p) => (p === "loading" ? "revealing" : p)), 12000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (phase !== "revealing") return;
    doneRef.current();
    const t = setTimeout(() => setPhase("gone"), 1250);
    return () => clearTimeout(t);
  }, [phase]);

  if (phase === "gone") return null;

  const revealing = phase === "revealing";
  const percentage = Math.round(progress * 100);

  return (
    <div className="fixed inset-0 z-[100] overflow-hidden" aria-live="polite" aria-busy={!revealing}>
      {/* Curtains */}
      <motion.div
        className="absolute inset-x-0 top-0 h-[50.5%] bg-[#050506]"
        initial={false}
        animate={{ y: revealing ? "-101%" : "0%" }}
        transition={{ duration: 1.15, ease: EASE }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(60%_120%_at_50%_100%,rgba(232,177,88,0.06),transparent_70%)]" />
      </motion.div>
      <motion.div
        className="absolute inset-x-0 bottom-0 h-[50.5%] bg-[#050506]"
        initial={false}
        animate={{ y: revealing ? "101%" : "0%" }}
        transition={{ duration: 1.15, ease: EASE }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(60%_120%_at_50%_0%,rgba(232,177,88,0.06),transparent_70%)]" />
      </motion.div>

      {/* Hairline where the curtains meet */}
      <motion.div
        className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-gradient-to-r from-transparent via-[#e8b158]/35 to-transparent"
        initial={false}
        animate={{ opacity: revealing ? 0 : 1 }}
        transition={{ duration: 0.4 }}
      />

      {/* Content */}
      <motion.div
        className="absolute inset-0 flex flex-col items-center justify-center px-6"
        initial={false}
        animate={{ opacity: revealing ? 0 : 1, scale: revealing ? 1.04 : 1 }}
        transition={{ duration: 0.55, ease: EASE }}
      >
        <div className="relative flex h-[176px] w-[176px] items-center justify-center">
          <div className="absolute h-28 w-28 rounded-full bg-[radial-gradient(circle,rgba(232,177,88,0.28),transparent_70%)] blur-[2px]" />

          <svg viewBox="0 0 176 176" className="absolute inset-0 h-full w-full -rotate-90">
            <circle cx="88" cy="88" r="62" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="1.5" />
            <motion.circle
              cx="88"
              cy="88"
              r="62"
              fill="none"
              stroke="url(#bloom-progress)"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              animate={{ strokeDashoffset: CIRCUMFERENCE * (1 - progress) }}
              transition={{ duration: 0.6, ease: "linear" }}
            />
            <defs>
              <linearGradient id="bloom-progress" x1="0" y1="0" x2="176" y2="176" gradientUnits="userSpaceOnUse">
                <stop offset="0" stopColor="#7fb88f" />
                <stop offset="0.55" stopColor="#cdbd7e" />
                <stop offset="1" stopColor="#e8b158" />
              </linearGradient>
            </defs>
          </svg>

          <motion.div
            animate={reduced ? undefined : { scale: [1, 1.05, 1] }}
            transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut" }}
          >
            <BloomGlyph size={62} strokeWidth={9} glow />
          </motion.div>
        </div>

        <div className="mt-9 flex flex-col items-center">
          <span className="font-display text-[1.55rem] tracking-tight text-white">Bloom</span>
          <span className="mt-2 text-[0.62rem] uppercase tracking-[0.42em] text-white/35">
            {revealing ? "Welcome" : "Preparing your ecosystem"}
          </span>
        </div>

        <div className="mt-8 flex w-[220px] flex-col items-center gap-3">
          <div className="h-px w-full bg-white/10">
            <motion.div
              className="h-px origin-left bg-gradient-to-r from-[#7fb88f] to-[#e8b158]"
              animate={{ scaleX: progress }}
              transition={{ duration: 0.6, ease: "linear" }}
              style={{ width: "100%" }}
            />
          </div>
          <div className="flex w-full items-center justify-between text-[0.6rem] uppercase tracking-[0.24em] text-white/30">
            <span>{reduced ? "Ready" : "Loading sequence"}</span>
            <span className="font-mono tabular-nums">{percentage.toString().padStart(3, "0")}%</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
