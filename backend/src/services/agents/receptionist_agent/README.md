# AI Receptionist

## What it does
Answers every inbound call and chat message for the practice — phone, WhatsApp,
Instagram, and web chat — 24/7, in a warm human voice/tone, and figures out
what the contact needs before routing them onward (FAQ answer, booking
handoff, or human escalation).

## Where it fits in the patient journey
This is the front door of the whole system: it is almost always the **first
agent** to touch a new contact, regardless of channel.

- **Triggered by:** an inbound Twilio voice call (`POST /webhooks/twilio/voice`),
  an inbound Twilio SMS (`POST /webhooks/twilio/sms`), an inbound WhatsApp
  message (`POST /webhooks/whatsapp`), or an inbound Instagram DM (no webhook
  route exists for this yet — see Open Questions). A web-chat widget message
  would hit `POST /agents/receptionist/handle-call` or a message endpoint
  directly.
- **Right before it:** nothing internal — it's the entry point. Upstream is
  just "a patient picked up the phone / opened a chat."
- **Right after it:** depending on intent, it either answers inline (FAQ:
  hours, location, pricing ballpark), hands off to `appointment_booking_agent`
  once intent to book is confirmed, hands off to `reschedule_cancellation_agent`
  if the caller already has an appointment, or escalates to a human if the
  language sounds like a medical emergency or the caller is upset.
- **Agents it coordinates with:** `appointment_booking_agent` (booking
  handoff), `reschedule_cancellation_agent` (existing-appointment handoff),
  `multilingual_translation_agent` (if the caller isn't speaking English —
  translation happens transparently underneath this agent, not as a visible
  handoff), and implicitly `emergency_triage_agent` for anything that reads as
  urgent/clinical.

## Task flow
1. Receive the inbound event (Twilio call/SMS webhook, WhatsApp webhook, or a
   direct API call) and resolve it to a channel + sender identifier (phone
   number, WhatsApp ID, etc.).
2. Look up or create a `Conversation` row keyed on
   `(practice_id, channel, channel_conversation_id)` with `agent_type =
   "receptionist"`. Look up an existing `Patient` by phone/email if one
   matches; otherwise treat as a new/prospective patient.
3. Greet the caller and classify intent via `LLMService.chat()` (or
   `chat_with_tools()` once structured routing is needed): new patient
   inquiry, existing patient with a question, booking request, reschedule/
   cancel request, or urgent/emergency language.
4. Collect the two must-haves for any path: caller's name and reason for
   contact. Persist each turn as a `Message` row (`role=patient` /
   `role=agent`) on the `Conversation`.
5. Branch on intent:
   - **FAQ-level question** (hours, location, general procedure info, price
     range): answer directly from `LLMService.chat()` with a practice-specific
     system prompt, no handoff.
   - **Wants to book**: hand off to `appointment_booking_agent`, passing the
     `Conversation`/`Patient` context so it doesn't have to re-collect name/
     reason.
   - **Existing appointment, wants to change it**: hand off to
     `reschedule_cancellation_agent`.
   - **Emergency/urgent clinical language** (e.g. signs of infection,
     post-op complication, severe pain): stop the automated flow immediately
     and escalate to a human — see Escalation & guardrails.
6. For voice calls, wrap the LLM's reply in TwiML via
   `TwilioService.generate_twiml_response()` so Twilio can speak it back; loop
   (gather more speech, transcribe, respond) until the call resolves or hands
   off.
7. For SMS, WhatsApp, or Instagram, send the reply back on the same channel
   (`TwilioService.send_sms`, `WhatsAppService.send_text`,
   `InstagramService.send_message`).
8. On call/chat end, write an `AgentLog` entry summarizing the outcome
   (answered directly / handed off to X / escalated) for reporting.

## Data it reads
- `Patient` — lookup by phone/email to recognize returning patients.
- `Conversation` — existing thread for this channel + sender, to keep context
  across turns.
- `Message` — prior turns in the conversation, fed back into the LLM as
  history.
- `Practice` — practice name, hours, address, settings for FAQ answers.
- `AgentConfig` (agent_type="receptionist") — whether the agent is enabled
  and any per-practice config (custom greeting, escalation phone number).

## Data it writes
- `Conversation` — creates one per new contact thread; updates
  `is_active`/`updated_at`.
- `Message` — one row per turn, both patient and agent sides.
- `Patient` — creates a new row for first-time contacts once name/contact
  info is captured (or at minimum stages the data for `appointment_booking`
  to create it).
