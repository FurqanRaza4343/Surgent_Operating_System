import {
  UserIcon,
  Building2Icon,
  SparklesIcon,
  ActivityIcon,
  CrownIcon,
  type LucideIcon
} from "lucide-react";

// SpecialtySelector.tsx — practice *types/sizes* Aiaceone actually serves,
// not procedure specialties. A literal copy of a multi-vertical competitor's
// specialty-tile pattern (med spa / dermatology / weight loss / IV therapy as
// separate product lines) would misrepresent Aiaceone as multi-vertical when
// it's a single-vertical plastic-surgery/aesthetic-practice product — this
// keeps the same honest content TrustBar always had, just given real visual
// weight instead of a plain text row.
export interface PracticeType {
  icon: LucideIcon;
  label: string;
}

export const PRACTICE_TYPES: PracticeType[] = [
{ icon: UserIcon, label: "Solo practices" },
{ icon: Building2Icon, label: "Multi-location groups" },
{ icon: SparklesIcon, label: "Med spas & dermatology" },
{ icon: ActivityIcon, label: "Surgical centers" },
{ icon: CrownIcon, label: "Concierge clinics" }];
