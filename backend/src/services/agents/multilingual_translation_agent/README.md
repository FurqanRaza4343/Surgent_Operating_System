# Multilingual Translation

## What it does
Detects the language a patient is communicating in and translates
transparently in both directions — patient messages into English for other
agents to reason over, and outgoing agent replies into the patient's language
— so a non-English-speaking patient gets the same experience as everyone
else without any other agent needing to know or care what language is
involved.

**This is a cross-cutting support agent, not a channel entry point.** Unlike
`receptionist`, `appointment_booking`, `reschedule_cancellation`, and
`appointment_reminder`, patients never talk to this agent directly and it has
no standalone conversation flow of its own. It is a service other agents call
into — most naturally `receptionist_agent` on the way in/out of every turn,
but potentially any agent that sends patient-facing text (reminders,
confirmations, follow-ups).

## Where it fits in the patient journey
- **Triggered by:** a call from another agent's code, not by a patient action
  or webhook directly. Typically invoked twice per conversational turn: once
  to translate the patient's inbound message to English before the calling
  agent's own LLM reasoning, and once to translate that agent's outbound
  reply into the patient's detected language before sending.
- **Right before it:** whichever agent is mid-conversation with a
  non-English-speaking patient — almost always `receptionist_agent` first,
  but potentially `appointment_booking_agent`, `reschedule_cancellation_agent`,
  or `appointment_reminder_agent`'s reply-handling path too.
- **Right after it:** control returns to the calling agent, which proceeds
  as if the exchange had been in English throughout.
- **Does not hand off** to other agents itself — it has no patient journey
  position of its own, only a role inside other agents' flows.

## Task flow
1. Receive a call from another agent with either (a) an inbound patient
   message to translate to English, or (b) an outbound agent reply to
   translate into the patient's language, plus enough context to know which
   patient/conversation this is for.
2. Determine the patient's language. Preferred source: look at
   `Conversation`/`Message` history for this patient — if a language was
   already detected earlier in the thread, reuse it rather than
   re-detecting every turn (cheaper and more consistent than per-message
   detection, which can flip on short messages like "ok"). If this is the
   first message in the conversation, detect language from the message text
   itself.
3. Call `LLMService.chat()` with a translation-focused system prompt —
   `tier="low"` is a reasonable default here since translation is
   comparatively low-stakes and Mistral is cheaper, with the existing
   automatic fallback to OpenAI on rate-limit covering reliability. Escalate
   to `tier="high"` only if a practice explicitly needs higher-fidelity
   translation for something like consent-form language (a judgment call for
   the calling agent to make, not this service).
4. For inbound (patient → English): return the English translation plus the
   detected source language code, so the calling agent can (a) reason in
   English and (b) know what language to translate its reply back into.
5. For outbound (agent reply → patient language): return the translated
   text, ready to send as-is on whatever channel the calling agent uses.
6. Persist the detected language somewhere reusable across turns — most
   naturally `Conversation.metadata` (JSONB, e.g. `{"language": "es"}`) so
   subsequent calls in the same conversation skip re-detection.
7. Optionally store both the original and translated text on the `Message`
   row (e.g. in `Message.metadata`) so a human reviewing the conversation
   later can see what the patient actually said, not just the English
   translation — important for any dispute or clinical review.

## Data it reads
- `Conversation.metadata` — previously detected language for this thread, if
  any.
- `Message` — recent message history, both for language re-detection
  fallback and for translation context (tone, prior terminology used).

## Data it writes
- `Conversation.metadata` — the detected/confirmed language code, so it
  persists across the conversation instead of being re-computed per message.
- `Message.metadata` — optionally, the original-language text alongside the
  translated text, for audit/review purposes.

## Integrations used
- `LLMService.chat(messages, system_prompt, tier="low")` — both language
  detection and translation, via a translation-focused system prompt (e.g.
  "Translate the following patient message to English. Return only the
  translation." / "Translate the following into <language>, keeping a warm,
  professional tone appropriate for a medical practice.").

## Escalation & guardrails
- This agent has no direct patient contact and no decision-making authority
  — it should never alter meaning, add information, or soften/strengthen
  clinical language during translation. A mistranslation of urgent/emergency
  language is a real safety risk, since the calling agent's emergency
  detection logic depends on getting an accurate English translation to
  reason over.
- If translation confidence is low (e.g. a very short or ambiguous message,
  or a language the model handles poorly), the calling agent should be told
  so it can fall back to asking the patient to clarify or escalating to a
  human, rather than silently proceeding on a guess.
- Never translate away or omit content — especially anything that could read
  as urgent/clinical — for brevity or tone-smoothing.
- Original patient wording should remain retrievable (see Data it writes)
  for any later human review, particularly for anything touching consent or
  clinical decisions.

## Success criteria
- Non-English-speaking patients report/experience the same quality of
  interaction as English-speaking ones (no measurable drop in booking
  completion, escalation accuracy, etc. by detected language).
- Language detection is stable within a conversation (doesn't flip-flop
  turn to turn).
- Translation round-trip doesn't introduce a noticeable latency penalty to
  the calling agent's response time (this runs twice per turn, so it needs
  to be fast, not just accurate).
- Zero cases where a translation error caused a missed emergency-language
  escalation (this is the highest-severity failure mode for this agent,
  even though the agent itself is "just" translation).

## Current status
Stub — `multilingual_translation_agent_services.py` has no real logic yet.
It only has `get_status()`. Needs:
- `LLMService` wiring with a translation-specific system prompt.
- Language detection logic (and where to cache the result —
  `Conversation.metadata` is the natural fit but nothing writes to it today).
- A clear function-level contract other agents call (e.g.
  `to_english(text, conversation_id)` / `to_patient_language(text,
  conversation_id)`) since, unlike the other four agents, this one is
  consumed in-process by other services rather than exposed as a standalone
  patient-facing flow.
- Decide and document how the calling agents (starting with
  `receptionist_agent`, which currently has no translation call at all) are
  expected to invoke this service — direct method call within the same
  process is the natural approach given there's no message queue between
  agents today.

## Open questions
- Should this be invoked as a direct in-process function call from other
  agent services, or does the project want a more formal internal interface
  (e.g. every outbound-agent path always round-trips through this service)?
  Nothing in the current router/controller structure prescribes this — each
  agent's router only exposes its own `/status` endpoint, so there's no
  existing "agent calls agent" pattern to follow yet.
- Where exactly does detected language get stored — `Conversation.metadata`
  is the best fit among existing models, but confirm that's acceptable
  rather than adding a dedicated `language` column to `Conversation` or
  `Patient` (the latter might make sense if a patient's language preference
  should persist across conversations, not just within one).
