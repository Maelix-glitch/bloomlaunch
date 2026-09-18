# Bloom — launch site

The Bloom launch site: a single-page, scroll-driven experience for the app. Built with
**React 19 + Vite 7 + Tailwind 4** and **Framer Motion**.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # → dist/ (JS + CSS inlined; frames/shots served as files)
npm run preview
```

---

## What's in here

```
frames/                    192 source PNGs — the cinematic hero sequence (1–192)
hero/                      real Bloom app captures, 2880×1800
bloom-premium-experience-redesign.zip   the original site export
public/
  frames/bloom_0001…0192.avif   the sequence, optimised (~40 KB per frame, ~7.7 MB total)
  frames/poster.webp|avif       first frame — paints instantly, before the sequence loads
  frames/still.webp             frame 148 — the composed still for reduced-motion visitors
  shots/*.avif|webp             the real app screens, optimised
  favicon.svg                   the Bloom arch
  og.jpg                        social preview, pulled from the sequence itself
src/
  components/   Hero, Nav, Cursor, Magnetic, TiltCard, PanelFrame, ProductPanel,
                Preloader, Reveal, StoryPath, ScrollProgress, Logo, EcosystemOrbit
  sections/     the nine chapters, FinalCTA, Footer
  hooks/        useFrameScrubber, useFrameSequenceStatus, useReducedMotion
  lib/          frameSequence (loader), scrub (hero math), assets
```

The `frames/` and `hero/` folders are the original sources and stay untouched — everything the
browser loads is generated into `public/`.

---

## The hero

The hero is the **192-frame sequence**, painted to a `<canvas>` and driven entirely by scroll —
no autoplay, no video element, no timeline.

- **Scroll-reactive.** `useScroll` measures the hero's 420vh track; scroll progress maps to a
  frame index. There is one source of truth, so the sequence can never drift out of sync.
- **Reversible.** Progress is a pure function of scroll position, so scrolling up plays the
  sequence backwards through exactly the same frames, at any speed.
- **Silky, not steppy.** The frame index eases toward the scroll target with frame-rate
  independent exponential smoothing (`src/lib/scrub.ts`), and the scrubber always draws the
  *nearest already-loaded* frame, so it never blocks or flashes blank.
- **Progressive.** A coarse pass (every 8th frame, then the last) loads first — the scrub is
  usable after ~25 small requests; the remaining frames fill in behind it.
- **Cheap to draw.** One bare `drawImage` per frame and nothing else. The cinematic grade is a
  *static* CSS filter composited on the GPU, and the scroll-linked dimming is a black overlay
  whose opacity animates on the compositor — neither touches the draw call. The canvas backing
  store is capped at 1.5× device pixels, which roughly halves the per-frame fill cost at 2×
  displays. Frames are never upscaled past a capped crop, which keeps the laptop and mark framed
  whole on phones instead of cropping the product away.

### Two bugs worth knowing about

Both were live in the first pass and both produced exactly the same complaint — "it doesn't
react to my scroll and it isn't smooth":

1. **`body { overflow-x: hidden }` silently breaks `position: sticky`.** Setting one axis to
   `hidden` forces the other to `auto`, which makes `<body>` a scroll container and detaches the
   sticky hero from page scroll — so the section scrolled away instead of pinning, and the frame
   never advanced. It must be `overflow-x: clip`, which contains overflow without creating a
   scroll container.
2. **`ctx.filter` inside the scroll loop, and `img.decode()` on all 192 frames.** The filter is
   applied per draw on the CPU, and forcing a decode for every frame makes the browser retain
   every full-resolution bitmap (~1.6 GB), so it evicts and re-decodes mid-scroll. Both are gone;
   the work now happens where it belongs — on the compositor, and lazily.

`src/lib/frameSequence.ts` is a module singleton: the preloader and the hero share one download.

### Loading behaviour

The preloader is real, not decorative — it starts the sequence download, shows honest progress
(coarse pass weighted at 82%), holds the page still, then lifts in two curtains. It releases after
a 620 ms hold once the coarse pass lands, and after a 12 s failsafe no matter what.

| Condition | Behaviour |
| --- | --- |
| Normal | Coarse pass → full 192 frames |
| `prefers-reduced-motion: reduce` | Frame 148 held as a still and only one frame is fetched — but the hero offers a **"play the sequence"** control, which activates the full thing and records the choice |
| Visitor opts into motion | `ensureSequence()` upgrades the session in place — the loader de-duplicates, so nothing is fetched twice |
| `saveData` / 2G | Coarse pass only (24 keyframes) |
| AVIF unsupported | Falls back to the poster/still and stops downloading |

---

## The premium layer

- **Custom cursor** — a gold dot with a lagging ring that expands on interactive elements, reacts
  to press, and can carry a micro-label (`data-cursor-label`). Only activates on fine pointers, and
  only *then* hides the native cursor. Text fields keep a real caret cursor.
- **Magnetic buttons** — CTAs lean toward the pointer and spring home.
- **3D tilt panels** — every product screenshot sits in `TiltCard`: pointer-driven rotation with a
  tracking gold spotlight and a specular sheen, layered under a scroll-linked parallax
  (translate/rotate/scale) driven by Framer Motion.
- **Real product, not redrawn mocks.** The nine chapters present the actual 2880×1800 captures from
  `hero/`, in a browser-window frame with a route pill — `bloom.app/coach`, `bloom.app/rewards`, and
  so on. (The old hand-drawn HTML mock screens were removed; they can't compete with the real UI.)
- **3D orbit** — the nine surfaces orbit on separate z-planes and the whole system rotates with
  scroll.
- Plus: film grain and vignette over the sequence, a hairline gold scroll-progress bar, a chapter
  rail that fills as you scroll, and a scroll-reactive closing CTA.

## Brand match

The mark is the **ascending arch**, traced from the real asset in `frames/`: deep green left leg,
cream apex, gold right leg on a near-black tile. It lives in one place — `src/components/Logo.tsx`
— and is reused by the nav, preloader, footer, orbit and CTA, so the site can never drift from it.

> **Note on the logo file:** `hero/` contains the app captures, not a standalone logo file — the
> mark was traced from the frames (`bloom_0100` / `bloom_0192` show it large and clean) and from the
> wordmark inside the app screens. If you have the original vector/SVG, drop it in and say so; the
> swap is contained to `Logo.tsx` plus `public/favicon.svg`.

## Accessibility

- `prefers-reduced-motion` is read synchronously on first render. Reduced-motion visitors get a
  composed still and download a single frame — but because macOS and Windows both switch that
  setting on during setup, often without the owner knowing, the hero offers an explicit
  **"Reduced motion is on — play the sequence"** control. Opting in restores motion across the
  whole site (the `force-motion` class defeats the blanket CSS rule), and it is remembered.
- Full `aria-label`/`aria-expanded` on the mobile menu, `aria-hidden` on decorative layers,
  `noscript` fallback with the still image, and 4.5:1+ contrast on body copy.
- Frame sequence is decorative (`aria-hidden`); every product capture has descriptive alt text.

## Performance

| | |
| --- | --- |
| Frames | 192 × AVIF ≈ 40 KB = **7.7 MB**, loaded progressively (usable at ~1 MB) |
| Product captures | 8 × AVIF ≈ 75 KB = **1.1 MB**, lazy-loaded with WebP fallback |
| App JS + CSS | ~465 KB / **135 KB gzipped**, single request (inlined) |
| Fonts | Fraunces + Inter with `preconnect` and `display=swap` |

## Verification

There is no browser available in the sandbox this was built in, so the app was verified by
rendering the entire component tree through React's server renderer and by testing the hero's logic
directly against the real modules with a stubbed network:

- **Render smoke test** — all nine chapters, hero canvas, preloader, and every capture present; no
  `undefined`/`NaN` in the output; every `<img>` has a real `src`; no duplicate `id`s and every
  in-page anchor resolves.
- **Loader test (34 checks)** — frame URL padding and clamping, coarse-pass ordering
  (1, 9, 17 … 191 **then** the last frame), fill frames only after the coarse pass, progress
  weighting, save-data mode, still mode, codec-failure fallback, and the still → full-sequence
  upgrade (including that a frame is never fetched twice and a repeated upgrade is a no-op).
- **Scrub test (15 checks)** — deterministic mapping, clamping, and reversibility: scrolling down
  and back up lands on byte-identical frame indices; 60 fps and 120 fps converge; a full sweep
  settles in 0.73 s.
- `tsc --noEmit` clean, `vite build` clean.

**Still worth a human pass:** the pointer feel (cursor, magnetism, tilt) and the scrub's perceived
weight are things you have to watch. If the scrub feels too loose or too tight, one number controls
it — `smoothing` in `useFrameScrubber` (80 ms ≈ 0.7 s to settle; try 50 for snappier, 120 for
plusher). The hero's scroll length is the other dial: `h-[340vh]` in `Hero.tsx` — raise it and the
whole sequence plays out over more scrolling, lower it and it snaps past faster.
