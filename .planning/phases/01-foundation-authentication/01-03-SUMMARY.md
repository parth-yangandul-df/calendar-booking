---
phase: 01-foundation-authentication
plan: 03
subsystem: auth
tags: [react, axios, zod, react-hook-form, tanstack-query, shadcn-ui]

requires:
  - phase: 01-01
    provides: Vite React scaffold, @/ path alias, shadcn components, Tailwind v4, Vite proxy
provides:
  - Auth frontend: Login page, Register page, AuthContext with session restore
  - Axios HTTP client with 401 auto-refresh interceptor and failed request queue
  - Zod validation schemas for login and registration forms
  - ProtectedRoute guard and Navbar logout
  - App shell routing with QueryClientProvider wrapper
affects: [02-availability-management, 03-booking-creation, 04-admin-dashboard]

tech-stack:
  added: [zod]
  patterns:
    - "Axios interceptor with 401 failed request queue (module-level isRefreshing + failedQueue)"
    - "AuthContext with module-level sessionChecked flag (persists across route changes)"
    - "Zod schemas for all form validation (reused across client-side + server parity)"
    - "react-hook-form with zodResolver for form state management"
    - "ProtectedRoute pattern with isLoading guard (prevents redirect flash)"

key-files:
  created:
    - client/src/api/client.ts
    - client/src/features/auth/api/authApi.ts
    - client/src/features/auth/schemas/loginSchema.ts
    - client/src/features/auth/schemas/registerSchema.ts
    - client/src/features/auth/AuthContext.tsx
    - client/src/features/auth/useAuth.ts
    - client/src/features/auth/pages/LoginPage.tsx
    - client/src/features/auth/pages/RegisterPage.tsx
    - client/src/features/auth/pages/DashboardPage.tsx
    - client/src/components/layout/ProtectedRoute.tsx
    - client/src/components/layout/Navbar.tsx
    - client/src/pages/NotFoundPage.tsx
  modified:
    - client/src/App.tsx

key-decisions:
  - "Axios interceptor with failed request queue (not single retry) for concurrent 401 safety"
  - "Auth session restored via POST /auth/refresh on mount (httpOnly cookies, no localStorage)"
  - "Module-level sessionChecked flag prevents redundant session restore calls"
  - "navigate with replace: true prevents referrer leak in history (T-03-03 mitigation)"
  - "react-hook-form + zodResolver — not raw form state — for validation reusability with UI binding"

patterns-established:
  - "AuthContext pattern: exposes user, isAuthenticated, isLoading, login, register, logout"
  - "ProtectedRoute pattern: isLoading → loading state, !isAuthenticated → redirect, otherwise <Outlet />"
  - "Route structure: /login and /register outside ProtectedRoute; / and sub-routes inside"

requirements-completed: [AUTH-01, AUTH-02, AUTH-03]

duration: 12min
completed: 2026-05-22
---

# Phase 01 Plan 03: Auth Frontend Summary

**Login and Register pages with session restore via AuthContext, Axios 401 interceptor, Zod validation, and ProtectedRoute guard**

## Performance

- **Duration:** 12 min
- **Started:** 2026-05-22T15:40:00Z
- **Completed:** 2026-05-22T15:52:00Z
- **Tasks:** 3
- **Files modified:** 14

