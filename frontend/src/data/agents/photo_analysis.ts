import { CameraIcon } from "lucide-react";
import type { Agent } from "./types";

export const photoAnalysis: Agent = {
  slug: "photo_analysis",
  name: "Photo Analysis (Screening)",
  desc: "Screening-only image review — never a diagnosis.",
  icon: CameraIcon,
  categoryId: "consultation"
};
