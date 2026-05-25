# Plan 03-02 Summary: Email Notifications and Hangfire Jobs

**Status:** Complete  
**Phase:** 03-booking-engine  
**Wave:** 2

## What Was Built

Implemented async email notifications for the booking lifecycle using Hangfire (SQL Server job store) and MailKit SMTP.

### Files Created

- `src/backend/Application/Common/Interfaces/IEmailService.cs` — Email service interface
- `src/backend/Application/Common/Interfaces/IBookingEmailJobService.cs` — Booking email job service interface (4 Enqueue methods)
- `src/backend/Infrastructure/Email/EmailService.cs` — MailKit SMTP implementation (configurable via Email:* env vars)
- `src/backend/Infrastructure/Email/BookingEmailTemplates.cs` — Static plain-text email templates for all lifecycle events
- `src/backend/Infrastructure/Jobs/SendBookingEmailJob.cs` — Hangfire job: 4 async send methods
- `src/backend/Infrastructure/Jobs/BookingEmailJobService.cs` — IBackgroundJobClient-based service that enqueues Hangfire jobs

### Files Modified

- `src/backend/Infrastructure/Infrastructure.csproj` — Added Hangfire.Core, Hangfire.SqlServer, Hangfire.AspNetCore, MailKit packages
- `src/backend/Api/Program.cs` — AddHangfire(SqlServer), AddHangfireServer, AddScoped email services, UseHangfireDashboard
- `src/backend/Api/Controllers/BookingController.cs` — Added IBookingEmailJobService injection; EnqueueBooking* calls after POST, PATCH accept, PATCH decline, DELETE
- `src/backend/Api/appsettings.Development.json` — Email section with placeholder config (real credentials via env vars)

## Key Decisions

- EmailService returns silently if Host is empty (dev-friendly, no crash when SMTP not configured)
- Hangfire dashboard at /hangfire (dev only — production must restrict access)
- Email credentials must come from environment variables, never hardcoded
- IBookingEmailJobService interface decouples BookingController from Hangfire directly

## Verification

- `dotnet build src/backend/Api/Api.csproj` — 0 errors
- Infrastructure.csproj contains Hangfire.SqlServer and MailKit
- Program.cs contains AddHangfire, AddHangfireServer, UseHangfireDashboard
- BookingController.cs contains all 4 EnqueueBooking* calls
