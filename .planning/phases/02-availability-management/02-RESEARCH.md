# Phase 2: Availability Management — Research

**Researched:** 2026-05-22
**Domain:** Calendar availability UI + API + data model with weekly templates and per-date overrides
**Confidence:** HIGH

## Summary

Phase 2 delivers CAL-01 (user defines monthly availability) and CAL-02 (view another user's calendar). The stack is React 19 + Vite + Tailwind (shadcn/ui) on the frontend, ASP.NET Core 8 Clean Architecture (Domain → Application → Infrastructure → Api) on the backend, and SQL Server with EF Core 8.

**Key architectural decisions from CONTEXT.md:**
- **Custom month grid** (not FullCalendar) with shadcn/ui primitives — a 7-column CSS grid layout with click-aware day cells.
- **Side panel UX** for day editing — click a day → panel slides in with time range editor using native `<input type="time">`.
- **Two-table data model** — `WeeklyTemplate` (recurring pattern) + `AvailabilityOverride` (per-date exceptions). Merged server-side into a single calendar response.
- **Auto-save with debounce** (~500ms) — no Save button; edit triggers debounced API call.
- **Separate settings page** (`/settings/availability`) for weekly template setup with day checkboxes + time range pickers.
- **User directory** (`/users`) with search, then read-only calendar view.
- **Timezones:** v1 assumes all users in same timezone — no UTC conversion.

**Primary recommendation:** Build the month calendar grid as a reusable `<MonthGrid>` component with a `readOnly` prop used by both My Calendar and User View. Use a custom `useDebounce` hook (no extra package needed — <10 lines). Keep the data flow shallow: local state → debounced API call → refetch on mutation success via React Query invalidation.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Month grid rendering (7-column layout) | Browser | — | Pure client-side layout — no server involvement |
| Click day → side panel UX | Browser | — | Local component state, no server round-trip |
| Day-level time range editing | Browser | API (persistence) | Edit is local; debounced save goes to API |
| Debounced auto-save | Browser | — | Client-side timing logic only |
| Weekly template CRUD | API (Data) | Browser (UI) | React Query manages fetch → mutate → refetch |
| Calendar merge (template + overrides) | API (Data) | — | Server merges WeeklyTemplate + AvailabilityOverride into unified daily slots |
| User directory / search | API (Data) | Browser (UI) | Search endpoint returns users matching query |
| Read-only calendar view | Browser | API (Data) | Same `<MonthGrid>` component with `readOnly` prop; API returns same shape |
| Route management | Browser | — | React Router 6 — existing `AppLayout` wrapping pattern |

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CAL-01 | User can define availability on monthly calendar | Custom `<MonthGrid>` (D-06), side panel (D-07), time inputs (D-08), debounce (D-09), two-table model (D-03) |
| CAL-02 | User can view another user's available slots | Read-only mode on `<MonthGrid>` (D-13, D-14), user directory (D-11), `/users/{userId}` route (D-25) |

## User Constraints (from CONTEXT.md)

All decisions from the discussion phase are locked. See `.planning/phases/02-availability-management/02-CONTEXT.md` for the full set (D-01 through D-26). Key locked items:

- **Per-day time ranges** (not fixed slots) — D-01
- **Two-table model** — WeeklyTemplate + AvailabilityOverride — D-03
- **Custom month grid** (not FullCalendar) — D-06
- **Side panel** for day editing — D-07
- **Native `<input type="time">`** — D-08
- **Auto-save with debounce** (~500ms) — D-09
- **Navigation limits** ±3 months past, +6 months future — D-10
- **User directory + read-only view** — D-11 through D-14
- **Opt-in model** (all unavailable by default) — D-16
- **No timezone handling in v1** — D-17
- **API endpoints** — D-18 through D-21
- **Routes** — D-22 through D-25

### the agent's Discretion areas
- Component file structure under `src/features/availability/`
- Navbar icon for "Find People"
- Color palette for available blocks
- Debounce timing exact value
- Side panel animation/transition

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 19.x | UI framework | Enforced by project; already installed |
| React Router | 7.15 | Client routing | Already installed; defines `/`, `/settings/availability`, `/users`, `/users/:id` |
| Axios | 1.16 | HTTP client | Already installed; `apiClient` in `src/api/client.ts` with refresh interceptor |
| TanStack React Query | 5.100 | Server state management | Already installed; useQuery/useMutation for all API calls |
| shadcn/ui | latest | Component primitives | Already installed; Button, Input, Label, Card, Sheet available |
| date-fns | (peer) | Date math | Needed for month grid generation (first/last day of month, day-of-week offsets). Not yet installed — added for this phase. |

### Packages to Install

| Package | Version | Purpose | Why |
|---------|---------|---------|-----|
| `date-fns` | ^3.x | Date utility | Month grid: calculate days in month, get day-of-week, format dates, navigate months. Small tree-shakeable. [VERIFIED: npm registry] |

**Installation:**
```bash
cd client && npm install date-fns
```

**No additional NuGet packages needed for the backend.** EF Core 8.0.11, Identity, SQL Server provider already installed. No new external services for this phase.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom month grid | FullCalendar React | FullCalendar is heavier (~150KB gzipped), harder to customize per-day click behavior. Custom grid is ~50 lines of CSS grid + JSX. D-06 locks this. |
| Native `<input type="time">` | shadcn Select or custom time picker | Native time inputs have inconsistent styling across browsers but are the simplest, most accessible solution for time-of-day input. D-08 locks this. |
| Custom `useDebounce` hook | `use-debounce` npm package | Custom hook is ~10 lines of code; adding a dependency is unnecessary overhead for this simple case. |
| Shadcn Calendar (react-day-picker) | FullCalendar React | DayPicker is useful for date selection popovers but doesn't render availability blocks inside cells. We need click-per-cell + content-per-cell, which is easier with a custom grid. |

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| `date-fns` | npm | 12+ yrs | ~100M/wk | github.com/date-fns/date-fns | OK | Approved |

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│  Browser (React 19 + Vite)                                      │
│                                                                 │
│  ┌─────────────────────┐   ┌──────────────┐   ┌─────────────┐  │
│  │  / (My Calendar)    │   │ /settings/   │   │ /users/     │  │
│  │  <MonthGrid>        │   │  availability│   │  {userId}   │  │
│  │  readOnly=false     │   │  <Template-  │   │  <MonthGrid>│  │
│  │ ┌─click day──┐      │   │   Setup>     │   │  readOnly=  │  │
│  │ │<DaySidePanel>│    │   │  day checkbx │   │  true       │  │
│  │ │ time inputs │     │   │  + time rng  │   │             │  │
│  │ │ + add/rmve  │     │   └──────┬───────┘   └──────┬──────┘  │
│  │ └──────┬──────┘     │          │                  │         │
│  └────────┼────────────┘          │                  │         │
│           │ (debounced PUT)       │ (PUT template)    │ (GET   │
│           │                       │                   │  wkly) │
└───────────┼───────────────────────┼───────────────────┼────────┘
            │                       │                   │
            ▼                       ▼                   ▼
┌─────────────────────────────────────────────────────────────────┐
│  Vite Proxy → http://localhost:5000                              │
│  Axios client with /api/v1 prefix + 401 refresh interceptor     │
└───────────┬─────────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────────┐
│  ASP.NET Core 8 Web API                                          │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Controllers                                             │    │
│  │  ┌──────────────────┐  ┌──────────────────────────────┐  │    │
│  │  │ AvailabilityCtrl │  │ UsersController              │  │    │
│  │  │ GET/PUT          │  │ GET /api/v1/users?search=    │  │    │
│  │  │  /api/v1/        │  │ GET /api/v1/users/{id}       │  │    │
│  │  │  availability/*  │  └──────────────────────────────┘  │    │
│  │  └────────┬─────────┘                                     │    │
│  └───────────┼───────────────────────────────────────────────┘    │
│              │                                                    │
│  ┌───────────┼───────────────────────────────────────────────┐    │
│  │  Application Layer (use cases / interfaces)               │    │
│  │  ┌─────────────────────────┐  ┌──────────────────────┐    │    │
│  │  │ IAvailabilityRepository │  │ FluentValidation     │    │    │
│  │  │ + GetCalendar(query)    │  │  DTOs for template   │    │    │
│  │  │ + SaveTemplate(command) │  │  and override reqs   │    │    │
│  │  │ + SaveOverride(command) │  └──────────────────────┘    │    │
│  │  └─────────────────────────┘                               │    │
│  └───────────────────────────────┬────────────────────────────┘    │
│                                  │                                │
│  ┌───────────────────────────────▼────────────────────────────┐    │
│  │  Infrastructure (EF Core, Repositories, DbContext)          │    │
│  │  ┌──────────────────────┐  ┌───────────────────────────┐   │    │
│  │  │ AvailabilityRepo     │  │ ApplicationDbContext      │   │    │
│  │  │ : IAvailabilityRepo  │  │ DbSet<WeeklyTemplate>    │   │    │
│  │  └──────────────────────┘  │ DbSet<AvailabilityOvr>  │   │    │
│  │                            └───────────────────────────┘   │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  SQL Server (local MSSQLSERVER)                              │    │
│  │  Tables: WeeklyTemplates, AvailabilityOverrides              │    │
│  │  Index: (UserId, DayOfWeek) on WeeklyTemplate               │    │
│  │  Index: (UserId, Date) on AvailabilityOverride               │    │
│  └─────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
```

### Recommended Project Structure

```
src/backend/
├── Domain/Entities/
│   ├── ApplicationUser.cs          (existing)
│   ├── RefreshToken.cs             (existing)
│   ├── WeeklyTemplate.cs           (NEW)
│   └── AvailabilityOverride.cs     (NEW)
├── Application/
│   ├── Common/Interfaces/
│   │   ├── ITokenService.cs        (existing)
│   │   ├── IRefreshTokenRepository.cs (existing)
│   │   └── IAvailabilityRepository.cs  (NEW)
│   ├── Availability/DTOs/
│   │   ├── WeeklyTemplateDto.cs         (NEW)
│   │   ├── AvailabilityOverrideDto.cs   (NEW)
│   │   ├── CalendarDayDto.cs            (NEW)
│   │   ├── UpsertTemplateRequest.cs     (NEW)
│   │   └── UpsertOverrideRequest.cs     (NEW)
│   └── Availability/Validators/
│       └── UpsertTemplateValidator.cs   (NEW)
├── Infrastructure/
│   ├── Data/
│   │   ├── ApplicationDbContext.cs  (modified — add DbSets)
│   │   └── Configurations/
│   │       ├── RefreshTokenConfiguration.cs  (existing)
│   │       ├── WeeklyTemplateConfiguration.cs    (NEW)
│   │       └── AvailabilityOverrideConfiguration.cs (NEW)
│   └── Repositories/
│       ├── RefreshTokenRepository.cs  (existing)
│       └── AvailabilityRepository.cs  (NEW)
└── Api/Controllers/
    ├── AuthController.cs     (existing)
    └── AvailabilityController.cs  (NEW)

client/src/
├── api/
│   └── client.ts            (existing)
├── features/
│   └── availability/
│       ├── api/
│       │   └── availabilityApi.ts   (NEW)
│       ├── components/
│       │   ├── MonthGrid.tsx         (NEW — core reusable)
│       │   ├── DayCell.tsx           (NEW)
│       │   ├── DaySidePanel.tsx      (NEW)
│       │   ├── DayTimeRangeEditor.tsx(NEW)
│       │   └── UserSearchBar.tsx     (NEW)
│       ├── hooks/
│       │   ├── useDebounce.ts        (NEW)
│       │   ├── useMonthNavigation.ts(NEW)
│       │   └── useAvailability.ts    (NEW — React Query hooks)
│       ├── pages/
│       │   ├── MyCalendarPage.tsx    (NEW — replaces DashboardPage)
│       │   ├── TemplateSetupPage.tsx (NEW)
│       │   └── UserCalendarPage.tsx  (NEW)
│       └── schemas/
│           └── availabilitySchema.ts (NEW — zod)
├── components/
│   ├── layout/
│   │   ├── Navbar.tsx         (modified — add links)
│   │   └── ProtectedRoute.tsx (existing)
│   └── ui/                    (existing shadcn — add Sheet if not installed)
└── App.tsx                    (modified — add routes)
```

### Pattern 1: Custom Month Grid with `date-fns`

**What:** A 7-column CSS grid calendar that renders day cells for a given month. Computed with `date-fns` helpers. Each cell is clickable and conditionally styled based on availability data.

**When to use:** Every calendar view in the app — My Calendar (editable) and User View (read-only). The same `<MonthGrid>` component accepts a `readOnly` prop.

**Implementation approach:**

```typescript
// Core month grid layout pattern:
// 1. Compute first day of month, number of days, padding cells for day-of-week offset
// 2. Render grid: 7 columns (Sun-Sat), rows auto-fill
// 3. Each cell is a div with onClick handler, styled based on time ranges for that day
// 4. Navigation buttons update displayed month

// date-fns helpers needed:
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, format } from 'date-fns';

function getMonthGrid(year: number, month: number): Date[] {
  const start = startOfWeek(startOfMonth(new Date(year, month)));
  const end = endOfWeek(endOfMonth(new Date(year, month)));
  return eachDayOfInterval({ start, end });
}
```

**Key shadcn/ui integration:**
- Wrap each day cell in a div with `className="border p-1 h-24 cursor-pointer hover:bg-accent"` (Tailwind v4 class syntax).
- Available time blocks rendered as small colored bars inside the cell.
- Selected day gets a ring: `ring-2 ring-primary`.
- Outside-month days get `text-muted-foreground opacity-50`.

### Pattern 2: Day Side Panel with Time Range Editor

**What:** When user clicks a day cell, a shadcn `Sheet` slides in from the right showing that day's availability state and time range inputs.

**When to use:** Day editing for My Calendar (readOnly=false). Not shown in read-only mode.

**Implementation:**
```typescript
// State: selectedDay + timeRanges for that day
// Each time range: { start: string ("09:00"), end: string ("12:00") }
// Add button appends empty range, remove button deletes range
// Each range uses: <Input type="time" />

// Auto-save: any change to a time range fires useDebounce'd API call
```

### Pattern 3: `useDebounce` Hook

**What:** A simple custom React hook that delays updating a value until after a specified delay.

**When to use:** Debouncing auto-save API calls when user edits time ranges. Debouncing user search input.

**Implementation (no external package needed — ~12 lines):**
```typescript
// src/features/availability/hooks/useDebounce.ts
import { useState, useEffect } from 'react';

export function useDebounce<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
```

**Usage pattern:**
```typescript
const [timeRanges, setTimeRanges] = useState<TimeRange[]>([]);
const debouncedRanges = useDebounce(timeRanges, 500);

useEffect(() => {
  if (debouncedRanges !== initialRanges) {
    availabilityApi.saveDayOverride(date, debouncedRanges);
  }
}, [debouncedRanges]);
```

### Pattern 4: Availability Data Flow (React Query)

**What:** Custom hooks wrapping `useQuery` / `useMutation` for availability data. The server returns a merged calendar view.

**When to use:** Every API call pattern in the phase.

```typescript
// src/features/availability/hooks/useAvailability.ts

export function useMyCalendar(yearMonth: string) {
  return useQuery({
    queryKey: ['availability', 'calendar', yearMonth],
    queryFn: () => availabilityApi.getMyCalendar(yearMonth),
  });
}

export function useUserCalendar(userId: string, yearMonth: string) {
  return useQuery({
    queryKey: ['availability', 'calendar', userId, yearMonth],
    queryFn: () => availabilityApi.getUserCalendar(userId, yearMonth),
  });
}

export function useSaveOverride() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (override: SaveOverrideRequest) => availabilityApi.saveOverride(override),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['availability', 'calendar'] });
      toast.success('Availability saved');
    },
    onError: () => toast.error('Failed to save availability'),
  });
}
```

### Pattern 5: API Controller (matching AuthController style)

**What:** A new `AvailabilityController` following the same patterns as `AuthController` — constructor injection, ProblemDetails errors, FluentValidation, `[Authorize]` attribute.

**When to use:** All availability endpoints.

```csharp
// CalendarBooking.Api.Controllers.AvailabilityController
[ApiController]
[Route("api/v1/availability")]
[Authorize]
public class AvailabilityController : ControllerBase
{
    private readonly IAvailabilityRepository _repo;
    private readonly UserManager<ApplicationUser> _userManager;

    public AvailabilityController(
        IAvailabilityRepository repo,
        UserManager<ApplicationUser> userManager)
    {
        _repo = repo;
        _userManager = userManager;
    }

    // GET /api/v1/availability/calendar?month=2026-05
    [HttpGet("calendar")]
    public async Task<IActionResult> GetCalendar([FromQuery] string month)
    {
        var userId = _userManager.GetUserId(User);
        // Parse month, merge template + overrides, return per-day ranges
        var calendar = await _repo.GetCalendarAsync(userId, month);
        return Ok(calendar);
    }

    // GET /api/v1/availability/calendar?userId=abc&month=2026-05 (for CAL-02)
    [HttpGet("calendar")]
    public async Task<IActionResult> GetCalendar(
        [FromQuery] string userId, [FromQuery] string month)
    {
        var calendar = await _repo.GetCalendarAsync(userId, month);
        return Ok(calendar);
    }

    // GET/PUT template, POST/PUT/DELETE overrides match D-18 through D-20
}
```

### Anti-Patterns to Avoid

- **Using the shadcn Calendar (react-day-picker) as the month grid:** It's built for date selection pickers, not for displaying complex content (time blocks) inside cells. Custom grid is simpler and more flexible.
- **Client-side calendar merge:** Always merge template + overrides on the server. The API returns a merged view. This keeps the client simple and ensures consistency.
- **Optimistic updates without reconciliation:** Debounce already handles the timing. Don't add optimistic UI on top of debounce — it adds complexity for marginal UX gain in an auto-save context.
- **Storing times as strings in the API:** Times (09:00, 17:30) should be strings in the API (ISO 8601 time format "HH:mm") but stored as SQL `time` columns in the database. EF Core handles this conversion.

## Calendar Merging Logic (Server-Side)

**Critical server-side algorithm** — the API must merge WeeklyTemplate rows + AvailabilityOverride rows into a single per-day response:

```
For each day in the requested month:
  1. Check for an AvailabilityOverride for that date
  2. If override exists → return override's time ranges (replaces template entirely)
  3. If no override → check WeeklyTemplate for that day-of-week
  4. If template exists → return template's time ranges
  5. If neither → return empty (unavailable all day)
```

**API response shape (`CalendarDayDto`):**
```csharp
public record CalendarDayDto(
    string Date,              // "2026-05-22"
    bool IsOverride,          // true if this day has an override
    List<TimeRangeDto> Ranges // empty = unavailable
);

public record TimeRangeDto(
    string Start,  // "09:00"
    string End     // "17:30"
);
```

**EF Core query for merged view (alternative to in-memory merge):**
For small datasets (single user × 1 month), an in-memory merge after two DB queries is fine:
1. `_context.WeeklyTemplates.Where(wt => wt.UserId == userId)` → template for all 7 days
2. `_context.AvailabilityOverrides.Where(ao => ao.UserId == userId && ao.Date >= start && ao.Date <= end)` → overrides for month
3. Merge in C# for each day of the month (max 31 iterations)

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Date arithmetic (days in month, weekday offsets, month navigation) | Manual date math | `date-fns` (`startOfMonth`, `endOfMonth`, `startOfWeek`, `endOfWeek`, `eachDayOfInterval`, `format`, `addMonths`) | Date math edge cases (leap years, timezone offsets, month boundaries) are notoriously bug-prone. `date-fns` is battle-tested and tree-shakeable. |
| HTTP client with 401 refresh | Custom fetch wrapper | Existing Axios `apiClient` with interceptor | Already built in Phase 1 — queue pattern prevents race conditions |
| Server state caching and refetching | Manual useEffect + state | TanStack React Query | Already installed; provides cache invalidation, refetch on focus, loading/error states |
| Month navigation ±3/+6 | Manual month validation logic | Simple bounds check with `isBefore`/`isAfter` from `date-fns` | Small logic but date-fns makes it readable and testable |
| Toast notifications | Custom toast | Existing Sonner (`toast.success`/`toast.error`) | Already installed and used in Phase 1 |
| Role-based identity | Custom user store | ASP.NET Core Identity `UserManager<ApplicationUser>` | Already configured; `_userManager.GetUserId(User)` gives the current user ID |

**Key insight:** This phase has very few "hidden complexity" domains. The main risk is date math (handled by `date-fns`) and the calendar merge algorithm (simple C# in-memory join). Everything else is straightforward CRUD with React Query and debounced saves.

## Common Pitfalls

### Pitfall 1: Side Panel State Desync After Debounced Save
**What goes wrong:** User edits Day A, side panel shows Day A's ranges. User clicks Day B, side panel switches to Day B. But the debounced save for Day A fires *after* the panel has switched, saving Day A's data into Day B's API call.

**Why it happens:** The debounce timer hasn't fired yet when the user clicks a different day. The stale closure captures the wrong day's date.

**How to avoid:** Cancel pending debounce when selected day changes. Or better: use the approach where each day's ranges are saved independently by extracting the save logic to a per-day effect keyed by the date string.

```typescript
// SAFE PATTERN: Save per day, keyed by date
const daysWithChanges = useRef<Map<string, TimeRange[]>>(new Map());

function handleRangeChange(date: string, ranges: TimeRange[]) {
  daysWithChanges.current.set(date, ranges);
}

// Flush saves for a specific day when user leaves it
useEffect(() => {
  return () => {
    const pending = daysWithChanges.current.get(selectedDate);
    if (pending) {
      saveOverride({ date: selectedDate, ranges: pending });
      daysWithChanges.current.delete(selectedDate);
    }
  };
}, [selectedDate]);
```

**Warning signs:** Console shows API calls with wrong dates; user edits Day 5 and Day 10 gets updated instead.

### Pitfall 2: Debounce + React Query Mutation Race
**What goes wrong:** Two rapid edits generate two debounced calls. The first call's response comes back, updating the cache. The second call uses stale data, overwriting the first.

**Why it happens:** Debounce delays execution. Two mutations may fire in sequence, and React Query's default `onSuccess` invalidation may cause the second mutation to operate on stale local state.

**How to avoid:** Use React Query's `useMutation` with `mutateAsync` and `onMutate` for cache updates. But the simplest approach for this case: send the *entire day's state* with each API call (not a delta), so the server does a full replace for that day.

```typescript
// Server-side: PUT /availability/overrides body contains ALL ranges for that day
// This makes the operation idempotent — no "merge" logic needed
{
  "date": "2026-05-22",
  "ranges": [
    { "start": "09:00", "end": "12:00" },
    { "start": "14:00", "end": "17:00" }
  ]
}
```

### Pitfall 3: Time Input Validation
**What goes wrong:** User enters "25:00" or "09:00" > "08:00" (end before start), or adds overlapping ranges.

**Why it happens:** Native `<input type="time">` restricts values to valid times but doesn't enforce logical ordering.

**How to avoid:** Validate on both client (zod schema, before debounce fires) and server (FluentValidation):
- Start must be before end
- Ranges must not overlap
- Time format must be HH:mm (already guaranteed by `<input type="time">`)

### Pitfall 4: EF Core Migration Startup in Clean Architecture
**What goes wrong:** `dotnet ef migrations add` fails because the startup project (Api) doesn't directly reference the Infrastructure project with DbContext.

**Why it happens:** EF Core design-time tools need to create an instance of DbContext at design time. With Clean Architecture, the DbContext is in Infrastructure, but the startup project is Api.

**How to avoid:** Run migrations with explicit startup project:
```bash
dotnet ef migrations add AddAvailability \
  --project src/backend/Infrastructure/Infrastructure.csproj \
  --startup-project src/backend/Api/Api.csproj \
  --output-dir Data/Migrations
```
The `--startup-project` flag tells EF Core to use Api.csproj for the IDesignTimeDbContextFactory, while `--project` tells it where to put the migration files. The Api.csproj already has `Microsoft.EntityFrameworkCore.Design` installed (confirmed — line 12-14 of Api.csproj).

## Code Examples

### Entity Models

```csharp
// src/backend/Domain/Entities/WeeklyTemplate.cs
namespace Domain.Entities;

public class WeeklyTemplate
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string UserId { get; set; } = string.Empty;
    public ApplicationUser User { get; set; } = null!;
    public DayOfWeek DayOfWeek { get; set; }
    public TimeOnly StartTime { get; set; }
    public TimeOnly EndTime { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
```

```csharp
// src/backend/Domain/Entities/AvailabilityOverride.cs
namespace Domain.Entities;

public class AvailabilityOverride
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string UserId { get; set; } = string.Empty;
    public ApplicationUser User { get; set; } = null!;
    public DateOnly Date { get; set; }
    public TimeOnly StartTime { get; set; }
    public TimeOnly EndTime { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
```

### EF Core Configuration

```csharp
// src/backend/Infrastructure/Data/Configurations/WeeklyTemplateConfiguration.cs
public class WeeklyTemplateConfiguration : IEntityTypeConfiguration<WeeklyTemplate>
{
    public void Configure(EntityTypeBuilder<WeeklyTemplate> builder)
    {
        builder.HasKey(wt => wt.Id);
        builder.HasIndex(wt => new { wt.UserId, wt.DayOfWeek });
        builder.Property(wt => wt.StartTime).HasColumnType("time");
        builder.Property(wt => wt.EndTime).HasColumnType("time");
        builder.HasOne(wt => wt.User)
               .WithMany()
               .HasForeignKey(wt => wt.UserId)
               .OnDelete(DeleteBehavior.Cascade);
    }
}
```

```csharp
// Updated src/backend/Infrastructure/Data/ApplicationDbContext.cs
public class ApplicationDbContext : IdentityDbContext<ApplicationUser>
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options) { }

    public DbSet<RefreshToken> RefreshTokens { get; set; } = null!;
    public DbSet<WeeklyTemplate> WeeklyTemplates { get; set; } = null!;
    public DbSet<AvailabilityOverride> AvailabilityOverrides { get; set; } = null!;

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);
        builder.ApplyConfiguration(new RefreshTokenConfiguration());
        builder.ApplyConfiguration(new WeeklyTemplateConfiguration());
        builder.ApplyConfiguration(new AvailabilityOverrideConfiguration());
    }
}
```

### Month Grid Component (Core Pattern)

```tsx
// src/features/availability/components/MonthGrid.tsx
import { useMemo } from 'react';
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, format, isSameMonth, isToday, addMonths
} from 'date-fns';
import { cn } from '@/lib/utils';

interface MonthGridProps {
  year: number;
  month: number; // 0-indexed
  onDayClick?: (date: string) => void;
  readOnly?: boolean;
  /** Map of "YYYY-MM-DD" -> CalendarDayDto */
  dayData?: Record<string, CalendarDayDto>;
}

