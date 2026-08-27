# Emergency Triage

## What it does
Detects potential post-op medical emergencies reported by a patient on any channel — or handed off from another agent — classifies severity, and immediately notifies on-call staff while telling the patient exactly what to do. **This is the single most safety-critical agent in the entire platform.** Every other Post-Surgery Care agent (`recovery_followup`, `healing_monitoring`, `medication_reminder`, `wound_care_guidance`) is required to route to this agent rather than attempt to handle a concerning symptom themselves — this agent is the one place in the system where a missed signal has the most severe possible consequence.

## Where it fits in the patient journey
Reactive, and can be entered two ways:
1. **Patient-initiated** — a patient messages or calls on any channel (`phone`, `sms`, `whatsapp`, `instagram`, `facebook`, `web_chat`, `email`) describing something concerning.
2. **Agent-initiated hand-off** — `recovery_followup_agent`, `healing_monitoring_agent`, `medication_reminder_agent`, or `wound_care_guidance_agent` detects red-flag language mid-flow and routes here instead of continuing its own logic.

Once this agent runs, control passes to a human. Its job ends at "escalated, on-call staff notified, patient told what to do" — it is explicitly **not** a counselor and must not continue managing the conversation, offer reassurance, or attempt any further clinical back-and-forth once escalation has happened.

- **Upstream:** any of the four agents above, or a raw patient message.
- **Downstream:** on-call `User` (phone call and/or SMS), the patient (direct instruction), and `recovery_dashboard_agent` (via the `RecoveryJournal` status update this agent makes, so staff see it flagged immediately).

## Task flow
1. Receive the triggering input: either an inbound `Message` on a `Conversation`, or a direct hand-off call from another agent's service class carrying `patient_id`, the concerning text, and which agent detected it.
2. Classify severity using `LLMService.chat(messages, system_prompt=<clinical triage screening prompt>, tier="high")`. **This must always be `tier="high"`, with no exception and no config path to override it** — routing this classification through the cheaper Mistral tier is an unacceptable risk given what's at stake, regardless of cost pressure elsewhere in the system.
3. Classify into severity tiers based on concrete criteria, e.g.:
   - **EMERGENCY** (call 911 / go to ER now): difficulty breathing, chest pain, signs of stroke, anaphylaxis (facial/throat swelling, hives with breathing difficulty), loss of consciousness or fainting, uncontrolled/heavy bleeding.
   - **URGENT** (on-call surgeon must be reached within the hour): fever over ~101.5°F/38.6°C, spreading redness or red streaking from the incision, wound dehiscence (incision reopening/separating), pus or foul-smelling discharge combined with fever, severe pain unresponsive to prescribed medication, one-sided leg swelling/pain/redness (possible DVT/PE).
   - **CONCERNING** (same-day clinical review, not 911): mild fever, moderate increased pain, small amount of unexpected drainage, general "something feels off" reports.
