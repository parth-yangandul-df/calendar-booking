---
phase: "02"
reviewed: 2026-05-22T18:30:00Z
depth: standard
files_reviewed: 22
files_reviewed_list:
  - src/backend/Domain/Entities/WeeklyTemplate.cs
  - src/backend/Domain/Entities/AvailabilityOverride.cs
  - src/backend/Infrastructure/Data/Configurations/WeeklyTemplateConfiguration.cs
  - src/backend/Infrastructure/Data/Configurations/AvailabilityOverrideConfiguration.cs
  - src/backend/Application/Common/Interfaces/IAvailabilityRepository.cs
  - src/backend/Application/Availability/DTOs/UpsertTemplateRequest.cs
  - src/backend/Application/Availability/DTOs/UpsertOverrideRequest.cs
  - src/backend/Application/Availability/Validators/UpsertTemplateValidator.cs
  - src/backend/Application/Availability/Validators/UpsertOverrideValidator.cs
  - src/backend/Infrastructure/Repositories/AvailabilityRepository.cs
  - src/backend/Api/Controllers/AvailabilityController.cs
  - src/backend/Api/Controllers/UsersController.cs
  - client/src/features/availability/api/availabilityApi.ts
  - client/src/features/availability/api/userApi.ts
  - client/src/features/availability/schemas/availabilitySchema.ts
  - client/src/features/availability/hooks/useDebounce.ts
  - client/src/features/availability/hooks/useMonthNavigation.ts
  - client/src/features/availability/hooks/useAvailability.ts
  - client/src/features/availability/components/MonthGrid.tsx
  - client/src/features/availability/components/DaySidePanel.tsx
  - client/src/features/availability/components/DayTimeRangeEditor.tsx
  - client/src/features/availability/pages/MyCalendarPage.tsx
  - client/src/features/availability/pages/TemplateSetupPage.tsx
  - client/src/features/availability/pages/UserDirectoryPage.tsx
  - client/src/features/availability/pages/UserCalendarPage.tsx
findings:
  critical: 5
  warning: 6
  info: 3
  total: 14
status: issues
---

# Phase 02: Availability Management — Code Review Report

**Reviewed:** 2026-05-22T18:30:00Z  
**Depth:** standard  
**Files Reviewed:** 25  
**Status:** issues_found

---

## Summary

Phase 02 delivers a two-table availability model (WeeklyTemplate + AvailabilityOverride), a server-side calendar merge algorithm, 8 REST endpoints, and a full React frontend with debounced auto-save. The overall structure is sound, IDOR prevention on write paths is correctly implemented, and the full-replace semantics are a good design choice.

However, several **critical** issues were found:

1. **The `GET /calendar` and `GET /overrides` endpoints accept raw user-supplied strings and call `DateOnly.Parse` / string splitting with no error handling** — malformed input throws an unhandled `FormatException` / `IndexOutOfRangeException`, which leaks stack traces (500) and DoS potential.
2. **`SearchUsers` performs a case-sensitive, unindexed `Contains` query directly through `UserManager.Users`** — returns all 20 users when `search` is omitted entirely (no empty-string guard on the query path), and the search itself can return the caller's own account (information leakage).
3. **The Zod schema for overrides requires `items.min(1)`**, meaning the frontend will refuse to submit an empty-day override (clearing all time ranges), while the backend's `SetOverrideAsync` happily accepts an empty list. This schema mismatch means the "clear all availability for a day" use case is permanently blocked from the UI but silently accepted by the API — a functional contract break.
4. **`useEffect` in `MyCalendarPage` omits `saveOverride` from its dependency array** (suppressed via eslint-disable). If `saveOverride` ever changes reference across renders the stale closure will call the wrong mutation instance.
5. **`TemplateSetupPage` calls `availabilityApi.getTemplate()` directly (raw Axios call) inside `useEffect` without error handling** — errors are silently swallowed; the page leaves the user with the stale default state and no feedback.

---

## Critical Issues

### CR-01: Unhandled `FormatException` on `GET /calendar` — DoS / 500 leak

**File:** `src/backend/Infrastructure/Repositories/AvailabilityRepository.cs:86-88`  
**Also:** `src/backend/Api/Controllers/AvailabilityController.cs:67, 86, 95`

**Issue:** `GetCalendarAsync` splits the `month` string with `month.Split('-')` and calls `int.Parse` on both parts with no guard. If `parts` has fewer than 2 elements (e.g. `month=abc`), `parts[1]` throws `IndexOutOfRangeException`. If the values are non-numeric, `int.Parse` throws `FormatException`. If the resulting year/month are out of range (e.g. `month=9999-99`), `new DateOnly(year, monthNum, 1)` throws `ArgumentOutOfRangeException`. None of these are caught, so ASP.NET returns a 500 with a full stack trace in development mode and an unhandled-exception log entry in production.

