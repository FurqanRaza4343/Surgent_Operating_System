import { useCallback, useEffect, useState } from "react";
import { getOverviewSummary, type OverviewSummaryResponse } from "../../../api/entities";
import { usePlan } from "../plan/PlanContext";

// Real practice-wide aggregates from GET /api/v1/analytics/overview — the
// four Overview KPIs (sessions today, needs attention, bookings this week,
// revenue estimate). Distinct from the conversations *list* (useSessions.ts)
// the Overview lists/charts read, since these are SQL COUNT/SUM aggregates
// over the whole practice, not a capped page of rows.
export function useOverview() {
  const { authedFetch } = usePlan();
  const [summary, setSummary] = useState<OverviewSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!authedFetch) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const data = await getOverviewSummary(authedFetch);
      setSummary(data);
      setError(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load overview");
    } finally {
      setLoading(false);
    }
  }, [authedFetch]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { summary, loading, error, refetch };
}