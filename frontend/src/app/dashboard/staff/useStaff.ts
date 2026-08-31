import { useCallback, useEffect, useState } from "react";
import { listStaff, inviteStaff, updateStaff, type StaffResponse } from "../../../api/entities";

type AuthedFetch = (<T>(path: string, init?: RequestInit) => Promise<T>) | null;

export function useStaff(authedFetch: AuthedFetch) {
  const [staff, setStaff] = useState<StaffResponse[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStaff = useCallback(async () => {
    if (!authedFetch) {
      setStaff([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const data = await listStaff(authedFetch);
      setStaff(data);
    } catch {
      setStaff([]);
    } finally {
      setLoading(false);
    }
  }, [authedFetch]);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  const invite = useCallback(
    async (email: string, permissions: string[]) => {
      // Deliberately doesn't catch here — Clerk's real rejection reason
      // (e.g. "That email address is taken.") needs to reach the caller so
      // it can show something more useful than a generic failure message.
      if (!authedFetch) return false;
      await inviteStaff(authedFetch, { email, permissions });
      return true;
    },
    [authedFetch]
  );

  const update = useCallback(
    async (id: string, patch: { permissions?: string[]; is_active?: boolean }) => {
      if (!authedFetch) return false;
      try {
        const updated = await updateStaff(authedFetch, id, patch);
        setStaff((prev) => prev.map((s) => (s.id === id ? updated : s)));
        return true;
      } catch {
        return false;
      }
    },
    [authedFetch]
  );

  return { staff, loading, refetch: fetchStaff, invite, update };
}
