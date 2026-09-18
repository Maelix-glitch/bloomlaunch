/**
 * Math for the Living Map — the interactive connection field in the ecosystem
 * section.
 *
 * Everything here is pure so the geometry can be verified without a browser.
 * The component on top only wires it to a canvas.
 */

export type Vec3 = { x: number; y: number; z: number };
export type Vec2 = { x: number; y: number };

export type MapNode = {
  label: string;
  href: string;
  color: string;
  /** ring index, innermost first */
  ring: number;
  /** degrees around the ring */
  angle: number;
  /** the surface in one line, shown when it is focused */
  blurb: string;
};

/** Ring radii in world units, innermost first. Sized to fill the stage. */
export const RING_RADII = [238, 366, 494];
/** Each ring sits on its own z-plane, which is what gives the system depth. */
export const RING_DEPTH = [-64, 6, 74];
/** Vertical squash — the system is viewed close to edge-on. */
export const RING_SQUASH = 0.5;

export const NODES: MapNode[] = [
  { label: "Mood", href: "#mood", color: "#e5867e", ring: 0, angle: -90, blurb: "One honest check-in a day." },
  { label: "Cycle", href: "#cycle", color: "#8d7bf2", ring: 0, angle: 30, blurb: "Patterns read before they arrive." },
  { label: "Habits", href: "#habits", color: "#7fb88f", ring: 0, angle: 150, blurb: "Small actions, compounded." },
  { label: "Trackers", href: "#trackers", color: "#5b8ff2", ring: 1, angle: -30, blurb: "Six signals, measured daily." },
  { label: "Coach", href: "#coach", color: "#e8b158", ring: 1, angle: 90, blurb: "Guidance that knows your record." },
  { label: "Rewards", href: "#rewards", color: "#e191b3", ring: 1, angle: 210, blurb: "Milestones worth keeping." },
  { label: "Championship", href: "#championship", color: "#f0cf8e", ring: 2, angle: 10, blurb: "A 45-day arc, built to finish." },
  { label: "Atelier", href: "#atelier", color: "#c9a6f2", ring: 2, angle: 130, blurb: "The ecosystem, made yours." },
  { label: "Dashboard", href: "#dashboard", color: "#7fd1c9", ring: 2, angle: 250, blurb: "Your whole life, one calm view." },
];

/** World-space position of a node, before any rotation. */
export function nodePosition(node: MapNode): Vec3 {
  return ringPoint(node.ring, node.angle);
}

/** A point on a ring, before rotation. */
export function ringPoint(ring: number, angle: number): Vec3 {
  const radius = RING_RADII[ring] ?? RING_RADII[0];
  const radians = (angle * Math.PI) / 180;
  return {
    x: Math.cos(radians) * radius,
    y: Math.sin(radians) * radius * RING_SQUASH,
    z: RING_DEPTH[ring] ?? 0,
  };
}

/**
 * Samples a whole ring, so the orbit itself can be drawn as a guide. Rendering
 * these faintly is what turns a scatter of dots into a legible system.
 */
export function ringOutline(ring: number, steps = 72): Vec3[] {
  const points: Vec3[] = [];
  for (let i = 0; i <= steps; i += 1) points.push(ringPoint(ring, (360 / steps) * i));
  return points;
}

const DEG = Math.PI / 180;

export function rotateY(p: Vec3, degrees: number): Vec3 {
  const a = degrees * DEG;
  const cos = Math.cos(a);
  const sin = Math.sin(a);
  return { x: p.x * cos - p.z * sin, y: p.y, z: p.x * sin + p.z * cos };
}

export function rotateX(p: Vec3, degrees: number): Vec3 {
  const a = degrees * DEG;
  const cos = Math.cos(a);
  const sin = Math.sin(a);
  return { x: p.x, y: p.y * cos - p.z * sin, z: p.y * sin + p.z * cos };
}

export type Camera = {
  width: number;
  height: number;
  /** focal length in px — larger is flatter, more telephoto */
  focal: number;
  /** camera distance from the origin */
  distance: number;
  /** perspective squash on the vertical axis */
  flattenY: number;
};

export type Projected = {
  x: number;
  y: number;
  /** perspective scale, 1 at the origin plane */
  scale: number;
  /** 0 = far, 1 = near */
  depth: number;
};

export const DEFAULT_FOCAL = 1120;
export const DEFAULT_DISTANCE = 620;
export const DEFAULT_FLATTEN_Y = 0.82;

/**
 * Perspective projection. Points nearer the camera (larger z) come back with a
 * larger scale, which is all the 3D this needs — the depth cue and the parallax
 * between rings do the heavy lifting.
 */
