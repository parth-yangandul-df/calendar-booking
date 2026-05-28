# Phase 4: Admin Dashboard

**Status:** ✅ Complete (2026-05-26)
**Requirements:** ADMIN-02, ADMIN-03
**Plans:** 2/2 executed

---

## What Was Built

### Plan 01 — Admin Backend

- `AdminController` at `/api/v1/admin/` with 3 endpoints:
  - `GET /stats` — `{ totalUsers, totalBookings }`
  - `GET /users?page=&pageSize=&search=` — paginated user list with email, createdAt, isAdmin badge, bookingCount
  - `GET /bookings?page=&pageSize=&status=` — paginated booking list with status, owner, booker, date, time, meetUrl
- `PagedResponse<T>` generic record: `{ items, totalCount, page, pageSize }`
- `AdminOnly` authorization policy via `RequireClaim("IsAdmin", "true")`
- `[Authorize(Policy = "AdminOnly")]` on AdminController

### Plan 02 — Admin Frontend

- `AdminPage` with 3 tabs: Dashboard, Users, Bookings
- **Dashboard tab:** Two stat cards — Total Users, Total Bookings
- **Users tab:** Search by email (300ms debounce), paginated table with Email/CreatedAt/Admin badge/Bookings
- **Bookings tab:** Status filter (All/Pending/Confirmed/Declined/Cancelled), paginated table with Status/Owner/Booker/Date/Time/Meet Link
- `AdminGuard` — non-admin users redirected to `/` with "not authorized" toast
- Conditional admin nav link (ShieldCheck icon, last nav item)
- `PaginationBar` component shared across tabs
- `npx shadcn add table` for table component

---

## Key Decisions

| Decision | Choice | Why |
|----------|--------|-----|
| Admin route | Single `/admin` with tabs | Matches BookingsPage pattern |
| Admin scope | Read-only (no actions) | Admin monitors; changes go through normal flows |
| Data exposure | Richer than public API | Email, CreatedAt, IsAdmin, BookingCount |
| Pagination | Offset-based | Standard `{ items, totalCount, page, pageSize }` |
| Admin guard | Client + server | Two-layer: AdminGuard redirect + server 403 |
| Nav link | Conditionally shown | Only visible when `user.isAdmin` is true |

## Code Review Findings (Fixed)

| Issue | Severity | Fix |
|-------|----------|-----|
| Hangfire dashboard exposed | CRITICAL | Added `HangfireAdminAuthorizationFilter` |
| Unbounded search parameter | CRITICAL | Added 100-char max length validation |
| Dead code `GetUserId()` | WARNING | Removed unused method |
| Wrong toast for unauthenticated users | WARNING | Added `user` null guard in AdminGuard |
| Invalid Tabs nesting | WARNING | Replaced inner Tabs with filter buttons |
| CORS origin hardcoded | INFO | Moved to config |
| DateTime without timezone | INFO | Changed to DateTimeOffset |

## Verification

| Truth | Status |
|-------|--------|
| Admin sees paginated user list with details | ✅ Verified |
| Admin sees all bookings with full details | ✅ Verified |
| Non-admin gets 403 on admin endpoints | ✅ Verified (code) |
| Dashboard stat cards show live counts | ✅ Verified |
| Users search with debounce | ✅ Verified |
| Bookings status filter | ✅ Verified |
| Admin nav link visible only to admins | ✅ Verified |
| Non-admin visiting /admin → redirect + toast | ✅ Verified (code) |

## Plans

| # | Name | What It Built |
|---|------|--------------|
| 04-01 | Admin Backend | AdminController, PagedResponse, AdminOnly policy |
| 04-02 | Admin Frontend | AdminPage with 3 tabs, AdminGuard, PaginationBar |
