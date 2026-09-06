import type { Session } from "../sessions/types";

export interface VolumePoint {
  label: string; // e.g. "Aug 23"
  count: number;
}

// Pure function — buckets whatever sessions it's handed (the live
// conversations API for OverviewPage) by calendar day. Same source every
// other Overview number reads from, just passed in instead of imported.
export function computeDailyVolume(sessions: Session[]): VolumePoint[] {
  const byDay = new Map<string, number>();
  for (const s of sessions) {
    const d = new Date(s.updatedAt);
    const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    byDay.set(label, (byDay.get(label) || 0) + 1);
  }
  return [...byDay.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => new Date(a.label).getTime() - new Date(b.label).getTime());
}