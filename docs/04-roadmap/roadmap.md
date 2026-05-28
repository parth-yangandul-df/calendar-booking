# Roadmap

**Milestone:** v1.0
**Mode:** MVP
**Total v1 Requirements:** 16

---

## Phase Overview

| Phase | Goal | Requirements | Status | Completed |
|-------|------|-------------|--------|-----------|
| **1.** Foundation & Auth | Users can sign up, log in, maintain sessions. Admin baseline. | AUTH-01/02/03, ADMIN-01 | ✅ Complete | 2026-05-22 |
| **2.** Availability | Users define monthly availability. View others' slots. | CAL-01, CAL-02 | ✅ Complete | 2026-05-22 |
| **3.** Booking Engine | Book slots, Meet links, emails, cancellations. | CAL-03, BOOK-01/02/03, CANCEL-01/02, NOTIF-01/02 | ✅ Complete | 2026-05-26 |
| **4.** Admin Dashboard | Admin monitors all users and bookings. | ADMIN-02, ADMIN-03 | ✅ Complete | 2026-05-26 |

---

## Phase Details

### Phase 1: Foundation & Authentication

**Goal:** Users can create accounts, log in securely, and maintain sessions. Admin baseline exists.

**Success Criteria:**
1. User can sign up with email/password and immediately log in
2. User stays logged in across browser refreshes (JWT + refresh token)
3. User can log out from any page
4. Admin user exists on first startup

**Plans:** 3/3 executed
- 01-01: Project scaffold (Docker, backend solution, Vite + shadcn/ui)
- 01-02: Auth backend (register, login, refresh, logout API + admin seed)
- 01-03: Auth frontend (login/register pages, AuthContext, session restore)

### Phase 2: Availability Management

**Goal:** Users define monthly availability and view others' slots.

**Success Criteria:**
1. User can navigate to a monthly calendar and mark time slots as available/unavailable
2. Availability changes save immediately and persist
3. User can view another user's available slots

**Plans:** 2/2 executed
- 02-01: Backend (entities, DbContext, migration, repository, controllers, user search)
- 02-02: Frontend (month grid, side panel, template setup, user directory)

### Phase 3: Booking Engine

**Goal:** Users book slots with Meet links. Email confirmations. 24h cancellations.

**Success Criteria:**
1. User can book an available slot on another user's calendar
2. System prevents double-booking (atomic conflict detection)
3. Booking auto-generates a Google Meet URL
4. Both parties receive email on booking creation and cancellation
5. Creator or booker can cancel up to 24h before
6. Cancellations inside 24h window are denied
7. Both parties notified on cancellation

**Plans:** 4/4 executed
- 03-01: Booking backend core (entity, migration, UPDLOCK repository, controller)
- 03-02: Email + background jobs (Hangfire, MailKit SMTP, 4 email job types)
- 03-03: Bookings page frontend (Incoming + My Bookings tabs)
- 03-04: Calendar integration (DaySidePanel booker/owner modes, booking blocks)

### Phase 4: Admin Dashboard

**Goal:** Admin monitors all users and bookings.

**Success Criteria:**
1. Admin can view paginated list of all registered users
2. Admin can view all bookings across all users
3. Admin-only pages inaccessible to non-admins

**Plans:** 2/2 executed
- 04-01: Backend API (AdminController, paginated endpoints, AdminOnly policy)
- 04-02: Frontend (AdminPage with Dashboard/Users/Bookings tabs, AdminGuard)
