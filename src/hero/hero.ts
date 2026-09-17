/* ============================================================
   BLOOM · OVERTURE DIRECTOR

   Logo first: the real Bloom mark settles centre stage with the
   title, on the glow — never a black void.

   Then scroll is the playhead: as the visitor scrolls, the
   authored film runs from its FIRST frame to its LAST
   (seek driven by scroll progress), the logo recedes, and the
   overture hands the visitor into Bloom (#today).

   No autoplay, no timers on the film, no scroll hijacking —
   transform/opacity only.

   When the footage is absent, the staged scene carries the same
   composition as a static fallback.
   ============================================================ */

import { FrameSequencePlayer } from './frames';
import { clamp01, onReducedMotionChange, prefersReducedMotion } from '../core/motion';

interface HeroNodes {
  hero: HTMLElement;
  sticky: HTMLElement;
  rig: HTMLElement;
  center: HTMLElement;
  cue: HTMLElement;
  canvas: HTMLCanvasElement;
  stage: HTMLElement;
}

const nodes = (): HeroNodes | null => {
  const hero = document.querySelector<HTMLElement>('#overture');
  const sticky = hero?.querySelector<HTMLElement>('.hero-sticky');
  const rig = hero?.querySelector<HTMLElement>('.hero-rig');
  const center = hero?.querySelector<HTMLElement>('.hero-center');
  const cue = hero?.querySelector<HTMLElement>('.scroll-cue');
  const canvas = hero?.querySelector<HTMLCanvasElement>('#hero-frames');
  const stage = hero?.querySelector<HTMLElement>('.stage');
  if (!hero || !sticky || !rig || !center || !cue || !canvas || !stage) return null;
  return { hero, sticky, rig, center, cue, canvas, stage };
};

/* ---------- scrub choreography constants ---------- */

const FILM_IN_AT = 0.06;      // canvas starts fading in
const FILM_IN_SPAN = 0.12;
const LOGO_OUT_AT = 0.05;     // logo + copy recede as the film arrives
const LOGO_OUT_SPAN = 0.18;
const SCRUB_AT = 0.07;        // scroll progress mapped to frame 1
const SCRUB_SPAN = 0.79;      // …through the final frame
const HANDOFF_AT = 0.72;      // overture recedes, #today arrives
const HANDOFF_SPAN = 0.28;

export function initHero(): void {
  const n = nodes();
  if (!n) return;

  /* ---------- reduced motion: composed still, no travel ---------- */
  if (prefersReducedMotion()) {
    n.hero.classList.add('is-static', 'is-loaded');
    const still = new FrameSequencePlayer(n.canvas, {
      onReady: () => {
        n.canvas.classList.add('is-live');
        still.showFinal();
      },
      onUnavailable: () => n.stage.classList.add('is-lit'),
    });
    void still.init(true);
    return;
  }

  /* ---------- film player ---------- */

  let framesReady = false;
  const player = new FrameSequencePlayer(n.canvas, {
    onReady: () => {
      framesReady = true;
      n.hero.classList.add('has-frames');
    },
    onUnavailable: () => {
      n.hero.classList.add('is-fallback');
      n.stage.classList.add('is-lit');
    },
  });
  void player.init();

  // entrance: the logo beat settles in once
  window.setTimeout(() => n.hero.classList.add('is-loaded'), 90);

  /* ---------- scroll camera: scroll IS the playhead ---------- */

  let vh = window.innerHeight;
  let heroH = n.hero.offsetHeight;
  let ticking = false;

  const applyScroll = (): void => {
    ticking = false;
    const top = n.hero.getBoundingClientRect().top;
    const total = heroH - vh;
    if (total <= 0) return;
    const p = clamp01(-top / total);

    if (p === 0) {
      // at rest: leave the CSS entrance choreography untouched
      n.canvas.style.opacity = '';
      n.center.style.opacity = '';
      n.center.style.transform = '';
      n.rig.style.transform = '';
    } else {
      // the film fades in as the logo recedes
      if (framesReady) {
        n.canvas.style.opacity = clamp01((p - FILM_IN_AT) / FILM_IN_SPAN).toFixed(3);

        // scroll is the playhead: frame 1 → final frame
        const scrub = clamp01((p - SCRUB_AT) / SCRUB_SPAN);
        player.seek(scrub * (player.frameCount - 1));
      }

      const logoOut = clamp01((p - LOGO_OUT_AT) / LOGO_OUT_SPAN);
      n.center.style.opacity = (1 - logoOut).toFixed(3);
      n.center.style.transform = `translateY(${(logoOut * -4).toFixed(2)}%)`;

      // a gentle dolly as the reader moves
      n.rig.style.transform = `scale(${(1 + p * 0.06).toFixed(4)}) translateY(${(p * -2.4).toFixed(3)}%)`;
    }

    // scroll cue dims immediately
    n.cue.style.opacity = p < 0.02 ? '' : clamp01(0.85 - p * 6).toFixed(3);

    // hand-off into Bloom: the overture recedes as #today arrives
    const fade = clamp01((p - HANDOFF_AT) / HANDOFF_SPAN);
    n.sticky.style.opacity = (1 - fade).toFixed(3);
    n.sticky.style.transform = fade > 0 ? `scale(${(1 + fade * 0.05).toFixed(4)})` : '';
  };

  const requestApply = (): void => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(applyScroll);
  };

  window.addEventListener('scroll', requestApply, { passive: true });
  window.addEventListener(
    'resize',
    () => {
      vh = window.innerHeight;
      heroH = n.hero.offsetHeight;
      requestApply();
    },
    { passive: true },
  );
  requestApply();

  // if the visitor flips on reduced motion mid-session, settle the scene
  onReducedMotionChange((nowReduced) => {
    if (!nowReduced) return;
    n.hero.classList.add('is-static', 'is-loaded');
    n.canvas.style.opacity = '';
    n.center.style.opacity = '';
    n.center.style.transform = '';
    n.rig.style.transform = '';
    n.canvas.classList.add('is-live');
    player.showFinal();
  });
}
