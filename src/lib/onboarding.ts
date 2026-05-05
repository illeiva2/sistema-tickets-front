// Helpers compartidos para el onboarding tour. Se mantienen aca (no en
// Layout.tsx) para evitar circular imports entre el Layout y el menu de
// usuario en _shared.tsx.

import { TOUR_STORAGE_KEY } from "../constants/tourSteps";

export const ONBOARDING_REPLAY_EVENT = "onboarding:replay";

export const replayOnboardingTour = () => {
  try {
    window.localStorage.removeItem(TOUR_STORAGE_KEY);
  } catch {
    // ignore
  }
  window.dispatchEvent(new CustomEvent(ONBOARDING_REPLAY_EVENT));
};
