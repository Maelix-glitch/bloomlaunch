/**
 * Frame sequence loader.
 *
 * Loads the 192-frame Bloom hero sequence (AVIF) progressively:
 *   1. a coarse "keyframe" pass (every 8th frame) so the scrub is usable
 *      almost immediately,
 *   2. then every remaining frame in the background.
 *
 * The scrubber always draws the *nearest already-loaded* frame, so the
 * animation can start before the full sequence has arrived and never
 * shows a blank canvas. Everything lives in a module singleton so the
 * preloader and the hero share one download.
 */

import { BASE_URL } from "./assets";

export const FRAME_COUNT = 192;

/** Frame files are 1-indexed on disk: bloom_0001 … bloom_0192. */
export function frameUrl(index: number): string {
  const n = Math.min(Math.max(index, 0), FRAME_COUNT - 1) + 1;
  return `${BASE_URL}frames/bloom_${String(n).padStart(4, "0")}.avif`;
}

export const POSTER_URL = `${BASE_URL}frames/poster.webp`;
export const POSTER_AVIF_URL = `${BASE_URL}frames/poster.avif`;
export const STILL_URL = `${BASE_URL}frames/still.webp`;

export type LoaderStatus = {
  /** frames decoded and ready to draw */
  loaded: number;
  /** 0 → 1, weighted so the coarse pass reads as "almost there" */
  ratio: number;
  /** the coarse pass is complete — the scrub is smooth enough to use */
  coarseReady: boolean;
  /** full sequence is in memory */
  complete: boolean;
  /** AVIF could not be decoded — the hero falls back to a still */
  unsupported: boolean;
};

type Listener = (status: LoaderStatus) => void;

const COARSE_STRIDE = 8;
const CONCURRENCY = 4;
const NEAR_WINDOW = 3; // radius searched before falling back to a full scan

function isLightConnection(): boolean {
  const conn = (navigator as Navigator & {
    connection?: { saveData?: boolean; effectiveType?: string };
  }).connection;
  if (!conn) return false;
  if (conn.saveData) return true;
  return conn.effectiveType === "slow-2g" || conn.effectiveType === "2g";
}

class FrameSequence {
  private images: (HTMLImageElement | null)[] = new Array(FRAME_COUNT).fill(null);
  private ready: boolean[] = new Array(FRAME_COUNT).fill(false);
  private listeners = new Set<Listener>();

  private order: number[] = [];
  private cursor = 0;
  private inFlight = 0;
  private started = false;
  /** frames that belong to the fast first pass (not simply every 8th index) */
  private coarseSet = new Set<number>();
  private coarseTotal = 0;
  private coarseLoaded = 0;
  /** how many frames this session intends to load at all */
  private planned = FRAME_COUNT;

  private state: LoaderStatus = {
    loaded: 0,
    ratio: 0,
    coarseReady: false,
    complete: false,
    unsupported: false,
  };

  get status(): LoaderStatus {
    return this.state;
  }

  getImage(index: number): HTMLImageElement | null {
    return this.images[index] ?? null;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit(next: Partial<LoaderStatus>) {
    this.state = { ...this.state, ...next };
    this.listeners.forEach((l) => l(this.state));
  }

  /** Nearest frame index that is decoded and ready to draw, or -1. */
  nearest(index: number): number {
    const target = Math.min(Math.max(Math.round(index), 0), FRAME_COUNT - 1);
    if (this.ready[target]) return target;

    for (let d = 1; d <= NEAR_WINDOW; d += 1) {
      const ahead = target + d;
      const behind = target - d;
      if (ahead < FRAME_COUNT && this.ready[ahead]) return ahead;
      if (behind >= 0 && this.ready[behind]) return behind;
    }

    let best = -1;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (let i = 0; i < FRAME_COUNT; i += 1) {
      if (!this.ready[i]) continue;
      const distance = Math.abs(i - target);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = i;
      }
    }
    return best;
  }

