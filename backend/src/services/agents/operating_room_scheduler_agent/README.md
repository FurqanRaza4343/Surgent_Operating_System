# Operating Room Scheduler Agent

## What it does
Tracks which operating rooms a practice has and whether each one is free at
a given time, so surgeries get spread across rooms efficiently instead of
double-booked or left idle. It is the room-side counterpart to
`surgeon_calendar_agent`: same job (availability check → hold → commit →
release), different resource. This agent cannot be built as "just a wrapper"
the way `surgeon_calendar_agent` is, because **there is no room model in
this codebase at all** — see Data it reads/writes and Open questions.

## Where it fits in the patient journey
Called by `surgery_scheduling_agent` for every candidate slot, right
alongside the surgeon-availability check — the two are evaluated together,
since a slot is only usable if *both* the surgeon and a room are free at the
same time. It has no direct patient-facing trigger and no dependency on
`equipment_checklist_agent` or `implant_inventory_agent` (rooms are a
distinct resource from what's inside them), though in practice a room
booking and an equipment/implant reservation for the same surgery should be
released together by `reschedule_cancellation_agent` if the surgery moves.

## Task flow
1. **List rooms** for a practice (`practice_id`) — which physical ORs exist,
   their names/numbers, and any capability tags (e.g. "supports general
   anesthesia," "has laser equipment mounted") that matter for matching a
   procedure to a suitable room.
2. **Availability check** (`is_room_free(practice_id, start_time, end_time,
   required_capabilities=None)`):
   a. Query bookings for all (or capability-matching) rooms at that practice
      overlapping the requested window.
   b. Return the first free room, or the full list of free rooms so the
      caller can pick (e.g. to keep a preferred room consistent for a
      surgeon), plus which rooms are busy and with what, for diagnostics.
3. **Booking** (`book_room(room_id, appointment_id, start_time, end_time)`):
   a. Re-check the specific room is still free immediately before writing
      (same TOCTOU concern as the surgeon calendar — see Escalation).
   b. Write the booking, linked to the `Appointment` this room is being
      reserved for.
4. **Release** (`release_room(room_id, appointment_id)`): free the room when
   a surgery is cancelled/rescheduled.
5. **Utilization reporting**: since this agent "optimizes OR utilization,"
   it should also expose a read path — e.g. % of scheduled hours booked per
   room per week/month — so staff can see under-used rooms and rebalance.
   This is a query over booking records, not a separate write path.
6. Log every check/booking/release to `AgentLog`.

## Data it reads
- `Practice` — `id`, to scope rooms to the correct practice (multi-tenant).
- `Procedure` — `category` (to match procedure requirements against room
  capability tags, if that level of matching is in scope).
- `Appointment` — to correlate room bookings with the surgical appointment
  they belong to.
- **New models needed** (do not exist today — see Open questions):
  `OperatingRoom` (or `Room`) and a room-booking record.

## Data it writes
- **New models needed**: room bookings (create on `book_room`, delete/mark
  released on `release_room`).
- `AgentLog` — one row per check/booking/release, `agent_type=
  "operating_room_scheduler"`.
- Does not write `Appointment` directly — `surgery_scheduling_agent` owns
  that; this agent only owns the room-booking side table and reports back
  success/failure + a `room_id` for `surgery_scheduling_agent` to store in
  the `Appointment.notes` (or, better, a first-class column — see Open
  questions).

## Integrations used
- No existing service class covers rooms — this agent will primarily be
  direct DB queries/writes against the new room model(s) proposed below,
  plus `AgentLog` for audit.
- `LLMService` — optional, for turning a utilization report into a
  human-readable staff summary ("Room 2 is under-booked this month"). Not
  needed for the core scheduling logic.

## Escalation & guardrails
- **Same zero-tolerance double-booking rule as surgeon calendars.** A room
  booked for two overlapping surgeries is a patient-safety incident
  (equipment/turnover collision, potentially a surgeon or patient walking
  into an occupied room). The re-check-before-write in step 3a is a second
  line of defense; the real guarantee should come from a DB constraint (see
  Open questions) once the booking table exists.
- If room capability tags don't match what a procedure needs (e.g. a
  procedure needs general anesthesia support and the only free room doesn't
  have it), do not book it anyway — report no suitable room found and let
  `surgery_scheduling_agent` escalate or try another slot/day.
- If no room model exists yet in a given environment (pre-migration), this
  agent must fail closed (report "no rooms configured") rather than
  fabricating an "always available" room — a placeholder success here is
  exactly the kind of bug that causes a real double-booking downstream.

## Success criteria
- Zero overlapping bookings for the same room.
- Measurable OR utilization % per room, trending toward the practice's
  target utilization (a number staff should be able to set).
- Time to find a free, capability-matching room for a candidate slot stays
  low enough not to bottleneck `surgery_scheduling_agent`'s multi-slot
  search.

## Current status
Stub — `operating_room_scheduler_agent_services.py` only has a placeholder
`get_status()` method. Needs, in order:
1. The new `OperatingRoom`/room-booking DB model(s) (see Open questions) —
   nothing else in this agent can be built for real without this.
2. A `OperatingRoomSchedulerService` with `list_rooms()`, `is_room_free()`,
   `book_room()`, `release_room()`, and a utilization report method.
3. `AgentLog` writes for every operation.
4. A DB-level constraint preventing overlapping bookings for the same room
   (see below) so the guarantee doesn't rest on application logic alone.

## Open questions
- **No `OperatingRoom`/`Room` model exists.** Needed fields, at minimum:
  - `id` (UUID PK)
  - `practice_id` (FK → `practices.id`) — rooms are practice-scoped
  - `name` (e.g. "OR 1", "Laser Suite")
  - `capabilities` (JSONB list of tags, mirroring the `JSONB` pattern already
    used for `Patient.medical_history` / `Practice.settings`)
  - `is_active` (bool, for rooms taken offline for maintenance)
- **How bookings are tracked** — two reasonable shapes, pick one:
  1. Reuse `Appointment` by adding a nullable `room_id` FK column to it. Pro:
     one source of truth, easy to query "what's happening in Room 2 today"
     via a single join. Con: couples the room concept into a model that's
     also used for non-surgical appointments (consults, follow-ups) where
     `room_id` would always be null — a bit of schema noise, but minor.
  2. A separate `RoomBooking` table (`id`, `room_id`, `appointment_id`,
     `start_time`, `end_time`). Pro: keeps `Appointment` resource-agnostic;
     easier to add a DB exclusion constraint
     (`EXCLUDE USING gist (room_id WITH =, tsrange(start_time, end_time)
     WITH &&)`) scoped tightly to room bookings. Con: an extra join to
     answer "what room is this appointment in."
  Recommendation: option 1 (`room_id` on `Appointment`) for simplicity,
  *unless* the team wants the Postgres exclusion-constraint guarantee
  described above, in which case option 2 makes that constraint cleaner to
  express and reason about. This is a genuine design decision for whoever
  builds this agent, not a foregone conclusion.
- **DB-level double-booking constraint**: regardless of which shape is
  chosen, strongly recommend a Postgres `EXCLUDE` constraint (requires the
  `btree_gist` extension) on `(room_id, tsrange(start_time, end_time))` so
  overlap prevention doesn't rely solely on application-level re-checks.
- **Room ↔ procedure capability matching**: is a free-text/tag list on
  `OperatingRoom.capabilities` sufficient, or does the practice need a
  stricter procedure→required-capability mapping? Not modeled anywhere
  today (`Procedure` has no capability/requirement fields).
- **Turnover/cleaning buffer between bookings** — same open question as in
  `surgery_scheduling_agent`; needs a single source of truth so both agents
  agree on it rather than each guessing a default.
