# Key Decisions

| # | Decision | Rationale | Outcome |
|---|----------|-----------|---------|
| 1 | 4-phase coarse roadmap | 16 requirements cluster naturally into Auth → Availability → Booking → Admin | ✅ Done |
| 2 | Booking Engine combines booking, Meet, notifications, and cancellation | These form a single "booking lifecycle" — end-to-end value in one phase | ✅ Done |
| 3 | Admin Dashboard depends on Phase 3 | Admin needs booking data from Phase 3 | ✅ Done |
| 4 | Seed admin in Phase 1 | Admin user must exist from startup | ✅ Done |
| 5 | MVP mode for all phases | Each phase delivers end-to-end user capability, not horizontal layers | ✅ Done |
| 6 | Build from scratch | Greenfield project — no existing codebase | ✅ Done |
| 7 | Web application | Accessible from any device without native install | ✅ Done |
| 8 | React + ASP.NET + SQL Server | Enforced by project decision | ✅ Done |
| 9 | ASP.NET Core Identity for auth | Built-in JWT + Identity for user management | ✅ Done |
| 10 | EF Core for data access | Standard ORM for ASP.NET + SQL Server | ✅ Done |
| 11 | Google Calendar API for Meet links | Required for auto-generating Meet links | 🔄 Placeholder URL in v1 |
| 12 | Hangfire for background jobs | Async email dispatch without blocking API | ✅ Done |
| 13 | MailKit for SMTP | Configurable email delivery | ✅ Done |
| 14 | Pessimistic locking (UPDLOCK + ROWLOCK) | Double-booking prevention — first writer wins | ✅ Done |
| 15 | Booking approval gate | Pending → Confirmed/Declined workflow | ✅ Done |
| 16 | GET /calendar with optional userId param | Avoids duplicate route issue in ASP.NET | ✅ Done |
| 17 | Full-replace semantics for template/override writes | Prevents delta-sync race conditions | ✅ Done |
| 18 | UserDto exposes only Id + Email | No PII beyond email in user search | ✅ Done |
| 19 | Admin-only JWT policy | `AdminOnly` policy via `RequireClaim("IsAdmin", "true")` | ✅ Done |
| 20 | Offset pagination for admin lists | `PagedResponse<T>` across admin endpoints | ✅ Done |
| 21 | AdminGuard (client-side) | Two-layer auth: ProtectedRoute + AdminGuard | ✅ Done |
| 22 | Modular monolith (not microservices) | v1 doesn't need distributed systems complexity | ✅ Done |

## Design Detail: Auth

| Decision | Value |
|----------|-------|
| Access token storage | httpOnly cookie (prevents XSS theft) |
| Access token lifetime | 15 minutes |
| Refresh token lifetime | 7 days, rotated on each use |
| JWT claims | id, email, isAdmin (no IdentityRole table) |
| Admin seed | Runtime `AdminSeeder` class (not EF `HasData`) |

## Design Detail: Booking

| Decision | Value |
|----------|-------|
| Conflict detection | SQL Server `UPDLOCK` + `ROWLOCK` hints |
| Booking states | Pending → Confirmed/Declined → Cancelled |
| Meet URL in v1 | Placeholder `https://meet.google.com/placeholder-{id}` |
| Email dispatch | Hangfire background job (async) |
| Cancellation window | 24 hours before slot (server-enforced) |
