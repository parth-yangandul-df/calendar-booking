# Phase 4: Admin Dashboard - Context

**Gathered:** 2026-05-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Admin monitoring page where admin users can view all registered users and all bookings across the platform. Admin was already seeded in Phase 1 via `AdminSeeder` with `IsAdmin = true` on the `ApplicationUser` entity.

**Requirements:** ADMIN-02, ADMIN-03
**Acceptance Criteria:**
- Admin can view a paginated list of all registered users with account details
- Admin can view all bookings across all users with full details (booker, owner, time, Meet link, status)
- Admin-only pages are inaccessible to non-admin users (authorization enforced)

</domain>

<decisions>
## Implementation Decisions

### Admin Page Structure
- **D-01:** Single `/admin` route with tabs (not separate `/admin/users` + `/admin/bookings` routes) — matches existing BookingsPage pattern
- **D-02:** Three tabs: **Dashboard** (summary stats) / **Users** (all users list) / **Bookings** (all bookings list)
- **D-03:** Dashboard tab shows simple stat cards only (no recent activity list, no charts)
- **D-04:** Two stat cards: **Total users** (count of all registered users) and **Total bookings** (count of all bookings across all statuses)

### User List (Admin)
- **D-05:** Admin user table columns: `Email`, `CreatedAt`, `IsAdmin` (with admin badge), `Booking count` — richer than the public UserDto (Id + Email only) which is preserved for non-admin flows
- **D-06:** Search by email only (no role/admin status filter)
- **D-07:** Read-only table — clicking a row does nothing (no drill-down)
- **D-08:** Admin users get a visible "Admin" badge in the table

### Booking List (Admin)
- **D-09:** All booking statuses visible: Pending, Confirmed, Declined, Cancelled — full audit view
- **D-10:** Booking table columns: `Status`, `Owner` (email), `Booker` (email), `Date`, `StartTime–EndTime`, `MeetUrl` (link if available)
- **D-11:** Filter by status tabs (All / Pending / Confirmed / Declined / Cancelled) — matches existing BookingsPage tab pattern
- **D-12:** View-only — no action buttons (cancel/confirm/decline). Admin monitors but changes go through normal flows.

