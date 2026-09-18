import { useSyncExternalStore } from "react";
import { frameSequence, type LoaderStatus } from "../lib/frameSequence";

/** Live loading state of the hero frame sequence, shared app-wide. */
export function useFrameSequenceStatus(): LoaderStatus {
  return useSyncExternalStore(
    (onChange) => frameSequence.subscribe(onChange),
    () => frameSequence.status,
    () => frameSequence.status
  );
}
