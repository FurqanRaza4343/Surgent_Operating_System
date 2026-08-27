# Risk Assessment

## What it does
Synthesizes `Patient.medical_history` and any `photo_analysis_agent` flags into a structured, staff-facing risk summary that surfaces candidacy-relevant concerns (drug interactions, conditions affecting anesthesia/healing, prior-surgery complications) for a surgeon to review — it produces a draft summary for clinical review, never a verdict delivered to the patient.

## Where it fits in the patient journey
Runs strictly after `medical_history_intake_agent` has populated `Patient.medical_history` — it is a **consumer**, not a collector, of medical data, and should refuse to produce a meaningful assessment if that upstream data is missing or too sparse. It also reads any structured flags `photo_analysis_agent` produced for the same patient/consultation. Its output is consumed by the surgeon (a `User` with `role="doctor"`) before or during the video/in-person consult, and by `procedure_recommendation_agent` only in the sense that recommendations should stay within whatever the surgeon has cleared — this agent does not talk to `procedure_recommendation_agent` directly to avoid risk data leaking into patient-facing suggestions.

## Task flow
1. Load `Patient.medical_history` for the patient; if key sections (allergies, current medications, conditions) are empty or absent, do not produce a "low risk" result by default — instead flag `assessment_status="incomplete_data"` and specify exactly what's missing.
2. Load any `photo_analysis_agent` flags associated with the same patient (see Open Questions in that agent's README about where those actually live — `PatientPhoto.notes` or wherever they end up).
3. Build a single structured prompt combining medical history + photo flags, and call `LLMService.chat(messages, system_prompt=<risk-assessment prompt>, tier="high")` — this is explicitly the kind of "critical-stakes" traffic `LLMService`'s tiering logic calls out as always routing to OpenAI, never the cheap tier.
4. Require the model to return a structured object, not prose, e.g.:
   ```json
   {
     "risk_factors": [{"factor": str, "source": "medical_history"|"photo_analysis", "severity_note": str}],
     "medication_interactions_to_review": [str],
     "conditions_requiring_clearance": [str],
     "assessment_status": "complete"|"incomplete_data",
     "missing_data": [str],
     "summary_for_surgeon": str
   }
   ```
5. Write the result to a durable, staff-only location — there is no dedicated `RiskAssessment` model today (see Open Questions), so until that exists, persist it via `AgentLog` (`agent_type="risk_assessment"`, `action="assessment_generated"`, `details=<structured object>`) so it's queryable and auditable, and never write it anywhere a patient-facing serializer could pick it up (e.g. do not put it in `Conversation.metadata` if that object is ever rendered to the patient).
6. Route the result to the assigned surgeon: resolve the relevant `User` via `Appointment.provider_id` for the patient's upcoming appointment (fall back to a practice-level default doctor via `User.role == "doctor"` filtered by `practice_id` if no appointment/provider is assigned yet — see Open Questions).
7. Notify the surgeon out-of-band that a new risk assessment is ready for review — e.g. `EmailService.send()` to the `User.email` with a link into the staff dashboard, not the assessment content itself in the email body (avoid emailing PHI in plaintext where a portal link is possible).
8. Never send any part of this output to the patient through any channel service. This agent has no legitimate patient-facing output at all.

## Data it reads
- `Patient.medical_history` (JSONB) — primary input, produced by `medical_history_intake_agent`.
- Photo screening flags produced by `photo_analysis_agent` (wherever they're persisted — see that agent's Open Questions).
- `Appointment.provider_id` — to resolve which surgeon to route the assessment to.
- `User` (`role="doctor"`) — to find the assigned or default reviewing surgeon.

## Data it writes
- `AgentLog` (`agent_type="risk_assessment"`) — the structured risk summary, staff-only, as `details`. This is the de facto storage location until a dedicated model exists.
- Nothing on `Patient` directly (deliberately — this agent should not overwrite or annotate `Patient.medical_history`, only read it) and nothing patient-facing.

## Integrations used
- `LLMService.chat(messages, system_prompt, tier="high")` — always high tier, no exceptions; this is the clearest example in the whole agent roster of traffic that must never be routed to the cheap tier.
- `EmailService.send(to, subject, html_content)` to notify the reviewing surgeon that an assessment is ready (link-only, not content-in-email).
- `EHRService` is a stub (`return {"status": "not_implemented"}`) — if risk assessments are meant to eventually sync to an EHR, that integration doesn't exist yet; don't build against it as if it does.

## Escalation & guardrails
This is the single most guardrail-sensitive agent in the category, and the rule is absolute, not situational: **the output of this agent must never be communicated to the patient, ever, in any form — not as a summary, not as a simplified version, not even as a "your risk level is X."** It is staff/surgeon-facing only, full stop, and must be routed to a `User` with a doctor role before anything derived from it reaches the patient through any other agent. Concretely:
- No channel-sending call (`EmailService`, `TwilioService`, `WhatsAppService`, `InstagramService`) should ever be made to a `Patient` with this agent's output as the content.
- Any UI/API surface exposing `AgentLog` entries for `agent_type="risk_assessment"` must be access-controlled to staff roles only — this needs to be enforced at the API layer, not just by this agent's own discipline.
- If `assessment_status="incomplete_data"`, the correct behavior is to tell staff what's missing (so they can send the patient back through `medical_history_intake_agent`), never to guess or default to "low risk" to fill the gap.
- If the assessment surfaces something urgent (e.g. an active condition that looks like a contraindication for elective surgery, a dangerous medication combination), escalate with priority — don't let it sit in a routine review queue with the same urgency as a low-risk case.
- Reuse the exact framing anywhere adjacent UI might imply otherwise: *"Screening agents provide informational screening only and do not provide medical diagnoses. All clinical decisions are made by licensed surgeons."*

## Success criteria
- Zero instances, ever, of risk-assessment content reaching a patient through any channel (this should be tested explicitly, not just assumed from access control).
- Every assessment is attributable to a specific reviewing surgeon (`User`) and has a clear "reviewed" vs. "pending review" state trackable by staff.
- `assessment_status="incomplete_data"` correctly identifies missing fields (verified against what `medical_history_intake_agent` actually collected) rather than false-positiving on complete data.
- Surgeons report (qualitatively, via feedback) that the `summary_for_surgeon` field is actually useful and not generic boilerplate.

## Current status
Stub — `risk_assessment_agent_services.py` has no real logic yet. Needs: the structured prompt + output schema, the "incomplete data" detection logic, surgeon-routing logic (`Appointment.provider_id` → `User`), the notify-surgeon flow, and strict access control on wherever the output ends up stored.

## Open questions
- **No `RiskAssessment` model exists.** Storing structured output in `AgentLog.details` works for an audit trail but is awkward to query/display in a staff dashboard (e.g. "show me all pending risk assessments for Dr. Smith"). A dedicated table is probably worth adding before this ships to real users — flag this for a schema decision.
- Depends entirely on `photo_analysis_agent`'s open question about where its structured flags live — this agent can't reliably read them until that's settled.
- No clear rule yet for what happens when there's no `Appointment.provider_id` set (patient hasn't been assigned a surgeon yet) — needs a default-routing policy (e.g. round-robin among `User.role == "doctor"` for the practice, or route to a practice admin queue).
- No "reviewed" / "acknowledged" status field anywhere — staff dashboards will need some way to mark an assessment as seen/actioned; likely another `AgentLog` entry (`action="reviewed_by_staff"`) as a stopgap, or a real status column on a future `RiskAssessment` table.
