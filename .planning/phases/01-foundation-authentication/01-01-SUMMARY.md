---
phase: 01-foundation-authentication
plan: 01
subsystem: infra
tags: [docker, dotnet, react, vite, shadcn, tailwind, ef-core, identity, jwt, sql-server]
requires: []
provides:
  - Docker Compose SQL Server dev database
  - ASP.NET Core 8 Clean Architecture solution (4 layers)
  - Domain entities (ApplicationUser, RefreshToken)
  - EF Core DbContext with Identity + RefreshToken configuration
  - JWT + CORS + Serilog middleware skeleton
  - Vite + React 19 + shadcn/ui frontend scaffold
affects: [02-auth, 03-booking-engine, 04-admin-dashboard]
tech-stack:
  added:
    - Docker Desktop / SQL Server 2022 container
    - ASP.NET Core 8 (Domain, Application, Infrastructure, Api)
    - EF Core 8 + Identity + SqlServer
    - JwtBearer auth middleware
    - Serilog logging
    - FluentValidation
    - Swashbuckle (Swagger)
    - React 19 + Vite 8
    - shadcn/ui 4 (Nova preset) + Radix UI
    - Tailwind CSS v4
    - TanStack Query, React Router 7, React Hook Form + Zod
  patterns:
    - Clean Architecture 4-layer (Domain → Application → Infrastructure → Api)
    - JWT httpOnly cookie auth skeleton
    - CORS with credentials for localhost:5173
    - Vite dev proxy for /api → localhost:5000
    - shadcn/ui component import alias @/components/ui/
key-files:
  created:
    - docker-compose.yml
    - src/backend/CalendarBooking.sln
    - src/backend/Domain/Entities/ApplicationUser.cs
    - src/backend/Domain/Entities/RefreshToken.cs
    - src/backend/Domain/Enums/UserRole.cs
    - src/backend/Infrastructure/Data/ApplicationDbContext.cs
    - src/backend/Infrastructure/Data/Configurations/RefreshTokenConfiguration.cs
    - src/backend/Api/Program.cs
    - src/backend/Api/appsettings.json
    - src/backend/Api/appsettings.Development.json
    - src/backend/Api/Properties/launchSettings.json
    - src/backend/.gitignore
    - client/package.json
    - client/vite.config.ts
    - client/src/App.tsx
    - client/src/index.css
    - client/src/lib/utils.ts
    - client/src/components/ui/button.tsx
    - client/src/components/ui/card.tsx
    - client/src/components/ui/input.tsx
    - client/src/components/ui/label.tsx
    - client/src/components/ui/sonner.tsx
    - client/components.json
  modified: []
key-decisions:
  - ".NET SDK 10 requires --format sln to create .sln files (default is .slnx)"
  - "shadcn v4 uses presets (Nova) instead of --style new-york; init needs --template vite --base radix"
  - "TypeScript 6.0 deprecates baseUrl in tsconfig; added ignoreDeprecations: '6.0' to keep path aliases"
  - "shadcn v4 component files created under literal @/ directory; moved to src/components/ui/"
patterns-established:
  - "Clean Architecture layering: Domain (pure) → Application (FluentValidation) → Infrastructure (EF/Identity) → Api (web entry)"
  - "JWT auth via httpOnly cookie with cookie reader in JwtBearerEvents.OnMessageReceived"
  - "CORS dev policy allows localhost:5173 with AllowCredentials for cookie auth"
  - "shadcn/ui components in src/components/ui/ with @/lib/utils cn() helper"
  - "Vite proxies /api/* to ASP.NET backend at localhost:5000 (same-origin fix for cookies)"
requirements-completed: [AUTH-01, AUTH-02, AUTH-03, ADMIN-01]
duration: 28min
completed: 2026-05-22
---

# Phase 1 Plan 1: Walking Skeleton — Docker + ASP.NET Backend + Vite React Frontend

**Docker Compose SQL Server 2022 dev database, ASP.NET Core 8 Clean Architecture solution with JWT/Identity/CORS middleware skeleton, Vite + React 19 + shadcn/ui (Nova) frontend with proxy setup — both builds succeed with zero errors**

## Performance

- **Duration:** 28 min
- **Started:** 2026-05-22T15:12:00Z
- **Completed:** 2026-05-22T15:40:11Z
- **Tasks:** 3
- **Files modified:** 30

## Accomplishments

