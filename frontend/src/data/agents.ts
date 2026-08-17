
import {
  PhoneCallIcon,
  CalendarCheckIcon,
  RefreshCwIcon,
  BellRingIcon,
  LanguagesIcon,
  MessagesSquareIcon,
  CameraIcon,
  VideoIcon,
  ClipboardListIcon,
  AlertTriangleIcon,
  TargetIcon,
  PillIcon,
  CalendarRangeIcon,
  UserCogIcon,
  DoorOpenIcon,
  PackageCheckIcon,
  BoxesIcon,
  FileTextIcon,
  HeartPulseIcon,
  ActivityIcon,
  SirenIcon,
  BandageIcon,
  LineChartIcon,
  DollarSignIcon,
  CreditCardIcon,
  ShieldCheckIcon,
  BarChart3Icon,
  StarIcon,
  MegaphoneIcon,
  SproutIcon,
  type LucideIcon } from
"lucide-react";

export interface Agent {
  name: string;
  desc: string;
  icon: LucideIcon;
}

export interface AgentCategory {
  id: string;
  label: string;
  tagline: string;
  agents: Agent[];
}

export const AGENT_CATEGORIES: AgentCategory[] = [
{
  id: "front-desk",
  label: "Front Desk & Intake",
  tagline: "Never miss a lead, a call, or a booking — around the clock.",
  agents: [
  { name: "AI Receptionist", desc: "Answers every call & chat 24/7, in a warm human voice.", icon: PhoneCallIcon },
  { name: "Appointment Booking", desc: "Books consultations directly into your calendar.", icon: CalendarCheckIcon },
  { name: "Reschedule & Cancellation", desc: "Handles changes instantly, fills freed-up slots.", icon: RefreshCwIcon },
  { name: "Appointment Reminder", desc: "Cuts no-shows with smart, timed reminders.", icon: BellRingIcon },
  { name: "Multilingual Translation", desc: "Speaks your patients' language, automatically.", icon: LanguagesIcon }]

},
{
  id: "consultation",
  label: "Consultation & Screening",
  tagline: "Qualify and prepare patients before they ever walk in.",
  agents: [
  { name: "AI Consultation", desc: "Guides patients through an intelligent pre-consult.", icon: MessagesSquareIcon },
  { name: "Photo Analysis (Screening)", desc: "Screening-only image review — never a diagnosis.", icon: CameraIcon },
  { name: "Video Consultation", desc: "Secure virtual visits with automated scheduling.", icon: VideoIcon },
  { name: "Medical History Intake", desc: "Collects & structures history before the visit.", icon: ClipboardListIcon },
  { name: "Risk Assessment", desc: "Flags candidacy risks for surgeon review.", icon: AlertTriangleIcon },
  { name: "Procedure Recommendation", desc: "Suggests relevant options to explore with you.", icon: TargetIcon },
  { name: "Pre-Surgery Preparation", desc: "Delivers tailored prep steps and checklists.", icon: PillIcon }]

},
{
  id: "surgery",
  label: "Surgery Management",
  tagline: "Orchestrate calendars, rooms, and inventory without friction.",
  agents: [
  { name: "Surgery Scheduling", desc: "Coordinates the full surgical calendar.", icon: CalendarRangeIcon },
  { name: "Surgeon Calendar", desc: "Keeps every surgeon's schedule conflict-free.", icon: UserCogIcon },
  { name: "Operating Room Scheduler", desc: "Optimizes OR utilization automatically.", icon: DoorOpenIcon },
  { name: "Equipment Checklist", desc: "Confirms every tool is ready pre-op.", icon: PackageCheckIcon },
  { name: "Implant Inventory", desc: "Tracks stock and reorders implants.", icon: BoxesIcon },
  { name: "Surgical Documentation", desc: "Generates and files surgical records.", icon: FileTextIcon }]

},
{
  id: "post-care",
  label: "Post-Surgery Care",
  tagline: "Keep patients safe, healing, and reassured after they leave.",
  agents: [
  { name: "Recovery Follow-up", desc: "Checks in on recovery at the right moments.", icon: HeartPulseIcon },
  { name: "Healing Progress Monitoring", desc: "Tracks healing via patient photo updates.", icon: ActivityIcon },
  { name: "Emergency Triage", desc: "Escalates urgent cases to your team fast.", icon: SirenIcon },
  { name: "Medication Reminder", desc: "Keeps patients on their medication plan.", icon: PillIcon },
  { name: "Wound Care Guidance", desc: "Delivers step-by-step aftercare instructions.", icon: BandageIcon },
  { name: "Recovery Progress Dashboard", desc: "A live view of every patient's recovery.", icon: LineChartIcon }]

},
{
  id: "business",
  label: "Business & Operations",
  tagline: "Turn every interaction into revenue and retention.",
  agents: [
  { name: "Cost Estimation", desc: "Generates instant, accurate quotes.", icon: DollarSignIcon },
  { name: "Payment & Invoice", desc: "Collects payments and sends invoices.", icon: CreditCardIcon },
  { name: "Insurance Verification", desc: "Verifies coverage before appointments.", icon: ShieldCheckIcon },
  { name: "Analytics Dashboard", desc: "Surfaces the metrics that grow the practice.", icon: BarChart3Icon },
  { name: "Patient Feedback", desc: "Collects reviews and NPS on autopilot.", icon: StarIcon },
  { name: "Marketing Follow-up", desc: "Re-engages every lead with the right message.", icon: MegaphoneIcon },
  { name: "Lead Nurturing", desc: "Warms prospects into booked consultations.", icon: SproutIcon }]

}];


export const TOTAL_AGENTS = AGENT_CATEGORIES.reduce((n, c) => n + c.agents.length, 0);