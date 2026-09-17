/* ============================================================
   BLOOM · OVERTURE DIRECTOR
   Beats:
     1 darkness        — the page opens on near-black
     2 anticipation    — a warm glow begins to breathe
     3 mark            — the Bloom mark descends and settles
     4 prepared reveal — authored frames play; the staged Mac
                         carries the scene when frames are absent
     5 camera          — scroll dollies toward the Mac and hands
                         the visitor into Bloom (section #today)

   Nothing hijacks native scrolling; scroll is a camera control
   only. Transform/opacity writes are batched per frame.
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

  const reduced = prefersReducedMotion();
  let player: FrameSequencePlayer | null = null;
  let framesLive = false;
  let sequenceDone = false;
  let copyShown = false;

  const showCopy = (): void => {
    if (copyShown) return;
    copyShown = true;
    n.hero.classList.add('is-copy');
  };

  const beginReveal = (): void => {
    n.hero.classList.add('is-revealing'); // mark drifts on; scene takes the stage
    if (!framesLive) n.stage.classList.add('is-lit');
  };

  const enterSequence = (): void => {
    n.canvas.classList.add('is-live');
    n.stage.classList.add('is-hidden');
    player?.play();
  };

  /* ---- beat sheet (timing tuned for a ~2.4s settle) ---- */

  if (reduced) {
    // Composed still: atmosphere and hierarchy intact, no travel.
    n.hero.classList.add('is-anticipating', 'is-mark', 'is-settled', 'is-revealing');
    player = new FrameSequencePlayer(n.canvas, {
      onReady: () => {
        framesLive = true;
        n.canvas.classList.add('is-live');
        n.stage.classList.add('is-hidden');
        void player?.showFinal();
        showCopy();
      },
      onUnavailable: () => showCopy(),
      onEnded: () => showCopy(),
    });
    void player.init(true);
  } else {
    window.setTimeout(() => n.hero.classList.add('is-anticipating'), 120);
    window.setTimeout(() => n.hero.classList.add('is-mark'), 620);
    window.setTimeout(() => n.hero.classList.add('is-settled'), 1900);

    player = new FrameSequencePlayer(n.canvas, {
      onReady: () => {
        framesLive = true;
        // Hold the mark a beat longer, then let the frames carry the scene.
        window.setTimeout(() => {
          beginReveal();
          enterSequence();
        }, 550);
      },
      onUnavailable: () => {
        // Staged scene becomes the prepared reveal.
        window.setTimeout(() => {
          beginReveal();
          sequenceDone = true;
          showCopy();
        }, 550);
      },
      onEnded: () => {
        sequenceDone = true;
        showCopy();
      },
    });

    // Start decoding immediately; play only when in view.
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

  /* ---- scroll camera ---- */

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
        n.copy.style.opacity = String(clamp01(1 - p * 2.6).toFixed(3));
        n.cue.style.opacity = String(clamp01(0.85 - p * 5).toFixed(3));
      } else {
        // leave the class-driven entrance choreography untouched
        n.copy.style.opacity = '';
        n.cue.style.opacity = '';
      }
    }

    // hand-off into Bloom: the overture recedes as #today arrives
    const fade = clamp01((p - 0.72) / 0.28);
    n.sticky.style.opacity = String((1 - fade).toFixed(3));
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
