# Surgical Documentation Agent

## What it does
Generates and files the structured post-operative record for a completed
surgery: procedure performed, surgeon/staff involved, implants used (pulling
from `implant_inventory_agent`'s consumption record), complications/notes,
and anesthesia/duration details, then makes that record available to the
recovery-care agents (`recovery_dashboard_agent`, `healing_monitoring_agent`,
`recovery_followup_agent`) that pick up after surgery.

## Where it fits in the patient journey
Triggered when an `Appointment` for a surgery transitions to
`AppointmentStatus.COMPLETED` — either an explicit staff action or a
surgeon dictating/typing notes right after the procedure. It runs after
`surgery_scheduling_agent` (which created the appointment) and
`equipment_checklist_agent`/`implant_inventory_agent` (whose reservations
this agent should reconcile into a final, as-used record — e.g. calling
`implant_inventory_agent.mark_used()` with the actual lot/serial number if
that hasn't already been recorded chairside).

Downstream, its output feeds:
- `recovery_dashboard_agent` / `recovery_followup_agent` — need to know what
  was actually done to tailor recovery guidance.
- `healing_monitoring_agent` / `wound_care_guidance_agent` — need procedure
  type and any complications noted to interpret healing-progress signals
  correctly.
- `payment_invoice_agent` — a completed surgery record is typically the
  trigger for final invoicing (vs. deposit-only) via `Invoice`.

## Task flow
1. Detect trigger: `Appointment.status` set to `COMPLETED` for a surgical
   appointment (see `surgery_scheduling_agent`'s open question on how
   surgical appointments are identified via `appointment_type`).
2. Collect inputs for the record:
   - `Appointment` fields (patient, provider, procedure, actual start/end
     time — note current `Appointment` has a single `start_time`/`end_time`
     set at scheduling; if actual OR time differs, that's either recorded in
     `notes` or needs a dedicated "actual" timestamp — see Open questions).
   - Surgeon's raw input: free-text dictation, structured form fields, or
     both. `LLMService.chat()` is the natural fit for turning free-text
     dictation into a structured note (findings, technique, complications,
     estimated blood loss, etc.) — always call it at `tier="high"` given
     this is clinical documentation, never `tier="low"`.
   - Implant usage from `implant_inventory_agent` (lot/serial numbers used).
   - Any pre-op checklist/equipment context from `equipment_checklist_agent`
     worth carrying into the permanent record (e.g. equipment substitutions
     made same-day).
3. Generate the structured post-op note via `LLMService.chat()`, with a
   system prompt constraining it to a fixed schema (procedure performed,
   findings, technique summary, complications: none/described,
   implants used, estimated blood loss, disposition) — never let the model
   free-associate clinical content; validate the output against the schema
   before saving, and never auto-finalize an LLM-drafted note without
   surgeon sign-off (see Escalation).
4. Persist the record (see Open questions for where — likely extending
   `RecoveryJournal`, see analysis below) and mark it as pending surgeon
   review/sign-off, not final, until a human confirms it.
5. On sign-off, mark the record final/locked (post-op clinical
   documentation should not be silently editable after sign-off; corrections
   need an addendum trail, not an overwrite).
6. Notify the relevant recovery-care agents that a signed-off record exists
   for this patient so they can begin their own post-op flows.
7. Log the generation + sign-off events to `AgentLog`.

## Data it reads
- `Appointment` — `id`, `patient_id`, `provider_id`, `appointment_type`,
  `start_time`/`end_time`, `notes`, `status`.
- `Patient` — `id`, name, `medical_history` (for context the LLM prompt may
  need, e.g. known allergies relevant to complications).
- `Procedure` — `name`, `category`, `description` (baseline expected
  technique/steps to compare against for the generated note).
- Implant usage data from `implant_inventory_agent` (once that agent's
  `ImplantUsageRecord` model exists).
- `User` — surgeon/staff name and role for the record's "performed by"
  field.

## Data it writes
- The structured post-op record itself — **recommend extending
  `RecoveryJournal` rather than creating a new model** (see analysis below).
  If extended: populates `RecoveryJournal.procedure_id`, `surgery_date`,
  and a structured entry inside `RecoveryJournal.notes` (JSONB) for the
  post-op summary, alongside `recovery_day=0`/`status="active"` to seed the
  recovery tracking that `recovery_dashboard_agent` etc. continue.
- `AgentLog` — one row per generation and per sign-off event,
  `agent_type="surgical_documentation"`.
- Optionally triggers `Invoice` creation/status update via
  `payment_invoice_agent` once the record is final (not this agent's direct
  write, but a handoff).

## Integrations used
- `LLMService.chat(messages, system_prompt, tier="high")` — drafting the
  structured note from dictation/raw input. Always `tier="high"`; this is
  clinical documentation, not FAQ-tier chat.
- `implant_inventory_agent` — pulling/confirming implant lot/serial data
  used in the record.
- `StorageService.upload()` / `CloudinaryService` — if the surgeon attaches
  intra-op photos to the record (parallel to how `PatientPhoto` already
  stores Cloudinary-backed patient photos).
- `AgentLog` (direct DB write) for audit trail.
- `EmailService.send()` — optional, to send the surgeon a review/sign-off
  link or notification that a draft is ready.

## Escalation & guardrails
- **An LLM-drafted post-op note must never become the permanent medical
  record without explicit surgeon sign-off.** This is the single most
  important guardrail for this agent — draft-then-confirm, never
  auto-finalize, no matter how confident the model's output looks.
- If the LLM's structured output fails schema validation (missing required
  fields, malformed data), do not save a partial/malformed record silently
  — flag it for manual entry.
- Once signed off, the record should be effectively immutable; any later
  correction must be an addendum with a timestamp and author, not a
  destructive edit, since this is a legal/clinical document.
- If implant usage data from `implant_inventory_agent` is missing or
  inconsistent with what was reserved for the appointment, flag the
  discrepancy for staff rather than guessing — this ties directly into
  recall traceability (see `implant_inventory_agent`'s README).

## Success criteria
- Every `COMPLETED` surgical `Appointment` has a corresponding signed-off
  post-op record within a defined SLA (e.g. within 24-48 hours).
- Zero records finalized without explicit surgeon sign-off.
- Downstream recovery agents (`recovery_dashboard_agent`,
  `healing_monitoring_agent`) can reliably read procedure/complication
  context from this agent's output without needing to re-derive it from raw
  `Appointment.notes` text.

## Current status
Stub — `surgical_documentation_agent_services.py` only has a placeholder
`get_status()` method. Needs:
- A `SurgicalDocumentationService` implementing the collect → draft →
  validate → sign-off → finalize flow above.
- A fixed JSON schema for the structured post-op note, enforced against the
  `LLMService` output before persisting.
- The extension to `RecoveryJournal` (or new model — see analysis) actually
  implemented as a migration.
- A sign-off/review mechanism (who can sign off — presumably `User` rows
  with a doctor role — and how the "pending review" vs. "final" state is
  tracked).
- `AgentLog` writes for generation and sign-off.

## Open questions
- **Extend `RecoveryJournal` vs. new model — recommendation: extend
  `RecoveryJournal`.** Reasoning: `RecoveryJournal` already models exactly
  the right anchor point — one row per `patient_id` + `procedure_id` +
  `surgery_date`, with a flexible `notes: JSONB` field and a `status` field
  that could gain a value like `"pending_signoff"`. Post-op documentation is
  naturally "day 0" of the recovery journal this same patient/procedure
  will be tracked under for weeks afterward (`recovery_day`,
  `healing_score`, etc. already live here), so keeping the surgical record
  and the recovery tracking in the same row avoids an awkward join every
  recovery-care agent would otherwise need. The one addition genuinely
  needed beyond what exists: a way to represent "signed off / locked"
  (e.g. `signed_off_by`, `signed_off_at` columns) and an addendum trail
  (a small `RecoveryJournalAddendum` table, or an addenda list inside the
  `notes` JSONB) for post-signoff corrections — `RecoveryJournal` today has
  no such immutability/audit concept and would need it added. If the team
  later decides post-op documentation needs stricter structure/compliance
  guarantees than a JSONB blob offers (e.g. for insurance audit purposes),
  a dedicated `SurgicalRecord` model with typed columns is the fallback,
  but that's more schema than the current data seems to justify starting
  with.
- **Implant traceability dependency**: this agent's implant-usage section is
  only as good as `implant_inventory_agent`'s `ImplantUsageRecord` (itself
  an open question in that agent's README) — sequencing matters, that model
  should exist before this agent's implant-recording step is built.
- **Actual vs. scheduled OR time**: `Appointment.start_time`/`end_time` are
  set at scheduling time; does the post-op record need separate "actual"
  timestamps (surgery ran long/short), or is `notes` sufficient? Affects
  whether `Appointment` needs new columns or whether this lives entirely in
  the post-op record itself.
- **Sign-off authorization model**: who is allowed to sign off — only the
  operating surgeon (`Appointment.provider_id`), or any doctor-role `User`
  at the practice? `User.role` is currently a free-text string with no
  fine-grained permission model to lean on.
