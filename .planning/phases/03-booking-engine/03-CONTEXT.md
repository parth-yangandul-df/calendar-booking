# Phase 3: Booking Engine - Context

**Gathered:** 2026-05-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Slot booking with a doctor-patient model: calendar owners define availability windows, bookers pick a start time and duration within those windows. Bookings require owner approval (Pending → Confirmed or Declined). Confirmed bookings auto-generate a Google Meet placeholder URL (real Google Calendar API deferred to a later phase). Both parties receive plain-text email notifications via SMTP (MailKit) dispatched through Hangfire background jobs. Cancellations follow a 24-hour policy; cancelled slots are immediately freed for new bookings.

**Requirements:** CAL-03, BOOK-01, BOOK-02, BOOK-03, CANCEL-01, CANCEL-02, NOTIF-01, NOTIF-02
**Acceptance Criteria:**
- Booker can select a start time and duration within an owner's availability window
- System prevents double-booking (pessimistic DB locking)
- System prevents booking a time when the owner already has a confirmed/pending booking
- Booking enters Pending status and notifies the owner (email)
- Owner approves or declines from /bookings → Incoming tab
- On approval: status → Confirmed, Meet placeholder URL attached, both parties emailed
- On decline: status → Declined, booker notified
- Cancellation of a Confirmed booking is allowed >24h before slot; denied ≤24h
- Cancellation sets status → Cancelled; slot freed immediately; both parties emailed
- System denies cancellation attempts within the 24-hour window with a clear error

</domain>

<decisions>
## Implementation Decisions

### Booking Model (Data)
- **D-01:** `Booking` entity with fields: `Id`, `OwnerId` (calendar owner), `BookerId`, `Date`, `StartTime`, `EndTime`, `Status` (enum), `MeetUrl`, `CancelledAt`, `CreatedAt`
- **D-02:** Status enum: `Pending`, `Confirmed`, `Declined`, `Cancelled` — 4 values covering the full lifecycle
- **D-03:** Soft-cancel model — cancellation sets `Status = Cancelled` + records `CancelledAt`; booking record is never deleted (audit trail)
- **D-04:** "Available time" computed dynamically: take availability window(s) for the day, subtract all Pending+Confirmed bookings, expose remaining gaps to next booker
- **D-05:** Owner's own confirmed/pending bookings block incoming booking requests at the same time (cross-booking conflict check)

### Booking UX — Booker Side
- **D-06:** Booker views another user's calendar on `/users/{userId}` (read-only, Phase 2 pattern)
- **D-07:** Click a day → side panel opens showing available time as a timeline with free/booked blocks
- **D-08:** Booker picks a start time and duration from the timeline in the side panel
- **D-09:** Duration options: fixed (30 min, 1 hr, 2 hr) + a flexible/custom input option
- **D-10:** Confirmation modal before submitting: "Book [StartTime]–[EndTime] with [Owner] on [Date]?" — Confirm / Cancel
- **D-11:** After submitting, booking enters Pending; booker sees a "Request sent — awaiting approval" toast

