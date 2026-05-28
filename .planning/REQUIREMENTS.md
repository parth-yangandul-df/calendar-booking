# Requirements: Calendar Booking System

**Defined:** 2026-05-22
**Core Value:** Users can reliably book time with each other through shared calendar availability, with automatic Google Meet links and email confirmations

## v1 Requirements

### Authentication

- [x] **AUTH-01**: User can sign up and log in with email and password
- [x] **AUTH-02**: User session persists across browser refresh (JWT with refresh tokens)
- [x] **AUTH-03**: User can log out

### Calendar & Availability

- [x] **CAL-01**: User can define their booking availability on a monthly calendar view
- [x] **CAL-02**: User can view another user's available time slots
- [x] **CAL-03**: System prevents double-booking with atomic conflict detection

### Booking

- [x] **BOOK-01**: User can select and book an available slot on another user's calendar
- [x] **BOOK-02**: Booking auto-generates and attaches a Google Meet link
- [x] **BOOK-03**: Both booker and calendar owner receive confirmation of the booking

### Cancellation

- [x] **CANCEL-01**: Creator or booker can cancel a booking up to 24 hours before the scheduled time
- [x] **CANCEL-02**: System enforces the 24-hour cancellation window (cancellations past window are denied)

### Notifications

- [x] **NOTIF-01**: System sends email notification to both parties when a booking is created
- [x] **NOTIF-02**: System sends email notification to both parties when a booking is cancelled

### Admin

- [ ] **ADMIN-01**: System creates one admin user via seed data at initialization
- [ ] **ADMIN-02**: Admin can view all users registered on the platform
- [ ] **ADMIN-03**: Admin can view all bookings across all users

## v2 Requirements

- **CAL-04**: Recurring availability patterns (weekly repeats)
- **BOOK-03**: Rescheduling of existing bookings
- **NOTIF-03**: Configurable notification preferences

## Out of Scope

| Feature | Reason |
|---------|--------|
| Payment integration | Not needed for v1 scheduling use case |
| Mobile native apps | Web-first; mobile-responsive design covers v1 |
| Third-party calendar sync (Google Calendar, Outlook) | v2 feature; Google Meet link generation only for v1 |
| Team/org features | Individual users only for v1 |
| Video integration beyond Google Meet | Google Meet only for v1 |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 1 | Complete |
| AUTH-02 | Phase 1 | Complete |
| AUTH-03 | Phase 1 | Complete |
| CAL-01 | Phase 2 | In Progress (backend complete) |
| CAL-02 | Phase 2 | In Progress (backend complete) |
| CAL-03 | Phase 3 | Complete |
| BOOK-01 | Phase 3 | Complete |
| BOOK-02 | Phase 3 | Complete |
| BOOK-03 | Phase 3 | Complete |
| CANCEL-01 | Phase 3 | Complete |
| CANCEL-02 | Phase 3 | Complete |
| NOTIF-01 | Phase 3 | Complete |
| NOTIF-02 | Phase 3 | Complete |
| ADMIN-01 | Phase 1 | Pending |
| ADMIN-02 | Phase 4 | Pending |
| ADMIN-03 | Phase 4 | Pending |

**Coverage:**
- v1 requirements: 16 total
- Mapped to phases: 16
- Unmapped: 0 ✅

## User Stories

- As a user, I want to set my available hours on a monthly calendar so others know when to book me
- As a user, I want to see another person's free slots and book one that works for me
- As a user, I want each booking to automatically include a Google Meet link so I don't have to set one up manually
- As a user, I want email confirmation when someone books me or cancels
- As a user, I want to cancel a booking I created or own, up to 24 hours before the slot
- As an admin, I want to see all users and bookings to monitor platform activity

## Acceptance Criteria

- **AUTH-01**: User submits email + password → account created, JWT returned
- **CAL-01**: User navigates to monthly calendar → can toggle time slots as available/unavailable
- **CAL-02**: User views another user's profile → sees available slots for the month
- **BOOK-01**: User clicks an available slot → booking confirmation shown
- **BOOK-02**: Booking record contains a valid Google Meet URL
- **CANCEL-01**: User clicks cancel on a booking >24h away → booking cancelled, email sent
- **CANCEL-02**: User clicks cancel on a booking <24h away → error shown, cancellation denied
- **ADMIN-01**: On first startup, admin user exists with seeded credentials

## Definition of Done

- Feature is implemented end-to-end (React UI → ASP.NET API → SQL Server)
- Automated tests pass for the feature
- No regression in existing features
- Acceptance criteria are met

---

*Requirements defined: 2026-05-22*
*Last updated: 2026-05-22 after initial definition*
