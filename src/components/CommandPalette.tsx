import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BloomGlyph } from "./Logo";
import { searchItems, type Searchable } from "../lib/search";
import { useCountdown } from "../hooks/useCountdown";
import { formatClock } from "../lib/countdown";
import { acquireScrollLock } from "../lib/scrollLock";

type Command = Searchable & {
  href: string;
  hint: string;
  group: "Surfaces" | "Actions";
  keywords: string;
};

const COMMANDS: Command[] = [
  { id: "dashboard", title: "Dashboard", group: "Surfaces", href: "#dashboard", hint: "Your whole life, one calm view", keywords: "today home overview connection map" },
  { id: "mood", title: "Mood", group: "Surfaces", href: "#mood", hint: "One honest check-in a day", keywords: "feel emotion check in weather" },
  { id: "cycle", title: "Cycle", group: "Surfaces", href: "#cycle", hint: "Recurring patterns, read in advance", keywords: "phase period prediction average" },
  { id: "habits", title: "Habits", group: "Surfaces", href: "#habits", hint: "Small actions, compounded", keywords: "streak routine consistency daily" },
  { id: "trackers", title: "Trackers", group: "Surfaces", href: "#trackers", hint: "Six signals, measured daily", keywords: "sleep water study movement energy screen metrics" },
  { id: "coach", title: "Coach", group: "Surfaces", href: "#coach", hint: "Guidance that knows your record", keywords: "advice guidance intelligence assistant" },
  { id: "rewards", title: "Rewards", group: "Surfaces", href: "#rewards", hint: "Milestones worth keeping", keywords: "tokens badges bronze silver gold platinum points" },
  { id: "championship", title: "Championship", group: "Surfaces", href: "#championship", hint: "A 45-day arc, built to finish", keywords: "challenge progress arc 45 day" },
  { id: "atelier", title: "Atelier", group: "Surfaces", href: "#atelier", hint: "The ecosystem, made yours", keywords: "themes palettes colours customise design" },
  { id: "profile", title: "Profile", group: "Surfaces", href: "#profile", hint: "You, at the centre of your record", keywords: "identity achievements goals insights account" },
  { id: "launch", title: "Launch countdown", group: "Actions", href: "#launch", hint: "Live, to the hundredth", keywords: "launch countdown timer opens live date time calendar premiere" },
  { id: "tour", title: "Tour the ecosystem", group: "Actions", href: "#ecosystem", hint: "See how all nine connect", keywords: "map living orbit explore" },
  { id: "brief", title: "The brief", group: "Actions", href: "#brief", hint: "What Bloom is, in one orbit", keywords: "about gallery overview intro mist bloom" },
  { id: "story", title: "How it works", group: "Actions", href: "#story", hint: "The eight-step arc", keywords: "steps understand track discover improve" },
  { id: "top", title: "Back to the top", group: "Actions", href: "#top", hint: "Replay the sequence", keywords: "home start scroll up beginning" },
];

const EASE = [0.16, 1, 0.3, 1] as const;

/** Highlights the characters that matched, so results explain themselves. */
function Highlight({ text, positions }: { text: string; positions: number[] }) {
  if (!positions.length) return <>{text}</>;
  const set = new Set(positions);
  return (
    <>
      {text.split("").map((char, i) => (
        <span key={i} className={set.has(i) ? "text-[#e8b158]" : undefined}>
          {char}
        </span>
      ))}
    </>
  );
}

/**
 * ⌘K / Ctrl+K command palette.
 *
 * The whole site is addressable from the keyboard — nine surfaces, plus the
 * actions. It is the fastest way to prove the product is real, and it costs
 * nothing on a page with no backend.
 */
