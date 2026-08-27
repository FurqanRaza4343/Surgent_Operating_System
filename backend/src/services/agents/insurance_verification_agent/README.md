# Insurance Verification Agent

## What it does
Checks whether a patient's insurance covers an upcoming procedure/consult *before* they show up, so staff and the patient both know out-of-pocket expectations ahead of time. As of now this agent has no third-party eligibility API to call — it cannot actually verify anything yet, and that has to be solved before real logic is written.

## Where it fits in the patient journey
Triggered after `appointment_booking` confirms an appointment for a procedure that may be insurance-eligible (e.g. reconstructive vs. purely cosmetic procedures), ideally a few days before the visit so there's time to resolve issues. It runs alongside/before `cost_estimation` refinement (a verified-coverage patient should see an adjusted estimate) and before `payment_invoice` (the invoice should reflect patient responsibility, not full charge, once coverage is known). If verification fails or coverage is denied, it should surface that to staff well before the visit, not on arrival.

## Task flow
1. Collect the patient's insurance information (payer name, member ID, group number, subscriber name/DOB) — either via conversational intake (`LLMService.chat` guiding a structured Q&A over SMS/WhatsApp/web_chat) or a form during booking.
2. Store the collected insurance details (currently no dedicated field — see Data it writes / Open questions).
3. Submit an eligibility check request to a third-party insurance-verification API for the specific `Procedure`/CPT-equivalent and `Patient` demographics. **This step cannot be implemented today — no vendor integration exists anywhere in this repo.** See Open questions for the vendor decision that has to happen first.
4. Parse the vendor's eligibility response into a normalized summary: plan active/inactive, in-network/out-of-network, estimated patient responsibility (copay/coinsurance/deductible remaining), and any prior-authorization requirement.
5. Surface that summary to staff (dashboard/notification) before the appointment — this agent's output is primarily for staff decision-making, not a patient-facing autonomous action, given how consequential a wrong coverage read is.
6. If coverage is denied/inactive or a prior authorization is required, notify the patient of what's needed and give staff a heads-up early enough to fix it before the visit, rather than surprising the patient at check-in.
7. Log every verification attempt and outcome as an `AgentLog` entry — verification results are exactly the kind of thing that gets disputed later ("I was told I was covered") and needs an audit trail.

## Data it reads
- `Patient`: `first_name`, `last_name`, `date_of_birth` (needed for eligibility lookups), plus wherever insurance fields end up living (see below).
- `Appointment`: `appointment_type`, `start_time`, `patient_id`, to know what's being verified and by when.
- `Procedure`: to map the practice's procedure to whatever code the eligibility vendor requires (CPT or similar) — no such mapping field exists on `Procedure` today.

## Data it writes
- Insurance details (payer, member ID, group number) and verification results (status, patient responsibility estimate, prior-auth flag) have **no home in the current schema**. `Patient.medical_history` (JSONB) could be repurposed as a stopgap, but insurance data mixed into a clinical-history blob is not a clean long-term design — a dedicated `InsurancePolicy`/`InsuranceVerification` table is the better answer (see Open questions).
- `AgentLog` (`agent_type="insurance_verification"`, `action="eligibility_checked"`, `details={payer, status, patient_responsibility_estimate}`) for every check, regardless of where the structured result ultimately lives.
- `Message` on the relevant `Conversation` if verification happened through a conversational intake flow.

## Integrations used
- None yet for the actual eligibility check — this is the core gap (see Open questions).
- `LLMService.chat(..., tier="high")` for structured conversational intake of insurance details (higher tier recommended since this data feeds financial/clinical decisions, per the tiering strategy already used for risk assessment/payments elsewhere in the codebase).
- `TwilioService.send_sms()` / `EmailService.send()` to notify patient/staff of verification results.
- `EHRService` is a literal stub (`return {"status": "not_implemented"}`) today — if the practice's EHR is ultimately the source of truth for insurance-on-file, this agent would eventually read/write through `EHRService`, but that service has zero real implementation to build against right now, so it's not a near-term dependency.

## Escalation & guardrails
- **Never tell a patient they are covered based on an LLM's paraphrase of an ambiguous eligibility response** — eligibility responses are notoriously nuanced (in-network vs. out-of-network, deductible-not-yet-met, plan-year resets); any ambiguity routes to staff, not a confident-sounding automated message.
- Coverage denials or prior-authorization requirements always go to a human — this agent should never tell a patient "you're not covered, you'll need to pay out of pocket" without staff review, since that's a decision with real financial and care-access consequences.
- If the eligibility vendor API is unavailable/times out, fail safe: tell staff "verification pending/unavailable," never silently treat it as "verified."

## Success criteria
- Percentage of appointments with insurance-relevant procedures that have a verification result on file at least 48 hours before the visit.
- Reduction in day-of-appointment billing surprises/disputes attributable to unverified coverage.
- False-positive rate (told "covered," actually wasn't) at effectively zero — this is the metric that matters most given the guardrail above.

## Current status
Stub — `insurance_verification_agent_services.py` only has `get_status`. Needs:
- Everything — this agent cannot do real verification work until a vendor is chosen and integrated. Until then, the buildable slice is: conversational intake of insurance details + storage + staff-facing "pending verification" state.
- Schema for storing insurance policy details and verification results.
- A normalized internal representation of "eligibility result" that's vendor-agnostic, so swapping vendors later doesn't ripple through the whole agent.
- Staff notification/dashboard surface for verification outcomes.

## Open questions
- **Primary blocker — vendor decision**: no insurance-eligibility API integration exists anywhere in this repo. Candidates mentioned as reference points: Availity, Change Healthcare, Eligible (now part of Change Healthcare/Stedi). This needs a decision (cost, payer coverage breadth, API ergonomics, contracting timeline) before any real verification logic can be written; everything else in this doc is provisional pending that choice.
- Where does insurance data live? `Patient.medical_history` (JSONB) is the only schema-flexible spot today but conflates clinical and billing/insurance data — recommend a dedicated table instead.
- Does `Procedure` need a CPT-code (or vendor-equivalent) mapping field to support eligibility submissions? Not present today.
- Should verification be patient-facing at all (a chat flow collecting insurance card info) or purely a staff-initiated/staff-facing tool given the sensitivity of getting it wrong? Leaning toward staff-facing-first given the guardrails above, but worth an explicit product decision.
