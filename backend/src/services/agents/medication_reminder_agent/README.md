# Medication Reminder

## What it does
Sends timed reminders for a patient's post-op medication regimen (antibiotics, pain management, anti-nausea, etc.), tracks whether doses were confirmed taken, and escalates a pattern of missed doses or adverse-reaction reports. Structurally this mirrors `appointment_reminder_agent` in Front Desk — scheduled outbound messages with confirmation tracking — but the cadence is dose-interval-driven (every 6/8/12 hours) rather than day-milestone-driven.

## Where it fits in the patient journey
Proactive/scheduled, running alongside `recovery_followup_agent` for the same patient but on its own, tighter cadence.

- **Upstream:** a medication regimen becomes active for a patient (typically at discharge/post-op, alongside the `RecoveryJournal` created for the same procedure).
- **Downstream / handoffs:**
  - **Critical boundary:** if a patient's reply describes an adverse or allergic reaction (rash, swelling, trouble breathing, severe abdominal pain), this agent must hand off to `emergency_triage_agent` immediately rather than attempt to advise on the medication itself.
  - A non-emergency adherence problem (repeated missed doses, or the patient saying they stopped a prescribed course early) is a staff notification, not an `emergency_triage_agent` escalation — it's clinically worth a callback but not itself an acute danger signal.
  - Adherence data it writes to `RecoveryJournal.medication_adherence` feeds `recovery_dashboard_agent`.

## Task flow
1. A scheduled job (see Open Questions) determines which patients have a dose due now, based on each patient's active regimen (name, dose, frequency, start/end date — see Open Questions on where this data lives, since there's no dedicated medication model yet).
2. Send a reminder via `TwilioService.send_sms()` or `WhatsAppService.send_text()`, e.g. "Time to take your [medication] — reply TAKEN or SKIP." Log it as an outbound `Message` on a `Conversation` (`agent_type="medication_reminder"`).
3. Parse the reply. Simple keyword matching first (TAKEN/YES/DONE vs. SKIP/NO/LATER); fall back to `LLMService.chat(messages, system_prompt, tier="low")` for free-text replies ("took it late," "ran out," "feeling nauseous after this one") — this is routine categorization, low tier is appropriate.
4. Before recording anything, screen the reply for adverse-reaction language (see Escalation). If it trips, hand off to `emergency_triage_agent` immediately and stop — do not attempt to record the dose or advise on whether to keep taking the medication.
5. Update `RecoveryJournal.medication_adherence` for the patient's active journal — define this as a rolling percentage of confirmed doses against expected doses over the tracking window (e.g. trailing 7 days).
6. Append the dose event to `RecoveryJournal.notes` (JSONB), e.g. `notes["medications"]["events"].append({"med": ..., "scheduled_at": ..., "confirmed": true/false, "reply": ...})`.
7. If the patient has skipped 2+ consecutive doses of the same medication, or explicitly says they've stopped taking it, notify staff via `TwilioService.send_sms()` to a front-desk/provider `User` — this is an adherence concern for staff follow-up, not an emergency escalation.
8. If there's no reply within a grace window, send one follow-up reminder; if still nothing, log the dose as missed and move on rather than repeatedly re-sending — silence should be visible to staff as a pattern (via `recovery_dashboard_agent`), not chased indefinitely by the bot.
9. Write an `AgentLog` entry per reminder sent and its outcome (confirmed / skipped / missed / escalated).

## Data it reads
- `Patient` — contact info.
- `RecoveryJournal` — existing `medication_adherence`, and the regimen stored in `notes` (see Open Questions).
- `Procedure` — typical post-op medication protocol, if that's modeled per procedure.
- `AgentConfig` — reminder cadence and quiet-hours configuration.

## Data it writes
- `RecoveryJournal.medication_adherence` — updated rolling adherence percentage.
- `RecoveryJournal.notes` — dose event log.
- `Conversation` / `Message` — reminder and reply exchange.
- `AgentLog` — one entry per reminder cycle outcome.

## Integrations used
- `TwilioService.send_sms()` / `WhatsAppService.send_text()` — reminders and staff adherence-alert notifications.
- `LLMService.chat(messages, system_prompt, tier="low")` — parsing free-text confirmation replies. The adverse-reaction screen itself should be treated as safety-relevant even at this stage — if keyword matching alone isn't reliable enough, that check should use `tier="high"`, distinct from the routine confirmation parsing.
- `EmailService.send()` — fallback channel if no phone/WhatsApp is on file.

## Escalation & guardrails
Hand off to `emergency_triage_agent` immediately, with no attempt at medication advice, if a reply contains: hives or rash, facial/throat swelling, difficulty breathing, severe abdominal pain, vomiting blood, or any other language suggesting an allergic or adverse drug reaction.

Non-emergency but staff-notification-worthy: 2+ consecutive missed doses of the same medication, or the patient stating they've stopped a prescribed course early (particularly antibiotics, where early discontinuation is a clinical concern worth a callback even though it isn't acutely dangerous).

This agent never tells a patient to skip, delay, double up on, or otherwise adjust a dose — any question along those lines gets redirected to staff, not answered.

## Success criteria
- Dose confirmation response rate (what fraction of reminders get a TAKEN/SKIP reply).
- `RecoveryJournal.medication_adherence` trending accurately and visibly for `recovery_dashboard_agent`.
- Staff notified within one reminder cycle of a missed-dose streak forming.
- Zero adverse-reaction reports handled by this agent without an `emergency_triage_agent` hand-off, verified on audit.

## Current status
Stub — `medication_reminder_agent_services.py` has no real logic yet (`get_status()` only). Needs:
- A scheduled job runner (same scheduler gap as `recovery_followup_agent` — no Celery task/beat schedule exists yet).
- A defined home for regimen data (see Open Questions).
- The confirmation-parsing prompt and the adverse-reaction screen.
- The hand-off call into `emergency_triage_agent`.
- The missed-dose-streak staff notification logic.

## Open questions
- **No `Medication`/`Prescription` model exists in the repo.** Regimen data (drug name, dose, frequency, start/end date) needs somewhere to live. Recommend, for v1, storing it in `RecoveryJournal.notes["medications"]` as a list of `{name, dose, frequency_hours, start_date, end_date}` entries set at discharge, with a dedicated model as a likely follow-up once this is proven out.
- Same scheduler gap noted in `recovery_followup_agent`: `celery` is in `requirements.txt`, Redis is configured, but there is no Celery app/task/beat scaffolding in `src/` yet.
- `RecoveryJournal.medication_adherence` is typed `Integer` in the model despite representing what's presumably a percentage — confirm intended representation before writing to it.
- No patient-level timezone/quiet-hours handling is defined — `Practice.timezone` exists at the practice level, but reminders timed by local dose schedule need to know the patient's own timezone, which isn't tracked on `Patient` today.
