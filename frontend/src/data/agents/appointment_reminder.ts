import { BellRingIcon } from "lucide-react";
import type { Agent } from "./types";

export const appointmentReminder: Agent = {
  slug: "appointment_reminder",
  name: "Appointment Reminder",
  desc: "Cuts no-shows with smart, timed reminders.",
  icon: BellRingIcon,
  categoryId: "front-desk"
};
