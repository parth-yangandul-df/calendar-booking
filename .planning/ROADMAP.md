# Roadmap: Calendar Booking System

**Milestone:** v1.0
**Granularity:** Coarse
**Mode:** MVP
**Total v1 Requirements:** 16

---

## Phases

- [x] **Phase 1: Foundation & Authentication** — Project scaffolding, auth system, seed admin user
- [x] **Phase 2: Availability Management** — Monthly availability definition and viewing others' slots (completed 2026-05-22)
- [x] **Phase 3: Booking Engine** — Slot booking, Google Meet links, email notifications, cancellations (completed 2026-05-26)
- [x] **Phase 4: Admin Dashboard** — Admin monitoring of all users and bookings (completed 2026-05-26)

---

## Phase Details

### Phase 1: Foundation & Authentication

**Goal:** Users can create accounts, log in securely, and maintain sessions across browser refreshes. Admin baseline exists for platform monitoring.
**Mode:** mvp
**Depends on:** Nothing
**Requirements:** AUTH-01, AUTH-02, AUTH-03, ADMIN-01
**Success Criteria** (what must be TRUE):

1. User can sign up with email/password and immediately log in with the new credentials
2. User stays logged in across browser refreshes (JWT with refresh token persistence)
3. User can log out from any page, ending their authenticated session
4. Admin user exists with seeded credentials on first application startup

**Plans:** 3/3 plans executed
**UI hint:** yes

Plans:

- [x] 01-01-PLAN.md — Project scaffold & infrastructure (Docker, backend solution, frontend Vite + shadcn/ui)
- [x] 01-02-PLAN.md — Auth backend (register, login, refresh, logout API + admin seed + EF migration)
- [x] 01-03-PLAN.md — Auth frontend (login/register pages, AuthContext, session restore, protected routes)

### Phase 2: Availability Management

**Goal:** Users can define their monthly availability schedule and view other users' available time slots.
**Mode:** mvp
**Depends on:** Phase 1
**Requirements:** CAL-01, CAL-02
**Success Criteria** (what must be TRUE):

1. User can navigate to a monthly calendar view and mark individual time slots as available/unavailable
2. Availability changes save immediately and persist across sessions
3. User can view another user's profile page and see their defined available slots for the current month

**Plans:** 2/2 plans complete
**UI hint:** yes

Plans:

- [x] 02-01-PLAN.md — Backend: entities, DbContext, migration, repository, controllers, user search, service registration
- [x] 02-02-PLAN.md — Frontend: month grid, side panel, template setup, user directory, routing, Navbar

### Phase 3: Booking Engine

**Goal:** Users can book available slots with auto-generated Google Meet links, both parties receive email confirmations, and cancellations follow the 24-hour policy.
**Mode:** mvp
**Depends on:** Phase 2
**Requirements:** CAL-03, BOOK-01, BOOK-02, BOOK-03, CANCEL-01, CANCEL-02, NOTIF-01, NOTIF-02
**Success Criteria** (what must be TRUE):

1. User can select an available slot on another user's calendar and successfully complete the booking
2. System prevents double-booking — simultaneous booking attempts resolve with one success and one rejection (no duplicate bookings)
3. Each booking auto-generates a valid Google Meet URL stored in the booking record
4. Both booker and calendar owner receive email notification when a booking is created (with Meet link and details)
5. Creator or booker can cancel a booking up to 24 hours before the scheduled time
6. Cancellation attempts inside the 24-hour window are denied with a clear error message
7. Both parties receive email notification when a booking is cancelled

**Plans:** 4/4 plans complete
**UI hint:** yes

Plans:

- [x] 03-01-PLAN.md — Booking backend core (entity, migration, repository with UPDLOCK, BookingController, slots endpoint)
- [x] 03-02-PLAN.md — Email + background jobs (Hangfire SQL Server, MailKit SMTP, 4 email job types)
- [x] 03-03-PLAN.md — Bookings page frontend (/bookings with Incoming + My Bookings tabs, shadcn Dialog/Badge/Tabs, Navbar link)
- [x] 03-04-PLAN.md — Calendar integration (DaySidePanel booker/owner modes, MonthGrid booking blocks, UserCalendarPage booking flow)

### Phase 4: Admin Dashboard

**Goal:** Admin can monitor all registered users and all bookings across the platform.
**Mode:** mvp
**Depends on:** Phase 1 (auth), Phase 3 (booking data available)
**Requirements:** ADMIN-02, ADMIN-03
**Success Criteria** (what must be TRUE):

1. Admin can view a paginated list of all registered users with account details
2. Admin can view all bookings across all users with full details (booker, owner, time, Meet link, status)
3. Admin-only pages are inaccessible to non-admin users (authorization enforced)

**Plans:** 2/2 plans complete
**UI hint:** yes

Plans:
**Wave 1**

- [x] 04-01-PLAN.md — Admin backend API (AdminController, paginated users/bookings/stats endpoints, AdminOnly auth policy)

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 04-02-PLAN.md — Admin frontend (AdminPage with Dashboard/Users/Bookings tabs, AdminGuard, Navbar link)

---

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation & Authentication | 3/3 | ✅ Complete | 2026-05-22 |
| 2. Availability Management | 2/2 | Complete   | 2026-05-22 |
| 3. Booking Engine | 4/4 | Complete    | 2026-05-26 |
| 4. Admin Dashboard | 2/2 | Complete   | 2026-05-26 |
