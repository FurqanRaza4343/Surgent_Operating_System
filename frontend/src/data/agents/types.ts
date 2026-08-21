import type { LucideIcon } from "lucide-react";

export interface Agent {
  slug: string;
  name: string;
  desc: string;
  icon: LucideIcon;
  categoryId: string;
}

export interface AgentCategory {
  id: string;
  label: string;
  tagline: string;
  agents: Agent[];
}
