import { SirenIcon } from "lucide-react";
import type { Agent } from "./types";

export const emergencyTriage: Agent = {
  slug: "emergency_triage",
  name: "Emergency Triage",
  desc: "Escalates urgent cases to your team fast.",
  icon: SirenIcon,
  categoryId: "post-care"
};
