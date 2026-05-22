# Roadmap: Calendar Booking System

**Milestone:** v1.0
**Granularity:** Coarse
**Mode:** MVP
**Total v1 Requirements:** 16

---

## Phases

- [ ] **Phase 1: Foundation & Authentication** — Project scaffolding, auth system, seed admin user
- [ ] **Phase 2: Availability Management** — Monthly availability definition and viewing others' slots
- [ ] **Phase 3: Booking Engine** — Slot booking, Google Meet links, email notifications, cancellations
- [ ] **Phase 4: Admin Dashboard** — Admin monitoring of all users and bookings

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
**Plans:** TBD
**UI hint:** yes

### Phase 2: Availability Management
**Goal:** Users can define their monthly availability schedule and view other users' available time slots.
**Mode:** mvp
**Depends on:** Phase 1
**Requirements:** CAL-01, CAL-02
**Success Criteria** (what must be TRUE):
1. User can navigate to a monthly calendar view and mark individual time slots as available/unavailable
2. Availability changes save immediately and persist across sessions
3. User can view another user's profile page and see their defined available slots for the current month
**Plans:** TBD
**UI hint:** yes

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
**Plans:** TBD
**UI hint:** yes

### Phase 4: Admin Dashboard
**Goal:** Admin can monitor all registered users and all bookings across the platform.
**Mode:** mvp
**Depends on:** Phase 1 (auth), Phase 3 (booking data available)
**Requirements:** ADMIN-02, ADMIN-03
**Success Criteria** (what must be TRUE):
1. Admin can view a paginated list of all registered users with account details
2. Admin can view all bookings across all users with full details (booker, owner, time, Meet link, status)
3. Admin-only pages are inaccessible to non-admin users (authorization enforced)
**Plans:** TBD
**UI hint:** yes

---

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation & Authentication | 0/0 | Not started | - |
| 2. Availability Management | 0/0 | Not started | - |
| 3. Booking Engine | 0/0 | Not started | - |
| 4. Admin Dashboard | 0/0 | Not started | - |
