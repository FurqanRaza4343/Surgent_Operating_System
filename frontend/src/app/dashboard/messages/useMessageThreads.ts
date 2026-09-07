import { useCallback, useEffect, useState } from "react";
import { listStaffConversations, type StaffConversationSummary } from "../../../api/entities";

type AuthedFetch = (<T>(path: string, init?: RequestInit) => Promise<T>) | null;

// Team chat inbox — every conversation the current user is part of. Owner,
// doctor and receptionist all hit the same endpoint now (no owner-only
// threads list anymore).
export function useMessageThreads(authedFetch: AuthedFetch) {
  const [threads, setThreads] = useState<StaffConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!authedFetch) {
      setThreads([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const data = await listStaffConversations(authedFetch);
      setThreads(data);
    } catch {
      setThreads([]);
    } finally {
      setLoading(false);
    }
  }, [authedFetch]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { threads, loading, refetch };
}