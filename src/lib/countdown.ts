/**
 * Countdown logic.
 *
 * Pure and dependency-free so the arithmetic, the local-time rendering and the
 * calendar file can all be verified without a browser.
 */

/**
 * The launch moment, as an ISO 8601 string with an explicit offset.
 *
 * ⚠️ ONE LINE TO CHANGE FOR THE REAL LAUNCH. Set this to the actual moment the
 * app goes live — an ISO string **with an explicit offset**, e.g.
 * `"2026-10-01T20:00:00+05:30"` — and the whole site follows: the section, the
 * nav badge, the hero line, the footer, the calendar file and the takeover all
 * read from here.
 *
 * Left unset (null) the site counts down a rolling 24-hour window anchored to
 * each visitor's first visit, so it is always a live, running 24-hour
 * countdown rather than negative time or a stale date. That is the right
 * default until the real date is known — a placeholder date would silently
 * expire and leave the site sitting in its "live" state.
 */
export const LAUNCH_AT: string | null = null;

/** Length of the launch window. */
export const WINDOW_MS = 24 * 60 * 60 * 1000;

const STORAGE_KEY = "bloom:window-anchor";

export type Window = {
  start: number;
  end: number;
  /** the target moment has passed */
  live: boolean;
  /** true when running on the rolling fallback rather than a configured date */
  rolling: boolean;
};

export function parseLaunchAt(value: string | null): number | null {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Works out which window the site is counting down to.
 *
 * A configured launch date is an absolute fact and always wins: the window is
 * the 24 hours before it, and once it has passed the site stays live. It never
 * restarts — a visitor arriving the day after launch must not be handed a
 * fresh 24-hour countdown to a moment that has already happened.
 *
 * With no date configured the visitor gets a 24-hour window anchored to when
 * they first arrived, remembered so a reload doesn't restart it.
 *
 * `configuredAt` is injectable so both paths can be exercised directly;
 * callers only ever pass the first two arguments.
 */
export function resolveWindow(
  now: number,
  storedAnchor: number | null,
  configuredAt: number | null = parseLaunchAt(LAUNCH_AT)
): Window {
  const configured = configuredAt;
  if (configured !== null && Number.isFinite(configured)) {
    return {
      start: configured - WINDOW_MS,
      end: configured,
      live: now >= configured,
      rolling: false,
    };
  }

  if (storedAnchor !== null && Number.isFinite(storedAnchor) && now < storedAnchor + WINDOW_MS) {
    return { start: storedAnchor, end: storedAnchor + WINDOW_MS, live: false, rolling: true };
  }

  // Unconfigured, expired, or a stale anchor: start a fresh window now.
  return { start: now, end: now + WINDOW_MS, live: false, rolling: true };
}

export function readAnchor(): number | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const value = Number(raw);
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

export function writeAnchor(value: number): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, String(value));
  } catch {
    /* storage blocked — the window simply re-anchors next visit */
  }
}

export type Remaining = {
  /** whole days, when the target is further off than the 24-hour window */
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  /** 0 → 999, the millisecond hand */
  milliseconds: number;
  /** fractional rotation 0 → 1 through the current second */
  secondFraction: number;
  /** the digits of each field, zero padded to a pair */
  dayDigits: [number, number];
  hourDigits: [number, number];
  minuteDigits: [number, number];
  secondDigits: [number, number];
  total: number;
};

/** Splits a remaining duration into display fields. Never returns negatives. */
export function splitRemaining(ms: number): Remaining {
  const safe = Math.max(0, Math.floor(ms));
  const hours = Math.floor(safe / 3_600_000);
  const minutes = Math.floor((safe % 3_600_000) / 60_000);
  const seconds = Math.floor((safe % 60_000) / 1000);
  const milliseconds = safe % 1000;

  return {
    days: Math.floor(hours / 24),
    hours,
    minutes,
    seconds,
    milliseconds,
    secondFraction: milliseconds / 1000,
    dayDigits: digitsOf(Math.floor(hours / 24)),
    hourDigits: digitsOf(hours),
    minuteDigits: digitsOf(minutes),
    secondDigits: digitsOf(seconds),
    total: safe,
  };
}

function digitsOf(value: number): [number, number] {
  const clamped = Math.max(0, Math.min(99, Math.floor(value)));
  return [Math.floor(clamped / 10), clamped % 10];
}

export type Phase = "before" | "window" | "live";

/**
 * Where we are relative to the launch.
 *
 * "before" is everything up to the window opening — the time before the final
 * 24 hours, which is where a real launch date usually sits for weeks. The
 * odometer only makes sense inside the window: its hour field is two digits.
 */
