/* ============================================================
   BLOOM · CHAPTERS
   Reveal choreography (IntersectionObserver, one-shot) and
   restrained parallax for scene objects. Parallax magnitude is
   proportional to element size and capped so nothing drifts
   theatrically; it is disabled for reduced motion and when the
   chapters are off-screen.
   ============================================================ */

import { clamp, onReducedMotionChange, prefersReducedMotion, viewportProgress } from '../core/motion';

const MAX_DRIFT_PX = 28;

export function initChapters(): void {
  initReveals();
  initParallax();
}

/* ---------- one-shot reveals ---------- */

const initReveals = (): void => {
  const targets = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'));
  if (targets.length === 0) return;

  if (prefersReducedMotion()) {
    for (const el of targets) el.classList.add('is-in');
    return;
  }

  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          io.unobserve(entry.target);
        }
      }
    },
    { threshold: 0.16, rootMargin: '0px 0px -6% 0px' },
  );
  for (const el of targets) io.observe(el);
};

/* ---------- parallax ---------- */

const initParallax = (): void => {
  const layers = Array.from(
    document.querySelectorAll<HTMLElement>('[data-parallax]'),
  );
  if (layers.length === 0) return;

  let active = false;
  let ticking = false;
  let vh = window.innerHeight;

  const apply = (): void => {
    ticking = false;
    if (!active || prefersReducedMotion()) return;
    for (const el of layers) {
      const factor = Number(el.dataset.parallax ?? '0');
      if (factor === 0) continue;
      const rect = el.getBoundingClientRect();
      if (rect.bottom < -80 || rect.top > vh + 80) continue;
      const p = viewportProgress(el, vh); // 0 entering → 1 leaving
      const drift = clamp((0.5 - p) * factor * rect.height, -MAX_DRIFT_PX, MAX_DRIFT_PX);
      // Reveals use the individual `translate` property, so this
      // plain transform composes with them instead of overwriting.
      el.style.transform = `translate3d(0, ${drift.toFixed(2)}px, 0)`;
    }
  };

  const requestApply = (): void => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(apply);
  };

  const gate = new IntersectionObserver(
    (entries) => {
      active = entries.some((e) => e.isIntersecting);
      if (active) requestApply();
    },
    { rootMargin: '120px 0px' },
  );
  for (const el of layers) gate.observe(el);

  window.addEventListener('scroll', requestApply, { passive: true });
  window.addEventListener(
    'resize',
    () => {
      vh = window.innerHeight;
      requestApply();
    },
    { passive: true },
  );

  onReducedMotionChange((reduced) => {
    if (reduced) {
      for (const el of layers) el.style.transform = '';
    } else {
      requestApply();
    }
  });
};
