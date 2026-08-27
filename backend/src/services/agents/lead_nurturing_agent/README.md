# Lead Nurturing Agent

## What it does
Handles fresh inbound messages from prospective patients in real time — answering pricing/procedure questions conversationally and pushing toward a booked consult — across Instagram, WhatsApp, and Facebook DMs. This is the agent behind the marketing site's Omnichannel mockup example: a DM saying "How much is a rhinoplasty and do you have anything next week?" gets answered with pricing context and handed to `appointment_booking` for the scheduling part.

## Where it fits in the patient journey
Triggered by an inbound message on a social/messaging channel (`ConversationChannel.INSTAGRAM`, `WHATSAPP`, `FACEBOOK`, and reasonably `WEB_CHAT`) from a lead with no or minimal prior history — i.e., top-of-funnel. It's the first agent a fresh prospect typically talks to. It coordinates with:
- `cost_estimation` — delegates pricing questions to it rather than reimplementing price lookup itself (or calls the same underlying logic).
- `appointment_booking` — once the lead is ready ("do you have anything next week?"), hands off to actually check availability and book.
- `procedure_recommendation`/`ai_consultation` — if the lead's questions go deeper than pricing/availability into "which procedure is right for me," hands off rather than trying to give clinical-adjacent advice itself.

**Explicit distinction from `marketing_followup`**: this agent is reactive, real-time, and only engages fresh/active inbound leads. `marketing_followup` is proactive/scheduled and only targets dormant leads that already went quiet. Once `lead_nurturing` has fully answered a lead and handed off (booked, or lead goes quiet), that lead eventually becomes `marketing_followup`'s responsibility if they don't come back — the two are sequential phases of the same lead's lifecycle, never concurrent on the same lead.

## Task flow
1. Receive inbound message via the channel webhook (Instagram/WhatsApp/Facebook) and resolve/create the `Conversation` (`channel_conversation_id` matching the platform's thread ID, `agent_type="lead_nurturing"`, `patient_id` null until identified or a lead record is created).
2. Load recent `Message` history on the `Conversation` for context — this is a fresh lead, so history is typically short, but must still be passed to preserve continuity across a multi-turn DM exchange.
3. Classify intent per incoming message using `LLMService.chat_with_tools(...)` — the multi-turn, mixed-intent nature of a message like "how much is X and do you have anything next week" needs tool-calling so a single reply can gather both a price lookup and an availability check rather than answering only one and ignoring the other.
4. For pricing sub-intent: resolve the procedure and price the same way `cost_estimation` does (either call into that agent's logic directly or share the underlying `Procedure` lookup) — answer with a range + the same "estimate only, confirmed at consult" disclaimer, never inventing a number.
5. For scheduling sub-intent: hand off to `appointment_booking` to check real availability — this agent should not claim specific open slots itself without querying the actual booking system, to avoid promising a time that isn't real.
6. Compose a single natural reply covering both sub-intents in one message where possible (matching how a human handling DMs would answer), sent back via the originating channel's service: `InstagramService.send_message(recipient_id, text)`, `WhatsAppService.send_text(to, text)`.
7. If the lead expresses clear booking intent, either complete the handoff to `appointment_booking` inline or explicitly prompt for the information it needs (preferred day/time, contact info) before handing off.
8. Capture lead identification — if no `Patient` record exists yet for this contact, create a minimal one (name/contact info as available) so the lead is trackable going forward and `marketing_followup` can pick them up later if they go cold.
9. Log the interaction (`AgentLog`, `agent_type="lead_nurturing"`) including which sub-intents were detected and what (if anything) was handed off, for `analytics_dashboard`'s lead-conversion tracking.

## Data it reads
- `Conversation`/`Message`: existing thread history for this lead, keyed by `channel_conversation_id`.
- `Procedure`: `name`, `base_price`, `category` for pricing sub-intent.
- `Patient`: to check whether this contact is already a known lead/patient (match on phone/email/channel ID if available) vs. brand new.
- `AgentConfig`: practice-specific tone/config for this agent.

## Data it writes
- `Conversation`: creates new rows for fresh DM threads (`channel`, `channel_conversation_id`, `agent_type="lead_nurturing"`).
- `Message`: both inbound (role=`patient`) and outbound (role=`agent`) turns.
- `Patient`: creates a minimal lead record when a new contact is identified and enough info is available (name/contact channel), so the lead persists beyond this single conversation.
- `AgentLog`: per-message intent classification and handoff outcomes, for conversion-funnel analytics.

## Integrations used
- `LLMService.chat_with_tools(messages, tools, system_prompt)` for intent classification + drafting replies that can span multiple sub-intents (pricing + scheduling) in one turn; `LLMService.chat(..., tier="high")` for the higher-stakes conversational replies since this is a lead's first impression of the practice.
- `InstagramService.send_message(recipient_id, text)`, `WhatsAppService.send_text(to, text)` for outbound replies on the channel the lead used.
- Delegates to `appointment_booking` and `cost_estimation` rather than duplicating their logic — exact integration mechanism (direct function call vs. internal API call vs. shared service) is an implementation choice, but the boundary (this agent doesn't invent prices or fake availability) is not optional.

## Escalation & guardrails
- Never fabricate appointment availability — always defer the actual slot-check/booking to `appointment_booking`'s real calendar logic.
- Never quote a price outside the `Procedure` catalog, same rule as `cost_estimation`.
- If the lead asks something clinical ("is this safe for me given my medical history"), don't answer from the LLM's general knowledge — redirect to `procedure_recommendation`/`ai_consultation` or a human, since this agent's scope is sales/scheduling conversation, not clinical guidance.
- If the lead expresses distress, a medical emergency, or anything matching `emergency_triage`'s territory, immediately escalate/hand off rather than continuing a sales-oriented conversation.

## Success criteria
- Response latency on inbound DMs low enough to feel real-time (seconds, not minutes) — slow replies lose leads on social channels.
- Lead-to-booked-consult conversion rate, trackable via `AgentLog` handoff records into `appointment_booking`.
- Percentage of multi-intent messages (like the pricing+availability example) answered fully in one reply vs. requiring a follow-up round-trip.
- Every fresh inbound DM results in either a `Patient` lead record or an identifiable `Conversation` for later win-back by `marketing_followup` — no lead should be lost due to missing tracking.

## Current status
Stub — `lead_nurturing_agent_services.py` only has `get_status`. Needs:
- Inbound webhook handling for Instagram/WhatsApp/Facebook to create/resolve `Conversation`s (may already exist at the channel-webhook layer outside this agent — needs confirming).
- Intent classification + multi-intent reply composition via `LLMService.chat_with_tools`.
- Pricing sub-flow (shared with or delegating to `cost_estimation`).
- Scheduling sub-flow handoff to `appointment_booking`.
- Lead record creation logic for new contacts.

## Open questions
- Exact handoff mechanism to `appointment_booking`/`cost_estimation` — direct in-process service calls, or should each agent expose a callable interface for other agents to invoke? Not yet established as a pattern anywhere in the current stub code.
- Deduplication/hand-off boundary with `marketing_followup` (see that agent's README) needs a shared convention, e.g. an explicit "lead stage" concept, since neither agent's schema currently encodes it.
- Whether `Conversation.metadata` (JSONB) is the right place to stash intermediate lead-qualification data (procedure of interest, budget signals) gathered mid-conversation, or whether that belongs on `Patient` once a record exists.
