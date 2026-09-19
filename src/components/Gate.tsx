import { useEffect, useRef, useState, type CSSProperties } from "react";
import { motion, useReducedMotion as useFramerReducedMotion } from "framer-motion";
import { CountdownField } from "./CountdownField";
import { RollWheel } from "./DigitRoller";
import { BloomGlyph } from "./Logo";
import { useCountdown } from "../hooks/useCountdown";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { buildIcs, formatLocalMoment, formatUtcMoment, stageCopy, windowPhase } from "../lib/countdown";
import { score } from "../lib/score";
import { acquireScrollLock } from "../lib/scrollLock";
import { DAYS_SCALE, DIGIT_SCALE, Separator, Unit } from "../sections/LaunchCountdown";

const EASE = [0.16, 1, 0.3, 1] as const;

/** The final ten seconds belong to the film. */
const FINALE_MS = 10_000;

/**
 * The royal gate — played like a film.
 *
 * Until the 24-hour window closes, the entire site stands behind this
 * screen, and the screen belongs to one object: a huge, faded lock, engraved
 * in gold like something on a vault door. The gilded countdown keeps time
 * over it. For the final ten seconds the frame goes cinematic — letterbox
 * bars, grain, one giant numeral counting 10 → 1 — and the lock's keyhole
 * begins to glow.
 *
 * At zero the gate unseals: the countdown dissolves away to a distorted,
 * fading sound, the shackle swings open, and light pours out of the keyhole
 * until it covers everything. Then the light slowly ebbs and the website is
 * there, underneath, settling into view.
 *
 * The gate polices itself from the one clock the whole site reads, so it
 * opens at the exact instant the countdown does. A visitor arriving after
 * launch never sees it.
 */
