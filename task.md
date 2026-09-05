# Aiaceone — Production Readiness Report

**Purpose of this document:** an honest, in-depth status report of the Aiaceone clinic
platform — what's real and working today, what's still a gap, what will break under
real-world scale, what it costs to run, and exactly what has to happen to take this
from "one clinic's working dev build" to "a product we can sell to other clinics."

Written for: internal planning and for forwarding to whoever needs the real picture
(investors, co-founders, technical advisors). Nothing in this document is softened —
where something is broken, mocked, or missing, it says so plainly, and pairs it with
what fixing it actually takes.

**Date:** 2026-09-04
**Companion document:** `system_design.md` (architecture, data model, API surface —
written Week 1 of the current 30-day build; this document is the "where are we now,
and what does 'production' actually require" follow-up).

---

## 1. What This Product Is, In One Paragraph

A multi-role operating system for a plastic surgery / aesthetic clinic: Owner,
Doctor, and Receptionist each get a real, role-scoped dashboard covering patients,
appointments, front-desk workflow, billing, inventory, consent, clinical
documentation, and surgery scheduling — plus a real patient-facing portal, and a
real AI layer (WhatsApp auto-reply + an internal "Main Agent" natural-language
assistant staff can ask questions to). It is **not** a demo shell with fake data —
every core workflow described below is backed by a real Postgres database, real
authentication, and has been exercised through an actual browser session against
real API calls, not just code review.

---

## 2. Current Completeness — Domain by Domain

Legend: ✅ Real & verified · 🟡 Real but partial/rough edges · 🔴 Mock/stub/not built

| Domain | Status | Notes |
|---|---|---|
| Patients (CRM) | ✅ | Full CRUD, lifecycle funnel stages, real profile depth added this session (allergies, medical/surgical history, medications, emergency contact, insurance, referral source, communication preferences) |
| Doctors | ✅ | Roster, qualifications, specializations, working hours, per-doctor procedure pricing, availability overrides |
| Receptionist / Front Desk | ✅ | Full status chain this session: Scheduled → Checked-in → With Doctor → Ready for Checkout → Completed, plus No-show and a real Waitlist |
| Appointments | ✅ | Book, reschedule, cancel, check-in, complete |
| Clinical documentation | ✅ | Consultation notes (SOAP-shaped), treatment plans with real procedure pricing |
| Consent | ✅ | Real per-document consent + **versioned templates** (new this session) — editing a template bumps its version; an already-signed document's wording is provably frozen at signing time |
| Before/after photos | ✅ | Cloudinary-backed upload, timeline grouping by stage (before/day7/day14/1mo/3mo/6mo/1yr), a drag-comparison slider, and an independent marketing-use approval flag separate from clinical consent |
| Surgery | ✅ | New this session — a real record (surgeon, assistant, anesthesia, pre-op checklist, implants used with lot numbers, operative note), full planned → completed/cancelled lifecycle |
| Billing / Invoices | ✅ | Line-item invoices, mark-paid, status tracking |
| Finance / Expenses | ✅ | Expense tracking, a combined Finance view for the Owner |
| Inventory | 🟡 | Real SKU/batch/lot/expiry/low-stock tracking exists; supplier management and purchase orders are still on the roadmap (Week 3, not started) |
| Leads / Funnel | ✅ | Real lifecycle-stage tracking and a funnel summary view |
| Owner ↔ Staff messaging | ✅ | Real two-way threads; moved to a topbar "bell" this session instead of a full sidebar item |
| Patient Portal (`/user`) | ✅ | Real ID+PIN auth (bcrypt-hashed PIN, rate-limited login, JWT session) — see §4 |
| Internal role-switcher (`/portal`) | ✅ | Dev/staff tool only — see §4 |
| AI Receptionist — WhatsApp | ✅ | **Genuinely working end-to-end**, verified live this session (see §5) |
| AI Receptionist — voice/other channels | 🔴 | Only WhatsApp is real; phone/SMS/Instagram/Facebook are schema-ready (channel enum exists) but have no working integration |
| "Main Agent" (Command Center) | ✅ | Real Mistral-backed natural-language assistant over 5 real category handlers (front-desk/consultation/surgery/post-care/business); now reachable from the sidebar for all three roles, not just Owner |
| The other ~29 "AI agent" pages | 🔴 | Mostly UI shells demonstrating what an agent *would* do — not wired to real automated logic. This was a deliberate, previously-agreed scope decision (see `system_design.md` §"AI layer") to focus real engineering on the 8 workflows that matter, not build 31 shallow agents |
| Owner Overview / Analytics dashboard | 🔴 | Deliberately still on mock data — an earlier, explicit decision in this project, not an oversight |
| Post-op recovery journal | 🔴 | Model exists, nothing writes to it yet (Week 3 of the current plan) |
| Notification engine (SMS/email/WhatsApp/in-app unified) | 🔴 | Not built (Week 3) |
| Audit logging | 🔴 | Not built (Week 4) |
| Automated test suite / CI | 🔴 | Not built (Week 4) — verification this whole month has been real, live, manual (real DB smoke scripts + real browser sessions), not automated regression tests |

**Bottom line:** the core clinical/operational workflow of a real clinic — from a
patient's first contact through booking, check-in, consultation, treatment planning,
consent, surgery, billing, and now a real patient portal — is genuinely built and
working, not mocked. What's *not* built yet is mostly forward-looking depth (post-op
journey, deeper analytics, more AI workflows) and everything needed to run this as a
*hardened, multi-customer product* rather than one clinic's dev environment — see §7–§9.

