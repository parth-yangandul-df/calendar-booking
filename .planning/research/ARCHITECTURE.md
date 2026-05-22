# Architecture Patterns: Calendar Booking System

**Domain:** Calendar Scheduling & Booking
**Researched:** 2026-05-22
**Primary Reference:** Cal.com open-source architecture (the leading open-source scheduling platform, 42.4k GitHub stars)
**Confidence:** HIGH

## Recommended Architecture: Modular Monolith with Clean Internal Boundaries

**Decision:** Start as a well-structured modular monolith. Do **not** build microservices for v1.

**Rationale:**
- Microservices wisdom (Martin Fowler, Sam Newman): "Start monolithic, extract when justified by team autonomy or scaling needs." Premature microservices add distributed systems complexity without proportional benefits for v1.
- Cal.com (production scheduling platform serving millions) started as a monolith and still runs much of its core as tightly integrated packages.
- This project has ~10 requirements in v1 — it's not a multi-team system.
- The architecture described below has **clean module boundaries** so extraction to services later is straightforward.

---

## High-Level Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                     Client (Browser)                         │
│         React SPA / Server-rendered pages                    │
└──────────┬──────────────────────────────────────┬────────────┘
           │ HTTP/REST API                        │ Public booking
           │ (authenticated)                      │ pages (no auth)
           ▼                                      ▼
┌──────────────────────────────────────────────────────────────┐
│                   API Gateway / Web Server                    │
│         Next.js API routes / Express / Fastify                │
│         Auth middleware → Session validation                  │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │     Auth     │  │  Availability│  │    Booking       │   │
│  │   Module     │  │   Engine     │  │    Engine        │   │
│  │              │  │              │  │                  │   │
│  │ • Signup     │  │ • Schedule   │  │ • Create booking │   │
│  │ • Login      │  │   CRUD       │  │ • Conflict check │   │
│  │ • Session    │  │ • Slot       │  │ • Cancel         │   │
│  │ • Roles      │  │   generation │  │ • Status mgmt    │   │
│  └──────┬───────┘  └──────┬───────┘  └────────┬─────────┘   │
│         │                 │                    │             │
│         ▼                 ▼                    ▼             │
│  ┌────────────────────────────────────────────────────┐     │
│  │           Shared Domain Services                   │     │
│  │  ┌─────────────┐  ┌───────────┐  ┌────────────┐   │     │
│  │  │ Notification│  │  Google   │  │  Admin     │   │     │
│  │  │   Service   │  │  Meet API │  │  Dashboard │   │     │
│  │  │ (Email)     │  │  Wrapper  │  │  (Reads)   │   │     │
│  │  └─────────────┘  └───────────┘  └────────────┘   │     │
│  └────────────────────────────────────────────────────┘     │
│                          │                                   │
│                          ▼                                   │
│  ┌────────────────────────────────────────────────────┐     │
│  │              Data Access Layer                      │     │
│  │  Prisma ORM → PostgreSQL + optional Redis cache    │     │
│  └────────────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────────────┘
```

---

## Component Boundaries

### 1. Auth Module

| Aspect | Detail |
|--------|--------|
| **Responsibility** | User registration, login, session management, role-based access |
| **Owns** | User table, session store, password hashing |
| **Exposes** | Session validation middleware, `getCurrentUser()` helper |
| **Communicates with** | Every other module (via session check) |
| **Key pattern** | JWT + HTTP-only cookie for session; bcrypt for passwords |
| **v1 scope** | Email/password only, seed admin user, two roles: `user` and `admin` |

**Entry points:**
- `POST /api/auth/signup` — Create account
- `POST /api/auth/login` — Authenticate, set session
- `POST /api/auth/logout` — Clear session
- `GET /api/auth/me` — Current user info

### 2. Availability Engine

| Aspect | Detail |
|--------|--------|
| **Responsibility** | Store and compute when a user is available for booking |
| **Owns** | Schedule + Availability tables |
| **Exposes** | `getAvailableSlots(userId, dateRange)` → list of time ranges |
| **Communicates with** | Booking Engine (to subtract booked slots), Calendar Integration (to subtract external busy time — v2) |

**Two approaches evaluated:**

| Approach | Complexity | Flexibility | Chosen? |
|----------|-----------|-------------|---------|
| **Rule-based on-demand** (Cal.com pattern) | Medium | High | **YES** — for v1 |
| Row-per-day pre-expanded | Low | Low | No — rigid, no DST support |

**How the rule-based approach works (Cal.com's `AvailableSlotsService`):**
1. User defines weekly availability rules: `{ days: [1,2,3,4,5], startTime: "09:00", endTime: "17:00", timezone: "America/New_York" }`
2. Rules are stored in the **user's timezone** — this is critical for DST correctness
3. The slot engine converts rule times to UTC for a given date range
4. It subtracts existing bookings (from Booking table) to produce free slots
5. Result: list of `{ start: UTC-time, end: UTC-time }` slots

**Key insight from Cal.com architecture:** Availability rules are stored in the provider's timezone, all overlap checks happen in UTC, and display formatting uses the viewer's timezone.

### 3. Booking Engine

| Aspect | Detail |
|--------|--------|
| **Responsibility** | Reserve time slots, detect conflicts, manage booking lifecycle |
| **Owns** | Booking table, BookingAudit table, booking state machine |
| **Exposes** | `createBooking()`, `cancelBooking()`, `getBookingsForUser()` |
| **Communicates with** | Google Meet API (to generate link), Notification Service (to send emails), Availability Engine (to check slot validity) |
| **Critical pattern** | Conflict detection MUST be atomic |

**Booking State Machine:**

```
CREATED → CONFIRMED → (time passes) → COMPLETED
    │                      │
    └── CANCELLED ←────────┘   (if cancelled ≥24h before start)
