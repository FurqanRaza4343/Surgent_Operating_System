import { useCallback, useEffect, useState } from "react";
import { listMessageThreads, type StaffMessageThreadSummary } from "../../../api/entities";

type AuthedFetch = (<T>(path: string, init?: RequestInit) => Promise<T>) | null;

// Owner-only inbox — one row per active Doctor/Receptionist.
export function useMessageThreads(authedFetch: AuthedFetch) {
  const [threads, setThreads] = useState<StaffMessageThreadSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!authedFetch) {
      setThreads([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const data = await listMessageThreads(authedFetch);
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
