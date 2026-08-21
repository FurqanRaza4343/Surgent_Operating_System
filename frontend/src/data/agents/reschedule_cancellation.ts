import { RefreshCwIcon } from "lucide-react";
import type { Agent } from "./types";

export const rescheduleCancellation: Agent = {
  slug: "reschedule_cancellation",
  name: "Reschedule & Cancellation",
  desc: "Handles changes instantly, fills freed-up slots.",
  icon: RefreshCwIcon,
  categoryId: "front-desk"
};
