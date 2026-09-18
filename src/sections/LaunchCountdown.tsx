import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion as useFramerReducedMotion } from "framer-motion";
import { CountdownField } from "../components/CountdownField";
import { DigitPair, RollWheel } from "../components/DigitRoller";
import { BloomGlyph } from "../components/Logo";
import { Magnetic } from "../components/Magnetic";
import { useCountdown } from "../hooks/useCountdown";
import { buildIcs, formatLocalMoment, formatUtcMoment, stageCopy } from "../lib/countdown";
import { useReducedMotion } from "../hooks/useReducedMotion";

const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * One scale for the digits and the separators, so the colons sit on the same
 * em box as the numerals and stay vertically centred on them at every width.
 * Sized against the narrowest phone: six digits plus two separators and the
 * fast wheel have to fit inside 360px minus page padding.
 */
const DIGIT_SCALE = "text-[3.1rem] sm:text-[5.4rem] lg:text-[8.4rem] xl:text-[10.5rem]";

/** Splits a 0 → 1 progress value into whole units, for the elapsed strip. */
function elapsedUnits(progress: number) {
  const totalMinutes = progress * 24 * 60;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = Math.floor(totalMinutes % 60);
  return { hours, minutes };
}

/**
 * The launch countdown.
 *
 * A 24-hour window counted down in real time: a mechanical odometer for the
 * hours, minutes and seconds, a continuously turning wheel for the fractional
 * second, and a field behind it that emits a pulse on every real second. When
 * it reaches zero the whole stage changes state — the copy escalates as the
 * moment approaches, and the countdown becomes the launch.
 */
