import React from "react";
import type { LucideIcon } from "lucide-react";
import { ProgressRing } from "./ProgressRing";

interface KpiCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  changePercent?: number; // used to fill the ring; omit for a plain card
  color?: string;
}

// Glassmorphic card per DESIGN.md: white surface, 24px radius, soft shadow,
// tabular-figure value — every metric gets a visual, not a bare number.
export function KpiCard({ icon: Icon, label, value, changePercent, color = "#0B6362" }: KpiCardProps) {
  return (
    <div className="rounded-3xl border border-sand-200 bg-white p-5 shadow-[0_4px_20px_rgba(15,23,42,0.05)]">
      <div className="flex items-center justify-between">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sand-100 text-teal-600">
          <Icon className="h-5 w-5" />
        </span>
        {changePercent != null &&
        <ProgressRing percent={changePercent} color={color} />
        }
      </div>
      <p className="mt-4 font-mono text-3xl font-bold tabular-nums text-ink">{value}</p>
      <p className="mt-1 text-sm text-ink-muted">{label}</p>
    </div>);

}
