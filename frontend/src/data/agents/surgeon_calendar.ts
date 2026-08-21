import { UserCogIcon } from "lucide-react";
import type { Agent } from "./types";

export const surgeonCalendar: Agent = {
  slug: "surgeon_calendar",
  name: "Surgeon Calendar",
  desc: "Keeps every surgeon's schedule conflict-free.",
  icon: UserCogIcon,
  categoryId: "surgery"
};
