# Photo Analysis (Screening)

## What it does
Accepts patient-submitted photos, stores them via `StorageService`/Cloudinary, and runs a vision-capable LLM pass that flags visible, screening-relevant candidacy factors (asymmetry, skin laxity indicators, visible scarring, photo quality issues) for the surgeon to review — it never produces a diagnosis, verdict, or recommendation itself.

## Where it fits in the patient journey
Runs after (or alongside) `ai_consultation_agent`, once the patient has an active `Conversation`/`Appointment` and has been asked to upload photos relevant to their stated procedure of interest. It typically fires from a patient-facing upload UI (web or a link sent via SMS/WhatsApp/email). Its output feeds directly into `risk_assessment_agent` (as one input signal among several) and is visible to the surgeon before `procedure_recommendation_agent`'s suggestions are finalized or before the video/in-person consult. It does not talk to the patient about results — any patient-facing message is limited to upload confirmation and "your care team will review these."

## Task flow
1. Receive the uploaded file(s) from the patient-facing endpoint (multipart upload, or a photo forwarded via a messaging channel).
2. Validate file type/size and basic quality (not blank, not corrupted) before spending money on storage or an LLM call.
3. Upload each photo via `StorageService.upload(file_bytes, filename, folder="patient_photos")` (backed by `CloudinaryService`), capturing the returned `public_id`/`url`.
4. Persist a `PatientPhoto` row per photo: `patient_id`, `cloudinary_public_id`, `cloudinary_url`, `photo_type` (e.g. `"front"`, `"profile_left"`, `"profile_right"` — whatever taxonomy the upload UI enforces).
5. Call the vision-capable model via `LLMService.chat(...)` (or the OpenAI vision-capable model path if `LLMService` needs a small extension to accept image inputs — see Open Questions) with a strict screening-only system prompt that asks it to describe *observable* features relevant to the requested procedure category, not to judge suitability.
6. Parse the model's response into a structured flags object, e.g. `{"observations": [...], "photo_quality": "usable"|"retake_needed", "flagged_for_review": true|false}`. Store this structured object — `PatientPhoto` has no JSONB field for it today, so until a schema change lands, serialize it into `PatientPhoto.notes` (Text) as JSON, or attach it to `Conversation.metadata` keyed by photo id (see Open Questions — this is a real gap).
7. If `photo_quality == "retake_needed"`, message the patient (via whichever channel they used) asking for a clearer photo — this is the only patient-facing content this agent generates on its own.
8. Write an `AgentLog` entry (`agent_type="photo_analysis"`, `action="photos_screened"`, `details={patient_photo_ids, flagged_for_review}`) so staff dashboards can surface "needs surgeon review" queues.
9. Never write a plain-language "result" back to the patient. The only patient-facing outputs are: upload confirmation, retake requests, and "your photos have been added to your file for your surgeon to review."

## Data it reads
- `Patient`: `id`, to associate photos.
- `Conversation`: to know which agent/appointment context the upload belongs to.
- `AgentConfig` (`agent_type="photo_analysis"`): per-practice settings (required photo angles, max file size, whether auto-flagging is enabled).

## Data it writes
- `PatientPhoto`: one row per uploaded photo (`cloudinary_public_id`, `cloudinary_url`, `photo_type`, `notes`).
- `AgentLog`: one row per screening pass, with structured flags in `details`.
- Optionally `Conversation.metadata` if that's the chosen home for structured flags (see Open Questions).

## Integrations used
- `StorageService.upload(file_bytes, filename, folder)` / `StorageService.delete(public_id)` (backed by `CloudinaryService.upload_from_bytes` / `delete_image`) — this is the actual persistence path for the images.
- `LLMService.chat(messages, system_prompt, tier="high")` for the vision screening pass — must stay on the high tier given the sensitivity of the content; this should never be routed to the cheap tier.
- Whichever channel service received the upload (`TwilioService`/`WhatsAppService`/`InstagramService`/web) only for the retake-request message — this agent doesn't own channel delivery itself.

## Escalation & guardrails
This is the agent where "screening only, never a diagnosis" is most load-bearing, and it must be enforced at the prompt and output-filtering level, not just documentation:
- **What it MAY say (to itself/staff, in structured flags):** "asymmetry visible in submitted front-view photo," "scarring visible in prior-surgery area," "photo quality insufficient for review — recommend retake," "image consistent with patient's stated procedure area."
- **What it MAY say to the patient directly:** "Thanks, we've received your photos," "Could you upload a clearer photo — retake with better lighting," "Your photos have been added to your file for your surgeon to review."
- **What it must NEVER say, to patient or in any field that could be surfaced to a patient:** anything implying candidacy ("you look like a good candidate"), anything implying a diagnosis ("this looks like it needs revision surgery"), anything quantifying severity in clinical terms ("grade 3 ptosis"), or any comparison to "normal"/aesthetic ideals framed as medical judgment.
- Every screening output must be tagged as staff/surgeon-facing only (never rendered in a patient-visible view) — enforce this in the API/serializer layer, not just by convention.
- If a photo shows something acute (visible wound dehiscence, signs of infection, injury) rather than a routine candidacy factor, the agent must short-circuit into an urgent-review flag distinct from routine screening flags, and that should route toward the same human-escalation path `emergency_triage_agent`/staff use — do not let it sit in a normal review queue.
- Reuse this exact framing anywhere output could be read as medical judgment: *"Screening agents provide informational screening only and do not provide medical diagnoses. All clinical decisions are made by licensed surgeons."*

## Success criteria
- 100% of stored screening flags are attributable to a specific `PatientPhoto` and never rendered in a patient-facing view (verified by an access-control/serializer test, not just review).
- Retake-request rate is low enough to not create friction (track `photo_quality == "retake_needed"` rate over time; a sustained spike signals a prompt or UX problem).
- Surgeon review queue (photos flagged `flagged_for_review=true`) gets actioned within the practice's target SLA — measurable once staff tooling consumes the `AgentLog`/flags.
- Zero occurrences in QA sampling of diagnostic or candidacy language leaking into any patient-visible message.

## Current status
Stub — `photo_analysis_agent_services.py` has no real logic yet. Needs: upload handling + validation, `StorageService` wiring, `PatientPhoto` persistence, vision-model prompt design and structured-output parsing, the retake-request flow, and the surgeon-facing flag queue.

## Open questions
- `PatientPhoto` has no structured field for screening flags (only `notes: Text`) — decide whether to (a) serialize JSON into `notes`, (b) add a `flags`/`analysis` JSONB column to `PatientPhoto`, or (c) store flags in `Conversation.metadata`/`AgentLog.details` keyed by photo id. A schema addition is probably the cleanest long-term answer.
- `LLMService.chat()` as written takes `messages: list[dict]` of text content — confirm/extend it to accept image inputs (OpenAI vision message format) before this agent can actually call it; that may be a small `LLMService` change rather than something to route around.
- No model captures "who reviewed this and when" for the surgeon-review workflow — likely needs a lightweight review-status field or reuse of `AgentLog` with a follow-up `action="reviewed_by_staff"` entry.
