---
phase: 04-admin-dashboard
reviewed: 2026-05-26T00:00:00Z
depth: standard
files_reviewed: 13
files_reviewed_list:
  - src/backend/Application/Admin/DTOs/PagedResponse.cs
  - src/backend/Application/Admin/DTOs/AdminUserDto.cs
  - src/backend/Application/Admin/DTOs/AdminBookingDto.cs
  - src/backend/Application/Admin/DTOs/AdminStatsDto.cs
  - src/backend/Api/Controllers/AdminController.cs
  - src/backend/Api/Program.cs
  - client/src/features/admin/api/adminApi.ts
  - client/src/features/admin/components/AdminGuard.tsx
  - client/src/features/admin/components/StatCard.tsx
  - client/src/features/admin/components/PaginationBar.tsx
  - client/src/features/admin/pages/AdminPage.tsx
  - client/src/App.tsx
  - client/src/components/layout/Navbar.tsx
findings:
  critical: 2
  warning: 3
  info: 2
  total: 7
status: fixed
---

# Phase 04: Code Review Report

**Reviewed:** 2026-05-26  
**Depth:** standard  
**Files Reviewed:** 13  
**Status:** fixed

## Summary

Phase 04 implements the admin dashboard: backend read-only endpoints for stats, users, and bookings, a React `AdminGuard` component, and an `AdminPage` with tabbed UI. The backend `AdminOnly` policy and JWT claim enforcement are correctly structured. However, two critical security defects exist: the Hangfire dashboard is publicly accessible without any authorization, and there is no input length cap on the email search parameter. Three warnings round out the review: dead code, a misleading toast when unauthenticated users hit `/admin`, and an incorrect Radix UI `<Tabs>` nesting pattern in `BookingsTab`.

---

## Critical Issues

### CR-01: Hangfire Dashboard Exposed Without Authorization

**File:** `src/backend/Api/Program.cs:125`  
**Issue:** `app.UseHangfireDashboard("/hangfire")` is registered with no authorization filter. Any user — authenticated or not — can access `/hangfire`, view the job queue, trigger retries, delete jobs, and inspect job arguments (which may contain email addresses or booking IDs). This is a significant information-disclosure and privilege-escalation risk.  
**Fix:**
```csharp
// Add an authorization filter to restrict dashboard to admins only
app.UseHangfireDashboard("/hangfire", new DashboardOptions
{
    Authorization = new[]
    {
        new HangfireAdminAuthorizationFilter()
    }
});

// HangfireAdminAuthorizationFilter.cs
public class HangfireAdminAuthorizationFilter : IDashboardAuthorizationFilter
{
    public bool Authorize(DashboardContext context)
    {
        var httpContext = context.GetHttpContext();
        return httpContext.User.Identity?.IsAuthenticated == true
            && httpContext.User.HasClaim("IsAdmin", "true");
    }
}
```

---

### CR-02: Unbounded Search Parameter Allows Excessive Query Load

**File:** `src/backend/Api/Controllers/AdminController.cs:53-54`  
**Issue:** The `search` query parameter has no length constraint. A caller can supply a multi-kilobyte string which EF Core translates to `LIKE '%<large string>%'`. While the string is parameterized (no SQL injection risk), extremely long patterns cause unnecessary CPU and I/O load on SQL Server and can be used as a denial-of-service vector against the admin endpoint. The endpoint is admin-only, but a compromised admin account or SSRF would be sufficient.  
**Fix:**
```csharp
// Add MaxLength validation before using the search parameter
if (!string.IsNullOrWhiteSpace(search) && search.Length > 100)
    return BadRequest("Search term must not exceed 100 characters.");

if (!string.IsNullOrWhiteSpace(search))
    query = query.Where(u => u.Email!.Contains(search));
```

---

## Warnings

### WR-01: Dead Code — `GetUserId()` Never Called in AdminController

**File:** `src/backend/Api/Controllers/AdminController.cs:28`  
**Issue:** The private helper `GetUserId()` is defined but never invoked anywhere in `AdminController`. This is dead code that implies the method was copied from another controller and not cleaned up. It also uses the null-forgiving operator (`!`) on `GetUserId()`'s return — if called, a missing user claim would throw a `NullReferenceException` at runtime.  
**Fix:** Remove the unused method entirely.
```csharp
// Delete this line:
private string GetUserId() => _userManager.GetUserId(User)!;
```

