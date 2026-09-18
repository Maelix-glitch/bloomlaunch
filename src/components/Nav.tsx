import { useEffect, useState } from "react";
import { AnimatePresence, motion, useScroll, useTransform } from "framer-motion";
import { BloomGlyph } from "./Logo";
import { Magnetic } from "./Magnetic";

const LINKS = [
  { href: "#ecosystem", label: "Ecosystem" },
  { href: "#mood", label: "Mood" },
  { href: "#cycle", label: "Cycle" },
  { href: "#coach", label: "Coach" },
  { href: "#rewards", label: "Rewards" },
  { href: "#dashboard", label: "Dashboard" },
];

const EASE = [0.16, 1, 0.3, 1] as const;

export function Nav() {
  const [open, setOpen] = useState(false);
  const { scrollY } = useScroll();

  // The bar only gains a surface once the hero has started moving.
  const borderOpacity = useTransform(scrollY, [0, 120], [0, 1]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <motion.header className="fixed inset-x-0 top-0 z-50" initial={false}>
        <motion.div
          aria-hidden="true"
          className="absolute inset-0 border-b border-white/[0.07] bg-black/45 backdrop-blur-2xl"
          style={{ opacity: borderOpacity }}
        />
        <motion.div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/12 to-transparent"
          style={{ opacity: borderOpacity }}
        />

        <div className="relative mx-auto flex max-w-[1400px] items-center justify-between px-6 py-4 sm:px-10">
          <a href="#top" data-cursor="hover" className="group flex items-center gap-2.5">
            <motion.span
              className="inline-flex"
              whileHover={{ rotate: -6, scale: 1.06 }}
              transition={{ type: "spring", stiffness: 320, damping: 18 }}
            >
              <BloomGlyph size={26} strokeWidth={6.2} />
            </motion.span>
            <span className="font-display text-[1.12rem] tracking-tight text-white">Bloom</span>
          </a>

          <nav className="hidden items-center gap-1 lg:flex">
            {LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                data-cursor="hover"
                className="group relative rounded-full px-3.5 py-2 text-[0.82rem] font-medium text-white/55 transition-colors hover:text-white"
              >
                <span className="relative z-10">{l.label}</span>
                <span className="absolute inset-0 scale-90 rounded-full bg-white/[0.06] opacity-0 transition-all duration-300 group-hover:scale-100 group-hover:opacity-100" />
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-3 lg:flex">
            <button
              type="button"
              onClick={() => window.dispatchEvent(new Event("bloom:open-palette"))}
              data-cursor="hover"
              aria-label="Search Bloom"
              className="group flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] py-1.5 pl-3 pr-2 text-[0.78rem] text-white/45 transition-colors hover:border-white/25 hover:text-white/80"
            >
              <span>Search</span>
              <kbd className="rounded border border-white/10 bg-black/40 px-1.5 py-0.5 font-sans text-[0.6rem] tracking-wider text-white/40">
                ⌘K
              </kbd>
            </button>
            <a
              href="#cta"
              data-cursor="hover"
              className="px-2 text-[0.82rem] font-medium text-white/60 transition-colors hover:text-white"
            >
              Sign in
            </a>
            <Magnetic strength={6} hoverScale={1.04}>
              <a
                href="#cta"
                data-cursor="hover"
                className="group relative inline-flex items-center overflow-hidden rounded-full bg-white px-4 py-2 text-[0.82rem] font-medium text-black"
              >
                <span className="relative z-10">Enter Bloom</span>
                <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-[#f3e6c9] to-white transition-transform duration-500 group-hover:translate-x-0" />
              </a>
            </Magnetic>
          </div>

          <button
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            className="flex h-10 w-10 flex-col items-center justify-center gap-[5px] rounded-full border border-white/15 text-white transition-colors hover:border-white/30 lg:hidden"
            onClick={() => setOpen((v) => !v)}
          >
            <motion.span
              className="block h-px w-4 bg-white"
              animate={open ? { rotate: 45, y: 3 } : { rotate: 0, y: 0 }}
              transition={{ duration: 0.3, ease: EASE }}
            />
            <motion.span
              className="block h-px w-4 bg-white"
              animate={open ? { rotate: -45, y: -3 } : { rotate: 0, y: 0 }}
              transition={{ duration: 0.3, ease: EASE }}
            />
          </button>
        </div>
      </motion.header>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-40 bg-[#050506]/97 backdrop-blur-xl lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: EASE }}
          >
            <nav className="mt-24 flex flex-col gap-1 px-8">
              {LINKS.map((l, i) => (
                <motion.a
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.05 + i * 0.05, ease: EASE }}
                  className="border-b border-white/[0.06] py-4 font-display text-[1.5rem] text-white/80"
                >
                  {l.label}
                </motion.a>
              ))}
              <motion.button
                type="button"
                onClick={() => {
                  setOpen(false);
                  window.dispatchEvent(new Event("bloom:open-palette"));
                }}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4, ease: EASE }}
                className="mt-8 rounded-full border border-white/15 px-5 py-3.5 text-center text-[0.95rem] text-white/70"
              >
                Search everything
              </motion.button>
              <motion.a
                href="#cta"
                onClick={() => setOpen(false)}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.45, ease: EASE }}
                className="mt-3 rounded-full bg-white px-5 py-3.5 text-center text-[0.95rem] font-medium text-black"
              >
                Enter Bloom
              </motion.a>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
