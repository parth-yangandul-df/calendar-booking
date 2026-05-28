# Architecture

## High-Level Overview

```
Browser (React SPA)
    │
    ▼ HTTP/REST (httpOnly cookies)
ASP.NET Core 8 Web API
    ├── Auth Module (signup, login, JWT, roles)
    ├── Availability Engine (templates, overrides, slots)
    ├── Booking Engine (create, cancel, conflict check)
    ├── Notification Service (email via Hangfire)
    ├── Google Meet Wrapper (placeholder in v1)
    └── Admin Dashboard (read-only monitoring)
    │
    ▼
SQL Server (Docker)
```

**Pattern:** Modular monolith with clean internal boundaries. Not microservices.

---

## Component Boundaries

### Auth Module

| Aspect | Detail |
|--------|--------|
| Responsibility | Registration, login, session, roles |
| Owns | User table, session store, password hashing |
| Endpoints | `POST /api/v1/auth/signup`, `/login`, `/logout`, `GET /me` |
| Pattern | JWT + httpOnly cookie, bcrypt passwords |

### Availability Engine

| Aspect | Detail |
|--------|--------|
| Responsibility | Store and compute when a user is available |
| Owns | WeeklyTemplate + AvailabilityOverride tables |
| Key approach | Compute slots on-demand from rules + overrides − bookings |
| Endpoints | `GET/PUT /api/v1/availability/template`, `/overrides`, `/calendar` |

### Booking Engine

| Aspect | Detail |
|--------|--------|
| Responsibility | Reserve slots, detect conflicts, manage lifecycle |
| Owns | Booking table, state machine |
| States | Pending → Confirmed/Declined → Cancelled |
| Endpoints | `GET/POST /api/v1/bookings`, `POST /:id/cancel` |
| Concurrency | SQL Server `UPDLOCK` + `ROWLOCK` — first writer wins, 409 on conflict |

### Notification Service

| Aspect | Detail |
|--------|--------|
| Responsibility | Send transactional emails for booking lifecycle |
| Pattern | Async via Hangfire background jobs |
| Triggers | Booking created (Pending), confirmed, declined, cancelled |
| Tool | MailKit via SMTP (env-var configured) |

### Admin Dashboard

| Aspect | Detail |
|--------|--------|
| Responsibility | Monitor all users, bookings, system status |
| Owns | Read-only queries across all tables |
| Endpoints | `GET /api/v1/admin/stats`, `/users`, `/bookings` |
| Auth | `[Authorize(Policy = "AdminOnly")]` |

---

## Data Flows

### Booking Flow

```
Booker selects slot → GET /api/slots?host=X&date=Y
    → POST /api/bookings
        → Auth middleware validates session
        → Booking Engine (transaction):
            → SELECT FOR UPDATE on target time range
            → Verify slot is free
            → INSERT booking (status=Pending)
            → COMMIT
        → Hangfire enqueues email job
        → Response: { booking details, meetUrl }
```

### Availability Query Flow

```
GET /api/availability/calendar?userId=X&month=YYYY-MM
    → Load weekly template from DB
    → Load per-date overrides from DB
    → Merge: overrides replace template for specific dates
    → Return per-day array of time ranges
```

### Cancellation Flow

```
POST /api/bookings/:id/cancel
    → Auth: must be creator OR host
    → Validate: current time ≥ 24h before start
        → If inside window → 400 error
    → UPDATE booking SET status=Cancelled
    → Hangfire enqueues cancellation email
```

---

## Database Schema

### Core Tables

| Table | Key Columns | Notes |
|-------|-------------|-------|
| **AspNetUsers** | Id, Email, PasswordHash, IsAdmin, CreatedAt | Extended IdentityUser |
| **RefreshTokens** | Id, Token, UserId, JwtId, IsRevoked, ExpiresAt | Rotation-based |
| **WeeklyTemplates** | Id, UserId, DayOfWeek, StartTime, EndTime | Recurring weekly schedule |
| **AvailabilityOverrides** | Id, UserId, Date, StartTime, EndTime | Per-date exceptions |
| **Bookings** | Id, OwnerId, BookerId, StartTime, EndTime, Status, MeetUrl | Status: Pending/Confirmed/Declined/Cancelled |
| **BookingAudit** | Id, BookingId, Action, PerformedBy, Metadata | Immutable log |

### Key Indexes

```sql
-- Conflict detection
CREATE INDEX idx_booking_time_range ON bookings (host_id, start_time, end_time, status);
-- My bookings view
CREATE INDEX idx_booking_booker ON bookings (booker_id, status);
-- Slot computation
CREATE INDEX idx_availability_schedule ON availability (schedule_id);
```

---

## Architecture Patterns

| Pattern | Where Used | Why |
|---------|-----------|-----|
| Repository | Data access layer | Testable, abstracts EF Core |
| Unit of Work | Booking transactions | Operations spanning multiple tables use one transaction |
| Outbox | Side effects (Meet link, email) | Main txn commits first; side effects are async |
| Clean Architecture | Entire backend | Domain → Application → Infrastructure → Api |
| CQRS-lite | Query vs command separation | Different DTOs for reads vs writes |
