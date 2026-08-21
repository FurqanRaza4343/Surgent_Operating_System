import { BandageIcon } from "lucide-react";
import type { Agent } from "./types";

export const woundCareGuidance: Agent = {
  slug: "wound_care_guidance",
  name: "Wound Care Guidance",
  desc: "Delivers step-by-step aftercare instructions.",
  icon: BandageIcon,
  categoryId: "post-care"
};
