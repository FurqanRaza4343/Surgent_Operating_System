import { DoorOpenIcon } from "lucide-react";
import type { Agent } from "./types";

export const operatingRoomScheduler: Agent = {
  slug: "operating_room_scheduler",
  name: "Operating Room Scheduler",
  desc: "Optimizes OR utilization automatically.",
  icon: DoorOpenIcon,
  categoryId: "surgery"
};
