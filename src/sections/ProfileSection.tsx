import { motion } from "framer-motion";
import { Eyebrow, Reveal } from "../components/Reveal";
import { ProductPanel } from "../components/ProductPanel";

const SATELLITES = [
  { label: "Mood", color: "#e5867e", angle: -70 },
  { label: "Habits", color: "#7fb88f", angle: -20 },
  { label: "Progress", color: "#e8b158", angle: 30 },
  { label: "Achievements", color: "#e191b3", angle: 80 },
  { label: "Goals", color: "#5b8ff2", angle: 130 },
  { label: "Insights", color: "#8d7bf2", angle: 180 },
];

export function ProfileSection() {
  return (
    <section id="profile" className="relative overflow-hidden bg-[#050506] py-28 sm:py-36">
      <div className="mx-auto max-w-3xl px-6 text-center">
        <Reveal>
          <div className="flex items-center justify-center gap-4">
            <span className="font-display text-[0.9rem] text-white/25 tabular-nums">08</span>
            <Eyebrow accent="from-[#7fd1c9] to-[#8d7bf2]">Identity · Profile</Eyebrow>
          </div>
          <h2 className="mt-5 font-display text-[2.3rem] leading-tight text-white sm:text-[3rem]">
            You, at the center
            <br />
            <span className="italic text-white/60">of your own record.</span>
          </h2>
        </Reveal>
      </div>

      <div className="relative mx-auto mt-16 flex h-72 max-w-2xl items-center justify-center">
        {SATELLITES.map((s, i) => {
          const rad = (s.angle * Math.PI) / 180;
          const radius = 165;
          const x = Math.cos(rad) * radius;
          const y = Math.sin(rad) * radius * 0.65;
          return (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, scale: 0.6 }}
              whileInView={{ opacity: 1, scale: 1, x, y }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ duration: 0.9, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
              className="absolute flex flex-col items-center gap-1.5"
            >
              <span
                className="flex h-9 w-9 items-center justify-center rounded-full text-[0.6rem] font-medium"
                style={{ background: `${s.color}1c`, boxShadow: `inset 0 0 0 1px ${s.color}66`, color: s.color }}
              >
                ●
              </span>
              <span className="text-[0.65rem] text-white/45">{s.label}</span>
            </motion.div>
          );
        })}
        <div className="relative z-10 flex h-24 w-24 items-center justify-center rounded-full bg-white/[0.04] ring-1 ring-white/15">
          <span className="font-display text-[1.6rem] text-white/85">B</span>
        </div>
      </div>

      <div className="relative mx-auto mt-4 max-w-5xl px-6">
        <ProductPanel
          shot="hero-09-profile"
          alt="Bloom's profile screen showing goals met, achievements, the streak and the last twelve weeks"
          url="bloom.app/profile"
          glow="blue"
          badge="Longest streak"
          badgeValue="45 days"
        />
      </div>
    </section>
  );
}
