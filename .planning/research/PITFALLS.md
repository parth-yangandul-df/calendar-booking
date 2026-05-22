# Domain Pitfalls: Calendar Booking System

**Domain:** Calendar booking / appointment scheduling system  
**Researched:** 2026-05-22  
**Overall confidence:** HIGH (verified against official docs, industry post-mortems, and community knowledge)

---

## Critical Pitfalls

Mistakes that cause rewrites, data loss, revenue impact, or major user-facing failures.

### Pitfall 1: Storing Times Without Timezone Context

**What goes wrong:** Booking times appear shifted by 1+ hours for some users. Recurring events drift after DST transitions. Calendly-style "I booked at noon but it shows 1pm" complaints.

**Why it happens:**
- Using `LocalDateTime` or epoch millis without an associated IANA timezone ID
- Using timezone abbreviations (EST, PST) instead of IANA zone names (America/New_York)
- Displaying UTC times without conversion
- Storing the provider's "wall clock time" and the customer's timezone in separate fields that can get out of sync

**Real-world evidence:** 
- Microsoft Bookings → Apple/iCloud Calendar "1 hour later" bug persists despite correct timezone settings on both sides (Microsoft Q&A 2025)
- Calendly's timezone troubleshooting guide documents this as their #1 support issue
- Multiple studies show 33%+ of professionals have missed meetings due to timezone confusion

**Consequences:**
- Missed appointments → trust erosion → churn
- Support tickets bleed engineering time
- DST transition weeks cause spike in complaints
- For healthcare/legal: regulatory risk if appointment times are wrong

**Prevention:**
1. **Always store event times in UTC** with a separate IANA timezone column (`provider_timezone`)
2. **Use `ZonedDateTime` / `Instant`** types, never `LocalDateTime` alone
3. **Always use IANA timezone IDs** (e.g., `America/New_York`), never abbreviations (`EST`)
4. **Validate timezones** on input against the IANA database
5. **Compute availability windows in UTC** — convert provider's "9am-5pm Eastern" to UTC at query time using their IANA zone + the specific date (DST matters)
6. **Display times converted to the viewer's timezone** using auto-detection (browser/device/geolocation) with manual override option

**Detection:**
- Log the raw stored value + timezone + the user's detected timezone alongside every booking confirmation
- Monitor support ticket volume for "wrong time" complaints — spike during DST transitions = bug
- Unit test every DST boundary (spring-forward, fall-back) for every supported timezone
- Integration test: create booking from one zone, read from another, verify round-trip consistency

**Severity:** CRITICAL  
**Phase to address:** Phase 2 (Core Data Model + Booking Engine) — foundational, hard to retrofit

---

### Pitfall 2: Double-Booking / Race Conditions Under Concurrent Load

**What goes wrong:** Two users simultaneously book the same slot, both get a confirmation. The resource (room, person, seat) is over-committed.

**Why it happens:**
- Application-level "check availability then book" is not atomic — a race window exists between the read and write
- Using in-memory locking alone (not distributed — breaks with multiple server instances)
- No database-level constraint preventing overlapping bookings
- Optimistic concurrency without proper retry or conflict detection

**Real-world evidence:**
- This is the #1 system design interview topic for booking systems for a reason — it's the hardest correctness problem
- Airbnb, Ticketmaster, hotel booking systems all have dedicated engineering teams solving this
- Redis distributed lock pattern with TTL is the recommended approach for multi-instance deployments
- Atomic `UPDATE ... WHERE status = 'AVAILABLE'` or `SELECT ... FOR UPDATE` are the database-level primitives

**Consequences:**
- Two customers show up for the same appointment
- Angry customers, refunds, reputation damage
- In healthcare/gov: safety-critical if overbooked appointments cause missed care
- Legal liability if service-level agreements specify exclusive access

**Prevention:**
1. **Database-level constraints are the source of truth** — app-level checks are insufficient
2. For fixed-slot systems: use a **unique constraint** on `(resource_id, slot_start_utc)` — the DB guarantees no duplicates
3. For variable-length bookings: use **exclusion constraints** (PostgreSQL GiST) or `SELECT ... FOR UPDATE` in a transaction
4. For high-scale: use **Redis distributed locks** with atomic Lua scripts for slot claim + booking
5. Implement **temporary holds** (5-10 min TTL) with a `HELD` state — release on timeout or explicit cancellation
6. Always use **idempotency keys** — each booking attempt carries a unique key so retries don't create duplicates

