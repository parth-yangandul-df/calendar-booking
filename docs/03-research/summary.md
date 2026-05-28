# Research Summary

## Enforced Stack

- **Frontend:** ReactJS (with React Router, Axios, shadcn/ui)
- **Backend:** ASP.NET Core 8 Web API (C#)
- **Database:** SQL Server
- **Auth:** ASP.NET Core Identity (JWT)
- **Calendar UI:** Custom month grid (not FullCalendar)
- **Email:** SMTP via MailKit + Hangfire background jobs
- **Meet:** Google Calendar API (placeholder in v1)

## Table Stakes Features

- Email/password authentication with session management
- Monthly calendar view for availability
- Slot booking without double-booking
- Google Meet link auto-generation
- Email notifications on booking and cancellation
- 24-hour cancellation policy
- Admin monitoring dashboard

## Architecture Overview

- **SPA:** React frontend communicates via REST API
- **API Layer:** ASP.NET Core controllers with JWT auth (httpOnly cookies)
- **Data Layer:** SQL Server with proper time-range indexes
- **Job Queue:** Hangfire with SQL Server store for async email
- **Integration:** Google Calendar API for Meet links (placeholder)

## Critical Pitfalls Summary

| Pitfall | Severity | Prevention |
|---------|----------|------------|
| Timezone handling | CRITICAL | Store UTC + IANA timezone, never offsets |
| Double-booking | CRITICAL | DB-level locking (UPDLOCK), not app-level |
| Email deliverability | HIGH | SPF/DKIM/DMARC before sending |
| Cancellation edge cases | MODERATE | Timezone-aware window with grace buffer |
| IDOR security | HIGH | Verify booking ownership on every mutation |

## Build Order

1. **Auth + Data Model** — Foundation: React app, ASP.NET API, SQL Server, JWT auth, seed admin
2. **Availability Engine** — Define and display monthly availability
3. **Booking Engine** — Atomic booking, Meet links, email notifications, cancellations
4. **Admin Dashboard** — User and booking monitoring
