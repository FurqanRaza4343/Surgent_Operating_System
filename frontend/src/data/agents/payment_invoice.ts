import { CreditCardIcon } from "lucide-react";
import type { Agent } from "./types";

export const paymentInvoice: Agent = {
  slug: "payment_invoice",
  name: "Payment & Invoice",
  desc: "Collects payments and sends invoices.",
  icon: CreditCardIcon,
  categoryId: "business"
};
