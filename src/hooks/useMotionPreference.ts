import { useCallback, useEffect, useState } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";
const STORAGE_KEY = "bloom:motion";

type Preference = "auto" | "play" | "reduce";

function readStored(): Preference {
  if (typeof window === "undefined") return "auto";
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value === "play" || value === "reduce" ? value : "auto";
  } catch {
    return "auto";
  }
}

function readReduced(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia(QUERY).matches;
}

export type MotionPreference = {
  /** the operating system asks for reduced motion */
  reduced: boolean;
  /** the hero sequence should play and scrub */
  playing: boolean;
  /** the visitor has overridden the system setting in either direction */
  overridden: boolean;
  setPreference: (preference: Preference) => void;
  /** convenience toggles */
  play: () => void;
  reduce: () => void;
};

/**
 * Resolves whether the hero animation should run.
 *
 * The operating system's reduce-motion setting is honoured by default — but a
 * visitor who has it on (often without knowing, since macOS and Windows both
 * enable it during setup) still gets an explicit way to ask for the sequence.
 * The choice is remembered, so it survives reloads.
 */
export function useMotionPreference(): MotionPreference {
  const [reduced, setReduced] = useState(readReduced);
  const [preference, setPreferenceState] = useState<Preference>(readStored);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia(QUERY);
    const handler = (event: MediaQueryListEvent) => setReduced(event.matches);
    setReduced(mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const setPreference = useCallback((next: Preference) => {
    setPreferenceState(next);
    try {
      if (next === "auto") window.localStorage.removeItem(STORAGE_KEY);
      else window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* storage blocked — the setting simply won't persist */
    }
  }, []);

  // Apply the override to the document so decorative CSS animation honours it too.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("force-motion", preference === "play");
    root.classList.toggle("force-still", preference === "reduce");
  }, [preference]);

  const playing =
    preference === "play" ? true : preference === "reduce" ? false : !reduced;

  return {
    reduced,
    playing,
    overridden: preference !== "auto",
    setPreference,
    play: useCallback(() => setPreference("play"), [setPreference]),
    reduce: useCallback(() => setPreference("reduce"), [setPreference]),
  };
}
