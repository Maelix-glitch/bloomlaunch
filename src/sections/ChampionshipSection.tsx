import { motion } from "framer-motion";
import { Eyebrow, Reveal } from "../components/Reveal";

export function ChampionshipSection() {
  const total = 45;
  const filled = 31;

  return (
    <section id="championship" className="relative overflow-hidden bg-[#050506] py-28 sm:py-36">
      <div className="mx-auto grid max-w-[1200px] items-center gap-16 px-6 lg:grid-cols-2 lg:px-10">
        <Reveal>
          <div className="flex items-center gap-4">
            <span className="font-display text-[0.9rem] text-white/25 tabular-nums">07</span>
            <Eyebrow accent="from-[#e8b158] to-[#e191b3]">Progress · Championship</Eyebrow>
          </div>
          <h2 className="mt-5 font-display text-[2.2rem] leading-[1.15] text-white sm:text-[2.7rem]">
            A 45-day arc,
            <br />
            <span className="italic text-white/60">built for real change.</span>
          </h2>
          <p className="mt-5 max-w-md text-[0.98rem] leading-relaxed text-white/55">
            Bloom's longer challenges give your habits room to compound — long enough to matter,
            short enough to finish. Each day logged strengthens the arc.
          </p>
          <div className="mt-7 flex gap-10 border-t border-white/10 pt-5">
            <div>
              <p className="text-[1.6rem] text-white">31</p>
              <p className="text-[0.68rem] uppercase tracking-widest text-white/35">Days complete</p>
            </div>
            <div>
              <p className="text-[1.6rem] text-white">14</p>
              <p className="text-[0.68rem] uppercase tracking-widest text-white/35">Days remaining</p>
            </div>
            <div>
              <p className="text-[1.6rem] text-[#e8b158]">69%</p>
              <p className="text-[0.68rem] uppercase tracking-widest text-white/35">Arc progress</p>
            </div>
          </div>
        </Reveal>

        <div className="perspective-dramatic relative flex items-center justify-center">
          <div className="relative flex h-72 w-72 items-center justify-center sm:h-80 sm:w-80">
            <svg viewBox="0 0 200 200" className="absolute h-full w-full -rotate-90">
              <circle cx="100" cy="100" r="88" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="2" />
              {Array.from({ length: total }).map((_, i) => {
                const angle = (360 / total) * i;
                const rad = (angle * Math.PI) / 180;
                const r1 = 82;
                const r2 = 94;
                const x1 = 100 + r1 * Math.cos(rad);
                const y1 = 100 + r1 * Math.sin(rad);
                const x2 = 100 + r2 * Math.cos(rad);
                const y2 = 100 + r2 * Math.sin(rad);
                return (
                  <motion.line
                    key={i}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke={i < filled ? "#e8b158" : "rgba(255,255,255,0.1)"}
                    strokeWidth="3"
                    strokeLinecap="round"
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.015, duration: 0.4 }}
                  />
                );
              })}
            </svg>
            <div className="absolute h-40 w-40 animate-breathe rounded-full bg-[radial-gradient(circle,rgba(232,177,88,0.22),transparent_70%)]" />
            <div className="flex flex-col items-center">
              <span className="font-display text-[3.2rem] text-white">31</span>
              <span className="text-[0.7rem] uppercase tracking-[0.25em] text-white/40">of 45 days</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
