import { LanguagesIcon } from "lucide-react";
import type { Agent } from "./types";

export const multilingualTranslation: Agent = {
  slug: "multilingual_translation",
  name: "Multilingual Translation",
  desc: "Speaks your patients' language, automatically.",
  icon: LanguagesIcon,
  categoryId: "front-desk"
};
