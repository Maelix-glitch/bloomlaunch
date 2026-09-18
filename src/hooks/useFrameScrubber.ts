import { useEffect, useRef, type RefObject } from "react";
import { useMotionValue, useMotionValueEvent, type MotionValue } from "framer-motion";
import { FRAME_COUNT, frameSequence } from "../lib/frameSequence";
import { easeFrame, frameIndexForProgress, isSettled } from "../lib/scrub";

type Options = {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  /** 0 → 1 scroll progress of the hero section */
  progress: MotionValue<number>;
  /** scrub with scroll (false = hold a single still frame) */
  enabled?: boolean;
  /** frame index to hold when scrubbing is disabled */
  stillIndex?: number;
  /** exponential smoothing time constant in ms — higher is silkier */
  smoothing?: number;
  /** scene brightness (0 → 2) applied while drawing, so the grade is free */
  brightness?: MotionValue<number>;
};

/**
 * Largest zoom past "contain" allowed when filling the viewport.
 *
 * Wide screens sit close to the frame's own 16:9, so a small crop fills the
 * viewport with almost the whole composition visible. Phones are far taller
 * than the sequence, where a plain "cover" would crop away the product; the
 * larger allowance zooms toward the laptop instead, keeping the subject whole.
 */
const MAX_CROP_WIDE = 1.35;
const MAX_CROP_NARROW = 2;
const NARROW_ASPECT = 1.1;

/**
 * Renders the hero frame sequence onto a canvas, driven entirely by scroll.
 *
 * The frame index is not snapped to the scroll position: it eases toward it
 * inside a rAF loop, which is what makes the scrub feel like film rather
 * than a slideshow. Because the target comes purely from scroll progress,
 * the motion is exactly reversible — forwards, backwards, any speed.
 */

export function useFrameScrubber({
  canvasRef,
  progress,
  enabled = true,
  stillIndex = 0,
  smoothing = 85,
  brightness,
}: Options) {
  const targetRef = useRef(0);
  const currentRef = useRef(0);
  const drawnRef = useRef(-1);
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef(0);
  const sizeRef = useRef({ width: 0, height: 0 });
  const brightnessRef = useRef(1);

  const paint = (index: number) => {
    const canvas = canvasRef.current;
    if (!canvas || index < 0) return;
    const ctx = canvas.getContext("2d");
    const img = frameSequence.getImage(index);
    if (!ctx || !img || !img.naturalWidth) return;

    const { width, height } = sizeRef.current;
    if (!width || !height) return;

    const iw = img.naturalWidth;
    const ih = img.naturalHeight;

    // Fill the viewport, but never zoom past MAX_CROP: on a tall phone a plain
    // "cover" would blow the composition up 4x and slice off the side panels,
    // so the crop is capped and the frame stays centred instead. The sequence's
    // own background is the page's #050506, so any remaining margin is invisible.
    const canvasAspect = width / height;
    const containScale = Math.min(width / iw, height / ih);
    const coverScale = Math.max(width / iw, height / ih);
    const maxCrop = canvasAspect < NARROW_ASPECT ? MAX_CROP_NARROW : MAX_CROP_WIDE;
    const scale = Math.min(coverScale, containScale * maxCrop);

    const drawWidth = iw * scale;
    const drawHeight = ih * scale;
    const dx = (width - drawWidth) / 2;
    const dy = (height - drawHeight) / 2;

    // Cinematic grade, baked into the draw call instead of a CSS filter.
    if ("filter" in ctx) {
      ctx.filter = `brightness(${brightnessRef.current.toFixed(3)}) contrast(1.06) saturate(1.02)`;
    }
    ctx.drawImage(img, dx, dy, drawWidth, drawHeight);
    if ("filter" in ctx) ctx.filter = "none";
    drawnRef.current = index;
  };

  const schedule = () => {
    if (rafRef.current !== null) return;
    rafRef.current = requestAnimationFrame(tick);
  };

  const tick = (now: number) => {
    rafRef.current = null;
    const dt = Math.min(Math.max(now - lastTimeRef.current, 8), 64);
    lastTimeRef.current = now;

    const target = enabled ? targetRef.current : stillIndex;
    // Snap when close, otherwise ease — frame-rate independent, and the same
    // formula in both directions, which is what makes a reversal seamless.
    currentRef.current = isSettled(currentRef.current, target)
      ? target
      : easeFrame(currentRef.current, target, dt, smoothing);

    const index = frameSequence.nearest(currentRef.current);
    if (index !== drawnRef.current) paint(index);

    if (!isSettled(currentRef.current, target)) schedule();
  };

  const resize = () => {
    const canvas = canvasRef.current;
    const parent = canvas?.parentElement;
    if (!canvas || !parent) return;
    // Layout size, not the transformed box — the canvas is scaled by a
    // motion value and getBoundingClientRect() would include that scale.
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.round(parent.clientWidth * dpr));
    const height = Math.max(1, Math.round(parent.clientHeight * dpr));
    if (canvas.width === width && canvas.height === height) return;
    canvas.width = width;
    canvas.height = height;
    sizeRef.current = { width, height };
    drawnRef.current = -1;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
    }
    // Deliberately not cleared: until the first frame decodes the canvas stays
    // transparent so the poster <img> behind it shows through, and any
    // letterbox margin on tall screens keeps showing the graded backdrop
    // instead of a hard black band.
    paint(frameSequence.nearest(currentRef.current));
  };

  // Unconditional hook: fall back to a constant when no grade is supplied.
  const staticBrightness = useMotionValue(1);
  useMotionValueEvent(brightness ?? staticBrightness, "change", (value) => {
    brightnessRef.current = value;
    drawnRef.current = -1;
    schedule();
  });

  // Scroll drives the target frame index — nothing else does, so scroll
  // position and sequence position can never disagree.
  useMotionValueEvent(progress, "change", (value) => {
    targetRef.current = frameIndexForProgress(value, FRAME_COUNT, { enabled, stillIndex });
    schedule();
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    const parent = canvas?.parentElement;
    if (!canvas || !parent) return;

    // Seed from the live scroll position: on a refresh mid-page the browser
    // restores scroll before our listeners attach, and the first change event
    // has already fired by then.
    targetRef.current = frameIndexForProgress(progress.get(), FRAME_COUNT, { enabled, stillIndex });
    currentRef.current = targetRef.current;

    resize();

    const observer = new ResizeObserver(() => {
      resize();
      schedule();
    });
    observer.observe(parent);

    // Frames arriving progressively can sharpen the current position.
    const unsubscribe = frameSequence.subscribe(() => {
      const index = frameSequence.nearest(currentRef.current);
      if (index !== drawnRef.current) paint(index);
    });

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        drawnRef.current = -1;
        resize();
        schedule();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      observer.disconnect();
      unsubscribe();
      document.removeEventListener("visibilitychange", onVisibility);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [canvasRef, enabled, stillIndex, smoothing]);

  return { paint };
}
