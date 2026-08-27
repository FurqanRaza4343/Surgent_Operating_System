# Recovery Follow-up

## What it does
Proactively checks in on a patient's recovery at defined post-op milestones (day 1, 3, 7, 14, 30 by default, adjustable per `Procedure`), asks a short structured set of questions about pain, mobility, wound appearance, and general wellbeing, and writes the answers to `RecoveryJournal`. This is the scheduling backbone of the whole Post-Surgery Care category — most other agents in this folder either feed off what this agent writes or are triggered because of what it finds.

## Where it fits in the patient journey
Triggered by a scheduled job, not by the patient. Once an `Appointment` for a surgical procedure is marked `AppointmentStatus.COMPLETED`, a `RecoveryJournal` row should exist (or get created here) for that patient/procedure, and this agent becomes responsible for checking in on it on a cadence until the journal's `status` moves to something terminal (e.g. `"completed"`/`"resolved"`).

- **Upstream:** surgery completion (an `Appointment` moving to `COMPLETED`, or staff manually starting a recovery journal).
- **Downstream / handoffs:**
  - If the patient's answers suggest a photo would help document wound appearance, this agent should prompt the patient to submit one and let `healing_monitoring_agent` take it from there when the photo arrives — it does not process images itself.
  - **Critical boundary:** if any answer during a check-in contains red-flag symptom language (see Escalation below), this agent must **stop the questionnaire immediately** and hand off to `emergency_triage_agent`. It must not try to reassure the patient, ask a follow-up clarifying question, or finish collecting the rest of the checklist first — the unanswered questions can wait, a possible emergency cannot.
  - Missed/incomplete check-in patterns and adherence trends it writes to `RecoveryJournal` are what `recovery_dashboard_agent` reads to build its staff-facing "needs attention" view.

## Task flow
1. A scheduled job (see Open Questions — no scheduler is wired up yet) runs periodically and queries active `RecoveryJournal` rows to find patients due for a check-in today, based on `recovery_day` and the cadence for their `procedure_id` (default milestone list, overridable via `AgentConfig.config` per practice/procedure).
2. Resolve the patient's contact channel (SMS by default via `Patient.phone`; prefer WhatsApp if the patient has an existing WhatsApp `Conversation`).
3. Find or create a `Conversation` (`agent_type="recovery_followup"`, `channel=...`) for this patient/check-in thread.
4. Send the check-in as a short structured prompt — e.g. "How's your recovery going? Reply with: 1) pain level 0-10, 2) how's mobility, 3) how does the incision look, 4) anything worrying you?" — via `TwilioService.send_sms()` or `WhatsAppService.send_text()`. Log the outbound text as a `Message` (`role=MessageRole.AGENT`) on the `Conversation`.
5. When the patient replies, log it as a `Message` (`role=MessageRole.PATIENT`), then parse it into structured fields. Simple numeric/keyword answers can be parsed directly; free-text replies should go through `LLMService.chat(messages, system_prompt=<extraction prompt>, tier="low")` to extract pain level, mobility description, wound description, and overall sentiment — this is routine categorization, not a clinical judgment call, so low tier is appropriate here specifically.
6. Before anything else is written, run the reply through the red-flag screen described in Escalation. If it trips, stop this flow and hand off to `emergency_triage_agent` with the raw patient message and context (patient id, procedure, recovery day) — do not continue to step 7.
7. Find or create today's entry in the patient's `RecoveryJournal` row: update `recovery_day`, compute/update `healing_score` from the pain/mobility/wound answers (define a simple heuristic, e.g. weighted 0–100 composite — see Open Questions), update `checkin_completion` (this check-in counted), and append the structured answers into `notes` (JSONB) under a dated key, e.g. `notes["checkins"]["2026-08-24"] = {...}`.
8. If the patient's wound-related answer suggests visual documentation would help, ask them to text/upload a photo and let `healing_monitoring_agent` handle the inbound image when it arrives.
9. Write an `AgentLog` row (`agent_type="recovery_followup"`, `action="checkin_sent"` or `"checkin_completed"`, `details` = summary of what happened).
10. If the patient doesn't respond within a grace window (e.g. 24h), send one follow-up reminder. If still no response, mark the check-in as missed (reduce `checkin_completion`) rather than retrying indefinitely — a pattern of missed check-ins should be visible to staff via `recovery_dashboard_agent`, not silently dropped.

