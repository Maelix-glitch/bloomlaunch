/* ============================================================
   BLOOM · OVERTURE DIRECTOR

   The authored footage IS the opening film:
     darkness → anticipation glow → the film fades in (frame 1 is
     already "Mac + glowing Bloom mark") → the mark blooms and the
     product windows rise → the film rests on its final frame →
     editorial copy arrives → scroll becomes the camera and hands
     the visitor into Bloom (#today).

   When the footage is absent (assets not deployed), the staged
   scene carries the same beats: mark descends, Mac rises.

   Nothing hijacks native scrolling; transform/opacity only.
   ============================================================ */

import { FrameSequencePlayer } from './frames';
import { clamp01, onReducedMotionChange, prefersReducedMotion } from '../core/motion';

interface HeroNodes {
  hero: HTMLElement;
  sticky: HTMLElement;
  rig: HTMLElement;
  copy: HTMLElement;
  cue: HTMLElement;
  canvas: HTMLCanvasElement;
  stage: HTMLElement;
}

const nodes = (): HeroNodes | null => {
  const hero = document.querySelector<HTMLElement>('#overture');
  const sticky = hero?.querySelector<HTMLElement>('.hero-sticky');
  const rig = hero?.querySelector<HTMLElement>('.hero-rig');
  const copy = hero?.querySelector<HTMLElement>('.hero-copy');
  const cue = hero?.querySelector<HTMLElement>('.scroll-cue');
  const canvas = hero?.querySelector<HTMLCanvasElement>('#hero-frames');
  const stage = hero?.querySelector<HTMLElement>('.stage');
  if (!hero || !sticky || !rig || !copy || !cue || !canvas || !stage) return null;
  return { hero, sticky, rig, copy, cue, canvas, stage };
};

export function initHero(): void {
  const n = nodes();
  if (!n) return;

  let player: FrameSequencePlayer | null = null;
  let framesLive = false;
  let sequenceDone = false;
  let copyShown = false;

  const showCopy = (): void => {
    if (copyShown) return;
    copyShown = true;
    n.hero.classList.add('is-copy');
  };

  /* ---------- staged fallback beats (no footage) ---------- */

  const stagedBeats = (): void => {
    window.setTimeout(() => n.hero.classList.add('is-mark'), 620);
    window.setTimeout(() => n.hero.classList.add('is-settled'), 1900);
    window.setTimeout(() => {
      n.hero.classList.add('is-revealing');
      n.stage.classList.add('is-lit');
    }, 2450);
    window.setTimeout(showCopy, 3300);
  };

  /* ---------- footage beats ---------- */

  const footageBeats = (): void => {
    window.setTimeout(() => {
      framesLive = true;
      n.hero.classList.add('has-frames', 'is-revealing');
      n.canvas.classList.add('is-live');
      n.stage.classList.add('is-hidden');
      player?.play();
    }, 500);
  };

  if (prefersReducedMotion()) {
    // Composed still: the film's ending, copy present, no travel.
    n.hero.classList.add('is-anticipating', 'is-revealing');
    player = new FrameSequencePlayer(n.canvas, {
      onReady: () => {
        framesLive = true;
        n.hero.classList.add('has-frames');
        n.canvas.classList.add('is-live');
        n.stage.classList.add('is-hidden');
        player?.showFinal();
        showCopy();
      },
      onUnavailable: () => {
        n.hero.classList.add('is-settled');
        n.stage.classList.add('is-lit');
        showCopy();
      },
      onEnded: () => showCopy(),
    });
    void player.init(true);
  } else {
    window.setTimeout(() => n.hero.classList.add('is-anticipating'), 120);

    player = new FrameSequencePlayer(n.canvas, {
      onReady: footageBeats,
      onUnavailable: stagedBeats,
      onEnded: () => {
        sequenceDone = true;
        showCopy();
      },
    });
    void player.init();

    const visibility = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!framesLive) continue;
          if (entry.isIntersecting && !sequenceDone) player?.play();
          else player?.pause();
        }
      },
      { threshold: 0.05 },
    );
    visibility.observe(n.hero);

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) player?.pause();
    });
  }

  /* ---------- scroll camera ---------- */

  let vh = window.innerHeight;
  let ticking = false;

  const applyScroll = (): void => {
    ticking = false;
    const top = n.hero.getBoundingClientRect().top;
    const total = n.hero.offsetHeight - vh;
    if (total <= 0) return;
    const p = clamp01(-top / total);

    if (!prefersReducedMotion()) {
      n.rig.style.transform = `scale(${(1 + p * 0.09).toFixed(4)}) translateY(${(p * -3.5).toFixed(3)}%)`;
      if (p > 0) {
        n.copy.style.opacity = clamp01(1 - p * 2.6).toFixed(3);
        n.cue.style.opacity = clamp01(0.85 - p * 5).toFixed(3);
      } else {
        // leave the class-driven entrance choreography untouched
        n.copy.style.opacity = '';
        n.cue.style.opacity = '';
      }
    }

    // hand-off into Bloom: the overture recedes as #today arrives
    const fade = clamp01((p - 0.72) / 0.28);
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
      requestApply();
    },
    { passive: true },
  );
  requestApply();

  onReducedMotionChange((nowReduced) => {
    if (nowReduced) {
      n.rig.style.transform = '';
      n.copy.style.opacity = '';
      n.cue.style.opacity = '';
      showCopy();
    }
  });
}
