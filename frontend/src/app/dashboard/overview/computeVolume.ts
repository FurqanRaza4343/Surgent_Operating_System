import { MOCK_SESSIONS } from "../data/mockSessions";

export interface VolumePoint {
  label: string; // e.g. "Aug 23"
  count: number;
}

// Real derived data, not invented numbers — buckets MOCK_SESSIONS (the same
// source every other Overview/Analytics number reads from) by calendar day.
// With only 6 mock sessions across ~2 days this makes for a sparse chart —
// that's honest, not padded with synthetic days to look fuller.
export function computeDailyVolume(): VolumePoint[] {
  const byDay = new Map<string, number>();
  for (const s of MOCK_SESSIONS) {
    const d = new Date(s.updatedAt);
    const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    byDay.set(label, (byDay.get(label) || 0) + 1);
  }
  return [...byDay.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => new Date(a.label).getTime() - new Date(b.label).getTime());
}
