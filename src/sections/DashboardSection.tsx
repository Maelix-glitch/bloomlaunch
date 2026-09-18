import { StorySection } from "../components/StorySection";

export function DashboardSection() {
  return (
    <StorySection
      id="dashboard"
      step="09"
      eyebrow="Converge · Dashboard"
      title={
        <>
          Your life,
          <br />
          <span className="italic text-white/60">understood as a whole.</span>
        </>
      }
      description="Mood, cycle, habits, coach and rewards — every surface of the ecosystem resolves into a single, calm view of today."
      insightLabel="Your connection map"
      insight="91% of what you track is logged. Sleep, mood and habits, visibly connected."
      side="left"
      glow="pink"
      bg="#07070a"
      shot="hero-10-dashboard"
      shotAlt="Bloom's welcome back dashboard showing goals met, streak and tracker summaries"
      route="bloom.app/today"
      badge="Goals met today"
      badgeValue="100%"
    />
  );
}
