import { motion } from "framer-motion";
import { Eyebrow, Reveal, staggerContainer, staggerItem } from "../components/Reveal";
import { ProductPanel } from "../components/ProductPanel";
import { TiltCard } from "../components/TiltCard";

const HABITS = [
  { label: "Meditation", glyph: "◍", color: "#8d7bf2" },
  { label: "Journaling", glyph: "▤", color: "#e8b158" },
  { label: "Exercise", glyph: "◈", color: "#7fb88f" },
  { label: "Reading", glyph: "❖", color: "#5b8ff2" },
  { label: "Studying", glyph: "◔", color: "#7ba7d9" },
  { label: "Stillness", glyph: "◐", color: "#e191b3" },
];

export function HabitsSection() {
  return (
    <section id="habits" className="relative overflow-hidden bg-[#050506] py-28 sm:py-36">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(45%_35%_at_50%_0%,rgba(127,184,143,0.05),transparent_70%)]"
      />

      <div className="relative mx-auto max-w-3xl px-6 text-center">
        <Reveal>
          <div className="flex items-center justify-center gap-4">
            <span className="font-display text-[0.9rem] text-white/25 tabular-nums">03</span>
            <Eyebrow accent="from-[#7fb88f] to-[#c9a6f2]">Track · Habits</Eyebrow>
          </div>
          <h2 className="mt-5 font-display text-[2.3rem] leading-tight text-white sm:text-[3rem]">
            Small actions.
            <br />
            <span className="italic text-white/60">Compounded into transformation.</span>
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-[0.98rem] text-white/50">
            Consistency, not intensity. Each habit you keep becomes part of today's ring — and
            part of the pattern Coach learns from.
          </p>
        </Reveal>
      </div>

      <motion.div
        variants={staggerContainer}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.3 }}
        className="relative mx-auto mt-14 grid max-w-3xl grid-cols-3 gap-4 px-6 sm:grid-cols-6"
      >
        {HABITS.map((h) => (
          <motion.div key={h.label} variants={staggerItem} className="perspective-dramatic">
            <TiltCard max={9} depth={18} className="h-full rounded-2xl">
              <div
                data-cursor="hover"
                className="flex h-full flex-col items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.02] py-6 backdrop-blur-sm"
              >
                <span
                  className="flex h-11 w-11 items-center justify-center rounded-full text-lg"
                  style={{ color: h.color, boxShadow: `inset 0 0 0 1px ${h.color}55`, background: `${h.color}14` }}
                >
                  {h.glyph}
                </span>
                <span className="text-[0.72rem] text-white/55">{h.label}</span>
              </div>
            </TiltCard>
          </motion.div>
        ))}
      </motion.div>

      <div className="relative mx-auto mt-20 max-w-5xl px-6">
        <ProductPanel
          shot="hero-01-home"
          alt="Bloom's Today screen showing habits for the day, progress ring and the connection map"
          url="bloom.app/habits"
          glow="green"
          badge="45-day view"
          badgeValue="32 days"
        />
      </div>
    </section>
  );
}
