# Feature Landscape

**Domain:** Calendar-based meeting/appointment booking
**Confidence:** HIGH (verified against 16+ tools)

---

## Market Context

This is a mature, crowded market (Calendly ~15M users, Cal.com ~40K GitHub stars, SavvyCal, Acuity). Users expect polished, reliable scheduling out of the box.

**Core evaluation criteria:**
1. Calendar integration quality (bidirectional sync)
2. Booking page customization
3. Timezone handling (must be invisible)
4. Reminder/follow-up automation
5. Reliability — double-booking is unforgivable

---

## Table Stakes (Must Have)

| Feature | Complexity | Notes |
|---------|-----------|-------|
| Timezone auto-detection & handling | **HIGH** | Store UTC + IANA timezone ID |
| Calendar sync (bidirectional) | **HIGH** | OAuth, webhooks, conflict detection |
| Email reminders & notifications | **MEDIUM** | Confirmation, 24h/1h reminders |
| Custom availability definition | **MEDIUM** | Per-day-of-week, exceptions, caps |
| Booking page (public link) | **LOW** | Shareable URL, embed |
| Cancellation with notice window | **MEDIUM** | Configurable deadline enforcement |
| Double-booking prevention | **HIGH** | DB-level locking, exclusion constraints |
| Buffer time between meetings | **LOW** | Configurable per event type |
| Mobile responsiveness | **LOW** | Responsive UI, PWA acceptable |

---

## Differentiators (Competitive Advantage)

| Feature | Value | Complexity | Priority |
|---------|-------|-----------|----------|
| Calendar overlay UX | Increases booking conversion 15-20% | MEDIUM | Phase 2-3 |
| Google Meet link auto-generation | One less thing to set up | LOW | Phase 1 |
| Round-robin team scheduling | Distribute bookings across team | MEDIUM | Phase 3+ |
| Routing forms with conditional logic | Qualify leads before booking | MED-HIGH | Phase 3+ |
| Meeting polls | Coordinate multiple participants | LOW-MED | Phase 2 |
| Waitlist / overflow booking | Recover from cancellations | MEDIUM | Phase 3+ |
| Paid bookings (Stripe) | Reduce no-shows 80% | MEDIUM | Phase 2-3 |
| Workflow automation (webhooks, Slack) | Trigger actions on booking | HIGH | Phase 4+ |

---

## Anti-Features (Don't Build Yet)

| Feature | Why Avoid |
|---------|-----------|
| Phone-based AI booking agent | Expensive, limited use case |
| Full open-source self-hosting | Enormous support burden |
| Multi-location / resource management | Different product entirely |
| Enterprise SSO / SAML | Massive compliance overhead |
| Deep CRM sync (Salesforce, HubSpot) | High maintenance; offer webhooks instead |

---

## MVP Priority

**Phase 1:** Auth + project scaffold
**Phase 2:** Availability definition + view others' slots
**Phase 3:** Booking, double-book prevention, Meet links, email, cancellation
**Phase 4:** Admin dashboard
**v2:** Calendar overlay, ranked slots, rescheduling, multi-calendar sync
