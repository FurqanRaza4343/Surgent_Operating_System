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
export function KpiCard({ icon: Icon, label, value, changePercent, color = "#2563EB" }: KpiCardProps) {
  return (
    <div className="rounded-[22px] border border-sand-200 bg-white/85 p-5 shadow-[0_4px_20px_rgba(15,23,42,0.05)] transition-transform hover:-translate-y-0.5">
      <div className="flex items-center justify-between">
        <span className="flex h-9 w-9 items-center justify-center rounded-[10px]" style={{ backgroundColor: `${color}1F`, color }}>
          <Icon className="h-4.5 w-4.5" />
        </span>
        {changePercent != null &&
        <ProgressRing percent={changePercent} color={color} size={38} />
        }
      </div>
      <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-muted">{label}</p>
      <p className="mt-1 font-display text-[28px] font-600 tabular-nums text-ink">{value}</p>
    </div>);

}
