import { PlugZapIcon, BrainCircuitIcon, RocketIcon, type LucideIcon } from "lucide-react";

export interface Step {
  icon: LucideIcon;
  step: string;
  title: string;
  desc: string;
}

export const STEPS: Step[] = [
{
  icon: PlugZapIcon,
  step: "01",
  title: "Connect your practice",
  desc: "Link your calendar, phone line, EHR, and social channels in minutes — no engineers, no rip-and-replace."
},
{
  icon: BrainCircuitIcon,
  step: "02",
  title: "Agents learn your protocols",
  desc: "Your procedures, pricing, tone, and clinical guardrails are configured once. Every agent stays on-brand and on-policy."
},
{
  icon: RocketIcon,
  step: "03",
  title: "Go fully autonomous",
  desc: "Agents handle calls, bookings, surgery logistics, recovery, and marketing — with a human handoff whenever it matters."
}];
