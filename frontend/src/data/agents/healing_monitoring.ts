import { ActivityIcon } from "lucide-react";
import type { Agent } from "./types";

export const healingMonitoring: Agent = {
  slug: "healing_monitoring",
  name: "Healing Progress Monitoring",
  desc: "Tracks healing via patient photo updates.",
  icon: ActivityIcon,
  categoryId: "post-care"
};
