# Calendar Booking System — Documentation

A web-based scheduling platform where users define monthly availability, book time slots with auto-generated Google Meet links, and receive email notifications.

---

## Quick Links

| Section | Description |
|---------|-------------|
| [Project Overview](01-project/overview.md) | Core value, constraints, what this is |
| [Requirements](01-project/requirements.md) | All v1/v2 requirements, user stories, acceptance criteria |
| [Key Decisions](01-project/decisions.md) | Architecture & design decisions with rationale |
| [Technology Stack](02-technology/stack.md) | Frontend, backend, database, libraries |
| [Architecture](02-technology/architecture.md) | System design, data flow, DB schema, patterns |
| [Feature Landscape](03-research/feature-landscape.md) | Market analysis, table stakes, differentiators |
| [Domain Pitfalls](03-research/pitfalls.md) | Critical gotchas with mitigations |
| [Roadmap](04-roadmap/roadmap.md) | Phase breakdown, success criteria, progress |
| [Progress & State](04-roadmap/progress.md) | Current status, metrics, accumulated context |

### Phase Docs

| Phase | Status | What It Delivers |
|-------|--------|-----------------|
| [01 — Auth](05-phases/01-authentication.md) | ✅ Complete | Project scaffold, login/register JWT auth, admin seed |
| [02 — Availability](05-phases/02-availability.md) | ✅ Complete | Monthly calendar view, weekly templates, per-date overrides |
| [03 — Booking Engine](05-phases/03-booking-engine.md) | ✅ Complete | Slot booking, Google Meet links, email, cancellations |
| [04 — Admin Dashboard](05-phases/04-admin-dashboard.md) | ✅ Complete | Admin monitoring, paginated users/bookings, stats |

### Verification

| Document | Description |
|----------|-------------|
| [Verification Report](06-verification/verification-report.md) | Cross-phase verification summary |
| [Code Review](06-verification/code-review.md) | Key findings from code reviews |

---

## Stack at a Glance

**Frontend:** React 19 + Vite + shadcn/ui + Tailwind CSS v4 + React Router 6 + Axios

**Backend:** ASP.NET Core 8 Web API (Clean Architecture: Domain → Application → Infrastructure → Api)

**Database:** SQL Server (Docker) + EF Core 8

**Auth:** ASP.NET Core Identity + custom JWT (httpOnly cookies)

**Background Jobs:** Hangfire (SQL Server job store)

**Email:** MailKit SMTP

**Integrations:** Google Calendar API (placeholder Meet URL in v1)

---

*Last updated: 2026-05-28*
