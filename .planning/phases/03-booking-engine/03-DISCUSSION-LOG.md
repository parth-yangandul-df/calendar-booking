# Phase 3: Booking Engine - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-25
**Phase:** 3-Booking Engine
**Areas discussed:** Booking UX flow, Google Meet integration, Email notifications, Cancellation behavior, Approval workflow, Concurrency / double-booking, Partial slot fill tracking, Calendar visual for bookings, Cross-booking conflict detection

---

## Booking UX Flow

| Option | Description | Selected |
|--------|-------------|----------|
| Side panel with 1-click book | Immediate booking on click, no confirmation step | |
| Side panel + confirmation modal | Side panel shows slots → confirmation modal | ✓ (modified) |
| Dedicated booking page | Separate /book/:userId/:slotId page | |

**User's choice:** Option 2 with significant modifications — doctor-patient model where the owner sets wide time windows and bookers carve out specific start times and durations (like disk partitions filling up).

**Notes:** User clarified the model: calendar owner sets large windows (e.g., 9am–1pm), bookers pick a start time AND duration. Duration options are fixed (30min, 1hr, 2hr) + flexible/custom. Timeline in side panel shows free/booked blocks. Confirmation modal before submitting.

---

## Booking Duration Control

| Option | Description | Selected |
|--------|-------------|----------|
| Owner sets slot duration | Duration fixed by the calendar owner | |
| Booker picks duration | Booker selects from available options | ✓ |
| Owner sets range, booker picks within | Owner defines min/max | |

**User's choice:** Booker picks duration based on available slots.

---

## Duration Options

| Option | Description | Selected |
|--------|-------------|----------|
| Fixed system durations | 30 min, 1 hr, 2 hr (system-defined) | ✓ |
| Booker enters free minutes | Any duration in minutes | |
| Owner configures allowed durations | Owner defines what's offered | |

**User's choice:** Fixed durations plus a flexible/custom option.

---

## Booking Visualization (Booker)

| Option | Description | Selected |
|--------|-------------|----------|
| Timeline in side panel | Shows free/booked blocks; pick start + duration | ✓ |
| Dedicated booking page | Separate /book/:userId page | |
| Agent decides | | |

**User's choice:** Timeline in side panel.

---

## Post-Selection Confirmation

| Option | Description | Selected |
|--------|-------------|----------|
| Confirmation modal | "Book X–Y with Owner on Date?" with Confirm/Cancel | ✓ |
| Inline confirm in panel | No modal overlay | |
| 1-click no confirm | Immediate booking on click | |

**User's choice:** Confirmation modal.

---

## Google Meet Integration

| Option | Description | Selected |
|--------|-------------|----------|
| Service account | One shared Google service account; no per-user OAuth | ✓ |
| Per-user OAuth | Each user connects their Google account | |
| Mock Meet URL (defer) | Placeholder URL; wire real API later | |

**User's choice:** Service account — but credentials not yet set up. Decision: use placeholder URL for Phase 3; plan should include setup instructions for service account + Calendar API for future implementation.

---

## Email — Provider / Approach

| Option | Description | Selected |
|--------|-------------|----------|
| SMTP (MailKit) | Real SMTP with environment-variable credentials | ✓ |
| Mailtrap dev-only | Dev testing only, no real delivery | |
| Console log (defer) | Log to console; wire real email later | |

**User's choice:** SMTP via MailKit.

---

## Email — Dispatch Timing

| Option | Description | Selected |
|--------|-------------|----------|
| Send inline (synchronous) | Blocks API response | |
| Background job (Hangfire) | API responds immediately; email fires async | ✓ |
| Agent decides | | |

**User's choice:** Background job via Hangfire.

---

## Email — Format

| Option | Description | Selected |
|--------|-------------|----------|
| Plain text | Fast to build, no design | ✓ |
| Simple HTML template | Minimal inline CSS | |
| Agent decides | | |

**User's choice:** Plain text.

---

## Cancellation — Where to Cancel

