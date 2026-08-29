import React from "react";
import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  body: string;
}

// A real illustrated empty state (icon in a soft tinted circle + copy) — per
// app/dashboard/README.md's "no bare blank lists" rule.
export function EmptyState({ icon: Icon, title, body }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-500/8 text-accent-500">
        <Icon className="h-6 w-6" />
      </span>
      <p className="mt-4 text-sm font-semibold text-ink">{title}</p>
      <p className="mt-1 max-w-xs text-sm text-ink-muted">{body}</p>
    </div>);

}
