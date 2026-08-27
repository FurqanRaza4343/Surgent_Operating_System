# Recovery Progress Dashboard

## What it does
Aggregates every patient's recovery data across `RecoveryJournal`, `PatientPhoto`, and `AgentLog` into a staff-facing "who needs attention" view. **Unlike the other five agents in this category, this is not a patient-facing conversational agent** — it never messages a patient, never runs on a schedule to check in with anyone, and never uses `LLMService.chat` as its core function. It's a read/reporting service that staff (or the dashboard UI) query.

## Where it fits in the patient journey
It doesn't sit in the patient journey the way the other five do — it has no patient-triggered or schedule-triggered entry point of its own. It's invoked when staff load the dashboard.

- **Upstream:** nothing patient-side. It's downstream of everything the other five agents write — `recovery_followup_agent`'s check-ins, `healing_monitoring_agent`'s photo flags, `emergency_triage_agent`'s escalations, and `medication_reminder_agent`'s adherence data all become the signals this agent aggregates.
- **Downstream:** the staff dashboard UI. This is the backend counterpart to the "Agent Sessions / Needs attention" concept already built on the frontend at `frontend/src/app/dashboard/sessions/NeedsAttentionPage.tsx`, which today filters `frontend/src/app/dashboard/data/mockSessions.ts` for `status === "needs_attention"` against the `Session`/`SessionStatus` shape defined in `frontend/src/app/dashboard/sessions/types.ts`. This agent should be the real data source behind that page once wired up.
- It does **not** hand off to `emergency_triage_agent` itself — by the time something reaches this agent's view, any acute escalation already happened upstream (in `emergency_triage_agent`) or is a lower-urgency accumulation of signals (e.g. a declining `healing_score` or adherence trend) that warrants staff attention without being a 911-level event.

## Task flow
1. Expose query/report methods rather than a chat method — e.g. `get_needs_attention(practice_id)`, `get_recovery_overview(practice_id)`, `get_patient_detail(patient_id)`.
2. Pull all relevant `RecoveryJournal` rows for the practice. Note: `RecoveryJournal` has no direct `practice_id` column, so this requires a join through `Patient.practice_id`.
3. Compute a per-patient attention signal from the available data:
   - `RecoveryJournal.status` explicitly set to something like `"flagged"`/`"escalated"` by `emergency_triage_agent` — always surface these, unconditionally.
   - `healing_score` trend — a decline between consecutive entries.
   - `medication_adherence` below a defined threshold.
   - `checkin_completion` showing missed check-ins from `recovery_followup_agent`.
   - Staleness — a journal that hasn't been updated in longer than expected for its cadence (the patient went quiet, which is itself worth surfacing, not just an absence of data).
