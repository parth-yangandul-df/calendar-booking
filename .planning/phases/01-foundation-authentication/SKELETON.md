# Walking Skeleton — Calendar Booking System

**Phase:** 1
**Generated:** 2026-05-22

## Capability Proven End-to-End

A signed-in user can register, log in, stay logged in across page refreshes, and log out — all through a React UI that talks to an ASP.NET Core API backed by SQL Server.

## Architectural Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Frontend framework | Vite + React 19 + TypeScript | Enforced by project (ReactJS 18+); React 19 is current |
| UI component library | shadcn/ui v4 (New York, Zinc) | D-10; clean, customizable primitives with CSS variables |
| Form + validation | React Hook Form + Zod | D-02; standard shadcn integration; Zod has better TS type inference |
| Server state | TanStack React Query v5 | Standard for React API state management; used in Phases 2+ |
| HTTP client | Axios | Interceptors for 401 handling; `withCredentials` for cookie auth |
| Backend framework | ASP.NET Core 8 Web API | Enforced by project |
| Architecture pattern | Clean Architecture (Api, Application, Infrastructure, Domain) | D-11; separates concerns for testability; each layer has explicit dependencies |
| Auth mechanism | Custom JWT with httpOnly cookies | D-04, D-05; prevents XSS token theft; browser auto-sends cookies |
| Auth user store | ASP.NET Core Identity (UserManager) | Battle-tested PBKDF2 password hashing; lockout, security stamps |
| JWT validation | JwtBearer middleware reading httpOnly cookie | D-04; validates on every request; reads from `Request.Cookies["AccessToken"]` via `OnMessageReceived` |
| Refresh tokens | Opaque 64-byte tokens with rotation + DB persistence | D-05, D-06; each use invalidates previous token — prevents replay |
| Role model | `IsAdmin` boolean on `ApplicationUser` (no IdentityRole table) | D-19; simpler for v1; `IsAdmin` claim in JWT is sufficient |
| Database | SQL Server via Docker for development | Enforced by project; Docker image `mcr.microsoft.com/mssql/server:2022-latest` |
| ORM | Entity Framework Core 8 | Enforced by project; code-first migrations |
| Migrations | EF Core `Database.Migrate()` on startup | Auto-applies pending migrations at app start |
| API versioning | URL prefix `/api/v1/...` | D-12; simple, no additional library needed |
| Server-side validation | FluentValidation 11 | Clean separation from controllers; auto-registered via `AddValidatorsFromAssemblyContaining` |
| Client-side validation | Zod schemas in `.refine()` pattern | Matches server validation rules (password policy, email format) |
| Structured logging | Serilog.AspNetCore | Standard; writes to console in development; destructing prevents token leaks |
| Error response format | ProblemDetails (RFC 7807) | D-14; consistent JSON error responses across all endpoints |
| Error display | Sonner toast (API errors) + inline form errors (validation) | D-15; shadcn-native; `richColors` for severity |
| Password policy | Identity defaults: 8+ chars, require digit + lowercase + uppercase | D-17; enforced both client-side (Zod) and server-side (FluentValidation) |
| Admin seed | Runtime seeder via `UserManager.CreateAsync()` | Avoids `HasData()` password hash problem (Research Pitfall 3); credentials from `appsettings.json` |
| CORS (development) | `AllowCredentials()` with `localhost:5173` | Required for httpOnly cookies in cross-origin dev (Research Pitfall 1) |
| Vite dev proxy | `/api` → `http://localhost:5000` | Makes all API requests same-origin; eliminates cross-origin cookie issues |

## Stack Touched in Phase 1

- [x] Project scaffold (Vite + React, ASP.NET Clean Architecture, shadcn/ui, Tailwind v4)
- [x] Routing (React Router 6 for SPA; `/api/v1/*` for API)
- [x] Database (SQL Server Docker + EF Core migration + one real write on user registration)
- [x] UI (Register form + Login form wired to API via Axios)
- [x] Deployment (documented local full-stack run command: `docker compose up -d` + `dotnet run` + `npm run dev`)

## Out of Scope (Deferred to Later Slices)

- Password reset (v2 feature — not in any current phase)
- Email verification (v2 feature — not in any current phase)
- OAuth/Social login (v2 feature — deferred per user decision)
- User profile management (no requirement for v1 beyond auth)
- Multi-tenancy / organization features (out of scope per REQUIREMENTS.md)
- Rate limiting (planned for Phase 4+ infrastructure hardening)
- IdentityRole table / complex role hierarchy (not needed with simple IsAdmin boolean per D-19)
- Horizontal layer separation for auth (auth endpoints are in Api/Controllers, not extracted to a separate auth service — acceptable for v1 skeleton)
- shadcn password show/hide toggle (deferred to UX polish — password `type="password"` is sufficient for skeleton)

## Subsequent Slice Plan

Each later phase adds one vertical slice on top of this skeleton without altering its architectural decisions:

- Phase 2: **Availability Management** — Monthly calendar with slot definition, viewing other users' availability
- Phase 3: **Booking Engine** — Slot booking with Google Meet links, email notifications, 24h cancellation policy
- Phase 4: **Admin Dashboard** — User and booking monitoring for seeded admin role