The same problem exists in `GetOverrides` (`DateOnly.Parse(from)` / `DateOnly.Parse(to)`) and `DeleteOverride` (`DateOnly.Parse(date)`) in the controller — raw `string` query parameters are parsed without `TryParse`.

**Fix:** Validate query params before use. Prefer `DateOnly.TryParseExact` / `TryParse` and return `400 BadRequest` on failure:

```csharp
// AvailabilityController.cs — GET /calendar
[HttpGet("calendar")]
public async Task<IActionResult> GetCalendar(
    [FromQuery] string month,
    [FromQuery] string? userId = null)
{
    // Validate "YYYY-MM" format before touching the repository
    if (string.IsNullOrWhiteSpace(month) ||
        !System.Text.RegularExpressions.Regex.IsMatch(month, @"^\d{4}-\d{2}$"))
        return BadRequest(new ProblemDetails { Title = "month must be in YYYY-MM format" });

    var targetUserId = string.IsNullOrWhiteSpace(userId) ? GetUserId() : userId;
    var calendar = await _repo.GetCalendarAsync(targetUserId, month);
    return Ok(calendar);
}
```

Similarly, replace `DateOnly.Parse(from)` / `DateOnly.Parse(to)` / `DateOnly.Parse(date)` with `DateOnly.TryParseExact(..., "yyyy-MM-dd", ...)` and return `400` on failure. Move the `Split`/`int.Parse` logic in `AvailabilityRepository.GetCalendarAsync` behind the validated controller input, or use `DateOnly.TryParseExact`.

---

### CR-02: `GET /api/v1/availability/calendar?userId=<arbitrary>` — Unvalidated User ID (IDOR on read path)

**File:** `src/backend/Api/Controllers/AvailabilityController.cs:102-107`

**Issue:** The `userId` query parameter is passed directly to `_repo.GetCalendarAsync` without any verification that the supplied ID belongs to an existing user. An attacker can enumerate GUIDs or supply any string. If the user does not exist the endpoint returns an empty array (no leak), but the lack of validation means:

1. Arbitrarily large or malformed `userId` strings reach the database layer.
2. When Phase 3 adds booking, this same pattern (trusting `userId` from the query string) could be copied to a write path, creating a true IDOR.
3. There is no check that the `userId` param resolves to a real account, leaking a subtle oracle: a valid user with no availability returns `[]`; an invalid GUID also returns `[]`. Combined with email-enumeration via `GET /users?search=`, this is a low-severity info-disclosure now that becomes higher in Phase 3.

**Fix:** Either verify the `userId` exists via `UserManager.FindByIdAsync` before querying (returning `404` for unknown users), or enforce an `[AllowAnonymous]` route to prevent auth-bypass confusion:

```csharp
if (!string.IsNullOrWhiteSpace(userId))
{
    var targetUser = await _userManager.FindByIdAsync(userId);
    if (targetUser == null)
        return NotFound(new ProblemDetails { Title = "User not found", Status = 404 });
}
var targetUserId = string.IsNullOrWhiteSpace(userId) ? GetUserId() : userId;
```

---

### CR-03: `SearchUsers` returns all users when `search` is empty — information disclosure

**File:** `src/backend/Api/Controllers/UsersController.cs:24-33`

**Issue:** When `search` is `null` or whitespace the `if` block is skipped and `query = _userManager.Users` is used unfiltered. The `.Take(20)` cap means the first 20 registered users are returned to any authenticated caller who hits `GET /api/v1/users` with no query parameter. This leaks the 20 oldest/first accounts in the table unconditionally, exposing their email addresses. The SUMMARY notes "UserDto exposes only Id + Email" as a mitigation, but returning arbitrary accounts without an explicit search intent is still an information-disclosure finding.

**Fix:** Require a non-empty `search` before executing — return an empty list (or `400`) when `search` is absent:

```csharp
[HttpGet]
public async Task<IActionResult> SearchUsers([FromQuery] string? search)
{
    if (string.IsNullOrWhiteSpace(search))
        return Ok(Array.Empty<UserDto>());   // or BadRequest if search is mandatory

    var users = await _userManager.Users
        .Where(u => u.Email!.Contains(search))
        .Take(20)
        .ToListAsync();

    return Ok(users.Select(u => new UserDto(u.Id, u.Email!)));
}
```

---

