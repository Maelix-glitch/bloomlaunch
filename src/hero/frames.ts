/* ============================================================
   BLOOM · FRAME SEQUENCE PLAYER
   Plays the authored "prepared reveal" (public/frames/):
   192 × 1920×1080 WebP @ 24fps — an 8-second film.

   Memory discipline (the core constraint at this frame count):
     · decoded bitmaps live in a SLIDING WINDOW:
       [current - KEEP_BEHIND … current + LOOKAHEAD]
       everything older is closed and released
     · bitmaps are decoded at DISPLAY size (capped at the source
       resolution, never upscaled), so a 1080p asset rendered in a
       900px hero never occupies 1080p of RAM
     · low-memory devices (navigator.deviceMemory ≤ 4) decode at a
       lower cap
     · after the first full play only the final frame is kept —
       the reveal rests on its ending

   Playback discipline:
     · linear playback only; scroll never scrubs the film, it
       moves the camera around its final frame
     · pauses off-screen and when the tab hides
     · a broken frame is skipped, never fatal
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
  onReady: () => void;          // first frames decoded — safe to fade in
  onUnavailable: () => void;    // no manifest → staged scene carries on
  onEnded: () => void;          // holding the final frame
}

const LOOKAHEAD = 24;
const KEEP_BEHIND = 2;
const READY_FRAMES = 4;

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
  private playing = false;
  private playedOnce = false;
  private rafId: number | null = null;
  private playStart = 0;

  private resizeObserver: ResizeObserver | null = null;
  private maxDecodeWidth = 1920;

  constructor(canvas: HTMLCanvasElement, hooks: PlayerHooks) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.hooks = hooks;
  }

  /* ---------- lifecycle ---------- */

  /**
   * @param prioritizeFinal reduced-motion mode: decode the last frame
   * first because the experience shows one composed still.
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

    this.bitmaps = new Array(manifest.count).fill(null);
    this.pending = new Array(manifest.count).fill(false);

    this.computeDecodeCap();
    this.observeSize();

    if (prioritizeFinal) {
      await this.decode(manifest.count - 1);
    } else {
      await this.fillWindow(0);
    }
  }

  destroy(): void {
    this.destroyed = true;
    this.stop();
    this.resizeObserver?.disconnect();
    this.releaseAllExcept(-1);
  }

  /* ---------- sizing ---------- */

  private computeDecodeCap(): void {
    const lowMemory =
      typeof navigator !== 'undefined' &&
      'deviceMemory' in navigator &&
      (navigator as Navigator & { deviceMemory?: number }).deviceMemory !== undefined &&
      ((navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8) <= 4;
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
    return `/frames/${m.prefix}${String(n).padStart(m.pad ?? 4, '0')}.${m.ext}`;
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

  /* ---------- sliding window ---------- */

  /** Decode [from … from+LOOKAHEAD], dropping anything older. */
  private async fillWindow(from: number): Promise<void> {
    const m = this.manifest as FrameManifest;
    const jobs: Promise<void>[] = [];
    for (let i = from; i < Math.min(m.count, from + LOOKAHEAD); i += 1) {
      if (!this.bitmaps[i] && !this.pending[i]) jobs.push(this.decode(i));
    }
    // a handful resolves the "ready" gate quickly
    await Promise.all(jobs.slice(0, READY_FRAMES));
    void Promise.all(jobs);
    this.trimBehind(from);
  }

  private trimBehind(current: number): void {
    const cut = Math.max(0, current - KEEP_BEHIND);
    for (let i = 0; i < cut; i += 1) {
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

  /* ---------- drawing ---------- */

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

  /** Reduced motion: one composed still (the film's ending). */
  showFinal(): void {
    const m = this.manifest;
    if (!m) return;
    const last = m.count - 1;
    if (this.bitmaps[last]) this.drawFrame(last);
  }

  /* ---------- playback ---------- */

  play(): void {
    const m = this.manifest;
    if (!m || this.playing || this.destroyed) return;
    if (this.playedOnce) {
      // after the first telling, the story rests on its final frame
      this.drawFrame(m.count - 1);
      return;
    }
    this.playing = true;
    this.playStart = performance.now();
    void this.fillWindow(0);
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

    // keep the window ahead of the playhead
    void this.fillWindow(target);

    // newest decoded frame at or before the playhead
    let index = target;
    while (index > 0 && !this.bitmaps[index]) index -= 1;
    if (this.bitmaps[index] && index !== this.currentFrame) {
      this.drawFrame(index);
      this.trimBehind(index);
    }

    if (target >= m.count - 1 && this.bitmaps[m.count - 1]) {
      this.drawFrame(m.count - 1);
      this.stop();
      this.playedOnce = true;
      this.releaseAllExcept(m.count - 1);
      this.hooks.onEnded();
      return;
    }
    this.rafId = requestAnimationFrame(this.tick);
  };
}