**Detection:**
- Alert on any `OverlappingBooking` exception in production
- Monitor the ratio of "bookings created" vs "unique slots consumed" — if bookings > slots, double-booking is occurring
- Load test with concurrent booking attempts on the same slot; verify exactly one succeeds

**Severity:** CRITICAL  
**Phase to address:** Phase 3 (Concurrency + Booking Transaction) — requires the data model from Phase 2

---

### Pitfall 3: Google Calendar API Rate Limits and Quota Exhaustion

**What goes wrong:** The application suddenly gets 403/429 errors from Google Calendar API. Events fail to create/sync. The app appears broken.

**Why it happens:**
- Not understanding the **three-tier quota system** (per-project, per-user, per-day)
- **Polling** instead of using push notifications — especially with many users
- Service accounts hitting per-user limits because `quotaUser` parameter isn't set
- Creating/updating events in tight loops instead of batching
- Synchronizing at midnight or on the hour — spiky traffic pattern

**Real-world evidence (official Google Docs, May 2026):**
- **Per minute per project:** 10,000 requests/min
- **Per minute per user per project:** 600 requests/min
- **Per day per project billing threshold:** 1,000,000 requests/day (billing coming later 2026)
- Unknown number of "operational limits" (per-calendar write frequency caps)
- Hundreds of StackOverflow questions about "403 Calendar usage limits exceeded"

**Consequences:**
- Bookings fail silently or with cryptic errors
- Calendar sync breaks — users see stale availability
- Event creation fails → customers don't get calendar invites
- During peak usage (e.g., Monday morning), the app becomes unusable
- Support tickets spike; engineering scrambles