| Option | Description | Selected |
|--------|-------------|----------|
| Dedicated bookings page | /bookings list with Cancel button per booking | ✓ |
| Cancel from calendar view | Bookings on month grid; click to cancel | |
| Both | Calendar + list page | |

**User's choice:** Dedicated bookings page (/bookings).

---

## Cancellation — Model

| Option | Description | Selected |
|--------|-------------|----------|
| Soft cancel with Status field | Status = Cancelled; record preserved for audit | ✓ |
| Hard delete on cancel | Booking record deleted | |

**User's choice:** Soft cancel with Status field.

---

## Cancellation — Slot Release

| Option | Description | Selected |
|--------|-------------|----------|
| Slot freed immediately | Available for new bookings right away | ✓ |
| Slot stays blocked | Owner manually re-enables | |
| Agent decides | | |

**User's choice:** Slot freed immediately.

---

## Approval Workflow

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-confirm (no approval) | Booking confirmed immediately; owner can cancel later | |
| Owner must approve | Booking enters Pending; owner Accept/Decline | ✓ |
| Configurable per owner | Owner can configure auto vs. manual | |

**User's choice:** Owner must approve — explicit approval required before confirmation.

**Notes:** User raised this as an additional gray area (not in initial list). This changes the booking lifecycle significantly: Pending → Confirmed/Declined instead of auto-confirm.

---

## Approval — Where Owner Approves

| Option | Description | Selected |
|--------|-------------|----------|
| Booking page with Incoming tab | /bookings with "Incoming requests" and "My bookings" tabs | ✓ |
| Notification-driven approval | Notification bell in Navbar | |
| Agent decides | | |

**User's choice:** Booking page with Incoming tab.

---

## Booking Status Values

| Option | Description | Selected |
|--------|-------------|----------|
| Pending / Confirmed / Cancelled | 3 statuses | |
| Pending / Confirmed / Declined / Cancelled | 4 statuses | ✓ |

**User's choice:** 4 statuses — Pending, Confirmed, Declined, Cancelled.

---

## Concurrency / Double-Booking

| Option | Description | Selected |
|--------|-------------|----------|
| DB pessimistic lock (UPDLOCK + ROWLOCK) | SQL Server hints; first writer wins; 409 on conflict | ✓ |
| Optimistic concurrency (ETag) | RowVersion; detect conflicts on save | |
| Agent decides | | |

**User's choice:** Pessimistic locking per STACK.md recommendation.

---

## Partial Slot Fill Tracking

| Option | Description | Selected |
|--------|-------------|----------|
| Subtract bookings from availability window | Dynamic computation; remaining gaps shown to next booker | ✓ |
| Pre-split into slot records | Fixed-increment slot records each marked free/booked | |

**User's choice:** Subtract bookings from availability window (dynamic computation).

---

## Cross-Booking Conflict Detection

| Option | Description | Selected |
|--------|-------------|----------|
| Check owner's own bookings on incoming request | Block if owner already has Confirmed/Pending at that time | ✓ |
| No cross-check | Only check availability window | |

**User's choice:** Check owner's confirmed/pending bookings when accepting an incoming request. Prevents User3 from booking User1 during a time User1 already has a meeting.

---

## Calendar Visual (Owner)

| Option | Description | Selected |
|--------|-------------|----------|
| Color-coded blocks on grid | Pending = yellow, Confirmed = green | ✓ |
| Badge dots + side panel | Indicator dots; details in side panel | |
| Agent decides | | |

**User's choice:** Color-coded blocks on the month grid.

---

## the agent's Discretion

- Hangfire job store (recommend SQL Server for persistence over in-memory)
- Booking entity EF Core configuration and table structure
- Email subject lines and body text
- Placeholder Meet URL format
- Exact yellow/green color shades for booking blocks
- Side panel timeline component implementation

## Deferred Ideas

- **Real Google Meet links** — service account setup and Calendar API integration deferred to post-v1 or v1.1
- **Recurring bookings** — out of scope for v1
- **Booking reminder emails** — could be v2 feature (not discussed, not in scope)
