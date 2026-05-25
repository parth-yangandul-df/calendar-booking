# Phase 2: Availability Management - Context

**Gathered:** 2026-05-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Monthly calendar view where users define their weekly availability template and override specific dates. Users can view other people's available time slots.

**Requirements:** CAL-01, CAL-02
**Acceptance Criteria:**
- User sets recurring weekly availability (which days, which time ranges)
- User overrides availability for specific dates
- Availability changes persist immediately
- User can view another user's available time slots for the current month

</domain>

<decisions>
## Implementation Decisions

### Time Slot Model
- **D-01:** Per-day time ranges (not fixed slots) — user says "I'm free 9-12 and 14-17"
- **D-02:** Recurring weekly template with per-date overrides — set a typical week, override specific days
- **D-03:** Two-table data model: `WeeklyTemplate` (UserId, DayOfWeek, Start, End) + `AvailabilityOverride` (UserId, Date, Start, End). Merge: template fills month, overrides replace specific dates.

### Weekly Template Setup
- **D-04:** Settings page (`/settings/availability`) with day checkboxes + time range pickers per day
- **D-05:** Template setup page accessible from empty-state CTA on the calendar

### Month Calendar View
- **D-06:** Custom month grid with shadcn/ui (not FullCalendar React) — 7-column grid, click-aware day cells
- **D-07:** Click a day → side panel opens with that day's time range editor (not modal, not inline expansion)
- **D-08:** Native `<input type="time">` for start/end time picks (wrapped in shadcn Input)
- **D-09:** Auto-save with debounce (~500ms) on time range changes — no Save button
- **D-10:** Navigation limited to ±3 months past, +6 months future

### Viewing Others' Availability
- **D-11:** User directory page (`/users`) with search/filter
- **D-12:** Click user → `/users/{userId}` shows their calendar read-only
- **D-13:** Read-only mode: different color palette for available blocks, no edit controls, "Back to my calendar" link
- **D-14:** Same month grid component, toggled to read-only mode

### Default & Empty State
- **D-15:** Empty calendar (no template set) shows CTA: "Set your weekly availability to get started" → links to `/settings/availability`
- **D-16:** All time unavailable by default (opt-in model)

### Timezone
- **D-17:** No timezone handling in v1 — all users assumed same timezone. Times stored and displayed as-is.

### API Endpoints
- **D-18:** `GET/PUT /api/v1/availability/template` — user's weekly schedule
- **D-19:** `GET /api/v1/availability/overrides?from=...&to=...` — overrides for date range
- **D-20:** `POST/PUT/DELETE /api/v1/availability/overrides` — create/update/delete a date override
- **D-21:** `GET /api/v1/availability/calendar?userId=...&month=YYYY-MM` — merged view (template + overrides)

### Navigation & Routing
- **D-22:** `/` → My Calendar (month view, editable, replaces DashboardPage)
- **D-23:** `/settings/availability` → Weekly template setup
- **D-24:** `/users` → User directory
- **D-25:** `/users/{userId}` → Read-only calendar of that user's availability
- **D-26:** Navbar adds "My Calendar" link and "Find People" (magnifying glass or link)

### the agent's Discretion
- Exact component file structure under `src/features/availability/pages/`, `src/features/availability/api/`, `src/features/availability/schemas/`
- Navbar icon choice for "Find People"
- Color palette for available blocks (own vs others)
- Debounce timing (recommended ~500ms but adjustable)
- Side panel animation/transition

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & Roadmap
- `.planning/REQUIREMENTS.md` § CAL-01, CAL-02 — Full v1 requirements with acceptance criteria
- `.planning/ROADMAP.md` § Phase 2 — Phase 2 goal, success criteria, requirement mapping
- `.planning/research/SUMMARY.md` — Research summary with stack decisions

### Project Context
- `.planning/PROJECT.md` — Project overview, core value, constraints, key decisions
- `.planning/STATE.md` — Current project state and accumulated decisions

### Prior Phase Decisions
- `.planning/phases/01-foundation-authentication/01-CONTEXT.md` — Phase 1 decisions (D-10 frontend stack, D-11 Clean Architecture, D-12 API prefix, D-13 local SQL Server, D-14 ProblemDetails, D-15 Sonner toasts)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **shadcn/ui components** — Button, Input, Label, Card already installed. Need `select` or `combobox` for day-of-week selection.
- **Navbar** — `Navbar.tsx` already supports adding new navigation links alongside "Calendar Booking" title and user info.
- **App.tsx routing** — Existing route structure (AuthProvider, ProtectedRoute, AppLayout) is ready for new routes. Just add new Route elements inside ProtectedRoute.
- **Axios client** — `client/src/api/client.ts` already has withCredentials + 401 intercept. New API functions use the same pattern as `authApi`.

### Established Patterns
- **API layer: Clean Architecture** — New Availability entity in Domain, interfaces in Application, EF Core repo in Infrastructure, controller in Api.
- **Frontend: feature folders** — Auth lives under `src/features/auth/`. Availability should follow same pattern: `src/features/availability/` with `api/`, `pages/`, etc.
- **API versioning** — `/api/v1/availability/...` prefix per D-12 from Phase 1.
- **Error handling** — ProblemDetails from API, Sonner toasts on frontend (per D-14, D-15 from Phase 1).

### Integration Points
- **Navbar** — Add "My Calendar" and "Find People" links. The auth section (email + logout) stays.
- **Dashboard route (`/`)** — Replace `DashboardPage` with the month calendar component.
- **Auth context** — `useAuth()` provides `user` for identifying current user vs viewed user.
- **Existing DB** — New EF Core migration for `WeeklyTemplate` and `AvailabilityOverride` tables.

</code_context>

<specifics>
## Specific Ideas

- Calendar UX similar to Microsoft Teams work hours setup: weekly template with per-day checkboxes and time range pickers
- Month view inspired by Teams calendar: click a day → side panel with day detail
- TDD/prototype approach: build UI artifact → verify against spec → redesign → implement

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 2-Availability Management*
*Context gathered: 2026-05-22*
