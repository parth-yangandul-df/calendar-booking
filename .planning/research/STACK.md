# Technology Stack — Calendar Booking System

**Domain:** Calendar booking / appointment scheduling system (web)
**Researched:** May 2026
**Overall confidence:** HIGH (multiple production-grade sources agree)

> **Prescriptive stance.** This document picks specific libraries with rationale. Where multiple options are viable, a primary recommendation is given and alternatives are listed with their "when to choose" conditions.

---

## Recommended Stack

### Core Web Framework

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **Next.js** | 16.x (App Router) | Full-stack framework | Largest React ecosystem, SSR/SSG/ISR/PPR, Turbopack stable, deepest hiring pool |
| **React** | 19.x | UI library | Required by Next.js, React Compiler maturing for DX |
| **TypeScript** | 5.x | Language | Non-negotiable for a project of this complexity |
| **Tailwind CSS** | v4 | Styling | Utility-first, zero runtime, shadcn/ui dependency |
| **shadcn/ui** | latest | Component library | Copy-paste components you own (no dep conflicts), Radix UI a11y, Tailwind v4 native |
| **Lucide React** | latest | Icons | Standard with shadcn/ui, lightweight, comprehensive icon set |

**Why Next.js 16 over alternatives:**
- **Next.js vs SvelteKit:** SvelteKit produces smaller bundles (~40-60% less JS), but the React ecosystem advantage (6.5M vs 500K weekly downloads) is decisive for a booking app that will need third-party calendar, date, form, and table libraries. Hiring pool for React/Next.js is 13x larger.
- **Next.js vs Remix/React Router v7:** Remix has cleaner form handling and lower server costs (~$21 vs $47 at 500K requests/month), but Next.js's Partial Prerendering for public booking pages (SSG speed + live availability) is a meaningful advantage. Remix also has a bifurcated future (React Router v7 vs Remix 3).
- **Next.js vs TanStack Start:** Too new; ecosystem not mature enough for production booking systems.
- **Deploy target:** Vercel for simplest path (zero-config), AWS via `serverless-next.js` or Docker for enterprise.

### Database

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **PostgreSQL** | 17.x | Primary database | ACID compliance for booking transactions, TIMESTAMPTZ for timezone-safe storage, JSONB for flexible metadata, row-level locking (`SELECT ... FOR UPDATE SKIP LOCKED`) for concurrency |
| **Drizzle ORM** | 1.x (stable) | Type-safe database access | SQL-like transparency, ~7KB bundle (85x smaller than Prisma 6), edge-native, no codegen step, types inferred from schema |
| **Neon** (or Supabase) | — | Serverless Postgres hosting | Scale-to-zero for intermittent workloads, instant branching for preview environments, native Vercel integration |

**Drizzle vs Prisma 7 rationale:**
- Drizzle generates a *single SQL statement* per query (one round-trip). Prisma can generate multiple queries (N+1 by design with data loader batching), which matters for the complex joins in scheduling.
- Drizzle's ~7KB bundle vs Prisma 7's ~600KB gzipped. For serverless/edge deployment (bookings page on Vercel Edge), this matters.
- Drizzle's SQL-like API maps 1:1 to the `SELECT ... FOR UPDATE` locking pattern critical for preventing double-bookings.
- Prisma 7's migration from Rust to TypeScript closed the gap dramatically, but Drizzle still wins for edge/serverless. **Choose Prisma if** your team is less SQL-comfortable or you need Prisma Studio's mature migration tooling.

**Neon vs Supabase rationale:**
- **Neon** is the purer choice if you use Better Auth or Clerk (bring your own auth). Scale-to-zero means a booking system with evening/weekend usage peaks pays ~75% less compute. Instant branching enables per-PR database clones with real data — invaluable for testing scheduling logic.
- **Supabase** wins if you want auth+DB+realtime in one platform and have no existing auth investment. The bundled auth saves weeks. Realtime subscriptions (logical replication) enable live availability updates.
- **Hybrid approach** (common): Neon for DB + Clerk/Better Auth for auth. This is the trend in 2026 for Next.js/Vercel apps.

