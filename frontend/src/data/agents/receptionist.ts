import { PhoneCallIcon } from "lucide-react";
import type { Agent } from "./types";

export const receptionist: Agent = {
  slug: "receptionist",
  name: "AI Receptionist",
  desc: "Answers every call & chat 24/7, in a warm human voice.",
  icon: PhoneCallIcon,
  categoryId: "front-desk"
};