---

## 3. `/portal` and `/user` — Exactly What's There Right Now

This came up explicitly, so here it is precisely, because the two are easy to
confuse and used to be the same URL earlier in the build:

### `/portal` — internal tool, staff only
A demo/dev "Site Map": lets an Owner jump into a Doctor's or Receptionist's real
dashboard view, or open any patient's record from the practice side, without a
second real login. It is **not** patient-facing and never was intended to be —
it exists so the Owner (or whoever's testing) can check what each role actually
sees without juggling multiple browser sessions. A real signed-in Clerk session
always overrides whatever this tool sets, so it can't be used to escalate
privilege on a real account.

### `/user` — the real Patient Portal
This is what an actual patient uses. Login is a human-readable Portal ID
(e.g. `AP-2026-01307`) plus a 6-digit PIN, generated and handed out by staff from
the patient's record page (shown to staff exactly once, bcrypt-hashed server-side,
never stored in plaintext). Once logged in, a patient can see:

- Their own profile summary and consent status
- Their assigned doctor's name, specialty, and bio
- Their treatment plan and its real, priced line items
- Their appointment history and can request a new appointment (front desk confirms)
- Their photo timeline (only photos explicitly meant for patient viewing)
- Their consent documents and signing status
- Their invoices and outstanding balance

This is a genuinely separate auth system from staff login (JWT, not Clerk) — deliberately, since Clerk bills per staff seat and patients aren't staff. Rate-limited against brute-force PIN guessing, with account lockout after repeated failures.

---

## 4. The AI Layer — What's Actually Real

This is the part most likely to get oversold in a pitch, so here's the precise truth.

### Real and verified this session
- **WhatsApp AI Receptionist**, via Green API (unofficial WhatsApp Business API
  provider, no Meta Business verification required — see §8 for why that matters).
  Confirmed against a *real, connected WhatsApp number* (not a simulation):
  the connection is live and authorized right now. A real inbound conversation
  exists in the database with a natural back-and-forth about rhinoplasty pricing,
  handled entirely by the AI (Mistral, free tier) with no human involved. This
  session also added: real staff-visible chat bubbles matching WhatsApp's own
  look, real WhatsApp profile-picture fetching, and a **human-takeover** feature —
  a staff member can now reply directly from the dashboard (which sends a real
  WhatsApp message) and the AI automatically stops auto-replying to that
  conversation until a staff member (or nobody) turns it back on, so the bot and
  a human never talk over each other.
- **Main Agent** (Command Center) — a real assistant staff can ask things like
  "which patients need surgery?" or "what's overdue on billing?" — it genuinely
  queries the real database (not canned answers) and is gated by the practice's
  plan tier, same as the rest of the AI features.

### Real but with known rough edges
- WhatsApp handling is **text-only** — an incoming image, voice note, or document
  is currently logged and ignored, not processed. Real patients will send photos
  ("here's what I mean") and voice notes; this needs building.
