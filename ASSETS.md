# BloomCinematicHero → bloomlaunch asset contract

The production source material lives in `BloomCinematicHero` on the creative
machine. This site consumes it through two drop-in points — nothing else in
the experience needs to change when assets arrive.

| Source material            | Drop into          | Consumed by                                        |
| -------------------------- | ------------------ | -------------------------------------------------- |
| `frames\` finished reveal  | `public/frames/`   | `src/hero/frames.ts` (canvas sequence player)      |
| real Bloom logo / icon     | `public/logo/`     | `src/hero/mark.ts` (hero, nav, launch, favicon)    |
| share card (optional)      | `public/logo/og.jpg` | Open Graph tags                                  |

## Frames

1. Copy the finished frames into `public/frames/`.
2. Add `public/frames/manifest.json` (see `public/frames/README.md`).
3. The overture fades the canvas in over the staged scene and plays the
   sequence once; the final frame hands off to the scroll camera.

Until both exist, the hero intentionally keeps its staged composition —
darkness, glow, settling mark, physically lit Mac — so the emotional arc is
never blocked by missing footage.

## Logo

Drop `bloom-mark.svg` (preferred) or `bloom-mark.png` into `public/logo/`.
The supplied mark is used as-is everywhere; it is never redrawn. Until it
arrives, a provisional glyph is flagged with `data-provisional` so QA can
verify the swap in one search.

## What must NOT change when assets arrive

- The beat timing of the overture (mark settle → reveal → copy).
- The scroll camera path into Bloom.
- All copy, chapters, accessibility and reduced-motion behavior.

Asset arrival is a fidelity upgrade, not a redesign.