export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Ticking only while open: a closed palette should cost the page nothing.
  const countdown = useCountdown({ precision: "seconds", enabled: open });
  const launchClock = countdown.live ? "Live now" : formatClock(countdown.remaining.total);

  const results = useMemo(() => searchItems(query, COMMANDS, 12), [query]);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setCursor(0);
  }, []);

  const run = useCallback(
    (href: string) => {
      close();
      // Let the dialog unmount before the page starts moving.
      requestAnimationFrame(() => {
        document.querySelector(href)?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    },
    [close]
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const isToggle = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k";
      if (isToggle) {
        event.preventDefault();
        setOpen((value) => {
          if (value) setQuery("");
          return !value;
        });
        return;
      }
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Global shortcut hook so the nav button can open it too.
  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener("bloom:open-palette", onOpen);
    return () => window.removeEventListener("bloom:open-palette", onOpen);
  }, []);

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => inputRef.current?.focus(), 40);
    const releaseScrollLock = acquireScrollLock();
    return () => {
      clearTimeout(timer);
      releaseScrollLock();
    };
  }, [open]);

  useEffect(() => {
    setCursor(0);
  }, [query]);

  // Keep the highlighted row in view while arrowing through results.
  useEffect(() => {
    if (!open) return;
    const node = listRef.current?.querySelector<HTMLElement>(`[data-index="${cursor}"]`);
    node?.scrollIntoView({ block: "nearest" });
  }, [cursor, open]);

  const onInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setCursor((c) => (results.length ? (c + 1) % results.length : 0));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setCursor((c) => (results.length ? (c - 1 + results.length) % results.length : 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const result = results[cursor];
      if (result) run(result.item.href);
    }
  };

  // Group results while preserving rank order within each group.
  const groups = useMemo(() => {
    const map = new Map<string, typeof results>();
    for (const result of results) {
      const list = map.get(result.item.group) ?? [];
      list.push(result);
      map.set(result.item.group, list);
    }
    return [...map.entries()];
  }, [results]);

  let flatIndex = -1;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[90] flex items-start justify-center px-4 pt-[12vh] sm:pt-[16vh]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
        >
          <button
            aria-label="Close search"
            className="absolute inset-0 cursor-default bg-black/70 backdrop-blur-md"
            onClick={close}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Search Bloom"
            className="relative w-full max-w-[620px] overflow-hidden rounded-2xl border border-white/[0.1] bg-[#0a0b0f]/95 shadow-[0_50px_140px_-30px_rgba(0,0,0,0.95)] backdrop-blur-2xl"
            initial={{ opacity: 0, y: -14, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ duration: 0.3, ease: EASE }}
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-white/[0.05] to-transparent" />

            <div className="relative flex items-center gap-3 border-b border-white/[0.07] px-5 py-4">
              <BloomGlyph size={20} strokeWidth={6.5} />
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={onInputKeyDown}
                placeholder="Search surfaces and actions…"
                aria-label="Search"
                className="min-w-0 flex-1 bg-transparent text-[0.95rem] text-white placeholder:text-white/30 focus:outline-none"
              />
              <kbd className="hidden rounded border border-white/10 bg-white/[0.04] px-1.5 py-0.5 font-sans text-[0.6rem] uppercase tracking-wider text-white/35 sm:block">
                esc
              </kbd>
            </div>

            <div ref={listRef} className="max-h-[52vh] overflow-y-auto overscroll-contain px-2 py-2">
              {results.length === 0 && (
                <p className="px-4 py-8 text-center text-[0.85rem] text-white/35">
                  Nothing matches “{query}”.
                </p>
              )}

              {groups.map(([group, items]) => (
                <div key={group} className="mb-1">
                  <p className="px-3 pb-1 pt-3 text-[0.6rem] uppercase tracking-[0.24em] text-white/25">
                    {group}
                  </p>
                  {items.map((result) => {
                    flatIndex += 1;
                    const index = flatIndex;
                    const active = index === cursor;
                    return (
                      <button
                        key={result.item.id}
                        data-index={index}
                        onMouseEnter={() => setCursor(index)}
                        onClick={() => run(result.item.href)}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors"
                        style={{ background: active ? "rgba(255,255,255,0.06)" : "transparent" }}
                      >
                        <span
                          className="h-1.5 w-1.5 shrink-0 rounded-full transition-colors"
                          style={{ background: active ? "#e8b158" : "rgba(255,255,255,0.15)" }}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[0.88rem] text-white/85">
                            <Highlight text={result.item.title} positions={result.positions} />
                          </span>
                          <span className="block truncate text-[0.75rem] text-white/35">
                            {result.item.id === "launch"
                              ? `${launchClock} — the doors open`
                              : result.item.hint}
                          </span>
                        </span>
                        <span
                          className="shrink-0 text-[0.7rem] text-white/25 transition-transform"
                          style={{ transform: active ? "translateX(0)" : "translateX(-4px)", opacity: active ? 1 : 0 }}
                        >
                          ↵
                        </span>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between border-t border-white/[0.07] px-5 py-2.5 text-[0.62rem] text-white/25">
              <span className="flex items-center gap-3">
                <span className="flex items-center gap-1.5">
                  <kbd className="rounded border border-white/10 px-1.5 py-0.5">↑↓</kbd>
                  navigate
                </span>
                <span className="flex items-center gap-1.5">
                  <kbd className="rounded border border-white/10 px-1.5 py-0.5">↵</kbd>
                  open
                </span>
              </span>
              <span>Bloom</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