---

### WR-02: AdminGuard Shows Wrong Toast for Unauthenticated Users

**File:** `client/src/features/admin/components/AdminGuard.tsx:11`  
**Issue:** The `useEffect` condition is `!isLoading && !user?.isAdmin`. When `user` is `null` (not logged in), `user?.isAdmin` is `undefined`, so `!user?.isAdmin` is `true` — the "You don't have permission" toast fires for unauthenticated users. Those users are actually not logged in at all, not lacking admin permission. The `ProtectedRoute` wrapper will redirect them to `/login`, but the toast fires first, giving a misleading message. If the auth loading state is momentarily false before the redirect completes, this toast is visible.  
**Fix:** Guard the toast on `user` being non-null:
```tsx
useEffect(() => {
  if (!isLoading && user && !user.isAdmin && !hasShownToast.current) {
    hasShownToast.current = true;
    toast.error("You don't have permission to access this page.");
  }
}, [isLoading, user]);
```

---

### WR-03: Incorrect Radix UI Tabs Nesting in BookingsTab

**File:** `client/src/features/admin/pages/AdminPage.tsx:176-184`  
**Issue:** `BookingsTab` renders an inner `<Tabs value={statusFilter} onValueChange={handleStatusChange}>` that contains only `<TabsList>` with `<TabsTrigger>` elements — there are no `<TabsContent>` children inside this inner `<Tabs>`. The booking table content is rendered *outside* the `<Tabs>` provider entirely (lines 186–258). Radix UI's `Tabs` component uses React context to connect `TabsContent` to the active tab state; content rendered outside the provider is not connected. This means the `TabsContent` isolation/accessibility contract is broken. While the filter visually "works" because `statusFilter` state is separate from the Radix context, it creates an invalid component tree that can break with Radix updates, produces incorrect ARIA attributes (`aria-selected` on triggers without matching `tabpanel` IDs), and fails accessibility audits.  
**Fix:** Either remove the inner `<Tabs>` wrapper and replace it with plain styled buttons for filter selection, or restructure to include `<TabsContent>` blocks inside the inner `<Tabs>`:
```tsx
// Option A (simpler): Replace inner <Tabs> with filter buttons
<div className="flex gap-2 mb-4">
  {['all', 'Pending', 'Confirmed', 'Declined', 'Cancelled'].map((s) => (
    <Button
      key={s}
      variant={statusFilter === s ? 'default' : 'outline'}
      size="sm"
      onClick={() => handleStatusChange(s)}
    >
      {s === 'all' ? 'All' : s}
    </Button>
  ))}
</div>
```

---

## Info

### IN-01: CORS Origin Hardcoded for Development

**File:** `src/backend/Api/Program.cs:85`  
**Issue:** `"http://localhost:5173"` is hardcoded as the allowed CORS origin. This must be replaced with a configuration-driven value before production deployment; it will silently block legitimate origins or require a code change.  
**Fix:**
```csharp
var allowedOrigin = builder.Configuration["Cors:AllowedOrigin"] ?? "http://localhost:5173";
policy.WithOrigins(allowedOrigin)
      .AllowCredentials()
      .AllowAnyHeader()
      .AllowAnyMethod();
```

---

### IN-02: `AdminUserDto` Uses `DateTime` Without Timezone Annotation

**File:** `src/backend/Application/Admin/DTOs/AdminUserDto.cs:6`  
**Issue:** `CreatedAt` is typed as `DateTime` (unspecified Kind). If the database returns UTC datetimes but the `DateTime.Kind` is `Unspecified`, JSON serialization will not include a `Z` suffix, causing the frontend to interpret the timestamp in local browser time. This will produce wrong "Created At" displays for users in non-UTC timezones.  
**Fix:** Use `DateTimeOffset` for all timestamp fields in DTOs, or configure EF Core to return `DateTime` with `DateTimeKind.Utc`, and ensure the JSON serializer appends `Z`.
```csharp
public record AdminUserDto(
    string Id,
    string Email,
    DateTimeOffset CreatedAt,  // Use DateTimeOffset
    bool IsAdmin,
    int BookingCount
);
```
The same applies to `AdminBookingDto.CreatedAt`.

---

_Reviewed: 2026-05-26_  
_Reviewer: the agent (gsd-code-reviewer)_  
_Depth: standard_
