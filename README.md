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
  components/   Hero, Nav, NavCountdown, Cursor, Magnetic, TiltCard, PanelFrame, ProductPanel,
                Preloader, Reveal, StoryPath, ScrollProgress, Logo, EcosystemOrbit,
                LivingMap, CommandPalette, CountdownField, DigitRoller, CountdownLine
  sections/     the nine chapters, LaunchCountdown, FinalCTA, Footer
  hooks/        useFrameScrubber, useFrameSequenceStatus, useReducedMotion,
                useMotionPreference, useCountdown
  lib/          frameSequence (loader), scrub (hero math), assets, constellation (map
                geometry), search (palette matching), odometer (digit columns),
                countdown (window, formatting, calendar file), launchClock (the one clock)
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

## The Living Map

The ecosystem section is not a diagram — it is a real-time 3D system on a canvas
(`src/components/LivingMap.tsx` + the pure geometry in `src/lib/constellation.ts`).

- **Three orbits on three z-planes.** Nine surfaces ride rings at different depths, so the
  system has genuine parallax rather than being a flat circle.
- **Arcs, not spokes.** Every connection is a quadratic Bézier that bows off-axis, drawn with a
  gradient that runs from the surface's own colour into gold at the core.
- **Particles stream both ways.** 126 of them ride the arcs — mostly inward, some outward —
  fading in at the node and out at the core so nothing ever pops. They wrap, so the field never
  runs dry. Placement is seeded deterministically, so the composition is identical every visit.
- **The field is physical.** The whole system turns with scroll (a ±23° yaw plus tilt) and drifts
  on idle spin; the pointer bends everything inside a 190px radius toward it with a quadratic
  falloff, and brightens what it touches.
- **Hovering a surface focuses it** — the arc lights, the label lifts, and a readout underneath
  tells you what that surface does. Because a canvas can't be navigated, the same nine
  destinations are also real links in a row below, so keyboard and touch visitors get everything.

Cost control: glow sprites are pre-rendered once per colour and blitted (never `shadowBlur`), the
field runs at 1.5× DPR at most, the loop is driven by `IntersectionObserver` so it stops off
screen, particle count drops ~45% under 700px wide, and under `prefers-reduced-motion` the
composition is drawn once and left still.

## Command palette

`⌘K` / `Ctrl+K` — or the **Search** button in the nav, or the mobile menu.

Fourteen destinations: the nine surfaces, the launch countdown, the tour, the arc and
back-to-top — the countdown entry carries the live reading in its hint. Matching is a
subsequence fuzzy matcher (`src/lib/search.ts`) with bonuses for consecutive runs, word starts and
whole-string containment, so `dsh` finds Dashboard, `sleep` finds Trackers and `45` finds
Championship. Matched characters are highlighted in gold, results are grouped by kind, `↑↓`
navigate and `↵` jumps — smooth-scrolling to that section. It is the fastest way to prove the
product is real, and it costs nothing on a page with no backend.

## The launch countdown

The site is an event, not a brochure: there is a real 24-hour countdown running to the moment
Bloom opens, and every page carries it.

- **One clock for the whole site** (`src/lib/launchClock.ts`). The hero line, the nav badge, the
  odometer and the footer all subscribe to a single `requestAnimationFrame` loop and a single
  resolved window. Two independent tickers would eventually disagree by a frame, and a page showing
  two different numbers for the same moment is worse than one that shows none.
- **A mechanical odometer** (`src/components/DigitRoller.tsx` + `src/lib/odometer.ts`). Each digit
  is its own fixed-width column of eleven cells — `0…9` with a trailing `0`, so a carry rolls
  forward like a counter instead of snapping back. Hours, minutes and seconds each roll on
  transition; the hundredths place is a continuously turning wheel, redrawn from the clock rather
  than animated, so it can never drift out of step with the seconds.
- **The field answers it.** Behind the digits, a canvas emits a pulse ring on every real
  clock-second, particles drift through it, and the whole field leans toward the pointer
  (`src/components/CountdownField.tsx`).
- **The copy escalates.** `stageCopy` moves through the last stretch, the final hour, the final
  minutes and the last sixty seconds, so the page changes personality as the moment approaches.
- **It ends properly.** When the count reaches zero the digits give way to a live stage, the field
  fires a burst, and every counter on the site flips to *Live*. If a launch date is configured it
  is an absolute fact: the window never restarts, so a visitor arriving the day after launch finds
  the doors open rather than a fresh 24-hour countdown to a moment that has already passed.
- **Real utility.** The `.ics` download is a valid RFC 5545 calendar file — CRLF line endings,
  75-octet folded lines, escaped text, and a 15-minute alarm — so the launch can genuinely be put
  in someone's calendar. The local and UTC readings are both printed, and the window's opening
  moment is shown alongside a progress strip.

## The royal gate

The whole site stands behind the countdown, and the countdown belongs to **the royal seal**: a
huge, faded lock painted in old gold — crown, lions, fleur-de-lis and a glowing keyhole
(`public/royal-lock.jpg`, generated for the gate). It sits on the same black as the gate, so a
screen blend makes the darkness disappear and only the lock remains, ghosted behind the gilded
odometer. The nav, the nine surfaces, the palette — everything — stays mounted underneath but
sealed: hidden, `inert`, and unscrollable, so the hero's frames are warm at the moment of the
reveal.

The last ten seconds are played like a film: letterbox bars close in, film grain and flicker come
up, the aura races, one giant numeral counts 10 → 1 alone on the screen, and the lock's keyhole
begins to glow. At zero the gate **unseals**: the countdown dissolves away to a distorted, fading
sound, the lock flares, and light pours out of the keyhole until it covers everything. Then the
light slowly ebbs and the website is there, underneath, settling into view from a slight push-in. A visitor arriving after launch never sees the gate. Because an expired window reads as
*open* — it never restarts — nobody can be locked out twice.