**Prevention:**
1. **Use push notifications (webhooks)** instead of polling — dramatically reduces request volume
2. **Always set `quotaUser`** parameter when using service accounts with domain-wide delegation
3. **Implement exponential backoff** with jitter for all API calls (see Google's recommended algorithm)
4. **Randomize sync times** — never sync all users at midnight; spread across the day
5. **Use incremental sync with sync tokens** — avoid full calendar reads on every sync
6. **Increase page size** (`maxResults`) to reduce pagination round-trips
7. **Batch event updates** — batch API calls where possible
8. **Monitor quota usage** in Google Cloud Console and set up alerting at 70/90/100% thresholds
9. **Register a test project** to simulate rate limit scenarios before they hit production

**Detection:**
- Alert on any 403/429 HTTP status from Google Calendar API
- Track `X-RateLimit-*` response headers
- Monitor Google Cloud Console quota pages
- Create a Grafana dashboard showing per-endpoint API call volume

**Severity:** HIGH  
**Phase to address:** Phase 5 (Google Calendar Integration) — but architecture decisions (poll vs push) must be made in Phase 1

---

### Pitfall 4: Email Deliverability — Confirmation Emails Go to Spam

**What goes wrong:** Booking confirmations, reminders, and cancellation receipts end up in spam folders or are silently dropped. Customers miss appointments because they never saw the confirmation.

**Why it happens:**
- Missing or misconfigured SPF, DKIM, DMARC DNS records
- Sending from a shared IP with poor reputation
- No dedicated sending infrastructure (using `sendmail` or unauthenticated SMTP)
- No warm-up of new sending IP addresses
- High bounce rates from invalid email addresses
- Sending too many emails too fast without rate limiting
- No unsubscribe link (required by Google/Yahoo/Microsoft for bulk senders)

**Real-world evidence:**
- Since 2024, Google, Yahoo, and Microsoft **require** DMARC policy for senders over 5,000 emails/day
- Microsoft mandates DMARC for domains sending >5K/day to Outlook.com
- Booking confirmation emails are transactional (high expectations) — spam placement = lost trust
- Booking.com has a Grade A setup (SPF + DKIM + DMARC + BIMI) — sets the standard
- Common mistake: setting DMARC to `p=none` after initial setup and never moving to `p=quarantine` or `p=reject`

**Consequences:**
- Customers miss appointments → no-show rates spike
- "I never got the confirmation" becomes the #1 support complaint
- Refund requests from customers who claim they didn't receive cancellation notices
- DMARC reports reveal domain is being spoofed for phishing

**Prevention:**
1. **Configure SPF** — list all authorized sending IPs/services
2. **Configure DKIM** — sign all outgoing emails
3. **Configure DMARC** — start with `p=none`, monitor reports for 2-4 weeks, then move to `p=quarantine`, then `p=reject`
4. **Use a dedicated transactional email service** (SendGrid, SES, Mailgun, Postmark) — do NOT send from your app server
5. **Warm up dedicated IPs** — ramp volume gradually over 2-4 weeks
6. **Implement email rate limiting** — don't blast 10,000 emails in 1 minute
7. **Include unsubscribe links** — legally required for marketing, best practice for transactional
8. **Monitor delivery metrics** — bounce rate < 3%, spam complaint rate < 0.1%
9. **Set up BIMI** — brand logo in inbox (optional but builds trust)

**Detection:**
- Monitor email provider delivery dashboard (delivered vs bounced vs spam)
- Set up DMARC aggregate report parsing (tools like Postmark, MXToolbox, dmarcian)
- Track "email not received" support tickets as a KPI
- Periodically send test emails to spam-check tools (mail-tester.com)

**Severity:** HIGH  
**Phase to address:** Phase 4 (Notifications + Email) — need sending infrastructure early; DMARC DNS setup should begin in Phase 1

---

## Moderate Pitfalls

### Pitfall 5: Cancellation Policy Edge Cases Across Timezones

**What goes wrong:** A 24-hour cancellation policy means different things to the provider and customer in different timezones. Customers cancel "on time" by their clock, but the system says they're past the deadline.

**Why it happens:**
- Evaluating "24 hours before the appointment" against the wrong timezone
- Not anchoring the cancellation window to a canonical timezone
- DST transition days have 23-hour or 25-hour days — "24 hours before" is ambiguous
- Customer books at 11 PM their time, cancellation deadline is 11 PM the night before — but provider is in a different zone

**Real-world evidence:**
- Microsoft Bookings and Calendly both have documented issues with cancellation window calculation
- Microsoft Bookings allows setting cancellation policies at both the global and per-service level, creating potential conflicts
- Multiple booking platforms (Acuity, Timify, OnceHub) have KB articles specifically about timezone-aware cancellation — indicating it's a common pain point

**Consequences:**
- Customer charged cancellation fee unfairly → chargeback, bad review
- Provider misses last-minute rebooking opportunity because cancellation wasn't processed
- Legal disputes over refund policies
- Reputational damage: "They charged me even though I cancelled in time"

**Prevention:**
1. **Store cancellation deadlines in UTC** — compute at booking time based on provider's timezone, store as absolute UTC timestamp
2. **Display the deadline in the customer's timezone** on the booking page and in confirmation emails
3. **Handle DST edge cases** — use libraries like `date-fns-tz` or `Luxon` that respect IANA timezone rules
4. **Grace period** — add 1-2 hour buffer to cancellation calculations to absorb minor timezone confusion
5. **Clear communication** — show "You can cancel until [date] at [time] [YOUR TIMEZONE]" in confirmation

**Detection:**
- Log cancellation attempts with the computed deadline, customer timezone, and provider timezone
- Monitor support tickets containing "cancellation fee" or "refund dispute"
- Track cancellation rate as function of timezone distance between customer and provider

**Severity:** MODERATE  
**Phase to address:** Phase 6 (Policies + Cancellation Flow)

---

### Pitfall 6: Calendar UX — Confusing Availability Display

**What goes wrong:** Users can't tell which time slots are available, error-prone booking, high abandonment rate on the booking page.

**Why it happens:**
- Showing available and unavailable slots in the same visual density without clear differentiation
- Grey/unavailable slots that still look clickable
- No visual feedback when selecting time ranges
- Month-view navigation that resets selections on month change
- Loading performance issues — calendar takes >2 seconds to render availability
- Mobile-unfriendly layouts — tiny touch targets, pinch-zoom required

**Real-world evidence:**
- Common UX mistakes documented: interface overload, inconsistent data display, no customization options, poor mobile responsiveness
- Booking UX best practices research shows: cluttered interfaces, poor slot visibility, and lack of intuitive filtering are the top user complaints
- Calendly's success is largely attributed to its simple "pick a date → pick a time" two-step flow

**Consequences:**
- Users abandon booking → lost revenue
- Users book wrong time → cancellation/rebooking cost
- Mobile users can't book → losing 50%+ of potential customers
- Support: "I couldn't find any available slots" (when there were some)

**Prevention:**
1. **Two-step flow** — pick a date first, then show available times for that date (Calendly pattern)
2. **Clear availability indicators** — color-coded (green=available, grey=unavailable, red=conflict)
3. **Show both timezones** — provider's timezone label + "This will be [time] in your timezone"
4. **Visual confirmation** — show a summary card before final booking with all details
5. **Mobile-responsive** — touch-friendly targets (min 44px), no horizontal scroll, swipeable date picker
6. **Loading states** — skeleton loader while computing availability (APIs can be slow)
7. **Buffer visibility** — show buffer times as unavailable (or clearly mark them)
8. **Persistent selections** — don't clear date/time on month navigation or accidental clicks

**Detection:**
- Track booking funnel abandonment rate per step
- Heatmap analysis on calendar interaction
- Session recording — look for rage clicks on unavailable slots
- A/B test any major calendar UI changes

**Severity:** MODERATE  
**Phase to address:** Phase 7 (Booking UI) — but availability data model affects this; should be considered in Phase 2

---

### Pitfall 7: Insecure Direct Object References (IDOR) — Unauthorized Booking Access

**What goes wrong:** User A can view, cancel, or modify User B's booking by guessing/incrementing a booking ID.

**Why it happens:**
- Booking IDs are sequential integers (`/booking/12345`)
- No authorization check on booking read/cancel endpoints
- Assuming that a "secret" URL or ID is sufficient protection (security by obscurity)
- API endpoints return full booking details without ownership verification

**Real-world evidence:**
- CVE-2025-12787: Hydra Booking WordPress plugin — vulnerable to unauthorized booking cancellation in all versions up to 1.1.27 (disclosed Nov 2025)
- CVE-2025-69358: EventPrime Events Calendar — missing capability check allowing unauthenticated actions
- CVE-2024-5889: Events Manager plugin — reflected XSS via the 'country' parameter
- Booking.com experienced a data breach in April 2026 exposing booking information to unauthorized parties
- Microsoft Bookings had an input validation vulnerability allowing HTML injection into meeting invitations

**Consequences:**
- Data breach — customers' booking details exposed
- Someone can cancel another user's appointment
- Privacy violation — viewing who else has booked
- Regulatory liability (GDPR, HIPAA if healthcare)
- Complete loss of trust in the platform

**Prevention:**
1. **Use UUIDs or opaque tokens** instead of sequential integers for booking IDs — but do NOT rely on this alone
2. **Always verify ownership** — every booking read/update/delete endpoint must check: "Does the authenticated user own this booking?"
3. **Authenticate all endpoints** — no unauthenticated booking access (except the booking page itself)
4. **Use cancellation tokens** — email a unique cancellation link to the booking owner (additional layer)
5. **Rate limit booking queries** — prevent enumeration attacks
6. **Audit logs** — log every booking access attempt (especially failures)
7. **Apply the principle of least privilege** — admin roles != customer roles

**Detection:**
- Monitor 403 responses on booking endpoints
- Alert on unusual patterns: same IP querying sequential booking IDs
- Automated security scanning (OWASP ZAP, Burp Suite)
- Regular penetration testing

**Severity:** HIGH  
**Phase to address:** Phase 8 (Security + Access Control) — but fundamental auth must be in Phase 1

---

### Pitfall 8: Data Modeling — Availability vs. Bookings Schema Mismatch

**What goes wrong:** The database design makes it impossible to efficiently query available slots. Performance degrades. Adding new features (recurring availability, buffer times, multi-resource booking) requires schema rewrites.

**Why it happens:**
- Modeling "availability" as the absence of a booking (inverted thinking) instead of explicit availability rules
- Choosing between row-per-day vs open-ended time range without understanding the tradeoffs
- Not indexing for the common query pattern: "find all available slots between time X and time Y for resource R"
- Storing availability as pre-computed slots (bloated table, stale data)
- Mixing availability rules (recurring weekly) with overrides (closed on holidays) in a single table without clear separation

**Real-world evidence:**
- Row-per-day approach: simpler, 365 rows/year per resource, easy to understand, works with B-tree indexes
- GiST index approach: more complex, supports arbitrary time ranges, uses exclusion constraints to prevent overlaps
- Pre-populating slot rows in the DB is considered anti-pattern — compute slots on-the-fly from rules + bookings
- StackOverflow: "Is it good to prepopulate the database with events?" — community consensus is NO, compute from rules

**Consequences:**
- Queries for "next available slot" take seconds instead of milliseconds
- Adding buffer times between appointments requires schema migration
- Supporting recurring availability with exceptions (holidays, vacation) requires complex queries
- Scaling to 10K+ resources requires complete schema redesign
- Data inconsistency: availability rules and bookings get out of sync

**Prevention:**
1. **Separate availability rules from bookings** — separate tables:
   - `availability_rules`: provider_id, day_of_week, start_time, end_time, timezone, start_date, end_date, rrule (for recurring)
   - `availability_overrides`: provider_id, specific_date, start_time, end_time, is_available (for holidays, vacation)
   - `bookings`: id, provider_id, customer_id, start_utc, end_utc, status
2. **Compute available slots at query time** — from rules − overrides − bookings, not from a pre-computed slot table
3. **Choose your slot strategy early:**
   - **Fixed slots** (e.g., every 30 min): simpler, use unique constraint on `(resource_id, slot_start_utc)`
   - **Variable duration** (e.g., 30-90 min): use GiST exclusion constraints or overlap queries with `SELECT ... FOR UPDATE`
4. **Index strategically:** composite indexes on `(provider_id, start_utc)` and `(resource_id, start_utc, end_utc)`
5. **Cache availability** — compute results are cacheable for seconds-to-minutes (Redis)
6. **Document the data model decisions** in ADRs — schema changes are costly

**Two schema approaches (from real-world analysis):**

| Approach | When to Use | Pros | Cons |
|----------|-------------|------|------|
| Row-per-day + B-tree | Small-medium scale, fixed slots | Simple, standard SQL, easy debugging | 365 rows per resource/year, complex for variable durations |
| GiST + Exclusion Constraints | Variable-length bookings, high correctness | Prevents overlaps natively, flexible | Complex queries, PostgreSQL-only, steeper learning curve |

**Detection:**
- Profile the "get available slots" query — if it takes >500ms at 1K resources, schema is wrong
- EXPLAIN ANALYZE on slot queries — look for sequential scans instead of index scans
- Track query response time P95 as the business scales

**Severity:** HIGH (architectural — rewiring later is expensive)  
**Phase to address:** Phase 2 (Core Data Model) — foundational decision

---

## Minor Pitfalls

### Pitfall 9: Google Meet / Video Conference Link Failure

**What goes wrong:** The booking system creates a Google Meet link but it's expired, invalid, or the creator doesn't have permission.

**Why it happens:**
- Using the wrong Google Workspace account to create the conference
- Service account without proper Meet API scopes
- Meet links created by an attendee instead of the organizer
- Meet link quota exceeded (newly enforced limits)
- Conference data not saved in the event properly

**Prevention:**
1. Test Meet link creation with the exact OAuth scopes your app uses
2. Verify the creating user has Google Workspace license that includes Meet
3. Store `conferenceData` correctly using the `conferenceProperties` field
4. Test end-to-end: book → receive email → click link → join meeting
5. Fall back to a custom link if Meet creation fails

**Severity:** LOW-MODERATE  
**Phase to address:** Phase 5 (Calendar Integration)

---

### Pitfall 10: Notification Timing — Reminders That Fire at the Wrong Time

**What goes wrong:** Email/SMS reminders fire at 2 AM for the customer, or fire after the appointment has already started.

**Why it happens:**
- Evaluating "24 hours before" against UTC instead of the recipient's timezone
- Cron jobs running on a fixed UTC schedule without timezone adjustment
- Leap second / clock drift not being accounted for
- Timezone changes between booking and reminder (customer traveled)

**Prevention:**
1. Compute reminder send time in the **recipient's timezone** at booking time, store as UTC
2. For "X hours before" logic, use the appointment's IANA timezone, not UTC
3. Send reminders in a 9am-9pm local-time window to avoid middle-of-the-night delivery
4. Use a task queue with scheduled dispatch (not cron) for reminder timing
5. Include timezone in reminder messages: "Your appointment is at 3:00 PM Eastern"

**Severity:** LOW  
**Phase to address:** Phase 4 (Notifications)

---

### Pitfall 11: Over-Engineering Before Product-Market Fit

**What goes wrong:** Building a distributed, multi-region, highly-available booking system before validating that anyone wants to use it.

**Why it happens:**
- Anticipating "millions of users" from day one
- Adopting Kafka, event sourcing, microservices before a monolith would suffice
- Over-investing in infrastructure the product doesn't need yet

**Prevention:**
1. Start with a monolith + a single database
2. Use Postgres with row-level locking for correctness — this handles thousands of concurrent bookings
3. Add Redis for caching and distributed locks only when load requires it
4. Avoid event-driven architecture until there's a clear "multiple services need this data" reason
5. Premature optimization is the root of all evil — especially in booking systems where correctness > performance

**Severity:** LOW (risk of wasted time, not failure)  
**Phase to address:** Phase 1 (Architecture decisions) — Choose simple, proven patterns

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| **Phase 1: Foundation / Architecture** | Over-engineering stack for scale that doesn't exist yet | Start with monolith + Postgres. Add Redis + distributed locks when load requires. |
| **Phase 2: Core Data Model** | Wrong schema for availability vs bookings | Separate rules, overrides, and bookings tables. Document choice of row-per-day vs GiST. See Pitfall 8. |
| **Phase 2: Core Data Model** | Storing times without timezone context | Always UTC + IANA timezone ID. Never use `LocalDateTime` for storage. See Pitfall 1. |
| **Phase 3: Booking Transaction** | Race conditions causing double-bookings | DB-level constraints are the source of truth. Use unique constraints, exclusion constraints, or `SELECT ... FOR UPDATE`. See Pitfall 2. |
| **Phase 4: Notifications** | Emails going to spam | Configure SPF/DKIM/DMARC before sending. Use dedicated email service, not app server. See Pitfall 4. |
| **Phase 5: Calendar Integration** | Google Calendar API quota exhaustion | Use push notifications, not polling. Set `quotaUser` for service accounts. Implement exponential backoff. See Pitfall 3. |
| **Phase 6: Policies / Cancellations** | 24h cancellation policy broken across timezones | Compute deadlines in provider timezone, store as UTC, display in customer timezone. Add grace buffer. See Pitfall 5. |
| **Phase 7: Booking UI** | Confusing availability display | Two-step flow (date → time). Clear color coding. Show both timezones. Mobile-first design. See Pitfall 6. |
| **Phase 8: Security / Access Control** | Unauthorized booking cancellation/viewing | Use opaque booking IDs. Always verify ownership. Auth on every endpoint. See Pitfall 7. |
| **Phase 9: Admin Dashboard** | Data inconsistency between availability and bookings | Single source of truth for availability computation. Cache is fine, but writes go to the authoritative store. |

---

## Sources

| Source | Content | Confidence |
|--------|---------|------------|
| [Google Calendar API Usage Limits (May 2026)](https://developers.google.com/workspace/calendar/api/guides/quota) | Official quota limits: 10K/min/project, 600/min/user, 1M/day billing threshold | HIGH — official docs |
| [Google Calendar API quota management blog (2021)](https://developers.googleblog.com/the-google-calendar-api-has-changed-how-we-manage-api-usage) | Best practices: push notifications, incremental sync, exponential backoff | HIGH — official |
| [Microsoft Bookings Timezone Bug (MS Q&A 2025)](https://learn.microsoft.com/en-us/answers/questions/5427691/time-zone-discrepancy-microsoft-bookings-appointme) | Real-world timezone discrepancy between Bookings and Apple/iCloud | MEDIUM — user report, confirmed by MS |
| [Calendly Time Zone Troubleshooting Guide](https://community.calendly.com/how-do-i-40/time-zone-troubleshooting-guide-242) | Timezone confusion as #1 support issue | MEDIUM — community official |
| [Redis Distributed Locks for Slot Booking (DEV)](https://dev.to/abhivyaktii/building-a-scalable-slot-booking-system-with-redis-distributed-locks-4cf8) | Redis lock pattern with TTL for preventing double-booking | MEDIUM — engineering article |
| [Double Booking Problem — System Design (ITNEXT)](https://itnext.io/solving-double-booking-at-scale-system-design-patterns-from-top-tech-companies-4c5a3311d8ea) | Airbnb, Ticketmaster patterns: optimistic locking, unique constraints, distributed locks | MEDIUM — engineering analysis |
| [Hotel Booking Schema Design Comparison (DEV)](https://dev.to/sumedhbala/hotel-booking-schema-design-comparison-g3h) | Row-per-day vs GiST index approaches for booking | MEDIUM — engineering deep-dive |
| [Designing Java Applications with Multiple Timezones (2025)](https://prgrmmng.com/designing-applications-multiple-time-zones) | Using `Instant` + `ZonedDateTime`, DST handling patterns | MEDIUM — tutorial |
| [CVE-2025-12787 — Unauthorized Booking Cancellation](https://www.cvedetails.com/cve/CVE-2025-12787/) | WordPress booking plugin vulnerable to unauthorized cancellation | HIGH — official CVE |
| [CVE-2024-5889 — Events Manager XSS](https://github.com/advisories/ghsa-m59m-p56m-7mgm) | Reflected XSS via 'country' parameter | HIGH — official CVE |
| [Booking.com data breach (April 2026)](https://www.securitymagazine.com/articles/102228-bookingcom-customer-data-hacked-exposed) | Customer booking information exposed to unauthorized parties | HIGH — news report |
| [Microsoft Bookings input validation vulnerability (2025)](https://windowsforum.com/threads/microsoft-bookings-vulnerability-how-input-validation-flaws-expose-organizations-to-cyberattacks.365385/) | HTML injection via API input validation flaws | MEDIUM — news report |
| [Booking.com email authentication setup (InboxEagle 2026)](https://www.inboxeagle.com/brand-insights/booking) | SPF/DKIM/DMARC/BIMI setup for Grade A deliverability | HIGH — deliverability tool |
| [Microsoft DMARC requirements for bulk senders (2025)](https://techcommunity.microsoft.com/blog/microsoftdefenderforoffice365blog/strengthening-email-ecosystem-outlook%E2%80%99s-new-requirements-for-high%E2%80%90volume-senders/4399730) | DMARC required for >5K emails/day to Outlook | HIGH — official Microsoft |
| [Booking UX best practices (Eleken 2026)](https://www.eleken.co/blog-posts/calendar-ui) | 33 calendar UI examples with common UX mistakes documented | MEDIUM — design agency |
| [Booking UX to boost conversions (Ralabs 2025)](https://ralabs.org/blog/booking-ux-best-practices) | Clear error messages, edit-friendly forms, mobile-first | MEDIUM — agency guide |
| [Cancellation policy templates and edge cases (Quo 2026)](https://www.quo.com/blog/cancellation-policy-template/) | 12 cancellation policy templates, fee structures | MEDIUM — business blog |
| [Microsoft Bookings scheduling policies](https://learn.microsoft.com/en-us/microsoft-365/bookings/set-scheduling-policies) | Global vs per-service cancellation policy conflicts | HIGH — official docs |
| [Common scheduling mistakes (OnceHub)](https://oncehub.com/blog/scheduling-meetings-5-common-mistakes-to-avoid-while-scheduling-meetings) | No self-service booking, ignoring timezones, no reminders | LOW — marketing blog |
| [PostgreSQL exclusion constraints for booking (OneUptime 2026)](https://oneuptime.com/blog/post/2026-03-31-redis-model-booking-reservation-systems/view) | Redis sorted sets + Lua for atomic booking | MEDIUM — engineering blog |

---

## Confidence Assessment

| Area | Confidence | Reason |
|------|------------|--------|
| Timezone handling | HIGH | Official docs + community evidence across multiple platforms (Calendly, Microsoft, Google) |
| Double-booking / Race conditions | HIGH | Well-documented system design patterns, verified in multiple engineering analyses |
| Google Calendar API quotas | HIGH | Official Google documentation (May 2026), StackOverflow community consensus |
| Email deliverability | HIGH | Official requirements from Google/Yahoo/Microsoft, documented best practices |
| Cancellation policy edge cases | MEDIUM | Industry KB articles confirm the problem exists; limited public post-mortems |
| Calendar UX pitfalls | MEDIUM | Design agency research + UX community patterns; subjective but well-documented |
| Security (IDOR, XSS) | HIGH | Multiple CVEs for booking/calendar plugins prove these are real attack vectors |
| Data modeling | HIGH | Published schema comparisons + community consensus on StackOverflow |

---

## Gaps to Address

- **Payment processing pitfalls** — not covered here (fraud, chargebacks, PCI compliance) because payment is not in scope for this research. If payments are added, this becomes a critical pitfall.
- **Scalability at >100K concurrent users** — queue-based booking (virtual waiting room pattern) is needed at that scale but unlikely in early phases.
- **Mobile push notification deliverability** — APNs and FCM token expiry/cache invalidation is a separate deep topic.
- **Calendar sync conflicts** — when a user changes their Google Calendar directly (not through the booking system), events can get out of sync. Handling two-way sync conflicts is a known hard problem.
