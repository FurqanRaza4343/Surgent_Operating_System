import React from "react";
import { CreditCardIcon, HeadsetIcon } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { usePlan } from "../plan/PlanContext";
import { planFor } from "../plan/planCapabilities";
import { PlanComparisonTable } from "./PlanComparisonTable";

const SUPPORT_LABEL: Record<string, string> = {
  email: "Email support",
  priority: "Priority support",
  dedicated: "Dedicated success manager"
};

export function PlanBillingPage() {
  const { tier, capabilities } = usePlan();
  const plan = planFor(tier);

  return (
    <>
      <PageHeader title="Plan & billing" subtitle="Your current plan, what it includes, and what upgrading unlocks." />

      <div className="mb-6 flex flex-wrap items-center gap-4 rounded-3xl border border-sand-200 bg-white p-6 shadow-[0_4px_20px_rgba(11,29,38,0.05)]">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-teal-600/8 text-teal-600">
          <CreditCardIcon className="h-6 w-6" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-ink">
            You're on the {plan.name} plan — {plan.price}{plan.period}
          </p>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-muted">
            <HeadsetIcon className="h-3.5 w-3.5" /> {SUPPORT_LABEL[capabilities.supportLevel]}
          </p>
        </div>
        <p className="text-xs text-ink-muted">
          Real billing management (invoices, payment method, cancel) connects once Stripe's customer portal is wired up.
        </p>
      </div>

      <PlanComparisonTable />
    </>);

}