```

- v1 does **not** have a PENDING state (no confirmation required — booking is immediately confirmed)
- The 24h cancellation rule is enforced at the application level

**Conflict Detection Strategy — Optimistic Locking with Version Field:**

```sql
-- Every booking has a version column (integer, starts at 0)
-- To create a booking atomically:

BEGIN TRANSACTION;

-- 1. Check no overlapping booking exists
SELECT id FROM bookings
WHERE host_id = @hostId
  AND start_time < @endTime
  AND end_time > @startTime
  AND status != 'CANCELLED'
FOR UPDATE;  -- ← Pessimistic lock on the CHECK query range

-- 2. If none found, insert
INSERT INTO bookings (...) VALUES (...);

COMMIT;
```

**Why this pattern:** For v1's scale, a simple `SELECT FOR UPDATE` in a transaction is the correct choice. It's well-understood, correct, and requires no infrastructure beyond PostgreSQL. If contention becomes a problem later, add version-based optimistic locking.

**Anti-pattern — what NOT to do:**
- Read availability, then write booking as separate HTTP calls (race condition guaranteed)
- Application-level mutexes (don't scale, don't survive restarts)

### 4. Google Meet Integration Service

| Aspect | Detail |
|--------|--------|
| **Responsibility** | Create Google Calendar events with Google Meet video conferencing |
| **Owns** | Google API credentials, OAuth/Service Account token management |
| **Exposes** | `createMeetLink(bookingDetails)` → meet URL |
| **Communicates with** | Booking Engine (triggered on booking creation), Google Calendar API (external) |

**How it works (Google Calendar API v3):**
- There is **no** standalone "Google Meet API" — Meet links are created through the Calendar API
- Create a Calendar event with `conferenceDataVersion=1` and `conferenceData.conferenceSolution.key.type = "hangoutsMeet"`
- The API auto-generates the Meet link and returns it in the response

**Two authentication approaches:**

| Approach | Setup | Best For |
|----------|-------|----------|
| **Service Account with domain-wide delegation** | Google Cloud Project + Calendar API enabled + service account JSON key | v1 — simpler, no per-user OAuth flow needed |
| OAuth 2.0 (per-user) | OAuth consent screen + per-user token refresh | v2 — when users link their own Google Calendar |

**Recommendation:** Use **Service Account** for v1. Create events on a shared/application calendar. The meet links are valid even without a personal calendar association.

**API call (conceptual):**
```
POST https://www.googleapis.com/calendar/v3/calendars/{calendarId}/events
  ?conferenceDataVersion=1

