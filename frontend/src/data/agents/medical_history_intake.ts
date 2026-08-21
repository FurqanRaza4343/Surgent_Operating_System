import { ClipboardListIcon } from "lucide-react";
import type { Agent } from "./types";

export const medicalHistoryIntake: Agent = {
  slug: "medical_history_intake",
  name: "Medical History Intake",
  desc: "Collects & structures history before the visit.",
  icon: ClipboardListIcon,
  categoryId: "consultation"
};
