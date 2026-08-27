# Healing Progress Monitoring

## What it does
Receives patient-submitted wound/incision photos, stores them, builds a chronological photo timeline per patient, and screens accompanying captions/descriptions for anything concerning — always in "flagging for your care team to review" language, never a diagnostic statement like "this looks infected" or "this looks fine."

## Where it fits in the patient journey
Reactive to an inbound image, not scheduled itself, but it is usually prompted into existence by `recovery_followup_agent`, which asks patients to submit a photo at certain check-ins. It also accepts photos a patient sends unprompted at any point in their recovery, on any channel that supports media (WhatsApp, SMS/MMS, web chat upload, Instagram DM).

- **Upstream:** an inbound message with an image attachment on any channel, or an explicit photo request from `recovery_followup_agent`.
- **Downstream / handoffs:**
  - **Critical boundary:** if the caption/description accompanying a photo (or the patient's follow-up messages about it) contains red-flag symptom language, this agent must hand off to `emergency_triage_agent` immediately. It does not attempt to make that call itself from the image alone — there is no vision-diagnostic capability in this repo (see Open Questions), and even if there were, the site's screening-only rule means it still would not diagnose.
  - Photo references and any flags get attached to the patient's `RecoveryJournal` entry so `recovery_dashboard_agent` can surface "photo flagged, needs staff review" in the staff view.

## Task flow
1. Detect an inbound image attachment on a `Conversation` (from a Twilio MMS webhook, WhatsApp media message, or web chat upload).
2. Download the image bytes and call `StorageService.upload(file_bytes, filename, folder="patient_photos/{patient_id}")` (this delegates to `CloudinaryService.upload_from_bytes` internally).
3. Create a `PatientPhoto` row: `patient_id`, `cloudinary_public_id`, `cloudinary_url` from the upload result, `photo_type` (e.g. `"incision"`, `"bruising"`, `"general"` — inferred from context or the check-in that prompted it), `notes` = the patient's caption, if any.
4. Pull the patient's prior `PatientPhoto` rows (same `patient_id`, ordered by `created_at`) to build a simple chronological comparison — pairing this submission with the most recent prior one and the recovery day each corresponds to (via the linked `RecoveryJournal`).
5. Update the matching `RecoveryJournal.notes` (JSONB) with a photo reference tied to `recovery_day`, e.g. `notes["photos"].append({"photo_id": ..., "day": ..., "flagged": false})`.
6. Screen the caption/accompanying text against the red-flag keyword list (see Escalation). This is a **text/keyword screen, not image analysis** — there is no vision model wired into `LLMService` today.
7. If a flag trips: mark the photo/journal entry as flagged (see Open Questions on where that lives), hand off to `emergency_triage_agent` with the patient's description, and reply to the patient reflecting the urgency of that hand-off rather than the routine "thanks" reply below.
8. If not flagged: reply to the patient with a screening-only acknowledgment — "Thanks, this has been added to your recovery record. Your care team will review it." Never state that the photo looks normal, healing well, or infected — that is a clinical read only a surgeon makes.
9. Write an `AgentLog` entry recording the photo submission and any flag raised, so staff can audit what happened and `recovery_dashboard_agent` can surface unreviewed flagged photos.
10. If the patient asked a direct question alongside the photo ("does this look okay?"), the reply must redirect to the care team rather than answer — this agent does not evaluate wound appearance for the patient.

## Data it reads
- `PatientPhoto` — the patient's photo history, to build the chronological comparison.
- `RecoveryJournal` — to find the active journal to attach the photo reference to, and to read `recovery_day`.
- `Patient` — contact info, `practice_id`.
- `Conversation` / `Message` — the caption/description text accompanying the photo.

## Data it writes
- `PatientPhoto` — new rows per submitted photo.
- `RecoveryJournal.notes` — photo references keyed by recovery day.
- `AgentLog` — one entry per photo received, and per flag raised.
- `Message` — the agent's acknowledgment reply.

## Integrations used
- `StorageService.upload()` (→ `CloudinaryService.upload_from_bytes()`) — storing the photo.
- `TwilioService.send_sms()` / `WhatsAppService.send_text()` — the acknowledgment reply, on whichever channel the photo arrived on.
- `LLMService.chat(messages, system_prompt, tier="high")` — only for screening/summarizing the caption text against red-flag language, if keyword matching alone is judged insufficient. Use `tier="high"` here, not `"low"`, since a missed flag on a wound photo caption is a safety-relevant failure, not a routine chat.

## Escalation & guardrails
Hand off to `emergency_triage_agent` immediately if the caption/description accompanying a photo (or the patient's messages around it) mentions: bleeding that won't stop, foul odor or pus, spreading redness or red streaking, the wound reopening/separating (dehiscence), black or necrotic-looking tissue, fever, or the patient expressing significant alarm about worsening appearance.

This agent must **never** issue a diagnostic statement about a photo — no "this looks infected," no "this looks normal/healing well," no percentage/severity score communicated to the patient. The only two allowed patient-facing outcomes are: (a) routine acknowledgment that the photo was added to their record for care-team review, or (b) an emergency hand-off telling them to seek care now. Anything in between belongs to the surgeon reviewing the photo, not this agent.

## Success criteria
- Photo submission compliance against the cadence `recovery_followup_agent` requests.
- Staff review turnaround time for flagged photos (measurable once a review queue/flag field exists).
- Zero instances, on audit, of the agent producing diagnostic language about a photo.
- Correct linkage rate of photos to the right `RecoveryJournal` entry/recovery day.

## Current status
Stub — `healing_monitoring_agent_services.py` has no real logic yet (`get_status()` only). Needs:
- Inbound media handling for each channel (Twilio MMS webhook parsing, WhatsApp media download, web chat upload endpoint).
- The upload → `PatientPhoto` → `RecoveryJournal.notes` linkage.
- The red-flag caption screen.
- The hand-off call into `emergency_triage_agent`.
- A decision on where "flagged" state lives (see Open Questions) and how staff review it.

## Open questions
- **No vision-capable model is wired up.** `LLMService` today only does text chat completions against OpenAI/Mistral — there's no image-understanding call in the codebase. If genuine visual comparison (not just caption screening) is wanted, that's new work: either an OpenAI vision-capable model call with image URLs, or a separate CV pipeline. Until that exists, this agent can only screen the *text* around a photo, not the photo content itself — worth confirming that's an acceptable v1 scope.
- `PatientPhoto` has no `flagged`, `reviewed_by`, `reviewed_at`, or `ai_notes` columns — only `patient_id`, `cloudinary_public_id`, `cloudinary_url`, `photo_type`, `notes` (Text), `created_at`. Flag state needs a home: either a migration adding those columns, or reusing `notes`/`RecoveryJournal.notes` as a stopgap. Recommend a migration since flag state is queried by `recovery_dashboard_agent` and needs to be structured, not buried in free text.
- No defined "staff review queue" beyond what `recovery_dashboard_agent` will surface — worth confirming that's the only review surface intended (vs. a dedicated inbox).
- How inbound MMS/WhatsApp media attachments actually reach this agent (webhook parsing, download, content-type handling) isn't built anywhere yet in the codebase.