## Data it reads
- `Patient` — contact info, `practice_id`.
- `Appointment` — to know a procedure completed and when.
- `Procedure` — `category`/`name` to pick the right check-in cadence and question set.
- `RecoveryJournal` — existing row for this patient/procedure to know `recovery_day`, last check-in, current `status`.
- `AgentConfig` — per-practice/per-procedure cadence overrides (`config` JSONB).
- `Conversation` / `Message` — prior check-in history for context.

## Data it writes
- `RecoveryJournal` — `recovery_day`, `healing_score`, `medication_adherence` (if the check-in touches on it), `checkin_completion`, `notes` (JSONB check-in log), `status`.
- `Conversation` + `Message` — the check-in exchange.
- `AgentLog` — one entry per check-in sent/completed/missed.

## Integrations used
- `TwilioService.send_sms()` / `WhatsAppService.send_text()` — outbound check-in prompts and reminders.
- `EmailService.send()` — fallback channel if no phone/WhatsApp on file.
- `LLMService.chat(messages, system_prompt, tier="low")` — parsing free-text patient replies into structured fields. Escalation-relevant classification is **not** done here at low tier — see step 6, which routes to `emergency_triage_agent`, whose own logic always runs at `tier="high"`.

## Escalation & guardrails
Any of the following in a patient's reply must stop the questionnaire and hand off to `emergency_triage_agent` immediately, not just get logged for later review:
- Severe or rapidly worsening pain (e.g. self-reported 8+/10, or pain unresponsive to prescribed medication).
- Fever, chills, or feeling "hot"/"feverish."
- Uncontrolled or heavy bleeding, or bleeding that won't stop.
- Pus, foul-smelling discharge, or a wound that has visibly opened/separated.
- Spreading redness, red streaking, or a rapidly expanding area of swelling around the incision.
- Difficulty breathing, chest pain, or fainting.
- One-sided leg swelling/pain/redness (possible DVT).
- Any language suggesting the patient is in crisis or considering self-harm.

This agent never attempts to interpret whether a symptom is "normal" or offer reassurance about a concerning symptom — that judgment belongs to `emergency_triage_agent` and ultimately the surgeon. When in doubt, escalate rather than continue the checklist.

## Success criteria
- Percentage of scheduled check-ins completed within 24 hours of being due.
- Zero missed true escalations in a periodic audit of check-in transcripts vs. what got flagged.
- `RecoveryJournal.checkin_completion` and `healing_score` trends are populated consistently enough for `recovery_dashboard_agent` to build a meaningful view.
- Reduction in staff time spent manually calling patients for routine post-op check-ins.

## Current status
Stub — `recovery_followup_agent_services.py` has no real logic yet (`get_status()` only). Needs:
- A scheduled job runner (see Open Questions — no Celery task/beat schedule exists yet despite `celery` being in `requirements.txt` and Redis configured).
- Cadence config schema (default milestones + `AgentConfig.config` override shape).
- A `RecoveryJournal.notes` JSONB schema for structured check-in answers.
- A `healing_score` computation heuristic.
- The parsing prompt for `LLMService.chat(tier="low")`.
- The actual hand-off mechanism to `emergency_triage_agent` (see Open Questions in that agent's README).
- Router/controller wiring beyond the current `/status` stub (`src/router/agents/...`, `src/controller/agents/...`, matching the pattern already used by `operating_room_scheduler_agent`).

## Open questions
- **No scheduler infrastructure exists yet.** `celery` is in `requirements.txt` and `REDIS_URL` is configured in `.env.example`, but there's no `celery` app instance, task module, or beat schedule anywhere in `src/`. This needs to be built before any proactive/scheduled agent (this one and `medication_reminder`) can actually run.
- `RecoveryJournal` has no discrete `pain_level`/`mobility`/`wound_description` columns — only `notes` (JSONB), `healing_score` (Integer), `medication_adherence` (Integer), `checkin_completion` (Integer). Structured check-in data has to live in `notes` under an agreed schema; worth confirming with the team before building, since `recovery_dashboard_agent` will need to read the same schema.
- `medication_adherence` and `checkin_completion` are typed `Integer` in the model despite the naming suggesting a percentage/float — confirm intended representation (0–100 int vs. a `Numeric`/float column) before writing to them.
- No cross-agent hand-off mechanism exists in the codebase yet (direct Python call between service classes vs. an internal API vs. a message queue). Given the emergency hand-off needs to be immediate, this should be a direct/synchronous call, not queued — needs to be decided once, since every agent in this category depends on it.
- No defined mapping from `Patient` to a "preferred contact channel" — currently only `phone` and `email` columns exist; channel selection logic (SMS vs. WhatsApp vs. email) needs a rule or a stored preference.
