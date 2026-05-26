---
status: partial
phase: 04-admin-dashboard
source: [04-VERIFICATION.md]
started: 2026-05-26T17:40:45Z
updated: 2026-05-26T17:40:45Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Non-admin redirect + toast
expected: Navigating to /admin as a non-admin user redirects to / and shows an error toast ("You don't have permission to access this page.")
result: [pending]

### 2. Navbar admin link visibility
expected: Admin user sees ShieldCheck "Admin" link in Navbar; non-admin user does NOT see the link
result: [pending]

### 3. Dashboard live data
expected: Dashboard tab stat cards show real database counts (Total Users, Total Bookings) — not 0 or placeholder
result: [pending]

### 4. User search debounce
expected: Typing in the Users tab search input waits ~300ms before triggering API call; changing search resets page to 1
result: [pending]

### 5. Booking status filter
expected: Clicking Pending/Confirmed/Declined/Cancelled filter tabs changes the API status param and resets page to 1
result: [pending]

### 6. Backend 403 on non-admin JWT
expected: GET /api/v1/admin/users with a non-admin JWT returns HTTP 403 Forbidden
result: [pending]

## Summary

total: 6
passed: 0
issues: 0
pending: 6
skipped: 0
blocked: 0

## Gaps
