/* ============================================================
   BLOOM · ENTRY POINT
   Fonts are self-hosted (no third-party requests). The world
   initializes in narrative order: mark → overture → chapters
   → launch form.
   ============================================================ */

import '@fontsource-variable/fraunces';
import '@fontsource-variable/fraunces/wght-italic.css';
import '@fontsource-variable/inter';

import './styles/tokens.css';
import './styles/base.css';
import './styles/hero.css';
import './styles/sections.css';

import { loadMark } from './hero/mark';
import { initHero } from './hero/hero';
import { initChapters } from './chapters/chapters';

/* ---------- nav ---------- */

const initNav = (): void => {
  const nav = document.querySelector<HTMLElement>('.site-nav');
  if (!nav) return;
  let ticking = false;

  const apply = (): void => {
    ticking = false;
    nav.classList.toggle('is-scrolled', window.scrollY > 24);
  };
  const request = (): void => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(apply);
    }
  };
  window.addEventListener('scroll', request, { passive: true });
  apply();
};

/* ---------- launch form (honest: this preview stores nothing) ---------- */

const initLaunchForm = (): void => {
  const form = document.querySelector<HTMLFormElement>('#launch-form');
  const note = document.querySelector<HTMLElement>('#launch-note');
  if (!form || !note) return;

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const email = form.querySelector<HTMLInputElement>('#launch-email');
    if (!email) return;

    const value = email.value.trim();
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    if (!valid) {
      note.textContent = 'That address doesn\u2019t look complete — one more glance?';
      email.focus();
      return;
    }

    // Nothing is stored. Say so plainly.
    form.innerHTML =
      '<p class="launch-note">Kept nowhere — this preview stores nothing. We\u2019ll open the real waitlist at launch.</p>';
  });
};

/* ---------- boot ---------- */

const boot = (): void => {
  void loadMark();
  initNav();
  initHero();
  initChapters();
  initLaunchForm();
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}
