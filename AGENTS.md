<!-- GSD:project-start source:PROJECT.md -->
## Project

**Calendar Booking System**

A web-based calendar booking system where users define their monthly availability and others book time slots. Each booking auto-generates a Google Meet link, and both parties get email notifications. Built for individuals or teams who need structured scheduling with cancellation policies.

**Core Value:** Users can reliably book time with each other through shared calendar availability, with automatic Google Meet links and email confirmations.

### Constraints

- **Email delivery**: Requires SMTP or email service integration
- **Google Meet**: Requires Google Calendar API or Google Meet API access
- **24h cancellation**: Fixed policy enforced at application level
- **Seed admin**: Must be created at system initialization
<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->
## Technology Stack

## Frontend
| Technology | Purpose | Rationale |
|---|---|---|
| ReactJS 18+ | UI framework | Enforced by project decision |
| React Router 6 | Client-side routing | Standard for SPAs |
| Axios | HTTP client | Interceptors for JWT, error handling |
| FullCalendar React | Calendar UI | Mature calendar component with month view, slot rendering |
| shadcn/ui | Component library | Clean, customizable UI primitives |
## Backend
| Technology | Purpose | Rationale |
|---|---|---|
| ASP.NET Core 8+ | Web API framework | Enforced by project decision |
| ASP.NET Core Identity | Authentication | Built-in JWT + Identity for user management |
| Entity Framework Core 8+ | ORM | Standard data access for ASP.NET + SQL Server |
| FluentValidation | Request validation | Clean separation of validation logic |
## Database
| Technology | Purpose | Rationale |
|---|---|---|
| SQL Server | Primary database | Enforced by project decision |
| EF Core Migrations | Schema management | Code-first migrations for SQL Server |
| `UPDLOCK` + `ROWLOCK` | Booking concurrency | SQL Server table hints for atomic booking |
## Libraries & Packages
| Package | Purpose |
|---|---|
| `Google.Apis.Calendar.v3` | Google Calendar API integration for Meet links |
| `MailKit` / `FluentEmail` | Email sending via SMTP |
| `Hangfire` or `Quartz.NET` | Background job queue for async email |
| `Serilog` | Structured logging |
| `Swashbuckle` / NSwag | API documentation (Swagger) |
## What NOT to Use
- **Blazor / Razor Pages** — SPA model requires React; ASP.NET is pure API layer
- **Dapper** — EF Core provides sufficient performance with less code for this scale
- **MongoDB / Cosmos DB** — Booking data is highly relational (users, availability, bookings, audit)
- **SendGrid** — Free tier killed May 2025; use SMTP with dedicated provider
- **Client-side timezone handling** — Server must enforce timezone rules; client only displays
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, `.github/skills/`, or `.codex/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
