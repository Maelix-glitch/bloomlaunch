import { useRef } from "react";
import { motion, useScroll, useSpring, useTransform } from "framer-motion";
import { BloomGlyph } from "./Logo";
import { Eyebrow, Reveal } from "./Reveal";
import { useReducedMotion } from "../hooks/useReducedMotion";

const RING_1 = [
  { label: "Mood", color: "#e5867e", angle: 0 },
  { label: "Cycle", color: "#8d7bf2", angle: 120 },
  { label: "Habits", color: "#7fb88f", angle: 240 },
];

const RING_2 = [
  { label: "Trackers", color: "#5b8ff2", angle: 30 },
  { label: "Coach", color: "#e8b158", angle: 150 },
  { label: "Rewards", color: "#e191b3", angle: 270 },
];

const RING_3 = [
  { label: "Atelier", color: "#c9a6f2", angle: 60 },
  { label: "Profile", color: "#7fd1c9", angle: 180 },
  { label: "Dashboard", color: "#e8e8e8", angle: 300 },
];

function OrbitRing({
  items,
  radius,
  duration,
  reverse = false,
  depth = 0,
}: {
  items: { label: string; color: string; angle: number }[];
  radius: number;
  duration: number;
  reverse?: boolean;
  /** extra 3D tilt applied to this ring, degrees */
  depth?: number;
}) {
  return (
    <div
      className="absolute rounded-full border border-white/[0.06]"
      style={{
        width: radius * 2,
        height: radius * 2,
        transform: `rotateX(${depth}deg)`,
        transformStyle: "preserve-3d",
      }}
    >
      <div
        className="absolute inset-0"
        style={{ animation: `${reverse ? "orbit-rev" : "orbit"} ${duration}s linear infinite` }}
      >
        {items.map((item) => (
          <div
            key={item.label}
            className="absolute left-1/2 top-1/2 flex flex-col items-center gap-2"
            style={{
              transform: `rotate(${item.angle}deg) translate(${radius}px) rotate(-${item.angle}deg)`,
            }}
          >
            <div
              data-cursor="hover"
              className="flex items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-2.5 backdrop-blur-sm transition-colors hover:border-white/25"
              style={{
                animation: `${reverse ? "orbit" : "orbit-rev"} ${duration}s linear infinite`,
                boxShadow: `0 0 24px -6px ${item.color}88`,
              }}
            >
              <span className="whitespace-nowrap text-[0.72rem] font-medium tracking-wide" style={{ color: item.color }}>
                {item.label}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * The nine surfaces orbiting the mark. Rendered in real 3D — the rings sit on
 * separate z-planes and the whole system rotates with scroll, so the section
 * reads as a volume rather than a diagram.
 */
export function EcosystemOrbit() {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const p = useSpring(scrollYProgress, { stiffness: 80, damping: 24, mass: 0.5 });

  const systemRotateX = useTransform(p, [0, 0.5, 1], [16, 4, -12]);
  const systemRotateZ = useTransform(p, [0, 1], [-6, 6]);
  const systemY = useTransform(p, [0, 1], [60, -60]);
  const systemScale = useTransform(p, [0, 0.5, 1], [0.9, 1, 0.94]);

  const system = reduced ? undefined : { rotateX: systemRotateX, rotateZ: systemRotateZ, y: systemY, scale: systemScale };

  return (
    <section id="ecosystem" ref={ref} className="relative overflow-hidden bg-[#050506] py-32 sm:py-44">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(50%_50%_at_50%_50%,rgba(141,123,242,0.06),transparent_70%)]" />

      <div className="relative mx-auto max-w-3xl px-6 text-center">
        <Reveal>
          <Eyebrow accent="from-[#8d7bf2] to-[#7fb88f]">The bloom ecosystem</Eyebrow>
          <h2 className="mt-5 font-display text-[2.4rem] leading-tight text-white sm:text-[3.2rem]">
            Everything about you,
            <br />
            <span className="italic text-white/60">connected.</span>
          </h2>
          <p className="mx-auto mt-5 max-w-lg text-[0.98rem] text-white/50">
            Mood, cycle, habits, trackers, coaching, rewards, identity and progress — nine
            surfaces orbiting a single, intelligent core.
          </p>
        </Reveal>
      </div>

      <div className="relative mx-auto mt-20 hidden h-[640px] max-w-5xl items-center justify-center md:flex">
        <motion.div
          className="relative flex h-full w-full items-center justify-center"
          style={{ ...system, transformStyle: "preserve-3d", perspective: 1400 }}
        >
          <OrbitRing items={RING_3} radius={300} duration={70} reverse depth={-10} />
          <OrbitRing items={RING_2} radius={220} duration={52} depth={4} />
          <OrbitRing items={RING_1} radius={140} duration={38} reverse depth={12} />

          <div className="relative z-10 flex h-24 w-24 items-center justify-center rounded-full bg-[#0c0d11] ring-1 ring-white/10">
            <div className="absolute h-32 w-32 animate-breathe rounded-full bg-[radial-gradient(circle,rgba(232,177,88,0.28),transparent_70%)]" />
            <div className="absolute h-40 w-40 rounded-full border border-white/[0.05]" />
            <BloomGlyph size={44} strokeWidth={9} />
          </div>
        </motion.div>
      </div>

      {/* Mobile-friendly stacked version */}
      <div className="relative mx-auto mt-14 grid max-w-md grid-cols-3 gap-3 px-6 md:hidden">
        {[...RING_1, ...RING_2, ...RING_3].map((item) => (
          <div
            key={item.label}
            className="flex flex-col items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] py-4"
          >
            <span className="h-2 w-2 rounded-full" style={{ background: item.color, boxShadow: `0 0 10px ${item.color}` }} />
            <span className="text-[0.72rem] text-white/70">{item.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
