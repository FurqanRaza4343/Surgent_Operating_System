# Surgery Scheduling Agent

## What it does
Takes a confirmed surgical procedure decision (patient + `Procedure` + target
timeframe) and finds one concrete date/time slot where the surgeon, the
operating room, and the required equipment/implants are all simultaneously
available, then books it as an `Appointment`. It is the orchestrator for the
whole "Surgery Management" category — it does not talk to Google Calendar,
room tables, or inventory tables directly; it calls the other five agents in
this category and only commits a booking once every one of them says yes.

## Where it fits in the patient journey
Triggered after a patient has already committed to surgery — typically after
`cost_estimation_agent`, `risk_assessment_agent`, and/or a human
surgeon-consult have all cleared the patient, and financing/deposit is
handled by `payment_invoice_agent`. In practice this agent is invoked by
staff (or by `receptionist_agent` on staff's behalf) with: patient_id,
procedure_id, desired surgeon (provider_id), and a target date range.

Downstream, once it creates the `Appointment`, it hands off to:
- `pre_surgery_preparation_agent` (category: patient care) — pre-op
  instructions, fasting rules, medication holds.
- `appointment_reminder_agent` — reminder calls/texts/SMS ahead of surgery.
- `surgical_documentation_agent` — will later write the post-op record
  against this same appointment.

It depends on, in this order, per booking attempt:
1. `surgeon_calendar_agent` — "is Dr. X free at time T for duration D?"
2. `operating_room_scheduler_agent` — "is a suitable room free at time T?"
3. `equipment_checklist_agent` — "is the equipment list for this procedure
   satisfiable (in stock / not double-booked to another surgery) at time T?"
4. `implant_inventory_agent` — "do we have the implant(s) this procedure
   needs, or can we get them in time?"

If any of the four checks fails for a candidate slot, this agent should
propose the next candidate slot rather than failing outright — see Task flow.

## Task flow
1. Receive a scheduling request: `patient_id`, `procedure_id`, `provider_id`
   (surgeon), earliest/latest acceptable dates, expected duration (fall back
   to `Procedure.duration_minutes`, pad with a configurable buffer for
   turnover/cleaning), and any staff notes.
2. Validate inputs: patient exists and has `consent_status=True` (or route to
   a human if not — this agent must never book surgery for an unconsented
   patient), procedure exists and `is_active=True`, provider exists and has a
   doctor/surgeon role on `User`.
3. Generate a small set of candidate slots within the requested window
   (e.g. next N business days, working-hours only, respecting
   `Practice.timezone`).
4. For each candidate slot, in order, ask the other four agents to confirm
   availability (see Integrations). Short-circuit on the first "no" for that
   candidate and move to the next candidate — don't burn calls checking
   equipment for a slot the surgeon already rejected.
5. On the first candidate where surgeon + room + equipment + implants all
   confirm, treat this as a **tentative hold**: re-check surgeon and room
   availability one more time immediately before writing (see Escalation —
   this is the double-booking guard) to close the race-condition window
   between "checked" and "booked."
6. Create the `Appointment` row: `practice_id`, `patient_id`,
   `provider_id`, `appointment_type` set to something surgery-specific (e.g.
   `"surgery:{procedure.name}"` or a dedicated enum value — see Open
   questions), `status=SCHEDULED`, `start_time`/`end_time` from the
   confirmed slot, `notes` summarizing procedure + room + any special
   equipment.
7. Call `surgeon_calendar_agent` to write the confirmed event to the
   surgeon's Google Calendar (`create_event`), call
   `operating_room_scheduler_agent` to commit the room hold, call
   `equipment_checklist_agent`/`implant_inventory_agent` to convert their
   holds into reservations tied to the new `Appointment.id`.
8. If step 7 partially fails after the `Appointment` is already created
   (e.g. calendar write fails), roll back: cancel the `Appointment`
   (`status=CANCELLED`) and release any holds taken in step 5/7, then
   escalate to staff rather than leaving an inconsistent booking.
9. Write an `AgentLog` row recording the decision (candidate slots tried,
   which one won, which sub-agents confirmed) for audit/debugging.
10. Notify the patient (via `WhatsAppService`/`EmailService`/`TwilioService`
    per their preferred channel) and notify the surgeon/staff that the
    surgery is booked.
11. If no candidate slot in the requested window satisfies all four
    constraints, do not silently fail — return a structured "no slot found"
    result with the specific blocker(s) per candidate (surgeon busy vs. room
    unavailable vs. equipment/implant short) so staff can decide whether to
    widen the window, swap surgeon, or expedite an implant order.

## Data it reads
- `Patient` — `id`, `consent_status`, contact fields for notification.
- `Procedure` — `id`, `name`, `duration_minutes`, `is_active`, `category`
  (used to determine required equipment/implant list, once that catalog
  exists — see Open questions).
- `User` — `id`, `role` (to confirm `provider_id` is a real surgeon),
  `practice_id`.
- `Appointment` — existing rows, to avoid double-booking the same patient
  into overlapping surgeries and to detect stale/duplicate requests.
- `Practice` — `timezone`, `settings` (business hours, if stored there).

## Data it writes
- `Appointment` — creates the new surgery appointment row; updates
  `status` to `CANCELLED` on rollback.
- `AgentLog` — one row per scheduling decision (attempted, booked, or
  failed-to-find-slot), `agent_type="surgery_scheduling"`.
- `Conversation`/`Message` — if this agent is reached via a chat/voice
  channel rather than an internal staff call, log the exchange like other
  conversational agents do.

## Integrations used
- `surgeon_calendar_agent` (in-process call to its service, or via its
  router — see that agent's README) for availability checks + booking.
- `operating_room_scheduler_agent` for room availability + booking.
- `equipment_checklist_agent` for equipment availability.
- `implant_inventory_agent` for implant stock/reservation.
- `LLMService.chat(...)` — optional, to turn the structured "no slot found"
  result into a natural-language explanation for staff, or to parse a
  free-text scheduling request from a doctor into structured fields. Not
  needed for the core slot-finding logic, which should be deterministic.
- `WhatsAppService.send_text()` / `EmailService.send()` /
  `TwilioService.send_sms()` — patient/staff notification once booked.
- `AgentLog` model (direct DB write) for audit trail.

## Escalation & guardrails
- **Zero tolerance for double-booking.** This is the single most important
  rule in this category: a surgeon or room booked twice is a patient-safety
  and liability incident, not a UX bug. The re-check-immediately-before-write
  in step 5 exists specifically to close the TOCTOU (time-of-check to
  time-of-use) gap; in production this should additionally be backed by a
  DB-level uniqueness/exclusion constraint once a real room/booking table
  exists (see `operating_room_scheduler_agent`'s Open questions) — this
  agent's application-level check is a second line of defense, not the only
  one.
- If patient `consent_status` is `False`, refuse to book and escalate to
  staff — do not silently proceed.
- If no valid slot is found within the requested window, escalate to staff
  with the specific blockers rather than looping indefinitely or picking an
  unsafe slot (e.g. under-padded turnover time).
- Any failure partway through the multi-agent commit (step 7/8) must trigger
  automatic rollback + human escalation — never leave a surgery
  "half-booked" (e.g. on the surgeon's calendar but not the room's).
- Cancellations/reschedules of an already-booked surgery should route
  through `reschedule_cancellation_agent`, not through this agent directly,
  so all four resources are released consistently.

## Success criteria
- Zero double-bookings of a surgeon or room in production (measurable via
  overlap queries against `Appointment`/calendar events).
- % of scheduling requests resolved to a booked slot without staff
  intervention, and median time-to-book.
- 100% of successful bookings have matching confirmed holds across surgeon
  calendar, room, equipment, and implants (no orphaned `Appointment` rows).
- Every failed scheduling attempt produces an actionable, specific reason
  (not a generic "couldn't schedule").

## Current status
Stub — `surgery_scheduling_agent_services.py` only has a placeholder
`get_status()` method. Needs:
- A `SurgerySchedulingService` with the request/validate/candidate-slot/
  confirm/commit/rollback flow described above.
- A defined interface/contract for calling the other 5 agents in this
  category (direct service calls within the same process are simplest given
  they're all Python services in the same backend).
- A decision on how a "surgery" `Appointment` is distinguished from a
  regular one (see Open questions).
- Rollback/compensation logic for partial-commit failures.
- Structured logging (`AgentLog`) of every scheduling decision for audit.

## Open questions
- **`appointment_type` convention for surgery**: `Appointment.appointment_type`
  is a free-text `String(100)`, not an enum. Needs a documented convention
  (e.g. always prefixed `"surgery:"`, or a fixed set of values) so other
  agents/reports can reliably filter surgical appointments from
  consultations, follow-ups, etc.
- **No room model** — this agent's step 4/7 room check/commit depends
  entirely on `operating_room_scheduler_agent`, which itself needs a new
  `OperatingRoom`/room-booking model (see that agent's README for a sketch).
  Until that exists, this agent can only really coordinate surgeon calendar
  + a stubbed/always-available room check.
- **No equipment/implant models** — same dependency on
  `equipment_checklist_agent` and `implant_inventory_agent`, which both need
  new models (see their READMEs).
- **Locking strategy**: within a single process, is a simple re-check
  sufficient, or should slot confirmation take a short-lived DB row lock /
  advisory lock keyed on `(provider_id, room_id, time_range)` to guarantee
  atomicity under concurrent scheduling requests? Recommend the latter once
  a room/booking table exists.
- **Turnover buffer**: how many minutes of buffer between surgeries for
  cleaning/turnover, and is it configurable per practice
  (`Practice.settings`) or per procedure? Not currently modeled anywhere.
- **Multi-surgeon procedures**: does the system need to support booking two
  surgeons (e.g. a primary + assist) for one `Appointment`? Current
  `Appointment.provider_id` is a single nullable FK — no multi-provider
  support today.
