# Calendar Booking System

## What This Is

A web-based calendar booking system where users define their monthly availability and others book time slots. Each booking auto-generates a Google Meet link, and both parties get email notifications. Built for individuals or teams who need structured scheduling with cancellation policies.

## Core Value

Users can reliably book time with each other through shared calendar availability, with automatic Google Meet links and email confirmations.

## Requirements

### Validated

- ✓ **AUTH-01**: User can sign up and log in with email/password — Phase 1
- ✓ **AUTH-02**: User session persists across browser refresh — Phase 1
- ✓ **AUTH-03**: User can log out — Phase 1
- ✓ **ADMIN-01**: Seed admin user exists to monitor all users and bookings — Phase 1
- ✓ **CAL-01**: User can define their booking availability on a monthly calendar view — Phase 2
- ✓ **CAL-02**: User can view another user's available slots — Phase 2
- ✓ **CAL-03**: System prevents double-booking with atomic conflict detection — Phase 3
- ✓ **BOOK-01**: User can book an available slot on another user's calendar — Phase 3
- ✓ **BOOK-02**: Booking auto-attaches a Google Meet link (placeholder URL — real Google Calendar API deferred) — Phase 3
- ✓ **CANCEL-01**: Creator or booker can cancel a booking up to 24 hours before the slot — Phase 3
- ✓ **CANCEL-02**: System enforces 24-hour cancellation window — Phase 3
- ✓ **NOTIF-01**: System sends email notification on booking creation — Phase 3
- ✓ **NOTIF-02**: System sends email notification on cancellation — Phase 3

### Active

- ✓ **ADMIN-02**: Admin can view all users and their bookings — Phase 4
- ✓ **ADMIN-03**: Admin can view all bookings across all users — Phase 4

### Out of Scope

- Recurring availability patterns — v2
- Payment integration — not needed
- Third-party calendar sync (Google Calendar, Outlook) — v2
- Mobile apps — web-first, mobile later
- Team/org features — individual users only for v1

### Out of Scope

- Recurring availability patterns — v2
- Payment integration — not needed
- Third-party calendar sync (Google Calendar, Outlook) — v2
- Mobile apps — web-first, mobile later
- Team/org features — individual users only for v1

## Context

- Greenfield project — no existing codebase
- Users need a simple way to share availability without back-and-forth emails
- Google Meet integration removes the friction of setting up meeting links separately
- 24-hour cancellation policy is fixed (not configurable per-user in v1)
- Email notifications keep both parties informed without polling the app

## Constraints

- **Email delivery**: Requires SMTP or email service integration
- **Google Meet**: Requires Google Calendar API or Google Meet API access
- **24h cancellation**: Fixed policy enforced at application level
- **Seed admin**: Must be created at system initialization

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Build from scratch | Greenfield project — no existing codebase | ✅ Phase 1 — project scaffold complete |
| Web application | Accessible from any device without native install | ✅ Phase 1 — React SPA with ASP.NET API |
| ReactJS + ASP.NET + SQL Server stack | Enforced by project decision | ✅ Phase 1 — scaffold with Vite + ASP.NET Core 8 + SQL Server |
| ASP.NET Core Identity for auth | Built-in JWT + Identity for user management | ✅ Phase 1 — register, login, refresh, logout |
| EF Core for data access | Standard ORM for ASP.NET + SQL Server | ✅ Phase 1-3 — migrations for auth, availability, booking tables |
| Google Calendar API for Meet links | Required for auto-generating Google Meet links | 🔄 Phase 3 — placeholder URL used; real API deferred to post-v1 |
| Hangfire for background jobs | Async email dispatch without blocking API | ✅ Phase 3 — SQL Server job store, 4 booking lifecycle email jobs |
| MailKit for SMTP | Configurable email delivery | ✅ Phase 3 — env-var configured SMTP, graceful no-op when unconfigured |
| Pessimistic locking (UPDLOCK+ROWLOCK) | Double-booking prevention | ✅ Phase 3 — first writer wins, 409 Conflict on collision |
| Booking approval gate | Pending→Confirmed/Declined workflow | ✅ Phase 3 — owner must approve before booking is confirmed |

---

| Admin-only JWT policy | Reuse `IsAdmin` claim from Phase 1 token for backend enforcement | ✅ Phase 4 — `AdminOnly` policy via `RequireClaim("IsAdmin", "true")` |
| Offset pagination for admin lists | Standardized `PagedResponse<T>` across admin endpoints | ✅ Phase 4 — users and bookings paginated with page/pageSize/totalCount |
| AdminGuard (client-side) | Two-layer auth: ProtectedRoute (login) + AdminGuard (admin role) | ✅ Phase 4 — non-admin redirect with toast, Hangfire dashboard also secured |

---

*Last updated: 2026-05-26 after Phase 4*