Body: {
  "summary": "Booking: User A × User B",
  "start": { "dateTime": "2026-06-01T14:00:00Z", "timeZone": "UTC" },
  "end":   { "dateTime": "2026-06-01T14:30:00Z", "timeZone": "UTC" },
  "conferenceData": {
    "createRequest": {
      "requestId": "unique-per-retry-id",
      "conferenceSolutionKey": { "type": "hangoutsMeet" }
    }
  },
  "attendees": [
    { "email": "host@example.com" },
    { "email": "booker@example.com" }
  ]
}
```

### 5. Notification Service (Email)

| Aspect | Detail |
|--------|--------|
| **Responsibility** | Send transactional email notifications for booking lifecycle events |
| **Owns** | Email templates, queue (if async), SMTP/mail service configuration |
| **Exposes** | `sendBookingConfirmation(booking)`, `sendCancellationNotice(booking)` |
| **Communication pattern** | **Async queue** — booking handler enqueues, worker sends |

**Architecture decision — synchronous vs async email:**

| Pattern | Pros | Cons | Verdict |
|---------|------|------|---------|
| **Async job queue** (recommended) | Booking API responds fast; retry on failure | More infrastructure | **YES** — for reliability |
| Synchronous inline send | Simple | Booking API blocked on SMTP; failure = booking lost | No |

**Async queue options (evaluated from research):**

| Queue | Setup Complexity | Persistence | Best for |
|-------|-----------------|-------------|----------|
| **PostgreSQL as queue** (SKIP LOCKED) | Zero additional infra | Yes | **v1** — pragmatic, uses existing DB |
| Redis queue (Bull/BullMQ) | Medium | Optional | v2 — if Redis already deployed |
| Dedicated (RabbitMQ/SQS) | High | Yes | Overkill for v1 |

**Recommendation for v1:** Use a **PostgreSQL-backed job queue** (poll a `notifications` table with `FOR UPDATE SKIP LOCKED`). This requires no new infrastructure and provides exactly-once delivery semantics. Extract to Redis/BullMQ when Redis is added for caching.

**Email service options:**
- **Resend** (simplest API, generous free tier, good deliverability)
- **SendGrid** / **Mailgun** (mature, transactional-focused)
- **SMTP** (if you have an existing mail server)

### 6. Admin Dashboard

| Aspect | Detail |
|--------|--------|
| **Responsibility** | Monitor all users, bookings, system status |
| **Owns** | Read-only queries across all tables |
| **Exposes** | Admin-only API routes, dashboard UI |
| **Communication** | Reads from shared database (no writes to core entities) |

**Key difference from regular views:**
- Regular user sees only their own bookings/availability
- Admin sees ALL users, ALL bookings (no filtering by user)
- Admin dashboard is read-only for v1 (no "impersonate" or "force cancel")

**Database queries for admin:**
- `SELECT users WITH booking counts` — user list
- `SELECT bookings WITH user details, ordered by recency` — all bookings
- `SELECT bookings WHERE status = 'CANCELLED'` — cancellation audit

---

## Data Flow

### Booking Flow (Create)

```
Booker selects slot
       │
       ▼
[1] Availability check: GET /api/slots?host=X&date=Y
       │
       ▼
[2] Booker submits booking: POST /api/bookings
       │
       ├── Auth middleware validates booker session
       │
       ├── Booking Engine (transaction):
       │   ├── SELECT FOR UPDATE on target time range
       │   ├── Verify slot is free
       │   ├── INSERT booking (status=CONFIRMED)
       │   └── COMMIT
       │
       ├── Google Meet Service (synchronous, within a timeout):
       │   ├── POST Google Calendar API with conferenceData
       │   └── Store returned meetUrl on booking record
       │
       ├── Notification Service (async queue):
       │   ├── Enqueue "booking_confirmation" job
       │   └── Worker sends email to both parties
       │
       └── Response: { booking details, meetUrl }
```

### Availability Query Flow

```
GET /api/slots?hostId=X&dateFrom=2026-06-01&dateTo=2026-06-30
       │
       ▼
[1] Load host's availability rules from Schedule table
       │
       ▼
[2] Convert rules to UTC for requested date range
       │
       ▼
[3] Load host's existing bookings (CONFIRMED) for same range
       │
       ▼
