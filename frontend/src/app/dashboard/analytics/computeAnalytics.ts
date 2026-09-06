import type { SessionAnalyticsResponse } from "../../../api/entities";
import { CHANNELS, type ChannelId } from "../data/channels";
import { AGENT_CATEGORIES } from "../../../data/agents";

// Pure mapper over GET /api/v1/analytics/sessions — the backend already
// aggregates the real conversation table (total/active/needs-attention/
// resolved counts + channel/category breakdowns), so this only enriches
// those raw codes with the CHANNELS/AGENT_CATEGORIES labels and colors the
// chart components expect. No deriving from mock sessions here anymore.
export function computeAnalytics(analytics: SessionAnalyticsResponse) {
  const total = analytics.total_conversations;
  const byStatus = {
    active: analytics.active_count,
    needs_attention: analytics.needs_attention_count,
    resolved: analytics.resolved_count
  };

  const byChannel = analytics.by_channel.
  map((c) => {
    const meta = CHANNELS[c.channel as ChannelId];
    return {
      id: c.channel,
      label: meta?.label ?? c.channel,
      color: meta?.color ?? "#64748B",
      count: c.count
    };
  }).
  sort((a, b) => b.count - a.count);

  const byCategory = analytics.by_category.
  map((c) => ({
    id: c.category,
    label: AGENT_CATEGORIES.find((cat) => cat.id === c.category)?.label ?? c.category,
    count: c.count
  })).
  sort((a, b) => b.count - a.count);

  const escalationRate = total > 0 ? Math.round(byStatus.needs_attention / total * 100) : 0;
  const resolutionRate = total > 0 ? Math.round(byStatus.resolved / total * 100) : 0;

  return { total, byStatus, byChannel, byCategory, escalationRate, resolutionRate };
}