# auth

`RequireAuth.tsx` gates every `/dashboard/*` route behind Clerk (see
`DashboardRouter.tsx`) — signed-out visitors see a sign-in prompt instead of
the dashboard. Degrades gracefully to "always allow" if
`VITE_CLERK_PUBLISHABLE_KEY` isn't set, same pattern as `Navbar.tsx`.

**Token attachment is now real**: `../api/authFetch.ts`'s `useAuthedFetch()`
binds Clerk's `getToken()` into every request's `Authorization` header — used
by `dashboard/plan/PlanContext.tsx` (to fetch `GET /practice/me`) and
`onboarding/ClaimPlanPage.tsx` (to call `POST /practice/claim`). The backend
side (`server/dependencies.py`'s `get_current_user`/`get_current_practice_user`)
already existed and was unmodified — this was purely the missing frontend
half of the connection.

**Still open**: `get_current_practice_context()` (the dependency that
resolves a Clerk session all the way to a practice + plan tier) exists and is
wired into `router/practice/practice_router.py`, but no OTHER route in the
backend uses it yet — `conversations`/`patients`/etc. still only use the
older `get_current_practice_user` (proves a `User` row exists, says nothing
about plan tier). Real per-route plan-tier enforcement
(`require_plan_feature()`/`require_agent_category()`, also in
`dependencies.py`) has no caller yet either — nothing else is real-data-backed
enough to need it beyond the frontend's presentation-layer gating in
`dashboard/plan/`.

`RequirePractice.tsx` (wraps the dashboard alongside `RequireAuth`, see
`DashboardRouter.tsx`) still checks the local plan override
(`../dashboard/plan/planStorage.ts`) rather than a live `/practice/me` call —
cheap and synchronous, fine for a redirect gate that only needs a rough
"has this browser ever claimed a plan" signal, not authoritative like the
dashboard's own tier display (which does read the real endpoint via
`usePlanTier.ts`'s source chain).

**Genuinely unverified** (not a known bug — an environment limitation): a
full browser-driven Clerk sign-up → claim round trip. Clerk's
device-verification email-code challenge blocks headless/automated sign-in
on a "new device," which every fresh test browser context is. The claim
logic itself was verified directly against a real Postgres database instead
(see `onboarding/README.md`) — a real signed-in browser session should work
the same way, since nothing about `get_current_user`'s JWT verification was
touched this pass.
