# Phase 1: Foundation & Authentication

**Status:** ✅ Complete (2026-05-22)
**Requirements:** AUTH-01, AUTH-02, AUTH-03, ADMIN-01
**Plans:** 3/3 executed

---

## What Was Built

### Plan 01 — Project Skeleton

- Docker Compose with SQL Server 2022 (port 1433)
- ASP.NET Core 8 Clean Architecture solution: Domain → Application → Infrastructure → Api
- Domain entities: `ApplicationUser` (extends IdentityUser with IsAdmin), `RefreshToken`
- EF Core DbContext with Identity + RefreshToken configuration
- JWT Bearer + CORS + Serilog middleware skeleton
- Vite + React 19 + shadcn/ui (Nova preset) frontend
- TanStack Query, React Router, React Hook Form + Zod installed
- Vite proxy `/api/*` → backend at `localhost:5000`

### Plan 02 — Auth Backend

- Custom `AuthController`: register, login, refresh (rotation), logout
- JWT access token (15min) + opaque refresh token (7 days), both httpOnly cookies
- ASP.NET Core Identity for user management (not `MapIdentityApi`)
- `TokenService` + `RefreshTokenRepository` in Infrastructure layer
- FluentValidation for login/register DTOs
- Runtime `AdminSeeder` — creates admin from `appsettings.json` on startup
- Initial EF migration

### Plan 03 — Auth Frontend

- `LoginPage` + `RegisterPage` with shadcn/ui forms + Zod validation
- `AuthContext` (React Context) with `login()`, `register()`, `logout()`
- Session restore on page refresh via `/auth/refresh` call
- `ProtectedRoute` component wrapping authenticated-only pages
- Axios interceptor with 401 → refresh → retry queue pattern
- `Navbar` with user email + logout button

---

## Key Decisions

| Decision | Choice | Why |
|----------|--------|-----|
| JWT storage | httpOnly cookie | Prevents XSS token theft |
| Token lifetime | Access: 15min, Refresh: 7 days | Rotation invalidates old tokens |
| Role model | `IsAdmin` boolean on user | No IdentityRole table needed in v1 |
| Admin seed | Runtime class | Not EF `HasData()` — password would be in migration code |
| Frontend stack | Vite + shadcn/ui (Nova) | Standard for modern React SPAs |
| Backend arch | Clean Architecture 4-layer | Domain → Application → Infrastructure → Api |

## UI Spec

| Page | Route | Elements |
|------|-------|----------|
| Login | `/login` | Email, Password, "Sign In" button, "Sign up" link |
| Register | `/register` | Email, Password, Confirm Password, "Create Account" button |
| Dashboard | `/` | Placeholder (replaced in Phase 2 by calendar) |

## Plans

| # | Name | What It Built |
|---|------|--------------|
| 01-01 | Walking Skeleton | Docker, ASP.NET solution, Vite/React scaffold, shadcn/ui |
| 01-02 | Auth Backend | AuthController, TokenService, AdminSeeder, EF migration |
| 01-03 | Auth Frontend | Login/Register pages, AuthContext, ProtectedRoute, Axios interceptor |
