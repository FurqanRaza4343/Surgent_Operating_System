# Video Consultation

## What it does
Schedules a virtual consultation visit on the practice's calendar and manages the automated logistics around it (booking, confirmation, reminders, meeting-link delivery) — it does not itself provide video/audio conferencing, which has to come from a third-party integration not yet present in this codebase.

## Where it fits in the patient journey
Offered as an alternative or follow-up to `ai_consultation_agent`'s text-based intake, typically when a patient wants to speak to a surgeon or care coordinator face-to-face before committing to an in-person visit. It reads availability the same way `appointment_booking_agent`/`surgeon_calendar_agent` would, and once booked it creates the same kind of `Appointment` row those agents produce (`appointment_type="video_consultation"`). Downstream, `pre_surgery_preparation_agent`-style reminder logic (or `appointment_reminder_agent`) should pick up the resulting `Appointment` to send join reminders. Any consultation notes captured during/after the call should flow to the same place `ai_consultation_agent` writes its summary, so risk assessment and procedure recommendation aren't duplicating intake.

## Task flow
1. Patient (or staff on their behalf) requests a video consultation, specifying rough time preference and which provider/procedure it's for.
2. Look up provider availability via `CalendarService.list_events(calendar_id, max_results)` for the relevant `User` (provider) — this requires an OAuth `access_token` for that calendar (see Open Questions for where that token comes from).
3. Present available slots to the patient (via chat/SMS/email) and let them pick one.
4. Create the appointment: `CalendarService.create_event(summary, start_time, end_time, calendar_id)` to reserve the calendar slot, and a matching `Appointment` row (`appointment_type="video_consultation"`, `status=AppointmentStatus.SCHEDULED`, `provider_id`, `start_time`, `end_time`).
5. Generate/attach the meeting join link. **This step has no implementation target today** — there is no Zoom/Google Meet/Twilio Video service in the repo. Until a vendor is chosen, this step is blocked (see Open Questions); the placeholder behavior should be to store a link (even a manually-configured static one) in `Appointment.notes` or the calendar event description rather than silently omitting it.
6. Send confirmation with the join link via `EmailService.send(to, subject, html_content)` and/or `TwilioService.send_sms(to, message)` / `WhatsAppService.send_text(to, text)`, based on the patient's preferred channel.
7. On the day of the appointment, send a reminder (this can either live here or be delegated to `appointment_reminder_agent` — avoid building duplicate reminder logic in both places).
8. After the call, if the provider or an automated summary produces notes, write them into `Appointment.notes` and log completion (`status=AppointmentStatus.COMPLETED`).
9. Handle no-shows/cancellations by updating `Appointment.status` (`AppointmentStatus.NO_SHOW` / `AppointmentStatus.CANCELLED`) and logging via `AgentLog`.

## Data it reads
- `User` (provider): calendar identity, availability, role (must be a provider who takes video consults).
- `Patient`: contact info (`email`, `phone`) for sending the join link and confirmations.
- `Appointment`: existing appointments to avoid double-booking a provider.
- `AgentConfig` (`agent_type="video_consultation"`): which providers offer video consults, default duration, reminder timing.

## Data it writes
- `Appointment`: creates the row (`appointment_type="video_consultation"`, `status`, `start_time`, `end_time`, `provider_id`, `notes`), and later updates `status`/`notes`.
- `AgentLog`: booking, reminder-sent, completion, and no-show events.

## Integrations used
- `CalendarService.list_events()` / `CalendarService.create_event()` for scheduling — note this class takes an `access_token` per instance, so the provider's Google OAuth token needs to be sourced somewhere before this agent can call it.
- `EmailService.send()`, `TwilioService.send_sms()`, `WhatsAppService.send_text()` for confirmations/reminders/join-link delivery — pick based on patient channel preference.
- **Missing**: no video-conferencing service (Zoom, Google Meet, Twilio Video, Daily.co, etc.) exists anywhere in `backend/src/services`. This agent cannot actually host a video call without one — flagged explicitly below.

## Escalation & guardrails
This agent is logistics-only — it must not attempt to conduct or summarize clinical conversation itself. If a patient tries to use the booking chat to describe symptoms or ask candidacy questions before a slot is even booked, route that to `ai_consultation_agent` rather than answering inline. If no provider is available within the patient's urgency window and the patient describes anything urgent (pain, signs of infection, post-op complications), escalate immediately to staff/`emergency_triage_agent` rather than just offering the next open video slot.

## Success criteria
- Booking-to-confirmation is fully automated with no staff intervention for the common case (slot available, patient picks a time).
- Join-link delivery is reliable — 0% of confirmed `Appointment` rows missing a join link at send time (once the video vendor is chosen).
- No-show rate for video consultations is tracked and comparable to in-person appointment tracking already used elsewhere.
- No calendar double-bookings (verified against `CalendarService.list_events` before every `create_event` call).

## Current status
Stub — `video_consultation_agent_services.py` has no real logic yet. Needs: availability lookup + slot presentation, `Appointment`/`CalendarService` event creation, confirmation/reminder messaging, and — critically — a decision on the video-conferencing vendor before the "join link" step can be built at all.

## Open questions
- **No video-conferencing service exists in the repo.** Decide: (a) integrate a real provider (Zoom API, Google Meet via Calendar API's `conferenceData`, Twilio Video, Daily.co) so the platform generates and embeds real join links, or (b) keep it lightweight — `CalendarService` events just carry a manually-provisioned or static meeting link with no true embedded video integration. This materially changes the scope of this agent and should be settled before implementation starts.
- Whose Google OAuth `access_token` does `CalendarService` use — the provider's individual token, or a practice-level service account? Nothing in `Practice`/`User` models currently stores a refresh/access token; token storage and refresh needs a home (likely `Practice.settings` JSONB or a new `CalendarCredential` table).
- Reminder timing/ownership overlaps with `appointment_reminder_agent` — decide which agent owns video-consult-specific reminders to avoid duplicate messages to the patient.
