# Production assets — Bloom cinematic hero

All production assets live in `public/` (served at root by Vite, copied into `dist/` as-is).

| Path | Content | Source |
| --- | --- | --- |
| `public/frames/bloom_0001.webp … bloom_0192.webp` | 192 rendered frames, 1920×1080, WebP | exported cinematic sequence (`BloomCinematicHero/frames`) |
| `public/frames/frames.json` | original manifest (name pattern, fps, size) | export tooling |
| `public/frames/manifest.json` | extended manifest read by `src/hero/frames.ts` (adds start/count) | generated during integration |
| `public/product/hero-01-home.png … hero-10-dashboard.png` | nine 2880×1800 UI captures of the real app | real Bloom screens |
| `public/logo/bloom-mark.png` | the exact squircle Bloom app icon, cropped from the first cinematic frame | `bloom_0001.webp` (crop only — never redrawn) |
| `public/bloom-still.webp` | mid-shot frame used for og/share previews | frame 100 |

## Ground rules

- These are the source of truth. Do not redraw, redesign, or substitute any of them.
- The hero plays the real frame sequence; the DOM "Mac + mini app" mock renders only
  as a fallback if the sequence cannot load.
- Do not commit anything not listed here; the sequence is ~15 MB of committed bytes
  by design (it is the product).
