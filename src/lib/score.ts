/**
 * The gate's score, synthesized live.
 *
 * There are no audio files on this site — everything is built from
 * oscillators and noise the moment it is needed. Browsers only allow audio
 * after a visitor gesture, so the score stays silent until it is enabled
 * (the gate offers a switch, and any touch on the gate offers to wake it).
 *
 * The movements, all of them slow — there is no beat on this gate:
 *  - rise     the last ten seconds: a low drone and a breath of noise
 *             climbing gently, no rhythm, only pressure
 *  - unseal   zero: the sound distorts and dissolves — drive melting away
 *             as the volume fades to nothing, like the spell letting go
 *  - swell    a warm chord under the light, carrying the site's arrival
 */

type Ctx = AudioContext;

let ctx: Ctx | null = null;
let master: GainNode | null = null;
let enabled = false;
let riserNodes: { stop: (t?: number) => void; gain: GainNode }[] = [];

/** The visitor's own beat drop, committed at public/audio/beat-drop.mp3. */
const DROP_URL = "/audio/beat-drop.mp3";
let dropBuffer: AudioBuffer | null = null;
let dropLoading: Promise<void> | null = null;

function supportsAudio(): boolean {
  return typeof window !== "undefined" && typeof (window as unknown as Record<string, unknown>).AudioContext !== "undefined";
}

function ensure(): Ctx | null {
  if (!supportsAudio()) return null;
  if (ctx === null) {
    try {
      const AC = (window as unknown as { AudioContext: typeof AudioContext }).AudioContext;
      ctx = new AC();
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -14;
      comp.ratio.value = 8;
      master = ctx.createGain();
      master.gain.value = 0.85;
      master.connect(comp);
      comp.connect(ctx.destination);
    } catch {
      ctx = null;
    }
  }
  return ctx;
}

/** Soft-clip curve — the distortion colour of the unsealing. */
function shaperCurve(amount: number) {
  const n = 1024;
  const curve = new Float32Array(n);
  for (let i = 0; i < n; i += 1) {
    const x = (i / (n - 1)) * 2 - 1;
    curve[i] = Math.tanh(amount * x);
  }
  return curve;
}

function shaper(c: Ctx, amount: number): WaveShaperNode {
  const ws = c.createWaveShaper();
  ws.curve = shaperCurve(amount);
  ws.oversample = "2x";
  return ws;
}

