# AesthetixAI — Surgent Operating System

A real, working **Clinic Management OS** for plastic surgery and aesthetic
medicine practices — Owner, Doctor, and Receptionist roles each get a real,
authenticated dashboard backed by a real Postgres database — plus an **AI
Agent Workforce** layered on top: 31 named AI capabilities across 5
categories, a handful of which are real and running today, the rest of
which are this product's forward roadmap.

This repo is a monorepo: the practice-facing web app (`frontend/`) and its
API (`backend/`).

```
.
├── frontend/          Vite + React + TypeScript — the marketing/product site
│                      AND the real, authenticated Owner/Doctor/Receptionist
│                      dashboard (patients, appointments, billing, staff, ...)
├── backend/           FastAPI (Python) — the real clinic-operations API,
│                      the 31 agents' APIs, auth, and integrations
└── design-references/ Early AI-generated UI mockups, kept for reference only —
                        not built, not part of either app
```

---

## What's actually here today

Two genuinely different things share this codebase, and it's worth being
precise about which is which before reading anything else below:

1. **The clinic operating system** — patients, appointments, billing,
   staff, clinical documentation, inventory, leads — is **real**. Every
   domain below is backed by real SQLAlchemy models, real Alembic
   migrations (17 so far), real CRUD APIs, real role-based access control,
   and a real authenticated React dashboard. This is the part a practice
   could actually run its front desk and back office on today.
