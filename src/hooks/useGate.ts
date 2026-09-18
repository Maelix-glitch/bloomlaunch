import { useCountdown } from "./useCountdown";
import { gateStateFromWindow, type GateState } from "../lib/gate";

/**
 * Is the site open? Subscribes to the one launch clock, so the gate flips at
 * the exact instant the countdown does — no separate timer to disagree with.
 */
export function useGate(): GateState {
  const { remaining, live, window: w, now } = useCountdown({ precision: "seconds" });
  const state = gateStateFromWindow(now, w);
  // The hook already knows live; trust it over the window flag so the gate
  // and the countdown can never read differently at the same tick.
  const open = live || state.open;
  return {
    open,
    locked: !open,
    remaining: open ? 0 : Math.max(0, remaining.total),
  };
}
