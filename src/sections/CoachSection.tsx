import { motion } from "framer-motion";
import { Eyebrow, Reveal } from "../components/Reveal";
import { BloomGlyph } from "../components/Logo";
import { ProductPanel } from "../components/ProductPanel";

const STREAMS = [
  { label: "Mood", color: "#e5867e" },
  { label: "Cycle", color: "#8d7bf2" },
  { label: "Habits", color: "#7fb88f" },
  { label: "Trackers", color: "#5b8ff2" },
  { label: "Goals", color: "#e8b158" },
];

export function CoachSection() {
  return (
    <section id="coach" className="relative overflow-hidden bg-[#050506] py-28 sm:py-36">
      <div className="mx-auto max-w-3xl px-6 text-center">
        <Reveal>
          <div className="flex items-center justify-center gap-4">
            <span className="font-display text-[0.9rem] text-white/25 tabular-nums">05</span>
            <Eyebrow accent="from-[#8d7bf2] to-[#e8b158]">Guidance · Bloom Coach</Eyebrow>
          </div>
          <h2 className="mt-5 font-display text-[2.3rem] leading-tight text-white sm:text-[3rem]">
            Not a chatbot.
            <br />
            <span className="italic text-white/60">An intelligence that knows your record.</span>
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-[0.98rem] text-white/50">
            Coach reads across mood, cycle, habits, trackers and goals to answer real questions
            with evidence — not generic advice.
          </p>
        </Reveal>
      </div>

      <div className="relative mx-auto mt-16 flex h-56 max-w-3xl items-center justify-center sm:h-64">
        {STREAMS.map((s, i) => {
          const angle = (360 / STREAMS.length) * i;
          const radius = 150;
          const x = Math.cos((angle * Math.PI) / 180) * radius;
          const y = Math.sin((angle * Math.PI) / 180) * radius * 0.55;
          return (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, x, y: y - 20 }}
              whileInView={{ opacity: 1, x: [x, 0], y: [y, 0] }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ duration: 1.6, delay: i * 0.15, ease: [0.16, 1, 0.3, 1] }}
              className="absolute flex flex-col items-center gap-1.5"
            >
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color, boxShadow: `0 0 16px ${s.color}` }} />
              <span className="text-[0.68rem] uppercase tracking-widest text-white/40">{s.label}</span>
            </motion.div>
          );
        })}
        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          whileInView={{ scale: 1, opacity: 1 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 1, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 flex h-20 w-20 items-center justify-center rounded-full bg-[#0c0d11] ring-1 ring-[#e8b158]/40"
        >
          <div className="absolute h-28 w-28 animate-breathe rounded-full bg-[radial-gradient(circle,rgba(232,177,88,0.3),transparent_70%)]" />
          <BloomGlyph size={38} strokeWidth={9} />
        </motion.div>
      </div>

      <div className="mx-auto mt-16 max-w-5xl px-6">
        <ProductPanel
          shot="hero-06-coach"
          alt="Bloom Coach reading across mood, cycle, habits, trackers and goals to answer a question"
          url="bloom.app/coach"
          glow="gold"
          maxTilt={4}
          badge="Coach"
          badgeValue="Grounded in your record"
        />
      </div>
    </section>
  );
}
