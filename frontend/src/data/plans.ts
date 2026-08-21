export interface Plan {
  name: string;
  tagline: string;
  price: string;
  period: string;
  highlight: boolean;
  features: string[];
}

export const PLANS: Plan[] = [
{
  name: "Solo",
  tagline: "For single-surgeon practices",
  price: "$690",
  period: "/mo",
  highlight: false,
  features: [
  "Front desk & intake agents",
  "Booking, reminders & rescheduling",
  "1 connected social channel",
  "Multilingual support",
  "Email support"]

},
{
  name: "Practice",
  tagline: "For growing multi-surgeon clinics",
  price: "$1,690",
  period: "/mo",
  highlight: true,
  features: [
  "Everything in Solo",
  "Full consultation & surgery agents",
  "Post-surgery care & recovery suite",
  "All social channels connected",
  "Analytics dashboard",
  "Priority onboarding & support"]

},
{
  name: "Enterprise",
  tagline: "For groups & multi-location brands",
  price: "Custom",
  period: "",
  highlight: false,
  features: [
  "Everything in Practice",
  "All 31 agents, fully configured",
  "Multi-location orchestration",
  "Custom integrations & EHR",
  "BAA & dedicated success manager"]

}];
