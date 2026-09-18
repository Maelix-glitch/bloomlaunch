import { motion } from "framer-motion";
import { Eyebrow, Reveal, staggerContainer, staggerItem } from "../components/Reveal";

const SWATCHES = [
  { name: "Dusk", from: "#8d7bf2", to: "#3a2f6d" },
  { name: "Ember", from: "#e8b158", to: "#6b3d1c" },
  { name: "Moss", from: "#7fb88f", to: "#233a2a" },
  { name: "Rosewood", from: "#e191b3", to: "#4a2432" },
];

export function AtelierSection() {
  return (
    <section id="atelier" className="relative overflow-hidden bg-[#050506] py-28 sm:py-36">
      <div className="mx-auto grid max-w-[1200px] items-center gap-16 px-6 lg:grid-cols-2 lg:px-10">
        <div className="order-2 lg:order-1">
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.3 }}
            className="grid grid-cols-2 gap-5"
          >
            {SWATCHES.map((s) => (
              <motion.div
                key={s.name}
                variants={staggerItem}
                whileHover={{ y: -8 }}
                className="flex h-40 flex-col justify-end rounded-2xl border border-white/10 p-5"
                style={{ background: `linear-gradient(155deg, ${s.from}, ${s.to})` }}
              >
                <span className="text-[0.85rem] font-medium text-white/90">{s.name}</span>
              </motion.div>
            ))}
          </motion.div>
        </div>

        <div className="order-1 lg:order-2">
          <Reveal>
            <Eyebrow accent="from-[#c9a6f2] to-[#e191b3]">Express · Atelier</Eyebrow>
            <h2 className="mt-5 font-display text-[2.2rem] leading-[1.15] text-white sm:text-[2.7rem]">
              Bloom isn't only
              <br />
              <span className="italic text-white/60">measurement.</span>
            </h2>
            <p className="mt-5 max-w-md text-[0.98rem] leading-relaxed text-white/55">
              Atelier is where the ecosystem becomes yours — palettes, themes, and personal
              touches that shape how Bloom feels every time you open it.
            </p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
