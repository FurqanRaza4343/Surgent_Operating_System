import { HeartPulseIcon } from "lucide-react";
import type { Agent } from "./types";

export const recoveryFollowup: Agent = {
  slug: "recovery_followup",
  name: "Recovery Follow-up",
  desc: "Checks in on recovery at the right moments.",
  icon: HeartPulseIcon,
  categoryId: "post-care"
};
