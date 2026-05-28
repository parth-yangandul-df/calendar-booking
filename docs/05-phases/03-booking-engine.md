# Phase 3: Booking Engine

**Status:** ✅ Complete (2026-05-26)
**Requirements:** CAL-03, BOOK-01/02/03, CANCEL-01/02, NOTIF-01/02
**Plans:** 4/4 executed

---

## What Was Built

### Plan 01 — Booking Backend Core

- `Booking` entity with status enum: Pending → Confirmed/Declined → Cancelled
- EF migration for Bookings table
- `BookingRepository` with `UPDLOCK` + `ROWLOCK` for atomic slot booking
- `BookingController`: create (with conflict check), get by user, cancel
- Owner must approve (Pending) before booking is Confirmed
- First writer wins; second gets 409 Conflict

### Plan 02 — Email & Background Jobs

- Hangfire integration with SQL Server job store
- `MailKit` SMTP email sender (env-var configured)
- 4 Hangfire job types: BookingCreated, BookingConfirmed, BookingDeclined, BookingCancelled
- Graceful no-op when SMTP not configured (dev-friendly)
- Hangfire dashboard at `/hangfire` (dev only)

### Plan 03 — Bookings Page Frontend

- `/bookings` page with two tabs: **Incoming** (requests on my calendar) and **My Bookings** (bookings I made)
- Incoming tab: Pending requests with Accept/Decline buttons
- My Bookings tab: list of bookings with status badges (Pending=amber, Confirmed=emerald)
- Cancel button (with 2-step confirmation) on eligible bookings
- Navbar "Bookings" link with CalendarCheck icon

### Plan 04 — Calendar Integration

- DaySidePanel extended with booker/owner modes
- Booker mode: click a day → shows available time timeline with book action
- Owner mode: click a day → shows booking blocks with Accept/Decline/Cancel
- `UserCalendarPage` booking flow: pick time → confirmation modal → submit
- MonthGrid shows colored booking blocks (Pending=amber, Confirmed=green)

---

## Key Decisions

| Decision | Choice | Why |
|----------|--------|-----|
| Booking model | Approval gate (Pending → Confirmed) | Owner must approve before booking is confirmed |
| Concurrency | UPDLOCK + ROWLOCK | First writer wins, no double-bookings |
| Meet URL | Placeholder `meet.google.com/placeholder-{id}` | Real API deferred post-v1 |
| Email dispatch | Hangfire background jobs | Async, non-blocking API |
| Email content | Plain text | No HTML templates in v1 |
| Cancellation | 24h window, server-enforced | Fixed policy, not configurable |

## UAT Tests

14 UAT tests were defined covering:
- Cold start smoke test
- Available slots display
- Booking flow (booker side)
- Incoming tab (owner side)
- Accept/Decline booking
- Status badge display
- Month grid booking blocks
- Double-booking prevention
- Cancel before 24h
- Cancel within 24h (denied)
- Navbar link
- Email notification triggers
- Hangfire dashboard access

## Plans

| # | Name | What It Built |
|---|------|--------------|
| 03-01 | Booking Backend | Booking entity, UPDLOCK repository, BookingController |
| 03-02 | Email + Jobs | Hangfire setup, MailKit SMTP, 4 job types |
| 03-03 | Bookings Frontend | Incoming/My Bookings tabs, status badges, cancel flow |
| 03-04 | Calendar Integration | DaySidePanel booking, MonthGrid booking blocks, flow |