**Redis** (for caching availability):

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **Upstash Redis** or **Redis** | 7.x | Availability caching, session storage, job queue | Cache computed availability slots with 2-min TTL; BullMQ for scheduled reminders; session store |
- Not required at MVP stage. Add when pre-computing availability becomes necessary.
- Free tiers on Upstash are generous enough for early-stage.

### Calendar UI Component

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **FullCalendar** | v7 (React) | Calendar UI widget | Month/week/day views, drag-drop, event rendering, recurring events via rrule plugin; v7 rewritten for proper React SSR/StrictMode |
| **temporal-polyfill** | latest | Peer dependency of FullCalendar v7 | FullCalendar v7 requires this; also serves as Temporal API polyfill for Safari |

- FullCalendar v7 (beta as of Feb 2026, stable expected mid-2026) moved to `@fullcalendar/react/*` entrypoints for standard plugins and `@fullcalendar/react-scheduler` for premium.
- Uses `temporal-polyfill` (FullCalendar's own ~20KB polyfill) — not `@js-temporal/polyfill` — aligning with the Temporal API standard.
- v6 is the stable fallback if v7 hasn't shipped final by build time. v6.1.20 (Dec 2025) is production-tested.

### Date / Time / Timezone

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **Temporal API** | Native (ES2026) | All date/time operations | Stage 4 as of March 2026, shipping in Chrome 144+, Firefox 139+, Node.js 26 unflagged |
| **temporal-polyfill** | latest | Polyfill for Safari/legacy | ~20KB gzipped, passes TC39 test suite, maintained by FullCalendar team |
| **date-fns** | v4 | Formatting utilities | Required until Temporal's formatting matures; tree-shakeable, functional API |
| **rrule.js** | 2.7.x | RFC 5545 recurrence rules | Industry standard for recurring event expansion (RRULE, EXRULE, RDATE, EXDATE) |

**Why NOT older libraries:**
- **Moment.js** — Deprecated since 2020. Do not use.
- **Luxon** — Excellent library (~10M weekly downloads) but Temporal is now the standard. Migration path from Luxon → Temporal is documented but unnecessary for a greenfield project.
- **Day.js** — Fine but unnecessary; Temporal replaces it natively.
- **Spacetime** — ~40KB bundled timezone data; Temporal delegates to the runtime's Intl API (zero added bytes).
- **`@date-fns/tz`** — Not needed for greenfield; use Temporal's `ZonedDateTime` directly.

**Critical timezone rule:**
- Store all times as `TIMESTAMPTZ` (timestamp with timezone) + IANA timezone string (e.g., `America/New_York`).
- Never store only a UTC offset. Offsets change with DST; IANA timezones do not.
- Recurring appointments: store as `local_time + tzid`, recalculate to UTC per occurrence. A weekly 2 PM Eastern appointment stays 2 PM Eastern across DST transitions.

### Google Calendar API Integration

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **googleapis** | 105+ | Google Calendar API v3 client | Official Google Node.js client, full TypeScript types |
| **OAuth 2.0** (google.auth.OAuth2) | — | User authorization | Access user calendars for free/busy + event creation |

**Key patterns:**
- **Scopes requested:** `calendar.events.readonly` (free/busy), `calendar.events` (create events), `calendar.settings.readonly` (timezone). Request minimal scopes.
- **Token storage:** Refresh tokens stored encrypted in database per user. Access tokens auto-refreshed via `oauth2Client`.
- **`access_type: 'offline'` + `prompt: 'consent'`** is required to get a refresh token on every authorization.
- **FreeBusy API** (`calendar.freebusy.query`) — more efficient than fetching full event details. Returns only busy intervals.
- **Push notifications** via watch channels. Set up a webhook endpoint that receives calendar change notifications and re-computes availability.
- **Polling fallback:** Webhooks can be delayed or missed. Implement periodic polling every 5-10 minutes as a safety net.
- **Caching:** Cache free/busy results with 2-minute TTL. Calendar events rarely change minute-to-minute.

### Google Meet API Integration

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **Google Calendar API** (conferenceData) | v3 | Generate Meet links | Works for ALL users (free Gmail + Workspace) |

**Critical finding:** Do NOT use `@google-apps/meet` for Meet link creation. The Meet REST API (`spaces.create`) **only works with Google Workspace accounts**. Free Gmail accounts cannot use it — the API returns a permission error with no indication that account type is the issue.

**Correct approach:** Generate Meet links by piggybacking on Calendar event creation:
```
events.insert({
  conferenceDataVersion: 1,
  conferenceData: {
    createRequest: {
      conferenceSolutionKey: { type: "hangoutsMeet" },
      requestId: uuid
    }
  }
})
```
The `hangoutLink` comes back in the response. This works universally.

**If your app already creates a Calendar event**, include `conferenceData.createRequest` in that same call (zero extra API overhead). If you need a standalone Meet link (no calendar event context), create a temporary event, extract the link, and delete the event.

### Authentication

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **Better Auth** (recommended) | latest | Authentication (self-hosted) | TypeScript-first, framework-agnostic (Next.js, SvelteKit, etc.), plugin system (organizations, 2FA, passkeys, magic links), zero per-MAU cost |
| **Clerk** | 7.x (managed alternative) | Authentication as a service | Fastest setup, pre-built UI, organizations/MFA/SSO built-in |

**Decision matrix:**

| Criteria | Better Auth | Clerk | Auth.js (NextAuth) |
|----------|-------------|-------|---------------------|
| Self-hosted | ✅ | ❌ | ✅ |
| TypeScript DX | Excellent | Good | Improving |
| OAuth providers | 20+ | 15+ | 80+ (broadest) |
| Organizations | Plugin | ✅ Built-in | ❌ |
| 2FA/MFA | Plugin | ✅ Built-in | ❌ |
| Pre-built UI | ❌ | ✅ Beautiful | ❌ |
| Cost at 50K MAU | $0 (DB cost) | ~$825/month | $0 (DB cost) |
| Setup time | 1-2 hours | 10 minutes | 2-4 hours |

- **Choose Better Auth for:** New TypeScript project, self-hosted control, no per-MAU cost, need modern features (passkeys, orgs).
- **Choose Clerk for:** Fastest time-to-market, pre-built UI components, B2B multi-tenant needs, team comfortable with vendor dependency. Free up to 10K MAU.
- **Choose Auth.js for:** Existing Next.js investment, need maximum OAuth provider breadth (80+), team already familiar.
- **Lucia v3** was deprecated as a library in September 2024. Do not use.

**For this booking system (likely multi-tenant calendar providers):** Better Auth is the strongest default. It gives you organizations (for team booking), social OAuth (Google sign-in = one less auth friction), no surprise bills, and full control over user data.

### Email Service Provider

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **Resend** | latest | Transactional email | Best DX (React Email + Next.js native), 3K/month free, modern API, no-overage policy |
| **React Email** | latest | Email templates | Build email as React components, renders to cross-client HTML, native Resend integration |

**Decision matrix at scale:**

| Volume | Resend | Amazon SES | SendGrid |
|--------|--------|------------|----------|
| 3K/month | **$0** | ~$0.30 | $0 (trial) |
| 50K/month | $20 | **$5** | $19.95 |
| 100K/month | $90 | **$10** | $89.95 |
| 500K/month | ~$400 | **$50** | ~$250 |
| DX | Best | Poor (ceremony-heavy) | Acceptable |

- **Start with Resend.** For a typical booking system under 100K emails/month, Resend's DX savings (15-min setup vs 2-3 days for SES) dwarfs the cost difference.
- **Move to Amazon SES** when exceeding ~500K emails/month. At that volume, the $350+/month savings funds the engineering time to build analytics on top of SES.
- **SendGrid** only if you need marketing email + transactional in one platform. SendGrid killed its free tier (May 2025), making it a paid-only platform from day 61.
- **Do NOT use:** Nodemailer directly (you manage deliverability, reputation, bounce handling). Mailgun (declining DX vs Resend).

### Payment Processing

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **Stripe** (standard) | latest | One-provider payments | Single service accepting bookings → single Stripe account |
| **Stripe Connect** (Express) | latest | Multi-provider marketplace | Platform facilitating bookings between customers and multiple service providers |

- **Standard Stripe** for a single-entity booking system (one salon, one consultant, one practice). Simple PaymentIntent + webhook pattern.
- **Stripe Connect Express** for a marketplace/platform (Calendly-like, where multiple providers get paid). Stripe handles KYC/KYB onboarding, identity verification, bank account collection. Cost: 0.25% per payout (max $2).
- **Critical pattern:** Booking is only confirmed after `checkout.session.completed` webhook fires. Never confirm bookings on client-side callback alone.
- **Do NOT use:** PayPal as primary processor — higher declines, worse DX, more complex webhooks. Add PayPal as secondary payment method later if market demands it.

### Job Queue / Scheduled Tasks

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **BullMQ** | 5.x | Job queuing & scheduled tasks | Persistent job queue (Redis-backed) for reminder scheduling, email dispatch, calendar sync |
| **Inngest** (alternative) | latest | Serverless job queue | No Redis required, Vercel-native, good for teams wanting less infrastructure |

- **BullMQ for:** Teams already running Redis. More control over retries, delays, rate limiting.
- **Inngest for:** Teams on Vercel that want zero-infrastructure job scheduling. Serverless-native.

**Reminder scheduling pattern:** Enqueue a delayed job at `event.start - reminder_delay` when booking is confirmed. Use BullMQ's `jobs.add('send-reminder', data, { delay: msUntilReminder })`. Never use `setTimeout` in API routes — it doesn't survive server restarts.

### Admin Dashboard

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **shadcn/ui** | latest | Dashboard component library | Sidebar, data tables, charts, forms — all owned in your codebase |
| **TanStack Table** | v8 | Data tables | Headless, type-safe, server-side pagination/sorting/filtering for booking lists |
| **Recharts** | latest | Charts | shadcn/ui's chart component wraps Recharts; good enough for revenue/booking analytics |
| **React Hook Form + Zod** | latest | Form management | Type-safe forms for service/availability/admin configuration |

**Source of truth for admin UI:**
- The **next-shadcn-dashboard-starter** (6,000+ GitHub stars, MIT) provides a production-ready admin dashboard template with Next.js 16, Clerk auth, TanStack Tables, themes, and RBAC navigation. Start from this rather than building from scratch.
- **Do NOT use:** react-admin or adminjs — they impose their own data provider layer and rendering model that fights Next.js App Router patterns.

### Analytics / Error Tracking

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **Sentry** | latest | Error tracking | Breadcrumb trail through booking flows, release health, performance monitoring |
| **PostHog** (self-hosted or cloud) | latest | Product analytics | Track booking funnel conversion, feature usage; self-hostable for data privacy |

- Add Sentry in Phase 1 (infrastructure). Add PostHog when validating product-market fit.

### Infrastructure / DevOps

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **Vercel** | — | Hosting (recommended) | Zero-config Next.js deployment, edge functions, ISR, preview deployments |
| **Docker** | latest | Containerization | For non-Vercel deployments, local dev consistency |
| **GitHub Actions** | — | CI/CD | Industry standard, free for public/private repos |

---

## Full Installation (MVP)

```bash
# Core framework
npx create-next-app@latest booking-app --typescript --tailwind --app
npm install next@16 react@19 react-dom@19

# UI
npm install @radix-ui/react-* # shadcn handles this via its CLI
npx shadcn@latest init
npx shadcn@latest add sidebar button card form table dialog calendar popover

# Database
npm install drizzle-orm postgres @neondatabase/serverless
npm install -D drizzle-kit

# Date/Time
npm install temporal-polyfill date-fns rrule

# Calendar UI
npm install @fullcalendar/react@beta @fullcalendar/react/daygrid@beta @fullcalendar/react/timegrid@beta @fullcalendar/react/interaction@beta

# Google APIs
npm install googleapis

# Auth (pick one)
npm install better-auth
# OR
npm install @clerk/nextjs

# Email
npm install resend react-email

# Payments
npm install @stripe/stripe-js @stripe/react-stripe-js stripe

# Job Queue (if using Redis)
npm install bullmq ioredis
```

---

## What NOT to Use

| Technology | Reason to Avoid |
|------------|----------------|
| **Moment.js** | Officially deprecated since 2020. No tree-shaking, mutable API, bundle bloat. |
| **Luxon** | Excellent library, but Temporal is now the standard for greenfield. No reason to adopt a transitional library. |
| **TypeORM / Sequelize** | ORMs from a previous era. Heavy, slow TypeScript support, complex APIs. Drizzle or Prisma are strictly better. |
| **react-admin / adminjs** | Admin frameworks that fight Next.js App Router. Build dashboard with shadcn/ui — you own the code. |
| **@google-apps/meet** | Workspace-only. Breaks for free Gmail users with no error message. Use Calendar API conferenceData instead. |
| **Nodemailer directly** | You manage deliverability, reputation, bounce/ complaint handling, and IP warm-up yourself. Use Resend/SES. |
| **SendGrid (for transactional)** | Killed free tier in May 2025. DX is behind Resend. Only use if marketing email is required in the same platform. |
| **PayPal as primary** | Higher decline rates, worse developer experience, more complex webhook handling. |
| **Lucia v3** | Deprecated as a library (September 2024). Author recommends it as "learning resource" only. |
| **Auth0** | Overpriced at scale (~$300-500/month at 50K MAU). Clerk offers better DX for less. Better Auth offers self-hosted for free. |
| **PlanetScale** | Dropped free tier April 2024. Neon offers better serverless Postgres with scale-to-zero. |
| **MongoDB / NoSQL** | Booking data is inherently relational — users, services, time slots, bookings, payments. PostgreSQL's ACID transactions are the correct foundation. JSONB columns cover flexible metadata needs. |
| **In-memory scheduling** (`setTimeout`) | Doesn't survive server restarts, can't scale across workers. Use BullMQ or Inngest for reminders. |

---

## Stack Dependency Map

```
User Browser
  ↓
Next.js 16 (App Router) ← TypeScript 5.x
  ├── shadcn/ui (UI components) ← Radix UI ← Tailwind CSS v4
  ├── FullCalendar v7 (calendar views) ← temporal-polyfill
  ├── TanStack Table (admin data tables)
  └── React Hook Form + Zod (forms)
  ↓
API Routes / Server Actions
  ├── Drizzle ORM → PostgreSQL (Neon)
  ├── BullMQ → Redis (Upstash)
  ├── googleapis → Google Calendar API v3 + Meet
  ├── Stripe SDK → Stripe Payments/Connect
  ├── Resend → Email delivery
  └── Better Auth → Auth DB tables
  ↓
External Services
  ├── Neon PostgreSQL (database)
  ├── Upstash Redis (cache + queue)
  ├── Vercel (hosting)
  ├── Sentry (errors)
  └── PostHog (analytics)
```

---

## Version Source Confidence

| Recommendation | Confidence | Sources |
|---------------|------------|---------|
| Next.js 16 | HIGH | Next.js changelog, comparison benchmarks (Pockit, PkgPulse, LogRocket) |
| Drizzle ORM 1.x | HIGH | Multiple 2026 comparison articles (Pockit, APIScout, ECOSIRE), npm stats |
| Temporal API (Stage 4) | HIGH | TC39 commit (March 2026), Chrome 144 release, Node.js 26 release notes |
| FullCalendar v7 | MEDIUM | Beta status (Feb 2026), v7 changelog; v6.1.20 stable fallback |
| Better Auth | HIGH | Multiple 2026 comparison guides (StarterPick, PkgPulse, APIScout) |
| Resend | HIGH | Published pricing, DX comparisons, community consensus for new SaaS |
| Stripe Connect for marketplace | HIGH | Stripe official docs, platform guides |
| Google Calendar API via googleapis | HIGH | Google official docs, production references |
| Meet via Calendar API (not @google-apps/meet) | HIGH | Brandon Wie's investigation, Google Calendar events docs |

---

**Recommendation for most booking systems:** Start with Next.js 16 + Drizzle + Neon + Better Auth + Resend + Stripe + FullCalendar v7 (or v6 stable). This gives you the most modern, performant, and cost-predictable stack for a calendar booking system in 2026.
