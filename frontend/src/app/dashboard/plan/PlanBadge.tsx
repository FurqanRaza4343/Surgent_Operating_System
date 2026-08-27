import React from "react";
import { usePlan } from "./PlanContext";
import { planFor } from "./planCapabilities";

export function PlanBadge() {
  const { tier } = usePlan();
  const plan = planFor(tier);

  return (
    <span className="rounded-full bg-teal-600/8 px-3 py-1 text-xs font-semibold text-teal-600">
      {plan.name} plan
    </span>);

}
