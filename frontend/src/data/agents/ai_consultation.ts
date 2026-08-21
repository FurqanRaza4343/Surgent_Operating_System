import { MessagesSquareIcon } from "lucide-react";
import type { Agent } from "./types";

export const aiConsultation: Agent = {
  slug: "ai_consultation",
  name: "AI Consultation",
  desc: "Guides patients through an intelligent pre-consult.",
  icon: MessagesSquareIcon,
  categoryId: "consultation"
};