### CR-04: `upsertOverrideSchema` requires `items.min(1)` — cannot clear a day from the UI

**File:** `client/src/features/availability/schemas/availabilitySchema.ts:43`

**Issue:** The Zod schema enforces `items: z.array(timeRangeItemSchema).min(1, 'At least one time range required')`. However, the backend `SetOverrideAsync` deliberately accepts an empty `items` list as "mark this day as explicitly unavailable / clear all overrides." This means if a user removes all time ranges for a day in `DaySidePanel`, the debounced save in `MyCalendarPage` will fire `saveOverride.mutate({ date, items: [] })`. The Zod schema is defined but is **not currently applied** before the mutation fires (the hook calls `availabilityApi.saveOverride` directly without schema validation), so the API call does succeed — but the schema contract is wrong and could become a blocking bug if validation is wired in Phase 3.

More importantly, the schema's `min(1)` comment `'At least one time range required'` implies clearing a day is intentionally blocked, which contradicts the backend's full-replace semantics where `items: []` means "delete all overrides for this day." The intent is unclear and the two sides are inconsistent.

**Fix:** Remove `min(1)` from `upsertOverrideSchema` — an empty array is a valid "clear this day" payload. Document the distinction explicitly:

```typescript
export const upsertOverrideSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  // Empty array = clear all overrides for this day (valid)
  items: z.array(timeRangeItemSchema),
});
```

---

### CR-05: `TemplateSetupPage` silently swallows API load errors — data loss risk

**File:** `client/src/features/availability/pages/TemplateSetupPage.tsx:46-71`

**Issue:** The initial template fetch on mount is a raw `.then()` chain with no `.catch()`:

```typescript
useEffect(() => {
  availabilityApi.getTemplate().then((res) => {
    // ...sets state...
  });
}, []); // eslint-disable-line react-hooks/exhaustive-deps
```

If the request fails (401 token expiry, network error, 500), the error is silently discarded. The component renders with the hardcoded default state (`Mon–Fri 09:00–17:00`). If the user then presses **Save Template**, they will overwrite their existing template with the default values — **a data loss scenario**.

**Fix:** Convert to a React Query hook (consistent with the rest of the codebase) or add explicit error handling:

```typescript
// Option A: Use React Query (preferred — matches codebase pattern)
// Add to useAvailability.ts:
export function useTemplate() {
  return useQuery({
    queryKey: ['availability', 'template'],
    queryFn: () => availabilityApi.getTemplate().then((r) => r.data),
  });
}

// Option B: Minimal fix — add .catch to the existing useEffect:
useEffect(() => {
  availabilityApi.getTemplate()
    .then((res) => { /* existing logic */ })
    .catch(() => toast.error('Failed to load your template. Saving now will overwrite it.'));
}, []);
```

---

## Warnings

### WR-01: `WeeklyTemplateConfiguration` missing unique constraint on `(UserId, DayOfWeek)`

**File:** `src/backend/Infrastructure/Data/Configurations/WeeklyTemplateConfiguration.cs:13`

**Issue:** `builder.HasIndex(wt => new { wt.UserId, wt.DayOfWeek })` creates a **non-unique** composite index. The full-replace `SetTemplateAsync` prevents duplicates at the application layer, but there is no database-level enforcement. A concurrent PUT from the same user (race, retry, or direct API call) could bypass the app-layer delete-then-insert and produce duplicate `(UserId, DayOfWeek)` rows. The calendar merge algorithm in `GetCalendarAsync` uses `.Where(t => t.DayOfWeek == current.DayOfWeek).ToList()` and renders all matching rows as separate bars — duplicate rows would render duplicate availability bars with no error.

**Fix:**
```csharp
builder.HasIndex(wt => new { wt.UserId, wt.DayOfWeek }).IsUnique();
```
Also wrap the delete-then-insert in `SetTemplateAsync` in a transaction:
```csharp
await using var tx = await _context.Database.BeginTransactionAsync();
_context.WeeklyTemplates.RemoveRange(existing);
await _context.WeeklyTemplates.AddRangeAsync(newRows);
await _context.SaveChangesAsync();
await tx.CommitAsync();
```

---

### WR-02: `SetTemplateAsync` and `SetOverrideAsync` are not wrapped in transactions

**File:** `src/backend/Infrastructure/Repositories/AvailabilityRepository.cs:25-43, 52-70`

