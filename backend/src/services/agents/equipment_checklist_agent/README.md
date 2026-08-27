# Equipment Checklist Agent

## What it does
Confirms that every piece of equipment a specific procedure requires is
available and in working order before a surgery slot is confirmed, and
generates/tracks the pre-op checklist that staff physically walk through in
the OR. It answers two related but distinct questions: "is this equipment
list satisfiable at time T?" (used during scheduling) and "has the equipment
actually been staged and checked off?" (used the morning of surgery). Like
`operating_room_scheduler_agent`, it cannot be built for real without a new
DB model — there is currently no equipment/checklist-item model anywhere in
this codebase.

## Where it fits in the patient journey
Called twice in the surgery lifecycle:
1. **At scheduling time** — `surgery_scheduling_agent` asks "can this
   procedure's equipment list be satisfied at candidate slot T?" (e.g. a
   shared piece of equipment, like a specific laser unit, might already be
   allocated to another surgery at that time).
2. **Pre-op, close to the surgery date** — this agent (or staff via a UI
   backed by it) generates and tracks the actual checklist for the specific
   `Appointment`, working alongside `pre_surgery_preparation_agent`
   (patient-facing prep) but focused entirely on the OR/equipment side, not
   the patient.

It coordinates with `implant_inventory_agent` (implants are a related but
separate concern — consumable/stocked items vs. reusable equipment) and
reports back to `surgery_scheduling_agent` during the scheduling handshake.

## Task flow
1. **Define the required equipment list per procedure.** Each `Procedure`
   needs an associated set of equipment items (e.g. "electrocautery unit,"
   "specific implant sizer set," "endoscopy tower"). This mapping does not
   exist today (see Open questions) — likely a practice-configured catalog,
   since equipment varies by facility.
2. **Availability check** (`is_equipment_available(procedure_id,
   start_time, end_time)`), called by `surgery_scheduling_agent`:
   a. Resolve the procedure's required equipment items.
   b. For each item, check it isn't already reserved for an overlapping
      surgery (shared/mobile equipment) and isn't flagged out-of-service.
   c. Return available/blocked per item so the caller can see exactly which
      piece of equipment is the blocker.
3. **Reservation** (`reserve_equipment(appointment_id, equipment_item_ids)`):
   commit the hold once `surgery_scheduling_agent` confirms the slot,
   mirroring the surgeon-calendar and room booking commits.
4. **Checklist generation** (`generate_checklist(appointment_id)`): produce
   the concrete pre-op checklist for staff — item name, quantity, sterile/
   maintenance status if tracked, and a checked/unchecked state — a few days
   or the morning before surgery.
5. **Checklist completion tracking**: staff (via a UI, not necessarily this
   agent directly) check off items; this agent should expose an update
   method and, when the checklist isn't fully checked off within a
   configurable window before surgery time, proactively alert staff (see
   Escalation).
6. **Release** (`release_equipment(appointment_id)`): free reserved
   equipment on cancel/reschedule.
7. Log every check/reservation/checklist state change to `AgentLog`.

## Data it reads
- `Procedure` — `id`, `name`, `category` (to resolve the required equipment
  list, once that mapping exists).
- `Appointment` — `id`, `start_time`, `end_time`, `provider_id` (to know
  which surgery a checklist belongs to and when equipment needs to be
  staged).
- **New models needed**: `Equipment` (or `EquipmentItem`) catalog,
  `ProcedureEquipmentRequirement` mapping, and per-appointment checklist
  records — see Open questions for a sketch.

## Data it writes
- **New models needed**: equipment reservations (tied to `appointment_id`)
  and checklist item completion state.
- `AgentLog` — one row per availability check, reservation, release, and
  checklist-completion event, `agent_type="equipment_checklist"`.

## Integrations used
- No existing service class covers equipment — this is direct DB work
  against the new models proposed below, plus `AgentLog`.
