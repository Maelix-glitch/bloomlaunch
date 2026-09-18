/**
 * Pure math behind the hero scrubber.
 *
 * Kept separate from React so the behaviour that matters — that the sequence
 * is a deterministic function of scroll position and therefore perfectly
 * reversible — can be tested directly.
 */

export const clamp01 = (value: number) => (value < 0 ? 0 : value > 1 ? 1 : value);

/**
 * Scroll progress (0 → 1) mapped onto a frame index (0 → count - 1).
 * When scrubbing is disabled the sequence holds one still frame, so a
 * reduced-motion visitor always sees the same composed image.
 */
export function frameIndexForProgress(
  progress: number,
  count: number,
  options: { enabled?: boolean; stillIndex?: number } = {}
): number {
  const { enabled = true, stillIndex = 0 } = options;
  const last = Math.max(count - 1, 0);
  if (!enabled) return Math.min(Math.max(stillIndex, 0), last);
  return clamp01(progress) * last;
}

/**
 * Frame-rate independent exponential smoothing: one step of the eased
 * approach toward `target`, given the frame's elapsed time in milliseconds.
 * A larger `smoothing` is silkier but slower to settle.
 */
export function easeFrame(current: number, target: number, dt: number, smoothing: number): number {
  const step = Math.max(dt, 8);
  const k = 1 - Math.exp(-step / Math.max(smoothing, 1));
  return current + (target - current) * k;
}

/** True once the eased value is close enough to be considered settled. */
export function isSettled(current: number, target: number, epsilon = 0.02): boolean {
  return Math.abs(target - current) < epsilon;
}

/** Snapshot the sequence should hold for reduced-motion visitors. */
export const REDUCED_MOTION_STILL_INDEX = 150;