export function windowPhase(now: number, window_: Pick<Window, "start" | "end">): Phase {
  if (now >= window_.end) return "live";
  if (now < window_.start) return "before";
  return "window";
}

/** How far through the 24-hour window we are, 0 → 1. */
export function windowProgress(now: number, window_: Pick<Window, "start" | "end">): number {
  const span = window_.end - window_.start;
  if (span <= 0) return 1;
  return clamp01((now - window_.start) / span);
}

export function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/**
 * Copy that escalates as the moment approaches. This is the thing that makes a
 * countdown feel like an event rather than a clock.
 */
export function stageCopy(
  remaining: number,
  live: boolean,
  phase: Phase = "window"
): { eyebrow: string; headline: string } {
  if (live) return { eyebrow: "The wait is over", headline: "Bloom is live." };
  if (phase === "before") {
    const days = Math.floor(remaining / 86_400_000);
    if (days >= 2) return { eyebrow: `${days} days out`, headline: "Counting down to the final day." };
    if (days === 1) return { eyebrow: "One day out", headline: "The final 24 hours begin tomorrow." };
    return { eyebrow: "Almost time", headline: "The final 24 hours begin soon." };
  }
  const minutes = remaining / 60_000;
  if (minutes <= 1) return { eyebrow: "Sixty seconds", headline: "Hold your breath." };
  if (minutes <= 10) return { eyebrow: "The final minutes", headline: "Almost there." };
  if (minutes <= 60) return { eyebrow: "The final hour", headline: "One hour to go." };
  if (minutes <= 360) return { eyebrow: "Launch window", headline: "The last stretch." };
  return { eyebrow: "Launch window", headline: "The wait is almost over." };
}

/**
 * The launch moment written in the visitor's own timezone — a countdown means
 * nothing without a wall-clock anchor.
 */
export function formatLocalMoment(ms: number, locale?: string): string {
  const date = new Date(ms);
  try {
    return new Intl.DateTimeFormat(locale, {
      weekday: "long",
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
      timeZoneName: "short",
    }).format(date);
  } catch {
    return date.toISOString();
  }
}

export function formatUtcMoment(ms: number): string {
  const date = new Date(ms);
  return `${date.toISOString().slice(0, 16).replace("T", " ")} UTC`;
}

/** 1241 → "20:41" */
export function formatClock(ms: number): string {
  const r = splitRemaining(ms);
  return [r.hours, r.minutes, r.seconds].map((n) => String(n).padStart(2, "0")).join(":");
}

/* ------------------------------------------------------------------ */
/* Calendar file                                                       */
/* ------------------------------------------------------------------ */

function icsStamp(ms: number): string {
  return new Date(ms).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/** RFC 5545 text escaping: backslash first, then the separators. */
export function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/** RFC 5545 folds content lines at 75 octets, continuing with a space. */
export function foldIcsLine(line: string): string {
  const bytes = Buffer.from(line, "utf8");
  if (bytes.length <= 75) return line;

  const parts: string[] = [];
  let current = "";
  let length = 0;
  for (const char of line) {
    const size = Buffer.byteLength(char, "utf8");
    if (length + size > 75) {
      parts.push(current);
      current = "";
      length = 0;
    }
    current += char;
    length += size;
  }
  if (current) parts.push(current);
  return parts.map((part, i) => (i === 0 ? part : ` ${part}`)).join("\r\n");
}

export type CalendarEvent = {
  start: number;
  end: number;
  title: string;
  description: string;
  url: string;
  /** stable id so re-importing updates rather than duplicates */
  uid: string;
  stamp: number;
};

/**
 * Builds a valid .ics document for the launch moment. Real functionality, not
 * decoration — it is how you actually get a launch reminder into someone's
 * calendar.
 */
export function buildIcs(event: CalendarEvent): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Bloom//Launch Countdown//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${event.uid}`,
    `DTSTAMP:${icsStamp(event.stamp)}`,
    `DTSTART:${icsStamp(event.start)}`,
    `DTEND:${icsStamp(event.end)}`,
    `SUMMARY:${escapeIcsText(event.title)}`,
    `DESCRIPTION:${escapeIcsText(event.description)}`,
    `URL:${escapeIcsText(event.url)}`,
    "BEGIN:VALARM",
    "TRIGGER:-PT15M",
    "ACTION:DISPLAY",
    `DESCRIPTION:${escapeIcsText(event.title)}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return `${lines.map(foldIcsLine).join("\r\n")}\r\n`;
}