export function Gate() {
  const reduced = useReducedMotion();
  const framerReduced = useFramerReducedMotion();
  const { remaining, progress, live, window: launchWindow, now } = useCountdown({ precision: "hundredths" });

  const phase = windowPhase(now, launchWindow);
  const copy = stageCopy(remaining.total, live, phase);
  const imminent = !live && remaining.total <= 60_000;

  // --- the finale ----------------------------------------------------------
  const finale = phase === "window" && !live && remaining.total <= FINALE_MS;
  const bigNumber = Math.max(1, Math.ceil(remaining.total / 1000));

  // --- sound ---------------------------------------------------------------
  const [soundOn, setSoundOn] = useState(false);
  const wakeSound = () => {
    void score.enable().then(() => setSoundOn(score.isEnabled()));
  };
  const toggleSound = () => {
    if (score.isEnabled()) {
      score.disable();
      setSoundOn(false);
    } else {
      wakeSound();
    }
  };

  // The slow climb starts with the finale; there is no beat on this gate.
  const finaleStartedRef = useRef(false);
  useEffect(() => {
    if (finale && !finaleStartedRef.current) {
      finaleStartedRef.current = true;
      score.startRiser(Math.max(1, Math.ceil(remaining.total / 1000)));
    }
  }, [finale, remaining.total]);

  // --- the unsealing -------------------------------------------------------
  // locked → unsealing (the countdown dissolves, the shackle opens, the light
  // is born in the keyhole) → blinded (light covers everything, the warm
  // chord swells) → revealing (the light ebbs, the site appears) → done.
  //
  // ⚠️ The ceremony is scheduled exactly once, the moment `live` flips — and
  // `stage` must NOT be in this effect's deps. Every stage transition re-runs
  // a subscribed effect, and the re-run's cleanup cancels the timers it just
  // made — the gate would freeze mid-light and the site would never reveal.
  const [stage, setStage] = useState<"locked" | "unsealing" | "blinded" | "revealing" | "done">(() =>
    live ? "done" : "locked"
  );
  const unsealedRef = useRef(false);
  const reducedRef = useRef(Boolean(reduced));
  useEffect(() => {
    reducedRef.current = Boolean(reduced);
  }, [reduced]);
  useEffect(() => {
    if (!live || unsealedRef.current) return;
    // Visitors arriving after launch initialise in "done"; the ceremony is
    // only for the ones who were sealed in when the clock struck zero.
    if (stage !== "locked") return;
    unsealedRef.current = true;
    // The visitor's drop, raw and alone — the site's own voices stay out of
    // its way. The riser ends where the drop begins.
    score.cancelRiser();
    score.drop();
    setStage("unsealing");
    // The light holds its breath for a second after zero, then runs
    // vertically, then the flashbang.
    const blindAt = reducedRef.current ? 450 : 2100;
    const revealAt = reducedRef.current ? 800 : 3400;
    const goneAt = reducedRef.current ? 1800 : 7200;
    const t1 = window.setTimeout(() => {
      setStage("blinded");
    }, blindAt);
    const t2 = window.setTimeout(() => setStage("revealing"), revealAt);
    const t3 = window.setTimeout(() => setStage("done"), goneAt);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live]);

  // While the gate stands, the page beneath it does not scroll. Keyed to the
  // gate still standing rather than to mount: <Gate /> never unmounts (it
  // renders null when done), and the refcounted lock means the preloader's
  // earlier hold can't leak into the revealed site.
  const standing = stage !== "done";
  useEffect(() => {
    if (!standing) return;
    return acquireScrollLock();
  }, [standing]);

  const [copied, setCopied] = useState(false);
  const [lockLoaded, setLockLoaded] = useState(false);

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
  const unsealing = stage !== "locked";
  const revealing = stage === "revealing";
  const lockOpacity = unsealing ? 1 : finale ? 0.8 : 0.5;

  if (stage === "done") return null;

  return (
    <motion.section
      aria-label="Bloom opens after the countdown"
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-[#050506]"
      onPointerDown={wakeSound}
      animate={{ opacity: revealing ? 0 : 1 }}
      transition={{ duration: reduced ? 0.8 : 3.7, ease: [0.4, 0, 0.2, 1] }}
    >
      {/* The field: pulse rings on every real second, drifting light */}
      <div className="pointer-events-none absolute inset-0">
        <CountdownField live={live} className="h-full w-full" />
      </div>

      {/* A slow-turning golden aura, racing during the finale */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 h-[140vmax] w-[140vmax] -translate-x-1/2 -translate-y-1/2"
        style={{
          background:
            "conic-gradient(from 90deg, transparent 0deg, rgba(232,177,88,0.055) 24deg, transparent 60deg, rgba(141,123,242,0.04) 130deg, transparent 170deg, rgba(232,177,88,0.055) 240deg, transparent 285deg, rgba(127,184,143,0.035) 330deg, transparent 360deg)",
          animation: reduced
            ? undefined
            : finale || unsealing
              ? "gate-aura-fast 5s linear infinite"
              : "gate-aura 48s linear infinite",
          opacity: finale ? 1 : 0.7,
          maskImage: "radial-gradient(circle, black 0%, transparent 58%)",
          WebkitMaskImage: "radial-gradient(circle, black 0%, transparent 58%)",
        }}
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_60%_at_50%_50%,transparent_30%,rgba(5,5,6,0.92)_100%)]" />

      {/* The royal seal: huge and faded, painted in old gold. The black it
          sits on is the same black as the gate, so a screen blend makes the
          darkness disappear and only the lock remains, glowing. */}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 mix-blend-screen"
        animate={{ opacity: lockOpacity, scale: unsealing ? 1.07 : finale ? 1.02 : 1 }}
        transition={{ duration: 1.4, ease: EASE }}
        style={{ width: "min(88vmin, 760px)" }}
      >
        <img
          src="/royal-lock.jpg"
          alt=""
          decoding="async"
          fetchPriority="high"
          draggable={false}
          onLoad={() => setLockLoaded(true)}
          className="w-full select-none"
          style={{ opacity: lockLoaded ? 1 : 0, transition: "opacity 1.6s ease" }}
        />
      </motion.div>

      {/* Film grain + flicker during the finale */}
      {finale && !reduced && !unsealing && (
        <>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -inset-[4%] opacity-[0.07] mix-blend-screen"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)'/%3E%3C/svg%3E\")",
              animation: "gate-grain 0.9s steps(4) infinite",
            }}
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[#f3e6c9] mix-blend-overlay"
            style={{ animation: "gate-flicker 1.6s steps(8) infinite" }}
          />
        </>
      )}

      {/* The frame: double rule with gilded corners */}
      <motion.div
        aria-hidden="true"
        initial={framerReduced ? undefined : { opacity: 0 }}
        animate={framerReduced ? undefined : { opacity: unsealing ? 0 : 1 }}
        transition={{ duration: unsealing ? 0.7 : 1.4, ease: EASE }}
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

      {/* Letterbox bars for the finale — the frame goes cinema */}
      {finale && (
        <>
          <motion.div
            aria-hidden="true"
            className="absolute inset-x-0 top-0 z-40 bg-black"
            initial={{ height: "0vh" }}
            animate={{ height: unsealing ? "0vh" : "9vh" }}
            transition={{ duration: 0.9, ease: EASE }}
          />
          <motion.div
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 z-40 bg-black"
            initial={{ height: "0vh" }}
            animate={{ height: unsealing ? "0vh" : "9vh" }}
            transition={{ duration: 0.9, ease: EASE }}
          />
        </>
      )}

      {/* The ceremony itself */}
      <motion.div
        className="relative flex max-h-full w-full max-w-4xl flex-col items-center overflow-y-auto px-8 py-10 text-center sm:px-12"
        animate={{ opacity: unsealing ? 0 : finale ? 0.14 : 1, scale: finale ? 0.92 : 1 }}
        transition={{ duration: unsealing ? 0.75 : 0.9, ease: EASE }}
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

      {/* The final ten: one giant numeral, alone on the screen */}
      {finale && !unsealing && (
        <div className="pointer-events-none absolute inset-0 z-30 flex flex-col items-center justify-center">
          <motion.div
            key={bigNumber}
            initial={reduced ? { opacity: 1 } : { opacity: 0, scale: 1.4, filter: "blur(14px)" }}
            animate={reduced ? { opacity: 1 } : { opacity: 1, scale: 1, filter: "blur(0px)" }}
            transition={{ duration: 0.55, ease: [0.2, 0.9, 0.2, 1] }}
            className="flex flex-col items-center"
          >
            <span
              aria-hidden="true"
              className="font-display leading-none text-[#eed9a4]"
              style={{
                fontSize: "min(52vmin, 30rem)",
                textShadow:
                  "0 0 40px rgba(232,177,88,0.5), 0 0 140px rgba(232,177,88,0.25), 0 0 8px rgba(243,230,201,0.6)",
              }}
            >
              {bigNumber}
            </span>
            <span className="mt-2 text-[0.62rem] uppercase tracking-[0.6em] text-[#e8b158]/70 sm:text-[0.7rem]">
              {bigNumber === 1 ? "Hold your breath" : "The lock is about to break"}
            </span>
          </motion.div>
        </div>
      )}

      {/* Sound: browsers need a gesture; the switch and any touch offer one */}
      {!unsealing && (
        <button
          type="button"
          onClick={toggleSound}
          onPointerDown={(e) => e.stopPropagation()}
          aria-pressed={soundOn}
          className="absolute bottom-6 right-6 z-50 rounded-full border border-white/15 bg-black/40 px-4 py-2 text-[0.6rem] uppercase tracking-[0.3em] text-white/60 backdrop-blur-sm transition-colors duration-300 hover:border-[#e8b158]/60 hover:text-[#f3e6c9] sm:bottom-9 sm:right-9"
        >
          {soundOn ? "Sound on" : "Enable sound"}
        </button>
      )}

      {/* The light, born in the keyhole.
          First: a vertical streak at the speed of light.
          Then: the flashbang — white, bright, covering every corner. */}
      {unsealing && (
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-40">
          {/* The vertical streak, through the keyhole */}
          {!reduced && (
            <motion.div
              className="absolute inset-y-0 left-1/2"
              style={{
                width: "6px",
                marginLeft: "-3px",
                transformOrigin: "50% 64%",
                background:
                  "linear-gradient(to bottom, transparent 0%, #ffffff 16%, #ffffff 84%, transparent 100%)",
                boxShadow:
                  "0 0 24px 6px rgba(255,255,255,0.85), 0 0 120px 42px rgba(243,230,201,0.45)",
              }}
              initial={{ scaleY: 0, opacity: 0 }}
              animate={{ scaleY: 1, opacity: 1 }}
              transition={{ duration: 0.22, ease: [0.15, 0.9, 0.2, 1], delay: 1.0 }}
            />
          )}
          {/* The flashbang, out of the keyhole to every corner */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative" style={{ width: "min(88vmin, 760px)" }}>
              <motion.div
                className="absolute left-1/2 top-[64%] rounded-full"
                style={{
                  width: "78vmax",
                  height: "78vmax",
                  marginLeft: "calc(78vmax / -2)",
                  marginTop: "calc(78vmax / -2)",
                  background:
                    "radial-gradient(circle, #ffffff 0%, rgba(255,255,255,0.98) 30%, rgba(243,230,201,0.92) 54%, rgba(232,177,88,0) 74%)",
                }}
                initial={reduced ? { scale: 4.4, opacity: 0 } : { scale: 0.03, opacity: 0 }}
                animate={{ scale: stage === "unsealing" ? 1.9 : 4.6, opacity: stage === "unsealing" ? [0, 0.95] : 1 }}
                transition={
                  stage === "unsealing"
                    ? { duration: reduced ? 0.35 : 0.75, delay: reduced ? 0 : 1.28, ease: [0.25, 0.8, 0.3, 1] }
                    : { duration: 0.45, ease: "easeOut" }
                }
              />
            </div>
          </div>
        </div>
      )}

      {/* As the light ebbs, one sweep of it crosses the appearing site */}
      {revealing && !reduced && (
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 z-40 w-[60%] mix-blend-screen"
          style={{
            background:
              "linear-gradient(100deg, transparent 28%, rgba(243,230,201,0.55) 50%, transparent 72%)",
          }}
          initial={{ x: "-80%", opacity: 0 }}
          animate={{ x: "260%", opacity: [0, 0.55, 0] }}
          transition={{ duration: 3.4, ease: "easeInOut", times: [0, 0.5, 1] }}
        />
      )}

      {/* Blinded: the light covers everything, then ebbs with the gate */}
      {stage !== "unsealing" && stage !== "locked" && (
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-50 bg-white"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.96 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
        />
      )}
    </motion.section>
  );
}
