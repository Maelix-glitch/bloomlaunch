import { CountdownLine } from "../components/CountdownLine";
import { BloomGlyph } from "../components/Logo";

const COLUMNS = [
  {
    title: "Product",
    links: [
      { label: "Mood", href: "#mood" },
      { label: "Cycle", href: "#cycle" },
      { label: "Trackers", href: "#trackers" },
      { label: "Coach", href: "#coach" },
      { label: "Rewards", href: "#rewards" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "#top" },
      { label: "Atelier", href: "#atelier" },
      { label: "Contact", href: "#top" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy", href: "#top" },
      { label: "Terms", href: "#top" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="relative border-t border-white/[0.06] bg-[#050506] px-6 py-16 sm:px-10">
      <div className="mx-auto flex max-w-[1300px] flex-col gap-12 lg:flex-row lg:justify-between">
        <div className="max-w-xs">
          <div className="flex items-center gap-2.5">
            <BloomGlyph size={24} strokeWidth={6} />
            <span className="font-display text-[1.1rem] text-white">Bloom</span>
          </div>
          <p className="mt-4 text-[0.85rem] leading-relaxed text-white/40">
            A calmer you, a brighter tomorrow.
          </p>
          <CountdownLine variant="pill" className="mt-5" />
        </div>

        <div className="grid grid-cols-3 gap-10 sm:gap-16">
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <p className="text-[0.7rem] uppercase tracking-[0.2em] text-white/35">{col.title}</p>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <a href={l.href} className="text-[0.85rem] text-white/55 transition-colors hover:text-white">
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="mx-auto mt-14 flex max-w-[1300px] flex-col items-center justify-between gap-4 border-t border-white/[0.06] pt-6 text-[0.75rem] text-white/30 sm:flex-row">
        <span>© {new Date().getFullYear()} Bloom. All rights reserved.</span>
        <span>Designed to feel like an ecosystem, not an app.</span>
      </div>
    </footer>
  );
}
