# Medical History Intake

## What it does
Runs a structured, form-like conversation that collects allergies, prior surgeries/procedures, current medications, and relevant medical conditions, then writes the result into `Patient.medical_history` (JSONB) in a consistent shape that `risk_assessment_agent` can parse programmatically.

## Where it fits in the patient journey
Usually runs after `ai_consultation_agent`'s goals/expectations conversation (or interleaved with it), and always before `risk_assessment_agent`, which depends entirely on this agent's output — **`risk_assessment_agent` cannot produce a meaningful result without `Patient.medical_history` being populated first.** It may be triggered standalone too (e.g. a returning patient updating their history before a new procedure). Its output is also relevant context for `photo_analysis_agent`'s reviewers and for `pre_surgery_preparation_agent` later (medications to pause, conditions relevant to fasting/prep instructions).

## Task flow
1. Resolve the `Patient` record; if `Patient.medical_history` already has data, pre-fill/skip questions rather than re-asking (only ask "has anything changed since your last visit?").
2. Confirm `Patient.consent_status` before collecting sensitive health data — if consent hasn't been captured, that must happen first (consent capture may be owned by another flow; if not, this agent should not proceed without it).
3. Run a structured, section-by-section conversation via `LLMService.chat(messages, system_prompt=<section prompt>, tier="high")` — suggested sections, each with its own extraction step:
   - **Allergies**: medication allergies, latex, anesthesia reactions.
   - **Prior surgeries/procedures**: especially prior cosmetic/plastic surgery (directly relevant to candidacy), with approximate dates.
   - **Current medications**: including supplements/blood thinners (anticoagulants are a major surgical risk factor).
   - **Relevant conditions**: diabetes, cardiovascular conditions, clotting disorders, smoking/nicotine use, pregnancy status where relevant, prior anesthesia complications.
4. After each section, use structured extraction (`chat_with_tools` or a strict JSON-response prompt) rather than trusting free text — define a fixed schema up front, e.g.:
   ```json
   {
     "allergies": [{"substance": str, "reaction": str}],
     "prior_surgeries": [{"procedure": str, "year": int|null, "notes": str}],
     "current_medications": [{"name": str, "dosage": str|null, "purpose": str|null}],
     "conditions": [{"condition": str, "status": "active"|"resolved", "notes": str}],
     "smoking_status": "current"|"former"|"never"|null,
     "last_updated": iso_datetime
   }
   ```
5. Merge the newly-collected data into `Patient.medical_history` (merge, don't blindly overwrite — preserve history of prior entries if the schema supports it, or at minimum timestamp each update).
6. Persist the raw conversation as `Conversation`/`Message` rows (same pattern as `ai_consultation_agent`) for auditability — medical history is exactly the kind of data that needs a traceable record of what the patient actually said, not just the final structured extraction.
7. Flag anything that looks incomplete or contradictory (e.g. patient lists "blood thinner" under medications but no matching condition) for a follow-up question rather than silently accepting gaps.
8. On completion, write an `AgentLog` (`agent_type="medical_history_intake"`, `action="history_collected"`, `details={fields_completed, flagged_gaps}`) and trigger `risk_assessment_agent` if the practice's workflow auto-chains it.

## Data it reads
- `Patient.medical_history` (existing JSONB, to avoid re-asking), `Patient.consent_status` (gate before proceeding), `Patient.date_of_birth` (relevant to some conditions/medication dosing context, not for the agent to interpret clinically).
- `Conversation`/`Message`: prior intake sessions if resuming or updating.
- `AgentConfig` (`agent_type="medical_history_intake"`): which sections/questions are required per practice, any procedure-specific required fields (e.g. rhinoplasty intake may need extra breathing-history questions).

## Data it writes
- `Patient.medical_history` (JSONB) — the primary output; this field's schema should be treated as a contract other agents (`risk_assessment_agent`) depend on, so define and document it before building.
- `Conversation` / `Message`: full transcript of the intake session.
- `AgentLog`: completion event with a summary of what was collected and any flagged gaps.

## Integrations used
- `LLMService.chat(messages, system_prompt, tier="high")` for the conversational turns and `chat_with_tools(...)` for structured extraction — keep this on the high tier; this is exactly the "clinical notes" category the tiering strategy in `LLMService` calls out as always going to OpenAI.
- No channel-sending integration needed if intake happens inline in the same conversation as `ai_consultation_agent`; otherwise reuse whichever channel service (`TwilioService`/`WhatsAppService`/`EmailService`) delivered the intake link.

## Escalation & guardrails
This agent collects data — it does not interpret it. It must never respond to a disclosed condition with any clinical reassurance or concern ("that shouldn't be a problem for surgery," "that could be risky") — those are `risk_assessment_agent`'s and the surgeon's calls to make, not this agent's. If a patient discloses something acute during intake (uncontrolled bleeding, chest pain, signs of a current medical emergency unrelated to the cosmetic consult), the agent must stop the intake flow and escalate to staff immediately rather than continuing to the next question. Reuse the standard framing wherever this agent's output could be read as a judgment: *"Screening agents provide informational screening only and do not provide medical diagnoses. All clinical decisions are made by licensed surgeons."*

## Success criteria
- `Patient.medical_history` completeness rate (percentage of required fields populated per `AgentConfig`) trends toward 100% for patients who complete intake.
- `risk_assessment_agent` can run without needing to ask the patient any follow-up questions itself — i.e., zero "missing data" failures downstream, measured by how often risk assessment has to punt due to incomplete history.
- Flagged contradictions/gaps get resolved (either by follow-up question or explicit staff review) rather than silently persisting.
- Full transcript is retrievable for every completed intake (audit requirement for medical data collection).

## Current status
Stub — `medical_history_intake_agent_services.py` has no real logic yet. Needs: the section-by-section state machine, the fixed `medical_history` JSON schema (needs to be defined and shared with `risk_assessment_agent`'s builder), structured extraction prompts, merge-not-overwrite logic for `Patient.medical_history`, and the consent-status gate.

## Open questions
- The exact JSON schema for `Patient.medical_history` isn't defined anywhere yet — this needs to be settled as a shared contract between this agent and `risk_assessment_agent` before either is built, otherwise they'll drift.
- Where does consent capture actually happen today (a separate flow, a signed form outside this system)? If nothing currently sets `Patient.consent_status`, this agent needs to know what to do when it's `False` — block, or capture consent itself first.
- No versioning/history on `Patient.medical_history` (it's a single JSONB blob) — decide whether overwriting on each update is acceptable or whether an audit trail of changes is needed (e.g. append-only log via `AgentLog.details` as a workaround, or a schema change).