export function project(p: Vec3, camera: Camera): Projected {
  const distance = Math.max(camera.distance - p.z, 1);
  const scale = camera.focal / (camera.focal + distance);
  const depthRange = 900;
  return {
    x: camera.width / 2 + p.x * scale,
    y: camera.height / 2 + p.y * scale * camera.flattenY,
    scale,
    depth: clamp01((p.z + depthRange / 2) / depthRange),
  };
}

export function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

export function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

/** Far nodes fade back instead of popping. */
export function depthAlpha(depth: number, floor = 0.16, ceiling = 1): number {
  return floor + (ceiling - floor) * clamp01(depth);
}

/**
 * Quadratic Bézier between a node and the core, bowed off-axis so the
 * connections read as arcs rather than spokes.
 */
export function connectionPoint(from: Vec3, to: Vec3, t: number, bow = 0.22): Vec3 {
  const mid: Vec3 = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2, z: (from.z + to.z) / 2 };
  // Perpendicular in the XY plane, scaled by the span.
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy) || 1;
  const control: Vec3 = {
    x: mid.x + (-dy / length) * length * bow,
    y: mid.y + (dx / length) * length * bow,
    z: mid.z + 26,
  };
  const inv = 1 - t;
  return {
    x: inv * inv * from.x + 2 * inv * t * control.x + t * t * to.x,
    y: inv * inv * from.y + 2 * inv * t * control.y + t * t * to.y,
    z: inv * inv * from.z + 2 * inv * t * control.z + t * t * to.z,
  };
}

export type Particle = {
  /** which connection this particle rides */
  node: number;
  /** 0 → 1 along the arc, node to core */
  t: number;
  /** t units per second; negative travels core → node */
  speed: number;
  /** base radius in world units */
  size: number;
};

export function makeParticle(node: number, seed: number): Particle {
  // Deterministic pseudo-random from the seed so a composition is reproducible.
  const r1 = fract(Math.sin(seed * 12.9898) * 43758.5453);
  const r2 = fract(Math.sin(seed * 78.233) * 12345.6789);
  const inward = r1 > 0.45;
  return {
    node,
    t: r2,
    speed: (inward ? 1 : -1) * (0.055 + r1 * 0.075),
    size: 1.5 + r2 * 2.1,
  };
}

function fract(v: number): number {
  return v - Math.floor(v);
}

/** Advance a particle, wrapping so the stream never ends. */
export function advanceParticle(particle: Particle, dt: number): Particle {
  let t = particle.t + particle.speed * dt;
  if (t > 1) t -= 1;
  else if (t < 0) t += 1;
  return { ...particle, t };
}

/** Fade in at the node, out at the core, so particles never pop. */
export function particleFade(t: number, edge = 0.14): number {
  if (t < edge) return t / edge;
  if (t > 1 - edge) return (1 - t) / edge;
  return 1;
}

export type Pointer = Vec2 & { active: boolean };

export type Displaced = { x: number; y: number; glow: number };

/**
 * Bend a screen-space point toward the pointer, with a smooth falloff.
 * Beyond `radius` the point is returned untouched, so a still pointer leaves
 * the field completely identical to a field with no pointer at all.
 */
export function pointerInfluence(
  point: Vec2,
  pointer: Pointer,
  strength = 0.34,
  radius = 190
): Displaced {
  if (!pointer.active) return { x: point.x, y: point.y, glow: 0 };
  const dx = pointer.x - point.x;
  const dy = pointer.y - point.y;
  const distance = Math.hypot(dx, dy);
  if (distance >= radius) return { x: point.x, y: point.y, glow: 0 };
  const falloff = 1 - distance / radius;
  const eased = falloff * falloff;
  return {
    x: point.x + dx * eased * strength,
    y: point.y + dy * eased * strength,
    glow: falloff,
  };
}

/** Nearest node to the pointer, or -1 when none is close enough to focus. */
export function nodeAtPointer(
  positions: Projected[],
  pointer: Pointer,
  radius = 96
): number {
  if (!pointer.active) return -1;
  let best = -1;
  let bestDistance = radius;
  for (let i = 0; i < positions.length; i += 1) {
    const p = positions[i];
    const distance = Math.hypot(p.x - pointer.x, p.y - pointer.y);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = i;
    }
  }
  return best;
}

/** "#e8b158" + 0.5 → "rgba(232,177,88,0.5)" */
export function withAlpha(hex: string, alpha: number): string {
  const clean = hex.replace("#", "");
  const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  const value = Number.parseInt(full.slice(0, 6), 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r},${g},${b},${clamp01(alpha).toFixed(3)})`;
}