[4] Compute free slots: (available intervals) - (booked intervals)
       │
       ▼
[5] Return slots[] — each with UTC start/end
```

### Cancellation Flow

```
POST /api/bookings/:id/cancel
       │
       ▼
[1] Auth: request comes from booking creator OR host (not third party)
       │
       ▼
[2] Validate: current time ≥ 24 hours before booking start
       │   ↓ If not → reject with 422
       │
       ▼
[3] Booking Engine: UPDATE booking SET status=CANCELLED, cancelledAt=NOW()
       │
       ▼
[4] Notification Service (async):
       ├── Enqueue "cancellation" job
       └── Worker sends email to other party
```

---

## Database Schema Design

### Core Tables

```
┌─────────────────┐       ┌──────────────────────┐
│     User        │       │     Schedule          │
├─────────────────┤       ├──────────────────────┤
│ id (PK, UUID)   │──1:1──│ id (PK)              │
│ email (unique)  │       │ user_id (FK)         │
│ password_hash   │       │ name (e.g., "Work")  │
│ display_name    │       │ timezone (IANA)      │
│ timezone (IANA) │       └──────────┬───────────┘
│ role (user/admin)│                 │
│ created_at      │                  │ 1:M
│ updated_at      │                  │
└─────────────────┘                  │
       │                            │
       │ 1:M              ┌─────────┴──────────┐
       │                  │   Availability      │
       │                  ├────────────────────┤
       │                  │ id (PK)            │
       │                  │ schedule_id (FK)   │
       │                  │ day_of_week (0-6)  │
       │                  │ start_time (timetz) │
       │                  │ end_time (timetz)   │
       │                  │ date (date, NULL)   │ ← override date
       │                  └────────────────────┘
       │
       │ 1:M (as host) ──┐
       │                 │
       │ 1:M (as booker)──┤
       │                 ▼
       │       ┌──────────────────────┐
       │       │     Booking          │
       │       ├──────────────────────┤
       │       │ id (PK, UUID)       │
       │       │ host_id (FK→User)   │
       │       │ booker_id (FK→User) │
       │       │ start_time (UTC)    │
       │       │ end_time (UTC)      │
       │       │ status (enum)       │
       │       │ meet_url            │
       │       │ cancelled_at        │
       │       │ cancelled_by (FK)   │
       │       │ version (int)       │ ← optimistic lock
       │       │ created_at          │
       │       └──────────────────────┘
       │                 │
       │                 │ 1:M
       │       ┌─────────┴──────────┐
       │       │  BookingAudit      │
       │       ├────────────────────┤
       │       │ id (PK)           │
       │       │ booking_id (FK)   │
       │       │ action (enum)     │
       │       │ performed_by (FK) │
       │       │ metadata (JSON)   │
       │       │ created_at        │
       │       └────────────────────┘
       │
       │ 1:M
       │       ┌──────────────────────┐
       │       │  EmailNotification   │  ← job queue table
       │       ├──────────────────────┤
       │       │ id (PK)             │
       │       │ to_email            │
       │       │ subject             │
       │       │ body                │
       │       │ status (pending/     │
       │       │         sent/failed) │
       │       │ retry_count         │
       │       │ created_at          │
       │       └──────────────────────┘
```

### Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **UUIDs for User and Booking PKs** | Avoids sequential ID enumeration attacks; safer for public-facing references |
| **Availability stored in user timezone** | Correct DST handling — `start_time` and `end_time` use `timetz` (time with timezone context) because the day-of-week recurrence must align with the user's local clock |
| **Slot computation on-demand** | No pre-expansion of slots. Compute from rules + bookings at query time. Simpler, avoids stale data |
| **Booking version field** | Enables optimistic locking for concurrent booking attempts without table-level locks |
| **EmailNotification as DB table** | Acts as job queue. Worker queries `WHERE status='pending' ORDER BY id FOR UPDATE SKIP LOCKED`. Zero additional infrastructure |
| **BookingAudit** | Immutable log of all state changes. Critical for diagnosing disputes, debugging race conditions |
| **status as enum** | `CONFIRMED` | `CANCELLED` (v1). `COMPLETED` added via background job that marks past bookings |

### Indexes

```sql
-- Critical for performance:
CREATE INDEX idx_booking_time_range ON bookings (host_id, start_time, end_time, status);
-- Used by conflict detection SELECT FOR UPDATE