- `AgentLog` (agent_type="receptionist") — one entry per handled
  call/conversation with the resulting action.

## Integrations used
- `LLMService.chat(messages, system_prompt, tier="high")` — intent
  classification and conversational replies. `tier="high"` is appropriate
  here since misrouting a caller (e.g. missing emergency language) is a real
  cost.
- `TwilioService.make_call` / `generate_twiml_response` — voice channel.
- `TwilioService.send_sms` — SMS channel.
- `WhatsAppService.send_text` — WhatsApp channel.
- `InstagramService.send_message` — Instagram channel.
- `multilingual_translation_agent`'s service (in-process call, not a new
  external integration) — to translate non-English input/output.

## Escalation & guardrails
- Any language suggesting a medical emergency, active bleeding, severe pain,
  infection signs, or anything a licensed clinician should judge must
  short-circuit the automated flow and escalate to a human immediately (call
  transfer via `TwilioService.make_call` to the on-call staff number, or an
  urgent SMS/notification to front desk) — do not let the LLM attempt to
  reassure or diagnose.
- Follow the platform-wide rule: this agent provides informational screening
  only and does not provide medical diagnoses. All clinical decisions are
  made by licensed surgeons.
- Never invent appointment availability, pricing guarantees, or clinical
  claims — those come from `appointment_booking_agent` /
  `CalendarService` / practice-configured content, not from LLM guesswork.
- Patient identity: don't assume a caller is who their caller ID says they
  are before creating/matching a `Patient` record — confirm name + one other
  identifier (DOB or email) before attaching sensitive `medical_history`
  context to a conversation.

## Success criteria
- Every inbound call/chat gets a response within a few seconds (voice) /
  under a minute (async channels) — zero missed contacts.
- Correct intent routing rate (booking vs FAQ vs escalation) measurable via
  `AgentLog` action field, target >90% no-human-correction needed.
- Emergency-language detection has zero false negatives in review (false
  positives — over-escalating — are an acceptable tradeoff).
- Handoff to `appointment_booking_agent` results in a completed booking
  without the patient having to repeat their name/reason.

## Current status
**Partially live.** `receptionist_agent_services.py` currently implements:
- `handle_call(user)` — calls `LLMService.chat()` with a hardcoded greeting
  prompt and a receptionist system prompt, wraps the reply in TwiML via
  `TwilioService.generate_twiml_response()`, and returns
  `{"response": ..., "twiml": ...}`. It does not yet read anything about the
  actual caller (no `to`/`from` number is consumed from `user`).
- `process_message(message, conversation_id)` — calls `LLMService.chat()`
  with a generic receptionist system prompt and returns the raw string reply.
  `conversation_id` is accepted as a parameter but **not used** — no
  `Conversation`/`Message` row is read or written.
- `transcribe_audio(user)` — explicit stub, returns
  `{"transcription": "", "status": "not_implemented"}`.

Still missing (needs to be built):
- Real Twilio speech-to-text/transcription wiring for `transcribe_audio()`
  (currently the webhook handlers in
  `src/router/v1/webhooks/webhook_router.py` for `/twilio/voice` and
  `/twilio/sms` just return `{"status": "received"}` — they are not wired to
  `ReceptionistController` at all).
- WhatsApp and Instagram channel support — `WhatsAppService` and
  `InstagramService` are not imported or called anywhere in this service
  yet, despite being listed as channels this agent should cover.
- Intent classification (new/existing patient, emergency vs. FAQ vs. booking)
  — today the LLM just replies conversationally with no branching logic.
- `Conversation`/`Message`/`Patient` persistence — no DB writes happen at
  all currently.
- Handoff logic to `appointment_booking_agent` / `reschedule_cancellation_agent`.
- Emergency escalation path (human handoff).
- `AgentLog` write-through for reporting.

## Open questions
- Instagram has no inbound webhook route yet (`webhook_router.py` has
  `/twilio/voice`, `/twilio/sms`, `/whatsapp`, but no `/instagram`) — needs
  to be added before this agent can actually receive Instagram DMs.
- No webhook currently calls into `ReceptionistController` — the Twilio/
  WhatsApp webhook handlers are empty stubs. Someone needs to decide whether
  webhook handlers call the controller directly or publish to a queue first.
- How should "existing patient" identification work over voice, where there's
  no reliable identifier besides caller ID (which may not match the phone
  number on file, e.g. calling from a spouse's phone)?
