---
phase: 02-availability-management
plan: 01
subsystem: api
tags: [aspnet, efcore, sqlserver, clean-architecture, fluentvalidation, csharp]

requires:
  - phase: 01-foundation-authentication
    provides: ApplicationUser entity, ApplicationDbContext, JWT auth pattern, AuthController pattern

provides:
  - WeeklyTemplate and AvailabilityOverride domain entities with EF Core configurations
  - IAvailabilityRepository interface with 6 methods
  - Server-side calendar merge algorithm (template + overrides → per-day CalendarDayDto)
  - AvailabilityController with 6 endpoints (template CRUD, override CRUD, calendar view)
  - UsersController with search and get-by-id endpoints
  - FluentValidation validators for template and override request DTOs
  - EF Core migration: AddAvailabilityManagement (WeeklyTemplates + AvailabilityOverrides tables)

affects: [02-02-frontend, phase-3-booking-engine]

tech-stack:
  added: []
  patterns:
    - "Full-replace PUT semantics: SetTemplateAsync deletes all rows for user then inserts new ones"
    - "Full-replace per-day override: SetOverrideAsync replaces entire day state (prevents delta-sync race)"
    - "Server-side calendar merge: iterate each day, check override first then template, return CalendarDayDto"
    - "IDOR prevention: always use _userManager.GetUserId(User) from JWT claims for own-data writes"
    - "Single calendar endpoint: optional userId query param — own calendar if omitted, others if provided"

key-files:
  created:
    - src/backend/Domain/Entities/WeeklyTemplate.cs
    - src/backend/Domain/Entities/AvailabilityOverride.cs
    - src/backend/Infrastructure/Data/Configurations/WeeklyTemplateConfiguration.cs
    - src/backend/Infrastructure/Data/Configurations/AvailabilityOverrideConfiguration.cs
    - src/backend/Infrastructure/Data/Migrations/20260522115936_AddAvailabilityManagement.cs
    - src/backend/Application/Common/Interfaces/IAvailabilityRepository.cs
    - src/backend/Application/Availability/DTOs/CalendarDayDto.cs
    - src/backend/Application/Availability/DTOs/TimeRangeDto.cs
    - src/backend/Application/Availability/DTOs/WeeklyTemplateDto.cs
    - src/backend/Application/Availability/DTOs/AvailabilityOverrideDto.cs
    - src/backend/Application/Availability/DTOs/UpsertTemplateRequest.cs
    - src/backend/Application/Availability/DTOs/UpsertOverrideRequest.cs
    - src/backend/Application/Availability/DTOs/UserDto.cs
    - src/backend/Application/Availability/Validators/UpsertTemplateValidator.cs
    - src/backend/Application/Availability/Validators/UpsertOverrideValidator.cs
    - src/backend/Infrastructure/Repositories/AvailabilityRepository.cs
    - src/backend/Api/Controllers/AvailabilityController.cs
    - src/backend/Api/Controllers/UsersController.cs
  modified:
    - src/backend/Infrastructure/Data/ApplicationDbContext.cs
    - src/backend/Api/Program.cs

key-decisions:
  - "Single GET /calendar endpoint with optional userId param instead of two separate actions (ASP.NET Core cannot have two GET actions with identical route templates)"
  - "Full-replace semantics for both template (PUT) and override (POST) to prevent delta-sync race conditions per RESEARCH.md Pitfall 2"
  - "GetUserId() helper returns string! (non-null assertion) — user is always authenticated via [Authorize], null case cannot occur at runtime"
  - "UserDto exposes only Id + Email (no IsAdmin, no CreatedAt) per T-02-03 info-disclosure mitigation"

requirements-completed: [CAL-01, CAL-02]

duration: 18min
completed: 2026-05-22
---

# Phase 2 Plan 01: Availability Backend Summary

**Two-table availability model (WeeklyTemplate + AvailabilityOverride) with server-side calendar merge, FluentValidation, and 8 endpoints across AvailabilityController + UsersController**

## Performance

- **Duration:** ~18 min
- **Started:** 2026-05-22T11:45:00Z
- **Completed:** 2026-05-22T12:03:00Z
- **Tasks:** 3
- **Files modified:** 20 (18 created, 2 modified)

## Accomplishments