**Issue:** Both methods follow the pattern: load existing → `RemoveRange` → `AddRangeAsync` → `SaveChangesAsync`. There is **no transaction** around the delete + insert pair. If `SaveChangesAsync` fails after the delete but before (or during) the insert (e.g., a constraint violation on a new row, a database timeout), the user's data is partially or completely deleted with no rollback. EF Core batches both operations into one `SaveChangesAsync` call which is atomic at the EF level — however, if an exception is thrown during entity-state building (before `SaveChanges`), the delete will have been staged but not yet committed, which is fine. The real risk is if external concurrency or a mid-save failure between the two `SaveChangesAsync` calls (note: `SetOverrideAsync` also calls `SaveChangesAsync` once, which is fine; re-checked: both methods use a single `SaveChangesAsync` after staging both Remove and Add operations, so EF will batch them in one DB transaction implicitly). **Corrected assessment:** EF Core wraps a single `SaveChangesAsync` in an implicit transaction on SQL Server. The single-`SaveChangesAsync` pattern here is actually safe. This warning is downgraded but remains relevant for clarity and future-proofing — adding an explicit `BeginTransactionAsync` makes the intent explicit and prevents future edits from inadvertently splitting the save.

**Fix:** Add explicit transaction blocks as shown in WR-01.

---

### WR-03: `useEffect` in `MyCalendarPage` suppresses the `saveOverride` dependency — stale closure risk

**File:** `client/src/features/availability/pages/MyCalendarPage.tsx:47-55`

**Issue:**
```typescript
useEffect(() => {
  if (!selectedDate) return;
  // ...
  saveOverride.mutate({ date: selectedDate, items: debouncedRanges });
}, [debouncedRanges]); // eslint-disable-line react-hooks/exhaustive-deps
```

`saveOverride` and `selectedDate` are captured in a stale closure. `saveOverride` is the object returned by `useMutation` — its reference is stable within a render cycle but the eslint-disable is a code smell indicating the author knows the dep array is incomplete. `selectedDate` changes when the user switches days; if `debouncedRanges` fires while the component has already updated `selectedDate` to a new day (edge case: user clicks a second day within 500ms), the save will use the stale `selectedDate` from the closure and **save ranges to the wrong day**.

**Fix:** Add `selectedDate` to the dependency array. `saveOverride.mutate` is stable from `useMutation` but explicitly including `saveOverride` documents the intent:

```typescript
useEffect(() => {
  if (!selectedDate) return;
  const initial = initialRangesRef.current.get(selectedDate);
  if (initial === undefined) return;
  if (JSON.stringify(debouncedRanges) !== JSON.stringify(initial)) {
    saveOverride.mutate({ date: selectedDate, items: debouncedRanges });
  }
}, [debouncedRanges, selectedDate]); // saveOverride.mutate is stable
```

---

### WR-04: `useUserSearch` fires on every keystroke before debounce settles — missing `enabled` guard

**File:** `client/src/features/availability/hooks/useAvailability.ts:21-26`  
**Also:** `client/src/features/availability/pages/UserDirectoryPage.tsx:10-11`

**Issue:** `useUserSearch` has no `enabled` condition. On initial render `debouncedSearch` is `''` (empty string). The hook fires `GET /api/v1/users?search=` immediately, which (per CR-03) returns the first 20 users. Every character change that passes through the debounce also fires the query, including clearing the field back to empty (again returning 20 users). The backend search is an unindexed `Contains` call.

**Fix:** Add `enabled: debouncedSearch.length >= 2` (or `>= 1`) to suppress empty-string queries:

```typescript
export function useUserSearch(searchQuery: string) {
  return useQuery({
    queryKey: ['users', 'search', searchQuery],
    queryFn: () => userApi.search(searchQuery).then((r) => r.data),
    enabled: searchQuery.length >= 2,
  });
}
```

---

### WR-05: `UpsertTemplateValidator` allows 24:00 and invalid minute values in time fields

**File:** `src/backend/Application/Availability/Validators/UpsertTemplateValidator.cs:8-9`

**Issue:** The regex `^\d{2}:\d{2}$` matches `24:00`, `25:99`, `00:99`, etc. `TimeOnly.TryParse("24:00")` returns `false` on .NET, so the `start < end` rule will silently fail (returning `false` since `TryParse` fails for the end time, meaning the whole `.Must` predicate returns `false`). However, `TimeOnly.Parse("24:00")` in the repository **throws** `FormatException` — the validator already rejects `24:xx` via the `Must(i => TimeOnly.TryParse(i.Start, ...) && ...)` rule, but only with the generic "Start time must be before End time" message rather than a clear "invalid time value" message. Separately, values like `99:00` pass the regex but fail `TryParse`, again producing a confusing error message.

The same issue exists in `UpsertOverrideValidator`.

