# Payment & Invoice Agent

## What it does
Generates and sends patient-facing invoices for consultations/procedures, tracks their paid/pending/overdue state, and collects payment — the actual money-collection counterpart to `cost_estimation`'s quoting. It is the only agent that should ever create an `Invoice` row or mark one paid.

## Where it fits in the patient journey
Triggered after a billable event: a completed `Appointment` (status → `COMPLETED`), a procedure booked with a deposit requirement, or staff manually requesting an invoice be sent. It typically runs after `appointment_booking`/`surgery_scheduling` and before/around `patient_feedback` (which fires after the visit is fully closed out). It coordinates with:
- `cost_estimation` — the estimate a patient received earlier should inform (not necessarily equal) the final `Invoice.amount`; large discrepancies are a human-review trigger.
- `insurance_verification` — if coverage was verified, the invoice should reflect patient responsibility only, not the full charge (once that agent exists).
- `analytics_dashboard` — reads `Invoice.status`/`amount` to compute `attributed_revenue`.

## Task flow
1. On trigger (appointment completed, deposit due, or manual staff request), determine the amount owed — from the linked `Appointment` → `Procedure.base_price`, minus any deposit already collected, adjusted for insurance if known.
2. Create an `Invoice` row (`status=PENDING`, `due_date` set per practice policy, `appointment_id`/`patient_id`/`practice_id` populated) as the system of record — this must happen before any payment link is generated, not after.
3. Generate a payment link/checkout for the patient to pay. **This is the real gap**: `PaymentService` today only exposes `create_checkout_session(price_id, practice_id, success_url, cancel_url)`, which is hardcoded to `mode="subscription"` — that's for the practice's own SaaS subscription (see `Subscription` model), not a one-off patient charge. There is currently no way to charge a patient a specific dollar amount for a specific `Invoice`. This agent cannot be fully built until one of the following exists:
   - A new `PaymentService.create_payment_intent(amount, currency, practice_id, invoice_id, ...)` using Stripe `PaymentIntent`, or
   - A new `PaymentService.create_one_off_checkout_session(amount, practice_id, invoice_id, success_url, cancel_url)` using Stripe Checkout in `mode="payment"` with dynamic `price_data` instead of a fixed `price_id`.
4. Send the invoice/payment link to the patient via `EmailService.send()` (formatted HTML with amount, due date, itemized procedure) and/or `TwilioService.send_sms()` for a short reminder with the link.
5. Handle the payment-confirmation webhook (Stripe webhook handler, not yet present for one-off charges) to flip `Invoice.status` → `PAID` and set `Invoice.paid_at`.
6. If `due_date` passes unpaid, flip `Invoice.status` → `OVERDUE` and send a reminder (reuse `EmailService`/`TwilioService`); escalate to staff after a configurable number of missed reminders.
7. Handle refund/cancellation requests by setting `Invoice.status` → `REFUNDED`/`CANCELLED` — but see guardrails below, this should never happen without human sign-off.
8. Log every state transition (`created`, `sent`, `paid`, `overdue`, `refunded`) as an `AgentLog` entry for audit and for `analytics_dashboard`.

## Data it reads
- `Appointment`: `status`, `patient_id`, `provider_id`, to know when a billable event occurred.
- `Procedure`: `base_price` as the default charge basis.
- `Patient`: `email`, `phone`, `first_name`/`last_name` for invoice delivery.
- `Invoice`: existing rows, to avoid duplicate invoices for the same appointment and to check current `status`.
- `Practice`: billing contact info/branding for invoice templates, `settings` for due-date policy.

## Data it writes
- `Invoice`: creates new rows (`amount`, `status`, `due_date`, `appointment_id`, `patient_id`, `practice_id`); updates `status` and `paid_at` on payment/refund/overdue transitions. This is the authoritative table — do not shadow invoice state anywhere else.
- `Message` on the relevant `Conversation` (if one exists) recording that an invoice was sent.
- `AgentLog` (`agent_type="payment_invoice"`) for every status transition — required for financial audit trail.

## Integrations used
- `PaymentService.create_checkout_session(...)` and `cancel_subscription(...)` exist today but only serve the **practice's** own subscription billing — do not repurpose them for patient charges without extending the service (see step 3 above).
- `EmailService.send(to, subject, html_content)` for invoice delivery.
- `TwilioService.send_sms(to, message)` for payment reminders.
- `LLMService.chat(..., tier="low")` optionally, only for drafting reminder copy — never for deciding amounts or issuing refunds.

## Escalation & guardrails
- **Refunds and disputes always require human review.** This agent should never autonomously issue a Stripe refund or waive an invoice — it can flag `Invoice.status` for staff attention but the actual refund action belongs to a human with a `staff`-role `User`, logged via `AgentLog(performed_by=...)`.
- Any discrepancy between a prior `cost_estimation` quote and the final `Invoice.amount` beyond a configurable threshold should route to staff before sending the invoice, not after the patient complains.
- Any patient message expressing confusion, anger, or a billing dispute ("I was charged twice", "this isn't what I agreed to") should immediately stop automated invoice/reminder flow and escalate — do not let the LLM negotiate on amount owed.
- Payment webhook failures/timeouts must not silently leave an `Invoice` in an ambiguous state — reconcile against Stripe's API on a schedule, don't trust webhooks alone.

## Success criteria
- Invoices generated automatically within minutes of the triggering event (appointment completion), with zero manual staff invoice-creation needed for standard cases.
- Time-to-payment and overdue rate tracked and trending down.
- Zero cases of an `Invoice` marked `PAID` without a corresponding successful Stripe transaction (reconciliation check).
- All refund/dispute cases show a human `performed_by` in `AgentLog`, never an automated one.

## Current status
Stub — `payment_invoice_agent_services.py` only has `get_status`. Needs:
- `Invoice` CRUD logic (create on appointment completion, status transitions).
- A working one-off charge path — blocked on the `PaymentService` gap described above.
- Stripe webhook endpoint to handle payment confirmation for one-off charges (does not exist yet; the current webhook surface, if any, would only cover subscription events).
- Invoice email/SMS templates.
- Overdue-reminder scheduling logic.

## Open questions
- **Primary blocker**: `PaymentService` has no one-off charge capability. Decide between extending it with a `PaymentIntent`-based method vs. a dynamic-price Checkout Session in `mode="payment"`, and who owns that work before this agent can move past invoice creation.
- No Stripe webhook handler currently exists in the repo for payment-succeeded events (only what would back `create_checkout_session`'s subscription flow, if anything) — needs to be built and pointed at the `Invoice` model.
- Partial payments/deposits: `Invoice` has a single `amount` field with no "amount paid so far" — decide whether partial-payment support is in scope for v1 or a later iteration.
- Refund execution mechanics (who triggers the actual Stripe refund call, since `PaymentService` doesn't have a refund method either) needs a decision alongside the charge-method gap.
