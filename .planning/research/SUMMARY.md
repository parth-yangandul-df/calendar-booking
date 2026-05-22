# Research Summary: Calendar Booking System

## Enforced Stack
- **Frontend**: ReactJS (with React Router, Axios)
- **Backend**: ASP.NET Core Web API (C#)
- **Database**: SQL Server
- **Auth**: ASP.NET Core Identity (JWT)
- **Calendar UI**: FullCalendar React component
- **Email**: SMTP / transactional email service
- **Google Meet**: Google Calendar API

## Table Stakes Features
- Email/password authentication with session management
- Monthly calendar view for availability definition
- Slot booking with conflict prevention
- Google Meet link auto-generation
- Email notifications on booking and cancellation
- 24-hour cancellation policy
- Admin monitoring dashboard

## Differentiators
- Clean, fast UX for defining monthly availability
- Reliable atomic booking (no double-booking)
- Transparent cancellation policy enforcement

## Architecture Overview
- **SPA**: ReactJS frontend communicates via REST API
- **API Layer**: ASP.NET Core controllers with JWT auth
- **Data Layer**: SQL Server with proper indexing for time-range queries
- **Job Queue**: SQL Server-backed queue for async email sending
- **Integration**: Google Calendar API for Meet link generation

## Critical Pitfalls
1. **Timezone handling** — Store UTC + IANA timezone ID, never offsets
2. **Double-booking** — DB-level locking (`SELECT FOR UPDATE` / `UPDLOCK`), not app-level
3. **Email deliverability** — Configure SPF/DKIM/DMARC before sending
4. **Cancellation edge cases** — Timezone-aware 24h window with grace buffer
5. **Security** — Verify booking ownership on every mutation (prevent IDOR)

## Suggested Build Order
1. **Auth + Data Model** — Foundation: React app, ASP.NET API, SQL Server schema, JWT auth, seed admin
2. **Availability Engine** — Define and display monthly availability slots
3. **Booking Engine** — Atomic booking, Google Meet links, email notifications
4. **Admin Dashboard** — User and booking monitoring
5. **Enhanced UX** — Calendar overlay, polish, edge cases