export function MonthGrid({ year, month, onDayClick, readOnly = false, dayData }: MonthGridProps) {
  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(new Date(year, month)));
    const end = endOfWeek(endOfMonth(new Date(year, month)));
    return eachDayOfInterval({ start, end });
  }, [year, month]);

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div>
      {/* Month header */}
      <div className="grid grid-cols-7 mb-2">
        {dayNames.map(name => (
          <div key={name} className="text-center text-sm font-medium text-muted-foreground py-2">
            {name}
          </div>
        ))}
      </div>
      {/* Day grid */}
      <div className="grid grid-cols-7 border-l border-t">
        {days.map(date => {
          const dateStr = format(date, 'yyyy-MM-dd');
          const isCurrentMonth = isSameMonth(date, new Date(year, month));
          const today = isToday(date);
          const dayInfo = dayData?.[dateStr];
          const hasAvailability = dayInfo?.ranges.length > 0;

          return (
            <div
              key={dateStr}
              onClick={() => onDayClick?.(dateStr)}
              className={cn(
                'min-h-24 border-r border-b p-1',
                !readOnly && !isCurrentMonth && 'opacity-40',
                !readOnly && isCurrentMonth && 'cursor-pointer hover:bg-accent',
                today && 'ring-2 ring-primary ring-inset',
                readOnly && 'cursor-default',
              )}
            >
              <span className={cn(
                'text-sm',
                today ? 'font-bold text-primary' : 'font-medium',
                !isCurrentMonth && 'text-muted-foreground',
              )}>
                {format(date, 'd')}
              </span>
              {/* Availability bars */}
              {hasAvailability && dayInfo!.ranges.map((range, i) => (
                <div
                  key={i}
                  className={cn(
                    'mt-0.5 h-1.5 rounded-full',
                    readOnly ? 'bg-blue-400' : 'bg-green-500',
                  )}
                  title={`${range.start} - ${range.end}`}
                />
              ))}
              {/* "Override" indicator */}
              {dayInfo?.isOverride && (
                <span className="block text-[10px] text-orange-500 mt-0.5">override</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

### App.tsx Route Wiring

```tsx
// Updated App.tsx — add import and routes
import { MyCalendarPage } from '@/features/availability/pages/MyCalendarPage';
import { TemplateSetupPage } from '@/features/availability/pages/TemplateSetupPage';
import { UserDirectoryPage } from '@/features/availability/pages/UserDirectoryPage';
import { UserCalendarPage } from '@/features/availability/pages/UserCalendarPage';

function AppLayout() {
  return (
    <>
      <Navbar />
      <main>
        <Routes>
          <Route path="/" element={<MyCalendarPage />} />
          <Route path="/settings/availability" element={<TemplateSetupPage />} />
          <Route path="/users" element={<UserDirectoryPage />} />
          <Route path="/users/:userId" element={<UserCalendarPage />} />
        </Routes>
      </main>
    </>
  );
}
```

### Navbar Link Updates

```tsx
// Add to Navbar.tsx — inside the user-authenticated section
import { Link } from 'react-router-dom';
import { Calendar, Search } from 'lucide-react';

// Before the email display or user dropdown:
<Link to="/" className="flex items-center gap-1 text-sm hover:text-primary">
  <Calendar className="h-4 w-4" />
  My Calendar
</Link>
<Link to="/users" className="flex items-center gap-1 text-sm hover:text-primary">
  <Search className="h-4 w-4" />
  Find People
</Link>
```

### User Search/Directory Implementation

**API endpoint:**
```csharp
// GET /api/v1/users?search=john
[HttpGet]
public async Task<IActionResult> SearchUsers([FromQuery] string? search)
{
    var users = string.IsNullOrWhiteSpace(search)
        ? await _userManager.Users.Take(20).ToListAsync()
        : await _userManager.Users
            .Where(u => u.Email!.Contains(search))
            .Take(20)
            .ToListAsync();

    return Ok(users.Select(u => new { u.Id, u.Email }));
}
```

**Frontend pattern (matches existing login/register form pattern):**
```tsx
// Debounced search input — uses the same useDebounce hook
const [searchQuery, setSearchQuery] = useState('');
const debouncedSearch = useDebounce(searchQuery, 300);

const { data: users } = useQuery({
  queryKey: ['users', 'search', debouncedSearch],
  queryFn: () => userApi.search(debouncedSearch),
  enabled: debouncedSearch.length >= 0, // always fetch
});
```

### Merged Calendar Endpoint (Server-Side)

```csharp
// GET /api/v1/availability/calendar?month=2026-05
public async Task<List<CalendarDayDto>> GetCalendarAsync(string userId, string month)
{
    // Parse month to DateOnly range
    var parts = month.Split('-');
    var year = int.Parse(parts[0]);
    var monthNum = int.Parse(parts[1]);
    var startDate = new DateOnly(year, monthNum, 1);
    var endDate = startDate.AddMonths(1).AddDays(-1);

    // Fetch template and overrides
    var template = await _context.WeeklyTemplates
        .Where(wt => wt.UserId == userId)
        .ToListAsync();

    var overrides = await _context.AvailabilityOverrides
        .Where(ao => ao.UserId == userId && ao.Date >= startDate && ao.Date <= endDate)
        .ToListAsync();

    // Merge
    var result = new List<CalendarDayDto>();
    var current = startDate;
    while (current <= endDate)
    {
        var dayOverrides = overrides.Where(o => o.Date == current).ToList();
        if (dayOverrides.Any())
        {
            result.Add(new CalendarDayDto(
                current.ToString("yyyy-MM-dd"),
                true,
                dayOverrides.Select(o => new TimeRangeDto(
                    o.StartTime.ToString("HH:mm"),
                    o.EndTime.ToString("HH:mm")
                )).ToList()
            ));
        }
        else
        {
            var dayTemplate = template.Where(t => t.DayOfWeek == current.DayOfWeek).ToList();
            result.Add(new CalendarDayDto(
                current.ToString("yyyy-MM-dd"),
                false,
                dayTemplate.Select(t => new TimeRangeDto(
                    t.StartTime.ToString("HH:mm"),
                    t.EndTime.ToString("HH:mm")
                )).ToList()
            ));
        }
        current = current.AddDays(1);
    }

    return result;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| FullCalendar React for all calendar UIs | Custom month grid with shadcn/ui + Tailwind | Phase 2 (D-06) | Lighter bundle, more control over per-day rendering, click-to-panel UX not possible in FullCalendar |
| Save button on forms | Auto-save with debounce | Phase 2 (D-09) | Removes cognitive load; user never has to remember to save |
| Single availability model | Split template + override tables | Phase 2 (D-03) | Enables recurring weekly pattern without duplicating 365 records per user |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `date-fns` is needed and compatible with React 19 | Standard Stack | If not needed, avoid an extra dependency. Verification: date-fns is the standard JS date utility and works with all React versions. |
| A2 | The month grid + side panel UX performs well enough without virtualization | Architecture Patterns | For a single-month view (35 cells max), performance is fine. Only becomes an issue if showing 12 months at once — not the case here. |
| A3 | Users are all in the same timezone (D-17) | User Constraints | If timezone differences are needed later, stored `time` values would need schema migration to include timezone offset. Deferred to v2. |
| A4 | Debounce + full-replace per-day is simpler than delta-sync | Architecture Patterns | If network latency is high (>500ms), debounced saves may feel laggy. Mitigation: debounce can be tuned down, or explicit Save button could be added. |

## Open Questions

1. **Should `date-fns` locale be configured for the app, or is default English fine?**
   - What we know: `date-fns` defaults to English. Month names and day names display as-is.
   - What's unclear: No internationalization requirement stated in v1.
   - **Recommendation:** Skip locale config for v1. Use default English formatting.

2. **What exact animation/transition for the side panel?**
   - What we know: shadcn `Sheet` component has slide-in animation built-in.
   - What's unclear: Speed and easing preferences.
   - **Recommendation:** Use default shadcn Sheet animation. Add to discretion list.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| SQL Server (local MSSQLSERVER) | EF Core migrations, data persistence | ✓ (via appsettings.json: `Server=localhost`) | SQL Server 2017+ | — |
| Node.js / npm | Building and running React client | ✓ | per Phase 1 setup | — |
| .NET SDK 8 | Building and running ASP.NET API | ✓ | 8.0.x | — |

**Missing dependencies with no fallback:** none
**Missing dependencies with fallback:** none

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | (not yet determined — no test files found in repo) |
| Config file | none detected |
| Quick run command | `dotnet test` or `npm test` (to be configured) |
| Full suite command | `dotnet test` or `npm test` |

### Phase Requirements → Test Map
*(No test infrastructure currently exists in the project. Phase 2 should establish basic patterns.)*

### Sampling Rate
- **Per task commit:** Manual verification (no test tooling yet)
- **Wave merge:** Manual verification + visual review of calendar
- **Phase gate:** Verification against CAL-01, CAL-02 acceptance criteria

### Wave 0 Gaps
- [ ] No test framework installed for backend or frontend
- [ ] Future phase should add testing infrastructure

## Security Domain

(security_enforcement is not explicitly set in config — included by default.)

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V4 Access Control | yes | `[Authorize]` attribute on all controllers; verify userId ownership |
| V5 Input Validation | yes | FluentValidation on API DTOs; Zod on frontend schemas |
| V8 Data Protection | yes | HttpOnly cookies for auth (existing); no PII in responses |

### Known Threat Patterns for ASP.NET Core + React

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| IDOR — User A modifies User B's availability by guessing userId | Elevation of Privilege | Always use `_userManager.GetUserId(User)` from JWT claims for OWN data. For viewing others' data: `GET /calendar?userId=X&month=Y` is read-only, so IDOR impact is limited to viewing — acceptable for v1. |
| CSRF on auto-save endpoints | Tampering | Mitigated by SameSite=Lax cookies (already configured) and no cookie-based auth for writes (all requests include credentials). |
| Mass assignment — user sends extra fields in override body | Tampering | FluentValidation on request DTOs rejects unknown fields. EF Core only binds to the DTO, not directly to entities. |

## Sources

### Primary (HIGH confidence)
- [Codebase inspection] — All Phase 1 patterns verified by reading existing files: AuthController, Program.cs, ApplicationDbContext, client.ts, AuthContext.tsx, App.tsx, Navbar.tsx
- [npm registry] — date-fns package confirmed available, >100M weekly downloads, MIT license

### Secondary (MEDIUM confidence)
- [Stack Overflow] — EF Core migrations with Clean Architecture pattern (`--startup-project` + `--project` flags) — verified against existing project structure
- [Microsoft Learn docs] — EF Core migrations, separate migrations project, DbContext configuration patterns
- [npm registry] — use-debounce package exists but not needed (custom hook is simpler)

### Tertiary (LOW confidence)
- None — all technical claims verified against codebase or official sources

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — verified against existing codebase structure, no new frameworks needed
- Architecture: HIGH — patterns match existing code (React Query, Axios, AuthController pattern, Clean Architecture layers)
- Pitfalls: MEDIUM — debounce + React Query race condition is an educated prediction based on common React bugs, not a codebase-specific finding

**Research date:** 2026-05-22
**Valid until:** 2026-06-22 (stable libraries, no fast-moving dependencies)
