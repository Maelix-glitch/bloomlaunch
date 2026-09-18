import { useState } from "react";
import { CommandPalette } from "./components/CommandPalette";
import { Gate } from "./components/Gate";
import { useGate } from "./hooks/useGate";
import { Cursor } from "./components/Cursor";
import { ScrollProgress } from "./components/ScrollProgress";
import { Preloader } from "./components/Preloader";
import { Nav } from "./components/Nav";
import { Hero } from "./components/Hero";
import { NavCountdown } from "./components/NavCountdown";
import { BriefGallery } from "./sections/BriefGallery";
import { EcosystemOrbit } from "./components/EcosystemOrbit";
import { LaunchCountdown } from "./sections/LaunchCountdown";
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
  const gate = useGate();

  // The site stands behind the gate until the 24-hour window closes. It is
  // mounted underneath the whole time — so the hero's frames are warm by the
  // moment it is revealed — but sealed: hidden, inert, and unscrollable.
  const sealed = gate.locked;
  const revealed = entered && !sealed;
  // A visitor who waited at the gate gets the cinematic hand-off: a long
  // fade while the site settles from a slight push-in. First-time reveals
  // after the preloader keep the shorter fade they always had.
  const [wasSealed] = useState(() => gate.locked);
  const revealStyle = wasSealed
    ? {
        opacity: revealed ? 1 : 0,
        transform: revealed ? "scale(1)" : "scale(1.035)",
        transition:
          "opacity 3.2s cubic-bezier(0.16,1,0.3,1), transform 4.2s cubic-bezier(0.16,1,0.3,1)",
      }
    : {
        opacity: revealed ? 1 : 0,
        transition: "opacity 0.9s cubic-bezier(0.16,1,0.3,1)",
      };

  return (
    <div id="top" className="relative bg-[#050506]">
      <Cursor />
      <ScrollProgress />
      {!sealed && <CommandPalette />}
      <Preloader onDone={() => setEntered(true)} />
      <Gate />

      <div
        style={revealStyle}
        aria-hidden={!revealed}
        inert={sealed}
      >
        <Nav />
        <NavCountdown />
        <main>
          <Hero />
          {/* The countdown is the ceremony; once it is over, its screen
              disappears and the site reads as the product it launched. */}
          {!gate.open && <LaunchCountdown />}
          <BriefGallery />
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
