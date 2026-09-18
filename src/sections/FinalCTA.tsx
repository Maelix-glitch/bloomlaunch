import { useRef, useState, type FormEvent } from "react";
import { motion, useScroll, useSpring, useTransform } from "framer-motion";
import { BloomMark } from "../components/Logo";
import { RevealScale } from "../components/Reveal";
import { CountdownLine } from "../components/CountdownLine";
import { Magnetic } from "../components/Magnetic";
import { useReducedMotion } from "../hooks/useReducedMotion";

/**
 * Where whitelist signups go. Set VITE_WHITELIST_ENDPOINT (Formspree,
 * Web3Forms, a Supabase edge function — anything that takes a JSON POST)
 * and every address lands in your database. Without it, addresses are kept
 * in the visitor's own browser so the form still works end to end.
 */
const WHITELIST_ENDPOINT = (import.meta as { env?: Record<string, string | undefined> }).env?.VITE_WHITELIST_ENDPOINT;

export function FinalCTA() {
  const ref = useRef<HTMLDivElement>(null);
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "saving" | "done" | "error">("idle");

  const joinWhitelist = async (e: FormEvent) => {
    e.preventDefault();
    const value = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(value)) {
      setState("error");
      return;
    }
    setState("saving");
    try {
      if (WHITELIST_ENDPOINT) {
        const res = await fetch(WHITELIST_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: value, source: "bloom-launch", at: Date.now() }),
        });
        if (!res.ok) throw new Error("whitelist endpoint");
      } else {
        const key = "bloom:whitelist";
        const list: string[] = JSON.parse(localStorage.getItem(key) ?? "[]");
        if (!list.includes(value)) list.push(value);
        localStorage.setItem(key, JSON.stringify(list));
      }
      setState("done");
    } catch {
      setState("error");
    }
  };
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end end"] });
  const p = useSpring(scrollYProgress, { stiffness: 90, damping: 24, mass: 0.5 });

  const haloScale = useTransform(p, [0, 1], [0.8, 1.5]);
  const haloOpacity = useTransform(p, [0, 0.6, 1], [0.15, 0.5, 0.35]);
  const markY = useTransform(p, [0, 1], [36, 0]);
  const markRotate = useTransform(p, [0, 1], [-8, 0]);

  return (
    <section
      id="cta"
      ref={ref}
      className="relative flex min-h-[80vh] items-center justify-center overflow-hidden bg-[#050506] py-32"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(45%_45%_at_50%_45%,rgba(232,177,88,0.1),transparent_70%)]" />

      <RevealScale className="relative flex flex-col items-center px-6 text-center">
        <div className="relative mb-9 flex items-center justify-center">
          <motion.div
            aria-hidden="true"
            className="absolute h-32 w-32 rounded-full bg-[radial-gradient(circle,rgba(232,177,88,0.3),transparent_70%)]"
            style={reduced ? undefined : { scale: haloScale, opacity: haloOpacity }}
          />
          <motion.div style={reduced ? undefined : { y: markY, rotate: markRotate }}>
            <BloomMark size={64} />
          </motion.div>
        </div>

        <h2 className="font-display text-[2.6rem] italic leading-tight text-white sm:text-[3.6rem]">
          Ready to bloom?
        </h2>
        <p className="mt-5 max-w-sm text-[0.98rem] text-white/50">
          Be the first to test Bloom. Your life, understood, guided, and gently kept — one ecosystem away.
        </p>

        <CountdownLine className="mt-7" label="Doors open in" />

        <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
          <form onSubmit={joinWhitelist} className="flex w-full max-w-md flex-col items-stretch gap-3 sm:flex-row">
            <label className="sr-only" htmlFor="whitelist-email">Your email</label>
            <input
              id="whitelist-email"
              type="email"
              required
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (state !== "idle") setState("idle");
              }}
              placeholder="you@somewhere.com"
              className="w-full flex-1 rounded-full border border-white/15 bg-white/[0.04] px-6 py-3.5 text-[0.9rem] text-white placeholder-white/25 outline-none backdrop-blur-sm transition-colors focus:border-[#e8b158]/60"
            />
            <Magnetic strength={10}>
              <button
                type="submit"
                data-cursor="hover"
                disabled={state === "saving"}
                className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full bg-white px-8 py-3.5 text-[0.9rem] font-medium text-black transition-shadow hover:shadow-[0_20px_60px_-14px_rgba(232,177,88,0.6)] disabled:opacity-60"
              >
                <span className="relative z-10">{state === "saving" ? "Adding you…" : "Get whitelist"}</span>
                <span className="relative z-10 transition-transform duration-300 group-hover:translate-x-0.5">→</span>
                <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-[#f3e6c9] to-white transition-transform duration-500 group-hover:translate-x-0" />
              </button>
            </Magnetic>
          </form>
          <p className="mt-3 min-h-[1.2em] text-[0.72rem] tracking-[0.08em] text-white/40" role="status">
            {state === "done"
              ? "You're on the list — we'll write to you first."
              : state === "error"
                ? "That address doesn't look right — try again?"
                : "One email at launch. Nothing else, ever."}
          </p>
          <a
            href="#ecosystem"
            data-cursor="hover"
            className="inline-flex items-center rounded-full border border-white/20 px-7 py-3.5 text-[0.9rem] font-medium text-white/80 backdrop-blur-sm transition-colors hover:border-white/40 hover:text-white"
          >
            Tour the ecosystem
          </a>
        </div>

        <p className="mt-8 text-[0.65rem] uppercase tracking-[0.32em] text-white/25">
          Nine surfaces · One intelligence
        </p>
      </RevealScale>
    </section>
  );
}
