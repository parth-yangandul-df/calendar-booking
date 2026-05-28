# Phase 2: Availability Management

**Status:** ✅ Complete (2026-05-22)
**Requirements:** CAL-01, CAL-02
**Plans:** 2/2 executed

---

## What Was Built

### Plan 01 — Availability Backend

- Domain entities: `WeeklyTemplate` (UserId, DayOfWeek, StartTime, EndTime), `AvailabilityOverride` (UserId, Date, StartTime, EndTime)
- EF Core migration adding both tables with proper indexes
- `IAvailabilityRepository` with 6 methods: GetCalendar, Get/Set Template, Get/Set/Delete Override
- `AvailabilityController`: 6 endpoints for template CRUD and calendar merge
- `UsersController`: search users and get by ID (with `[Authorize]`)
- Server-side merge: template + overrides → per-day `CalendarDayDto` response
- Full-replace semantics for writes (idempotent, no delta-sync)

### Plan 02 — Availability Frontend

- Custom `MonthGrid` component (7-column CSS grid, not FullCalendar)
- `DaySidePanel` (shadcn Sheet) for editing a day's time ranges
- Debounced auto-save (~500ms) — no manual Save button
- `TemplateSetupPage` (`/settings/availability`) — day checkboxes + time pickers
- `UserDirectoryPage` (`/users`) — search with debounced input
- `UserCalendarPage` (`/users/:userId`) — read-only calendar view (blue bars)
- Navbar links: "My Calendar", "Find People"
- `date-fns` installed for month grid date math

---

## Key Decisions

| Decision | Choice | Why |
|----------|--------|-----|
| Calendar UI | Custom grid (not FullCalendar) | Lighter, custom click-per-cell UX |
| Data model | Two tables | Weekly template + per-date overrides |
| Save pattern | Auto-save with debounce | No Save button, edits persist immediately |
| Default state | All unavailable (opt-in) | Users explicitly set when they're free |
| User search | `/users` with debounce | Search by email, click to view calendar |
| Timezone | None in v1 | All users assumed same timezone |

## Verification

| Truth | Status |
|-------|--------|
| Backend stores weekly templates with per-day time ranges | ✅ Verified |
| Backend stores per-date overrides | ✅ Verified |
| Backend merges template + overrides into per-day response | ✅ Verified |
| Backend serves user directory search | ✅ Verified |
| All endpoints authorized via JWT | ✅ Verified |
| Month grid renders with colored availability bars | ✅ Verified |
| Time changes auto-save with debounce | ✅ Verified |
| Template setup page works | ✅ Verified |
| Read-only view of other users' calendars | ✅ Verified |
| User search doesn't fire on empty query | ✅ Verified |

## Plans

| # | Name | What It Built |
|---|------|--------------|
| 02-01 | Availability Backend | Entities, migration, repository, AvailabilityController |
| 02-02 | Availability Frontend | MonthGrid, DaySidePanel, TemplateSetup, UserDirectory |
