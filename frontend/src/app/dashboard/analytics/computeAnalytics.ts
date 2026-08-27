import { MOCK_SESSIONS } from "../data/mockSessions";
import { CHANNELS, type ChannelId } from "../data/channels";
import { AGENT_CATEGORIES } from "../../../data/agents";

// Every number here is derived from the same MOCK_SESSIONS the rest of the
// dashboard reads (Overview, Sessions, Patients) — no separate invented
// dataset, so this page can't drift into the "illustrative fake stats"
// problem the marketing site's DashboardPreview had.
export function computeAnalytics() {
  const total = MOCK_SESSIONS.length;
  const byStatus = {
    active: MOCK_SESSIONS.filter((s) => s.status === "active").length,
    needs_attention: MOCK_SESSIONS.filter((s) => s.status === "needs_attention").length,
    resolved: MOCK_SESSIONS.filter((s) => s.status === "resolved").length
  };

  const byChannel = (Object.keys(CHANNELS) as ChannelId[]).
  map((id) => ({
    id,
    label: CHANNELS[id].label,
    color: CHANNELS[id].color,
    count: MOCK_SESSIONS.filter((s) => s.channel === id).length
  })).
  filter((c) => c.count > 0).
  sort((a, b) => b.count - a.count);

  const byCategory = AGENT_CATEGORIES.
  map((c) => ({
    id: c.id,
    label: c.label,
    count: MOCK_SESSIONS.filter((s) => s.categoryId === c.id).length
  })).
  sort((a, b) => b.count - a.count);

  const escalationRate = total > 0 ? Math.round(byStatus.needs_attention / total * 100) : 0;
  const resolutionRate = total > 0 ? Math.round(byStatus.resolved / total * 100) : 0;

  return { total, byStatus, byChannel, byCategory, escalationRate, resolutionRate };
}
