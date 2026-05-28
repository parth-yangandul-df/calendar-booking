# Technology Stack

## Frontend

| Technology | Purpose | Rationale |
|------------|---------|-----------|
| React 19+ | UI framework | Enforced by project decision |
| React Router 6 / 7 | Client-side routing | Standard for SPAs |
| Axios | HTTP client | Interceptors for JWT, error handling |
| FullCalendar React | Calendar UI | Month view, slot rendering |
| shadcn/ui (v4, Nova preset) | Component library | Clean, customizable UI primitives |
| Tailwind CSS v4 | CSS framework | Required by shadcn/ui |
| TanStack React Query | Server state management | Caching, invalidation, loading states |
| React Hook Form + Zod | Forms + validation | shadcn form integration |
| date-fns | Date utilities | Month grid, date math |
| Sonner | Toast notifications | Error/success feedback |

## Backend

| Technology | Purpose | Rationale |
|------------|---------|-----------|
| ASP.NET Core 8 | Web API framework | Enforced by project decision |
| ASP.NET Core Identity | Authentication | Built-in JWT + Identity |
| Entity Framework Core 8 | ORM | Standard data access for ASP.NET + SQL Server |
| FluentValidation | Request validation | Clean separation of validation logic |
| Serilog | Structured logging | Console + file sinks |
| Swashbuckle | API documentation | Swagger/OpenAPI (dev only) |

## Database

| Technology | Purpose | Rationale |
|------------|---------|-----------|
| SQL Server 2022 | Primary database | Enforced by project decision |
| EF Core Migrations | Schema management | Code-first migrations |
| `UPDLOCK` + `ROWLOCK` | Booking concurrency | Atomic booking conflict detection |

## Libraries & Packages

| Package | Purpose |
|---------|---------|
| `Google.Apis.Calendar.v3` | Google Calendar API for Meet links (deferred) |
| `MailKit` | Email sending via SMTP |
| `Hangfire` | Background job queue for async email |
| `Swashbuckle` / NSwag | API documentation (Swagger) |

## What NOT to Use

| Technology | Why |
|------------|-----|
| Blazor / Razor Pages | SPA model requires React; ASP.NET is pure API |
| Dapper | EF Core sufficient for this scale |
| MongoDB / Cosmos DB | Data is highly relational |
| SendGrid | Free tier killed May 2025 |
| Client-side timezone handling | Server must enforce timezone rules |
