import { LineChartIcon } from "lucide-react";
import type { Agent } from "./types";

export const recoveryDashboard: Agent = {
  slug: "recovery_dashboard",
  name: "Recovery Progress Dashboard",
  desc: "A live view of every patient's recovery.",
  icon: LineChartIcon,
  categoryId: "post-care"
};
