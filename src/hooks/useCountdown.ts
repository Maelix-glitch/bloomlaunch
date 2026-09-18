import { useEffect, useState } from "react";
import {
  getSnapshot,
  subscribe,
  type LaunchClockState,
  type Precision,
} from "../lib/launchClock";

type Options = {
  /**
   * "hundredths" redraws up to ~30×/sec for the fast wheel; "seconds" ticks
   * once a second and is plenty for a compact readout.
   */
  precision?: Precision;
  /** keep ticking while the tab is hidden (rarely wanted) */
  pauseWhenHidden?: boolean;
  /** false unsubscribes entirely — for UI that is not on screen */
  enabled?: boolean;
};

export type CountdownState = LaunchClockState;

/**
 * Reads the site's shared launch clock.
 *
 * The loop itself lives in `lib/launchClock.ts` so that every counter on the
 * page is showing the same instant — this hook only subscribes and re-renders.
 * Driven by requestAnimationFrame rather than setInterval: it stays in step
 * with the display, pauses when the tab is hidden, and never stacks up work.
 */
export function useCountdown({
  precision = "hundredths",
  pauseWhenHidden = true,
  enabled = true,
}: Options = {}): CountdownState {
  const [state, setState] = useState<CountdownState>(getSnapshot);

  useEffect(() => {
    if (!enabled) return;
    // Adopt whatever the shared clock already knows before subscribing.
    setState(getSnapshot());
    return subscribe({ fn: setState, precision, pauseWhenHidden });
  }, [precision, pauseWhenHidden, enabled]);

  return state;
}
