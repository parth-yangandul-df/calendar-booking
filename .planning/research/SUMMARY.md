# Project Research Summary

**Project:** Calendar Booking System
**Domain:** Calendar booking / appointment scheduling (web)
**Researched:** 2026-05-22
**Confidence:** HIGH

## Executive Summary

This is a **calendar booking system** where users define availability, share booking links, and others book time slots with auto-generated Google Meet links and email notifications. The market is mature (Calendly ~15M users, Cal.com ~40K GitHub stars, SavvyCal, Acuity) — users expect polished, reliable scheduling out of the box. Double-booking is unforgivable, timezone handling is deceptively hard, and email deliverability determines whether the product works at all.

**Recommended approach:** Build as a **modular monolith** with clean internal boundaries using **Next.js 16 + Drizzle ORM + PostgreSQL (Neon) + Better Auth + Temporal API + FullCalendar + Resend + Stripe**. Compute availability on-demand from rules, not pre-expanded slots. Use database-level locking (`SELECT ... FOR UPDATE`) for atomic booking transactions. Deploy to Vercel. Start simple, extract services only when scaling demands it.

**Key risks and mitigations:** (1) **Double-booking** — mitigate with DB exclusion constraints + atomic transactions + optional Redis holds. (2) **Timezone corruption** — always store UTC + IANA timezone, compute in UTC, display in local time, never use `LocalDateTime` for storage. (3) **Email deliverability** — configure SPF/DKIM/DMARC before sending, use a dedicated email service (Resend), not the app server. (4) **Google Calendar rate limits** — use push notifications not polling, set `quotaUser`, implement exponential backoff. (5) **IDOR/Security** — use UUID booking IDs, verify ownership on every endpoint, never rely on sequential IDs.

## Key Findings

### Recommended Stack

The stack is well-documented with HIGH confidence across all layers. Core decisions:

**Core technologies:**
- **Next.js 16 (App Router)** + **React 19** + **TypeScript 5.x** — Full-stack framework with largest React ecosystem, SSR/SSG/ISR/PPR, Turbopack stable. Deploy on Vercel.
- **Tailwind CSS v4** + **shadcn/ui** — Utility-first styling with owned components (no dep conflicts), Radix UI a11y. Use `npx shadcn@latest init`.
- **PostgreSQL 17** via **Neon** (serverless, scale-to-zero) — ACID compliance for booking transactions, `TIMESTAMPTZ` for timezone-safe storage, `SELECT ... FOR UPDATE SKIP LOCKED` for concurrency. Neon's branching enables per-PR database clones.
- **Drizzle ORM 1.x** — SQL-like, ~7KB bundle (85x smaller than Prisma), edge-native, no codegen, types inferred from schema. Drizzle generates single SQL statements per query (vs Prisma's potential N+1).
- **Temporal API** (ES2026 Stage 4) — Native date/time operations in Chrome 144+, Firefox 139+, Node.js 26. Polyfill with `temporal-polyfill` for Safari/legacy (~20KB). **Do NOT use Moment.js, Luxon, or Day.js** for greenfield.
- **FullCalendar v7** (React) — Calendar UI with month/week/day views, drag-drop, recurring events via rrule plugin. v7 beta as of Feb 2026; v6.1.20 is the stable fallback.
- **Better Auth** (recommended over Clerk) — TypeScript-first, self-hosted, zero per-MAU cost, plugin system (orgs, 2FA, passkeys, magic links). Choose Clerk only if fastest time-to-market is critical.
- **Resend** + **React Email** — Transactional email with best DX (15-min setup), 3K/month free, React Email templates. Move to Amazon SES at >500K emails/month.
- **Stripe** (standard) or **Stripe Connect** (Express for marketplace) — One-provider payments. Booking confirmed only after `checkout.session.completed` webhook fires.
- **BullMQ** (with Upstash Redis) or **Inngest** — Job queue for reminders. **Never use `setTimeout` in API routes** — it doesn't survive server restarts.
- **Sentry** (Phase 1) + **PostHog** (Phase 3+) — Error tracking and product analytics.

**Stack dependency map:** `User Browser → Next.js 16 (App Router) [shadcn/ui + FullCalendar + TanStack Table + React Hook Form/Zod] → API Routes/Server Actions [Drizzle ORM → PostgreSQL, BullMQ → Redis, googleapis → Google Calendar API, Stripe SDK, Resend, Better Auth] → External Services [Neon, Upstash Redis, Vercel, Sentry, PostHog]`

### Expected Features

The market is mature (14/16 tracked tools score 8.0+/10). The bar for entry is high.

**Must have (table stakes) — Phase 1:**
- **Timezone auto-detection & handling** — HIGH complexity, #1 source of bugs. Store as UTC `timestamptz` + IANA timezone. Convert at display layer only.
- **Calendar sync (bidirectional)** — Google Calendar read + write-back. OAuth flows, webhook subscriptions, sync delays >2 min erode trust.
- **Email reminders & notifications** — Confirmation, 24h reminder, 1h reminder. Use job queue. 20%+ no-show reduction.
- **Custom availability definition** — Per-day-of-week hours, date-range caps, exception dates (holidays/PTO), min/max notice periods.
- **Booking page** — Public URL sharing, embeddable widget, branded page.
- **Cancellation with notice window** — Configurable deadline, automated handling.
- **Prevent double-booking** — CRITICAL. DB-level locking or exclusion constraints. `SELECT ... FOR UPDATE SKIP LOCKED` or Postgres exclusion constraints.
- **Buffer time between meetings** — Configurable per event type.
- **Mobile responsiveness** — PWA acceptable for MVP.

**Should have (differentiators) — Phase 2-3:**
- **Calendar overlay UX** — Highest impact per dev dollar. Bookers see their calendar overlaid on host's. 30-40% fewer rebookings, 15-20% higher conversion (SavvyCal's signature feature).
- **Google Meet link auto-generation** — via Calendar API `conferenceData` (not `@google-apps/meet` which is Workspace-only).
- **Ranked/preferred time slots** — Low cost, high host satisfaction. Hint which times you prefer.
- **Meeting polls** — Send proposed times, let recipients vote.
- **Rescheduling** — Cancel + rebook in one transaction with client continuity.
- **Multi-calendar conflict detection** — Check ALL connected calendars before showing availability.
- **Custom branding / white-label** — Logo + accent colors cover 80% of need.
- **Paid bookings (Stripe)** — Required if monetizing. Reduces no-shows up to 80%.
- **Round-robin team scheduling** — Distribute bookings across team members.
- **Routing forms with conditional logic** — Qualify leads before booking.