- Docker Compose SQL Server 2022 container (calendar-bookings-db) on port 1433
- ASP.NET Core 8 Clean Architecture solution with 4 projects (Domain, Application, Infrastructure, Api) and project references
- Domain entities: ApplicationUser (extends IdentityUser), RefreshToken, UserRole enum
- EF Core ApplicationDbContext with Identity + RefreshToken entity configuration
- JWT Bearer auth middleware configured with httpOnly cookie reader
- CORS policy for localhost:5173 with AllowCredentials
- Serilog logging bootstrap
- Vite + React 19 + TypeScript frontend scaffolded
- shadcn/ui (Nova preset) with Button, Card, Input, Label, Sonner components
- React Router, TanStack Query, React Hook Form + Zod installed
- Vite proxy forwarding /api/* to backend at localhost:5000
- Path alias @/ resolved to ./src/
- Both `dotnet build` and `npm run build` succeed with zero errors

## Task Commits

No intermediate commits — executed per-plan directive to commit only at plan completion.

**Plan metadata:** No commit — final metadata commit deferred to orchestrator.

## Files Created/Modified

### Backend Infrastructure
- `docker-compose.yml` — SQL Server 2022 container definition (port 1433, volume, SA password)
- `src/backend/CalendarBooking.sln` — .NET solution file
- `src/backend/.gitignore` — ASP.NET gitignore pattern
- `src/backend/Domain/Domain.csproj` — Class library with Identity.EntityFrameworkCore
- `src/backend/Domain/Entities/ApplicationUser.cs` — IdentityUser extension with IsAdmin + CreatedAt
- `src/backend/Domain/Entities/RefreshToken.cs` — Refresh token entity with navigation to user
- `src/backend/Domain/Enums/UserRole.cs` — User/Admin enum
- `src/backend/Application/Application.csproj` — Class library with FluentValidation + Domain reference
- `src/backend/Infrastructure/Infrastructure.csproj` — Class library with EF/Identity/SqlServer + Domain/Application references
- `src/backend/Infrastructure/Data/ApplicationDbContext.cs` — IdentityDbContext<ApplicationUser> with RefreshTokens DbSet
- `src/backend/Infrastructure/Data/Configurations/RefreshTokenConfiguration.cs` — EF config with unique index + cascade delete
- `src/backend/Api/Api.csproj` — Web API with JwtBearer, Swashbuckle, Serilog + Application/Infrastructure references
- `src/backend/Api/Program.cs` — Full middleware pipeline: Serilog, Identity, JwtBearer(cookie), CORS, Swagger, Controllers
- `src/backend/Api/appsettings.json` — JWT key, ConnectionStrings, AdminSeed config
- `src/backend/Api/appsettings.Development.json` — Dev logging verbosity
- `src/backend/Api/Properties/launchSettings.json` — Dev profile on http://localhost:5000

### Frontend Application
- `client/package.json` — All dependencies including React 19, React Router 7, TanStack Query, shadcn/ui, Tailwind v4
- `client/vite.config.ts` — React + Tailwind plugins, path alias @/, proxy /api → localhost:5000
- `client/tsconfig.app.json` — TS config with path alias @/* → ./src/*
- `client/src/index.css` — Tailwind v4 import (`@import "tailwindcss"`)
- `client/src/App.tsx` — Minimal BrowserRouter + Routes shell
- `client/src/lib/utils.ts` — cn() helper with clsx + tailwind-merge
- `client/components.json` — shadcn/ui configuration (Nova preset, Radix UI)
- `client/src/components/ui/button.tsx` — shadcn Button component
- `client/src/components/ui/card.tsx` — shadcn Card component
- `client/src/components/ui/input.tsx` — shadcn Input component
- `client/src/components/ui/label.tsx` — shadcn Label component
- `client/src/components/ui/sonner.tsx` — shadcn Sonner toast component

## Decisions Made

- **Solution format shim:** .NET SDK 10 defaults to .slnx (new XML format). Used `--format sln` to create traditional .sln for compatibility with plan references.
- **shadcn v4 migration:** shadcn v4 uses preset-based theming (Nova) and --template/--base flags instead of --style/--base-color. Chose Nova preset as equivalent to New York style with modern aesthetics.
- **TS6 path alias workaround:** TypeScript 6.0 deprecates baseUrl. Added `"ignoreDeprecations": "6.0"` to tsconfig.app.json to keep path aliases working while maintaining forward compatibility.
- **Component file relocation:** shadcn v4 wrote component files to literal `@/components/ui/` directory on disk. Moved to `src/components/ui/` where `@` alias properly resolves to `./src`.

## Deviations from Plan

None — plan executed exactly as written with minor adjustments for tool version differences.

### Tool Version Adaptations
1. **.NET SDK 10** instead of 8 — solution format changed to .slnx; used `--format sln` to create .sln
2. **shadcn v4 (4.8.0)** instead of v3 — uses presets, `--template`, `--base` flags instead of `--style`
3. **TypeScript 6.0** — deprecates baseUrl; added `ignoreDeprecations` flag
4. **React 19** instead of 18 — Vite template generates React 19; all dependencies compatible
5. **shadcn generated `@/` literal directory** — components moved to correct location

These are version adaptation deviations, not defects or missing functionality. Followed appropriate tool APIs for the installed versions.

## Issues Encountered

- **React Router 7 import note:** React Router v7 changed imports subtly. `BrowserRouter` and `Routes` from `react-router-dom` worked correctly.
- **shadcn v4 component library choice:** Had to select `--template vite --base radix --preset nova` for non-interactive init. Required path aliases to be configured before running init.
- **npm deduplication:** Some packages (react-hook-form) disappeared from node_modules after subsequent npm installs. Reinstalled at the end.

## Threat Surface Scan

No new threat surface introduced beyond what the plan's `<threat_model>` already covers:
- T-01-01: All packages from official registries (nuget.org, npmjs.com) — no tampering
- T-01-02: SQL Server port 1433 exposed — dev-only per plan acceptance
- T-01-03: CORS allows localhost:5173 — dev-only per plan acceptance

## Next Phase Readiness

- Full development environment is scaffolded and building
- Plan 01-02 (Auth API + Frontend) can build directly on this skeleton
- DbContext and Identity are configured — migrations and seeder can be added
- shadcn/ui components are ready for auth form pages
- Vite proxy eliminates CORS cookie issues in development

---

## Self-Check: PASSED

| Check | Result |
|-------|--------|
| `dotnet build src/backend/CalendarBooking.sln` | ✅ 0 errors, 0 warnings |
| `npm run build` (client/) | ✅ Built successfully (231 KB JS, 17 KB CSS) |
| `01-01-SUMMARY.md` exists | ✅ Found at `.planning/phases/01-foundation-authentication/` |

---

*Phase: 01-foundation-authentication*
*Completed: 2026-05-22*
