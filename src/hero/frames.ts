/* ============================================================
   BLOOM · FRAME SEQUENCE PLAYER (scroll-scrubbed)
   The authored "prepared reveal" (public/frames/):
   192 × 1920×1080 WebP @ 24fps.

   The visitor's scroll IS the playhead: `seek(frameIndex)` is
   called from the hero's scroll handler, so the film runs from
   its first frame to its last at the pace of the reader — no
   autoplay, no hijacked scrolling.

   Memory discipline (the core constraint at this frame count):
     · decoded bitmaps live in a SLIDING WINDOW around the
       playhead; everything outside it is closed and released
     · bitmaps decode at DISPLAY size (capped, never upscaled)
     · low-memory devices (navigator.deviceMemory ≤ 4) decode at
       a lower cap
     · a broken frame is skipped, never fatal; the nearest good
       frame is drawn so scrubbing never flashes black
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
  onReady: () => void;          // first window decoded — safe to reveal
  onUnavailable: () => void;    // no manifest / nothing decoded → fallback
}

const LOOKAHEAD = 18;
const KEEP_BEHIND = 6;

type Decoded = ImageBitmap | HTMLImageElement;

export class FrameSequencePlayer {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D | null;
  private readonly hooks: PlayerHooks;

  private manifest: FrameManifest | null = null;
  private bitmaps: (Decoded | null)[] = [];
  private pending: boolean[] = [];
  private destroyed = false;

  private currentFrame = -1;
  private lastSeek = 0;
  private waveTarget = 0;
  private waveInFlight = false;

  private resizeObserver: ResizeObserver | null = null;
  private maxDecodeWidth = 1920;

  constructor(canvas: HTMLCanvasElement, hooks: PlayerHooks) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.hooks = hooks;
  }

  get frameCount(): number {
    return this.manifest?.count ?? 0;
  }

  /* ---------- lifecycle ---------- */

  /**
   * @param prioritizeFinal reduced-motion mode: the experience is one
   * composed still, so decode the last frame first.
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
      prefix: 'frame_',
      pad: 4,
      ext: 'webp',
      start: 1,
      fps: 30,
      ...manifest,
    };

    this.bitmaps = new Array(manifest.count).fill(null);
    this.pending = new Array(manifest.count).fill(false);

    this.computeDecodeCap();
    this.observeSize();

    if (prioritizeFinal) {
      await this.decode(manifest.count - 1);
    } else {
      // first window: frame 1 + the stretch just ahead, so the first
      // scroll input has frames to land on
      const to = Math.min(manifest.count - 1, LOOKAHEAD);
      const jobs: Promise<void>[] = [];
      for (let i = 0; i <= to; i += 1) jobs.push(this.decode(i));
      await Promise.all(jobs);
    }
    if (this.destroyed) return;

    // If nothing decoded (broken/missing frames), hand back to the
    // staged scene — never leave the visitor a black stage.
    if (!this.bitmaps.some(Boolean)) {
      this.hooks.onUnavailable();
      return;
    }
    this.hooks.onReady();
  }

  destroy(): void {
    this.destroyed = true;
    this.resizeObserver?.disconnect();
    this.releaseAllExcept(-1);
  }

  /* ---------- scrubbing ---------- */

  /** Scroll is the playhead: show `index` (or the nearest decoded frame). */
  seek(rawIndex: number): void {
    const m = this.manifest;
    if (!m || this.destroyed) return;
    const target = Math.max(0, Math.min(m.count - 1, Math.round(rawIndex)));
    this.lastSeek = target;

    const bmp = this.bitmaps[target];
    if (bmp) {
      if (target !== this.currentFrame) this.drawFrame(target);
      this.trimAround(target);
    } else {
      this.drawNearest(target);
    }
    void this.wave(target);
  }

  /** Reduced motion / the resting state: one composed still (the film's ending). */
  showFinal(): void {
    const m = this.manifest;
    if (!m || this.destroyed) return;
    const last = m.count - 1;
    this.lastSeek = last;
    if (this.bitmaps[last]) {
      this.drawFrame(last);
      this.releaseAllExcept(last);
      return;
    }
    void this.decode(last).then(() => {
      if (!this.destroyed && this.bitmaps[last]) {
        this.drawFrame(last);
        this.releaseAllExcept(last);
      }
    });
  }

  /* ---------- decode wave: keep a window around the playhead ---------- */

  private async wave(target: number): Promise<void> {
    this.waveTarget = target;
    if (this.waveInFlight || this.destroyed) return;
    this.waveInFlight = true;

    try {
      while (!this.destroyed) {
        const t = this.waveTarget;
        const m = this.manifest as FrameManifest;
        const from = Math.max(0, t - KEEP_BEHIND);
        const to = Math.min(m.count - 1, t + LOOKAHEAD);
        const jobs: Promise<void>[] = [];
        for (let i = from; i <= to; i += 1) {
          if (!this.bitmaps[i] && !this.pending[i]) jobs.push(this.decode(i));
        }
        if (jobs.length > 0) await Promise.all(jobs);
        if (this.destroyed) break;

        const bmp = this.bitmaps[t];
        if (bmp) {
          if (t !== this.currentFrame) this.drawFrame(t);
          this.trimAround(t);
          if (t === this.lastSeek) break;
        } else {
          this.drawNearest(t);
        }
        // if the reader scrolled on while we decoded, chase the new target
        if (t === this.waveTarget) break;
      }
    } finally {
      this.waveInFlight = false;
    }
  }

  /* ---------- sizing ---------- */

  private computeDecodeCap(): void {
    const nav = typeof navigator !== 'undefined' ? (navigator as Navigator & { deviceMemory?: number }) : null;
    const lowMemory = !!nav && 'deviceMemory' in nav && nav.deviceMemory !== undefined && nav.deviceMemory <= 4;
    this.maxDecodeWidth = lowMemory ? 1280 : 1920;
  }

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

  /* ---------- urls & decode ---------- */

  private frameUrl(index: number): string {
    const m = this.manifest as FrameManifest;
    const n = (m.start ?? 1) + index;
    return `/frames/${m.prefix ?? 'frame_'}${String(n).padStart(m.pad ?? 4, '0')}.${m.ext ?? 'webp'}`;
  }

  private async decode(index: number): Promise<void> {
    if (this.pending[index] || this.bitmaps[index]) return;
    this.pending[index] = true;
    try {
      const res = await fetch(this.frameUrl(index), { cache: 'force-cache' });
      if (!res.ok) throw new Error(`frame ${res.status}`);
      const blob = await res.blob();
      const bmp = await this.toBitmap(blob);
      if (this.destroyed) {
        this.close(bmp);
        return;
      }
      this.bitmaps[index] = bmp;
    } catch {
      // a broken frame is skipped, never fatal
    } finally {
      this.pending[index] = false;
    }
  }

  private async toBitmap(blob: Blob): Promise<Decoded> {
    const sourceWidth = this.manifest?.width ?? 1920;
    // Display-sized decode: never upscale, shrink to the decode cap.
    const target = Math.min(this.maxDecodeWidth, sourceWidth);

    if ('createImageBitmap' in window) {
      if (target < sourceWidth) {
        return createImageBitmap(blob, {
          resizeWidth: target,
          resizeHeight: Math.round(
            (sourceWidth === 0 ? target : (this.manifest?.height ?? 1080) * (target / sourceWidth)),
          ),
          resizeQuality: 'high',
        });
      }
      return createImageBitmap(blob);
    }
    const img = new Image();
    const url = URL.createObjectURL(blob);
    img.src = url;
    await img.decode();
    URL.revokeObjectURL(url);
    return img;
  }

  private close(bmp: Decoded | null): void {
    if (bmp && 'close' in bmp) bmp.close();
  }

  /* ---------- window & drawing ---------- */

  private trimAround(center: number): void {
    const from = Math.max(0, center - KEEP_BEHIND);
    const to = center + LOOKAHEAD;
    for (let i = 0; i < this.bitmaps.length; i += 1) {
      if (i >= from && i <= to) continue;
      const bmp = this.bitmaps[i] ?? null;
      if (bmp) {
        this.close(bmp);
        this.bitmaps[i] = null;
      }
    }
  }

  private releaseAllExcept(keep: number): void {
    this.bitmaps.forEach((bmp, i) => {
      if (i !== keep) {
        this.close(bmp);
        this.bitmaps[i] = null;
      }
    });
  }

  /** Nearest decoded frame to `target` — scrubbing never flashes black. */
  private drawNearest(target: number): void {
    const m = this.manifest as FrameManifest;
    for (let r = 0; r <= 48; r += 1) {
      const before = target - r;
      const after = target + r;
      if (before >= 0 && this.bitmaps[before]) {
        this.drawFrame(before);
        return;
      }
      if (after <= m.count - 1 && this.bitmaps[after]) {
        this.drawFrame(after);
        return;
      }
    }
  }

  private drawFrame(index: number): void {
    const ctx = this.ctx;
    const bmp = this.bitmaps[index];
    if (!ctx || !bmp) return;

    const cw = this.canvas.width;
    const ch = this.canvas.height;
    if (cw === 0 || ch === 0) return;
    const bw = bmp.width;
    const bh = bmp.height;
    if (bw === 0 || bh === 0) return;

    // "cover" fit — the footage fills the stage, never letterboxed
    const scale = Math.max(cw / bw, ch / bh);
    const dw = bw * scale;
    const dh = bh * scale;
    ctx.clearRect(0, 0, cw, ch);
    ctx.drawImage(bmp, (cw - dw) / 2, (ch - dh) / 2, dw, dh);
    this.currentFrame = index;
  }
}
