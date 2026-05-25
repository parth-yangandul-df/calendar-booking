# Phase 1: Foundation & Authentication - Context

**Gathered:** 2026-05-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Project scaffolding (React + ASP.NET + SQL Server), user authentication (signup, login, logout, session persistence via JWT), and seed admin user creation. Delivers the foundation every subsequent phase builds on.

**Requirements:** AUTH-01, AUTH-02, AUTH-03, ADMIN-01
**Acceptance Criteria:**
- User submits email + password → account created, JWT returned
- User stays logged in across browser refreshes
- User can log out from any page
- Admin user exists with seeded credentials on first startup

</domain>

<decisions>
## Implementation Decisions

### Auth UI Layout
- **D-01:** Separate Login and Register pages (not modals/toggles)
- **D-02:** Use shadcn/ui form components with React Hook Form + Zod validation
- **D-03:** Redirect to dashboard after successful login/register; redirect to login for unauthenticated access

### JWT Token Strategy
- **D-04:** Access token stored as httpOnly cookie (not localStorage) — prevents XSS token theft
- **D-05:** Refresh token rotation — short-lived access tokens (15min) with longer-lived refresh tokens (7 days)
- **D-06:** Refresh endpoint (`POST /api/auth/refresh`) that rotates the refresh token and issues a new access token

### Admin Seed Approach
- **D-07:** Seed admin via runtime `AdminSeeder` class in `Program.cs` (not EF Core `HasData()`) — `HasData` stores password hashes at migration creation time. Runtime seeder uses `UserManager.CreateAsync()` and reads credentials from `appsettings.Development.json`, supporting environment variable overrides per D-09
- **D-08:** Admin role assigned via seed data (not runtime creation)
- **D-09:** Admin credentials: documented default for dev, overrideable via environment variables for production

### Project Structure
- **D-10:** Frontend: Vite + React 18 + React Router 6 + shadcn/ui + Tailwind CSS
- **D-11:** Backend: ASP.NET Core 8 Web API with Clean Architecture layers (Api, Application, Infrastructure, Domain)
- **D-12:** API versioning via URL prefix (`/api/v1/...`)
- **D-13:** Local SQL Server (MSSQLSERVER default instance, SQL Server 2017) for dev with SQL Server Authentication, connection string with `TrustServerCertificate=True`

### Error Handling
- **D-14:** API returns consistent problem-detail JSON (`ProblemDetails` RFC 7807)
- **D-15:** Frontend shows toast notifications (shadcn Sonner) for API errors; inline field-level validation for form errors
- **D-16:** 401 responses → redirect to login; 403 → show "access denied"

### Password Policy
- **D-17:** ASP.NET Core Identity defaults: minimum 8 characters, require digit + letter
- **D-18:** No email verification in v1 (deferred); password reset deferred to v2

### Role Management
- **D-19:** Simple enum on ApplicationUser (`Admin`, `User`) — no separate IdentityRole table for v1
- **D-20:** Admin middleware/attribute checks `IsAdmin` claim on the JWT

### the agent's Discretion
- Exact admin seed credentials (documented in dev config)
- React component file structure within pages/
- ASP.NET controller naming conventions
- Logging setup (Serilog preference noted in stack research)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & Roadmap
- `.planning/REQUIREMENTS.md` — Full v1 requirements with acceptance criteria
- `.planning/ROADMAP.md` § Phase 1 — Phase 1 goal, success criteria, requirement mapping
- `.planning/research/SUMMARY.md` — Research summary with stack decisions
- `.planning/research/STACK.md` — Stack details with version recommendations

### Project Context
- `.planning/PROJECT.md` — Project overview, core value, constraints, key decisions
- `.planning/STATE.md` — Current project state and accumulated decisions

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- No existing code — greenfield project

### Established Patterns
- React + Vite + shadcn/ui for frontend (standard setup)
- ASP.NET Core 8 Clean Architecture for backend (Api → Application → Infrastructure → Domain)
- EF Core for SQL Server data access

### Integration Points
- Phase 1 provides the auth infrastructure (user table, JWT, roles) that Phases 2-4 depend on
- Admin user (ADMIN-01) is seeded here; admin dashboard routes (Phase 4) check the same role claim

</code_context>

<specifics>
## Specific Ideas

- Stack enforced: ReactJS 18+ frontend, ASP.NET Core 8+ API, SQL Server database
- UI should be clean and minimal — standard shadcn/ui look
- Session persistence via httpOnly cookies (secure by default)

</specifics>

<deferred>
## Deferred Ideas

- **Password reset flow** — belongs in a future phase (not in any current phase scope)
- **Email verification** — v2 feature, not needed for basic auth
- **OAuth/Social login** — v2 differentiator, deferred

None — discussion stayed within phase scope

</deferred>

---

*Phase: 1-Foundation & Authentication*
*Context gathered: 2026-05-22*