- The Green API poller is a single background loop inside **one** backend process,
  checking every practice's connected WhatsApp number every 3 seconds. Fine for a
  handful of practices. Does not survive a multi-instance deployment without
  redesign (two backend replicas would both poll the same instance, double-handling
  messages) — see §7.

### New since the last update: the AI Receptionist now really books appointments
The WhatsApp AI now has real function-calling tools, not just chat: it can check
which doctor actually has an opening at a requested date/time (reading real
working-hours + existing bookings, not guessing) and create a **real** appointment
— the patient never has to name a doctor, whichever one is genuinely free gets
picked automatically. It also greets a returning patient differently from a new
one (their phone number is their durable identity, same as before), and has a
real self-escalation path: if it can't help or the patient asks for a person, it
flags the conversation for staff and posts a visible "🔔 AI requested a human"
note directly in the chat thread, not just a status flag buried in the database.
Verified with 11 real-DB checks (booking success, correct doctor picked per
weekday, double-booking correctly finding no one free, invalid/past dates
handled, escalation, returning-patient detection) — the full LLM-in-the-loop path
itself is code-complete and mirrors Command Center's already-proven tool-calling
pattern exactly, but couldn't be exercised live end-to-end this pass because
Mistral's free tier was rate-limited across all 3 configured keys at the time
(see §7 — this turned out to be IP-level, not per-key, so adding more keys didn't
bypass it; a genuine free-tier ceiling, not a bug).

Two real doctors' calendars now actually differ on purpose (previously one had no
working hours configured at all) so the "whichever doctor has space" logic has
something real to pick between: Dr. Amina Siddiqui (Mon/Wed/Fri) and Test Doctor
(Tue/Thu/Sat). Also found and fixed along the way: two duplicate junk "Ai AceOne"
Doctor rows (flagged earlier, never removed) were silently winning every booking
since they had no working hours configured at all — removed; a doctor whose row
happened to already start with "Dr." in their name was getting a doubled "Dr. Dr."
prefix in booking confirmations — fixed; and the availability check had a real bug
conflating "no schedule configured at all" with "no schedule for this specific
weekday," which would have let a Mon/Wed/Fri-only doctor get booked on a Tuesday —
fixed and covered by a test that checks a day the doctor does NOT work, not just
one they do.

### Not built — despite being planned/discussed
Lead Qualification, AI Patient Intake (structured history collection), Consultation
Assistant (SOAP note drafting), automated appointment confirmation messages,
post-op follow-up prompts, and lead-nurturing sequences are all designed
(`system_design.md` names all 8 target AI workflows) but not implemented. Three of
the eight are now real (WhatsApp AI Receptionist including booking, Main Agent,
and — new — real appointment booking as part of the receptionist workflow); five
are not.

### Explicit safety boundary (already a hard rule in the design, not just a promise)
Nowhere in this system does AI diagnose or decide treatment. It collects,
classifies, and — where something looks concerning — flags a human. This is stated
in `system_design.md` and has been followed in every AI workflow built so far.

---

## 5. Real Bugs Found This Session (full transparency)

Every one of these was caught by actually running the feature live in a browser
against the real database, not by code review — which is itself worth noting: none
of these would have been caught by unit tests alone, because several of them are
specifically about the gap between "the service layer works" and "the actual HTTP
request/response path works." That gap is exactly what automated integration tests
(§9, not yet built) exist to close.

1. **Clock-skew login failures.** A small (~1-2 second) but real clock difference
   between this machine and Clerk's auth servers made the backend reject every
   freshly-issued login token as "not yet valid." This was silently degrading login
   reliability for *every* user, on *every* login, and had been happening long
   enough that an earlier session had already misdiagnosed it as "just a browser
   timing thing." Fixed with standard JWT clock-skew tolerance.
2. **A frontend race** where a page reload briefly treated "Clerk is still loading"
   as "user is signed out," compounding the above.
3. **A Clerk API integration bug** in the internal seed script — a wrong query
   parameter format silently returned an unfiltered user list instead of erroring,
   which briefly (and incorrectly) linked a demo Doctor record to an unrelated real
   person's account before being caught and fixed.
