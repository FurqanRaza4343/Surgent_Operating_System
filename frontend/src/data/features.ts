import {
  ShieldCheckIcon,
  LockIcon,
  FileCheckIcon,
  UserCheckIcon,
  PhoneCallIcon,
  UsersIcon,
  DollarSignIcon,
  TrendingUpIcon,
  type LucideIcon
} from "lucide-react";

// Security.tsx
export interface SecurityItem {
  icon: LucideIcon;
  title: string;
  desc: string;
}

export const SECURITY_ITEMS: SecurityItem[] = [
{ icon: ShieldCheckIcon, title: "HIPAA-ready", desc: "Built to support HIPAA compliance with BAAs available." },
{ icon: LockIcon, title: "End-to-end encryption", desc: "Data encrypted in transit and at rest, always." },
{ icon: UserCheckIcon, title: "Human-in-the-loop", desc: "Clinical decisions stay with your surgeons — agents assist." },
{ icon: FileCheckIcon, title: "Full audit trail", desc: "Every agent action is logged, reviewable, and exportable." }];


// DashboardPreview.tsx
export interface Kpi {
  icon: LucideIcon;
  label: string;
  value: string;
  change: string;
}

export const KPI_DATA: Kpi[] = [
{ icon: PhoneCallIcon, label: "Calls handled", value: "3,912", change: "+18%" },
{ icon: UsersIcon, label: "New consults", value: "486", change: "+27%" },
{ icon: DollarSignIcon, label: "Revenue attributed", value: "$1.24M", change: "+31%" },
{ icon: TrendingUpIcon, label: "Show-up rate", value: "94%", change: "+12%" }];


export const BAR_DATA: number[] = [42, 58, 51, 70, 64, 82, 76, 91, 88, 96];

export const TOP_PROCEDURES: { label: string; pct: number }[] = [
{ label: "Rhinoplasty", pct: 34 },
{ label: "Breast aug.", pct: 26 },
{ label: "Liposuction", pct: 21 },
{ label: "Facelift", pct: 19 }];


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
