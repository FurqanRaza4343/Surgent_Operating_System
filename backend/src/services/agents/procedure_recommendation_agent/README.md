# Procedure Recommendation

## What it does
Takes the goals and procedure interest captured during `ai_consultation_agent`'s intake and matches them against the practice's `Procedure` catalog, surfacing a short list of relevant options framed strictly as "things to discuss with your surgeon" — never as a prescriptive or final recommendation.

## Where it fits in the patient journey
Runs after `ai_consultation_agent` has captured stated goals (and ideally after `risk_assessment_agent` has run, so recommendations can be filtered against anything the surgeon has already flagged — though this agent must never see or reference the risk assessment's clinical detail, only whether a procedure has been staff-flagged as off the table for this patient). Its output is shown to the patient before their consultation (video or in-person) as conversation-starter material, and to the surgeon as a quick view of what the patient is already interested in discussing. It hands nothing forward automatically — the surgeon makes the actual call during the consult.

## Task flow
1. Load the patient's stated goals/procedure interest from `Conversation.metadata["consultation_summary"]` (written by `ai_consultation_agent`).
2. Query the practice's active procedure catalog: `Procedure` rows where `practice_id` matches and `is_active=True`.
3. Call `LLMService.chat(messages, system_prompt=<matching prompt with the goals + catalog as context>, tier="high")` (or `tier="low"` for a cheaper first pass if the practice's catalog is small and matching is closer to keyword/category matching than nuanced reasoning — see Open Questions) to rank/select the most relevant `Procedure` entries by `category`/`description` against the stated goals.
4. Constrain the output strictly to items present in the catalog query result — never let the model suggest a procedure the practice doesn't actually offer (`Procedure.is_active=True` for this `practice_id`). Validate the model's output against the queried IDs before using it.
5. For each suggested procedure, generate a short, neutral explanation of *why* it's relevant to the patient's stated goals (not why it's a good idea medically) — e.g. "You mentioned wanting a more defined jawline; our practice offers jaw contouring — this may be worth discussing with your surgeon."
6. Present the list to the patient with the standard framing (see Guardrails) and store the recommendation set for the surgeon to see alongside the consultation summary — e.g. `Conversation.metadata["procedure_suggestions"] = [{"procedure_id": ..., "name": ..., "rationale": ...}]`.
7. Log via `AgentLog` (`agent_type="procedure_recommendation"`, `action="suggestions_generated"`, `details={procedure_ids, patient_id}`).
8. If the patient reacts with follow-up questions about cost/logistics for a suggested procedure, hand off to `cost_estimation_agent`/`appointment_booking_agent` rather than answering pricing or scheduling questions itself.

## Data it reads
- `Procedure`: `id`, `name`, `category`, `description`, `is_active`, filtered by `practice_id` — this is the entire universe of valid suggestions; the agent must never invent a procedure name outside this set.
- `Conversation.metadata["consultation_summary"]` (from `ai_consultation_agent`): stated goals, procedure interest.
- `AgentConfig` (`agent_type="procedure_recommendation"`): max number of suggestions to show, any practice-level rules (e.g. "never suggest X without a consult first").

## Data it writes
- `Conversation.metadata["procedure_suggestions"]` — the suggestion set, for the patient-facing view and the surgeon's pre-consult brief.
- `AgentLog`: one entry per generated suggestion set.

## Integrations used
- `LLMService.chat(messages, system_prompt, tier="high")` for goal-to-catalog matching and rationale generation. `tier="low"` is plausible for the matching step alone if it proves to be simple category-matching rather than nuanced reasoning about goals — worth benchmarking both before committing.
- No channel-sending integration of its own; delivery of the suggestion list rides whatever surface (web UI, or the same channel `ai_consultation_agent` used) is already presenting the consultation summary.

## Escalation & guardrails
Every suggestion this agent produces must be presented with framing equivalent to "options to explore with your surgeon" — never "you should get," "we recommend," or any phrasing that reads as a decision rather than a conversation starter. Concretely:
- Output copy should consistently use hedged language: "may be relevant to discuss," "worth exploring with your surgeon," never "you need" or "the best option for you."
- This agent must never override or contradict anything already known from `risk_assessment_agent` — if a procedure has been staff-flagged as inappropriate for this patient (however that flag ends up being modeled — see that agent's Open Questions), it must be excluded from suggestions entirely, not shown with a caveat.
- It must not suggest procedures outside the queried, active `Procedure` catalog under any circumstance — this is an output-validation requirement, not just a prompting request, since LLMs will otherwise happily suggest generically well-known procedures the practice doesn't actually offer.
- Reuse the standard framing wherever appropriate: *"Screening agents provide informational screening only and do not provide medical diagnoses. All clinical decisions are made by licensed surgeons."* — even though this agent isn't assessing risk, its suggestions could easily be misread as a clinical recommendation, so the same disclaimer boundary applies to its output.

## Success criteria
- 100% of suggested procedures are verifiably drawn from the queried `Procedure` catalog for that practice (zero hallucinated procedure names) — enforceable via an automated check comparing output IDs against the query result.
- Patient engagement with suggestions (e.g. click-through to learn more, or explicit follow-up questions) is trending positive without needing staff to correct/clarify what was suggested.
- Surgeons report the pre-consult suggestion list is a useful starting point, not something they have to walk back in the room.
- Zero QA-sampled instances of prescriptive/definitive language ("you should get X") in generated output.

## Current status
Stub — `procedure_recommendation_agent_services.py` has no real logic yet. Needs: catalog query + filtering logic, the goal-matching prompt, output validation against the queried catalog, the hedged-language rationale generation, and the `Conversation.metadata` writeback.

## Open questions
- How exactly does this agent learn "this procedure is off the table for this patient" from `risk_assessment_agent`, given that agent's output must stay staff-only and never leak clinical detail? Likely needs a narrow, non-clinical signal (e.g. a boolean exclusion list) rather than direct access to the risk assessment — needs a design decision so risk data doesn't leak through the back door via procedure filtering.
- No linkage exists between `Appointment.appointment_type` (a free-text string) and `Procedure.id` — if booking a follow-up appointment for a suggested procedure is ever automated, that string/FK mismatch will need resolving.
- Whether `tier="low"` (Mistral) is acceptable for the matching step is an open cost/quality tradeoff to benchmark, not a given.
