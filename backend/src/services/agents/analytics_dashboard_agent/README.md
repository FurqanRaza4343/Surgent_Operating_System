# Analytics Dashboard Agent

## What it does
Aggregates operational and revenue data into the metrics practice owners actually check daily — calls handled, new consults generated, revenue attributable to the AI agents, and show-up rate. **This is a reporting/aggregation service, not a conversational agent** — it has no patient-facing dialogue, no LLM turn-taking, and is never "triggered" by a patient message the way the other six agents in this category are. It runs on a schedule or on-demand query, like `recovery_dashboard_agent` in Post-Surgery Care.

## Where it fits in the patient journey
It doesn't sit in the patient journey at all — it sits downstream of it, observing. Every other agent's activity (`Conversation`s created, `AgentLog` entries, `Appointment` outcomes, `Invoice` payments) is raw material this agent rolls up for practice staff. It has no upstream trigger from a patient interaction and no downstream handoff to another agent; its only "consumer" is the practice dashboard UI and, potentially, scheduled report emails to practice owners.

## Task flow
1. On a scheduled interval (e.g. nightly rollup) or on-demand API call (dashboard page load), accept a `practice_id` and a date range.
2. Compute `total_calls`: count `Conversation` rows for that practice/date-range where `channel == ConversationChannel.PHONE` (and/or all channels, depending on how the frontend intends to present it — see Open questions), optionally joined against `AgentLog` for call-specific actions (e.g. `TwilioService.make_call` outcomes).
3. Compute `new_consults`: count `Appointment` rows created in the range where `appointment_type` indicates a first consult and `patient_id` maps to a `Patient` whose earliest `Conversation`/`Appointment` falls inside the same window (i.e., genuinely new, not a returning patient).
4. Compute `attributed_revenue`: sum `Invoice.amount` where `Invoice.status == PAID` and `Invoice.paid_at` falls in range, scoped to the practice. "Attributed" implies tying revenue back to which agent/channel originated the lead — that requires the `AgentLog`/`Conversation.agent_type` trail from earlier agents (e.g. `lead_nurturing`, `cost_estimation`) to be populated consistently; this agent only aggregates what upstream agents already logged, it can't retroactively attribute what was never recorded.
5. Compute `show_up_rate`: `COMPLETED` appointments divided by (`COMPLETED` + `NO_SHOW`) appointments in range, excluding still-`SCHEDULED`/`CANCELLED` ones from the denominator (cancellations arguably shouldn't count against show-up rate — confirm with product).
6. Assemble the four values into the existing `DashboardMetrics` Pydantic schema (`backend/src/schemas/analytics.py`) and return it from the service/controller/router layer.
7. Beyond the base schema, build richer breakdowns as a second phase: metrics grouped by `Conversation.channel`, by `agent_type`, and by `Procedure` (revenue/volume per procedure) — these aren't in `DashboardMetrics` yet but are the natural next step once the base rollup works, and match what a practice owner would actually want to drill into.
8. Cache or materialize expensive rollups (e.g. a nightly job writing a summary row) rather than recomputing full-table aggregates on every dashboard page load, once data volume justifies it.

## Data it reads
- `Conversation`: `channel`, `agent_type`, `created_at`, `patient_id`, `practice_id` — for call/consult counts and channel breakdowns.
- `AgentLog`: `agent_type`, `action`, `created_at`, `details` — for agent-level activity and attribution trail (e.g. which agent generated a lead that became revenue).
- `Appointment`: `status`, `appointment_type`, `start_time`, `patient_id`, `practice_id` — for consult counts and show-up rate.
- `Invoice`: `amount`, `status`, `paid_at`, `patient_id`, `practice_id` — for attributed revenue.
- `Procedure`: `name`, `category` — for eventual per-procedure breakdowns.

## Data it writes
- Nothing transactional in the normal sense — this agent is read-only against patient/business data. The one thing it might write is a materialized/cached rollup table or row (e.g. a nightly snapshot) if performance requires it, but that's an optimization, not a v1 requirement.
- Optionally an `AgentLog` entry per rollup run (`agent_type="analytics_dashboard"`, `action="rollup_computed"`) purely for operational visibility into the aggregation job itself, not as patient-facing data.

## Integrations used
- No `LLMService`, `TwilioService`, or messaging integrations — this is pure SQL aggregation (SQLAlchemy queries against the models above), not an LLM-driven agent.
- Its consumer is `frontend/src/app/dashboard/analytics/AnalyticsPage.tsx`, which today renders a `ComingSoon` placeholder explicitly labeled "Phase 4" and states it will be "built once Agent Sessions is backed by the real conversations API — charts here will reflect real numbers, not illustrative ones." This service is exactly what that placeholder is waiting on — closing this out unblocks that frontend page directly. The `DashboardMetrics` schema it must satisfy already exists at `backend/src/schemas/analytics.py`.

## Escalation & guardrails
- Not applicable in the usual "hand off to a human" sense since there's no live patient interaction — but data-quality guardrails matter a lot here: never silently return zeroed/partial metrics as if they were complete (e.g. if `Invoice` attribution data is sparse because upstream agents aren't logging consistently yet, the dashboard should indicate incomplete data rather than show a misleadingly low revenue number).
- Practice-level data isolation is critical — every query must be scoped by `practice_id`; a cross-practice data leak in an analytics rollup is a serious incident, not a minor bug.

## Success criteria
- `DashboardMetrics` values match a manual SQL spot-check against the same date range, within rounding.
- Dashboard load time for the Overview/Analytics pages stays fast (sub-second to low-seconds) even as `Conversation`/`AgentLog`/`Invoice` tables grow — implies indexing on `practice_id` + date columns and eventually a rollup/cache strategy.
- Frontend Analytics page (`frontend/src/app/dashboard/analytics/AnalyticsPage.tsx`) can be de-placeholder'd and wired to a real endpoint using this service without further backend changes to the metrics shape.

## Current status
Stub — `analytics_dashboard_agent_services.py` only has `get_status`. Needs:
- The four `DashboardMetrics` aggregation queries described above.
- A router/controller endpoint that accepts `practice_id` + date range and returns `DashboardMetrics` (current router only exposes `/status`).
- Decision on real-time query vs. scheduled rollup/cache for performance.
- Breakdown-by-channel / by-agent / by-procedure endpoints as a second phase.

## Open questions
- "Attributed revenue" depends on other agents (`lead_nurturing`, `cost_estimation`, `payment_invoice`) consistently writing `AgentLog`/`Conversation.agent_type` data that ties a payment back to an originating agent/channel — if those agents aren't logging yet, revenue attribution degrades to just "total revenue in range," which is a materially different (weaker) metric. Worth flagging to whoever builds those agents in parallel.
- `total_calls` — does it mean phone calls only (`ConversationChannel.PHONE`), or all inbound conversations regardless of channel? The name suggests phone-specific but the broader dashboard likely wants an all-channel view too; needs a product decision, possibly both exposed separately.
- No existing scheduled-job/cron infrastructure was found in this pass of the codebase — if nightly rollups are the chosen approach, that infrastructure needs to be confirmed or built.