### Booking UX — Owner Side
- **D-12:** `/bookings` page with two tabs: **Incoming** (requests on owner's calendar) and **My Bookings** (bookings owner made elsewhere)
- **D-13:** Incoming tab shows Pending requests with Accept / Decline actions
- **D-14:** On Accept: status → Confirmed, Meet placeholder URL generated, email sent to both parties
- **D-15:** On Decline: status → Declined, booker notified by email

### Cancellation
- **D-16:** Cancel button on booked slots in "My Bookings" tab (and on confirmed slots in "Incoming" tab for the owner)
- **D-17:** 24-hour policy enforced server-side: if `slot.StartTime - now < 24h`, return 400 with message "Cannot cancel within 24 hours of the booking"
- **D-18:** On successful cancel: `Status = Cancelled`, slot freed immediately (removed from occupied windows), both parties emailed

### Google Meet Integration
- **D-19:** Phase 3 uses a placeholder Meet URL (e.g., `https://meet.google.com/placeholder-[bookingId]`) — real Google Calendar API setup is deferred
- **D-20:** Plan should include setup instructions for creating a Google service account + enabling Calendar API (for future implementation)
- **D-21:** Real Meet link generation will use a single shared service account (not per-user OAuth) when implemented

### Email Notifications
- **D-22:** SMTP via MailKit; credentials configured via environment variables (not hardcoded)
- **D-23:** Emails dispatched via Hangfire background job (API responds immediately; email fires async)
- **D-24:** Plain-text email format — no HTML templates
- **D-25:** Trigger events: booking created (Pending — notify owner), booking confirmed (notify booker), booking declined (notify booker), booking cancelled by either party (notify both)
- **D-26:** Email content includes: slot date/time, who the booking is with, Meet URL (placeholder for now), and a reference booking ID

### Concurrency / Double-Booking
- **D-27:** Pessimistic locking via SQL Server `UPDLOCK + ROWLOCK` hints on the availability check before insert — first writer wins, second gets 409 Conflict
- **D-28:** Conflict response to client: `409 Conflict` with message "This time slot has already been booked"

### Calendar Visual (Owner's View)
- **D-29:** Month grid shows color-coded blocks: Pending = yellow, Confirmed = green — distinct from plain availability color (from Phase 2)
- **D-30:** Clicking a booked block in the side panel shows booking details (booker name, time, status) with action buttons (Accept/Decline for Pending, Cancel for Confirmed)

### the agent's Discretion
- Exact Hangfire setup (in-memory vs SQL Server job store — recommend SQL Server for persistence)
- Booking entity EF Core configuration and migration details
- Email subject line text and body wording
- Placeholder Meet URL format
- Color palette choices (yellow/green shades) for booking blocks
- Side panel timeline component implementation details

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & Roadmap
- `.planning/REQUIREMENTS.md` § BOOK-01, BOOK-02, BOOK-03, CAL-03, CANCEL-01, CANCEL-02, NOTIF-01, NOTIF-02 — Full requirements with acceptance criteria
- `.planning/ROADMAP.md` § Phase 3 — Phase goal, success criteria, requirement mapping

### Project Context
- `.planning/PROJECT.md` — Core value, constraints (24h cancellation, Google Meet, SMTP, seed admin)
- `.planning/STATE.md` — Accumulated decisions including concurrency hint (D-27 references STACK.md UPDLOCK pattern)

### Prior Phase Decisions
- `.planning/phases/01-foundation-authentication/01-CONTEXT.md` — D-10 through D-15: frontend stack, Clean Architecture, API versioning `/api/v1/`, ProblemDetails, Sonner toasts
- `.planning/phases/02-availability-management/02-CONTEXT.md` — D-03 data model, D-06/D-07 month grid + side panel, D-12/D-13/D-14 UserCalendarPage read-only, D-17 no timezone

### Stack Decisions (for Hangfire + MailKit)
- `.planning/research/SUMMARY.md` — Stack decisions including MailKit/FluentEmail and Hangfire/Quartz.NET recommendation
- `STACK.md` (project root) — `UPDLOCK + ROWLOCK` concurrency pattern; Hangfire for background jobs; MailKit for SMTP

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`MonthGrid.tsx` + `DaySidePanel.tsx`** — Phase 2 month grid and side panel already built. Phase 3 extends: add booking block rendering (colored) and booking action buttons in the side panel
- **`UserCalendarPage.tsx`** — read-only calendar page where booker views and initiates booking; just needs "Book" interaction added to the side panel
- **`availabilityApi.ts`** pattern — same API layer pattern for new `bookingApi.ts`
- **`useAvailability.ts`** hook pattern — replicate for `useBookings.ts`
- **shadcn/ui components** — Button, Card, Badge (for status chips), Dialog (for confirmation modal) all available
- **Sonner toasts** — already set up for success/error feedback (per D-15 Phase 1)

### Established Patterns
- **Clean Architecture** — New `Booking` entity in Domain; interfaces + DTOs in Application; EF Core repo + Hangfire job in Infrastructure; controller in Api
- **API versioning** — `/api/v1/bookings/...` prefix (per D-12 Phase 1)
- **EF Core migrations** — new migration for `Bookings` table
- **ProblemDetails** — 409 Conflict and 400 Bad Request responses follow existing error format
- **Feature folders** — `client/src/features/booking/` with `api/`, `pages/`, `components/`, `hooks/`, `schemas/`

### Integration Points
- **`AvailabilityController`** and `GET /api/v1/availability/calendar` — booking engine reads availability to compute free slots
- **`ApplicationDbContext`** — add `DbSet<Booking>` and configure entity
- **Navbar** — add "My Bookings" link pointing to `/bookings`
- **`useAuth()`** — provides `user.id` to distinguish owner vs booker roles at runtime
- **`UserCalendarPage.tsx`** — extend side panel to show timeline with bookable slots

</code_context>

<specifics>
## Specific Ideas

- **Doctor-patient model**: owner (doctor) sets wide availability windows (e.g., 9am–1pm, 4pm–8pm); bookers (patients) carve out specific start times and durations within those windows — like disk partitions filling up
- **Approval gate**: bookings require owner approval before confirmation (Pending → Confirmed/Declined); this is a key UX differentiator from auto-confirm systems
- **Conflict detection**: system must check both the availability window AND the owner's existing confirmed/pending bookings before accepting a new request

</specifics>

<deferred>
## Deferred Ideas

- **Real Google Meet links** — Google Calendar API service account setup deferred; placeholder URL used in Phase 3. Full integration is a follow-up task (post-v1 or v1.1).
- **Recurring bookings** — out of scope for v1 (per PROJECT.md)
- **Booking reminders** — email reminders before a booking (e.g., 1hr before) not discussed; could be a v2 feature

</deferred>

---

*Phase: 3-Booking Engine*
*Context gathered: 2026-05-25*
