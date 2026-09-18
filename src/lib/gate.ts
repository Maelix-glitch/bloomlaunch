import { resolveWindow, type Window } from "./countdown";

/**
 * The launch gate.
 *
 * The landing page IS the countdown: nothing past it — the story, the nine
 * surfaces, the finale — is reachable until the 24-hour window closes and
 * Bloom goes live. The gate answers from the very same resolved window the
 * countdown does, so they open at the same instant.
 *
 * Studio rehearsals bend the window through the address (`?unlocked`,
 * `?lock-for=N`); that bending lives in `launchClock.overrideAnchor` so the
 * gate, the odometer and every counter move together.
 */

export type GateState = {
  /** True once the launch window closes and the site opens. */
  open: boolean;
  /** True while the site sits behind the countdown. */
  locked: boolean;
  /** How long until it opens, clamped at zero. */
  remaining: number;
};

/** Pure answer from a resolved window — the form the clock hands back. */
export function gateStateFromWindow(now: number, w: Window): GateState {
  const remaining = Math.max(0, w.end - now);
  const open = w.live || remaining <= 0;
  return { open, locked: !open, remaining };
}

/** Answer straight from a now and an anchor (the rolling-window path). */
export function gateStateAt(now: number, anchor: number | null, configuredAt?: number | null): GateState {
  return gateStateFromWindow(now, resolveWindow(now, anchor, configuredAt));
}