2. **The "31 AI agents"** is this product's marketing concept and forward
   roadmap for an autonomous AI layer on top of that operating system —
   phone/chat answering, consultation triage, surgery scheduling, recovery
   monitoring, business automation. **5 of the 31 have real logic behind
   them today; the other 24 are scaffolded but not built** (see
   [The AI agent layer](#the-ai-agent-layer--whats-real-what-isnt-and-why)
   below for exactly which, and why those specific ones were built first).

Nothing below is aspirational unless it's explicitly marked as such.

## The real clinic operating system

Every one of these is a real, DB-backed feature with a real dashboard
screen, exercised via real database tests and live browser runs during
development (not just "the code compiles"):

| Domain | What it actually does |
|---|---|
| **Auth & roles** | Clerk-based sign-in; four roles (Owner, Doctor, Receptionist, platform Staff/admin) with granular, per-record permission grants — not just role-level gating |
| **Patients** | Full CRM: contact info, chief complaint, AI-agent routing, consent status, and a real **lifecycle/funnel stage** (inquiry → contacted → consult → treatment planned → patient, or lost) |
| **Doctors** | Owner-managed roster; a doctor can also **self-apply** via a shareable signup link, reviewed and approved by the Owner before they get real dashboard access |
| **Receptionist / Front Desk** | A real staff role — today's schedule, check-in, waiting room, booking — invited by the Owner via email, with its own granular permission set |
| **Appointments** | Full booking/reschedule/cancel/complete/check-in lifecycle |
| **Clinical documentation** | SOAP-structured consultation notes, phased treatment plans built from a real procedure catalog, patient photo galleries, and per-document e-consent (typed-name signature, witnessed by staff) |
| **Billing & Invoicing** | Invoices generated ad-hoc or straight from a treatment plan's priced items, line items, tax/discount, mark-paid workflow |
| **Finance** | Expense tracking (Owner + Receptionist) and a real revenue-vs-expense overview (Owner) — counts only *paid* invoices as revenue, never a projection |
| **Leads / Funnel** | The patient lifecycle stage above, visualized as a real funnel with a "lost" breakdown |
| **Inventory** | SKU catalog + received-batch tracking (lot/quantity/expiry), FEFO (first-expiry-first-out) consumption, low-stock flagging |
| **AI Receptionist** | Real LLM-driven call/chat handling (Twilio + Mistral), automated SMS appointment reminders, and real-time message translation — see below |
| **Internal messaging** | A simple two-way message thread between the Owner and each Doctor/Receptionist |
| **Practice subscription** | The practice's *own* SaaS plan (Solo/Practice/Enterprise) — pricing → Stripe checkout → claim → setup wizard |

## Backend (`backend/`)

FastAPI + async SQLAlchemy 2.0 + Postgres + Alembic. Two kinds of domains
live side by side under the same layered convention:

```
backend/src/
├── router/<domain>/<domain>_router.py             real clinic-ops domains:
├── controller/<domain>/<domain>_controllers.py    patients, appointments, billing,
├── services/<domain>/<domain>_services.py         finance, inventory, clinical, staff, ...
│
├── router/agents/<name>_agent/<name>_agent_router.py        the 31 AI agents,
├── controller/agents/<name>_agent/<name>_agent_controllers.py  one named folder
├── services/agents/<name>_agent/<name>_agent_services.py       each, same shape
├── router/agents/__init__.py    registers every router (agent or not) -> /api/v1/...
│
├── models/       SQLAlchemy models (Practice, Patient, Appointment, Invoice, ...)
├── schemas/      Pydantic request/response contracts
├── server/       middleware, Clerk auth dependency chain, exception handling
└── services/     shared, non-domain services: llm, twilio, messaging, storage,
                  cloudinary, email, agent_log, agent_costing, clerk, ...
```

Router → Controller → Service is the call chain everywhere: the router
defines HTTP routes + the auth dependency (`get_current_practice_user`,
`require_role(...)`), the controller adapts a request into a service call,
the service holds the actual logic. Every practice-scoped query is
filtered by `practice_id` resolved server-side from the authenticated
user — never trusted from the client.

**Running it locally:**
```bash
cd backend
python -m venv .venv && .venv\Scripts\activate   # or source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env             # every setting has a safe default — the app boots
                                  # with none of them real, see the table below for
                                  # exactly what each one unlocks
alembic upgrade head
uvicorn src.main:app --host 127.0.0.1 --port 8001
```
`GET /health` is a liveness check with no auth. Everything else expects a
Clerk-issued bearer token (`Authorization: Bearer <token>`).

## Frontend (`frontend/`)

Vite + React 18 + TypeScript + Tailwind.

```
frontend/src/
├── app/
│   ├── auth/         real Clerk sign-in/sign-up, doctor self-apply flow,
│   │                 staff invite acceptance
│   ├── onboarding/   pricing -> Stripe checkout -> claim plan -> setup wizard
│   └── dashboard/    the real, authenticated Owner/Doctor/Receptionist app —
│                      one folder per domain: patients/, doctors/, appointments
│                      (front-desk/), clinical/, billing-invoices/, finance/,
│                      inventory/, leads/, messages/, receptionist/ (AI monitor),
│                      staff/, plan/, settings/, layout/ (Sidebar role-gating)
├── components/       marketing site sections (Navbar, hero, pricing, ...)
├── pages/            public marketing pages (Home, Agents catalog, ...)
├── data/agents/       one file per AI agent — name/description/icon/category —
│                      aggregated by index.ts into the public catalog
└── api/               typed fetch wrapper (client.ts) + one file of functions
                       per backend domain (entities.ts, practice.ts, ...)
```

`app/dashboard/` is **not** placeholder scaffolding — it's the real product:
every role signs in via Clerk, lands on a role-appropriate view
(`DashboardRouter.tsx`), and `layout/Sidebar.tsx` shows/hides each nav item
by role and by granted permission (`requiresPermission`), not just by
role alone.

**Running it locally:**
```bash
cd frontend
npm install
cp .env.example .env.local       # VITE_API_BASE_URL must point at the backend —
                                  # default is http://127.0.0.1:8001
npm run dev
```
Open the app at `http://localhost:5173` (not `127.0.0.1` — the backend's CORS
allow-list is `localhost`-only, so the two don't count as the same origin).

**Deploying**: `frontend/Dockerfile` builds the static site behind nginx
(SPA fallback included) — no Node process at runtime. `backend/Dockerfile`
runs the API directly.

## The AI agent layer — what's real, what isn't, and why

| Category | Agents (slug) |
|---|---|
| Front Desk & Intake | `receptionist`, `appointment_reminder`, `multilingual_translation` *(merged into one real module, see below)*; `appointment_booking`, `reschedule_cancellation` *(retired — see below)* |
| Consultation & Screening | `ai_consultation`, `photo_analysis`, `video_consultation`, `medical_history_intake`, `risk_assessment`, `procedure_recommendation`, `pre_surgery_preparation` |
| Surgery Management | `surgery_scheduling`, `surgeon_calendar`, `operating_room_scheduler`, `equipment_checklist`, `implant_inventory`, `surgical_documentation` |
| Post-Surgery Care | `recovery_followup`, `healing_monitoring`, `emergency_triage`, `medication_reminder`, `wound_care_guidance`, `recovery_dashboard` |
| Business & Operations | `cost_estimation`, `payment_invoice`, `insurance_verification`, `analytics_dashboard`, `patient_feedback`, `marketing_followup`, `lead_nurturing` |

**Real today (5 of 31):**
- **`receptionist` + `appointment_reminder` + `multilingual_translation`** —
  merged into one backend module, `backend/src/services/ai_receptionist/`
  (`voice_chat_service.py`, `reminder_service.py`, `translation_service.py`,
  `overview_service.py`), one router at `/api/v1/ai-receptionist/*`. Real
  LLM call/chat handling (Mistral), real Twilio TwiML generation, real
  automated SMS reminders, real message translation. The dashboard's **AI
  Receptionist** page shows real usage counts and a real cost estimate
  computed from actual logged activity — not a mock.
- **`marketing_followup`** — sends a practice's configured promotional
  offer to a real patient via SMS/WhatsApp, logged.
- **`patient_feedback`** — requests a review from a patient after a real
  completed appointment, with a real per-practice review link if one's
  configured.

**Retired (2 of 31):** `appointment_booking` and `reschedule_cancellation`
had backend logic that was a byte-for-byte duplicate of what the real
Receptionist role's booking/reschedule/cancel screens already do — their
dedicated agent folders were deleted. They're still listed in the public
marketing catalog (`data/agents/`), since the *capability* is real — it's
just delivered by the real Receptionist system now, not a separate "AI
agent" code path.

**Still stubs (24 of 31):** every other agent's `..._services.py` is a
6-line file with one method, `get_status()`, returning
`{"status": "active"}` — no real logic behind it yet. This is deliberate
sequencing, not an oversight: the team built the **clinic operating
system** first — patients, scheduling, billing, staff, clinical records,
inventory — because that's what makes the product usable and sellable on
its own, independent of how many AI agents exist. Each unbuilt category
has its own reason it wasn't next:
- **Consultation & Screening** agents need real vision/LLM pipelines wired
  against real clinical data, and — being actual medical-context AI —
  warrant a compliance/liability review before going live, not just an
  implementation pass.
- **Surgery Management** agents need real OR-calendar and
  implant-inventory data models that don't fully exist yet.
- **Post-Surgery Care** agents need a real recovery-tracking data model
  (the `RecoveryJournal` model exists but has zero real writers today).
- **Business & Operations** agents (`cost_estimation`, `payment_invoice`,
  `insurance_verification`, `analytics_dashboard`, `lead_nurturing`)
  substantially overlap with the real Billing/Finance/Leads systems
  already built — they need to be *re-scoped* against what's real now,
  not just filled in, or they'd duplicate real functionality the same way
  `appointment_booking`/`reschedule_cancellation` did.

Building one out: fill in its `..._services.py` with real logic (almost
always the only file that changes) — see `ai_receptionist`'s services for
the pattern (a thin service wrapping a real integration, logged via
`AgentLogService` so usage is queryable later).

## What's deliberately still mock data

Separate from "not built yet" above — these have real backend endpoints
that already work, but the frontend was intentionally reverted to mock
data mid-project at the product owner's request (a decision to revisit,
not a technical gap):

- **Overview dashboard** (sessions/needs-attention/bookings KPIs),
  **Sessions** pages, **Analytics** charts — `AnalyticsService` and the
  real `Conversation`/`Appointment` data they'd read from already exist
  and are tested; re-wiring the frontend to them is a fast follow, not a
  rebuild.
- **AI Receptionist monitor page**'s call/transcript widgets (live active
  call, transcripts, omnichannel status) — these need real Twilio
  call-streaming infrastructure that doesn't exist yet, clearly labeled
  "Preview" on the page itself. The page's *KPI numbers* (calls handled,
  cost estimate) are real, not mock.

