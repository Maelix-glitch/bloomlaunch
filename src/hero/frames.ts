/* ============================================================
   BLOOM · FRAME SEQUENCE PLAYER
   Plays the authored "prepared reveal" from public/frames/.

   Contract (see ASSETS.md):
     /frames/manifest.json →
       { prefix, pad, ext, start, count, fps, width, height }
       URLs resolve to /frames/{prefix}{index-padded}.{ext}

   Design decisions (performance-first):
     · canvas 2D + ImageBitmap, decode off the critical path
     · small concurrency pool; first frames decode eagerly so the
       reveal starts quickly, the tail fills in during idle time
     · devicePixelRatio capped at 2 — cinematic frames do not
       need 3x decoding cost
     · frames wider than 2560px are downsampled once on decode
     · playback pauses when the hero leaves the viewport and
       when the tab is hidden; all-but-final bitmaps are released
       after the first full play to cap memory
   ============================================================ */

export interface FrameManifest {
  prefix?: string;
  pad?: number;
  ext?: 'webp' | 'png' | 'jpg' | 'jpeg' | 'avif';
  start?: number;
  count: number;
  fps?: number;
  width: number;
  height: number;
}

interface PlayerHooks {
  onReady: () => void;          // first frames decoded — safe to fade canvas in
  onUnavailable: () => void;    // no manifest → staged scene carries the reveal
  onEnded: () => void;          // sequence finished, holding final frame
}

const MAX_BITMAP_WIDTH = 2560;
const CONCURRENCY = 3;
const EAGER_FRAMES = 24;

export class FrameSequencePlayer {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D | null;
  private readonly hooks: PlayerHooks;

  private manifest: FrameManifest | null = null;
  private bitmaps: (ImageBitmap | HTMLImageElement | null)[] = [];
  private loadedCount = 0;
  private destroyed = false;

  private currentFrame = -1;
  private playing = false;
  private playedOnce = false;
  private rafId: number | null = null;
  private playStart = 0;

  private resizeObserver: ResizeObserver | null = null;

