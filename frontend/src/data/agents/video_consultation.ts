import { VideoIcon } from "lucide-react";
import type { Agent } from "./types";

export const videoConsultation: Agent = {
  slug: "video_consultation",
  name: "Video Consultation",
  desc: "Secure virtual visits with automated scheduling.",
  icon: VideoIcon,
  categoryId: "consultation"
};
