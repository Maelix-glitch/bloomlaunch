# bloomlaunch

The cinematic launch experience for **Bloom** — one authored world from the
first dark frame to the final signature: curiosity first, understanding
second, product desire third.

## The film

1. **Overture** — darkness, a breathing glow, the Bloom mark descending and
   settling, then the *prepared reveal*: the authored frame sequence
   (`public/frames/`) plays the Mac into view. Without frames yet, a staged,
   physically lit Mac composition carries the same beats faithfully.
2. **Entry** — the scroll camera dollies into the screen; Bloom's *Today*
   greets you (sample data, honestly labelled).
3. **Chapters** — Stories, Mood, Trackers & Health, Cycle, Rewards and Coach,
   staged as cinematic scenes rather than feature cards.
4. **Launch** — the signature and a waitlist note that stores nothing.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # typecheck + production build
npm run preview    # serve the production build
```

## Production assets

See **[ASSETS.md](ASSETS.md)** — the drop-in contract for the finished
`BloomCinematicHero` frames and the real Bloom logo.

## Engineering notes

- Vite + strict TypeScript, zero runtime dependencies; self-hosted
  Fraunces/Inter only. No third-party scripts, no secrets in the client.
- Native scrolling is never hijacked — scroll is a camera control.
- All motion is transform/opacity on the compositor; one shared rAF loop.
- `prefers-reduced-motion` receives the fully composed still, not a broken
  fallback. Semantic landmarks, keyboard access and visible focus throughout.
- Frame playback: canvas 2D + ImageBitmap, capped DPR, concurrency-limited
  decode, off-screen pause, memory release after the first play.
