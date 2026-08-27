# Surgeon Calendar Agent

## What it does
A focused wrapper around `CalendarService` that keeps exactly one surgeon's
Google Calendar conflict-free. Each surgeon (a `User` row with a
doctor/surgeon `role`) is mapped to one Google `calendar_id`; this agent
answers "is Dr. X free at time T for duration D?" and, once confirmed,
writes the booking to that calendar via `create_event()`. It has no opinion
about rooms, equipment, or implants — that's `operating_room_scheduler`,
`equipment_checklist`, and `implant_inventory`'s job.

## Where it fits in the patient journey
This agent doesn't get invoked directly by a patient-facing flow — it is a
utility that `surgery_scheduling_agent` calls twice per booking attempt (a
"can you take this slot?" check, then a "book it" write), and that
`reschedule_cancellation_agent` calls to move/cancel an existing surgical
event. It may also be called ad hoc by staff (e.g. from an admin UI) to view
a surgeon's upcoming surgical schedule.

It sits below `surgery_scheduling_agent` in the coordination chain — it does
not talk to `operating_room_scheduler_agent`, `equipment_checklist_agent`,
or `implant_inventory_agent` at all; those are siblings, not dependents.

## Task flow
1. **Resolve surgeon → calendar_id.** Given a `provider_id` (a `User.id`),
   look up which Google `calendar_id` belongs to that surgeon. This mapping
   does not exist in any current model (see Open questions) — until it's
   added, treat it as configuration (e.g. stored in `AgentConfig.config` for
   this agent, keyed by `provider_id`, or a new column on `User`).
2. **Availability check** (`is_surgeon_free(provider_id, start_time,
   end_time)`):
   a. Resolve calendar_id as above.
   b. Call `CalendarService.list_events(calendar_id, max_results=...)` for
      the relevant date window.
   c. Check the returned events for any time overlap with the requested
      `[start_time, end_time)` window (inclusive-overlap check, not just
      exact match — a 9:00-11:00 request conflicts with an existing
      8:30-9:30 event).
   d. Return a clear boolean + the conflicting event(s) if any, so the
      caller (`surgery_scheduling_agent`) can log *why* a slot was rejected.
3. **Booking** (`book_surgery(provider_id, patient_id, procedure_name,
   start_time, end_time)`):
   a. Re-run the availability check immediately before writing (closes the
      race window between the caller's earlier check and this write — see
      Escalation).
   b. If still free, call `CalendarService.create_event(summary, start_time,
      end_time, calendar_id)` with a summary that includes patient name/ID
      and procedure so the surgeon's calendar is self-explanatory, without
      leaking full medical detail into a title anyone with calendar access
      can read (consider a short summary + details in the event description
      instead, once `create_event` supports a description field — currently
      it does not, see Open questions).
   c. If the re-check fails (someone else booked it in the meantime), return
      a conflict result rather than double-booking — do not silently
      overwrite.
4. **Release** (`release_surgery(provider_id, calendar_event_id)`): used by
   `reschedule_cancellation_agent` to remove/free a slot. `CalendarService`
   currently has no `delete_event`/`update_event` method — needs to be added
   (see Open questions).
5. Log every check and every write to `AgentLog` so `surgery_scheduling_agent`'s
   audit trail can be reconstructed independently if needed.

## Data it reads
- `User` — `id`, `role`, `practice_id`, `name` (to resolve and label the
  surgeon; role must indicate doctor/surgeon before this agent treats a user
  as bookable).
- Google Calendar events via `CalendarService.list_events()` — this is the
  actual source of truth for the surgeon's schedule, not a DB table.
- `AgentConfig` — likely storage location for the `provider_id → calendar_id`
  mapping until a dedicated field exists.

## Data it writes
- Google Calendar events via `CalendarService.create_event()` (and, once
  added, update/delete).
- `AgentLog` — one row per availability check and per booking/release,
  `agent_type="surgeon_calendar"`.
- Does **not** write `Appointment` rows itself — that's owned by
  `surgery_scheduling_agent`, which is the single writer for the
  authoritative `Appointment` record. This agent's calendar event is a
  mirror/notification surface for the surgeon, not the system of record.

## Integrations used
- `CalendarService.list_events(calendar_id, max_results)` — conflict
  checking.
- `CalendarService.create_event(summary, start_time, end_time, calendar_id)`
  — booking.
- `AgentLog` (direct DB write) for audit trail.
- `LLMService` — not needed for the core logic (this is deterministic
  calendar math), but optionally useful for rendering a human-readable
  summary of a surgeon's week on request.

## Escalation & guardrails
- **This is a load-bearing double-booking guard** for the whole category:
  `surgery_scheduling_agent` relies on this agent's re-check-before-write to
  be honest and atomic. If two booking requests for the same surgeon race,
  the second one through step 3a must lose and report a conflict — never
  "last write wins."
- If `CalendarService.list_events()` or `create_event()` raises (Google API
  error, expired OAuth token, rate limit), do not treat that as "surgeon is
  free" — fail closed and escalate to staff. A calendar API outage must
  never be interpreted as an open slot.
- If the `provider_id → calendar_id` mapping is missing/unconfigured for a
  given surgeon, refuse to book and escalate — never fall back to a shared
  "default" calendar, since that would silently merge two surgeons'
  schedules.
- Access-token lifecycle (refreshing an expired Google OAuth token) needs a
  clear owner — this agent should not fail bookings solely because a token
  needed refreshing that a background job could have handled proactively.

## Success criteria
- Zero instances of a surgeon's calendar showing two overlapping surgical
  events.
- Availability-check latency low enough that `surgery_scheduling_agent` can
  evaluate several candidate slots without a noticeable delay to staff.
- Every booking or release this agent performs is reflected on the actual
  Google Calendar within seconds (verifiable by re-listing events).

## Current status
Stub — `surgeon_calendar_agent_services.py` only has a placeholder
`get_status()` method. Needs:
- `SurgeonCalendarService` with `is_surgeon_free()`, `book_surgery()`, and
  `release_surgery()` methods as described above.
- The `provider_id → calendar_id` resolution mechanism.
- Overlap-detection logic against `list_events()` results (Google's API
  returns events, not a simple busy/free bitmap — this agent has to compute
  overlap itself, or switch to the Calendar `freebusy` API).
- `AgentLog` writes for every check/booking/release.

## Open questions
- **No `provider_id → calendar_id` mapping exists anywhere.** Needs a
  decision: new column on `User` (e.g. `google_calendar_id`), or a row in
  `AgentConfig.config`, or a small new mapping table. A new `User` column is
  the simplest and most discoverable option.
- **`CalendarService` has no update/delete/freebusy methods** — only
  `list_events` and `create_event` exist today. Rescheduling or cancelling a
  surgical calendar event, and efficient conflict-checking via the
  `freebusy` API instead of paging through `list_events`, both require new
  methods on `CalendarService`.
- **OAuth token lifecycle**: `CalendarService` takes a raw `access_token` at
  construction time with no refresh logic visible. Where do per-surgeon
  Google OAuth tokens get stored and refreshed? This affects every method in
  this agent.
- **Event privacy**: should the calendar event summary contain patient
  name/procedure directly, or a reference code, given that many surgeons
  share calendar visibility with office staff/assistants? Needs a practice
  policy decision.
- **`max_results` pagination**: `list_events()` takes a `max_results` cap
  with no pagination shown — for a busy surgeon, does 10 (the current
  default in the method signature) reliably cover a full look-ahead window
  for conflict checking? Likely needs a larger explicit value and/or date
  range filtering (`timeMin`/`timeMax`) that isn't currently exposed by
  `CalendarService.list_events()`.
