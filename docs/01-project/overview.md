# Project Overview

## What This Is

A web-based calendar booking system. Users define their monthly availability, others book time slots. Each booking auto-generates a Google Meet link. Both parties get email notifications.

Built for individuals and teams who need structured scheduling with a fixed 24-hour cancellation policy.

## Core Value

> Users can reliably book time with each other through shared calendar availability, with automatic Google Meet links and email confirmations.

## Context

- Greenfield project — no existing codebase
- Users need a simple way to share availability without back-and-forth emails
- Google Meet integration removes friction of setting up meeting links separately
- 24-hour cancellation policy is fixed (not configurable per-user in v1)
- Email notifications keep both parties informed without polling the app

## Constraints

| Constraint | Detail |
|------------|--------|
| **Email delivery** | Requires SMTP or email service integration |
| **Google Meet** | Requires Google Calendar API or Google Meet API access |
| **24h cancellation** | Fixed policy enforced at application level |
| **Seed admin** | Must be created at system initialization |

## Out of Scope (v1)

- Recurring availability patterns
- Payment integration
- Third-party calendar sync (Google Calendar, Outlook)
- Mobile apps (web-first)
- Team / org features (individual users only)
