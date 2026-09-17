/* ============================================================
   BLOOM · SMOKE SUITE (jsdom)
   Runs the REAL built bundle (dist/) in a fresh DOM under three
   scenarios, asserting the hero state machine — not just markup:
     offline  → staged-scene fallback carries the hero
     footage  → player reaches ready (scroll can scrub), entrance runs
     reduced  → composed final frame, static composition
   Run: npm run build && npm run smoke
   ============================================================ */
import { JSDOM } from 'jsdom';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const html = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
const jsFile = fs.readdirSync(path.join(dist, 'assets')).find((f) => f.startsWith('index-') && f.endsWith('.js'));
if (!jsFile) {
  console.error('dist/ not built — run `npm run build` first.');
  process.exit(1);
}

const MANIFEST = { prefix: 'bloom_', pad: 4, ext: 'webp', start: 1, count: 192, fps: 24, width: 1920, height: 1080 };
const FAKE_BITMAP = () => ({ width: 1920, height: 1080, close() {} });
let scenarioCount = 0;

/**
 * mode:
 *   'offline'  — every fetch fails → staged fallback must carry the hero
 *   'footage'  — manifest + frames serve → film lights, plays, ends
 *   'reduced'  — footage available + prefers-reduced-motion → composed still
 */
async function runScenario(mode) {
  const dom = new JSDOM(html, { url: 'http://localhost:5173/', pretendToBeVisual: true });
  const { window } = dom;

  window.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} };
  window.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
  window.HTMLCanvasElement.prototype.getContext = () =>
    mode === 'offline' ? null : { clearRect() {}, drawImage() {} };

  // jsdom implements neither fetch nor Response — serve Response-shaped
  // plain objects exposing only what the site consumes (ok, headers.get,
  // json, blob, text).
  const online = mode !== 'offline';
  window.fetch = async (url, opts) => {
    const u = String(url);
    if (!online) throw new Error('offline');
    if (opts?.method === 'HEAD') return { ok: true };
    if (u.endsWith('/frames/manifest.json')) {
      return { ok: true, headers: { get: () => 'application/json' }, json: async () => MANIFEST };
    }
    if (u.includes('/frames/')) {
      return { ok: true, blob: async () => new window.Blob([new Uint8Array(4)], { type: 'image/webp' }) };
    }
    if (u.endsWith('.svg')) {
      return { ok: true, text: async () => '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle cx="32" cy="32" r="30"/></svg>' };
    }
    if (/\.(png|webp)$/.test(u)) {
      return { ok: true, blob: async () => new window.Blob([new Uint8Array(4)]) };
    }
    throw new Error('unexpected fetch ' + u);
  };
  window.createImageBitmap = online ? async () => FAKE_BITMAP() : undefined;
  window.matchMedia = () => ({
    matches: mode === 'reduced',
    addEventListener() {},
    removeEventListener() {},
  });

  for (const key of ['window','document','navigator','location','history','getComputedStyle','matchMedia','IntersectionObserver','ResizeObserver','fetch','localStorage','MutationObserver','CustomEvent','Event','KeyboardEvent','HTMLImageElement','Image','Blob','URL','createImageBitmap']) {
    try { globalThis[key] = window[key]; } catch { /* read-only globals */ }
  }

  // Fast-forward clock: each rAF advances fake time ~33ms, so the 8-second
  // film (192 frames @ 24fps) completes in a couple of hundred real ticks.
  let fakeNow = 0;
  window.performance.now = () => fakeNow;
  globalThis.performance = { now: () => fakeNow };
  globalThis.requestAnimationFrame = (cb) => setTimeout(() => { fakeNow += 33; cb(fakeNow); }, 1);
  globalThis.cancelAnimationFrame = (id) => clearTimeout(id);

  const errors = [];
  window.addEventListener('error', (e) => errors.push(String(e.error || e.message)));

  try {
    scenarioCount += 1;
    await import(pathToFileURL(path.join(dist, 'assets', jsFile)).href + `?scenario=${mode}-${scenarioCount}`);
  } catch (err) {
    errors.push('BUNDLE THROW: ' + (err?.stack || err));
  }

  // settle: wait for the scenario's terminal hero state
  const hero = window.document.querySelector('#overture');
  const readyFor = {
    offline: () => hero.classList.contains('is-fallback') && hero.classList.contains('is-loaded'),
    footage: () => hero.classList.contains('has-frames') && hero.classList.contains('is-loaded'),
    reduced: () =>
      window.document.querySelector('#hero-frames')?.classList.contains('is-live') ||
      !!window.document.querySelector('.stage.is-lit'),
  };
  const isReady = readyFor[mode];
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline && !isReady()) {
    await new Promise((r) => setTimeout(r, 25));
  }
  await new Promise((r) => setTimeout(r, 100));

  return { doc: window.document, errors };
}

