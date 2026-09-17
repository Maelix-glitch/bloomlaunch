# Bloom · prepared reveal frames

Drop the finished cinematic frames from `BloomCinematicHero\frames\` into this
folder, then add a `manifest.json` describing them:

```json
{
  "prefix": "frame_",
  "pad": 4,
  "ext": "webp",
  "start": 1,
  "count": 120,
  "fps": 30,
  "width": 1920,
  "height": 1080
}
```

URLs resolve to `frame_0001.webp … frame_0120.webp`.

Authoring guidance (keeps the reveal cinematic and fast):

- 16:9 or wider; ≤ 2048 px wide (the player downsamples anything wider).
- WebP, quality ≈ 80–85, ≤ 180 KB per frame; whole sequence ≤ ~12 MB.
- The sequence should end on the centered Mac scene — scroll takes over from
  the final frame, so the last authored frame is the most important one.

Until frames + manifest exist, the hero plays its staged scene (a physically
lit Mac composition) instead. Nothing breaks; the prepared reveal simply waits
for its finished footage.
