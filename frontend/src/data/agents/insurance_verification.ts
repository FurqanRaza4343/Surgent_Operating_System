import { ShieldCheckIcon } from "lucide-react";
import type { Agent } from "./types";

export const insuranceVerification: Agent = {
  slug: "insurance_verification",
  name: "Insurance Verification",
  desc: "Verifies coverage before appointments.",
  icon: ShieldCheckIcon,
  categoryId: "business"
};
