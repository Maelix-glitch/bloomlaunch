import { useMotionPreference } from "./useMotionPreference";

/**
 * True when the site should hold motion still.
 *
 * Folds in the visitor's explicit override, so a reduced-motion visitor who
 * asks for the hero sequence also gets the rest of the site's motion back —
 * and every existing call site keeps working unchanged.
 */
export function useReducedMotion(): boolean {
  return !useMotionPreference().playing;
}