export function LaunchCountdown() {
  const reduced = useReducedMotion();
  const framerReduced = useFramerReducedMotion();
  const { remaining, progress, live, window: launchWindow } = useCountdown({ precision: "hundredths" });

  const copy = stageCopy(remaining.total, live);
  const elapsed = elapsedUnits(progress);
  const imminent = !live && remaining.total <= 60_000;
  const [copied, setCopied] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  // Announce the launch once, and let it settle.
  const [justLaunched, setJustLaunched] = useState(false);
  useEffect(() => {
    if (!live) return;
    setJustLaunched(true);
    const t = setTimeout(() => setJustLaunched(false), 4000);
    return () => clearTimeout(t);
  }, [live]);

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
    // Give the browser a moment to take the object URL before revoking.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      // Clipboard blocked — select the URL so it can still be copied by hand.
      window.prompt("Copy the launch link:", window.location.href);
    }
  };

  return (
    <section
      id="launch"
      ref={sectionRef}
      className="relative overflow-hidden border-y border-white/[0.06] bg-[#050506] py-24 sm:py-32"
    >
      {/* The field pulses on every real second */}
      <div className="pointer-events-none absolute inset-0">
        <CountdownField live={live} className="h-full w-full" />
      </div>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_60%_at_50%_50%,transparent_35%,rgba(5,5,6,0.85)_100%)]" />

      <div className="relative mx-auto max-w-6xl px-6 text-center">
        {/* Eyebrow */}
        <motion.div
          initial={framerReduced ? undefined : { opacity: 0, y: 12 }}
          whileInView={framerReduced ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.8, ease: EASE }}
          className="flex items-center justify-center gap-3"
        >
          <span
            className="relative flex h-1.5 w-1.5 items-center justify-center"
            aria-hidden="true"
          >
            <span
              className="absolute h-1.5 w-1.5 rounded-full"
              style={{
                background: live ? "#7fb88f" : "#e8b158",
                boxShadow: `0 0 12px ${live ? "#7fb88f" : "#e8b158"}`,
              }}
            />
            {!reduced && !live && (
              <span className="absolute h-1.5 w-1.5 animate-ping rounded-full bg-[#e8b158]/70" />
            )}
          </span>
          <span className="text-[0.65rem] uppercase tracking-[0.42em] text-white/45">
            {live ? "Live now" : copy.eyebrow}
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h2
          key={copy.headline}
          initial={framerReduced ? undefined : { opacity: 0, y: 10 }}
          animate={framerReduced ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE }}
          className="mt-6 font-display text-[2rem] leading-[1.1] text-white sm:text-[2.6rem]"
        >
          {copy.headline}
        </motion.h2>

        {/* The countdown itself */}
        <div className="relative mt-12 flex flex-col items-center">
          {justLaunched && !reduced && (
            <motion.div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 -z-10 rounded-full bg-[radial-gradient(circle,rgba(243,230,201,0.35),transparent_65%)]"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: [0, 0.9, 0], scale: [0.5, 1.6, 2.1] }}
              transition={{ duration: 2.2, ease: "easeOut" }}
            />
          )}

          {live ? (
            <LiveStage reduced={Boolean(reduced)} />
          ) : (
            <div
              role="timer"
              aria-live="off"
              className="flex items-start justify-center gap-1.5 sm:gap-3 lg:gap-4"
            >
              <Unit
                digits={remaining.hourDigits}
                label="Hours"
                imminent={imminent}
                reduced={Boolean(reduced)}
              />
              <Separator reduced={Boolean(reduced)} />
              <Unit
                digits={remaining.minuteDigits}
                label="Minutes"
                imminent={imminent}
                reduced={Boolean(reduced)}
              />
              <Separator reduced={Boolean(reduced)} />
              <Unit
                digits={remaining.secondDigits}
                label="Seconds"
                imminent={imminent}
                reduced={Boolean(reduced)}
              />

              {/* The fast wheel — one clean revolution per second */}
              <span className="flex flex-col items-center pl-0.5 sm:pl-1" aria-hidden="true">
                <span
                  className="flex h-[1.14em] items-center font-sans text-[1.15rem] italic leading-none text-[#e8b158] sm:text-[2.1rem] lg:text-[3.1rem] xl:text-[3.9rem]"
                >
                  <span className="opacity-60">.</span>
                  <RollWheel fraction={remaining.secondFraction} />
                </span>
                <span className="mt-2 text-[0.5rem] uppercase tracking-[0.2em] text-white/25 sm:mt-3 sm:text-[0.6rem]">
                  Sec·ths
                </span>
              </span>
            </div>
          )}

          {/* A screen reader gets the plain, unambiguous reading */}
          <span className="sr-only" aria-live="polite">
            {live
              ? "Bloom is live."
              : `${remaining.hours} hours, ${remaining.minutes} minutes and ${remaining.seconds} seconds until Bloom launches.`}
          </span>
        </div>

        {/* The 24-hour window, filling as it runs out */}
        <div className="mx-auto mt-14 w-full max-w-2xl">
          <div className="flex items-end justify-between pb-2 text-[0.6rem] uppercase tracking-[0.28em] text-white/30">
            <span>Window opened</span>
            <span className="tabular-nums text-white/50">
              {String(elapsed.hours).padStart(2, "0")}h {String(elapsed.minutes).padStart(2, "0")}m elapsed
            </span>
            <span>{live ? "Live" : "Launch"}</span>
          </div>
          <div className="relative h-px w-full bg-white/10">
            <motion.div
              className="absolute inset-y-0 left-0 w-full origin-left bg-gradient-to-r from-[#7fb88f] via-[#cdbd7e] to-[#e8b158]"
              style={{ scaleX: progress }}
              transition={{ duration: 0.6, ease: "linear" }}
            />
            <motion.span
              className="absolute top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-[#e8b158] shadow-[0_0_12px_rgba(232,177,88,0.9)]"
              style={{ left: `${Math.min(progress * 100, 99.6)}%` }}
              transition={{ duration: 0.6, ease: "linear" }}
            />
          </div>
          <div className="mt-5 flex flex-col items-center gap-1 text-[0.78rem] text-white/40 sm:flex-row sm:justify-center sm:gap-4">
            <span>{formatLocalMoment(launchWindow.end)}</span>
            <span className="hidden h-3 w-px bg-white/15 sm:block" />
            <span className="text-white/25">{formatUtcMoment(launchWindow.end)}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Magnetic strength={9}>
            <a
              href="#cta"
              data-cursor="hover"
              className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full bg-white px-7 py-3.5 text-[0.88rem] font-medium text-black transition-shadow hover:shadow-[0_20px_60px_-14px_rgba(232,177,88,0.6)]"
            >
              <span className="relative z-10">{live ? "Enter Bloom" : "Claim your place"}</span>
              <span className="relative z-10 transition-transform duration-300 group-hover:translate-x-0.5">→</span>
              <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-[#f3e6c9] to-white transition-transform duration-500 group-hover:translate-x-0" />
            </a>
          </Magnetic>
          <button
            type="button"
            onClick={addToCalendar}
            data-cursor="hover"
            className="inline-flex items-center gap-2 rounded-full border border-white/20 px-6 py-3.5 text-[0.88rem] font-medium text-white/75 backdrop-blur-sm transition-colors hover:border-white/40 hover:text-white"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <rect x="3" y="5" width="18" height="16" rx="3" stroke="currentColor" strokeWidth="1.6" />
              <path d="M3 10h18M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
            Add to calendar
          </button>
          <button
            type="button"
            onClick={copyLink}
            data-cursor="hover"
            className="inline-flex items-center gap-2 rounded-full border border-white/[0.12] px-5 py-3.5 text-[0.85rem] text-white/50 transition-colors hover:border-white/25 hover:text-white/80"
          >
            {copied ? "Link copied" : "Share"}
          </button>
        </div>

        <p className="mx-auto mt-8 max-w-md text-[0.78rem] leading-relaxed text-white/30">
          {launchWindow.rolling
            ? "Set your launch date in src/lib/countdown.ts — the site, the badge and the calendar file all follow it."
            : "The window closes in twenty-four hours. After that, Bloom is open."}
        </p>
      </div>
    </section>
  );
}

