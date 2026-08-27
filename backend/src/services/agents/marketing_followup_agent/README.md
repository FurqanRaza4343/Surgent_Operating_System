# Marketing Follow-up Agent

## What it does
Proactively re-engages **dormant/cold leads** — patients or prospects with no recent activity — with a scheduled outreach message, trying to win back interest that went quiet. It is not a real-time responder; nothing a patient does directly triggers it.

## Where it fits in the patient journey
This agent sits outside the live conversation loop. It's triggered on a schedule (e.g. daily/weekly job) that scans for `Patient` records whose most recent `Conversation`/`Message` activity is older than a configurable threshold (e.g. 14/30/60 days) with no completed `Appointment` or paid `Invoice` in between — i.e., a lead that went cold before converting. It's the "win-back" counterpart to `lead_nurturing`, which handles the opposite end: fresh inbound leads still actively engaging. When this agent's outreach succeeds and the patient replies, ownership of the conversation should hand back to `lead_nurturing` (or directly to `appointment_booking` if the patient is ready to book) — this agent's job is just to restart the conversation, not to carry it.

**Explicit distinction from `lead_nurturing`**: `lead_nurturing` is reactive and handles fresh inbound messages in real time (e.g. a new Instagram DM asking about pricing). `marketing_followup` is proactive/scheduled and only ever targets leads that have gone quiet — the two should never both be actively messaging the same patient at the same time; a lead is either "currently engaged" (nurturing's territory) or "gone cold" (this agent's territory), and a dedup/state check should enforce that.

## Task flow
1. On a scheduled run, query for `Patient` records (per practice) where the latest associated `Conversation.updated_at`/latest `Message.created_at` is older than the configured dormancy threshold, and there's no `Appointment` with `status` in (`SCHEDULED`, `CONFIRMED`, `COMPLETED`) in a relevant recent window — i.e., truly cold, not just between visits.
2. Exclude patients who have opted out (`Patient.consent_status`) or who already have an active `Conversation` with `is_active=True` (would indicate they're not actually dormant, or another agent — likely `lead_nurturing` — already has them).
3. Segment the list if possible — e.g. leads who previously asked about a specific procedure (inferable from prior `Conversation.agent_type`/`Message.content` or an earlier `cost_estimation` quote logged in `AgentLog`) get a more relevant, personalized nudge than a generic "still interested?" message.
4. Generate re-engagement copy — a short, low-pressure message, ideally referencing what they previously asked about if known. `LLMService.chat(..., tier="low")` is appropriate for drafting variation on a template, not for open-ended reasoning.
5. Send via `EmailService.send()` and/or `WhatsAppService.send_text()` depending on which channel the patient previously used (`Conversation.channel`) and has consented to.
6. Create a new `Conversation` (or reactivate context on the existing one) so any reply is tracked as a fresh thread, and log the send as a `Message` (role=agent).
7. Cap re-engagement attempts per lead (e.g. no more than 2-3 follow-ups over a period) to avoid harassment — track attempt count via `AgentLog` entries for that `patient_id`.
8. Log every send (`AgentLog`, `agent_type="marketing_followup"`, `action="reengagement_sent"`) for `analytics_dashboard` to measure win-back conversion.

## Data it reads
- `Patient`: `email`, `phone`, `consent_status`, `practice_id`.
- `Conversation`: `updated_at`, `is_active`, `channel`, `agent_type` — to determine dormancy and prior context.
- `Message`: `created_at`, `content` — for recency and for personalizing based on what was previously discussed.
- `Appointment`: `status`, `patient_id` — to exclude patients who already converted or have something upcoming.
- `AgentLog`: prior `marketing_followup` sends, to enforce the attempt cap and avoid re-sending too soon.

## Data it writes
- New/reactivated `Conversation` row for the re-engagement thread.
- `Message` (role=`agent`) with the outreach content.
- `AgentLog` (`agent_type="marketing_followup"`, `action="reengagement_sent"`, `details={channel, attempt_number, referenced_procedure}`).

## Integrations used
- `EmailService.send(to, subject, html_content)`.
- `WhatsAppService.send_text(to, text)`.
- `LLMService.chat(..., tier="low")` for message drafting/personalization.
- No `TwilioService.send_sms` requirement by default, though it's a reasonable additional channel if the practice prefers SMS for win-back.

## Escalation & guardrails
- Strict opt-out/consent enforcement — this is unsolicited outreach to people who went quiet, so honoring `consent_status` and any prior "stop messaging me" signal is non-negotiable, more so than for reactive agents.
- Frequency capping is a guardrail, not just a nice-to-have — repeated automated win-back messages read as spam and risk channel reputation (WhatsApp/email deliverability) for the whole practice.
- No money/billing actions happen here, so the "low bar for human review" standard that applies to `payment_invoice`/`insurance_verification` doesn't directly apply — but any reply indicating a complaint or opt-out request should immediately suppress further automated sends and, ideally, flag for a human to acknowledge.

## Success criteria
- Win-back rate: percentage of dormant leads who re-engage (reply) after outreach, and of those, percentage who convert to a booked `Appointment`.
- Opt-out/complaint rate stays low (a rising rate signals the cadence or copy needs adjusting).
- Zero overlap incidents where a "dormant" lead was actually mid-conversation with `lead_nurturing` at time of send.

## Current status
Stub — `marketing_followup_agent_services.py` only has `get_status`. Needs:
- Dormancy-detection query (the core logic — patients with stale `Conversation`/`Message` activity and no recent/upcoming `Appointment`).
- Attempt-capping/frequency logic.
- Message generation + send logic across `EmailService`/`WhatsAppService`.
- The scheduled-execution mechanism itself (see Open questions).

## Open questions
- No scheduled-job/cron infrastructure was confirmed in this pass of the codebase (e.g. Celery, APScheduler, a cloud scheduler hitting an endpoint) — this agent fundamentally needs one, and so does `patient_feedback` and parts of `analytics_dashboard`; worth solving once, shared across all three rather than per-agent.
- Dormancy threshold and max-attempt count are unspecified — likely belongs in `AgentConfig.config` per practice rather than hardcoded.
- How to avoid stepping on `lead_nurturing`'s toes precisely — needs an explicit "conversation ownership" convention (e.g. checking `Conversation.is_active` and/or a status field) so the two agents don't both message the same patient in the same window.
