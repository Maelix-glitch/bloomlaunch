import { StorySection } from "../components/StorySection";

export function MoodSection() {
  return (
    <StorySection
      id="mood"
      step="01"
      eyebrow="Understand · Mood"
      title={
        <>
          Feel it.
          <br />
          <span className="italic text-white/60">Understand it.</span>
        </>
      }
      description="One honest check-in a day. Bloom holds the emotional texture of your life so patterns can surface on their own — no forced positivity, no generic prompts."
      insightLabel="Mood → Data → Patterns → Insight"
      insight="Bloom doesn't just record how you feel. It learns when, why, and what tends to shift it."
      side="right"
      glow="gold"
      shot="hero-04-mood-intelligence"
      shotAlt="Bloom's mood screen showing your inner weather measured precisely, with the mood trajectory chart"
      route="bloom.app/mood"
      badge="Mood trajectory"
      badgeValue="Steady"
    />
  );
}
