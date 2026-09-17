/* ============================================================
   BLOOM · MOTION CORE
   Reduced-motion awareness, easing, damping, and a single
   shared rAF scheduler (one loop, many subscribers — keeps the
   main thread calm even with several parallax layers).
   ============================================================ */

const reducedQuery =
  typeof window !== 'undefined' && 'matchMedia' in window
    ? window.matchMedia('(prefers-reduced-motion: reduce)')
    : null;

export const prefersReducedMotion = (): boolean => reducedQuery?.matches ?? false;

export const onReducedMotionChange = (cb: (reduced: boolean) => void): (() => void) => {
  if (!reducedQuery) return () => {};
  const handler = (e: MediaQueryListEvent) => cb(e.matches);
  reducedQuery.addEventListener('change', handler);
  return () => reducedQuery.removeEventListener('change', handler);
};

/* --- easing --- */
export const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));
export const clamp = (v: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, v));
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/** Frame-rate independent exponential damping. */
export const damp = (current: number, target: number, lambda: number, dt: number): number =>
  lerp(current, target, 1 - Math.exp(-lambda * dt));

/* --- shared rAF scheduler --- */

type TickFn = (dt: number, t: number) => void;

const subscribers = new Set<TickFn>();
let rafId: number | null = null;
let last = 0;

const loop = (t: number): void => {
  const dt = Math.min(0.05, (t - last) / 1000 || 0.016);
  last = t;
  for (const fn of subscribers) fn(dt, t);
  rafId = subscribers.size > 0 ? requestAnimationFrame(loop) : null;
};

export const onTick = (fn: TickFn): (() => void) => {
  subscribers.add(fn);
  if (rafId === null) {
    last = performance.now();
    rafId = requestAnimationFrame(loop);
  }
  return () => {
    subscribers.delete(fn);
    if (subscribers.size === 0 && rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  };
};

/* --- viewport helpers --- */

/**
 * Progress of an element through the viewport, 0 (entering from
 * bottom) → 1 (leaving at top). Stable for parallax math.
 */
export const viewportProgress = (el: HTMLElement, vh: number): number => {
  const rect = el.getBoundingClientRect();
  const total = vh + rect.height;
  if (total <= 0) return 0.5;
  return clamp01((vh - rect.top) / total);
};
