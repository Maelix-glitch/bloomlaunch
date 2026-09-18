import { BloomGlyph } from "../components/Logo";
import { useReducedMotion } from "../hooks/useReducedMotion";

const BRIEF = [
  { t: "One intelligence", d: "A single mind learns you, and every surface shares what it knows." },
  { t: "Nine surfaces", d: "Home, cycle, habits, trackers, coach, rewards — one ecosystem, one bloom." },
  { t: "Mood intelligence", d: "Bloom reads the weather inside you and adapts the day to it." },
  { t: "Living cycles", d: "Plans bend around your energy, never the other way round." },
  { t: "A coach in your corner", d: "Guidance in your own tone — firm when needed, gentle always." },
  { t: "Rewards that compound", d: "Consistency becomes currency; streaks become strength." },
];

/**
 * The brief — what Bloom is, in one orbit.
 *
 * A misty little gallery: six plates of information turning slowly around
 * the mark in real 3D, like exhibits on a carousel in fog. With reduced
 * motion the carousel parks and the plates hang in a plain grid.
 */
export function BriefGallery() {
  const reduced = useReducedMotion();

  return (
    <section
      id="brief"
      className="relative overflow-hidden border-y border-white/[0.06] bg-[#0a0b0f] py-24 sm:py-32"
    >
      {/* The mist */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div
          className="absolute -left-[10%] top-[10%] h-[60%] w-[55%] rounded-full opacity-25 blur-3xl"
          style={{
            background: "radial-gradient(circle, rgba(141,123,242,0.35), transparent 70%)",
            animation: reduced ? undefined : "brief-mist 26s ease-in-out infinite alternate",
          }}
        />
        <div
          className="absolute -right-[10%] bottom-[5%] h-[65%] w-[55%] rounded-full opacity-20 blur-3xl"
          style={{
            background: "radial-gradient(circle, rgba(127,184,143,0.3), transparent 70%)",
            animation: reduced ? undefined : "brief-mist 32s ease-in-out infinite alternate-reverse",
          }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(70%_60%_at_50%_50%,transparent_30%,rgba(10,11,15,0.9)_100%)]" />
      </div>

      <div className="relative mx-auto max-w-6xl px-6 text-center">
        <p className="text-[0.62rem] uppercase tracking-[0.45em] text-[#e8b158]/70">The brief</p>
        <h2 className="mt-4 font-display text-[2rem] italic leading-tight text-white sm:text-[2.8rem]">
          What Bloom is, in one orbit.
        </h2>
        <p className="mx-auto mt-4 max-w-md text-[0.92rem] text-white/45">
          Six plates turning around the mark — the whole app, briefly.
        </p>

        {reduced ? (
          /* Parked: a plain gallery wall. */
          <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {BRIEF.map((b) => (
              <div key={b.t} className="rounded-2xl border border-white/[0.08] bg-[#0e1015]/80 p-6 text-left">
                <h3 className="font-display text-[1.05rem] text-[#f3e6c9]">{b.t}</h3>
                <p className="mt-2 text-[0.82rem] leading-relaxed text-white/45">{b.d}</p>
              </div>
            ))}
          </div>
        ) : (
          /* The carousel in the fog. */
          <div className="relative mx-auto mt-10 h-[360px] max-w-3xl" style={{ perspective: "1400px" }}>
            {/* The mark, still, at the centre of the orbit */}
            <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
              <div className="relative">
                <span
                  aria-hidden="true"
                  className="absolute inset-0 -m-8 rounded-full bg-[radial-gradient(circle,rgba(232,177,88,0.25),transparent_70%)]"
                  style={{ animation: "gate-breathe 5s ease-in-out infinite" }}
                />
                <BloomGlyph className="relative h-14 w-14" />
              </div>
            </div>

            <div style={{ transform: "rotateX(-8deg)", transformStyle: "preserve-3d" }} className="absolute inset-0">
              <div
                aria-label="Bloom, briefly: one intelligence; nine surfaces; mood intelligence; living cycles; a coach in your corner; rewards that compound."
                role="list"
                className="brief-ring absolute inset-0"
                style={{ transformStyle: "preserve-3d", animation: "brief-spin 48s linear infinite" }}
              >
                {BRIEF.map((b, i) => (
                  <div
                    key={b.t}
                    role="listitem"
                    className="brief-card absolute left-1/2 top-1/2 w-56 rounded-2xl border border-[#e8b158]/15 bg-[#0e1015]/85 p-5 text-left backdrop-blur-sm"
                    style={{
                      transform: `translate(-50%, -50%) rotateY(${i * 60}deg) translateZ(var(--brief-z)) rotateX(8deg)`,
                      boxShadow: "0 24px 60px -24px rgba(0,0,0,0.8)",
                    }}
                  >
                    <h3 className="font-display text-[1rem] text-[#f3e6c9]">{b.t}</h3>
                    <p className="mt-2 text-[0.78rem] leading-relaxed text-white/45">{b.d}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Floor mist under the carousel */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-[10%] bottom-0 h-24 rounded-[100%] bg-[radial-gradient(50%_50%_at_50%_50%,rgba(243,230,201,0.08),transparent_70%)] blur-2xl"
            />
          </div>
        )}
      </div>
    </section>
  );
}