## Accomplishments
- Axios HTTP client with `/api/v1` base URL and `withCredentials: true` (sends httpOnly cookies)
- 401 response interceptor with failed request queue pattern — queues concurrent 401s, calls single POST `/auth/refresh`, retries all on success, redirects to `/login` on failure
- AuthContext with module-level `sessionChecked` flag preventing redundant session restore across route changes
- `useAuth()` hook with provider validation error message
- Login page at `/login` with "Welcome back" heading, email + password fields, inline Zod validation, toast errors on 401/server error, "Signing in..." loading state, "Sign up" link to `/register`
- Register page at `/register` with "Create your account" heading, email + password + confirm password fields, password strength validation (8+ chars, lowercase + uppercase + digit), confirm match, toast errors, "Creating account..." loading state, "Sign in" link to `/login`
- Dashboard welcome page at `/` showing user email
- NotFoundPage at `*` with "Go home" button
- ProtectedRoute with isLoading guard (prevents redirect flash before session restore)
- Navbar with app name "Calendar Booking", user email, and "Sign Out" button (visible when authenticated)
- Full App.tsx routing: QueryClientProvider → BrowserRouter → AuthProvider → Toaster + Routes
- Zero TypeScript errors, zero build errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Axios client, Auth API, Zod schemas** - `4e53288` (feat)
2. **Task 2: AuthContext, useAuth, ProtectedRoute, Navbar** - `7258b01` (feat)
3. **Task 3: LoginPage, RegisterPage, DashboardPage, NotFoundPage, App.tsx** - `d996fc9` (feat)

## Files Created/Modified
- `client/src/api/client.ts` — Axios instance with 401 interceptor and failed request queue
- `client/src/features/auth/api/authApi.ts` — Typed API functions (register, login, refresh, logout)
- `client/src/features/auth/schemas/loginSchema.ts` — Zod schema: valid email + min 8 password
- `client/src/features/auth/schemas/registerSchema.ts` — Zod schema: email, password (8+, a-z, A-Z, 0-9), confirm match
- `client/src/features/auth/AuthContext.tsx` — Auth state management with session restore via /auth/refresh
- `client/src/features/auth/useAuth.ts` — Convenience hook wrapping useContext
- `client/src/features/auth/pages/LoginPage.tsx` — Login form with shadcn Card + Input + Button, Zod validation, toast errors
- `client/src/features/auth/pages/RegisterPage.tsx` — Registration form with same pattern
- `client/src/features/auth/pages/DashboardPage.tsx` — Post-login welcome page
- `client/src/components/layout/ProtectedRoute.tsx` — Route guard with loading/redirect/outlet
- `client/src/components/layout/Navbar.tsx` — App header with user email and sign out
- `client/src/pages/NotFoundPage.tsx` — 404 page with go home button
- `client/src/App.tsx` — Full routing with QueryClientProvider, AuthProvider, Toaster, ProtectedRoute

## Decisions Made
- **Failed request queue pattern**: Instead of a simple retry, the interceptor uses a queue to handle concurrent 401s gracefully — only one refresh call is made, and all queued requests are retried once the token refreshes. This prevents race conditions when multiple API calls fail with 401 simultaneously.
- **Module-level sessionChecked**: The flag lives outside React state (module-level variable) so it persists across re-renders and route changes within the same page lifetime. This prevents redundant POST /auth/refresh calls on every navigation.
- **Zod without react-hook-form integration for schemas**: Schemas are pure Zod (no @hookform/resolvers dependency in the schema files) — they remain framework-agnostic and testable independently of the form library.
- **navigate(..., { replace: true })**: On successful login/register, the redirect uses `replace` to prevent the login URL from remaining in browser history (mitigates T-03-03).

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Threat Surface Items

| Flag | File | Description |
|------|------|-------------|
| threat_flag: new_network_client | client/src/api/client.ts | Axios client communicates with `/api/v1/auth/*` endpoints |
| threat_flag: session_restore | client/src/features/auth/AuthContext.tsx | Session restore calls POST /auth/refresh on mount |
| threat_flag: auth_redirect | client/src/features/auth/pages/LoginPage.tsx | Login sends user credentials via POST to backend |

## Next Phase Readiness
All auth frontend UI is complete. Next phases can build on:
- AuthContext provides `user`, `isAuthenticated`, `isAdmin` for role-based UI (Phase 4 admin dashboard)
- Axios client provides auto-refresh for all subsequent API calls
- Toaster + error handling pattern established for all API interactions

---

*Phase: 01-foundation-authentication*
*Completed: 2026-05-22*