**The score** (`src/lib/score.ts`) is synthesized live with Web Audio — there are no audio files,
and no beat: only slow pressure. The last ten carry a low drone and a climbing breath of noise;
zero brings the unsealing — a driven chord that distorts and melts into silence as the volume
fades — together with the site's own beat drop (`public/audio/beat-drop.mp3`, committed to the
repo and decoded ahead of zero so it fires with no latency); and a warm major-chord swell carries
the light and the site's arrival. Browsers gate audio behind a visitor gesture, so the gate offers an **Enable
sound** switch — and any touch on the gate wakes the score.

Rehearse it from the address bar:

- `?lock-for=90` — seal the site for 90 more seconds, then watch the ceremony unlock it.
- `?unlocked` — stand the gate open (studio access).

Set the real date in one place — `LAUNCH_AT` in `src/lib/countdown.ts`, an ISO string **with an
explicit offset** (for example `2026-10-01T20:00:00+05:30`), so it resolves identically in every
visitor's timezone. Until then it is unset (`null`) and the site counts a rolling 24-hour window
anchored to each visitor's first visit and remembered in `localStorage` — always a real, running
24-hour countdown rather than a placeholder date that silently expires.

Setting a date turns on the full arc: the days scale before the window opens (a launch three weeks
out is 500 hours away, and the odometer's hour field is two digits, so it counts days instead of
lying), the odometer takes over for the final 24 hours, and at the moment itself the section
becomes the live stage and does not go back.

The countdown is deliberately not only a section: it appears in the hero, in the nav badge, in the
command palette, in the closing call to action and in the footer.

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
- **Living Map geometry test (63 checks)** — rotations preserve radius and are exact at 0°/360°,
  the projection puts the origin dead centre and scales with depth, screen +y renders downward,
  the 0.82 squash is applied exactly, arcs begin and end on their endpoints and bow off-axis,
  arcs don't divide by zero on coincident points, particles wrap in both directions and their
  fades peak mid-arc, the pointer pulls points toward it without ever overshooting, influence
  decays monotonically, hover targeting picks the nearest node and returns -1 outside the radius,
  and `withAlpha` parses, expands and clamps.
- **Gate render check** — the sealed stage: viewport coverage, the six gilded digit columns plus
  the continuous wheel, the four court corners, the turning aura, the timer landmark, the
  screen-reader reading, both time zones, the sound switch, and no leaked `undefined`/`NaN`.
- **Score check** — the score is a complete no-op without Web Audio (SSR, blocked autoplay), the
  distortion curve is bounded, monotonic and centred, harder drive saturates harder, and the
  percussion of an earlier draft is asserted gone.
- The gate render check also asserts the seal itself: the painted lock, its screen blend, and its
  empty alt text.
- **Launch clock test (42 checks)** — a fake `requestAnimationFrame`, a fake DOM and a fake wall
  clock drive the shared clock directly: every subscriber reads one window (same object identity),
  the fast subscriber redraws about 30×/second and the seconds subscriber exactly once, no frame
  arrives inside the 33 ms budget, five seconds of ticking never re-resolves the window, a hidden
  tab stops drawing and leaves no frame scheduled, returning to the tab pushes a reading that has
  caught up **before** it notifies anyone, the flip to live is pushed to even the slowest
  subscriber, remaining clamps at zero, and teardown stops the loop and drops the visibility
  listener.
- **Countdown test (123 checks)** — window resolution (a configured date wins and never restarts,
  an expired one reads live rather than starting over, the boundary is inclusive), anchor reuse and
  stale anchors, digit splitting with zero padding and hour clamping, the escalating stage copy,
  local and UTC formatting, odometer cell alignment (every digit shows itself at its own offset,
  and no input can blank the window), and the calendar file’s RFC 5545 structure: CRLF endings,
  balanced `BEGIN`/`END` pairs, 75-octet folding with space continuations, escaping, and the
  −15-minute alarm. It also pins the phase model: the odometer only exists inside the window, days
  are split out before it, an unset launch date always yields a running 24-hour window, and the
  pre-window copy counts in days, and an expired rolling window opens the site instead of
  restarting it — the gate's guarantee that a visitor is sealed for one day, then free.
- **Search test (32 checks)** — prefix beats mid-string, subsequence order is respected, highlights
  are correct and ascending, consecutive runs beat scattered hits, word starts beat mid-word, and
  twelve realistic palette queries (`dsh`, `sleep`, `gold`, `45`, `theme`, `conn`, …) all resolve
  to the intended destination.
- **Offline render of the Living Map** — the component's own pure functions were used to draw the
  system with ImageMagick at four scroll angles and one hover state, to confirm the composition
  fills the stage and that no two labels ever collide.
- **Scrub test (15 checks)** — deterministic mapping, clamping, and reversibility: scrolling down
  and back up lands on byte-identical frame indices; 60 fps and 120 fps converge; a full sweep
  settles in 0.73 s.
- **Countdown line test** — the hero, closing CTA and footer readouts all print the same instant,
  visibly and in their `aria-label`, and link to the section.
- `tsc --noEmit` clean, `vite build` clean.

**Still worth a human pass:** the pointer feel (cursor, magnetism, tilt) and the scrub's perceived
weight are things you have to watch. If the scrub feels too loose or too tight, one number controls
it — `smoothing` in `useFrameScrubber` (80 ms ≈ 0.7 s to settle; try 50 for snappier, 120 for
plusher). The hero's scroll length is the other dial: `h-[340vh]` in `Hero.tsx` — raise it and the
whole sequence plays out over more scrolling, lower it and it snaps past faster.
