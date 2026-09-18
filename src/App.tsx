import { useState } from "react";
import { Cursor } from "./components/Cursor";
import { ScrollProgress } from "./components/ScrollProgress";
import { Preloader } from "./components/Preloader";
import { Nav } from "./components/Nav";
import { Hero } from "./components/Hero";
import { EcosystemOrbit } from "./components/EcosystemOrbit";
import { StoryPath } from "./components/StoryPath";
import { MoodSection } from "./sections/MoodSection";
import { CycleSection } from "./sections/CycleSection";
import { HabitsSection } from "./sections/HabitsSection";
import { TrackersSection } from "./sections/TrackersSection";
import { CoachSection } from "./sections/CoachSection";
import { RewardsSection } from "./sections/RewardsSection";
import { ChampionshipSection } from "./sections/ChampionshipSection";
import { AtelierSection } from "./sections/AtelierSection";
import { ProfileSection } from "./sections/ProfileSection";
import { DashboardSection } from "./sections/DashboardSection";
import { EcosystemFinale } from "./sections/EcosystemFinale";
import { FinalCTA } from "./sections/FinalCTA";
import { Footer } from "./sections/Footer";

export default function App() {
  const [entered, setEntered] = useState(false);

  return (
    <div id="top" className="relative bg-[#050506]">
      <Cursor />
      <ScrollProgress />
      <Preloader onDone={() => setEntered(true)} />

      <div
        style={{ opacity: entered ? 1 : 0, transition: "opacity 0.9s cubic-bezier(0.16,1,0.3,1)" }}
        aria-hidden={!entered}
      >
        <Nav />
        <main>
          <Hero />
          <EcosystemOrbit />
          <StoryPath />
          <MoodSection />
          <CycleSection />
          <HabitsSection />
          <TrackersSection />
          <CoachSection />
          <RewardsSection />
          <ChampionshipSection />
          <AtelierSection />
          <ProfileSection />
          <DashboardSection />
          <EcosystemFinale />
          <FinalCTA />
        </main>
        <Footer />
      </div>
    </div>
  );
}
