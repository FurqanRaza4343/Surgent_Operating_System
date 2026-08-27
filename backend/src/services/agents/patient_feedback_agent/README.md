# Patient Feedback Agent

## What it does
Automatically reaches out to patients after their visit or recovery closes out to collect an NPS/satisfaction rating, and for happy patients, nudges them toward leaving a public review. It's proactive and scheduled, not something a patient initiates.

## Where it fits in the patient journey
Triggered by one of two closing events: an `Appointment` flipping to `COMPLETED` status (for consults/minor procedures), or a `RecoveryJournal` reaching a "discharge"/completed `status` (for surgical patients being tracked through recovery — coordinating with whatever agent owns that journal, e.g. `recovery_followup`/`healing_monitoring`). It runs after those agents are done with the patient and has no further clinical handoff — its output (a satisfaction score) mainly feeds `analytics_dashboard` and informs staff/marketing (e.g. a low score might trigger a service-recovery follow-up by staff, a high score might feed `marketing_followup`'s referral/review-request material later).

## Task flow
1. Watch for trigger events: `Appointment.status` transitions to `COMPLETED`, or `RecoveryJournal.status` transitions to a terminal/discharge state. A short delay (e.g. same-day for consults, a few days post-discharge for surgical recovery) before sending is typical so the survey lands after the patient has had a moment to reflect, not immediately at checkout.
2. Check that this patient/appointment hasn't already received a feedback request (avoid duplicate sends — needs a dedup check against prior `AgentLog`/`Message` history for this `agent_type` + `patient_id`/`appointment_id`).
3. Send a short survey via the patient's preferred channel — `TwilioService.send_sms()` for a 1-question NPS ("On a scale of 0-10, how likely are you to recommend us?") or `EmailService.send()` for a slightly longer form with an NPS question plus an optional comment field.
4. Capture the response. If the intake channel is conversational (SMS reply, web widget), use `LLMService.chat(..., tier="low")` only to parse/normalize a free-text reply into a numeric score and optional comment — not to have an open-ended conversation about it.
5. Branch on score:
   - High score (e.g. 9-10, or practice-configured threshold): reply with a thank-you and a direct link to the practice's Google/Yelp review page (a plain URL stored in `Practice.settings`, no API integration needed — this is just link-sharing, not a Google/Yelp API integration).
   - Low/neutral score: do not push for a public review; instead flag for staff follow-up (service recovery) rather than escalating publicly.
6. Store the result (score + optional comment) — see Data it writes for the schema gap.
7. Log the outreach and outcome as an `AgentLog` entry regardless of whether the patient responds, so `analytics_dashboard` can compute response rates, not just average scores.

## Data it reads
- `Appointment`: `status`, `patient_id`, `practice_id`, `end_time` — to detect completion and time the outreach.
- `RecoveryJournal`: `status`, `patient_id`, `surgery_date` — to detect discharge/completion for surgical patients.
- `Patient`: `phone`, `email`, `first_name` — for outreach delivery and personalization.
- `Practice`: `settings` (for the review-platform URL(s), survey tone/branding).

## Data it writes
- No dedicated feedback/NPS table exists in the current schema (`src/models/` has no `Feedback`/`Review`/`Survey` model). A new model is the clean answer — e.g. `PatientFeedback(patient_id, appointment_id, score, comment, channel, sent_at, responded_at)` — rather than overloading `RecoveryJournal.notes` (JSONB) or `Patient.medical_history`, which are semantically about clinical recovery/history, not satisfaction.
- Until that model exists, `AgentLog` (`agent_type="patient_feedback"`, `action="survey_sent"`/`"response_received"`, `details={score, comment}`) is the only place this data can land, which is workable for an audit trail but poor for querying/reporting at scale.
- `Message` on a `Conversation` if the response comes back through an existing conversational channel.

## Integrations used
- `TwilioService.send_sms()` for SMS survey delivery.
- `EmailService.send()` for email survey delivery.
- `LLMService.chat(..., tier="low")` for parsing free-text responses into a normalized score/sentiment, if the survey isn't a strict numeric-reply format.
- No external review-platform API needed — the Google/Yelp review nudge is just a static URL from `Practice.settings`, not an integration.

## Escalation & guardrails
- Low scores should never be met with a scripted "thanks!" that papers over the complaint — route to a staff `AgentLog`-flagged item for human service-recovery outreach. This isn't a money/billing agent, but reputational risk (an unresolved unhappy patient) still deserves a low bar for human involvement.
- Do not send a review-request link to a patient who scored low/neutral — steering an unhappy patient toward a public review platform is counterproductive and could backfire publicly.
- Respect channel opt-outs/consent (`Patient.consent_status`) — don't survey a patient who has opted out of communications.
- Avoid survey fatigue — dedup logic (step 2) must prevent multiple feedback requests for the same appointment/discharge event.

## Success criteria
- Survey response rate (sent vs. responded) tracked and trending upward with tuning of timing/channel/copy.
- Average NPS/satisfaction score visible on the dashboard and trending over time per practice, ideally per procedure/provider.
- Low-score responses reliably reach a human within a defined SLA (e.g. same business day), not just logged and forgotten.
- Zero duplicate survey sends for the same appointment/discharge event.

## Current status
Stub — `patient_feedback_agent_services.py` only has `get_status`. Needs:
- Trigger detection logic (polling or event-driven) on `Appointment.status` and `RecoveryJournal.status` transitions.
- Send logic (SMS/email) with dedup checks.
- Response capture/parsing logic.
- Score-based branching (review-link vs. staff escalation).
- A proper feedback storage model (see Data it writes).

## Open questions
- No `Feedback`/`Review`/`NPS` model exists yet — needs to be added to `src/models/` rather than shoehorning satisfaction data into `AgentLog.details` long-term.
- No scheduled-job/cron infrastructure was confirmed in this pass of the codebase — trigger detection (e.g. "an appointment completed N hours ago") likely needs a polling job or event hook on `Appointment`/`RecoveryJournal` writes; needs an infra decision shared with `marketing_followup` and `analytics_dashboard` (all three want some form of scheduled execution).
- Where does the review-platform URL live? `Practice.settings` (JSONB) is the natural spot but no schema/convention for it exists yet — needs a defined key, e.g. `{"review_links": {"google": "...", "yelp": "..."}}`.
- Timing rules (how many hours/days post-completion to send) are currently unspecified — likely practice-configurable via `AgentConfig.config`.
