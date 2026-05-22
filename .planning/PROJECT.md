# Calendar Booking System

## What This Is

A web-based calendar booking system where users define their monthly availability and others book time slots. Each booking auto-generates a Google Meet link, and both parties get email notifications. Built for individuals or teams who need structured scheduling with cancellation policies.

## Core Value

Users can reliably book time with each other through shared calendar availability, with automatic Google Meet links and email confirmations.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] **AUTH-01**: User can sign up and log in with email/password
- [ ] **AUTH-02**: User session persists across browser refresh
- [ ] **CAL-01**: User can define their booking availability on a monthly calendar view
- [ ] **CAL-02**: User can view another user's available slots
- [ ] **BOOK-01**: User can book an available slot on another user's calendar
- [ ] **BOOK-02**: Booking auto-attaches a Google Meet link
- [ ] **CANCEL-01**: Creator or booker can cancel a booking up to 24 hours before the slot
- [ ] **NOTIF-01**: System sends email notification on booking creation
- [ ] **NOTIF-02**: System sends email notification on cancellation
- [ ] **ADMIN-01**: Seed admin user exists to monitor all users and bookings
- [ ] **ADMIN-02**: Admin can view all users and their bookings

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
| Build from scratch | Greenfield project — no existing codebase | — Pending |
| Web application | Accessible from any device without native install | — Pending |
| ReactJS + ASP.NET + SQL Server stack | Enforced by project decision | — Pending |
| ASP.NET Core Identity for auth | Built-in JWT + Identity for user management | — Pending |
| EF Core for data access | Standard ORM for ASP.NET + SQL Server | — Pending |
| Google Calendar API for Meet links | Required for auto-generating Google Meet links | — Pending |

---

*Last updated: 2026-05-22 after initialization*
