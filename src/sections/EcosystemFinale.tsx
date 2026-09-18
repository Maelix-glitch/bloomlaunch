import { motion } from "framer-motion";
import { BloomGlyph } from "../components/Logo";
import { Eyebrow, Reveal } from "../components/Reveal";

const ALL_NODES = [
  { label: "Mood", color: "#e5867e", angle: 0 },
  { label: "Cycle", color: "#8d7bf2", angle: 40 },
  { label: "Habits", color: "#7fb88f", angle: 80 },
  { label: "Trackers", color: "#5b8ff2", angle: 120 },
  { label: "Coach", color: "#e8b158", angle: 160 },
  { label: "Rewards", color: "#e191b3", angle: 200 },
  { label: "Championship", color: "#f0cf8e", angle: 240 },
  { label: "Atelier", color: "#c9a6f2", angle: 280 },
  { label: "Profile", color: "#7fd1c9", angle: 320 },
];

export function EcosystemFinale() {
  return (
    <section className="relative overflow-hidden bg-[#050506] py-32 sm:py-44">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_50%,rgba(141,123,242,0.07),transparent_70%)]" />
      <div className="relative mx-auto max-w-2xl px-6 text-center">
        <Reveal>
          <Eyebrow>One ecosystem</Eyebrow>
          <h2 className="mt-5 font-display text-[2.4rem] leading-tight text-white sm:text-[3.2rem]">
            Nine surfaces.
            <br />
            <span className="italic text-white/60">One intelligence.</span>
          </h2>
        </Reveal>
      </div>

      <div className="perspective-dramatic relative mx-auto mt-20 flex h-[420px] max-w-3xl items-center justify-center sm:h-[480px]">
        {ALL_NODES.map((n, i) => {
          const rad = (n.angle * Math.PI) / 180;
          const radius = 210;
          const x = Math.cos(rad) * radius;
          const y = Math.sin(rad) * radius * 0.68;
          return (
            <motion.div
              key={n.label}
              initial={{ opacity: 0, x, y, scale: 1 }}
              whileInView={{ opacity: [0, 1, 1], x: [x, x, 0], y: [y, y, 0], scale: [1, 1, 0.4] }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 2.4, delay: i * 0.06, times: [0, 0.4, 1], ease: [0.16, 1, 0.3, 1] }}
              className="absolute flex flex-col items-center gap-1.5"
            >
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ background: n.color, boxShadow: `0 0 18px ${n.color}` }}
              />
              <span className="text-[0.62rem] uppercase tracking-[0.18em] text-white/40">{n.label}</span>
            </motion.div>
          );
        })}

        <motion.div
          initial={{ scale: 0.85 }}
          whileInView={{ scale: [0.85, 0.85, 1.1, 1] }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 2.6, times: [0, 0.4, 0.8, 1], ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 flex h-28 w-28 items-center justify-center rounded-full bg-[#0c0d11] ring-1 ring-white/10"
        >
          <div className="absolute h-40 w-40 animate-breathe rounded-full bg-[radial-gradient(circle,rgba(232,177,88,0.32),transparent_70%)]" />
          <BloomGlyph size={52} strokeWidth={10} glow />
        </motion.div>
      </div>
    </section>
  );
}
