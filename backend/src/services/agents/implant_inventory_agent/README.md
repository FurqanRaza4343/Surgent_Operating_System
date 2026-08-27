# Implant Inventory Agent

## What it does
Tracks stock levels of physical implants (breast implants, facial implants,
etc.) by SKU, reserves specific units against upcoming surgeries, and
triggers reorders before stock runs out. This is a supply-chain/inventory
problem, distinct from `Procedure` (the practice's service catalog) and
distinct from `equipment_checklist_agent` (reusable OR equipment vs.
consumable, uniquely-serialed, patient-implanted stock). Like the other
"physical resource" agents in this category, it needs a new DB model that
doesn't exist yet.

## Where it fits in the patient journey
Called by `surgery_scheduling_agent` during the slot-confirmation handshake
for any procedure that requires an implant (e.g. breast augmentation,
certain facial procedures): "do we have implant SKU/size X in stock, or can
we get it in time for date T?" It also runs independently of any specific
booking, as a background/periodic process that watches stock levels and
proactively reorders — this is the "reorders" half of its job title and
isn't triggered by scheduling at all.

It coordinates with `procedure_recommendation_agent`/`cost_estimation_agent`
indirectly (a specific implant choice affects both), but within this
category its main relationship is to `surgery_scheduling_agent` (reservation
at booking time) and to itself on a schedule (reorder monitoring).

## Task flow
1. **Stock check** (`check_availability(implant_sku, size, quantity_needed,
   needed_by_date)`), called by `surgery_scheduling_agent`:
   a. Look up current quantity-on-hand for the requested SKU/size.
   b. Subtract quantity already reserved against other upcoming surgeries
      (reservations, not just raw on-hand count, since a unit reserved for
      next Tuesday isn't available for tomorrow).
   c. If on-hand-minus-reserved covers the need, return available. If not,
      check whether a pending reorder's expected delivery date is before
      `needed_by_date` — if so, report "available by delivery, not in hand
      yet," which `surgery_scheduling_agent` should treat as a real risk
      (see Escalation), not a green light.
2. **Reservation** (`reserve_implant(appointment_id, implant_sku, size,
   quantity)`): commit the hold once the surgery slot is confirmed,
   decrementing available-to-promise (not necessarily physical on-hand,
   which only changes when the unit is actually pulled for surgery).
3. **Release** (`release_implant(appointment_id)`): free a reservation on
   cancel/reschedule.
4. **Consumption** (`mark_used(appointment_id, implant_sku, size,
   quantity, lot_number)`): after surgery, this agent (or
   `surgical_documentation_agent`, which should call into it) records which
   specific implant lot/serial was actually implanted — required for
   recall traceability, a hard requirement for implantable medical devices,
   not an optional nicety.
5. **Reorder monitoring** (periodic job, `check_reorder_thresholds()`): for
   every SKU, if `quantity_on_hand - reserved <= reorder_threshold`,
   generate a reorder request/alert to staff (or, if the practice wants full
   automation, to the supplier directly — flag this as a policy decision,
   not an assumption).
6. Log every check/reservation/release/consumption/reorder event to
   `AgentLog`.

## Data it reads
- `Appointment` — `id`, `start_time`, `provider_id`, to know when implants
  are needed by and to tie reservations/consumption to a specific surgery.
- `Procedure` — to know which procedures require an implant at all (no
  current field for this — see Open questions).
- **New models needed**: an `Implant`/inventory model — see Open questions
  for a sketch.

## Data it writes
- **New models needed**: implant stock levels, reservations, consumption
  records (with lot/serial number for traceability), and reorder
  requests/history.
- `AgentLog` — one row per check/reservation/release/consumption/reorder,
  `agent_type="implant_inventory"`.

## Integrations used
- No existing service class covers inventory — this is direct DB work
  against the new models proposed below, plus `AgentLog`.
- `EmailService.send()` / `WhatsAppService.send_text()` /
  `TwilioService.send_sms()` — reorder alerts to whoever manages purchasing
  (likely a staff `User`, not the patient).
- `LLMService.chat(...)` — optional, for drafting a reorder email/PO
  request to a supplier from structured stock data, or summarizing current
  inventory status for staff on request. Not needed for the core
  stock-tracking logic, which is deterministic arithmetic.

## Escalation & guardrails
- **"Available by delivery date, not in hand" must never be silently
  treated the same as "in stock."** `surgery_scheduling_agent` should
  clearly distinguish these two states and, for the latter, require staff
  confirmation before booking — a delayed supplier shipment turning into a
  cancelled/rescheduled surgery days before the date is a serious patient
  experience and liability issue, not just an inventory hiccup.
- Reorder threshold breaches must generate a proactive alert to a human
  (purchasing/office manager) — do not assume automatic reordering is safe
  by default; that's a per-practice policy decision (see Open questions),
  and the default should be "alert a human," not "auto-purchase."
- Lot/serial-level consumption tracking (`mark_used`) is a regulatory/
  traceability requirement for implantable devices in most jurisdictions —
  this agent must never lose or skip recording which specific unit was used
  in which patient's surgery, since that's exactly the record needed if a
  manufacturer recall is issued later.
- If a stock check is requested for a SKU/size that doesn't exist in the
  catalog at all, escalate to staff rather than silently reporting
  "unavailable" indistinguishably from "known SKU, zero stock" — these need
  different staff responses (catalog data entry vs. reorder).

## Success criteria
- Zero surgeries delayed/cancelled due to an implant shortfall that the
  scheduling-time check should have caught and flagged.
- Reorder alerts consistently fire before stock is fully depleted (i.e.
  `reorder_threshold` is tuned well enough that a reorder's lead time is
  covered).
- 100% of implanted units have a traceable lot/serial record linked to the
  patient's `Appointment`/surgical record — auditable on demand (e.g. for a
  recall).

## Current status
Stub — `implant_inventory_agent_services.py` only has a placeholder
`get_status()` method. Needs, in order:
1. The new `Implant` inventory model(s) (see Open questions) — nothing else
   can be built for real without these.
2. An `ImplantInventoryService` with `check_availability()`,
   `reserve_implant()`, `release_implant()`, `mark_used()`, and
   `check_reorder_thresholds()`.
3. The periodic reorder-monitoring job and its alerting path.
4. `AgentLog` writes for every operation.

## Open questions
- **No `Implant`/inventory model exists.** Sketch (this is genuinely a
  supply-chain domain, distinct from `Procedure`):
  - `Implant` (catalog): `id`, `practice_id`, `sku`, `manufacturer`, `name`,
    `size`/`variant`, `unit_cost`.
  - `ImplantStock` (or fields on `Implant` if one row per SKU+size is
    simplest): `quantity_on_hand`, `reorder_threshold`, `reorder_quantity`,
    `supplier_id`/`supplier_name`, `lead_time_days`.
  - `ImplantReservation`: `appointment_id`, `implant_id`, `quantity`,
    `reserved_at`, `status` (held/consumed/released).
  - `ImplantUsageRecord`: `appointment_id`, `implant_id`, `lot_number`,
    `serial_number`, `used_at` — the traceability record referenced above,
    likely also worth surfacing from/linking to
    `surgical_documentation_agent`'s post-op record.
  - `ReorderRequest`: `implant_id`, `quantity_requested`, `requested_at`,
    `status` (pending/ordered/received), `expected_delivery_date`.
- **No procedure→implant requirement mapping.** `Procedure` has no field
  indicating it needs an implant, let alone which SKU/size options are
  clinically appropriate — this is likely chosen per-patient (e.g. implant
  size is a clinical decision made during consult, not fixed per procedure
  type), so the mapping may need to happen at the `Appointment`/consult
  level rather than statically on `Procedure`. Needs product input.
- **Auto-reorder vs. alert-only**: should this agent ever place a purchase
  order automatically, or always stop at alerting a human? Recommend
  alert-only as the default/only mode until there's a real supplier
  integration and a practice explicitly opts in — automatic purchasing
  without a supplier API is not implementable today anyway (no supplier
  integration exists in this codebase).
- **Multi-practice/multi-location inventory**: is implant stock tracked
  per-practice (matching every other model's `practice_id` scoping), or
  could a practice have per-location stock (e.g. multiple clinic sites
  under one `Practice` row)? Current `Practice` model has no location/site
  concept, so per-practice scoping is the reasonable default.
