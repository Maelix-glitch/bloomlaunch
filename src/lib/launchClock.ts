import {
  WINDOW_MS,
  readAnchor,
  resolveWindow,
  splitRemaining,
  windowProgress,
  writeAnchor,
  type Remaining,
  type Window,
} from "./countdown";

/**
 * The site's single launch clock.
 *
 * Every counter on the page — the hero line, the nav badge, the odometer, the
 * footer — reads this one loop and this one resolved window. Two independent
 * tickers could disagree by a frame, and a page showing two different numbers
 * for the same moment is worse than one that shows none.
 *
 * Kept free of React so the behaviour that matters (shared window, frame
 * budget, pausing, catching up, the flip to live) can be verified directly.
 */

export type LaunchClockState = {
  remaining: Remaining;
  /** 0 → 1 through the window */
  progress: number;
  live: boolean;
  window: Window;
  /** exactly now, for anything that needs a clock */
  now: number;
};

export type Precision = "seconds" | "hundredths";

export type ClockListener = {
  fn: (state: LaunchClockState) => void;
  precision: Precision;
  pauseWhenHidden: boolean;
};

/** ~30fps is plenty for a wheel that turns once per second. */
export const FRAME_BUDGET_MS = 33;

const listeners = new Set<ClockListener>();
let rafId: number | null = null;
let activeWindow: Window | null = null;
let snapshot: LaunchClockState | null = null;
let lastFastPush = 0;
let lastSecondPush = -1;
let wasLive = false;
let watchingVisibility = false;

const nowMs = () => Date.now();

/** Turn a moment and a window into a reading. */
function read(now: number, w: Window): LaunchClockState {
  const total = w.end - now;
  const live = w.live || total <= 0;
  return {
    remaining: splitRemaining(total),
    progress: windowProgress(now, w),
    live,
    window: w,
    now,
  };
}

/**
 * Studio overrides, read from the address so the gate can be rehearsed:
 * `?unlocked` opens the site immediately, `?lock-for=N` locks it for N more
 * seconds. They only bend the anchor the window resolves from — the rolling
 * anchor a real visitor accumulates is never touched, so the override does
 * not follow them to their next visit.
 */
function overrideAnchor(now: number): number | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  if (params.has("unlocked")) return now - WINDOW_MS; // window already closed
  const lockFor = params.get("lock-for");
  if (lockFor !== null) {
    const seconds = Number.parseInt(lockFor, 10);
    if (Number.isFinite(seconds) && seconds > 0) {
      const capped = Math.min(seconds * 1000, WINDOW_MS);
      return now - (WINDOW_MS - capped); // window closes in N seconds
    }
  }

  // ⏳ TEMPORARY REHEARSAL LOCK — the studio is watching the final seconds.
  // Only the dev server honours it (production builds and the headless
  // suites never see import.meta.env.DEV), so a plain visit runs the whole
  // ceremony in about 25 seconds instead of 24 hours. REMOVE THIS BLOCK when
  // told to retrieve — the normal rolling 24-hour gate returns.
  const REHEARSAL_SECONDS = 25;
  if ((import.meta as { env?: { DEV?: boolean } }).env?.DEV) {
    return now - (WINDOW_MS - REHEARSAL_SECONDS * 1000);
  }

  return null;
}

/** Resolve the window and compute one reading. */
export function resolveOnce(): LaunchClockState {
  const now = nowMs();
  const anchor = overrideAnchor(now) ?? readAnchor();
  const resolved = resolveWindow(now, anchor);
  // Persist the rollover anchor so a reload keeps the same window.
  if (resolved.rolling && anchor === null) writeAnchor(resolved.start);
  activeWindow = resolved;
  snapshot = read(now, resolved);
  wasLive = snapshot.live;
  return snapshot;
}

export function getSnapshot(): LaunchClockState {
  return snapshot ?? resolveOnce();
}

function schedule() {
  if (rafId === null) rafId = requestAnimationFrame(pump);
}

function keepRunningWhenHidden() {
  for (const l of listeners) if (!l.pauseWhenHidden) return true;
  return false;
}

function pump() {
  rafId = null;
  if (document.visibilityState === "hidden" && !keepRunningWhenHidden()) {
    // Parked. The visibility listener restarts us with a fresh reading.
    lastFastPush = 0;
    lastSecondPush = -1;
    return;
  }

  const now = nowMs();
  const w = activeWindow ?? resolveOnce().window;
  snapshot = read(now, w);
  const { remaining, live } = snapshot;

  const fastDue = now - lastFastPush >= FRAME_BUDGET_MS;
  const secondDue = remaining.seconds !== lastSecondPush;
  // Crossing zero is the one moment nothing may wait a frame for.
  const flipped = live !== wasLive;
  if (fastDue) lastFastPush = now;
  if (secondDue) lastSecondPush = remaining.seconds;
  wasLive = live;

  if (fastDue || secondDue || flipped) {
    for (const l of listeners) {
      if (flipped || (l.precision === "hundredths" ? fastDue : secondDue)) l.fn(snapshot);
    }
  }

  schedule();
}

function onVisibility() {
  if (document.visibilityState === "hidden") return;
  // Catch up immediately when the visitor comes back to the tab. Re-read
  // first: notifying with the snapshot from before the pause would flash
  // numbers that are however long the visitor was away out of date.
  lastFastPush = 0;
  lastSecondPush = -1;
  const now = nowMs();
  if (activeWindow === null || activeWindow.end - now <= 0) resolveOnce();
  const w = activeWindow ?? getSnapshot().window;
  snapshot = read(now, w);
  wasLive = snapshot.live;
  for (const l of listeners) l.fn(snapshot);
  schedule();
}

/** Subscribe to the shared clock. Returns the unsubscribe function. */
export function subscribe(listener: ClockListener): () => void {
  listeners.add(listener);
  if (snapshot === null) resolveOnce();
  if (!watchingVisibility) {
    document.addEventListener("visibilitychange", onVisibility);
    watchingVisibility = true;
  }
  schedule();
  return () => {
    listeners.delete(listener);
    stopIfIdle();
  };
}

export function stopIfIdle() {
  if (listeners.size > 0) return;
  if (rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
  if (watchingVisibility) {
    document.removeEventListener("visibilitychange", onVisibility);
    watchingVisibility = false;
  }
}

/** Test seam: drop all state so a harness can start from cold. */
export function resetClock() {
  stopIfIdle();
  listeners.clear();
  activeWindow = null;
  snapshot = null;
  lastFastPush = 0;
  lastSecondPush = -1;
  wasLive = false;
}

export const __internals = {
  get listenerCount() {
    return listeners.size;
  },
  get running() {
    return rafId !== null;
  },
  get window() {
    return activeWindow;
  },
};
