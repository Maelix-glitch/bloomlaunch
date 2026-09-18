import { useEffect, useRef, useState, type CSSProperties } from "react";
import { AnimatePresence, motion, useReducedMotion as useFramerReducedMotion } from "framer-motion";
import { CountdownField } from "./CountdownField";
import { RollWheel } from "./DigitRoller";
import { BloomGlyph } from "./Logo";
import { useCountdown } from "../hooks/useCountdown";
import { gateStateFromWindow } from "../lib/gate";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { buildIcs, formatLocalMoment, formatUtcMoment, stageCopy, windowPhase } from "../lib/countdown";
import { DAYS_SCALE, DIGIT_SCALE, Separator, Unit } from "../sections/LaunchCountdown";

const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * The royal gate.
 *
 * Until the 24-hour window closes, the entire site stands behind this screen:
 * no nav, no sections, no palette — only the ceremony. The odometer runs in
 * gilded numerals inside a framed court, a field pulses on every real second,
 * and the moment the clock strikes zero the doors part and the site is
 * revealed underneath.
 *
 * The gate polices itself: it reads the same one clock the site does, runs
 * its own ceremony when the window closes, and renders nothing afterwards —
 * so a visitor arriving after launch never sees it at all.
 */
export function Gate() {
  const reduced = useReducedMotion();
  const framerReduced = useFramerReducedMotion();
  const { remaining, progress, live, window: launchWindow, now } = useCountdown({ precision: "hundredths" });

  const gate = gateStateFromWindow(now, launchWindow);
  const phase = windowPhase(now, launchWindow);
  const copy = stageCopy(remaining.total, live, phase);
  const imminent = !live && remaining.total <= 60_000;

  // The unlock ceremony: flash → doors part → the site is handed over. The
  // initial stage is decided once from the first reading, so an arrival after
  // launch skips the ceremony entirely and one during it keeps its place.
  const [stage, setStage] = useState<"locked" | "opening" | "done">(() => (gate.locked ? "locked" : "done"));
  useEffect(() => {
    if (!live || stage !== "locked") return;
    setStage("opening");
    const t = setTimeout(() => setStage("done"), reduced ? 250 : 2100);
    return () => clearTimeout(t);
  }, [live, stage, reduced]);

  // While the gate stands, the page beneath it does not scroll.
  useEffect(() => {
    const root = document.documentElement;
    const prev = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = prev;
    };
  }, []);

  const sectionRef = useRef<HTMLElement>(null);
  const [copied, setCopied] = useState(false);

  const addToCalendar = () => {
    const ics = buildIcs({
      start: launchWindow.end,
      end: launchWindow.end + 60 * 60 * 1000,
      title: "Bloom is live",
      description: "The Bloom launch window closes — your life, in bloom. Nine surfaces, one intelligence.",
      url: typeof window !== "undefined" ? window.location.href : "https://bloom.app",
      uid: `bloom-launch-${launchWindow.end}@bloom.app`,
      stamp: Date.now(),
    });
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "bloom-launch.ics";
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const shareMoment = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      window.prompt("Copy the launch link:", window.location.href);
    }
  };

  const gilded: CSSProperties = { color: "#eed9a4", textShadow: "0 0 28px rgba(232,177,88,0.35)" };

  if (stage === "done") return null;

  return (
    <AnimatePresence>
      {(
        <motion.section
          ref={sectionRef}
          aria-label="Bloom opens after the countdown"
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-[#050506]"
          exit={reduced ? { opacity: 0 } : undefined}
          transition={{ duration: 0.4 }}
        >
          {/* The field: pulse rings on every real second, drifting light */}
          <div className="pointer-events-none absolute inset-0">
            <CountdownField live={live} className="h-full w-full" />
          </div>

          {/* The court: a slow-turning golden aura behind the numbers */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-1/2 h-[140vmax] w-[140vmax] -translate-x-1/2 -translate-y-1/2 opacity-70"
            style={{
              background:
                "conic-gradient(from 90deg, transparent 0deg, rgba(232,177,88,0.055) 24deg, transparent 60deg, rgba(141,123,242,0.04) 130deg, transparent 170deg, rgba(232,177,88,0.055) 240deg, transparent 285deg, rgba(127,184,143,0.035) 330deg, transparent 360deg)",
              animation: reduced ? undefined : "gate-aura 48s linear infinite",
              maskImage: "radial-gradient(circle, black 0%, transparent 58%)",
              WebkitMaskImage: "radial-gradient(circle, black 0%, transparent 58%)",
            }}
          />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_60%_at_50%_50%,transparent_30%,rgba(5,5,6,0.92)_100%)]" />

          {/* The frame: double rule with gilded corners */}
          <motion.div
            aria-hidden="true"
            initial={framerReduced ? undefined : { opacity: 0 }}
            animate={framerReduced ? undefined : { opacity: 1 }}
            transition={{ duration: 1.4, ease: EASE }}
            className="pointer-events-none absolute inset-3 border border-[#e8b158]/15 sm:inset-5"
          >
            <div className="absolute inset-2 border border-white/[0.045] sm:inset-3" />
            {[
              "left-0 top-0 -translate-x-1/2 -translate-y-1/2",
              "right-0 top-0 translate-x-1/2 -translate-y-1/2",
              "bottom-0 left-0 -translate-x-1/2 translate-y-1/2",
              "bottom-0 right-0 translate-x-1/2 translate-y-1/2",
            ].map((pos) => (
              <span
                key={pos}
                className={`absolute ${pos} h-2 w-2 rotate-45 border border-[#e8b158]/60 bg-[#050506]`}
              />
            ))}
          </motion.div>

          {/* The ceremony itself */}
          <motion.div
            className="relative flex max-h-full w-full max-w-4xl flex-col items-center overflow-y-auto px-8 py-10 text-center sm:px-12"
            animate={stage === "opening" && !reduced ? { opacity: 0, scale: 1.04 } : { opacity: 1, scale: 1 }}
            transition={{ duration: stage === "opening" ? 1.1 : 0.4, ease: EASE }}
          >
            {/* The mark, breathing */}
            <motion.div
              initial={framerReduced ? undefined : { opacity: 0, scale: 0.85 }}
              animate={framerReduced ? undefined : { opacity: 1, scale: 1 }}
              transition={{ duration: 1.2, ease: EASE }}
              className="relative"
            >
              <span
                aria-hidden="true"
                className="absolute inset-0 -m-6 rounded-full bg-[radial-gradient(circle,rgba(232,177,88,0.28),transparent_70%)]"
                style={{ animation: reduced ? undefined : "gate-breathe 4.5s ease-in-out infinite" }}
              />
              <BloomGlyph className="relative h-11 w-11" />
            </motion.div>

            {/* Eyebrow */}
            <motion.div
              initial={framerReduced ? undefined : { opacity: 0, y: 10 }}
              animate={framerReduced ? undefined : { opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.25, ease: EASE }}
              className="mt-7 flex items-center justify-center gap-4"
            >
              <span className="h-px w-10 bg-gradient-to-r from-transparent to-[#e8b158]/50" aria-hidden="true" />
              <span className="text-[0.6rem] uppercase tracking-[0.5em] text-[#e8b158]/80 sm:text-[0.66rem]">
                {live ? "The gates are open" : phase === "before" ? copy.eyebrow : "The gates open in"}
              </span>
              <span className="h-px w-10 bg-gradient-to-l from-transparent to-[#e8b158]/50" aria-hidden="true" />
            </motion.div>

            {/* Headline */}
            <motion.h1
              key={copy.headline}
              initial={framerReduced ? undefined : { opacity: 0, y: 12 }}
              animate={framerReduced ? undefined : { opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.4, ease: EASE }}
              className="mt-5 font-display text-[1.9rem] leading-[1.12] text-[#f3e6c9] sm:text-[2.7rem]"
            >
              {copy.headline}
            </motion.h1>

            {/* The gilded clock */}
            <motion.div
              role="timer"
              aria-label={
                live
                  ? "Bloom is live"
                  : phase === "before"
                    ? `Bloom opens in ${remaining.days} days, ${remaining.hours % 24} hours, ${remaining.minutes} minutes and ${remaining.seconds} seconds`
                    : `Bloom opens in ${remaining.hours} hours, ${remaining.minutes} minutes and ${remaining.seconds} seconds`
              }
              initial={framerReduced ? undefined : { opacity: 0, y: 22 }}
              animate={framerReduced ? undefined : { opacity: 1, y: 0 }}
              transition={{ duration: 1.1, delay: 0.55, ease: EASE }}
              className="mt-10"
            >
              <div className="flex items-start justify-center gap-1.5 sm:gap-3 lg:gap-4">
                {phase === "before" && remaining.days > 0 && (
                  <>
                    <Unit digits={remaining.dayDigits} label={remaining.days === 1 ? "Day" : "Days"} imminent={false} reduced={Boolean(reduced)} scale={DAYS_SCALE} gilded />
                    <Separator reduced={Boolean(reduced)} scale={DAYS_SCALE} />
                    <Unit digits={[Math.floor((remaining.hours % 24) / 10), remaining.hours % 24]} label="Hours" imminent={false} reduced={Boolean(reduced)} scale={DAYS_SCALE} gilded />
                  </>
                )}
                {phase !== "before" && (
                  <>
                    <Unit digits={remaining.hourDigits} label="Hours" imminent={false} reduced={Boolean(reduced)} scale={DIGIT_SCALE} gilded />
                    <Separator reduced={Boolean(reduced)} scale={DIGIT_SCALE} />
                  </>
                )}
                {phase === "before" && remaining.days > 0 ? (
                  <>
                    <Separator reduced={Boolean(reduced)} scale={DAYS_SCALE} />
                    <Unit digits={remaining.minuteDigits} label="Minutes" imminent={false} reduced={Boolean(reduced)} scale={DAYS_SCALE} gilded />
                    <Separator reduced={Boolean(reduced)} scale={DAYS_SCALE} />
                    <Unit digits={remaining.secondDigits} label="Seconds" imminent={imminent} reduced={Boolean(reduced)} scale={DAYS_SCALE} gilded />
                  </>
                ) : (
                  <>
                    <Unit digits={remaining.minuteDigits} label="Minutes" imminent={false} reduced={Boolean(reduced)} scale={DIGIT_SCALE} gilded />
                    <Separator reduced={Boolean(reduced)} scale={DIGIT_SCALE} />
                    <Unit digits={remaining.secondDigits} label="Seconds" imminent={imminent} reduced={Boolean(reduced)} scale={DIGIT_SCALE} gilded />
                    {/* The fast wheel: a full revolution every second */}
                    <span className="ml-0.5 flex h-[1.14em] items-end pb-[0.06em] font-sans text-[1.15rem] italic leading-none text-[#e8b158] sm:text-[2.1rem] lg:text-[3.1rem] xl:text-[3.9rem]" style={gilded} aria-hidden="true">
                      <RollWheel fraction={remaining.secondFraction} />
                    </span>
                  </>
                )}
              </div>
              {/* Screen readers get the plain reading */}
              <span className="sr-only">
                {live
                  ? "The countdown is over. Bloom is live."
                  : phase === "before"
                    ? `${remaining.days} days, ${remaining.hours % 24} hours, ${remaining.minutes} minutes and ${remaining.seconds} seconds until Bloom opens.`
                    : `${remaining.hours} hours, ${remaining.minutes} minutes and ${remaining.seconds} seconds until Bloom opens.`}
              </span>
            </motion.div>

            {/* The day, measured in gold */}
            <motion.div
              initial={framerReduced ? undefined : { opacity: 0, scaleX: 0.2 }}
              animate={framerReduced ? undefined : { opacity: 1, scaleX: 1 }}
              transition={{ duration: 1.2, delay: 0.75, ease: EASE }}
              className="relative mt-10 h-px w-full max-w-xl bg-white/10"
              aria-hidden="true"
            >
              <span
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#e8b158]/40 via-[#e8b158] to-[#f3e6c9]"
                style={{ width: `${Math.min(100, progress * 100).toFixed(2)}%`, boxShadow: "0 0 14px rgba(232,177,88,0.5)" }}
              />
              {[25, 50, 75].map((t) => (
                <span key={t} className="absolute top-1/2 h-2 w-px -translate-y-1/2 bg-white/15" style={{ left: `${t}%` }} />
              ))}
            </motion.div>

            {/* The invitations */}
            <motion.div
              initial={framerReduced ? undefined : { opacity: 0, y: 10 }}
              animate={framerReduced ? undefined : { opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.95, ease: EASE }}
              className="mt-9 flex flex-col items-center gap-3 sm:flex-row sm:gap-4"
            >
              <button
                type="button"
                onClick={addToCalendar}
                className="rounded-full border border-[#e8b158]/45 bg-[#e8b158]/10 px-7 py-3 text-[0.68rem] uppercase tracking-[0.28em] text-[#f3e6c9] transition-colors duration-300 hover:border-[#e8b158] hover:bg-[#e8b158]/20"
              >
                Add the moment to your calendar
              </button>
              <button
                type="button"
                onClick={shareMoment}
                className="rounded-full border border-white/12 px-7 py-3 text-[0.68rem] uppercase tracking-[0.28em] text-white/60 transition-colors duration-300 hover:border-white/35 hover:text-white"
              >
                {copied ? "Link copied" : "Share the moment"}
              </button>
            </motion.div>

            {/* The particulars */}
            <motion.div
              initial={framerReduced ? undefined : { opacity: 0 }}
              animate={framerReduced ? undefined : { opacity: 1 }}
              transition={{ duration: 1, delay: 1.15, ease: EASE }}
              className="mt-10 space-y-2"
            >
              <p className="text-[0.78rem] text-white/45">
                {formatLocalMoment(launchWindow.end)} · {formatUtcMoment(launchWindow.end)}
              </p>
              <p className="text-[0.72rem] italic text-white/30">
                Until then, everything beyond this gate is sealed. The whole site opens the moment the clock strikes zero.
              </p>
            </motion.div>
          </motion.div>

          {/* The flash and the parting doors */}
          {stage === "opening" && !reduced && (
            <>
              <motion.div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 z-20 bg-[radial-gradient(circle_at_50%_50%,rgba(243,230,201,0.95)_0%,rgba(232,177,88,0.5)_38%,transparent_72%)]"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 1, 0] }}
                transition={{ duration: 1.5, times: [0, 0.3, 1], ease: "easeOut" }}
              />
              <motion.div
                aria-hidden="true"
                className="absolute inset-y-0 left-0 z-30 w-1/2 border-r border-[#e8b158]/40 bg-[#050506]"
                initial={{ x: "0%" }}
                animate={{ x: "-101%" }}
                transition={{ duration: 1.5, delay: 0.55, ease: [0.76, 0, 0.24, 1] }}
              />
              <motion.div
                aria-hidden="true"
                className="absolute inset-y-0 right-0 z-30 w-1/2 border-l border-[#e8b158]/40 bg-[#050506]"
                initial={{ x: "0%" }}
                animate={{ x: "101%" }}
                transition={{ duration: 1.5, delay: 0.55, ease: [0.76, 0, 0.24, 1] }}
              />
            </>
          )}
        </motion.section>
      )}
    </AnimatePresence>
  );
}
