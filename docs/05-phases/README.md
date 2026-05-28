# Phases Overview

All 4 phases of v1 are complete. Each phase delivers an end-to-end user capability.

| Phase | Status | Requirements | Plans | Duration |
|-------|--------|-------------|-------|----------|
| [01 — Authentication](01-authentication.md) | ✅ Complete | AUTH-01/02/03, ADMIN-01 | 3 plans | ~1 session |
| [02 — Availability](02-availability.md) | ✅ Complete | CAL-01, CAL-02 | 2 plans | ~1 session |
| [03 — Booking Engine](03-booking-engine.md) | ✅ Complete | CAL-03, BOOK-01/02/03, CANCEL-01/02, NOTIF-01/02 | 4 plans | ~1 session |
| [04 — Admin Dashboard](04-admin-dashboard.md) | ✅ Complete | ADMIN-02, ADMIN-03 | 2 plans | ~1 session |

---

## Key Decisions Per Phase

| Decision | Phase |
|----------|-------|
| httpOnly cookies for JWT (not localStorage) | 1 |
| Custom JWT controllers (not MapIdentityApi) | 1 |
| Runtime admin seeder (not EF HasData) | 1 |
| Custom month grid (not FullCalendar) | 2 |
| Two-table model: template + overrides | 2 |
| Auto-save with debounce (no Save button) | 2 |
| Booking approval gate (Pending → Confirmed/Declined) | 3 |
| Pessimistic locking via UPDLOCK+ROWLOCK | 3 |
| Placeholder Meet URL (real API deferred) | 3 |
| Tab-based admin page (Dashboard/Users/Bookings) | 4 |
| Offset pagination for all list endpoints | 4 |
| AdminOnly policy via JWT claim | 4 |
