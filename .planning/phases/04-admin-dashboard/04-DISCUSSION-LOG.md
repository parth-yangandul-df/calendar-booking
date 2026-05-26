# Phase 4: Admin Dashboard - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-26
**Phase:** 4-Admin Dashboard
**Areas discussed:** Admin page structure, User list data exposure, Booking list scope, Admin navigation & auth, Pagination

---

## Admin Page Structure

| Option | Description | Selected |
|--------|-------------|----------|
| Single /admin page with tabs | One route with Tabs for sections; matches BookingsPage | ✓ |
| Separate /admin/users + /admin/bookings | Dedicated routes per section | |

**User's choice:** Single /admin page with tabs
**Notes:** Wants a single route with tabs, consistent with existing BookingsPage pattern.

| Option | Description | Selected |
|--------|-------------|----------|
| Users + Bookings | Two tabs | |
| Users + Bookings + Dashboard | Add summary tab | ✓ |

**User's choice:** Users + Bookings + Dashboard
**Notes:** Three tabs: Dashboard (summary), Users list, Bookings list.

| Option | Description | Selected |
|--------|-------------|----------|
| Stats cards only | Simple cards, no charts | ✓ |
| Stats cards + recent activity list | Cards + recent items below | |

**User's choice:** Stats cards only

| Option | Description | Selected |
|--------|-------------|----------|
| Total users + Total bookings | Two stat cards | ✓ |
| Total users + Total bookings + Pending + Today's | Four cards | |

**User's choice:** Total users + Total bookings

---

## User List Data Exposure

| Option | Description | Selected |
|--------|-------------|----------|
| Email + CreatedAt + IsAdmin | Three columns | |
| Email + CreatedAt + IsAdmin + Booking count | Four columns | ✓ |

**User's choice:** Email + CreatedAt + IsAdmin + Booking count
**Notes:** Wants booking count per user to identify active vs inactive users.

| Option | Description | Selected |
|--------|-------------|----------|
| Search by email only | Simple text search | ✓ |
| Search + filter by role | Email search + IsAdmin filter dropdown | |

**User's choice:** Search by email only

| Option | Description | Selected |
|--------|-------------|----------|
| Nothing (read-only table) | Static list, no drill-down | ✓ |
| Shows user's bookings | Click opens sub-view of user's bookings | |

**User's choice:** Nothing (read-only table)

| Option | Description | Selected |
|--------|-------------|----------|
| Show admin badge on admin users | Visual badge for admins | ✓ |
| No special badge | All users displayed equally | |

**User's choice:** Show admin badge on admin users

---

## Booking List Scope

| Option | Description | Selected |
|--------|-------------|----------|
| All bookings (all statuses) | Full audit view | ✓ |
| Active bookings only (Pending + Confirmed) | Focused list | |

**User's choice:** All bookings (all statuses)
**Notes:** Full audit view including cancelled/declined.

| Option | Description | Selected |
|--------|-------------|----------|
| Full: Status + Owner + Booker + Date + Time + Meet link | Complete details | ✓ |
| Minimal: Status + Users + Date | Compact view | |

**User's choice:** Full columns

| Option | Description | Selected |
|--------|-------------|----------|
| Filter by status tabs | Tabs for each status | ✓ |
| Status tabs + search by email | Status tabs + search | |

**User's choice:** Filter by status tabs

| Option | Description | Selected |
|--------|-------------|----------|
| View-only — no actions | Admin cannot modify bookings | ✓ |
| Allow cancellation by admin | Admin can cancel any booking | |

**User's choice:** View-only — no actions

---

## Admin Navigation & Auth

| Option | Description | Selected |
|--------|-------------|----------|
| Admin link in Navbar (visible to admins only) | Direct nav link | ✓ |
| Admin link in user dropdown menu | Less prominent | |

**User's choice:** Admin link in Navbar (visible to admins only)

| Option | Description | Selected |
|--------|-------------|----------|
| Redirect to / with error toast | 403-style redirect | ✓ (with free-text clarification) |
| Show 404 Not Found | Hide existence of admin features | |

**User's choice:** Redirect to / with "not authorized" toast + don't show admin page to non-admins in the first place
**Notes:** Navbar link already hidden for non-admins. If they somehow hit /admin, redirect with error.

| Option | Description | Selected |
|--------|-------------|----------|
| Shield (ShieldCheck) | Security/role icon | ✓ |
| LayoutDashboard | Generic dashboard icon | |

**User's choice:** ShieldCheck icon

| Option | Description | Selected |
|--------|-------------|----------|
| Last position (after Set Routine) | End of nav links | ✓ |
| Between My Calendar and Bookings | Mid-placement | |

**User's choice:** Last position (after Set Routine)

---

## Pagination

| Option | Description | Selected |
|--------|-------------|----------|
| Offset pagination (page numbers) | Standard ?page=N&pageSize=20 | ✓ |
| Infinite scroll | Load on scroll | |
| No pagination (single fetch) | All records at once | |

**User's choice:** Offset pagination + wants pagination on ALL list-returning APIs (cross-cutting)
**Notes:** Decision applies to existing endpoints too, not just admin. Broad architectural impact.

| Option | Description | Selected |
|--------|-------------|----------|
| 20 items per page | Matches existing Take(20) pattern | ✓ |
| 50 items per page | Larger page size | |

**User's choice:** 20 items per page

| Option | Description | Selected |
|--------|-------------|----------|
| Items + totalCount + page + pageSize | Standard response format | ✓ |
| Items only + Link headers | HATEOAS-style | |

**User's choice:** `{ items, totalCount, page, pageSize }`

---

## the agent's Discretion

- Exact file structure under `src/features/admin/` (feature folder naming)
- Admin guard component implementation (wrapper vs route-level)
- Stat card component design (shadcn Card)
- Whether admin endpoints go in new `AdminController` or existing controllers with `[Authorize(Policy = "AdminOnly")]`

## Deferred Ideas

- **Pagination refactor of existing APIs** — D-17 requires pagination on all list endpoints (existing user search, availability, booking endpoints). May need its own mini-phase if scope is large.
- **Admin booking actions** (cancel/force) — not needed; view-only is sufficient.
- **Charts/graphs** — not needed; stat cards are enough.
