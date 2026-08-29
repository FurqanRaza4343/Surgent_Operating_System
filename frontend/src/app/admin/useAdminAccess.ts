import { useEffect, useState } from "react";
import { getAdminMe, getAdminToken, clearAdminToken } from "../../api/admin";

type Status = "checking" | "granted" | "denied";

// Real backend check (GET /api/v1/admin/me, behind require_admin_token),
// not presentation-only. A missing/expired/tampered token gets a real 401
// from the backend, surfaced here as "denied" — never assumed granted just
// because a token is present in localStorage.
export function useAdminAccess() {
  const [status, setStatus] = useState<Status>("checking");
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!getAdminToken()) {
      setStatus("denied");
      return;
    }
    (async () => {
      try {
        const me = await getAdminMe();
        if (cancelled) return;
        setUsername(me.username);
        setStatus("granted");
      } catch {
        if (cancelled) return;
        // Backend rejected the stored token (expired/tampered) — clear it
        // so the next visit doesn't loop through the same dead token.
        clearAdminToken();
        setStatus("denied");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { status, username };
}
