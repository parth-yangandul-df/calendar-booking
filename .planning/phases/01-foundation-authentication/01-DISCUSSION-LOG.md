# Phase 1: Foundation & Authentication - Discussion Log

**Date:** 2026-05-22
**Mode:** auto (fully autonomous)

## Areas Discussed

All gray areas were auto-selected and auto-resolved with recommended defaults:

### Auth UI Layout
- **Chosen:** Separate Login and Register pages (shadcn/ui + React Hook Form + Zod)

### JWT Token Strategy
- **Chosen:** httpOnly cookies for access tokens, refresh token rotation (15min access, 7 day refresh)

### Admin Seed Approach
- **Chosen:** EF Core migration seed via `HasData()`, credentials in appsettings.Development.json

### Project Structure
- **Chosen:** Vite + React 18 frontend, ASP.NET Core 8 Clean Architecture backend

### Error Handling
- **Chosen:** ProblemDetails API responses, shadcn Sonner toasts for errors

### Password Policy
- **Chosen:** ASP.NET Core Identity defaults (min 8 chars, digit + letter)

### Role Management
- **Chosen:** Simple enum on ApplicationUser (Admin/User), JWT claim check

## Deferred Ideas

- Password reset → future phase
- Email verification → v2
- OAuth/Social login → v2