### Admin Navigation & Authorization
- **D-13:** Admin link in Navbar, visible only when `user.isAdmin` is true (Server-side: backend endpoint returns user's role; the `AuthContext` already exposes `isAdmin`)
- **D-14:** Non-admin who navigates to `/admin` directly gets redirected to `/` with a "not authorized" toast (matching Phase 1 D-16 403 pattern)
- **D-15:** `ShieldCheck` icon from lucide-react for the admin nav link
- **D-16:** Admin link placed last in Navbar (after "Set Routine")

### Pagination (Cross-Cutting)
- **D-17:** All list-returning APIs across the entire application must be paginated — this affects existing endpoints (e.g., user search) and new admin endpoints alike
- **D-18:** Default page size: 20 items per page
- **D-19:** Response format: `{ items: [...], totalCount: number, page: number, pageSize: number }`
- **D-20:** Admin user list and booking list both use offset-based pagination with this format

### Backend — New Admin Endpoints
- **D-21:** New `AdminController` at `/api/v1/admin/` for admin-only operations (or extend existing controllers with admin-only endpoints — let planner decide)
- **D-22:** `GET /api/v1/admin/users?page=1&pageSize=20&search=` — paginated user list with optional email search; returns richer model than public `UserDto` (includes `createdAt`, `isAdmin`, `bookingCount`)
- **D-23:** `GET /api/v1/admin/bookings?page=1&pageSize=20&status=` — paginated booking list with optional status filter; returns all bookings regardless of owner
- **D-24:** `GET /api/v1/admin/stats` — dashboard stats endpoint returning `{ totalUsers, totalBookings }`

### the agent's Discretion
- Exact file structure under `src/features/admin/`
- API client (`adminApi.ts`) implementation details
- Stat card component design (shadcn Card with number + label)
- Badge placement and styling for admin status
- Admin guard component implementation (wrapper vs route-level)
- Whether admin endpoints live in a new `AdminController` or are added to existing controllers with `[Authorize(Policy = "AdminOnly")]`

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & Roadmap
- `.planning/REQUIREMENTS.md` § ADMIN-02, ADMIN-03 — Full requirements with acceptance criteria
- `.planning/ROADMAP.md` § Phase 4 — Phase goal, success criteria, requirement mapping

### Project Context
- `.planning/PROJECT.md` — Core value, constraints (seed admin, 24h cancellation)
- `.planning/STATE.md` — Accumulated decisions, including D-08 (UserDto limited to Id+Email)

### Prior Phase Decisions
- `.planning/phases/01-foundation-authentication/01-CONTEXT.md` — D-19/D-20 (IsAdmin claim, role check), D-07/D-08/D-09 (admin seed approach), D-10 (frontend stack), D-14/D-15 (ProblemDetails, Sonner toasts)
- `.planning/phases/02-availability-management/02-CONTEXT.md` — Feature folder pattern, month grid components
- `.planning/phases/03-booking-engine/03-CONTEXT.md` — Booking entity shape (D-01 through D-05), BookingDto (3-group response), booking UI patterns

### Existing Code
- `src/backend/Domain/Entities/ApplicationUser.cs` — `IsAdmin` bool field on user entity
- `src/backend/Api/Controllers/UsersController.cs` — Existing user search pattern for reference (non-paginated, minimal UserDto)
- `client/src/features/auth/AuthContext.tsx` — `isAdmin` property exposed on user context
- `client/src/components/layout/Navbar.tsx` — Existing nav link pattern with lucide icons
- `client/src/features/booking/pages/BookingsPage.tsx` — Tabs pattern for admin page design reference
- `client/src/features/booking/api/bookingApi.ts` — BookingDto interface for admin booking list columns

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Tabs component** (`shadcn/ui`) — Used in BookingsPage for Incoming/My Bookings/Confirmed; reusable for admin tab layout
- **Badge component** (`shadcn/ui`) — Used for booking status badges; reusable for admin badge on users
- **Sonner toasts** — Already set up for error/success feedback; use for "not authorized" on non-admin access
- **`useAuth()` hook** — provides `user.isAdmin` for conditional rendering of admin nav link
- **Navbar** — existing nav link pattern (icon + text) easily extended with admin link
- **Axios client pattern** — `bookingApi.ts` pattern to replicate for `adminApi.ts`
- **Lucide icons** — `ShieldCheck` available (Calendar, Search, CalendarClock, CalendarCheck already used)

### Established Patterns
- **Feature folders** — `src/features/admin/` with `pages/`, `components/`, `api/`, `hooks/`
- **Tab-based page layout** — BookingsPage uses Tabs pattern that admin page should follow
- **Clean Architecture** — new AdminService in Application layer, AdminController in Api
- **API versioning** — `/api/v1/admin/...` prefix
- **ProblemDetails** — 403 responses for unauthorized admin access
- **Offset pagination** — needs to be implemented across the API (new pattern for this codebase)

### Integration Points
- **Navbar** — add admin link (conditionally shown) at end of nav links with ShieldCheck icon
- **`AuthContext`** — already provides `isAdmin` for conditional rendering
- **App.tsx routes** — add `/admin` route inside `AppLayout` component (behind admin guard)
- **`ApplicationDbContext`** — booking and user data already exists; no new entities needed
- **Existing controllers** — may need pagination updates as cross-cutting concern
- **Server-side auth** — `[Authorize]` + `IsAdmin` claim check for admin endpoints

</code_context>

<specifics>
## Specific Ideas

- Admin page follows same tab layout as BookingsPage for visual consistency
- Stat cards are simple shadcn Card components with number and label text (no charts, no graphs)
- Pagination format should be standardized as a shared DTO across the API
- Admin user table reflects that `ApplicationUser` already has `IsAdmin` + `CreatedAt` fields

</specifics>

<deferred>
## Deferred Ideas

- **Pagination refactor of existing APIs** — D-17 mandates pagination on all list endpoints. This is a cross-cutting concern that may require updating `UsersController.SearchUsers()`, `AvailabilityController`, and `BookingController`. If it's complex, it could be split into its own mini-phase. Planner should assess scope.
- **Admin booking actions** (cancel/force-confirm) — not requested; admin is view-only for now.
- **Charts/graphs on admin dashboard** — not needed; stat cards are sufficient.

None — discussion stayed within phase scope

</deferred>

---

*Phase: 4-Admin Dashboard*
*Context gathered: 2026-05-26*
