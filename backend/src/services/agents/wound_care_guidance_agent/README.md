# Wound Care Guidance

## What it does
Answers patient questions about post-op aftercare — dressing changes, showering, activity restrictions, general do's-and-don'ts — using practice-approved instructional content rather than free-form LLM generation, specifically to keep clinical liability low. This agent *answers* questions; `recovery_followup_agent` *asks* them — the two should not be confused.

## Where it fits in the patient journey
Reactive — a patient asks an aftercare/how-to question, on any channel, at any point in their recovery.

- **Upstream:** an inbound patient message classified as an aftercare/instructional question (by whatever routes inbound messages to the right agent across the platform — not built yet, see Open Questions).
- **Downstream / handoffs:**
  - **Critical boundary:** a message that reads as a symptom report rather than a how-to question — e.g. "is it normal that my incision is bleeding a lot?" — is not an aftercare question, it's a red flag. This agent must recognize that distinction and hand off to `emergency_triage_agent` instead of answering with generic wound-care tips.
  - A question outside the practice's approved content library is not answered from general knowledge — it gets escalated to staff instead (see Task flow step 9).

## Task flow
1. Receive the inbound patient question on a `Conversation`.
2. Run the same red-flag screen used elsewhere in this category on the message **before** treating it as an instructional question. If it reads as a symptom report, hand off to `emergency_triage_agent` immediately and stop — do not proceed to steps 3+.
3. Identify the relevant context — the patient's `Procedure` and current `recovery_day` (via their `RecoveryJournal`) — since instructions differ by procedure and by how far post-op the patient is (e.g. "day 3 showering guidance" differs from "day 14").
4. **Recommended approach:** retrieve the matching pre-approved, practice-authored instruction content for that procedure/topic/recovery stage, rather than asking the LLM to generate care instructions from general medical knowledge. This keeps every instruction traceable to something a surgeon actually signed off on. This requires a retrieval/knowledge-base layer that **does not exist in this repo yet** — see Open Questions. Until it's built, a stopgap is a curated, structured set of practice-approved snippets (e.g. keyed by procedure + topic, stored in `AgentConfig.config` or a new `Procedure`-linked instructions field) rather than truly free-form generation.
5. Use `LLMService.chat(messages, system_prompt, tier="low")` **only** to phrase/personalize the retrieved approved content to the patient's specific wording of the question — this is routine informational content, not diagnostic, so low tier is appropriate. The system prompt must instruct the model to answer using **only** the supplied approved content and to never add clinical guidance beyond it.
6. Always append the standard disclaimer: this is general aftercare information, not medical advice — contact the practice or your surgeon with concerns.
7. Send the reply via the channel the question arrived on (`TwilioService.send_sms()`, `WhatsAppService.send_text()`, `EmailService.send()`, or the web chat response path).
8. Log the exchange (`Message` on the `Conversation`) and an `AgentLog` entry recording which topic/content item was served, so staff can audit "what has the bot told patients" at any time.
9. If the question falls outside the approved content library (topic not covered), do not improvise an answer — tell the patient a staff member will follow up, and notify staff, rather than let the LLM answer from general knowledge.

## Data it reads
- `Patient` — contact info.
- `RecoveryJournal` — `recovery_day`, `procedure_id`, for selecting the right instructions.
- `Procedure` — `name`/`category` to pick the correct content.
- `Conversation` / `Message` — the patient's question and prior context.
- `AgentConfig` — which approved content set/version applies for the practice, if config-driven.

## Data it writes
- `Conversation` / `Message` — the reply sent.
- `AgentLog` — which topic/content item was served, for compliance/audit purposes (this is the record that proves the bot only ever repeated approved content).

## Integrations used
- `LLMService.chat(messages, system_prompt, tier="low")` — strictly for rephrasing/personalizing retrieved approved content, never as the source of clinical instructions itself.
- `TwilioService.send_sms()` / `WhatsAppService.send_text()` / `EmailService.send()` — reply delivery on the originating channel.
- Explicitly **not** `StorageService`/`CloudinaryService` — photo handling belongs to `healing_monitoring_agent`.

## Escalation & guardrails
- Any message describing an active symptom rather than asking a procedural question — bleeding, escalating pain, fever, discharge, breathing difficulty, or any of the red-flag list used elsewhere in this category — routes to `emergency_triage_agent`, not to an aftercare answer.
- A question outside the approved content library is escalated to a human, never answered from the LLM's general knowledge — this is the core liability control for this agent and should not be relaxed for convenience.
- No instruction should ever be sent to a patient that isn't traceable back to a specific approved content item logged in `AgentLog`.

## Success criteria
- Percentage of patient aftercare questions successfully answered from approved content vs. escalated to staff.
- Zero instances, on audit, of the agent giving instructions not traceable to an approved source (verifiable via the `AgentLog` topic-served record).
- Reduced front-desk call volume for routine aftercare questions, without an increase in incorrect-guidance complaints.

## Current status
Stub — `wound_care_guidance_agent_services.py` has no real logic yet (`get_status()` only). Needs:
- The red-flag pre-screen (shared logic with the other agents in this category, ideally not duplicated per agent).
- A decision on and build-out of the content retrieval mechanism (see Open Questions — this is the biggest open dependency for this agent).
- The rephrasing-only system prompt for `LLMService.chat(tier="low")`.
- The "outside approved content → escalate to staff" fallback path.

## Open questions
- **No RAG/knowledge-base/document-search service exists anywhere in this repo.** `frontend/system.md` describes a `document_search_rag` module (FAISS vector DB, ingestion/retriever for PDFs/images) as part of the intended architecture, but nothing under that name is implemented in `backend/src`. This agent's entire liability-reduction design depends on retrieval over pre-approved content existing in some form. Two paths forward:
  1. Build a minimal retrieval service first (even a simple keyed lookup over structured content, not necessarily a full vector DB) that this agent and potentially others can use.
  2. Ship a v1 stopgap: a small number of practice-approved, structured instruction snippets stored directly (e.g. a new field/table linked to `Procedure`, explicitly reviewed and approved by practice staff before use), with the LLM permitted only to rephrase, never originate content. This is the recommended starting point given no RAG infra exists today.
- No central intent router exists yet to determine which inbound patient message goes to which reactive agent (`wound_care_guidance` vs. `recovery_followup` vs. others) — this is a platform-wide gap, not specific to this agent, but this agent can't be reached correctly without it.
- Where practice-approved content actually gets authored/edited/versioned by staff (a CMS-like flow) is undefined — worth scoping alongside the retrieval mechanism itself.
