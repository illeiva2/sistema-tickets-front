import React, { useState } from "react";
import { useTheme, DEFAULT_THEME } from "../contexts/ThemeContext";
import { useAuth } from "../hooks";
import QuietProLayout from "./layouts/QuietProLayout";
import WorkshopLayout from "./layouts/WorkshopLayout";
import CommandPalette from "./CommandPalette";
import PinnedModalAnnouncements from "./PinnedModalAnnouncements";
import OnboardingTour from "./OnboardingTour";
import { ONBOARDING_STEPS, TOUR_STORAGE_KEY } from "../constants/tourSteps";
import { ONBOARDING_REPLAY_EVENT } from "../lib/onboarding";

// Wrapper que ramifica al layout adecuado segun el theme activo.
const Layout: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();
  const [tourForce, setTourForce] = useState(0);

  // "dystopia" es exclusivo de AGENT/ADMIN. Si un USER lo tiene persistido
  // en localStorage (ej: cuenta degradada o storage compartido), lo
  // devolvemos al default. setTheme tambien reescribe localStorage, asi
  // que el anti-flash de index.html deja de aplicarlo en proximas cargas.
  React.useEffect(() => {
    if (user?.role === "USER" && theme === "dystopia") {
      setTheme(DEFAULT_THEME);
    }
  }, [user?.role, theme, setTheme]);

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