**Defer (v3+):**
- Workflow automation (visual builder)
- SMS reminders (Twilio)
- No-show detection & auto-follow-up
- Waitlist / overflow booking
- API access for embedding
- Webhook integrations
- Advanced analytics / reporting

**Anti-features (do NOT build):**
- Phone-based AI booking agent (expensive, niche)
- Full open-source self-hosting (enormous support burden)
- Enterprise resource/room/location management (different product)
- Subscription/class/package scheduling (different data model)
- Group scheduling for >10 participants (Doodle's domain)
- Deep Salesforce/HubSpot CRM sync (offer webhooks + Zapier)
- Enterprise SSO/SAML/SCIM (defer until paying enterprise customers)

### Architecture Approach

**Decision: Modular monolith with clean internal boundaries.** Do NOT build microservices for v1. Microservices add distributed systems complexity without proportional benefits. Cal.com (production scheduling platform serving millions) started as a monolith. The architecture has clean module boundaries so extraction is mechanical later.

**Major components:**
1. **Auth Module** — User registration, login, session management, role-based access. JWT + HTTP-only cookie. Two roles: `user` and `admin`.
2. **Availability Engine** — Store and compute when a user is available. Rule-based on-demand computation (Cal.com pattern): users define weekly rules stored in their timezone, the engine converts to UTC per date range, subtracts bookings, returns free slots. **Do NOT pre-expand slots** — anti-pattern.
3. **Booking Engine** — Reserve time slots, detect conflicts, manage booking lifecycle. **Atomic conflict detection** using `SELECT ... FOR UPDATE` in a transaction. Booking state machine: `CREATED → CONFIRMED → COMPLETED` (or `CANCELLED`). Use **version field** for optimistic locking.
4. **Google Meet Integration Service** — Create Calendar events with Meet links via Google Calendar API v3 `conferenceData`. Use Service Account for v1 (simpler, no per-user OAuth).
5. **Notification Service (Email)** — Async job queue using PostgreSQL-backed table (`FOR UPDATE SKIP LOCKED`) for v1 (zero additional infra). Extract to BullMQ/Redis when Redis is added.
6. **Admin Dashboard** — Read-only for v1. View all users/bookings/stats. Build with shadcn/ui + TanStack Table + Recharts.

**Key patterns:**
- **Repository pattern** — Abstract data access behind interfaces. Booking engine testable without DB.
- **Service Layer with Unit of Work** — Multi-table operations (conflict check → insert → audit log) inside a single transaction.
- **Outbox Pattern** — Side effects (API calls, emails) happen AFTER transaction commits. Use outbox table for reliability.
- **REST over RPC** — Resource-oriented (`/api/v1/bookings`), consistent error format, status code discipline (409 for double-book).
- **Timezone architecture** — Store ALL times as UTC. Availability rules stored in **provider's IANA timezone**. Compute in UTC. Display in viewer's timezone. Never store `LocalDateTime` without timezone.

**Database schema:** User (UUID PK) → Schedule (1:1) → Availability (1:M, day_of_week + start/end time in user's timezone). Booking (UUID PK, host_id FK, booker_id FK, start/end UTC, status enum, version int, meet_url). BookingAudit (immutable log). EmailNotification (DB-backed job queue). Critical indexes on `(host_id, start_time, end_time, status)` for conflict detection.

### Critical Pitfalls

1. **Storing times without timezone context** (CRITICAL) — The #1 support issue across every booking platform. Use UTC `timestamptz` + IANA timezone ID. Never use `LocalDateTime`, timezone abbreviations (EST/PST), or epoch millis alone. DST transitions cause silent time shifts. **Address in Phase 2 (data model).**

2. **Double-booking race conditions** (CRITICAL) — Two users simultaneously booking the same slot is the #1 trust-killer. Database-level constraints are the source of truth (app-level checks are insufficient). Use `SELECT ... FOR UPDATE` in a transaction, or PostgreSQL exclusion constraints with GiST index. Add idempotency keys. **Address in Phase 3 (booking transaction).**

3. **Google Calendar API rate limits** (HIGH) — Three-tier quota: 10K/min/project, 600/min/user, 1M/day billing threshold. Use push notifications (webhooks) NOT polling. Always set `quotaUser` for service accounts. Implement exponential backoff with jitter. Randomize sync times. **Architecture decisions (poll vs push) made in Phase 1.**

4. **Email deliverability — confirmations go to spam** (HIGH) — Configure SPF, DKIM, DMARC before sending. Google/Yahoo/Microsoft require DMARC for senders >5K/day. Use dedicated transactional email service (Resend), never send from app server. Warm up dedicated IPs. Monitor bounce rate <3%. **DMARC DNS setup begins Phase 1.**

5. **IDOR — Unauthorized booking access/cancellation** (HIGH) — Multiple CVEs for booking plugins (CVE-2025-12787, CVE-2025-69358). Use UUIDs (not sequential IDs) for booking IDs. **Always verify ownership** on every endpoint — authenticated user must own the booking. Rate limit booking queries. Audit all access attempts. **Address in Phase 1 (auth) + Phase 3 (booking endpoints).**

6. **Availability vs Bookings schema mismatch** (HIGH) — Wrong schema design makes queries slow and feature additions painful. Separate tables for `availability_rules`, `availability_overrides`, and `bookings`. Compute slots on-the-fly from rules − overrides − bookings. Cache results. **Address in Phase 2 (data model).**

## Implications for Roadmap

Based on combined research, the following phase structure is recommended. Dependencies are clear: Auth → Availability → Booking → Notifications → Admin.

### Phase 1: Foundation + Auth + Data Model
**Rationale:** Everything depends on auth and the core data model. Getting times stored correctly (UTC + IANA timezone) from day one prevents the #1 pitfall (timezone corruption). The data model decisions here cascade into every later phase.
**Delivers:** Next.js 16 project scaffold, PostgreSQL database schema (User, Schedule, Availability, Booking, BookingAudit, EmailNotification tables), Better Auth setup (signup/login/session/seed admin), Drizzle ORM schema + migration, Repository pattern infrastructure.
**Uses:** Next.js 16, TypeScript 5.x, Tailwind CSS v4, shadcn/ui, Drizzle ORM, PostgreSQL (Neon), Better Auth, Sentry.
**Avoids:** Over-engineering (Pitfall 11), Wrong data model (Pitfall 8), Timezone storage mistakes (Pitfall 1 — set the pattern early).
**Research flag:** Standard patterns — well-documented, skip deeper research.

### Phase 2: Availability Engine + Booking Page UI
**Rationale:** Availability definition must exist before anyone can book. Build the slot computation engine (rule-based, on-demand) with correct DST handling. Implement the public booking page UI with FullCalendar. This is the core value proposition users interact with.
**Delivers:** Schedule CRUD (set weekly availability, timezone, exception dates), `GET /api/v1/users/:id/availability` slot query endpoint (on-demand computation from rules − bookings), public booking page with FullCalendar (two-step date → time flow), buffer time configuration, mobile-responsive booking UI.
**Uses:** Temporal API, date-fns, FullCalendar v7 (or v6 stable), shadcn/ui calendar/popover/dialog components, TanStack Table.
**Avoids:** Timezone drift (Pitfall 1 — rules stored in provider timezone, computed in UTC), Confusing availability display (Pitfall 6 — two-step Calendly flow, clear color coding), Naive pre-computation (Architecture anti-pattern — compute on-demand).
**Research flag:** Standard patterns — skip research. FullCalendar integration is well-documented.

### Phase 3: Booking Engine + Meet + Notifications
**Rationale:** The booking transaction is the hardest correctness problem (double-booking prevention). Must implement atomic conflict detection with `SELECT ... FOR UPDATE`. Google Meet link creation and email notifications are triggered by booking events, so booking must come first. This phase delivers the end-to-end booking flow.
**Delivers:** `POST /api/v1/bookings` (atomic create with conflict check), `POST /api/v1/bookings/:id/cancel` (with 24h enforcement), BookingAudit immutable log, Google Meet link auto-generation via Calendar API `conferenceData` (Service Account), email notification queue (DB-backed, `FOR UPDATE SKIP LOCKED`), confirmation + cancellation email templates (React Email), booking state machine implementation.
**Uses:** Google APIs (`googleapis`), Resend + React Email, BullMQ (if Redis ready) or DB-backed queue, Stripe SDK (if paid bookings needed).
**Avoids:** Double-booking race conditions (Pitfall 2 — `SELECT FOR UPDATE` + version field), Google Calendar rate limits (Pitfall 3 — push notifications, `quotaUser`, exponential backoff), Email deliverability (Pitfall 4 — SPF/DKIM/DMARC configured), Synchronous email on booking path (Architecture anti-pattern — async queue).
**Research flag:** Needs `/gsd-research-phase` — Google Calendar API quota management details and push notification webhook setup are nuanced. Email deliverability configuration (DMARC policy DNS records) requires operational-specifics research.

### Phase 4: Admin Dashboard + Security Hardening
**Rationale:** Admin needs visibility into the system that Phase 1-3 produces. Security hardening (IDOR prevention, rate limiting, audit) protects the now-operational booking flow. This phase closes the security surface before adding more features.
**Delivers:** Admin dashboard (user list with booking counts, all-bookings list with pagination/sorting/filtering, system stats), admin-only API routes with role-based access control, security hardening (UUID verification on every booking endpoint, rate limiting, audit log review), cancellation policy enforcement validation (store deadlines in UTC, display in customer timezone).
**Uses:** shadcn/ui sidebar/table/card, TanStack Table (server-side pagination), Recharts (basic stats).
**Avoids:** IDOR (Pitfall 7 — ownership verification on all endpoints), Cancellation policy timezone edge cases (Pitfall 5 — store computed deadline in UTC).
**Research flag:** Standard patterns for admin dashboard (shadcn + TanStack Table + Recharts). Skip research.

### Phase 5: Enhanced UX (Calendar Overlay + Multi-Calendar + Rescheduling)
**Rationale:** Calendar overlay (SavvyCal's signature feature) provides the highest UX impact per implementation cost — 15-20% booking conversion improvement. Rescheduling is a natural user need after the basic booking flow. Multi-calendar conflict detection prevents embarrassment. These features differentiate from basic Calendly-like tools.
**Delivers:** Calendar overlay UX (booker sees their calendar overlaid on host's availability), ranked/preferred time slots (hint which times hosts prefer), rescheduling (cancel + rebook in one atomic transaction), multi-calendar conflict detection (aggregate busy time across ALL connected calendars), custom branding (logo + accent colors), meeting polls.
**Uses:** FullCalendar (calendar overlay view), Google Calendar OAuth 2.0 (per-user calendar connections), date-fns (display formatting).
**Avoids:** Partial overlap booking (Edge case — clip availability at exact boundaries), Multi-calendar conflicts (Edge case — slot free only if free on ALL calendars).
**Research flag:** Needs `/gsd-research-phase` — Calendar overlay UX is a novel composite pattern with limited open-source references. Per-user Google OAuth flow (multiple calendars) requires careful token management research.

### Phase 6: Growth Features (Round-Robin + Paid Bookings + Waitlist)
**Rationale:** These features unlock monetization (paid bookings) and team use cases (round-robin). Deferred until the core booking flow is proven. Paying customers justified the complexity.
**Delivers:** Round-robin team scheduling (evenly distribute bookings across team members), routing forms with conditional logic (qualify leads → route to right person), paid bookings (Stripe PaymentIntent + webhook `checkout.session.completed`), waitlist/overflow booking (auto-assign on cancellation).
**Uses:** Stripe Connect (if marketplace multi-provider), Stripe standard (if single-entity).
**Avoids:** Payment pitfalls (booking confirmed only after Stripe webhook — never on client-side callback).
**Research flag:** Needs `/gsd-research-phase` — Stripe Connect setup for multi-provider is complex (KYC/KYB, payout routing). Routing form conditional logic has varied implementation patterns.

### Phase 7: Advanced (Workflow Automation + SMS + No-Show Detection)
**Rationale:** Highest complexity, lowest priority. Only build when the user base demands programmatic integrations and automation.
**Delivers:** Webhook integrations (trigger actions on booking events), workflow automation (visual builder — optional, webhook-first is simpler), SMS reminders (Twilio), no-show detection (monitor calendar events + auto-follow-up), API access for embedding, advanced analytics/reporting.
**Uses:** Twilio (SMS), webhook infrastructure, PostHog (analytics).
**Avoids:** Deep CRM integrations (offer webhooks + Zapier instead), Enterprise SSO/SAML (defer until paying enterprise customers).
**Research flag:** Needs `/gsd-research-phase` — Webhook delivery infrastructure is operationally complex (retry, idempotency, rate limiting). Twilio SMS integration is well-documented but country-specific regulations vary.

### Phase Ordering Rationale

- **Auth → Everything else:** No users, nothing works. Auth is the root dependency.
- **Data Model → Availability → Booking:** The data model decisions (UTC storage, IANA timezones, rule-based availability) are foundational. Availability must exist before booking. Booking must exist before notifications.
- **Booking → Meet → Email:** Meet link creation and email notifications are triggered by booking lifecycle events. Must have a booking to trigger them.
- **Core Booking → Admin:** Admin needs data to display. Build the production data path first.
- **Core Booking → Enhanced UX:** Calendar overlay, rescheduling, multi-calendar check all depend on the booking engine being complete and correct.
- **Growth features → Advanced:** Monetization and team features depend on validated product-market fit. Workflow automation and deep integrations are Phase 7+.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 3:** Google Calendar API quota management, push notification webhook setup, email DMARC DNS configuration — operational specifics.
- **Phase 5:** Calendar overlay UX pattern (limited open-source references), per-user Google OAuth token management for multi-calendar.
- **Phase 6:** Stripe Connect marketplace setup (KYC/KYB, routing), routing form conditional logic implementation patterns.
- **Phase 7:** Webhook delivery infrastructure (retry, idempotency, rate limiting), Twilio country-specific SMS regulations.

Phases with standard patterns (skip research-phase):
- **Phase 1 (Foundation + Auth):** Next.js 16 setup, Better Auth integration, Drizzle ORM setup, shadcn/ui init — all well-documented.
- **Phase 2 (Availability + Booking UI):** FullCalendar integration, date-fns/Temporal API usage — documented and community-tested.
- **Phase 4 (Admin Dashboard):** shadcn/ui sidebar + TanStack Table + Recharts — established patterns.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Official docs + multiple 2026 comparison articles. Next.js 16, Drizzle ORM 1.x, Temporal API (Stage 4), Better Auth, Resend — all verified against multiple sources. FullCalendar v7 is MEDIUM (beta status) but v6.1.20 is a stable fallback. |
| Features | HIGH | Market analysis of 16+ tools across multiple sources (ProPicked, Toolradar, Vibe Growth Stack, StackCompare). Feature adoption rates verified. Calendar overlay identified as highest-impact differentiator. Anti-features clearly scoped. |
| Architecture | HIGH | Cal.com open-source architecture (42.4K stars) as primary reference, verified against The Booking Kit, Google Calendar API docs, PostgreSQL docs. Patterns confirmed by Martin Fowler/Sam Newman microservices guidance. |
| Pitfalls | HIGH | Official Google Cloud quota docs, CVEs for real booking plugin vulnerabilities, Microsoft/Calendly timezone bug evidence, email deliverability requirements from Google/Yahoo/Microsoft. Cancellation policy edge cases are MEDIUM (limited public post-mortems) but well-documented in KB articles. |

**Overall confidence:** HIGH across all dimensions. The booking system domain is mature with well-documented patterns, official API references, and production-proven open-source implementations (Cal.com).

### Gaps to Address

- **Payment processing pitfalls** (fraud, chargebacks, PCI compliance) — not researched here because payments are deferred to Phase 6. If paid bookings come earlier, add payment-specific pitfalls research.
- **Scalability at >100K concurrent users** — queue-based booking (virtual waiting room pattern) needed at that scale. Unlikely in early phases. Flag for Phase 6+.
- **Mobile push notification deliverability** — APNs/FCM token expiry is a separate deep topic. Not in scope for v1 (web-first).
- **Calendar sync conflicts (bidirectional)** — When a user changes their Google Calendar directly (not through the booking system), events can get out of sync. Two-way sync conflict resolution is a known hard problem. Defer to v2 when bidirectional sync is added.
- **Recurring appointment expansion** — rrule.js handles RFC 5545 recurrence rules for weekly/monthly patterns, but the edge cases (infinite series, modified occurrences, exception dates) need careful testing. Phase 2 data model should accommodate this even if deferred.

## Sources

### Primary (HIGH confidence)
- **Cal.com GitHub Architecture** (42.4K stars) — Availability engine pattern, modular monolith approach, slot computation
- **Google Calendar API v3 Docs** (May 2026) — Quota limits, push notifications, `conferenceData` for Meet links
- **PostgreSQL Documentation** — `FOR UPDATE` / `SKIP LOCKED` for atomic booking, exclusion constraints, GiST indexes
- **TC39 Temporal API** (Stage 4, March 2026) — ES2026 standard for date/time operations
- **Google/Yahoo/Microsoft DMARC Requirements** (2025) — Email deliverability compliance
- **CVE-2025-12787, CVE-2025-69358, CVE-2024-5889** — Real-world booking plugin vulnerabilities
- **Next.js 16 Changelog** — App Router, server components, Partial Prerendering
- **Resend Pricing / DX** — Transactional email service comparison

### Secondary (MEDIUM confidence)
- **ProPicked** — Scheduling & Booking Trends 2026 (feature adoption across 16 tools)
- **Toolradar** — Best Scheduling Apps 2026: Calendly, Cal.com, SavvyCal Compared
- **StackCompare** — Calendly vs Cal.com vs SavvyCal 2026 (pricing + feature matrix)
- **DEV.to** — "Why Scheduling Is Harder Than It Looks" (timezone/DST pitfalls)
- **DEV.to** — "The Booking System That Created 47 Double-Bookings" (race condition post-mortem)
- **ITNEXT** — "Solving Double Booking at Scale" (Airbnb, Ticketmaster, Calendly patterns)
- **Butterbase** — Build an Appointment Scheduler (data model, exclusion constraints, edge cases)
- **StarterPick** — Best Boilerplates for Booking and Scheduling Apps 2026
- **Aunimeda** — How to Build an Online Booking System (architecture patterns, double-booking prevention)

### Tertiary (LOW confidence)
- **SuperDupr** — Best AI Scheduling Software 2026 (AI features, forward-looking)
- **OnceHub** — Common Scheduling Mistakes (marketing blog, low detail depth)
- **Calenso** — Appointment booking software (European market focus, GDPR emphasis)

### What NOT to Use (from research)
- Moment.js, Luxon, Day.js (Temporal is the standard)
- TypeORM, Sequelize, Prisma (Drizzle is strictly better for this use case)
- react-admin, adminjs (fight Next.js App Router)
- `@google-apps/meet` (Workspace-only, breaks for free Gmail users)
- Nodemailer directly (manage deliverability yourself — use Resend)
- SendGrid for transactional (killed free tier May 2025)
- PayPal as primary processor (higher declines, worse DX)
- Lucia v3 (deprecated September 2024)
- Auth0 (overpriced at scale vs Clerk/Better Auth)
- PlanetScale (dropped free tier April 2024)
- MongoDB/NoSQL (booking data is inherently relational)
- In-memory scheduling / `setTimeout` (doesn't survive restarts)

---
*Research completed: 2026-05-22*
*Ready for roadmap: yes*
