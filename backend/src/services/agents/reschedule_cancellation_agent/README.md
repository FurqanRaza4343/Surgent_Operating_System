# Reschedule & Cancellation

## What it does
Lets a patient move or cancel an existing consultation in one conversation
turn — finds the real `Appointment`, updates the real calendar event, and
frees the slot up for someone else instead of letting it sit as a silent
no-show.

## Where it fits in the patient journey
- **Triggered by:** a handoff from `receptionist_agent` when a patient with
  an existing appointment says they need to change or cancel it, a direct
  reschedule/cancel request via SMS/WhatsApp reply to a reminder (see
  `appointment_reminder_agent`), or a patient-portal action.
- **Right before it:** `receptionist_agent` (for phone/chat-initiated
  changes) or `appointment_reminder_agent` (a patient replying "can't make
  it" to a reminder should route here, not dead-end).
- **Right after it:** nothing further in the happy path — the change is
  applied and confirmed. If the patient wants to pick a *new* time as part of
  a reschedule, this agent effectively re-runs the same slot-proposal
  mechanics `appointment_booking_agent` uses (see Task flow step 4) rather
  than handing off, since it already has the appointment context loaded.
- **Coordinates with:** `lead_nurturing_agent` / `marketing_followup_agent`
  — when a cancellation frees a slot, that's a real opportunity to fill it
  from a waitlist. This agent doesn't fill the slot itself, but it must
  surface the opening so those agents (or a human) can act on it.

## Task flow
1. Identify the existing appointment: match by patient identity (phone/
   email from the conversation, or `Patient` already resolved by
   `receptionist_agent`) plus the rough date/time the patient references
   ("my Thursday appointment"). Query `Appointment` where
   `patient_id=... AND status IN (SCHEDULED, CONFIRMED)` and disambiguate if
   multiple match.
2. Confirm the specific appointment with the patient before touching
   anything ("Just to confirm, that's your consultation on Thursday the 28th
   at 2pm?") — never cancel/move the wrong appointment on a guess.
3. Branch on intent:
   - **Cancel:** proceed to step 4 with no new slot needed.
   - **Reschedule:** run the same availability-check + slot-proposal logic
     `appointment_booking_agent` uses — `CalendarService.list_events()` for
     real availability, propose 2-3 alternatives, get patient confirmation.
4. Update the calendar: for cancellation, remove/cancel the calendar event;
   for reschedule, update the existing event's time (or delete + recreate via
   `CalendarService.create_event()` if the service has no update/delete
   method — see Open Questions, since only `list_events`/`create_event` are
   confirmed to exist).
5. Update the `Appointment` row: `status=AppointmentStatus.CANCELLED` for a
   cancellation, or for a reschedule either update `start_time`/`end_time` on
   the existing row or mark it cancelled and create a fresh `Appointment` —
   pick one convention and apply it consistently (see Open Questions).
6. Notify the patient of the outcome via the channel they used —
   `TwilioService.send_sms`, `WhatsAppService.send_text`, or
   `EmailService.send` — with the new time (reschedule) or a clear
   cancellation confirmation.
7. If a slot was freed (cancellation, or the old slot in a reschedule), write
   an `AgentLog` entry flagging the opening
   (`action="slot_freed"`, `details={appointment_type, start_time, end_time,
   provider_id}`) so `lead_nurturing_agent`/`marketing_followup_agent` (or a
   staff dashboard view) can offer it to a waitlisted lead. This is the real
   cross-agent coordination point for this agent — treat the freed slot as a
   signal, not just a side effect.
8. Log the conversation turn to `Conversation`/`Message`.

## Data it reads
- `Appointment` — `patient_id`, `status`, `start_time`, `end_time`,
  `appointment_type`, `provider_id` to find and identify the existing
  booking.
- `Patient` — identity match (phone/email).
- `Practice.settings` — calendar id, cancellation policy (e.g. minimum
  notice required, if the practice wants to enforce one).
- `AgentConfig` (agent_type="reschedule_cancellation") — enabled flag,
  policy config.

## Data it writes
- `Appointment` — `status` updated to `CANCELLED`, or `start_time`/
  `end_time` updated (reschedule).
- `AgentLog` (agent_type="reschedule_cancellation") — the change made, and
  specifically a `slot_freed` signal for downstream lead-filling agents.
- `Conversation` / `Message` — the exchange.

## Integrations used
- `CalendarService.list_events()` — availability check when rescheduling to
  a new time (same "never assume, always verify" rule as
  `appointment_booking_agent`).
- `CalendarService.create_event()` — to place the new event on reschedule
  (no delete/update method currently exists on `CalendarService` — see Open
  Questions).
- `LLMService.chat(messages, system_prompt, tier="high")` — identifying
  intent (cancel vs. reschedule) and conversing naturally about it.
- `TwilioService.send_sms`, `WhatsAppService.send_text`, `EmailService.send`
  — outcome notification.

## Escalation & guardrails
- Never cancel or move an appointment without an explicit, confirmed match
  to a specific `Appointment` row — ambiguous matches ("I have two things on
  Thursday") must go to a human rather than guessing.
- If the calendar update fails but the DB update would otherwise succeed (or
  vice versa), do not let the two go out of sync — treat this as a
  transaction and escalate to a human on partial failure rather than leaving
  a cancelled `Appointment` with a live calendar event or vice versa.
- Last-minute cancellations (e.g. within a practice-defined notice window)
  may need a human touch (fee policy, provider notification) — flag rather
  than silently auto-cancel if the practice has such a policy configured.
- PII: this agent handles the same identity-confirmation requirements as
  booking — don't act on an appointment based on caller ID alone without a
  second identifier.

## Success criteria
- Every cancellation/reschedule results in the calendar and `Appointment`
  row agreeing with each other — no orphaned or conflicting state.
- Time from request to confirmed change, measured end to end.
- Percentage of freed slots that get flagged (`slot_freed` `AgentLog`
  entries) vs. silently lost — this is the concrete signal that the
  cross-agent handoff to lead-filling agents is actually working.
- No double-booking introduced by a reschedule (same guarantee as booking).

## Current status
Stub — `reschedule_cancellation_agent_services.py` has no real logic yet. It
only has `get_status()`. Needs:
- `LLMService` and `CalendarService` wiring.
- Appointment lookup/matching logic (patient + fuzzy date/time → specific
  `Appointment` row).
- Cancel and reschedule flows, including the same availability-check
  discipline as `appointment_booking_agent`.
- Calendar event cancellation/update (blocked on `CalendarService` not
  having a delete/update method yet — see Open Questions).
- `Appointment.status` update logic.
- Notification send-out.
- The `slot_freed` `AgentLog` signal for downstream agents.

## Open questions
- `CalendarService` only exposes `list_events()` and `create_event()` — there
  is no method to cancel or update an existing Google Calendar event. This
  needs to be added (e.g. `delete_event(event_id, calendar_id)` /
  `update_event(...)`) before real cancellation/reschedule can work; without
  it, the agent could only fake a "cancellation" by leaving the stale event
  on the calendar, which would break the double-booking guarantee.
- Does a reschedule mutate the existing `Appointment` row's `start_time`/
  `end_time`, or cancel it and create a new row? The audit trail (`AgentLog`,
  reporting on reschedule frequency) probably wants the latter, but that
  needs a decision.
- How does `lead_nurturing_agent`/`marketing_followup_agent` actually consume
  the `slot_freed` `AgentLog` entries — polling, a dedicated query, or a
  future event bus? Not defined yet; `AgentLog` is the only mechanism
  available today.
- Cancellation policy (notice period, fees) isn't modeled anywhere currently
  — if the practice wants one enforced, it needs a home in
  `Practice.settings` or a new field.