## Configuration — what needs a real credential, and what breaks without one

Every setting in `.env` has a default the app boots with — nothing is
required just to run it locally. This is what's currently a **placeholder**
in this project's own working `.env` vs what's **real**, and exactly what
silently doesn't work as a result. (Values themselves are never in this
repo — `.env` is gitignored; only `.env.example` — names, no secrets — is
tracked.)

| Service | Env vars | Status here | Breaks without a real one |
|---|---|---|---|
| **Clerk** (auth) | `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY`, `CLERK_JWKS_URL`, `CLERK_WEBHOOK_SECRET` | Real (webhook secret is a placeholder) | Auth itself is real and working. The webhook secret placeholder means `user.created`/etc. webhook payloads from Clerk aren't cryptographically signature-verified yet — fine in dev, needs a real one before production |
| **Postgres** | `DATABASE_URL` | Real | — |
| **OpenAI** | `OPENAI_API_KEY` | Placeholder | Any LLM call routed at `tier="high"` fails (nothing on a real, live path needs that tier today — `AI Receptionist` and translation both intentionally run on Mistral instead; future high-stakes agents will need this) |
| **Mistral** | `MISTRAL_API_KEY` | Real | Powers the AI Receptionist's voice/chat and real-time translation today |
| **Twilio** | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` | Placeholder | Real SMS/voice sending fails — appointment reminders, marketing offers, and review requests all build the message correctly but the actual send fails at this step |
| **Cloudinary** | `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Placeholder | File uploads fail — `STORAGE_BACKEND=cloudinary` is the active storage backend, so patient photos and doctor application documents can't actually upload |
| **WhatsApp** (Meta) | `WHATSAPP_API_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID` | Placeholder | WhatsApp-channel messaging doesn't send |
| **Resend** | `RESEND_API_KEY`, `RESEND_FROM_EMAIL` | Real | The actual active outbound-email path |
| **SendGrid** | `SENDGRID_API_KEY` | Placeholder | Unused today — `EmailService` exists but Resend is what's actually wired to send |
| **Stripe** | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_SOLO`, `STRIPE_PRICE_PRACTICE` | Placeholder | The practice's own subscription checkout (pricing → pay → claim) can't process a real payment |
| **Google Calendar** | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Placeholder | Unused — belongs to the still-stub `surgeon_calendar` agent |
| **Redis / Celery** | `REDIS_URL`; `celery` in `requirements.txt` | Present, unused | No background job queue actually runs anywhere in the code yet — both are dependencies waiting for a real use case |

## How ready is this, honestly

- **The core clinic operating system** — patients, appointments, billing,
  staff, clinical documentation, inventory, leads, internal messaging —
  is **built, tested, and usable today** by a real practice, gated only by
  the placeholder credentials above (Twilio, Cloudinary, Stripe, WhatsApp).
  Those are pure configuration — obtain real keys and the exact same code
  paths (already exercised via real database tests and live browser runs
  during development) start working with no code changes.
- **Auth, roles, and permissions** are fully real: Clerk sign-in, four
  roles, granular per-record permission grants, doctor self-apply +
  Owner-approval flow, staff email invites.
- **The AI agent layer is 5 of 31 real (~16%)** — the rest is this
  product's own forward roadmap, sequenced deliberately behind the core
  operating system (see above for why each category wasn't next).
- **Overview/Sessions/Analytics are intentionally mock** right now — a
  product decision already reversible in a small frontend change, not a
  backend gap.
- **What's actually blocking a fully production-ready launch:**
  1. Real Twilio / Cloudinary / Stripe / WhatsApp credentials — configuration only, zero code work needed.
  2. A real `CLERK_WEBHOOK_SECRET` for cryptographic webhook verification.
  3. A decision on when to re-wire Overview/Sessions/Analytics to their already-built real endpoints.
  4. No committed automated test suite exists — every feature in this repo was verified with a real-database smoke script and a live Playwright browser run at the time it was built, but none of that is wired into CI today; worth adding before scaling the team.
  5. Production infrastructure (VPS sizing, an actually-running Celery/Redis worker if background jobs get added, logging/monitoring) hasn't been set up — everything above was built and verified in local development only.
  6. The 24 unbuilt AI agents, if the product's roadmap calls for them — not required for the *core clinic OS* to be sellable on its own.

## VPS / sizing notes

- The frontend is essentially free at runtime — static files behind nginx,
  no Node process.
- The backend today constructs real SDK clients (Mistral, Twilio's TwiML
  builder, Clerk) — a **2 vCPU / 2GB RAM** VPS is comfortably enough to
  start, `uvicorn` with 1–2 workers (FastAPI is async and doesn't need more
  processes for I/O-bound work at this stage).
- Revisit VPS size (4GB+) once more of the AI agent layer is real and/or a
  Celery/Redis worker is actually running background jobs.

## Tech stack

**Backend**: FastAPI 0.115, SQLAlchemy 2.0 (async) + Postgres, Alembic,
Pydantic v2, Clerk (auth), Twilio, Meta/WhatsApp API, OpenAI + Mistral,
Stripe, Resend, Cloudinary, Celery + Redis (present, not yet running any
real job).

**Frontend**: React 18, TypeScript, Vite, Tailwind CSS, React Router,
Clerk React SDK.
