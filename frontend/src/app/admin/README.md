# admin (Super Admin Panel)

The platform super admin panel - for the Aiaceone team, not clinics. Every route
under `/admin/*` is registered once in `AdminRouter.tsx`, mirroring
`app/dashboard/DashboardRouter.tsx`'s role for the doctor dashboard.

**Auth is a standalone username/password + JWT, deliberately independent of
Clerk.** `AdminSignInPage.tsx` posts to `POST /api/v1/admin/auth/login`
(`backend/src/services/admin/admin_auth_service.py`), stores the returned
JWT in `localStorage` (`api/admin.ts`), and every subsequent
`/api/v1/admin/*` call attaches it as a Bearer token. The backend verifies
it with `require_admin_token` (`server/dependencies.py`) - a completely
separate mechanism from Clerk's `get_current_user`/`require_platform_admin`
chain (that Clerk-based path still exists in the backend but nothing calls
it anymore; kept for reference in case a future multi-admin-via-Clerk-roles
feature wants it). Credentials live in `backend/.env`
(`ADMIN_USERNAME`/`ADMIN_PASSWORD`/`ADMIN_JWT_SECRET`) - change them for
any real deployment.

**`AdminRequireAuth.tsx` fails closed, no dev bypass**: a missing or
backend-rejected token always redirects to sign-in - there's no
`RequireAuth.tsx`-style "run without auth if unconfigured" fallback, since
this panel edits live pricing.

**Visual language**: dark sidebar (`bg-panel` `#15171A`) against the light
`canvas` content area - the inverse of the doctor dashboard's light sidebar -
using the same `accent`/`cyan`/`panel` tokens established for the
"Aiaceone premium" surfaces (`app/auth/AuthLayout.tsx`,
`app/onboarding/DemoPaymentPage.tsx`, `app/dashboard/overview/OverviewPage.tsx`).
`AdminSignInPage.tsx` reuses `AuthLayout`'s split-screen shell via its
`variant="admin"` prop for the same reason, with its own plain form instead
of a Clerk widget.

**Numbers are estimates, labeled as such**: no real per-session usage exists
yet (see `backend/src/services/admin/admin_services.py`'s
`ASSUMED_MONTHLY_SESSIONS_PER_AGENT`), so every cost/margin figure is
prefixed `estimated_` in the API and carries a visible "Estimated" caption
here - never presented as a measurement.