  /**
   * Begin loading. `"still"` fetches only the first frame (reduced motion or
   * data-saver), `"sequence"` runs the coarse pass then fills the gaps.
   */
  /**
   * Upgrade a still-only session to the full sequence — used when a visitor
   * with reduce-motion enabled explicitly asks to play the animation.
   */
  ensureSequence() {
    if (!this.started) {
      this.start("sequence");
      return;
    }
    if (this.planned > 1) return;
    this.buildOrder("sequence");
  }

  private buildOrder(mode: "sequence" | "still") {
    if (mode === "still") {
      this.coarseSet = new Set([0]);
      this.coarseTotal = 1;
      this.order = [0];
      this.planned = 1;
      this.pump();
      return;
    }

    const coarse: number[] = [];
    for (let i = 0; i < FRAME_COUNT; i += COARSE_STRIDE) coarse.push(i);
    // The final frame is a keyframe too, so the end state is always available.
    if (!coarse.includes(FRAME_COUNT - 1)) coarse.push(FRAME_COUNT - 1);

    this.coarseSet = new Set(coarse);
    this.coarseTotal = coarse.length;

    const rest: number[] = [];
    for (let i = 0; i < FRAME_COUNT; i += 1) if (!this.coarseSet.has(i)) rest.push(i);

    // On metered / slow connections keep just the coarse pass — the scrub
    // then steps between keyframes instead of pulling every frame.
    const order = isLightConnection() ? coarse : [...coarse, ...rest];
    this.order = order;
    this.planned = order.length;
    this.cursor = 0;
    this.pump();
  }

  start(mode: "sequence" | "still" = "sequence") {
    if (this.started) return;
    this.started = true;
    this.buildOrder(mode);
  }

  private pump() {
    while (this.inFlight < CONCURRENCY && this.cursor < this.order.length) {
      const index = this.order[this.cursor];
      this.cursor += 1;
      // Already decoded or in flight — an upgraded session re-walks the same
      // order, so anything we already asked for must not be fetched twice.
      if (this.images[index] || this.ready[index]) continue;
      this.inFlight += 1;
      this.load(index);
    }
  }

  private load(index: number) {
    const img = new Image();
    img.decoding = "async";
    (img as HTMLImageElement & { fetchPriority?: string }).fetchPriority =
      index < this.coarseTotal ? "high" : "low";
    this.images[index] = img;

    let settled = false;
    const settle = (ok: boolean) => {
      // An image must only ever settle once. Without this, any second
      // invocation path would decrement the in-flight count twice and inflate
      // the progress counters past 100%.
      if (settled) return;
      settled = true;
      this.inFlight -= 1;

      if (!ok) {
        // The very first frame failing means this browser cannot decode AVIF.
        if (index === 0) {
          // Avalanche the remaining downloads: nothing else is drawable.
          this.order = [];
          this.cursor = 0;
          this.emit({ unsupported: true, coarseReady: true, complete: true, ratio: 1 });
          return;
        }
        this.pump();
        return;
      }

      this.ready[index] = true;
      // Deliberately NOT calling img.decode() here. Forcing a decode for every
      // frame makes the browser retain all 192 full-resolution bitmaps
      // (~1.6 GB), so it evicts and re-decodes on every scroll — which is far
      // worse than letting it decode the handful of frames actually on screen.

      if (this.coarseSet.has(index)) this.coarseLoaded += 1;
      const coarseReady = this.coarseLoaded >= this.coarseTotal;
      const loaded = this.state.loaded + 1;

      // The coarse pass is most of the perceived value, so weight it heavily.
      const fillTotal = Math.max(this.planned - this.coarseTotal, 0);
      const fillLoaded = Math.max(loaded - this.coarseTotal, 0);
      const ratio = coarseReady
        ? fillTotal === 0
          ? 1
          : 0.82 + 0.18 * (fillLoaded / fillTotal)
        : 0.82 * (this.coarseLoaded / this.coarseTotal);

      this.emit({ loaded, ratio, coarseReady, complete: loaded >= this.planned });
      this.pump();
    };

    img.onload = () => settle(true);
    img.onerror = () => settle(false);
    img.src = frameUrl(index);
  }
}

export const frameSequence = new FrameSequence();
