import { BoxesIcon } from "lucide-react";
import type { Agent } from "./types";

export const implantInventory: Agent = {
  slug: "implant_inventory",
  name: "Implant Inventory",
  desc: "Tracks stock and reorders implants.",
  icon: BoxesIcon,
  categoryId: "surgery"
};