  constructor(canvas: HTMLCanvasElement, hooks: PlayerHooks) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.hooks = hooks;
  }

  /* ---------- lifecycle ---------- */

  /**
   * @param prioritizeFinal when true (reduced motion), the last frame is
   * decoded first because the experience shows a single composed still.
   */
  async init(prioritizeFinal = false): Promise<void> {
    let manifest: FrameManifest;
    try {
      const res = await fetch('/frames/manifest.json', { cache: 'force-cache' });
      if (!res.ok) throw new Error(`manifest ${res.status}`);
      // Dev servers with SPA fallback can answer a missing manifest with
      // HTML — trust only genuine JSON.
      const type = res.headers.get('content-type') ?? '';
      if (!type.includes('json')) throw new Error(`manifest content-type ${type}`);
      manifest = (await res.json()) as FrameManifest;
      if (!Number.isFinite(manifest.count) || manifest.count < 1) {
        throw new Error('manifest has no frames');
      }
    } catch {
      this.hooks.onUnavailable();
      return;
    }

    this.manifest = {
      prefix: manifest.prefix ?? 'frame_',
      pad: manifest.pad ?? 4,
      ext: manifest.ext ?? 'webp',
      start: manifest.start ?? 1,
      fps: manifest.fps ?? 30,
      ...manifest,
    };

    this.observeSize();
    await this.preload(prioritizeFinal);
  }

  destroy(): void {
    this.destroyed = true;
    this.stop();
    this.resizeObserver?.disconnect();
    this.releaseBitmaps(-1);
  }

  /* ---------- size handling ---------- */

  private observeSize(): void {
    this.resizeCanvas();
    this.resizeObserver = new ResizeObserver(() => this.resizeCanvas());
    this.resizeObserver.observe(this.canvas);
  }

  private resizeCanvas(): void {
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.round(rect.width * dpr);
    const h = Math.round(rect.height * dpr);
    if (w === this.canvas.width && h === this.canvas.height) return;
    this.canvas.width = w;
    this.canvas.height = h;
    if (this.currentFrame >= 0) this.drawFrame(this.currentFrame);
  }

  /* ---------- preload ---------- */

  private frameUrl(index: number): string {
    const m = this.manifest as FrameManifest;
    const n = (m.start ?? 1) + index;
    return `/frames/${m.prefix}${String(n).padStart(m.pad ?? 4, '0')}.${m.ext}`;
  }

  /**
   * Resolves once enough frames exist to begin the reveal
   * (a handful for playback, the final one for reduced motion).
   * Decoding of the remaining frames continues in the background.
   */
  private preload(prioritizeFinal: boolean): Promise<void> {
    const m = this.manifest as FrameManifest;
    this.bitmaps = new Array(m.count).fill(null);

    const queue = Array.from({ length: m.count }, (_, i) => i);
    if (prioritizeFinal) {
      // Still first, everything else after.
      queue.sort((a, b) => {
        const pa = a === m.count - 1 ? 0 : 1;
        const pb = b === m.count - 1 ? 0 : 1;
        return pa - pb || a - b;
      });
    } else {
      // Eager head, idle tail: the reveal begins fast, the rest catches up.
      queue.sort((a, b) => {
        const ea = a < EAGER_FRAMES ? 0 : 1;
        const eb = b < EAGER_FRAMES ? 0 : 1;
        return ea - eb || a - b;
      });
    }

    const readyThreshold = prioritizeFinal ? 1 : Math.min(4, m.count);
    let readyResolve: () => void = () => {};
    const ready = new Promise<void>((r) => {
      readyResolve = r;
    });

    let cursor = 0;
    const worker = async (): Promise<void> => {
      while (!this.destroyed) {
        const index = queue[cursor++];
        if (index === undefined) return;
        try {
          const bmp = await this.decode(this.frameUrl(index));
          if (this.destroyed) { this.closeBitmap(bmp); return; }
          this.bitmaps[index] = bmp;
          this.loadedCount += 1;
          if (this.loadedCount >= readyThreshold) readyResolve();
          if (this.currentFrame < 0 && this.bitmaps[0]) this.drawFrame(0);
        } catch {
          // A single broken frame must never break the page.
          this.bitmaps[index] = null;
          if (this.loadedCount >= readyThreshold) readyResolve();
        }
      }
    };

    void Promise.all(Array.from({ length: CONCURRENCY }, worker));
    return ready;
  }

  private async decode(url: string): Promise<ImageBitmap | HTMLImageElement> {
    const res = await fetch(url, { cache: 'force-cache' });
    if (!res.ok) throw new Error(`frame ${res.status}`);
    const blob = await res.blob();

    if ('createImageBitmap' in window) {
      let bmp = await createImageBitmap(blob);
      if (bmp.width > MAX_BITMAP_WIDTH) {
        const scale = MAX_BITMAP_WIDTH / bmp.width;
        const small = await createImageBitmap(blob, {
          resizeWidth: MAX_BITMAP_WIDTH,
          resizeHeight: Math.round(bmp.height * scale),
          resizeQuality: 'high',
        });
        bmp.close();
        bmp = small;
      }
      return bmp;
    }

    // Older engines: fall back to an <img> element.
    const img = new Image();
    img.src = URL.createObjectURL(blob);
    await img.decode();
    URL.revokeObjectURL(img.src);
    return img;
  }

  private closeBitmap(bmp: ImageBitmap | HTMLImageElement | null): void {
    if (bmp && 'close' in bmp) bmp.close();
  }

  /** Release decoded frames except the one we keep showing. */
  private releaseBitmaps(keep: number): void {
    this.bitmaps.forEach((bmp, i) => {
      if (i !== keep) {
        this.closeBitmap(bmp);
        this.bitmaps[i] = null;
      }
    });
  }

  /* ---------- drawing ---------- */

  private drawFrame(index: number): void {
    const ctx = this.ctx;
    const bmp = this.bitmaps[index];
    if (!ctx || !bmp) return;

    const cw = this.canvas.width;
    const ch = this.canvas.height;
    if (cw === 0 || ch === 0) return;

    const bw = 'width' in bmp ? bmp.width : 0;
    const bh = 'height' in bmp ? bmp.height : 0;
    if (bw === 0 || bh === 0) return;

    // "cover" fit: crop the frame to the stage, never letterbox.
    const scale = Math.max(cw / bw, ch / bh);
    const dw = bw * scale;
    const dh = bh * scale;
    const dx = (cw - dw) / 2;
    const dy = (ch - dh) / 2;

    ctx.clearRect(0, 0, cw, ch);
    ctx.drawImage(bmp, dx, dy, dw, dh);
    this.currentFrame = index;
  }

  /** Static composition: jump straight to a frame (reduced motion). */
  async showFinal(): Promise<void> {
    const m = this.manifest;
    if (!m) return;
    // Wait for at least the final frame to decode.
    const last = m.count - 1;
    let waited = 0;
    while (!this.bitmaps[last] && waited < 120 && !this.destroyed) {
      await new Promise((r) => setTimeout(r, 100));
      waited += 1;
    }
    if (this.bitmaps[last]) this.drawFrame(last);
    else this.drawFrame(this.firstLoadedIndex());
  }

  private firstLoadedIndex(): number {
    for (let i = 0; i < this.bitmaps.length; i += 1) {
      if (this.bitmaps[i]) return i;
    }
    return 0;
  }

  /* ---------- playback ---------- */

  play(): void {
    const m = this.manifest;
    if (!m || this.playing || this.destroyed) return;
    if (this.playedOnce) {
      // After the first telling, the story rests on its final frame.
      this.drawFrame(m.count - 1);
      return;
    }
    this.playing = true;
    this.playStart = performance.now();
    this.rafId = requestAnimationFrame(this.tick);
  }

  pause(): void {
    this.stop();
  }

  private stop(): void {
    this.playing = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  private tick = (now: number): void => {
    const m = this.manifest;
    if (!m || !this.playing) return;

    const fps = m.fps ?? 30;
    const elapsed = (now - this.playStart) / 1000;
    const target = Math.min(m.count - 1, Math.floor(elapsed * fps));

    // Draw the latest decoded frame at or before `target`.
    let index = target;
    while (index > 0 && !this.bitmaps[index]) index -= 1;
    if (this.bitmaps[index] && index !== this.currentFrame) {
      this.drawFrame(index);
    }

    if (target >= m.count - 1 && this.bitmaps[m.count - 1]) {
      this.drawFrame(m.count - 1);
      this.stop();
      this.playedOnce = true;
      this.releaseBitmaps(m.count - 1);
      this.hooks.onEnded();
      return;
    }
    this.rafId = requestAnimationFrame(this.tick);
  };
}
