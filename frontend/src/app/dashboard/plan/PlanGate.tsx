import React from "react";
import { usePlan } from "./PlanContext";
import { UpgradeRequired } from "./UpgradeRequired";
import { minTierForFeature } from "./planCapabilities";
import type { FeatureKey } from "./types";

interface PlanGateProps {
  feature: FeatureKey;
  title: string;
  tagline: string;
  children: React.ReactNode;
}

// For STATIC routes gated on a feature flag (e.g. Analytics, billing-only
// pages) — wraps a <Route element>. Dynamic routes keyed off a URL param
// (agent category/detail pages) check usePlan().allowsCategory() inline
// instead, since the category isn't known until the param resolves.
export function PlanGate({ feature, title, tagline, children }: PlanGateProps) {
  const { can, loading } = usePlan();
  if (loading) return null;
  if (!can(feature)) {
    const minTier = minTierForFeature(feature);
    return <UpgradeRequired title={title} tagline={tagline} minTier={minTier || "enterprise"} />;
  }
  return <>{children}</>;
}
