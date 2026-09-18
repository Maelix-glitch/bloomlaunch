/**
 * The gate's score, synthesized live.
 *
 * There are no audio files on this site — everything is built from
 * oscillators and noise the moment it is needed, which keeps the page light
 * and lets the sound follow the clock exactly. Browsers only allow audio
 * after a visitor gesture, so the score stays silent until it is enabled
 * (the gate offers a switch, and any touch on the gate offers to wake it).
 *
 * The movements:
 *  - tick      one deep, distorted knock per second for the last ten
 *  - riser     the classic trailer riser — noise and pitch climbing, drive
 *              increasing, glitch stutters tightening as zero approaches
 *  - impact    the braaam: a distorted low-fifth chord, a sub drop, a crack
 *  - swell     a warm chord that carries the fade-in of the site
 */

type Ctx = AudioContext;

let ctx: Ctx | null = null;
let master: GainNode | null = null;
let enabled = false;
let riserNodes: { stop: (t?: number) => void; gain: GainNode }[] = [];

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

/** Soft-clip curve — the "distorted" colour of the finale. */
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

/** Envelope helper: attack to peak, then exponential release. */
function env(g: GainNode, t0: number, attack: number, peak: number, release: number, sustain = 0.0001) {
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.linearRampToValueAtTime(peak, t0 + attack);
  g.gain.exponentialRampToValueAtTime(sustain, t0 + attack + release);
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
    return enabled;
  },

  disable(): void {
    enabled = false;
  },

  /** One deep knock, harder and higher as the seconds run out. n: 10 → 1. */
  tick(n: number): void {
    if (!enabled) return;
    const c = ensure();
    const m = out();
    if (c === null || m === null || c.state !== "running") return;
    const t0 = c.currentTime;
    const urgency = (11 - n) / 10; // 0.1 → 1

    const osc = c.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(74 + urgency * 96, t0);
    osc.frequency.exponentialRampToValueAtTime(40, t0 + 0.16);
    const ws = shaper(c, 6 + urgency * 10);
    const g = c.createGain();
    env(g, t0, 0.004, 0.55 + urgency * 0.4, 0.16);
    osc.connect(ws).connect(g).connect(m);
    osc.start(t0);
    osc.stop(t0 + 0.3);

    // The crack on top: a splinter of noise through a hard shaper.
    const nz = c.createBufferSource();
    nz.buffer = noiseBuffer(c, 0.05);
    const hp = c.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 1400 + urgency * 2600;
    const ng = c.createGain();
    env(ng, t0, 0.002, 0.16 + urgency * 0.22, 0.05);
    nz.connect(hp).connect(shaper(c, 14)).connect(ng).connect(m);
    nz.start(t0);
  },

  /** The trailer riser: ten seconds of climbing noise, pitch and drive. */
  startRiser(seconds = 10): void {
    if (!enabled) return;
    const c = ensure();
    const m = out();
    if (c === null || m === null || c.state !== "running") return;
    this.cancelRiser();
    const t0 = c.currentTime;

    // Noise through a climbing band-pass.
    const nz = c.createBufferSource();
    nz.buffer = noiseBuffer(c, seconds + 1);
    nz.loop = true;
    const bp = c.createBiquadFilter();
    bp.type = "bandpass";
    bp.Q.value = 1.1;
    bp.frequency.setValueAtTime(160, t0);
    bp.frequency.exponentialRampToValueAtTime(3800, t0 + seconds);
    const ng = c.createGain();
    ng.gain.setValueAtTime(0.0001, t0);
    ng.gain.linearRampToValueAtTime(0.34, t0 + seconds * 0.85);
    ng.gain.linearRampToValueAtTime(0.42, t0 + seconds);
    nz.connect(bp).connect(ng).connect(m);
    nz.start(t0);
    nz.stop(t0 + seconds + 0.2);
    riserNodes.push({ gain: ng, stop: () => nz.stop() });

    // A saw climbing an octave and a half, increasingly distorted.
    const saw = c.createOscillator();
    saw.type = "sawtooth";
    saw.frequency.setValueAtTime(48, t0);
    saw.frequency.exponentialRampToValueAtTime(210, t0 + seconds);
    const ws = shaper(c, 14);
    const lp = c.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(240, t0);
    lp.frequency.exponentialRampToValueAtTime(3000, t0 + seconds);
    const sg = c.createGain();
    sg.gain.setValueAtTime(0.0001, t0);
    sg.gain.linearRampToValueAtTime(0.2, t0 + seconds * 0.9);
    saw.connect(ws).connect(lp).connect(sg).connect(m);
    saw.start(t0);
    saw.stop(t0 + seconds + 0.2);
    riserNodes.push({ gain: sg, stop: () => saw.stop() });

    // Glitch stutters: digital splinters, closer and closer together.
    const sh = shaper(c, 22);
    sh.connect(m);
    let at = 0.35;
    let gap = 0.95;
    while (at < seconds - 0.2) {
      const osc = c.createOscillator();
      osc.type = "square";
      osc.frequency.value = 700 + Math.random() * 2400;
      const g = c.createGain();
      env(g, t0 + at, 0.002, 0.05 + (at / seconds) * 0.09, 0.03);
      const hp = c.createBiquadFilter();
      hp.type = "highpass";
      hp.frequency.value = 500;
      osc.connect(hp).connect(g).connect(sh);
      osc.start(t0 + at);
      osc.stop(t0 + at + 0.06);
      at += gap;
      gap *= 0.82;
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
        n.gain.gain.linearRampToValueAtTime(0.0001, t + 0.08);
        n.stop(t + 0.1);
      } catch {
        // The node may already be gone — that is fine.
      }
    }
    riserNodes = [];
  },

  /** Zero: the braaam, the drop, the crack, the glimmer. */
  impact(): void {
    if (!enabled) return;
    const c = ensure();
    const m = out();
    if (c === null || m === null || c.state !== "running") return;
    this.cancelRiser();
    const t0 = c.currentTime;

    // Braaam: a low open fifth, saws through heavy drive.
    const ws = shaper(c, 18);
    const lp = c.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(3600, t0);
    lp.frequency.exponentialRampToValueAtTime(220, t0 + 2.6);
    const bg = c.createGain();
    env(bg, t0, 0.012, 0.72, 3.1);
    ws.connect(lp).connect(bg).connect(m);
    for (const [freq, cents] of [[55, -6], [82.41, 5], [110, -3]] as const) {
      const o = c.createOscillator();
      o.type = "sawtooth";
      o.frequency.value = freq;
      o.detune.value = cents;
      o.connect(ws);
      o.start(t0);
      o.stop(t0 + 3.4);
    }

    // Sub drop.
    const sub = c.createOscillator();
    sub.type = "sine";
    sub.frequency.setValueAtTime(92, t0);
    sub.frequency.exponentialRampToValueAtTime(27, t0 + 0.85);
    const sg = c.createGain();
    env(sg, t0, 0.006, 0.9, 1.1);
    sub.connect(sg).connect(m);
    sub.start(t0);
    sub.stop(t0 + 1.4);

    // The crack.
    const nz = c.createBufferSource();
    nz.buffer = noiseBuffer(c, 0.16);
    const hp = c.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 900;
    const ng = c.createGain();
    env(ng, t0, 0.001, 0.5, 0.14);
    nz.connect(hp).connect(shaper(c, 10)).connect(ng).connect(m);
    nz.start(t0);

    // A high glimmer, like light landing on gold.
    for (const [freq, at, peak] of [[1318.5, 0.05, 0.045], [1760, 0.14, 0.035], [1975.5, 0.26, 0.03]] as const) {
      const o = c.createOscillator();
      o.type = "sine";
      o.frequency.value = freq;
      const g = c.createGain();
      env(g, t0 + at, 0.02, peak, 3.6);
      o.connect(g).connect(m);
      o.start(t0 + at);
      o.stop(t0 + at + 4);
    }
  },

  /** The warm chord under the site's fade-in. */
  swell(): void {
    if (!enabled) return;
    const c = ensure();
    const m = out();
    if (c === null || m === null || c.state !== "running") return;
    const t0 = c.currentTime + 0.25;

    const lp = c.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(700, t0);
    lp.frequency.linearRampToValueAtTime(1500, t0 + 2.5);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(0.16, t0 + 2.2);
    g.gain.setValueAtTime(0.16, t0 + 4.5);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 9);
    lp.connect(g).connect(m);

    // A major chord, softly detuned — the royal warmth.
    for (const [freq, cents] of [[110, -4], [164.81, 3], [220, -2], [277.18, 4], [329.63, -5]] as const) {
      const o = c.createOscillator();
      o.type = "sawtooth";
      o.frequency.value = freq;
      o.detune.value = cents;
      const voice = c.createGain();
      voice.gain.value = 0.22;
      o.connect(voice).connect(lp);
      o.start(t0);
      o.stop(t0 + 9.5);
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
}
