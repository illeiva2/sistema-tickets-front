import React, { useState } from "react";
import { useTheme } from "../contexts/ThemeContext";
import QuietProLayout from "./layouts/QuietProLayout";
import WorkshopLayout from "./layouts/WorkshopLayout";
import CommandPalette from "./CommandPalette";
import PinnedModalAnnouncements from "./PinnedModalAnnouncements";
import OnboardingTour from "./OnboardingTour";
import { ONBOARDING_STEPS, TOUR_STORAGE_KEY } from "../constants/tourSteps";
import { ONBOARDING_REPLAY_EVENT } from "../lib/onboarding";

// Wrapper que ramifica al layout adecuado segun el theme activo.
const Layout: React.FC = () => {
  const { theme } = useTheme();
  const [tourForce, setTourForce] = useState(0);

  React.useEffect(() => {
    const handler = () => setTourForce((n) => n + 1);
    window.addEventListener(ONBOARDING_REPLAY_EVENT, handler);
    return () => window.removeEventListener(ONBOARDING_REPLAY_EVENT, handler);
  }, []);

  return (
    <>
      {theme === "workshop" ? <WorkshopLayout /> : <QuietProLayout />}
      <CommandPalette />
      <PinnedModalAnnouncements />
      {/* key cambia cuando se replay para remontar y forzar visibilidad */}
      <OnboardingTour
        key={tourForce}
        steps={ONBOARDING_STEPS}
        storageKey={TOUR_STORAGE_KEY}
        forceShow={tourForce > 0}
      />
    </>
  );
};

export default Layout;
