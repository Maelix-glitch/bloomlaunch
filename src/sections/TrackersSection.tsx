import { StorySection } from "../components/StorySection";

export function TrackersSection() {
  return (
    <StorySection
      id="trackers"
      step="04"
      eyebrow="Discover · Trackers"
      title={
        <>
          The measurable
          <br />
          <span className="italic text-white/60">side of you.</span>
        </>
      }
      description="Sleep, water, study, movement, energy, screen time — six signals, measured daily against goals you set. No estimates. No filling in blanks."
      insightLabel="Daily → Weekly → Monthly → Long term"
      insight="Every reading compounds — today's ring becomes this month's line, becomes your longest streak."
      side="right"
      glow="green"
      shot="hero-05-trackers"
      shotAlt="Bloom's trackers screen with daily metrics at a glance"
      route="bloom.app/trackers"
      badge="Metrics logged"
      badgeValue="6 / 6"
    />
  );
}
