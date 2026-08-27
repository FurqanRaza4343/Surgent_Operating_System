# Appointment Reminder

## What it does
Proactively reminds patients about upcoming consultations at timed intervals
(e.g. 48h and 24h out), tracks whether they confirmed, and escalates
unconfirmed appointments to front-desk staff before it's too late to fill the
slot from a waitlist.

**This agent is proactive/scheduled, not reactive.** Unlike the other four
agents in this category, it is never invoked by an inbound patient message or
webhook. It is triggered by a background job querying the database on a
schedule — the project's worker layer (`celery` is in
`backend/requirements.txt`; `frontend/system.md`'s architecture notes also
describe a `workers/` layer with `async_reminder_worker.py` and a
`rabbitmq_consumer.py` for async jobs like reminders). Whichever mechanism is
used, this service's methods should be pure "given a time window, find and
remind" functions that a scheduler calls — they should not assume an HTTP
request/response cycle the way the other four agents' `process_message`-style
entry points do.

## Where it fits in the patient journey
- **Triggered by:** a scheduled job run (e.g. hourly), not a patient action.
  Each run queries `Appointment` rows where `status IN (SCHEDULED,
  CONFIRMED)` and `start_time` falls within a reminder window (typically
  ~48h and ~24h out — exact windows should be configurable per practice).
- **Right before it:** `appointment_booking_agent` created the appointment at
  some earlier point; this agent runs independently of that, purely off
  `Appointment.start_time`.
- **Right after it:** if the patient confirms, nothing further — the
  appointment stays `CONFIRMED`. If the patient wants to change/cancel in
  response to the reminder, that reply should route to
  `reschedule_cancellation_agent` (the reminder message itself doesn't handle
  the change, but the reply-handling path needs to recognize "can't make it"
  and hand off rather than dead-ending in an unmonitored inbox).
- **Escalates to:** front-desk staff (human) when a reminder gets no response
  as the appointment time approaches, so a person can call the patient
  directly.

## Task flow
1. Scheduled job fires (e.g. every hour) and queries `Appointment` for rows
   with `status IN (SCHEDULED, CONFIRMED)` and `start_time` inside a
   reminder window relative to now (48h window, 24h window — each fires once
   per appointment, so track which reminders have already been sent to avoid
   duplicates — see Open Questions on where that state lives).
2. For each appointment due a reminder, load the associated `Patient` for
   contact info (`email`, `phone`) and `Practice` for practice name/address/
   timezone to build the reminder content.
3. Compose the reminder message (LLM-generated or templated — templated is
   probably sufficient and cheaper for a message this structured; if LLM is
   used, `tier="low"` is a reasonable choice since this is not a
   conversation, just a fill-in-the-blanks notice).
4. Send via the patient's preferred/available channel: SMS
   (`TwilioService.send_sms`), WhatsApp (`WhatsAppService.send_text`), or
   email (`EmailService.send`). Include a clear call to action ("Reply YES to
   confirm, or call us to reschedule").
5. Record that this reminder was sent — which appointment, which window (48h/
   24h), timestamp — so the next job run doesn't resend it and so
   non-response can be measured. (`Appointment.notes` or a new field/log is
   needed here — no dedicated reminder-tracking model exists today, see Open
   Questions.)
6. Listen for/ingest the patient's response (a reply SMS/WhatsApp message
   arriving via the normal inbound webhook path): if it reads as a
   confirmation, update `Appointment.status = AppointmentStatus.CONFIRMED`.
   If it reads as a cancellation/reschedule request, route to
   `reschedule_cancellation_agent` instead of handling it here.
7. As the appointment time gets close (e.g. inside the 24h window) with no
   response and status still `SCHEDULED` (not `CONFIRMED`), escalate: notify
   front-desk staff (email/SMS to a staff `User`, or a flagged item on the
   staff dashboard) so a human can call the patient directly. Write an
   `AgentLog` entry for this escalation.
8. If an appointment time passes with `status` still `SCHEDULED`/`CONFIRMED`
   and the patient never showed, a later job (or `reschedule_cancellation
   `/staff action) marks it `AppointmentStatus.NO_SHOW` — worth noting this
   agent is the natural place to also run that sweep, though it's a distinct
   responsibility from sending reminders.

## Data it reads
- `Appointment` — `status`, `start_time`, `patient_id`, `practice_id`,
  `appointment_type` — the core query driving every run of this agent.
