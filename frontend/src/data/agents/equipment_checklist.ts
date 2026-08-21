import { PackageCheckIcon } from "lucide-react";
import type { Agent } from "./types";

export const equipmentChecklist: Agent = {
  slug: "equipment_checklist",
  name: "Equipment Checklist",
  desc: "Confirms every tool is ready pre-op.",
  icon: PackageCheckIcon,
  categoryId: "surgery"
};
