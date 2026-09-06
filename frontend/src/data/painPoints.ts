// PainPointStats.tsx — supports the hero's missed-calls hook (scene 1 of
// CinematicHero) with real, externally-sourced numbers. Deliberately NOT
// framed as Aiaceone's own results — these are industry research findings,
// carrying a visible, checkable source per stat so nothing here reads as a
// fabricated or unqualified claim.
export interface PainPointStat {
  stat: string;
  label: string;
  source: string;
  sourceUrl: string;
}

export const PAIN_POINT_STATS: PainPointStat[] = [
{
  stat: "34%",
  label: "of calls to medical practices go unanswered during business hours",
  source: "Solutionreach",
  sourceUrl: "https://www.solutionreach.com/guide/resources-missed-calls-cost-guide"
},
{
  stat: "67%",
  label: "of patients call a competitor immediately when a practice doesn't pick up",
  source: "Patient10x",
  sourceUrl: "https://www.patient10x.com/content-hub/why-67-of-patients-call-your-competitors-when-you-dont-answer-the-patient-behavior-study-every-medical-practice-must-read"
}];
