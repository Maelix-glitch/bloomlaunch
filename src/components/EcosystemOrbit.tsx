import { Eyebrow, Reveal } from "./Reveal";
import { LivingMap } from "./LivingMap";

/**
 * The ecosystem as a living system rather than a diagram.
 *
 * Nine surfaces orbit the mark in real 3D, particles stream along the
 * connections, the whole field turns with scroll and bends toward the pointer.
 * See LivingMap for the rendering; this section is the framing.
 */
export function EcosystemOrbit() {
  return (
    <section id="ecosystem" className="relative overflow-hidden bg-[#050506] py-32 sm:py-40">
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

      <div className="relative mt-16">
        <LivingMap />
      </div>
    </section>
  );
}
