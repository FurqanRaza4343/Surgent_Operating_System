import { StarIcon } from "lucide-react";
import type { Agent } from "./types";

export const patientFeedback: Agent = {
  slug: "patient_feedback",
  name: "Patient Feedback",
  desc: "Collects reviews and NPS on autopilot.",
  icon: StarIcon,
  categoryId: "business"
};
