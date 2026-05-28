# Requirements

**Defined:** 2026-05-22

## v1 Requirements

### Authentication

| ID | Requirement | Phase | Status |
|----|------------|-------|--------|
| AUTH-01 | User can sign up and log in with email and password | 1 | ✅ Complete |
| AUTH-02 | User session persists across browser refresh (JWT with refresh tokens) | 1 | ✅ Complete |
| AUTH-03 | User can log out | 1 | ✅ Complete |

### Calendar & Availability

| ID | Requirement | Phase | Status |
|----|------------|-------|--------|
| CAL-01 | User can define their booking availability on a monthly calendar view | 2 | ✅ Complete |
| CAL-02 | User can view another user's available time slots | 2 | ✅ Complete |
| CAL-03 | System prevents double-booking with atomic conflict detection | 3 | ✅ Complete |

### Booking

| ID | Requirement | Phase | Status |
|----|------------|-------|--------|
| BOOK-01 | User can select and book an available slot on another user's calendar | 3 | ✅ Complete |
| BOOK-02 | Booking auto-generates and attaches a Google Meet link | 3 | ✅ Complete |
| BOOK-03 | Both booker and calendar owner receive confirmation of the booking | 3 | ✅ Complete |

### Cancellation

| ID | Requirement | Phase | Status |
|----|------------|-------|--------|
| CANCEL-01 | Creator or booker can cancel a booking up to 24 hours before scheduled time | 3 | ✅ Complete |
| CANCEL-02 | System enforces the 24-hour cancellation window | 3 | ✅ Complete |

### Notifications

| ID | Requirement | Phase | Status |
|----|------------|-------|--------|
| NOTIF-01 | System sends email notification when a booking is created | 3 | ✅ Complete |
| NOTIF-02 | System sends email notification when a booking is cancelled | 3 | ✅ Complete |

### Admin

| ID | Requirement | Phase | Status |
|----|------------|-------|--------|
| ADMIN-01 | System creates one admin user via seed data at initialization | 1 | ✅ Complete |
| ADMIN-02 | Admin can view all users registered on the platform | 4 | ✅ Complete |
| ADMIN-03 | Admin can view all bookings across all users | 4 | ✅ Complete |

## v2 Requirements (Future)

| ID | Description |
|----|------------|
| CAL-04 | Recurring availability patterns (weekly repeats) |
| BOOK-04 | Rescheduling of existing bookings |
| NOTIF-03 | Configurable notification preferences |

## User Stories

- As a user, I want to set my available hours on a monthly calendar so others know when to book me
- As a user, I want to see another person's free slots and book one that works for me
- As a user, I want each booking to automatically include a Google Meet link
- As a user, I want email confirmation when someone books me or cancels
- As a user, I want to cancel a booking I created or own (up to 24h before)
- As an admin, I want to see all users and bookings to monitor platform activity

## Acceptance Criteria

| Requirement | Criterion |
|-------------|-----------|
| AUTH-01 | User submits email + password → account created, JWT returned |
| CAL-01 | User navigates to monthly calendar → can toggle time slots as available/unavailable |
| CAL-02 | User views another user's profile → sees available slots for the month |
| BOOK-01 | User clicks an available slot → booking confirmation shown |
| BOOK-02 | Booking record contains a valid Google Meet URL |
| CANCEL-01 | User clicks cancel on a booking >24h away → booking cancelled, email sent |
| CANCEL-02 | User clicks cancel on a booking <24h away → error shown, cancellation denied |
| ADMIN-01 | On first startup, admin user exists with seeded credentials |

## Definition of Done

- Feature implemented end-to-end (React UI → ASP.NET API → SQL Server)
- Automated tests pass
- No regression in existing features
- Acceptance criteria are met
