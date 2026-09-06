import {
  ShieldCheckIcon,
  LockIcon,
  FileCheckIcon,
  UserCheckIcon,
  type LucideIcon
} from "lucide-react";

// Security.tsx
export interface SecurityItem {
  icon: LucideIcon;
  title: string;
  desc: string;
}

export const SECURITY_ITEMS: SecurityItem[] = [
{ icon: ShieldCheckIcon, title: "Built for HIPAA workflows", desc: "Designed to support HIPAA compliance, with BAAs available." },
{ icon: LockIcon, title: "End-to-end encryption", desc: "Data encrypted in transit and at rest, always." },
{ icon: UserCheckIcon, title: "Human-in-the-loop", desc: "Clinical decisions stay with your surgeons — agents assist." },
{ icon: FileCheckIcon, title: "Full audit trail", desc: "Every agent action is logged, reviewable, and exportable." }];


// FeatureShowcase.tsx
export const SCREENING_FEATURES: string[] = [
"Photo Analysis for pre-consult screening",
"Structured medical history intake",
"Automated risk assessment for surgeon review",
"Procedure options to discuss in consult"];


export const RECOVERY_STATS: { k: string; v: string }[] = [
{ k: "−41%", v: "post-op call volume" },
{ k: "24/7", v: "recovery monitoring" },
{ k: "< 2 min", v: "triage escalation" },
{ k: "+0.9", v: "review rating lift" }];
