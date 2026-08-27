# Pre-Surgery Preparation

## What it does
A proactive, schedule-driven agent (not a reactive chatbot) that watches confirmed surgical `Appointment`s and sends tailored prep instructions — fasting windows, medications to pause, what to bring — timed relative to the surgery date, over SMS/email/WhatsApp.

## Where it fits in the patient journey
Triggered once a surgical `Appointment` transitions to `AppointmentStatus.CONFIRMED` (as opposed to just `SCHEDULED`) — this is downstream of everything else in this category: `ai_consultation_agent`, `medical_history_intake_agent`, `risk_assessment_agent`, and `procedure_recommendation_agent` have all already run, the surgeon has decided on a procedure, and the appointment is locked in. It reads `Patient.medical_history` (to tailor medication-pause instructions to what the patient is actually taking) and should coordinate with, not duplicate, `appointment_reminder_agent` (which handles generic "your appointment is coming up" reminders — this agent's messages are prep-specific and clinical-content-adjacent, not just a reminder). It hands off to nothing further in this category — post-op, `recovery_followup_agent`/`healing_monitoring_agent`/`wound_care_guidance_agent` take over.

## Task flow
1. **This agent does not run on a request/response cycle** — it needs to run on a schedule (e.g. a daily job that scans for upcoming confirmed surgical appointments), the same shape `appointment_reminder_agent` needs. No job scheduler exists in this codebase yet (see Open Questions) — the actual trigger mechanism has to be decided before this can be built as "proactive."
2. On each scheduled run, query `Appointment` rows where `status == AppointmentStatus.CONFIRMED`, `appointment_type` indicates a surgical procedure (not a consult), and `start_time` falls within the practice's configured prep-message windows (e.g. 7 days out, 3 days out, 1 day out, day-of).
3. For each matching appointment, load the associated `Patient.medical_history` to tailor instructions:
   - Medications to pause (cross-reference `current_medications`/`conditions` against a practice-defined pause list — e.g. blood thinners, certain supplements — by procedure type).
   - Fasting window instructions (timed backward from `Appointment.start_time`, per practice policy — likely from `AgentConfig`).
   - What to bring / logistics (parking, arrival time, companion requirement) — generally static per `appointment_type`, from `AgentConfig` or `Practice.settings`.
4. Compose the message per checkpoint (7-day, 3-day, day-before, day-of each likely need different content — day-of is mostly a fasting-window final reminder, 7-day is the full checklist) — this can be templated rather than LLM-generated per message, but `LLMService.chat(messages, system_prompt, tier="low")` is reasonable for personalizing tone/wording from a fixed instruction set (this is not clinical judgment, just phrasing, so the cheap tier is appropriate here unlike most of this category).
5. Send via the patient's preferred channel: `TwilioService.send_sms(to, message)`, `WhatsAppService.send_text(to, text)`, or `EmailService.send(to, subject, html_content)` — pick based on stored patient preference, falling back to whichever contact method (`Patient.phone`/`Patient.email`) is available.
6. Record that this checkpoint's message was sent (to avoid duplicate sends on the next scheduled run) — e.g. `AgentLog` (`agent_type="pre_surgery_preparation"`, `action="prep_message_sent"`, `details={appointment_id, checkpoint, channel}`), and check for an existing log entry for the same `appointment_id`+checkpoint before sending again.
7. If a medication-pause instruction is generated, flag it for pharmacist/nurse review before send if the practice's policy requires clinical sign-off on medication guidance (configurable via `AgentConfig`) — don't let an LLM-personalized message alter the underlying clinical instruction, only its phrasing.
8. Handle edge cases: appointment gets cancelled/rescheduled after prep messages already went out (cancel remaining scheduled messages for that `appointment_id`); appointment gets confirmed with very little lead time (compress the checkpoint schedule rather than skipping straight to day-of with no 7-day checklist).

## Data it reads
- `Appointment`: `status` (must be `CONFIRMED`), `appointment_type`, `start_time`, `patient_id` — the entire trigger condition for this agent.
- `Patient`: `medical_history` (medications/conditions to tailor pause instructions), `phone`, `email` (delivery channel).
- `AgentConfig` (`agent_type="pre_surgery_preparation"`): checkpoint schedule (days-before offsets), fasting-window policy, medication pause list per procedure type, requires-clinical-signoff flag.
- `Practice.settings`: logistics info (address, parking, arrival instructions) if not procedure-specific.
- `AgentLog`: prior send records, to avoid duplicate messages per checkpoint.

## Data it writes
- `AgentLog`: one entry per prep message sent per checkpoint per appointment — this is also the de facto "has this been sent" tracking mechanism.
- No direct writes to `Patient` or `Appointment` under normal operation (this agent reads and notifies, it doesn't need to mutate appointment state) — except possibly appending a note to `Appointment.notes` confirming prep instructions were delivered, useful for staff/day-of check-in.

## Integrations used
- `TwilioService.send_sms()`, `WhatsAppService.send_text()`, `EmailService.send()` — the actual delivery mechanism, chosen per patient preference/available contact info.
- `LLMService.chat(messages, system_prompt, tier="low")` — optional, for phrasing/personalization only, never for generating the underlying clinical instruction (that must come from a fixed, practice-configured rule set, not the model's own judgment about what medications are safe to pause).

## Escalation & guardrails
The clinical content of prep instructions (which medications to pause, fasting windows) must be sourced from practice-configured, surgeon-approved rules — not invented or inferred by the LLM. The LLM's role here is strictly rephrasing/tone, never deciding what the instruction says. If a patient's `medical_history` shows something that doesn't fit the standard pause-list logic (e.g. a medication not on the configured list, a condition that might need individualized guidance), this agent must escalate to staff for a manual instruction rather than guessing or omitting guidance silently. If a patient replies to a prep message with a question or a concerning symptom, this agent (being schedule/broadcast-oriented) is not built to hold a conversation — that reply should route to a human or to a reactive agent, not be answered inline by the same proactive job.

## Success criteria
- Every confirmed surgical appointment receives its full checkpoint sequence (7-day/3-day/day-before/day-of, or whatever schedule is configured) with no duplicate or missed sends — measurable via `AgentLog` coverage against confirmed appointments.
- Medication-pause and fasting instructions are always sourced from the configured rule set, never ad-libbed — auditable by checking that message content maps to a specific configured rule per send.
- Cancelled/rescheduled appointments correctly stop or reschedule pending prep messages (zero prep messages sent for an appointment no longer `CONFIRMED`).
- No-show rate and day-of confusion (measured via staff feedback or a "did you receive prep instructions" check-in question) decreases after this agent is live, compared to baseline.

## Current status
Stub — `pre_surgery_preparation_agent_services.py` has no real logic yet. Needs: the scheduled-job trigger mechanism (see Open Questions — nothing in this repo runs background jobs today), the checkpoint schedule logic, the medication-pause/fasting rule set (practice-configurable), the dedupe-via-`AgentLog` check, and the cancel/reschedule handling.

## Open questions
- **No job scheduler/background-task infrastructure exists anywhere in this backend** (no Celery, APScheduler, or cron entrypoint found in the repo). This agent's entire "proactive/scheduled" premise depends on something triggering it on a recurring basis — this needs to be decided at the platform level (and will affect `appointment_reminder_agent` identically, since it has the same shape) before this agent can actually run unattended.
- Where does the medication-pause rule set live? Nothing in `AgentConfig.config` or elsewhere currently models "for procedure type X, pause medications Y and Z, N days prior" — this needs either a structured `AgentConfig.config` schema or a small dedicated table, populated/approved by a surgeon before go-live.
- Patient channel preference isn't modeled on `Patient` today (no `preferred_contact_channel` field) — decide the fallback order (e.g. SMS if `phone` present, else email) or add the field.
- Whether prep-message delivery needs signoff/audit beyond `AgentLog` (e.g. for liability reasons, given this touches medication guidance) is a compliance question worth raising with the practice before launch.