4. For **EMERGENCY**: reply to the patient immediately, before anything else, telling them to call 911 or go to the nearest ER now. Do not wait on staff notification to send this.
5. For **EMERGENCY** and **URGENT**: notify on-call staff synchronously, not queued for later. Look up the practice's on-call `User`(s) and call `TwilioService.make_call(to=user.phone, twiml_url=...)` for EMERGENCY (a phone call demands immediate attention in a way SMS doesn't), and/or `TwilioService.send_sms(to=user.phone, message=...)` for URGENT. The message/call script should include patient name, phone, a summary of the reported symptoms, and the severity tier.
6. For **CONCERNING**: send an SMS/WhatsApp notification to on-call or front-desk staff (a call isn't warranted), and tell the patient someone from the practice will follow up the same day.
7. Persist everything: log the patient-facing reply and any staff notification as `Message` row(s) on the `Conversation`, and write an `AgentLog` entry (`agent_type="emergency_triage"`, `action="escalation"`, `details` = severity tier, symptoms detected, which staff were notified, the Twilio call/SMS SIDs returned).
8. Update the patient's `RecoveryJournal` (if an active one exists) — set `status` to something like `"flagged"` or `"escalated"` and append a `notes` entry — so `recovery_dashboard_agent` reflects it without any additional wiring.
9. Never provide clinical guidance beyond directing the patient to the appropriate level of care. No home remedies, no "that's probably fine," no medication suggestions — only "seek care now" / "our on-call team will reach out shortly," phrased in a way consistent with the platform's screening-only rule.
10. If the patient keeps messaging after escalation, responses stay limited to confirming help is on the way — do not reopen triage or start re-assessing severity conversationally.

## Data it reads
- `Patient` — contact info.
- `Conversation` / `Message` — the triggering text and conversation history.
- `User` — the practice's on-call roster (phone numbers, role).
- `RecoveryJournal` — procedure context and recovery day, if an active journal exists.
- `Practice` — practice contact info for call/SMS scripts.

## Data it writes
- `Message` — the patient-facing reply and any staff-notification record.
- `AgentLog` — the escalation record; treat this as close to a compliance/audit log given the stakes.
- `RecoveryJournal.status` / `notes` — updated to reflect the escalation immediately.

## Integrations used
- `LLMService.chat(messages, system_prompt, tier="high")` — **always**, for severity classification. This is the one non-negotiable tier rule in this entire agent category.
- `TwilioService.make_call()` — EMERGENCY-tier on-call notification.
- `TwilioService.send_sms()` — URGENT/CONCERNING-tier on-call/staff notification, and patient SMS replies.
- `WhatsAppService.send_text()` / `EmailService.send()` — reply on the channel the patient used, and as supplementary staff-notification channels.

## Escalation & guardrails
This section largely *is* the agent — the severity tiers in Task flow step 3 are the concrete trigger conditions. A few additional rules:
- **Bias toward escalating.** A false positive (staff gets notified unnecessarily) is an acceptable cost. A false negative (a real emergency goes unflagged) is not. If the `tier="high"` classification is ambiguous or low-confidence, default to at least CONCERNING-tier notification — never silently drop an uncertain case.
- Additional red-flag categories beyond the tier list above: confusion or altered mental state, allergic reaction signs (hives, facial/throat swelling), and any language suggesting the patient is in crisis or considering self-harm — treat as EMERGENCY.
- This agent is the terminal handler for concerning symptoms in this category. It does not hand off to any other Post-Surgery Care agent — by design, everything upstream hands off *to* it, not the reverse.

## Success criteria
- Time from a red-flag detection to on-call staff notification for EMERGENCY/URGENT tiers — target is seconds, not minutes (this must be synchronous, not batched into a periodic job).
- Zero missed true emergencies found in periodic manual audit sampling of triage transcripts.
- On-call staff acknowledgment is tracked (did someone actually respond to the call/SMS).
- Every EMERGENCY/URGENT classification has a corresponding immediate patient-facing "seek care now" message in the `Message` log — auditable, not just assumed.

## Current status
Stub — `emergency_triage_agent_services.py` has no real logic yet (`get_status()` only). Needs:
- The severity classification prompt and tier logic (hard-coded to `tier="high"`).
- The on-call roster lookup (see Open Questions — no on-call field exists on `User` yet).
- The `TwilioService.make_call()` TwiML endpoint for the alert script.
- The synchronous hand-off entry point other agents call into.
- The `RecoveryJournal` status update logic.

## Open questions
- **`User` has no on-call field.** The model has only a free-text `role` string (default `"staff"`) — there's no `on_call: bool`, no on-call schedule/rotation, and no way today to query "who is on-call right now for this practice." This needs a model change (a boolean flag at minimum, ideally a rotation/schedule) before real on-call notification can work.
- No TwiML endpoint exists yet for `TwilioService.make_call()`'s `twiml_url` argument specific to an emergency alert script — `TwilioService.generate_twiml_response()` exists as a static helper, but the webhook route that serves it for this use case isn't built.
- **No cross-agent hand-off mechanism exists in the codebase.** Given the hand-off from other agents must be immediate/synchronous, this should most likely be a direct call into `EmergencyTriageService` from the calling agent's service class — but this needs to be decided once and documented, since every other agent in this category depends on it existing.
- Whether `AgentLog` alone is sufficient for the audit/compliance trail this agent produces, or whether a dedicated incident/escalation table is warranted given HIPAA-adjacent record-keeping expectations, is worth a deliberate decision rather than defaulting to `AgentLog`.