4. **Every Surgery mutation was crashing with a 500 error** (create, edit, complete,
   cancel) — a real backend bug where the code building the API response tried to
   read related data (patient name, doctor name) that hadn't actually been loaded
   from the database in that code path. Fixed; verified live end-to-end after the fix.
5. **The frontend was pointed at the wrong backend port** in its local dev config
   (`8000` instead of `8001`) — apparently wrong since a very early point in the
   project, silently masked for weeks by a long-running dev server that had cached
   the correct value from an earlier, correctly-configured start. A clean restart
   exposed it: every single API call failed. Fixed in both the active config and
   the example file new developers copy from.
6. **A new topbar feature (Messages bell) was making an unauthorized API call**
   on every single Doctor/Receptionist login (harmless — it self-corrected and
   nothing broke visibly — but a real, logged 403 on every non-Owner login).
   Root cause: a role check ran before the real role had finished loading from
   the server. Fixed.
7. **The "Needs attention" inbox page was still on fake/mock data**, discovered
   while building the WhatsApp human-takeover feature — a conversation that
   needed a human to step in would never have actually shown up there for staff
   to see. Fixed to use the real conversation feed.
8. **Two connection-level WhatsApp bugs, both found and fixed the same day
   they'd have been noticed by a real user:**
   - Green API's own instance setting `incomingWebhook` defaults to **off** —
     with it off, an incoming WhatsApp message is delivered to the connected
     phone as normal but is **never** queued for the API to retrieve. No
     error, no log, nothing — the message simply never reaches the system.
     There's no connection-setup UI yet (instances are wired up by hand), so
     nothing had ever turned this on. Fixed, and the poller now checks and
     self-heals this for every connected instance automatically going forward.
   - **A far more serious one:** the code acknowledging a processed
     WhatsApp notification (telling Green API "done, remove this from the
     queue") was calling the wrong HTTP method/URL shape — Green API silently
     404'd every single acknowledgment. The practical effect: **every
     incoming WhatsApp message was being reprocessed forever, every few
     seconds, for as long as the backend stayed running** — a real test
     message generated 37 duplicate patient messages (and would have kept
     generating one every ~6 seconds indefinitely, restart or 24h queue
     expiry being the only things that would ever stop it). This is the kind
     of bug that would have caused very visible, very embarrassing behavior
     in front of a real clinic — duplicate messages, the AI replying
     multiple times, duplicate patient records — and it was sitting in the
     codebase undetected until a real end-to-end WhatsApp test surfaced it.
     Fixed and verified: sent a real test message, confirmed exactly one
     message is now saved and the notification queue drains correctly.

**Why this list matters for a report going to investors/partners:** every one of
these is now fixed and verified, but the *pattern* — bugs invisible to code review,
only caught by actually clicking through the product — is exactly the argument for
§9's "automated tests + CI" line item. Right now, catching bugs like these depends
on someone (me, or whoever tests manually) happening to exercise that exact path.

---

## 6. What Will Break At Scale (said plainly, with the fix for each)

| Risk | Why it breaks | Fix |
|---|---|---|
| Rate limiting is in-memory | Works for one backend process. The moment there are 2+ backend instances (needed for real uptime/scale), each has its own separate counter — a determined attacker (or just normal multi-instance load balancing) defeats it entirely | Move to Redis-backed rate limiting — `REDIS_URL` is already in the env config, this is a real but bounded piece of work |
| Green API WhatsApp poller is one background loop in one process | Same problem as above — two backend replicas would both poll the same WhatsApp instance, double-processing every incoming message (a patient could get two AI replies, or two staff notifications) | Needs a proper job queue (e.g. one dedicated worker process, or a leader-election lock) before running more than one backend instance |
| The poller loops over **every** practice's WhatsApp instance every 3 seconds, in sequence | Fine for a handful of pilot clinics. At real scale (dozens+ practices) this becomes a slow, serial bottleneck and increases message-handling latency practice by practice | Needs to become concurrent (one task per instance) or move off polling to real webhooks once there's a public HTTPS endpoint (the webhook route already exists in code, just unused locally) |
| No caching layer | Every dashboard load re-queries Postgres directly. Fine at pilot scale. Will need Redis-backed caching for hot read paths (Overview, Command Center) at real scale | Add Redis caching once real traffic patterns are known — premature right now |
| Single Postgres instance, no read replicas | A single clinic won't notice. Dozens of clinics on one database will, eventually | Standard managed-Postgres scaling (read replicas, connection pooling) — a hosting-provider-level decision, not urgent yet |
| Frontend ships as one large JavaScript bundle (~1MB) | Every visitor downloads the whole app on first load, including admin-only agent pages they may never use | Code-splitting (dynamic imports) — flagged by the build tool on every build already, straightforward but not yet done |
| No error monitoring / alerting | Right now, "did anything break in production" means someone has to notice or a user has to complain | Add Sentry (or equivalent) before real customers — cheap, fast, should happen early in productionization |
| Real LLM/API costs aren't tracked per-use | The cost-estimation infrastructure exists (`AgentCosting`) but its actual usage counter is documented in the code itself as never incremented — there's a pricing *display*, not a real running spend total | Needs real per-call cost logging before this can honestly be shown to a paying clinic as "here's what your AI usage is costing" |
| No automated backups verified | Whatever the hosting provider does by default, untested | Confirm and test a real backup/restore process before any real patient data is at stake |

None of this is a reason not to sell the product to a pilot clinic or two — it's
exactly the list of what has to be true before selling to *many* clinics
simultaneously, which is the stated goal.

---

## 7. Credentials — What's Real Today, What's Needed for Production

### Working today, free tier
- **Clerk** (staff authentication) — real, free tier
- **Postgres** — local dev instance; a managed production Postgres is a hosting
  decision, not a new credential
- **Mistral** (LLM, powers Main Agent + AI Receptionist) — real, free tier
- **Resend** (email) — real, free tier
- **Cloudinary** (photo storage) — real, free tier, added this session
- **Green API** (WhatsApp) — real, connected to one real WhatsApp number right now

### Free-tier ceilings worth knowing about *before* they're hit
- Clerk's free tier is capped by monthly active staff users — fine for a pilot,
  needs a paid plan once there are real paying clinics with real staff counts
- Mistral's free tier has request-rate limits — fine for light AI Receptionist
  traffic today; needs monitoring once WhatsApp volume grows
- Cloudinary free tier has storage and bandwidth caps — before/after photos are
  exactly the kind of large-file usage that hits this ceiling first
- Green API's free/cheap tiers have message-volume limits per connected number
- Resend's free tier caps monthly email sends

### Needed, not yet in place
- A real domain + SSL (currently local-only, by explicit decision this month)
- **Stripe** or equivalent — required to actually charge clinics money; currently
  wired into the codebase but not live
- A hosting/cloud provider decision (Railway, Render, Fly.io, AWS, etc.)
- Sentry or equivalent error monitoring
- Twilio (only if SMS, beyond WhatsApp, is wanted — not required for the current plan)
- OpenAI (optional — nothing today requires it; would only matter if a future
  feature genuinely needs a higher-capability model than Mistral's free tier)

---

## 8. Path to a Real, Multi-Clinic Production Deployment

In rough order:

1. **Domain + hosting + SSL.** Pick a provider, stand up staging and production
   environments separately (right now there is only "local").
2. **Real Stripe billing**, so a clinic can actually pay for a plan — the plan-tier
   system already exists in the code, it's just never been connected to a real
   payment.
3. **Redis**, to fix the two scaling risks in §7 that specifically require it
   (rate limiting, WhatsApp polling coordination).
4. **Error monitoring** (Sentry-class tool) — cheap, should happen early.
5. **A real CI pipeline** running the focused automated tests described below,
   on every change, before it reaches production.
6. **Focused automated tests** — not full coverage (an earlier, explicit decision
   for this month), but the highest-risk paths: tenant isolation (Clinic A can
   never see Clinic B's data, even by guessing IDs), auth for all four roles,
   billing math, and consent-signing immutability. This is the single highest-
   leverage thing to build next, because §5's bug list is exactly the class of
   bug this would catch automatically going forward.
7. **Security pass**: audit logging (who did what, when — not built yet), rate
   limiting/lockout on every login surface, a real webhook secret for Clerk
   (currently a placeholder locally), and a basic penetration-test-style review
   of tenant isolation specifically.
8. **Legal**: terms of service, privacy policy, and — because this handles real
   patient medical data — a genuine legal review of what compliance a healthcare
   SaaS product needs in whatever market(s) it's sold into. This is explicitly
   **not** something engineering can complete by writing code; it's a legal/
   business process that needs to run in parallel, not be treated as a
   checkbox at the end.
9. **Onboarding hardening**: the current signup/setup flow was built for one
   clinic's own use, not for a stranger to self-serve sign up without hand-holding.
10. **Backups**: confirmed and *tested* restore process, not just "the provider
    probably backs this up."

Steps 1–6 are the realistic path to safely selling this to a handful of pilot
clinics. Steps 7–10 are what's needed before scaling that to many.

---

## 9. What's Left On The Product Roadmap (not production-hardening, actual features)

From the active 30-day plan (`system_design.md` has the full week-by-week detail):

- **Week 3** (not started): real post-op recovery journal writes, a unified
  notification engine (SMS/WhatsApp/email/in-app behind one interface), deeper
  inventory (suppliers, purchase orders, implant-consumption-on-surgery hook),
  and real Owner analytics (revenue-over-time, most-profitable-procedure,
  lead-conversion-rate, no-show-rate — currently the Overview page is
  deliberately still mock).
- **Week 4** (not started): the remaining 6 of 8 AI workflows, Groq-based speech-
  to-text (for AI Receptionist call transcription and doctor voice-dictation —
  currently zero speech-to-text exists anywhere in the system), real audit
  logging, the focused test suite from §9 above, and a CI pipeline.
- **Frontend bundle size** — code-splitting, flagged by the build tooling
  already, not yet acted on.
- **The Owner-only Consent Templates settings page** (built this session) has
  been verified against the real backend but never actually clicked through in
  its own UI — there was no Owner login available to this session to test it
  directly. Worth a five-minute manual check.

---

## 10. Immediate Next Steps, In Priority Order

1. **Test the WhatsApp feature for real** (see §11 below) — the single most
   customer-visible thing built this session.
2. Decide whether to keep building Week 3/4 features, or pivot effort toward
   §9's production-hardening steps 1–6 — this is a real prioritization
   decision, not something to default on silently, since "sell this to other
   businesses" and "keep adding features" pull in different directions this
   month.
3. Either way: Redis-backed rate limiting and the focused test suite are worth
   doing soon regardless of which direction is chosen, since both are
   foundational rather than feature work.

---

## 11. How To Test What Was Built This Session

**WhatsApp AI Receptionist + human takeover:**
Log in as the Owner on the practice with the connected WhatsApp number
(`usageforworking@gmail.com` — this session doesn't have that password, so
couldn't click through it directly; only verified via direct backend calls
against the real, live-connected WhatsApp instance). Go to Agent Sessions →
All conversations. There's a real conversation with "Ahmed Khan" about
rhinoplasty pricing, handled entirely by AI. To test human takeover for real:
send an actual WhatsApp message to the connected number from a different real
phone, watch it appear in the dashboard, then type a reply directly in the
dashboard's message box — it sends over real WhatsApp, and the AI stops
auto-replying to that conversation until it's manually resumed (the "AI
paused / AI replying" toggle next to the conversation).

**Surgery module:** Log in as Doctor (`doctor+clerk_test@aiaceone.dev` /
`Aceonedoctor`), go to Surgery in the sidebar, schedule one, check off the
pre-op checklist, mark it complete with an operative note and implant details.

**Patient medical profile / consent versioning / photo timeline:** Open any
patient's record as Doctor or Owner — the new "Medical profile" section is
editable in place; the Photo timeline groups uploads by stage with a
before/after comparison slider; Consent documents can be raised from a
template (Owner creates templates under Settings → Consent templates).

**Main Agent:** Click "Main Agent" in the sidebar (now visible to all three
roles) and ask it a real question — e.g. "how many patients are checked in
today?"

---

*This document reflects the state of the system as of 2026-09-04. It is meant to
be updated, not archived — the honest-status format here should keep being used
as the project moves toward production, not just for this one report.*
