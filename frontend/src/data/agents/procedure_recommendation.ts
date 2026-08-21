import { TargetIcon } from "lucide-react";
import type { Agent } from "./types";

export const procedureRecommendation: Agent = {
  slug: "procedure_recommendation",
  name: "Procedure Recommendation",
  desc: "Suggests relevant options to explore with you.",
  icon: TargetIcon,
  categoryId: "consultation"
};
