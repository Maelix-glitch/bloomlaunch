# Bloom · logo slot

Place the exact production Bloom mark here:

- `bloom-mark.svg`  ← preferred (vector, crisp at every size), or
- `bloom-mark.png`  ← square, transparent background, ≥ 512 px.

The loader (`src/hero/mark.ts`) checks for these files on boot and uses the
real asset everywhere it appears — hero reveal, navigation, launch signature,
footer and favicon. Its geometry is never rebuilt or redrawn.

Until the real mark is supplied, a clearly-flagged provisional glyph holds the
composition so the cinematic beats still read correctly in QA.

Optional: `og.jpg` (1200×630) for social share cards.
