import { AlertTriangleIcon } from "lucide-react";
import type { Agent } from "./types";

export const riskAssessment: Agent = {
  slug: "risk_assessment",
  name: "Risk Assessment",
  desc: "Flags candidacy risks for surgeon review.",
  icon: AlertTriangleIcon,
  categoryId: "consultation"
};
