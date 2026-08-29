import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LockIcon, UserIcon, Loader2Icon, ShieldCheckIcon } from "lucide-react";
import { AuthLayout } from "../auth/AuthLayout";
import { adminLogin, setAdminToken } from "../../api/admin";
import { ApiError } from "../../api/client";
import { ADMIN_ROUTES } from "./constants/routes";

// Standalone username/password + JWT login — deliberately independent of
// Clerk (see backend/src/services/admin/admin_auth_service.py and
// api/admin.ts). Reuses AuthLayout's split-screen shell (variant="admin")
// for visual consistency with the rest of the "Aiaceone premium" surfaces,
// but the form itself is our own, not a Clerk widget.
export function AdminSignInPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username || !password || loading) return;
    setLoading(true);
    setError(null);
    try {
      const { access_token } = await adminLogin(username, password);
      setAdminToken(access_token);
      navigate(ADMIN_ROUTES.overview, { replace: true });
    } catch (err) {
      setError(err instanceof ApiError && err.status === 401 ? "Incorrect username or password." : "Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <AuthLayout variant="admin">
      <div className="overflow-hidden rounded-3xl border border-sand-200 bg-white shadow-[0_20px_50px_-20px_rgba(11,29,38,0.25)]">
        <div className="px-8 pb-2 pt-8">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl font-600 text-ink">Super Admin sign in</h2>
            <span className="flex items-center gap-1 rounded-full bg-success/10 px-2.5 py-1 text-[11px] font-bold text-success">
              <ShieldCheckIcon className="h-3 w-3" /> Secure
            </span>
          </div>
          <p className="mt-1.5 text-sm text-ink-muted">Aiaceone team only.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-8 py-6">
          <label className="block">
            <span className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-muted">
              <UserIcon className="h-3.5 w-3.5" /> Username
            </span>
            <input
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin"
              autoComplete="username"
              className="w-full rounded-xl border border-sand-200 bg-canvas px-3.5 py-2.5 text-sm text-ink outline-none transition-colors focus:border-accent-500/50 focus:bg-white" />

          </label>

          <label className="block">
            <span className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-muted">
              <LockIcon className="h-3.5 w-3.5" /> Password
            </span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              className="w-full rounded-xl border border-sand-200 bg-canvas px-3.5 py-2.5 text-sm text-ink outline-none transition-colors focus:border-accent-500/50 focus:bg-white" />

          </label>

          {error && <p className="text-sm text-danger">{error}</p>}

          <button
            type="submit"
            disabled={loading || !username || !password}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent-500 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-600 disabled:cursor-not-allowed disabled:opacity-40">

            {loading && <Loader2Icon className="h-4 w-4 animate-spin" />}
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <div className="border-t border-sand-200 bg-sand-50 px-8 py-4">
          <div className="flex items-center justify-center gap-1.5 text-xs text-ink-muted">
            <LockIcon className="h-3 w-3" />
            <span>JWT-secured — every /admin request is verified server-side, every time.</span>
          </div>
        </div>
      </div>
    </AuthLayout>);

}
