# Stack: Calendar Booking System

> **Status**: Enforced by decision
> **Confidence**: HIGH (well-established stack)

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
