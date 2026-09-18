import { motion } from "framer-motion";
import { Eyebrow, Reveal, staggerContainer, staggerItem } from "../components/Reveal";
import { TiltCard } from "../components/TiltCard";
import { ProductPanel } from "../components/ProductPanel";

const TOKENS = [
  { label: "7-Day Streak", tier: "Bronze", color: "#c98a4b" },
  { label: "Full Record", tier: "Silver", color: "#c7cbd1" },
  { label: "45-Day Arc", tier: "Gold", color: "#e8b158" },
  { label: "Steady Cycle", tier: "Platinum", color: "#dfe6ea" },
];

export function RewardsSection() {
  return (
    <section
      id="rewards"
      className="relative overflow-hidden bg-gradient-to-b from-[#050506] via-[#0a0806] to-[#050506] py-28 sm:py-36"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(50%_40%_at_50%_0%,rgba(232,177,88,0.08),transparent_70%)]"
      />

      <div className="relative mx-auto max-w-3xl px-6 text-center">
        <Reveal>
          <div className="flex items-center justify-center gap-4">
            <span className="font-display text-[0.9rem] text-white/25 tabular-nums">06</span>
            <Eyebrow accent="from-[#e191b3] to-[#e8b158]">Earn · Rewards</Eyebrow>
          </div>
          <h2 className="mt-5 font-display text-[2.3rem] leading-tight text-white sm:text-[3rem]">
            Progress, made
            <br />
            <span className="italic text-white/60">worth holding onto.</span>
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-[0.98rem] text-white/50">
            Every milestone earns a collectible token — designed like something you'd actually
            want to keep, not a badge for the sake of one.
          </p>
        </Reveal>
      </div>

      <motion.div
        variants={staggerContainer}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.25 }}
        className="relative mx-auto mt-16 grid max-w-4xl grid-cols-2 gap-6 px-6 sm:grid-cols-4"
      >
        {TOKENS.map((t) => (
          <motion.div key={t.label} variants={staggerItem} className="perspective-dramatic">
            <TiltCard max={12} depth={30} className="h-full rounded-2xl">
              <div
                data-cursor="hover"
                className="flex h-full flex-col items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-8"
              >
                <div
                  className="relative flex h-20 w-20 items-center justify-center rounded-full"
                  style={{
                    background: `conic-gradient(from 180deg, ${t.color}, #14161d, ${t.color})`,
                    boxShadow: `0 12px 30px -8px ${t.color}88`,
                  }}
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#0b0c0f]">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: t.color }} />
                  </div>
                  <span className="pointer-events-none absolute inset-0 rounded-full ring-1 ring-inset ring-white/10" />
                </div>
                <div className="text-center">
                  <p className="text-[0.85rem] text-white/80">{t.label}</p>
                  <p className="mt-1 text-[0.68rem] uppercase tracking-[0.2em]" style={{ color: t.color }}>
                    {t.tier}
                  </p>
                </div>
              </div>
            </TiltCard>
          </motion.div>
        ))}
      </motion.div>

      <div className="relative mx-auto mt-20 max-w-5xl px-6">
        <ProductPanel
          shot="hero-07-rewards"
          alt="Bloom's rewards screen showing the Seedling tier and points toward the next milestone"
          url="bloom.app/rewards"
          glow="gold"
          badge="Next milestone"
          badgeValue="500 pts"
        />
      </div>
    </section>
  );
}
