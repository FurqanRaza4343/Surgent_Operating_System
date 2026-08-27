import { useEffect, useState } from "react";
import type { OnboardingState, OnboardingStepId } from "./types";

const STORAGE_KEY = "aesthetixai_onboarding_state";

const DEFAULT_STATE: OnboardingState = { completedSteps: [], dismissed: false };

function load(): OnboardingState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULT_STATE, ...JSON.parse(raw) } : DEFAULT_STATE;
  } catch {
    return DEFAULT_STATE;
  }
}

// Tracks wizard progress so it's resumable, not a one-shot flow — same
// localStorage-backed pattern as profile/usePracticeProfile.ts.
export function useOnboardingState() {
  const [state, setState] = useState<OnboardingState>(() => load());

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore — private mode / storage disabled
    }
  }, [state]);

  const completeStep = (step: OnboardingStepId) => {
    setState((s) => ({ ...s, completedSteps: s.completedSteps.includes(step) ? s.completedSteps : [...s.completedSteps, step] }));
  };

  const dismiss = () => setState((s) => ({ ...s, dismissed: true }));

  return { state, completeStep, dismiss };
}