/** One unit of the countdown: digits on the odometer, label underneath. */
function Unit({
  digits,
  label,
  imminent,
  reduced,
}: {
  digits: [number, number];
  label: string;
  imminent: boolean;
  reduced: boolean;
}) {
  return (
    <div className="flex flex-col items-center">
      <DigitPair
        digits={digits}
        duration={reduced ? 0 : 0.55}
        className={`font-display leading-none tabular-nums text-white ${DIGIT_SCALE}`}
      />
      <span
        className="mt-3 text-[0.5rem] uppercase tracking-[0.26em] transition-colors duration-700 sm:mt-4 sm:text-[0.62rem]"
        style={{ color: imminent ? "rgba(232,177,88,0.8)" : "rgba(255,255,255,0.3)" }}
      >
        {label}
      </span>
    </div>
  );
}

function Separator({ reduced }: { reduced: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`flex w-[0.34em] items-center justify-center font-display leading-none text-white/20 ${DIGIT_SCALE}`}
      style={{ height: "1.14em" }}
    >
      <span className={reduced ? "" : "animate-pulse"}>:</span>
    </span>
  );
}

/** The moment it lands: the mark, lit, with the doors open. */
function LiveStage({ reduced }: { reduced: boolean }) {
  return (
    <motion.div
      initial={reduced ? undefined : { opacity: 0, scale: 0.9 }}
      animate={reduced ? undefined : { opacity: 1, scale: 1 }}
      transition={{ duration: 1, ease: EASE }}
      className="flex flex-col items-center"
    >
      <div className="relative flex items-center justify-center">
        <div className="absolute h-48 w-48 animate-breathe rounded-full bg-[radial-gradient(circle,rgba(232,177,88,0.34),transparent_70%)]" />
        <div className="absolute h-64 w-64 rounded-full border border-white/[0.07]" />
        <div className="relative flex h-28 w-28 items-center justify-center rounded-full bg-[#0c0d11] ring-1 ring-[#e8b158]/40">
          <BloomGlyph size={54} strokeWidth={10} glow />
        </div>
      </div>
      <p className="mt-8 font-display text-[2.4rem] italic text-[#f3e6c9] sm:text-[3.2rem]">
        The doors are open.
      </p>
      <p className="mt-3 text-[0.9rem] text-white/45">
        Bloom is live — your life, in bloom.
      </p>
    </motion.div>
  );
}
