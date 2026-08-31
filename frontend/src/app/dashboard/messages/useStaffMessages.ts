import { useCallback, useEffect, useState } from "react";
import {
  listMyMessages,
  sendMyMessage,
  listMessagesWith,
  sendMessageTo,
  type StaffMessageResponse
} from "../../../api/entities";

type AuthedFetch = (<T>(path: string, init?: RequestInit) => Promise<T>) | null;

// Pass a staffUserId for the Owner viewing a specific staff member's
// thread; omit it for a Doctor/Receptionist viewing their own thread with
// the Owner (uses the /me aliases — they never need to know their own
// backend User.id).
export function useStaffMessages(authedFetch: AuthedFetch, staffUserId?: string) {
  const [messages, setMessages] = useState<StaffMessageResponse[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!authedFetch) {
      setMessages([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const data = staffUserId ? await listMessagesWith(authedFetch, staffUserId) : await listMyMessages(authedFetch);
      setMessages(data);
    } catch {
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [authedFetch, staffUserId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const send = useCallback(
    async (body: string) => {
      if (!authedFetch) return null;
      const message = staffUserId ? await sendMessageTo(authedFetch, staffUserId, body) : await sendMyMessage(authedFetch, body);
      setMessages((prev) => [...prev, message]);
      return message;
    },
    [authedFetch, staffUserId]
  );

  return { messages, loading, refetch, send };
}