- `Patient` — `email`, `phone` for delivery.
- `Practice` — name, address, `timezone` (reminders must be composed and
  scheduled in the practice's local timezone, not UTC/server time).
- `AgentConfig` (agent_type="appointment_reminder") — reminder window
  configuration (which offsets: 48h, 24h, others), channel preference,
  escalation threshold.

## Data it writes
- `Appointment` — `status` updated to `CONFIRMED` on patient confirmation
  (and potentially `NO_SHOW` if this agent also owns the post-appointment
  sweep).
- Reminder-sent tracking — needs a place to live; see Open Questions.
- `AgentLog` (agent_type="appointment_reminder") — one entry per reminder
  sent and per escalation raised, for no-show-rate reporting.
- `Conversation` / `Message` — if reminder sends and patient replies are
  modeled as a conversation thread (recommended, so the reply-routing in
  step 6 has context to work with).

## Integrations used
- `TwilioService.send_sms` — SMS reminders.
- `WhatsAppService.send_text` — WhatsApp reminders.
- `EmailService.send` — email reminders.
- `LLMService.chat(messages, system_prompt, tier="low")` — optional, for
  composing reminder copy or interpreting a free-text reply as confirm/
  cancel intent. `tier="low"` fits both: low-stakes phrasing generation, and
  classifying "yes"/"can't make it" doesn't need the expensive model.
- The scheduler/worker layer itself (Celery per `requirements.txt`, or the
  RabbitMQ-based workers described in `frontend/system.md`) — this is
  infrastructure this agent depends on but does not implement itself.

## Escalation & guardrails
- A no-response appointment close to its start time (e.g. inside the 24h
  window, or a practice-configured threshold) must escalate to a human staff
  member — don't let it silently ride to no-show.
- Never auto-cancel an appointment just because a reminder went unanswered —
  only a patient's explicit reply or staff action should cancel; silence is
  an escalation trigger, not a cancellation trigger.
- Respect channel opt-outs/quiet hours if the practice or patient has
  configured them — sending a 6am SMS is a real complaint risk (no such
  config exists yet; flagging as a build consideration, not a current gap).
- Idempotency matters more here than in reactive agents: a job that reruns
  or double-fires must not send the same reminder twice — the "already sent"
  check (step 5) is a correctness requirement, not a nice-to-have.

## Success criteria
- No-show rate reduction, measured before/after this agent is live (this is
  the agent's entire reason for existing — track it explicitly).
- Reminder delivery success rate (SMS/WhatsApp/email send failures should be
  visible, not silent).
- Confirmation response rate per window (48h vs 24h) to tune which windows
  are actually effective.
- Escalations actually reach staff with enough lead time to act (e.g. no
  escalation firing 10 minutes before an appointment when a phone call could
  no longer help).

## Current status
Stub — `appointment_reminder_agent_services.py` has no real logic yet. It
only has `get_status()`. Needs:
- The scheduled-job entry point itself (a Celery task / worker script that
  calls into this service on a timer — nothing currently calls this service
  at all, since the only wiring visible in the codebase is an HTTP router
  with a `/status` endpoint).
- The due-reminders query (`Appointment` filtered by status + time window).
- Reminder composition and multi-channel send logic
  (`TwilioService`/`WhatsAppService`/`EmailService`).
- Reminder-sent tracking to prevent duplicate sends across job runs.
- Confirmation-reply ingestion and `Appointment.status` update.
- No-response escalation to staff.

## Open questions
- Where does "which reminders have already been sent for this appointment"
  get tracked? No dedicated model exists (`Appointment` has no
  `reminder_sent_at`/`reminders_sent` field, and there's no separate
  `Reminder` model). Needs either new columns on `Appointment`, a new model,
  or encoding it into `AgentLog.details` and querying that back (workable
  but awkward for a hot-path idempotency check).
- Confirmed: is Celery (per `requirements.txt`) or the RabbitMQ worker
  pattern described in `frontend/system.md` the actual intended scheduler
  for this agent? Both are present in the repo's dependencies/docs; the
  builder should confirm which one this service is meant to plug into before
  wiring the entry point.
- How does an inbound "YES"/"can't make it" SMS reply get routed back to
  this agent's confirmation logic vs. `receptionist_agent`'s general inbound
  handling? The Twilio SMS webhook is a single shared entry point today
  (`POST /webhooks/twilio/sms`), so reply routing needs a disambiguation
  rule (e.g. "is there a pending reminder for this phone number's most
  recent appointment").
- Does this agent also own the no-show sweep (marking past appointments
  `NO_SHOW`), or is that a separate job/agent? Not specified; assumed here to
  be a natural extension but worth an explicit decision.
