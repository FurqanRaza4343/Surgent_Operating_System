import { CalendarRangeIcon } from "lucide-react";
import type { Agent } from "./types";

export const surgeryScheduling: Agent = {
  slug: "surgery_scheduling",
  name: "Surgery Scheduling",
  desc: "Coordinates the full surgical calendar.",
  icon: CalendarRangeIcon,
  categoryId: "surgery"
};
