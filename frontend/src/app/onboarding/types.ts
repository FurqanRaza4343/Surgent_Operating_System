export type OnboardingStepId = "practice" | "doctor" | "channels";

export interface OnboardingState {
  completedSteps: OnboardingStepId[];
  dismissed: boolean; // wizard skipped entirely
}