CREATE INDEX idx_booking_booker ON bookings (booker_id, status);
-- Used by "my bookings" view

CREATE INDEX idx_availability_schedule ON availability (schedule_id);
-- Used by slot computation

CREATE INDEX idx_notification_status ON email_notifications (status, created_at);
-- Used by email worker polling
```

---

## API Design Patterns

### REST over RPC — pragmatic REST

| Principle | Application |
|-----------|-------------|
| **Resource-oriented** | `/api/users`, `/api/bookings`, `/api/schedules` |
| **Nested for context** | `/api/users/:id/availability`, `/api/bookings/:id/cancel` |
| **Version prefix** | `/api/v1/...` — allows future iteration |
| **Consistent error format** | `{ error: { code, message, details? } }` |
| **Status code discipline** | 200 = success, 201 = created, 400 = bad request, 401 = unauthenticated, 403 = forbidden, 404 = not found, 409 = conflict (double-book), 422 = validation failed |

### Key Endpoints

```
# Auth
POST   /api/v1/auth/signup          → Create user
POST   /api/v1/auth/login           → Authenticate
POST   /api/v1/auth/logout          → End session
GET    /api/v1/auth/me              → Current user info

# Users (admin only for listing; self for profile)
GET    /api/v1/users                → List users (admin)
GET    /api/v1/users/:id            → Get user profile
PATCH  /api/v1/users/:id            → Update profile

# Availability
GET    /api/v1/schedules/mine       → Get my schedule
PUT    /api/v1/schedules/mine       → Upsert my schedule + availability rules
GET    /api/v1/users/:id/availability  → Get slots for a date range
        ?from=2026-06-01&to=2026-06-30&timezone=America/New_York

# Bookings
GET    /api/v1/bookings             → List my bookings (as booker or host)
POST   /api/v1/bookings             → Create booking
GET    /api/v1/bookings/:id         → Get booking details
POST   /api/v1/bookings/:id/cancel  → Cancel booking

# Admin
GET    /api/v1/admin/users          → All users with booking counts
GET    /api/v1/admin/bookings       → All bookings (paginated)
GET    /api/v1/admin/stats          → System statistics
```

### Slot Query Response Shape

```json
GET /api/v1/users/:id/availability?from=2026-06-01&to=2026-06-07&timezone=America/New_York

{
  "slots": {
    "2026-06-01": [
      { "start": "2026-06-01T13:00:00Z", "end": "2026-06-01T14:00:00Z" },
      { "start": "2026-06-01T14:00:00Z", "end": "2026-06-01T15:00:00Z" }
    ],
    "2026-06-02": [
      { "start": "2026-06-02T13:00:00Z", "end": "2026-06-02T14:00:00Z" }
    ]
  },
  "timezone": "America/New_York"
}
```

All times returned in UTC. Client converts to display timezone.

---

## Timezone Handling Architecture

**This is the hardest part of the system. Get it wrong and all times drift.**

### Core Principles (verified against Cal.com, The Booking Kit, and industry best practices)

1. **Store in UTC** — All `start_time` / `end_time` columns are UTC timestamps. No exceptions.
2. **Compute in UTC** — All overlap checks, buffer calculations, and slot comparisons happen in UTC.
3. **Display in local time** — Frontend converts UTC to user's timezone for display.
4. **Availability rules are stored in the provider's timezone** — This is the non-obvious but critical pattern. When a user says "I'm available 9-5 EST", that _must_ be stored as the IANA timezone + local times. DST transitions are handled correctly because the system knows the rule is "9 AM local time" not "1 PM UTC".

### Data Flow for Timezone

```
User sets availability: "Monday 9:00-17:00, America/New_York"
         ↓
Stored in Schedule.timezone + Availability.start_time/end_time (as local time)
         ↓
Slot computation (for a date range):
  1. For each date in range, determine DST offset for the user's timezone
  2. Convert local start_time → UTC using that date's offset
  3. This means the same rule produces different UTC times across DST boundaries
         ↓
Booking created: store start/end as UTC timestamps
         ↓
