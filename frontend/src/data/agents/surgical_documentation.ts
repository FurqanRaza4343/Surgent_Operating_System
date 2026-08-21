import { FileTextIcon } from "lucide-react";
import type { Agent } from "./types";

export const surgicalDocumentation: Agent = {
  slug: "surgical_documentation",
  name: "Surgical Documentation",
  desc: "Generates and files surgical records.",
  icon: FileTextIcon,
  categoryId: "surgery"
};