- `LLMService.chat(...)` — useful for generating a clear, staff-readable
  checklist summary from structured equipment data, or for parsing an
  unstructured "what does procedure X need" note from a surgeon into
  structured equipment requirements when first populating the catalog.
- `TwilioService.send_sms()` / `WhatsAppService.send_text()` — for the
  incomplete-checklist alert to OR staff described in Escalation.

## Escalation & guardrails
- If the pre-op checklist for a surgery scheduled within N hours (staff-
  configurable) is not fully checked off, this agent must proactively alert
  OR staff/nursing lead — do not wait for someone to think to check. This is
  a patient-safety guardrail, not just a nice-to-have reminder.
- If a required equipment item is flagged out-of-service or unavailable
  during the pre-op check (not just the scheduling-time check), escalate
  immediately to staff — this is close enough to surgery that
  `surgery_scheduling_agent` may need to be re-invoked to find a
  replacement slot/room, which is itself an urgent, human-supervised
  process, not something this agent should attempt to silently resolve on
  its own.
- Never mark a checklist "complete" automatically without an explicit
  staff/system confirmation per item — this agent tracks and prompts, it
  does not attest that physical equipment is actually present and working.

## Success criteria
- 100% of scheduled surgeries have a generated checklist before the pre-op
  alert window closes.
- Checklist completion rate before surgery start time (target: 100%, with
  any gap triggering the escalation above with enough lead time to fix it).
- Zero surgeries delayed/cancelled same-day due to missing equipment that
  the scheduling-time check should have caught.

## Current status
Stub — `equipment_checklist_agent_services.py` only has a placeholder
`get_status()` method. Needs, in order:
1. The new `Equipment`, `ProcedureEquipmentRequirement`, and checklist DB
   models (see Open questions) — nothing else can be built for real without
   these.
2. An `EquipmentChecklistService` with `is_equipment_available()`,
   `reserve_equipment()`, `release_equipment()`, `generate_checklist()`, and
   a checklist-item update method.
3. The pre-op incomplete-checklist alert job (likely a scheduled/periodic
   check rather than purely reactive).
4. `AgentLog` writes for every operation.

## Open questions
- **No `Equipment` model exists.** Sketch:
  - `id` (UUID PK), `practice_id` (FK), `name`, `category` (e.g.
    "electrocautery," "imaging," "instrument set"), `is_shared` (bool — is
    this a single physical unit that can only be in one OR at a time, vs. an
    item every OR simply stocks), `status` (available/in_use/maintenance/
    out_of_service).
- **No procedure→equipment mapping exists.** Sketch: a
  `ProcedureEquipmentRequirement` join table (`procedure_id`,
  `equipment_id`, `quantity`) — since `Procedure` currently has zero fields
  describing what it needs beyond `duration_minutes`.
- **No checklist/reservation model exists.** Sketch: an
  `EquipmentReservation` table (`appointment_id`, `equipment_id`,
  `reserved_from`, `reserved_until`) for the scheduling-time hold, and a
  separate `ChecklistItem` table (`appointment_id`, `equipment_id` or
  free-text `label`, `is_checked`, `checked_by`, `checked_at`) for the
  pre-op walkthrough — these are related but should probably be separate
  concerns (a reservation is about time-slot conflict; a checklist item is
  about "did a human confirm this is physically ready").
- **Shared vs. dedicated equipment**: does the practice actually have
  equipment scarce enough to cause scheduling conflicts (shared mobile
  units), or is equipment availability purely a pre-op checklist concern
  with no scheduling-time impact? This determines whether step 2 (the
  scheduling-time availability check) is even necessary for a given
  practice, or whether this agent is effectively checklist-only. Needs a
  product decision, likely practice-configurable via `AgentConfig.config`.
- **Sterilization/maintenance tracking**: is equipment status
  (sterile/needs cleaning/in maintenance) in scope for this agent, or a
  separate future concern? Affects the `Equipment.status` field design
  above.
