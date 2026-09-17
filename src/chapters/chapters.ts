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
  initCycleTicks();
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

/* ---------- cycle ring: 29 ticks, today marked by the arc ---------- */

const CYCLE_DAYS = 29;
const TICK_FROM = 84;
const TICK_TO = 89;

const initCycleTicks = (): void => {
  const groups = Array.from(document.querySelectorAll<SVGGElement>('.cycle-ticks'));
  if (groups.length === 0) return;

  for (const group of groups) {
    const frag = document.createDocumentFragment();
    for (let day = 0; day < CYCLE_DAYS; day += 1) {
      const angle = (day / CYCLE_DAYS) * Math.PI * 2 - Math.PI / 2;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', String(100 + cos * TICK_FROM));
      line.setAttribute('y1', String(100 + sin * TICK_FROM));
      line.setAttribute('x2', String(100 + cos * TICK_TO));
      line.setAttribute('y2', String(100 + sin * TICK_TO));
      // the five days ahead glow slightly — "what comes next"
      if (day >= 17 && day < 22) line.classList.add('is-phase');
      frag.appendChild(line);
    }
    group.appendChild(frag);
  }
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
