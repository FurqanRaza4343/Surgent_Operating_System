# Appointment Booking

## What it does
Turns a confirmed "I want to book a consultation" intent into an actual
calendar hold: checks real availability, proposes concrete time slots, and
creates both the Google Calendar event and the `Appointment` record —
guaranteeing the practice never double-books.

## Where it fits in the patient journey
- **Triggered by:** a handoff from `receptionist_agent` once it has
  established booking intent and captured the patient's name + reason for
  contact, OR a direct booking request via web chat / patient portal that
  skips the receptionist entirely.
- **Right before it:** `receptionist_agent` (phone/WhatsApp/Instagram/web
  chat) or the patient portal's own booking UI.
- **Right after it:** `appointment_reminder_agent` picks up the newly created
  `Appointment` and schedules its 48h/24h reminder checks.
  `multilingual_translation_agent` sits underneath this agent transparently
  if the patient isn't communicating in English.
- **Hands off to:** none further downstream in normal flow — booking is a
  terminal, successful outcome of the conversation. If the patient later
  wants to change the booking, that goes to `reschedule_cancellation_agent`
  instead (this agent does not handle modifications to existing
  appointments).

## Task flow
1. Receive booking context: `Patient` identity (existing or newly created by
   `receptionist_agent`), desired procedure/consultation type, and any
   patient-stated time preference ("next week", "mornings only").
2. Resolve which calendar to check — per-provider or per-practice
   `calendar_id`, and the OAuth `access_token` needed to construct
   `CalendarService(access_token=...)`. (See Open Questions — token storage/
   refresh isn't defined yet.)
3. Call `CalendarService.list_events(calendar_id, max_results)` to pull the
   actual current schedule. This is the **source of truth** — never assume a
   slot is free without this call, and never book off of stale/cached
   availability.
4. Compute open slots by diffing the practice's bookable hours (from
   `Practice.settings`) against the busy blocks returned by `list_events()`.
   Apply the appointment-type duration (e.g. 30 min consult vs. 60 min
   procedure review) to size candidate slots correctly.
5. Propose 2-3 concrete slots to the patient via the active channel (LLM-
   generated natural language, e.g. "I have Tuesday at 2pm, Wednesday at
   10am, or Thursday at 4pm — which works?").
6. On patient confirmation, **re-check availability immediately before
   writing** (`list_events()` again, or at minimum re-validate against the
   in-flight booking) to close the race window where two patients pick the
   same slot in parallel conversations.
7. Call `CalendarService.create_event(summary, start_time, end_time,
   calendar_id)` to place the hold on the real calendar.
8. Create the `Appointment` row: `patient_id`, `practice_id`,
   `appointment_type`, `status=AppointmentStatus.SCHEDULED`, `start_time`,
   `end_time`, optional `notes` (reason for visit, source channel).
9. Send a confirmation message on the same channel the conversation happened
   on — SMS via `TwilioService.send_sms`, WhatsApp via
   `WhatsAppService.send_text`, or email via `EmailService.send` — including
   date/time, practice address, and any prep instructions.
10. Log the booking outcome to `Conversation`/`Message` (agent reply recorded)
    and `AgentLog` (`action="appointment_booked"`, details = appointment id +
    slot chosen).

## Data it reads
- `Patient` — identity, `email`/`phone` for confirmation delivery.
- `Appointment` — indirectly, via `CalendarService.list_events()` which is
  the actual availability source (the calendar, not the DB, is authoritative
  for busy/free — though existing `Appointment` rows should agree with it).
- `Practice.settings` — bookable hours, calendar id, timezone.
- `AgentConfig` (agent_type="appointment_booking") — enabled flag, any
  practice-specific booking rules (e.g. min notice period, max days out).

## Data it writes
- `Appointment` — new row per booking, `status=SCHEDULED`.
- `Conversation` / `Message` — the booking exchange, if not already logged by
  the calling agent.
- `AgentLog` (agent_type="appointment_booking") — one entry per successful
  (or failed/abandoned) booking attempt.
- `Patient` — may create the row if this agent is entered directly without
  going through `receptionist_agent` first.

## Integrations used
- `CalendarService.list_events(calendar_id, max_results)` — availability
  check (the core "no double-booking" guarantee).
- `CalendarService.create_event(summary, start_time, end_time, calendar_id)`
  — writes the calendar hold.
- `LLMService.chat(messages, system_prompt, tier="high")` — natural-language
  slot proposal and confirmation parsing. Booking is a real transaction, so
  keep this off the low tier.
- `TwilioService.send_sms` — SMS confirmation.
- `WhatsAppService.send_text` — WhatsApp confirmation.
- `EmailService.send` — email confirmation.

## Escalation & guardrails
- If `CalendarService` calls fail (expired OAuth token, API error), do not
  silently "assume" a slot is free — fail loudly to the patient ("let me get
  a staff member to confirm your time") and escalate rather than risk a
  double-booking.
- Never create an `Appointment` without a corresponding successful
  `create_event()` call, and never confirm a calendar event without the
  matching `Appointment` row — the two must stay in sync or reconciliation
  becomes impossible.
- Re-verify availability at write time (step 6 above) — proposing a slot and
  booking it are two different calendar reads separated by a conversation
  turn; treat that gap as a real race condition, not a formality.
- PII: confirmation messages go out over SMS/WhatsApp/email to whatever
  contact info is on file — verify it belongs to the patient in this
  conversation before sending, especially if the patient was newly created
  mid-conversation.

## Success criteria
- Zero double-bookings — every `Appointment.status=SCHEDULED` row has a
  corresponding, non-conflicting calendar event.
- Booking completion rate: percentage of "wants to book" intents that reach
  a created `Appointment` without human intervention.
- Time-to-confirmation: how long from intent detected to confirmation sent.
- No orphaned records: no `Appointment` without a calendar event, no calendar
  event without an `Appointment`.

## Current status
Stub — `appointment_booking_agent_services.py` has no real logic yet. It only
has `get_status()`. Needs:
- `LLMService` and `CalendarService` wiring (currently no imports at all).
- Availability computation logic (bookable-hours vs. busy-blocks diffing).
- Slot proposal + confirmation conversation flow.
- `Appointment` row creation logic.
- Confirmation send-out via `TwilioService`/`WhatsAppService`/`EmailService`.
- `AgentLog` write-through.
- A defined handoff contract from `receptionist_agent` (what context gets
  passed: patient id, intent summary, conversation id).

## Open questions
- Where does the per-practice/per-provider Google OAuth `access_token` for
  `CalendarService` come from and how is it refreshed? No token storage/
  refresh mechanism is visible in the current codebase — this needs a home
  (likely a field on `Practice` or `User`, or a separate `OAuthCredential`
  model that doesn't exist yet).
- Is there one shared practice calendar or one calendar per provider
  (`Appointment.provider_id` exists, suggesting per-provider scheduling is
  intended)? This changes how `calendar_id` is resolved.
- What defines "bookable hours" — is that data expected to live in
  `Practice.settings` (JSONB, currently untyped) or a dedicated schedule
  model? Needs a concrete shape before availability math can be written.