const results = [];

/* ---------- scenario: offline → staged fallback carries the hero ---------- */
{
  const { doc, errors } = await runScenario('offline');
  const hero = doc.querySelector('#overture');
  results.push(['offline: fallback state', hero?.classList.contains('is-fallback') ?? false]);
  results.push(['offline: staged scene lit', doc.querySelector('.stage')?.classList.contains('is-lit') ?? false]);
  results.push(['offline: entrance ran', hero?.classList.contains('is-loaded') ?? false]);
  results.push(['offline: provisional mark injected', doc.querySelectorAll('[data-mark-slot][data-provisional]').length >= 4]);
  results.push(['offline: no runtime errors', errors.length === 0]);
  if (errors.length) console.log('  errors:', errors.join(' | '));
}

/* ---------- scenario: footage → player ready, scroll can scrub ---------- */
{
  const { doc, errors } = await runScenario('footage');
  const hero = doc.querySelector('#overture');
  results.push(['footage: onReady fired (has-frames)', hero?.classList.contains('has-frames') ?? false]);
  results.push(['footage: no fallback class', !(hero?.classList.contains('is-fallback') ?? true)]);
  results.push(['footage: entrance ran', hero?.classList.contains('is-loaded') ?? false]);
  results.push(['footage: logo-first composition present', !!doc.querySelector('.hero-center .hero-mark')]);
  results.push(['footage: no runtime errors', errors.length === 0]);
  if (errors.length) console.log('  errors:', errors.join(' | '));
}

/* ---------- scenario: reduced motion → composed still ---------- */
{
  const { doc, errors } = await runScenario('reduced');
  const hero = doc.querySelector('#overture');
  results.push(['reduced: static composition', hero?.classList.contains('is-static') ?? false]);
  results.push(['reduced: final frame on canvas', doc.querySelector('#hero-frames')?.classList.contains('is-live') ?? false]);
  results.push(['reduced: no runtime errors', errors.length === 0]);
  if (errors.length) console.log('  errors:', errors.join(' | '));
}

/* ---------- static structure ---------- */
{
  const { doc } = await runScenario('footage');
  results.push(['structure: hero section exists', !!doc.querySelector('#overture')]);
  results.push(['structure: frame canvas exists', !!doc.querySelector('#hero-frames')]);
  results.push(['structure: mac stage exists', !!doc.querySelector('.stage .mac-lid')]);
  results.push(['structure: 6 chapters present', doc.querySelectorAll('.chapter').length === 6]);
  results.push(['structure: today shot wired', !!doc.querySelector('#today .shot img')]);
  results.push(['structure: launch form exists', !!doc.querySelector('#launch-form')]);
  results.push(['structure: product shots wired', doc.querySelectorAll('.shot img').length >= 7]);
  results.push(['structure: nav mark present', !!doc.querySelector('.nav-mark img, .nav-mark svg')]);
  results.push(['structure: reveals present', doc.querySelectorAll('[data-reveal]').length > 0]);
}

let failed = 0;
for (const [name, ok] of results) {
  console.log((ok ? 'PASS' : 'FAIL') + '  ' + name);
  if (!ok) failed += 1;
}
console.log(failed === 0 ? '\nSMOKE OK' : `\n${failed} FAILURES`);
process.exit(failed === 0 ? 0 : 1);