function noiseBuffer(c: Ctx, seconds: number): AudioBuffer {
  const buf = c.createBuffer(1, Math.ceil(c.sampleRate * seconds), c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
  return buf;
}

function out(): GainNode | null {
  return master;
}

// ---------------------------------------------------------------------------

export const score = {
  isEnabled(): boolean {
    return enabled;
  },

  /** Must be called from a visitor gesture. Resolves once sound is possible. */
  async enable(): Promise<boolean> {
    const c = ensure();
    if (c === null) return false;
    try {
      if (c.state === "suspended") await c.resume();
      enabled = c.state === "running";
    } catch {
      enabled = false;
    }
    if (enabled) this.loadDrop();
    return enabled;
  },

  /** Decode the drop ahead of zero so it fires with no fetch latency. */
  loadDrop(): void {
    const c = ensure();
    if (c === null || dropBuffer !== null || dropLoading !== null) return;
    dropLoading = (async () => {
      try {
        const res = await fetch(DROP_URL);
        if (!res.ok) return;
        dropBuffer = await c.decodeAudioData(await res.arrayBuffer());
      } catch {
        dropBuffer = null;
      } finally {
        dropLoading = null;
      }
    })();
  },

  /** The visitor's drop, exactly at zero. Silent if it never decoded. */
  drop(): void {
    if (!enabled) return;
    const c = ensure();
    const m = out();
    if (c === null || m === null || c.state !== "running" || dropBuffer === null) return;
    const src = c.createBufferSource();
    src.buffer = dropBuffer;
    const g = c.createGain();
    g.gain.value = 1;
    src.connect(g).connect(m);
    src.start(c.currentTime + 0.03);
  },

  disable(): void {
    enabled = false;
  },

  /**
   * The last seconds: a low drone and rising breath. No rhythm — pressure
   * only, climbing until the moment itself.
   */
  startRiser(seconds = 10): void {
    if (!enabled) return;
    const c = ensure();
    const m = out();
    if (c === null || m === null || c.state !== "running") return;
    this.cancelRiser();
    const t0 = c.currentTime;

    // A breath of noise through a slowly climbing band-pass.
    const nz = c.createBufferSource();
    nz.buffer = noiseBuffer(c, seconds + 1);
    nz.loop = true;
    const bp = c.createBiquadFilter();
    bp.type = "bandpass";
    bp.Q.value = 0.9;
    bp.frequency.setValueAtTime(140, t0);
    bp.frequency.exponentialRampToValueAtTime(2400, t0 + seconds);
    const ng = c.createGain();
    ng.gain.setValueAtTime(0.0001, t0);
    ng.gain.linearRampToValueAtTime(0.16, t0 + seconds * 0.9);
    nz.connect(bp).connect(ng).connect(m);
    nz.start(t0);
    nz.stop(t0 + seconds + 0.2);
    riserNodes.push({ gain: ng, stop: () => nz.stop() });

    // Chest pressure: a sub that rises from below hearing into feeling.
    const sub = c.createOscillator();
    sub.type = "sine";
    sub.frequency.setValueAtTime(26, t0);
    sub.frequency.exponentialRampToValueAtTime(41, t0 + seconds);
    const subG = c.createGain();
    subG.gain.setValueAtTime(0.0001, t0);
    subG.gain.linearRampToValueAtTime(0.34, t0 + seconds * 0.95);
    sub.connect(subG).connect(m);
    sub.start(t0);
    sub.stop(t0 + seconds + 0.2);
    riserNodes.push({ gain: subG, stop: () => sub.stop() });

    // Two detuned low voices leaning into each other as they climb.
    for (const [start, end] of [[41.2, 82.4], [61.7, 123.4]] as const) {
      const osc = c.createOscillator();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(start, t0);
      osc.frequency.exponentialRampToValueAtTime(end, t0 + seconds);
      const lp = c.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.setValueAtTime(220, t0);
      lp.frequency.exponentialRampToValueAtTime(1600, t0 + seconds);
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(0.085, t0 + seconds * 0.92);
      osc.connect(lp).connect(g).connect(m);
      osc.start(t0);
      osc.stop(t0 + seconds + 0.2);
      riserNodes.push({ gain: g, stop: () => osc.stop() });
    }
  },

  /** If zero arrives by another route (a caught-up tab), silence the climb. */
  cancelRiser(): void {
    if (ctx === null) return;
    const t = ctx.currentTime;
    for (const n of riserNodes) {
      try {
        n.gain.gain.cancelScheduledValues(t);
        n.gain.gain.setValueAtTime(n.gain.gain.value, t);
        n.gain.gain.linearRampToValueAtTime(0.0001, t + 0.25);
        n.stop(t + 0.3);
      } catch {
        // The node may already be gone — that is fine.
      }
    }
    riserNodes = [];
  },

  /**
   * Zero: the sound distorts and dies. A driven chord melts from grit into
   * clean air as it fades — the spell letting go — with a low rumble
   * sinking underneath.
   */
  unseal(): void {
    if (!enabled) return;
    const c = ensure();
    const m = out();
    if (c === null || m === null || c.state !== "running") return;
    this.cancelRiser();
    const t0 = c.currentTime;

    // The driven chord. Drive is a gain INTO the shaper: it starts hot and
    // distorted, then the drive and the voice fade together.
    // The growl: C1 and G1 — a low fifth from the floor of hearing —
    // driven hard, then the drive and the voice melt together into silence.
    const ws = shaper(c, 30);
    const drive = c.createGain();
    drive.gain.setValueAtTime(1.8, t0);
    drive.gain.linearRampToValueAtTime(0.1, t0 + 3.2);
    const body = c.createGain();
    body.gain.setValueAtTime(0.0001, t0);
    body.gain.linearRampToValueAtTime(0.55, t0 + 0.09);
    body.gain.setValueAtTime(0.55, t0 + 1.4);
    body.gain.exponentialRampToValueAtTime(0.0001, t0 + 4.4);
    const lp = c.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(1400, t0);
    lp.frequency.exponentialRampToValueAtTime(90, t0 + 3.8);
    drive.connect(ws).connect(lp).connect(body).connect(m);
    for (const [freq, cents] of [[32.7, -7], [49, 5], [65.4, -4]] as const) {
      const o = c.createOscillator();
      o.type = "sawtooth";
      o.frequency.value = freq;
      o.detune.value = cents;
      const voice = c.createGain();
      voice.gain.value = 0.34;
      o.connect(voice).connect(drive);
      o.start(t0);
      o.stop(t0 + 4.6);
    }

    // The drop under the drop: felt more than heard.
    const sub = c.createOscillator();
    sub.type = "sine";
    sub.frequency.setValueAtTime(48, t0);
    sub.frequency.exponentialRampToValueAtTime(19, t0 + 3.2);
    const sg = c.createGain();
    sg.gain.setValueAtTime(0.0001, t0);
    sg.gain.linearRampToValueAtTime(0.85, t0 + 0.12);
    sg.gain.setValueAtTime(0.85, t0 + 0.9);
    sg.gain.exponentialRampToValueAtTime(0.0001, t0 + 3.8);
    sub.connect(sg).connect(m);
    sub.start(t0);
    sub.stop(t0 + 4);

  },

  /**
   * The reveal: a deep warm mass rising under the light — sub floor, low
   * fifth, the chord above — with a high shimmer like dust in the light.
   * This is the goosebump: enormous below, glittering above.
   */
  swell(): void {
    if (!enabled) return;
    const c = ensure();
    const m = out();
    if (c === null || m === null || c.state !== "running") return;
    const t0 = c.currentTime + 0.35;

    // The floor: a sub that arrives like weight.
    const sub = c.createOscillator();
    sub.type = "sine";
    sub.frequency.setValueAtTime(27.5, t0);
    sub.frequency.exponentialRampToValueAtTime(26, t0 + 9); // barely settling
    const subG = c.createGain();
    subG.gain.setValueAtTime(0.0001, t0);
    subG.gain.linearRampToValueAtTime(0.3, t0 + 3.2);
    subG.gain.setValueAtTime(0.3, t0 + 6);
    subG.gain.exponentialRampToValueAtTime(0.0001, t0 + 11);
    sub.connect(subG).connect(m);
    sub.start(t0);
    sub.stop(t0 + 11.5);

    // The warm mass: low fifth + chord, detuned, slow-breathing lowpass.
    const lp = c.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(320, t0);
    lp.frequency.linearRampToValueAtTime(1200, t0 + 4);
    lp.frequency.linearRampToValueAtTime(700, t0 + 9);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(0.16, t0 + 3);
    g.gain.setValueAtTime(0.16, t0 + 6);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 11);
    lp.connect(g).connect(m);
    for (const [freq, cents] of [[55, -5], [82.41, 4], [110, -3], [164.81, 5], [220, -4], [277.18, 3]] as const) {
      const o = c.createOscillator();
      o.type = "sawtooth";
      o.frequency.value = freq;
      o.detune.value = cents;
      const voice = c.createGain();
      voice.gain.value = 0.18;
      o.connect(voice).connect(lp);
      o.start(t0);
      o.stop(t0 + 11.5);
    }

    // The shimmer: high partials catching the light, one by one.
    for (const [freq, at, peak] of [[1760, 1.2, 0.028], [2217.5, 2.1, 0.022], [2637, 3.2, 0.018], [3520, 4.6, 0.012]] as const) {
      const o = c.createOscillator();
      o.type = "sine";
      o.frequency.value = freq;
      const og = c.createGain();
      og.gain.setValueAtTime(0.0001, t0 + at);
      og.gain.linearRampToValueAtTime(peak, t0 + at + 1.4);
      og.gain.exponentialRampToValueAtTime(0.0001, t0 + at + 6);
      o.connect(og).connect(m);
      o.start(t0 + at);
      o.stop(t0 + at + 7);
    }
  },
};

/** Test seam: the distortion curve itself, so it can be verified headless. */
export const __internals = { shaperCurve };

/** Test seam: forget the context (the suites run without Web Audio). */
export function __resetScore(): void {
  ctx = null;
  master = null;
  enabled = false;
  riserNodes = [];
  dropBuffer = null;
  dropLoading = null;
}
