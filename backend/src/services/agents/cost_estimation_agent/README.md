# Cost Estimation Agent

## What it does
Turns "how much will this cost me?" into an instant, procedure-specific estimate pulled from the practice's own price list — a range with disclaimers, not a bill. It never charges anyone; it exists purely to remove the pricing-uncertainty friction that stops leads from booking a consult.

## Where it fits in the patient journey
Triggered mid-conversation, almost always by `lead_nurturing` or `ai_consultation` when a prospect asks a pricing question ("how much is a rhinoplasty?"), or directly by a patient in `web_chat`/`whatsapp`/`sms`. It runs after the practice and procedure are identified (from `Conversation.agent_type`/`metadata` or explicit intake) and before `appointment_booking` is invoked — a good estimate is usually the thing that converts curiosity into a booked consult. It hands off to:
- `appointment_booking` once the patient is ready to schedule a consult.
- `insurance_verification` if the patient asks whether insurance covers any of it (this agent does not evaluate coverage itself).
- `payment_invoice` only much later, at time of actual billing — this agent must never be confused with billing.

## Task flow
1. Resolve which `Procedure` the patient is asking about (exact name match first; if ambiguous, ask a clarifying question or use `LLMService.chat` with `tier="low"` to map free-text like "nose job" → the practice's catalog entry via a short classification prompt).
2. Look up `Procedure.base_price` for that practice (`Procedure.practice_id` scoped) plus any category-level context (e.g., surgical vs. non-surgical) from `Procedure.category`/`description`.
3. If the practice has configured a price range or add-ons in `AgentConfig.config` (e.g., `{"cost_estimation": {"range_pct": 0.15, "financing_note": "..."}}`), apply it to turn a single `base_price` into a low–high range rather than a false-precision single number.
4. Compose the estimate response: procedure name, price range, and what's/isn't included (facility fee, anesthesia, follow-ups — if not tracked per-procedure yet, state that explicitly rather than guessing).
5. Always append the disclaimer, verbatim or close to it: "This is an estimate only. Final cost is confirmed during your in-person consultation with the surgeon. Insurance coverage and financing are not included unless specifically noted." This should be a hardcoded suffix, not something the LLM is trusted to reproduce faithfully every time.
6. If the patient asks about payment plans/financing, do not invent numbers — say a team member will follow up, and optionally hand off to `payment_invoice`/staff.
7. Log the exchange as a `Message` (role=agent) on the active `Conversation`, and write an `AgentLog` entry recording which procedure/price was quoted (needed later for `analytics_dashboard` revenue-attribution and for dispute resolution if a patient later claims a different number was quoted).
8. Offer the natural next step: "Want me to check available consult times?" → routes to `appointment_booking`.

## Data it reads
- `Procedure`: `name`, `category`, `description`, `base_price`, `is_active`, `practice_id`.
- `AgentConfig`: per-practice estimation config (range %, disclaimers, financing copy), keyed by `agent_type="cost_estimation"`.
- `Conversation`/`Message`: existing conversation context to know which procedure/patient is being discussed.
- `Patient`: only to personalize the message (name) and to link the quote if the conversation is already tied to a patient record.

## Data it writes
- `Message` (role=`agent`) on the `Conversation` with the estimate text.
- `AgentLog` (`agent_type="cost_estimation"`, `action="quote_generated"`, `details={procedure_id, quoted_range, patient_id}`) — this is the audit trail `analytics_dashboard` and `payment_invoice` will eventually need to reconcile "what was quoted" vs. "what was charged."
- Does **not** write to `Invoice` or any payment-related table — that boundary is intentional and should be enforced in code review.

## Integrations used
- `LLMService.chat(messages, system_prompt, tier="low")` for free-text procedure matching and for phrasing the estimate conversationally; `tier="low"` is appropriate since this isn't a clinical or financial decision, just a lookup + rephrase.
- No `PaymentService`, `TwilioService`, or messaging-channel calls are needed directly — this agent typically runs inside an existing conversation thread (its reply is delivered by whatever channel adapter is already driving that `Conversation`, e.g. the WhatsApp/Instagram webhook handler), not something it triggers itself.

## Escalation & guardrails
- Never quote a price for a procedure not in the practice's `Procedure` table — say "let me connect you with our team for that" rather than letting the LLM estimate a number from general knowledge.
- Never present the estimate as final/binding language ("your cost will be exactly $X") — always range + disclaimer.
- If a patient pushes back on a price or asks for a discount, hand off to staff — this agent has no authority to negotiate or override `Procedure.base_price`.
- If `Procedure.base_price` is null/missing for the requested procedure, do not fabricate a number — escalate to staff with an `AgentLog` flagging the catalog gap.

## Success criteria
- Estimate response time under a few seconds inside an existing conversation turn.
- Percentage of pricing questions answered without human handoff (target: high, e.g. >80%, once catalog coverage is good).
- Correlation between "quote given" (`AgentLog` entries) and downstream `appointment_booking` conversion — this is the actual business metric that justifies the agent's existence.
- Zero incidents of a quoted number being disputed as "the AI promised a different price than what was billed" (cross-checked against `payment_invoice`/`Invoice.amount`).

## Current status
Stub — `cost_estimation_agent_services.py` only has `get_status`. Needs:
- Procedure lookup/matching logic (exact + fuzzy/LLM-assisted).
- Estimate composition logic (range calculation, disclaimer injection).
- `Message`/`AgentLog` write-through on quote generation.
- Read path for `AgentConfig` estimation settings (range %, included/excluded items).
- Router/controller endpoints beyond the current `get_status` stub (e.g. `POST /agents/cost_estimation/estimate`).

## Open questions
- `Procedure` currently has a single `base_price` — no min/max range field, no per-add-on pricing (anesthesia, facility fee). Either add these columns or keep ranges config-driven (`AgentConfig`) as a stopgap.
- No linkage yet between a generated estimate and the `Invoice` eventually created by `payment_invoice` — worth deciding whether `AgentLog.details` is sufficient traceability or whether a dedicated `Estimate` table is warranted later.
- Financing/payment-plan messaging is currently just "a team member will follow up" — no financing partner (e.g. CareCredit) is integrated anywhere in the repo.
