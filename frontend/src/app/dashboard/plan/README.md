# Plan-tier gating

What a practice sees in the dashboard depends on which plan they bought
(Solo/Practice/Enterprise). This folder is the whole mechanism.

## The mapping (derived from `data/plans.ts`'s marketing copy)

| Surface | Solo | Practice | Enterprise |
|---|---|---|---|
| Overview, Agent Sessions, Patients, Doctors, Agent Settings, Profile, Plan & Billing | ✅ | ✅ | ✅ |
| Agents › Front Desk & Intake (5) | ✅ | ✅ | ✅ |
| Agents › Consultation & Screening (7) | 🔒 | ✅ | ✅ |
| Agents › Surgery Management (6) | 🔒 | ✅ | ✅ |
| Agents › Post-Surgery Care (6) | 🔒 | ✅ | ✅ |
| Agents › Business & Operations (7) | 🔒 | 🔒 | ✅ |
| Analytics page | 🔒 | ✅ | ✅ |
| Doctors | 1 max | unlimited | unlimited |
| Social channels | 1 max | unlimited | unlimited |
| Locations | 1 | 1 | unlimited |
| EHR / custom integrations / BAA | ✗ | ✗ | ✅ |

`planCapabilities.ts` is the single source of truth for this table — every
entry there cites the exact `data/plans.ts` line it derives from. **If the
marketing copy changes, this file is what changes**, not a scattered set of
`if (tier === ...)` checks across dashboard pages.

## Why "front-desk" is universal

Overview/Sessions/Patients/Doctors/Settings aren't a plan feature — they're
the container the agents run inside. A Solo clinic's front-desk agent still
needs somewhere to show the patient/conversation it created, or the plan it
paid for doesn't function. These get **limits** (Solo: 1 doctor, matching its
own "single-surgeon practice" tagline in `data/plans.ts`), not locks.

## How gating actually resolves — `usePlanTier.ts` / `PlanContext.tsx`

`usePlan()` (the context consumer) never asks "is there a real backend yet."
It reads from an ordered source chain inside `usePlanTier.ts`:

1. `GET /api/v1/practice/me` — real, via `api/authFetch.ts`'s Clerk-token-attached fetch (see `app/onboarding/README.md`)
2. the local override written by `planStorage.ts` (onboarding claim step, or `billing/PlanComparisonTable.tsx`'s dev switch buttons)
3. `"solo"` default

Only `usePlanTier.ts` needed to change when the real endpoint landed — every
component calling `can()`/`limitFor()` stayed untouched. This mirrors the
`useDoctors.ts`/`usePracticeProfile.ts` pattern already used throughout
`app/dashboard/` ("shaped like the real model, storage-layer swap later").

**⚠️ Client-side gating is still presentation-only for surfaces without a
real backend caller.** `planStorage.ts` is a `localStorage` key — trivially
editable via devtools. `require_plan_feature()`/`require_agent_category()`
(`server/dependencies.py`) exist and are wired into
`get_current_practice_context`, but no OTHER route calls them yet — nothing
outside `router/practice/` is real-data-backed enough to need it. Before any
other gated surface reads real practice data, it must call one of those
guards first. Don't let that slip.

## Switching plans in dev

No separate `DevPlanSwitcher` component anymore — plan-switching lives on
`billing/PlanBillingPage.tsx` (`PlanComparisonTable.tsx`'s "Switch to this
plan" button per card, `import.meta.env.DEV`-gated). This writes the same
local override as the onboarding claim flow, so it's not a second mechanism
to keep in sync — just a manual trigger for the same source #2. Moved here
(off the global Topbar) because it's what a practice would actually reach
for — "manage my plan" — not a stray always-visible dev control.

## UI convention for locked surfaces

Visible-but-locked, never hidden — a feature the customer never sees is a
feature they never upgrade for. See `UpgradeRequired.tsx` for the pattern:
real category label + real (disabled) agent chips + "Included in Practice —
$1,690/mo" (price pulled from `planFor()`, never hardcoded) + one CTA to
`/dashboard/settings/billing`. Colors: `ink-muted`/opacity for the locked
state, `gold` reserved for the upgrade accent — per the dashboard's standing
color rule, nothing outside the existing token set.
