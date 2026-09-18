import { StorySection } from "../components/StorySection";

export function CycleSection() {
  return (
    <StorySection
      id="cycle"
      step="02"
      eyebrow="Discover · Cycle"
      title={
        <>
          Recurring patterns,
          <br />
          <span className="italic text-white/60">read in advance.</span>
        </>
      }
      description="Every cycle you log sharpens the prediction. Phase, timing, and what tends to help — recalculated the moment your record changes, never assumed."
      insightLabel="Time · Cycles · Progress"
      insight="A 28.3-day average, held with 100% steadiness across five logged cycles — from your data alone."
      side="left"
      glow="violet"
      bg="#07070a"
      shot="hero-02-cycle"
      shotAlt="Bloom's cycle screen showing the day's phase, average cycle length and logged history"
      route="bloom.app/cycle"
      badge="Average cycle"
      badgeValue="28.3 days"
    />
  );
}