Display: convert UTC → viewer's timezone

Example:
  Rule: Monday 9:00-17:00, America/New_York
  Date = Jan 15 (EST, UTC-5)  → slot = 14:00-22:00 UTC
  Date = Jun 15 (EDT, UTC-4)  → slot = 13:00-21:00 UTC  ← handles DST correctly
```

### Libraries

| Language | Library | Why |
|----------|---------|-----|
| TypeScript | **date-fns-tz** (preferred) or **Luxon** | date-fns is tree-shakeable (smaller bundles); Luxon has nicer API but larger. Both use IANA timezone DB |
| Python | **zoneinfo** (stdlib 3.9+) + **pytz** for older | zoneinfo is the modern standard. Backed by IANA timezone DB |
| Both | **IANA timezone names** | Always use `"America/New_York"`, never `"EST"` (abbreviations don't account for DST) |

### Anti-patterns

- **Storing timestamps as local time without timezone** — unrecoverable when DST changes or users move
- **Storing timestamps with offsets (-05:00) instead of timezone (America/New_York)** — you lose DST awareness
- **Assuming all days are 24 hours** — DST transition days are 23 or 25 hours
- **Using JavaScript `Date` without timezone context** — `Date` is always UTC internally, but `toString()` uses browser timezone leading to subtle bugs

---

## Patterns to Follow

### Pattern 1: Repository Pattern for Data Access

**What:** Abstract database access behind repository interfaces. Business logic never calls Prisma/ORM directly.

**Why:** Makes the booking engine testable without a database. Front-loads schema decisions in one place.

```typescript
// Booking Repository
class BookingRepository {
  async findOverlapping(hostId: string, start: Date, end: Date): Promise<Booking[]> {
    return prisma.booking.findMany({
      where: {
        hostId,
        status: { not: 'CANCELLED' },
        startTime: { lt: end },    // existing start < new end
        endTime: { gt: start },    // existing end > new start
      },
    });
  }

  async createWithConflictCheck(data: CreateBookingDTO): Promise<Booking> {
    // Transaction with SELECT FOR UPDATE
    return prisma.$transaction(async (tx) => {
      const conflicts = await tx.booking.findMany({
        where: { /* overlap query */ },
        // Prisma doesn't expose FOR UPDATE directly — use $queryRaw
      });
      if (conflicts.length > 0) throw new ConflictError('Slot already booked');
      return tx.booking.create({ data });
    });
  }
}
```

### Pattern 2: Service Layer with Unit of Work

**What:** Each operation that touches multiple tables runs inside a single transaction (Unit of Work).

**Why:** Booking creation involves: conflict check → insert → audit log → meet link. If meet link creation fails, the booking should not be persisted in a partial state.

```typescript
class BookingService {
  async createBooking(dto: CreateBookingDTO): Promise<Booking> {
    return prisma.$transaction(async (tx) => {
      // 1. Conflict check
      const conflicts = await this.bookingRepo.findOverlapping(tx, dto);
      if (conflicts.length > 0) throw new ConflictError();

      // 2. Insert booking
      const booking = await this.bookingRepo.create(tx, dto);

      // 3. Audit log
      await this.auditRepo.log(tx, { bookingId: booking.id, action: 'CREATED' });

      return booking;
    });
    // Transaction commits → everything or nothing
    // Meet link creation happens AFTER commit (see next pattern)
  }
}
```

### Pattern 3: Outbox Pattern for Side Effects

**What:** After the main transaction commits, perform side effects (API calls, email sends). Use an outbox table for reliability.

**Why:** If Google Meet API is down, you don't want to roll back the booking. But you also don't want to lose the meet link creation request.

```typescript
// After booking is committed:
await outboxRepo.enqueue({
  type: 'CREATE_MEET_LINK',
  payload: { bookingId: booking.id },
});

