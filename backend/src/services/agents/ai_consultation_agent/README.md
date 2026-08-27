# AI Consultation

## What it does
Runs the primary structured pre-consult conversation with a prospective patient — surfacing their aesthetic goals, general history highlights, and timeline/budget expectations — and turns that free-form conversation into structured notes that downstream screening agents (risk assessment, procedure recommendation) can consume.

## Where it fits in the patient journey
Triggered when a patient books (or is about to attend) their first `Appointment` — either self-serve from the website/chat widget, or handed off from `receptionist_agent`/`lead_nurturing_agent` after initial contact. It typically runs before `medical_history_intake_agent` (goals first, detailed history second) but the two may interleave in a single conversation depending on UX design. On completion it hands its structured output forward to `risk_assessment_agent` (candidacy signals) and `procedure_recommendation_agent` (stated goals + procedures of interest). If the patient later does `photo_analysis_agent`, that agent's flags should be attachable to the same `Conversation`/`Appointment` this agent opened.

## Task flow
1. On session start, resolve or create a `Conversation` row: `agent_type="ai_consultation"`, `channel` set to whatever channel initiated it (`web_chat`, `phone`, `sms`, etc. — see `ConversationChannel`), `patient_id` if the patient is already known, `practice_id` from context.
2. Load any existing `Patient` record (by phone/email match) so the agent doesn't re-ask known facts (name, prior visits).
3. Run a multi-turn, state-machine-driven conversation (not a single LLM call) — suggested states: `greeting` → `procedure_interest` → `goals_and_motivation` → `timeline_expectations` → `budget_expectations` → `high_level_history_flags` (smoking, prior cosmetic surgery, allergies — NOT a full history, that's `medical_history_intake_agent`'s job) → `wrap_up`. Persist the current state somewhere durable (e.g. `Conversation.metadata["state"]`) so a patient can resume a dropped session.
4. Each turn: append the patient's message as a `Message` (`role="patient"`), call `LLMService.chat(messages, system_prompt=<state-specific prompt>, tier="high")` to get the agent's next question/response, store that reply as a `Message` (`role="agent"`).
5. Use the LLM to extract structured fields at the end of each state transition (a small "extract goals as JSON" call, or `chat_with_tools` with an extraction tool) rather than trying to parse free text after the fact.
6. On `wrap_up`, assemble a consultation summary object: `{goals, procedure_interest, timeline, budget_range, flagged_history_notes}` and write it to `Conversation.metadata["consultation_summary"]`, plus a human-readable version into `Appointment.notes` if an `Appointment` is already linked.
7. Log the completed consultation via an `AgentLog` row (`agent_type="ai_consultation"`, `action="consultation_completed"`, `details=<summary>`).
8. Signal handoff: mark `Conversation.is_active=False` when done, and (per practice config) trigger `procedure_recommendation_agent` and/or `risk_assessment_agent` if enough medical-history context already exists; otherwise route to `medical_history_intake_agent` next.

## Data it reads
- `Patient`: `first_name`, `last_name`, `email`, `phone`, `medical_history` (to avoid re-asking known items), `consent_status`.
- `Appointment`: existing upcoming appointment (if any) to attach notes to — `id`, `appointment_type`, `start_time`.
- `Conversation` / `Message`: prior turns in this session (and prior sessions, if resuming).
- `AgentConfig` (`agent_type="ai_consultation"`): per-practice enable flag and config (e.g. which questions are required, tone/persona settings).

## Data it writes
- `Conversation`: creates/updates the row, `metadata` (state machine state + `consultation_summary`), `is_active`.
- `Message`: one row per turn (`role="patient"` / `role="agent"`).
- `Appointment.notes`: human-readable consult summary appended, if an appointment is linked.
- `AgentLog`: one row per completed consultation (and optionally per major state transition, for debugging/QA).

## Integrations used
- `LLMService.chat(messages, system_prompt, tier="high")` for the conversational turns — this is patient-facing clinical-adjacent content, so it should stay on `tier="high"` (OpenAI), not `tier="low"`.
- `LLMService.chat_with_tools(...)` optionally, for structured field extraction at end of each state.
- Channel delivery is handled by whichever inbound channel service is already routing the conversation (`TwilioService` for phone/SMS, `WhatsAppService`, `InstagramService`, or the web chat transport) — this agent itself only needs to produce text, not send it.

## Escalation & guardrails
This agent never diagnoses candidacy or promises a procedure will happen — it only collects stated goals and expectations. Any question that starts drifting into "am I a good candidate for X" must be answered with a deflection to the effect of: *"Screening agents provide informational screening only and do not provide medical diagnoses. All clinical decisions are made by licensed surgeons."* — and the topic logged so `risk_assessment_agent`/the surgeon sees it was raised. If the patient discloses something urgent (acute pain, signs of infection from a prior procedure, suicidal ideation re: appearance, minors inquiring without a guardian), the state machine must short-circuit to a human-escalation state: stop the intake flow, do not continue collecting goals, and flag `AgentLog` with `action="escalation_required"` for staff follow-up.

## Success criteria
- >90% of started consultation sessions reach `wrap_up` without abandonment (tracked via `Conversation.is_active` transitions).
- Structured `consultation_summary` is present and non-empty for every completed session — no sessions that finish with only unstructured chat text.
- Downstream agents (`risk_assessment`, `procedure_recommendation`) can consume the summary without needing to re-ask the patient the same questions (measured by intake-question repeat rate).
- Zero instances in QA sampling of the agent stating or implying a clinical verdict ("you're a good candidate for X").

## Current status
Stub — `ai_consultation_agent_services.py` has no real logic yet (`get_status` only). Needs: conversation/state-machine engine, system prompts per state, structured-extraction step, `Conversation`/`Message` persistence, `Appointment.notes` writeback, and the handoff trigger into `medical_history_intake`/`risk_assessment`/`procedure_recommendation`.

## Open questions
- There's no dedicated "consultation notes" or "intake form" model — structured output currently has to live in `Conversation.metadata` (JSONB) or `Appointment.notes` (plain text). Decide whether that's acceptable long-term or whether a proper `ConsultationSummary` table is worth adding so the surgeon-facing UI can query it directly instead of parsing JSONB.
- No explicit rule yet for when this agent should route to `medical_history_intake_agent` automatically vs. present it as a separate step the patient does later — needs a product decision.
- Session resumption (patient closes the chat and comes back) needs a defined timeout/expiry policy for `Conversation.is_active`.
