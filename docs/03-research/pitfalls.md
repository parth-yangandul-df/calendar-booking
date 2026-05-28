# Domain Pitfalls

---

## Critical

### P1: Timezone Handling

**What goes wrong:** Booking times appear shifted by 1+ hours. Recurring events drift after DST transitions.

**Why:** Using `LocalDateTime` without IANA timezone ID, using abbreviations (EST/PST) instead of zone names.

**Prevention:**
- Always store times in UTC with separate `provider_timezone` (IANA) column
- Use `ZonedDateTime` / `Instant`, never `LocalDateTime` alone
- Compute availability in UTC from provider's IANA zone + specific date
- Display in viewer's detected timezone

**Severity:** CRITICAL — affects Phase 2 data model

---

### P2: Double-Booking Race Conditions

**What goes wrong:** Two users simultaneously book the same slot. Both get confirmation.

**Why:** Application-level "check then book" is not atomic. No DB-level constraint.

**Prevention:**
- DB-level constraints are the source of truth
- Use `SELECT ... FOR UPDATE` in a transaction (UPDLOCK + ROWLOCK for SQL Server)
- Implement temporary holds (5-10 min TTL)
- Use idempotency keys on booking attempts

**Severity:** CRITICAL — affects Phase 3

---

### P3: Google Calendar API Rate Limits

**What goes wrong:** 403/429 errors from Google API. Events fail to create/sync.

**Why:** Not understanding 3-tier quota (per-project, per-user, per-day). Polling instead of push notifications.

**Prevention:**
- Use push notifications (webhooks) not polling
- Always set `quotaUser` for service accounts
- Implement exponential backoff with jitter
- Use incremental sync with sync tokens

**Severity:** HIGH — affects Meet link generation

---

### P4: Email Deliverability to Spam

**What goes wrong:** Booking confirmations end up in spam. Customers miss appointments.

**Why:** Missing SPF/DKIM/DMARC records. No dedicated sending infrastructure.

**Prevention:**
- Configure SPF, DKIM, DMARC before going live
- Use a dedicated transactional email service
- Monitor bounce rate (< 3%) and spam complaints (< 0.1%)
- Include unsubscribe links

**Severity:** HIGH — affects Phase 3 notifications

---

## Moderate

### P5: Cancellation Policy Across Timezones

**What goes wrong:** 24-hour window means different things in different timezones.

**Prevention:** Store deadlines in UTC. Display in customer's timezone. Add 1-2h grace buffer.

### P6: IDOR — Unauthorized Booking Access

**What goes wrong:** User A can view/cancel User B's booking by guessing the ID.

**Prevention:** Use UUIDs for booking IDs. Always verify ownership on every endpoint.

### P7: Availability vs Booking Schema Mismatch

**What goes wrong:** Cannot efficiently query available slots. Schema rewrites needed for new features.

**Prevention:** Separate availability rules from bookings. Compute slots at query time, not pre-computed.

---

## Minor

| Pitfall | Mitigation |
|---------|-----------|
| Google Meet link failure | Test with exact OAuth scopes; fallback to custom link |
| Wrong notification timing | Compute in recipient's timezone at booking time |
| Over-engineering before PMF | Start monolith + single DB. Add Redis when needed |
| Confusing calendar UX | Two-step flow (date → time). Clear color coding. Mobile-first |