// Background worker processes outbox:
// 1. Call Google Calendar API
// 2. Update booking with meet_url
// 3. Mark outbox item as completed
```

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Two-Phase Booking (Check → Book as separate requests)

**What:** Client calls "is this slot free?", gets yes, then calls "book it". Another user books in between.

**Why bad:** Classic TOCTOU (Time-of-Check-Time-of-Use) race condition. The most common double-booking bug.

**Instead:** Single atomic transaction. The booking endpoint does the check AND the insert.

### Anti-Pattern 2: Naive Availability Pre-Computation

**What:** Generate all slots for the next 6 months and store them as rows.

**Why bad:** 1 user × 8 hours/day × 1 slot/hour × 180 days = 1440 rows per user per schedule. Schema changes require rebuilding all rows. DST changes are handled incorrectly.

**Instead:** Compute slots on-demand from rules + exclusions. Cache the result (Redis or in-memory with TTL).

### Anti-Pattern 3: Using `LocalDateTime` for Storage

**What:** Storing times without UTC conversion in the database.

**Why bad:** A booking at "2026-06-01 14:00" is ambiguous without timezone context. If the user is in EST and moves to PST, the time now means something different.

**Instead:** Always `TIMESTAMP WITH TIME ZONE` in PostgreSQL, which stores internally as UTC. Always convert to UTC before inserting.

### Anti-Pattern 4: Synchronous Email on Booking Path

**What:** Sending email in the same request handler as booking creation.

**Why bad:** If the SMTP server is slow (500ms+), the user's HTTP request hangs. If it's down, the booking fails too. The 95th percentile response time balloons.

**Instead:** Enqueue email notification after booking is committed. Return response immediately. Email arrives moments later.

---

## Scalability Considerations

| Concern | v1 (< 1000 bookings/day) | v2 (> 10K bookings/day) | v3 (100K+) |
|---------|--------------------------|------------------------|------------|
| **Architecture** | Modular monolith | Extract Booking Engine to separate service | Full microservices with event bus |
| **Conflict detection** | `SELECT FOR UPDATE` in transaction | Add `version` column + optimistic locking | Slot reservation (SelectedSlots) + Redis distributed lock |
| **Slot computation** | Direct DB query | Add Redis cache (slots TTL: 30s) | Dedicated slot service + pre-computed availability |
| **Email notifications** | DB-backed job queue | Redis-backed queue (BullMQ) | Dedicated notification service + SendGrid/Mailgun webhooks |
| **Session store** | DB-backed sessions | Redis sessions | Distributed session store |
| **API rate limiting** | N/A or simple middleware | Redis sliding window | API Gateway level |

At v1 scale, PostgreSQL handles all of this comfortably. The key design decision is clean module boundaries so extraction is mechanical, not re-architectural.

---

## Build Order (Dependency-Driven)

```
Phase 1: Auth + User Management
  └── Everything depends on it. No users = nothing works.
  └── Includes: signup, login, session, seed admin

Phase 2: Availability Engine (Schedule CRUD + Slot Query)
  └── Needed before anyone can book.
  └── Includes: set weekly availability, get available slots (no conflict logic yet)

Phase 3: Booking Engine (Create + Cancel)
  └── Core value proposition.
  └── Includes: conflict detection, booking creation, cancellation with 24h rule, audit log

Phase 4: Google Meet Integration
  └── Depends on Booking Engine (triggered by booking creation).
  └── Includes: Google Calendar API integration, storing meet URL

Phase 5: Email Notification System
  └── Depends on Booking Engine (triggered by events).
  └── Includes: email queue, templates, booking confirmation + cancellation emails

Phase 6: Admin Dashboard
  └── Depends on all other modules (reads their data).
  └── Includes: user listing, booking listing, basic stats
```

---

## Sources

- Cal.com GitHub Architecture (DeepWiki analysis of 42.4k star monorepo) — HIGH confidence
- The Booking Kit (bookings.dev) documentation on timezone handling — HIGH confidence
- Google Calendar API documentation (create events with Meet) — HIGH confidence
- "Solving Double Booking at Scale" (ITNEXT, Oct 2025) — MEDIUM confidence
- "Timezone Handling — Store and Compute in UTC" (Dozens of industry sources, consistent guidance) — HIGH confidence
- Martin Fowler — microservices vs monolith patterns — HIGH confidence
- PostgreSQL documentation on `FOR UPDATE` and `SKIP LOCKED` — HIGH confidence
- "Never Double-Book Again: A Scalable Reservation Playbook" (Toyez, Oct 2025) — MEDIUM confidence