- Two-table data model for availability: `WeeklyTemplate` (recurring weekly pattern) and `AvailabilityOverride` (per-date exceptions), both with EF Core configurations and composite indexes
- Server-side calendar merge algorithm in `AvailabilityRepository.GetCalendarAsync` — iterates each day in the month, checks overrides first, falls back to template, returns unified `List<CalendarDayDto>` 
- Complete REST API: 6 availability endpoints (template GET/PUT, overrides GET/POST/DELETE, calendar GET with optional userId) + 2 user endpoints (search, get-by-id)
- FluentValidation on all write requests: time format (HH:mm), date format (yyyy-MM-dd), start-before-end, non-overlapping ranges, no duplicate days in template
- EF Core migration `AddAvailabilityManagement` generated and ready to apply on startup

## Task Commits

1. **Task 1: Domain entities, EF configs, DbContext, migration** — `0bc26a2` (feat)
2. **Task 2: Application layer — IAvailabilityRepository, DTOs, validators** — `24887fc` (feat)
3. **Task 3: AvailabilityRepository, controllers, service registration** — `55f72ae` (feat)

## Files Created/Modified

- `Domain/Entities/WeeklyTemplate.cs` — Entity: Id, UserId, DayOfWeek, StartTime (TimeOnly), EndTime (TimeOnly), CreatedAt
- `Domain/Entities/AvailabilityOverride.cs` — Entity: Id, UserId, Date (DateOnly), StartTime, EndTime, CreatedAt
- `Infrastructure/Data/Configurations/WeeklyTemplateConfiguration.cs` — PK, composite index (UserId, DayOfWeek), time column types, cascade delete
- `Infrastructure/Data/Configurations/AvailabilityOverrideConfiguration.cs` — PK, composite index (UserId, Date), date/time column types, cascade delete
- `Infrastructure/Data/ApplicationDbContext.cs` — Added DbSet\<WeeklyTemplate\> + DbSet\<AvailabilityOverride\>, applied new configurations
- `Infrastructure/Data/Migrations/20260522115936_AddAvailabilityManagement.cs` — EF migration for both tables
- `Application/Common/Interfaces/IAvailabilityRepository.cs` — Interface: 6 methods covering full CRUD + calendar merge
- `Application/Availability/DTOs/` — CalendarDayDto, TimeRangeDto, WeeklyTemplateDto, AvailabilityOverrideDto, UpsertTemplateRequest/Item, UpsertOverrideRequest/Item, UserDto
- `Application/Availability/Validators/UpsertTemplateValidator.cs` — Validates day names, HH:mm format, start<end, no duplicate days
- `Application/Availability/Validators/UpsertOverrideValidator.cs` — Validates yyyy-MM-dd date, HH:mm format, start<end, non-overlapping ranges
- `Infrastructure/Repositories/AvailabilityRepository.cs` — Full implementation of IAvailabilityRepository
- `Api/Controllers/AvailabilityController.cs` — [Authorize], 6 endpoints, validator injection, IDOR prevention
- `Api/Controllers/UsersController.cs` — [Authorize], search + get-by-id, UserDto (Id + Email only)
- `Api/Program.cs` — Added `AddScoped<IAvailabilityRepository, AvailabilityRepository>()`

## Decisions Made

- **Single calendar endpoint** (`GET /calendar?month=&userId=`): ASP.NET Core cannot resolve two GET actions with the same route template. Used optional `userId` query param — if omitted, identity comes from JWT claims; if provided, returns that user's calendar (read-only, D-12/D-13).
- **Full-replace semantics**: Both `SetTemplateAsync` and `SetOverrideAsync` delete all existing rows for the target scope before inserting new ones. Prevents Pitfall 2 (delta-sync race conditions with debounced saves).
- **`GetUserId()` returns `string!`**: The `[Authorize]` attribute guarantees the user is authenticated; null dereference cannot occur in practice. Non-null assertion is correct here.
- **UserDto exposes only Id + Email**: Satisfies T-02-03 info-disclosure mitigation — no `IsAdmin`, no `CreatedAt`, no other PII.

## Deviations from Plan

None — plan executed exactly as written.

The plan noted two possible approaches for the dual GET calendar endpoints. The single-action approach with optional `userId` param (chosen here) is a clean ASP.NET Core idiom and matches the plan's "parameter disambiguation" suggestion.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required. The migration will be applied automatically on API startup via `db.Database.MigrateAsync()` in Program.cs.

## Next Phase Readiness

- Backend API is complete and building cleanly with 0 warnings
- All 8 endpoints are available for the frontend (Phase 2 Plan 02)
- Migration will auto-apply on next API startup — tables `WeeklyTemplates` and `AvailabilityOverrides` will be created
- FluentValidation auto-discovered via `AddValidatorsFromAssemblyContaining<RegisterRequestValidator>()` — no additional Program.cs lines needed for the new validators

---
*Phase: 02-availability-management*
*Completed: 2026-05-22*
