import { PillIcon } from "lucide-react";
import type { Agent } from "./types";

export const medicationReminder: Agent = {
  slug: "medication_reminder",
  name: "Medication Reminder",
  desc: "Keeps patients on their medication plan.",
  icon: PillIcon,
  categoryId: "post-care"
};