4. Pull recent `AgentLog` rows (filtered to this category's `agent_type` values) to attach "why is this patient flagged" reasoning to each aggregated result, and recent `PatientPhoto`-related flags from `healing_monitoring_agent`.
5. Bucket each patient into a status mirroring the frontend's existing `SessionStatus` shape (`active` / `needs_attention` / `resolved`) so the current UI contract can be satisfied directly without a frontend rework: `RecoveryJournal.status` of `"flagged"`/`"escalated"`, or a stale/missed-checkin pattern, maps to `needs_attention`; a healthy, on-cadence journal maps to `active`; a completed/closed journal maps to `resolved`.
6. Return a structured payload per patient — name, procedure, recovery day, last activity timestamp, the specific reason(s) it's flagged, and references back to the underlying `Conversation`/`Message`/`AgentLog` records for staff drill-down — effectively a backend-computed version of what `mockSessions.ts` currently hardcodes on the frontend.
7. Optionally support a practice-wide summary rollup (counts per status, average `healing_score`, adherence trend) for an overview page.
8. No `LLMService` call is required for the core aggregation logic — it's rules-based filtering over structured data. An LLM-generated natural-language summary of a patient's status for staff is a plausible future nice-to-have, not core scope.

## Data it reads
- `RecoveryJournal` — all fields, across every patient in the practice.
- `Patient` — joined for name/contact and to scope by `practice_id`.
- `PatientPhoto` — recency and any flag state (see the open question on this in `healing_monitoring_agent`'s README).
- `AgentLog` — escalation/flag history, filtered to this category's agents.
- `Conversation` / `Message` — for staff drill-down into a specific patient's interaction history.
- `Procedure` — display name for context.

## Data it writes
Nothing patient-facing — this agent is read-only against these models in its core scope. A future "staff acknowledged this flag" write-back action, if built, would be the one exception (an ORM update, no external service), and would likely need a new `reviewed_by`/`reviewed_at` field somewhere since none currently exists.

## Integrations used
None of the outbound comms services (`TwilioService`, `WhatsAppService`, `EmailService`) are needed for the core read path — this agent only queries the database via the ORM. If a future acknowledgment/review write-back feature is added, it stays a plain DB update, not an external integration.

## Escalation & guardrails
This agent doesn't decide to escalate anything to `emergency_triage_agent` — by design, that decision already happened upstream. Its guardrail is different in kind: **accuracy of surfacing, not accuracy of clinical judgment.** It must never under-report — any patient with `RecoveryJournal.status` in a flagged/escalated state must always appear in `needs_attention`, with no filtering, pagination, or query bug able to silently drop them. Treat this filtering logic as safety-adjacent even though the agent itself never talks to a patient: it's the layer that makes sure a human actually sees what the other agents flagged.

## Success criteria
- The `needs_attention` result set matches 1:1 with every `RecoveryJournal` row in a flagged/escalated state — zero silent drops, and this should be directly testable.
- Practice-wide query latency stays acceptable as patient volume grows (this is an aggregation query, not a per-patient lookup, so it needs to scale with practice size).
- Every flagged patient in the view can be traced back to the specific triggering event (`AgentLog` entry, `Conversation`/`Message`) without staff needing to guess why they're flagged.

## Current status
Stub — `recovery_dashboard_agent_services.py` has no real logic yet (`get_status()` only). Needs:
- The `RecoveryJournal`-through-`Patient` aggregation query.
- The attention-signal/threshold logic (see Open Questions — thresholds aren't defined yet).
- The status-bucketing mapping to `active`/`needs_attention`/`resolved`.
- Read-oriented router endpoints (this agent will need its own, e.g. `GET /agents/recovery_dashboard/needs-attention`, rather than the chat-style pattern other agents might use — the existing `/status`-only router/controller pattern seen in `operating_room_scheduler_agent` is a reasonable model to extend, not a chat endpoint).
- Whatever API contract connects this to the frontend's `Session`/`SessionStatus` types.

## Open questions
- `RecoveryJournal` has no direct `practice_id` — confirm the intended join path via `Patient.practice_id` is correct and performant at scale (an index on `Patient.practice_id` and `RecoveryJournal.patient_id` matters here).
- **No risk-scoring formula or thresholds are defined anywhere.** What counts as "needs attention" (e.g. how many points of `healing_score` decline, what `medication_adherence` percentage, how many missed check-ins in a row) is as much a product/clinical decision as an engineering one — recommend defining explicit, documented thresholds with the clinical/product side before building this, rather than inventing arbitrary numbers.
- The frontend dashboard currently reads entirely from `frontend/src/app/dashboard/data/mockSessions.ts` — there is no existing API contract between the frontend and any backend agent. This needs to be defined, most naturally matching the `Session`/`SessionStatus` shape already in `frontend/src/app/dashboard/sessions/types.ts` so the existing `NeedsAttentionPage.tsx`/`SessionsView` components can consume it with minimal frontend change.
- No "staff acknowledged/reviewed" write-back mechanism exists if that becomes a desired feature (currently there's no field on `RecoveryJournal` or elsewhere to record that a human looked at a flagged patient).