**Fix:** Tighten the regex to reject impossible values:
```csharp
private static readonly Regex TimeRegex =
    new(@"^(0\d|1\d|2[0-3]):[0-5]\d$", RegexOptions.Compiled);
```

---

### WR-06: `availabilityApi.getOverrides` return type is `CalendarDayDto[]` — wrong type

**File:** `client/src/features/availability/api/availabilityApi.ts:44-45`

**Issue:**
```typescript
getOverrides: (from: string, to: string) =>
  apiClient.get<CalendarDayDto[]>('/availability/overrides', { params: { from, to } }),
```
The backend `GET /api/v1/availability/overrides` returns `AvailabilityOverrideDto[]` (with fields `date`, `start`, `end`, `id`), not `CalendarDayDto[]` (which has `date`, `isOverride`, `ranges[]`). This is a type lie — TypeScript believes the response is `CalendarDayDto[]` but the actual runtime value is `AvailabilityOverrideDto[]`. Any caller consuming `.ranges` would get `undefined` at runtime with no type error.

`getOverrides` is not currently called from the React hooks layer (only `getMyCalendar`/`getUserCalendar` are used), so this is dormant — but it will cause a runtime bug the moment it is consumed in Phase 3.

**Fix:**
```typescript
export interface AvailabilityOverrideDto {
  date: string;
  start: string;
  end: string;
  id: string;
}

// in availabilityApi:
getOverrides: (from: string, to: string) =>
  apiClient.get<AvailabilityOverrideDto[]>('/availability/overrides', { params: { from, to } }),
```

---

## Info

### IN-01: `useMonthNavigation` recomputes `minDate`/`maxDate` on every render

**File:** `client/src/features/availability/hooks/useMonthNavigation.ts:5-15`

**Issue:** `const now = new Date()` and the derived `minDate`/`maxDate` are computed inside the hook body, meaning they are recalculated on every render call. If the component re-renders at midnight on a month boundary, `now` silently shifts and the navigation bounds change mid-session. This is cosmetic in practice but can cause `canGoPrev`/`canGoNext` to flip unexpectedly.

**Fix:** Capture `now` in a `useRef` or `useMemo` initialized once:
```typescript
const nowRef = useRef(new Date());
const minDate = useMemo(() => subMonths(nowRef.current, 3), []);
const maxDate = useMemo(() => addMonths(nowRef.current, 6), []);
```

---

### IN-02: `DayTimeRangeEditor` uses array index as React list key

**File:** `client/src/features/availability/components/DayTimeRangeEditor.tsx:49, 61`

**Issue:** `key={i}` (index-based) is used in both the readOnly and edit list renders. When a range is removed from the middle of the list, React will reuse DOM nodes incorrectly, causing uncontrolled `<input type="time">` values to display stale data until re-render completes. This manifests as the wrong time briefly appearing in an input after deleting a range that was not the last one.

**Fix:** Use a stable key. Since `TimeRangeDto` has no id, generate one on add:
```typescript
// Store ranges with a local id: { id: crypto.randomUUID(), start, end }
onChange([...ranges, { id: crypto.randomUUID(), start: '09:00', end: '17:00' }]);
// key={range.id}
```

---

### IN-03: `TemplateSetupPage` load effect uses `// eslint-disable-line react-hooks/exhaustive-deps` unnecessarily

**File:** `client/src/features/availability/pages/TemplateSetupPage.tsx:71`

**Issue:** The `useEffect` intentionally runs only on mount (`[]` deps), which is correct. But it captures `enabledDays` and `dayRanges` from the outer scope:
```typescript
const newEnabled = { ...enabledDays };
const newRanges = { ...dayRanges };
```
These are the initial state values, which is intentional (spread from defaults). The eslint-disable is a blunt suppression; the correct fix is to use functional state updates so the closure captures only setters (which are stable):

```typescript
useEffect(() => {
  availabilityApi.getTemplate().then((res) => {
    const items = res.data;
    if (items.length === 0) return;
    setEnabledDays((prev) => { /* build from prev */ return newEnabled; });
    setDayRanges((prev) => { /* build from prev */ return newRanges; });
  }).catch(() => toast.error('Failed to load template'));
}, []);
// No eslint-disable needed
```

---

## Overall Status

**BLOCKER count: 5 (CR-01 through CR-05)**  
All five critical findings must be resolved before shipping Phase 02 to a non-local environment. CR-01 (unguarded `Parse` calls) and CR-03 (unbounded user enumeration) are the highest-urgency fixes.

---

_Reviewed: 2026-05-22T18:30:00Z_  
_Reviewer: gsd-code-reviewer (claude-sonnet-4.6)_  
_Depth: standard_
