import { BarChart3Icon } from "lucide-react";
import type { Agent } from "./types";

export const analyticsDashboard: Agent = {
  slug: "analytics_dashboard",
  name: "Analytics Dashboard",
  desc: "Surfaces the metrics that grow the practice.",
  icon: BarChart3Icon,
  categoryId: "business"
};
