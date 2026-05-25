# Plan 01-02 Summary: Auth Backend

**Status:** Complete
**Plan:** 01-foundation-authentication-02 (Wave 2)
**Dependencies:** Plan 01-01

## What Was Built

### Application Layer (Contracts)
- `ITokenService.cs` — JWT generation + refresh token generation interface
- `IRefreshTokenRepository.cs` — Refresh token persistence contract (CRUD + revoke all)
- `RegisterRequest.cs`, `LoginRequest.cs`, `AuthResponse.cs`, `RefreshRequest.cs` — Request/response DTOs
- `RegisterRequestValidator.cs` — FluentValidation: email, password (8+ chars, digit+letter), confirm match
- `LoginRequestValidator.cs` — FluentValidation: email + password not empty

### Infrastructure Layer (Implementation)
- `TokenService.cs` — JWT generation (15min expiry, claims: NameIdentifier, Email, Role, IsAdmin) + 64-byte refresh tokens via `RandomNumberGenerator`
- `RefreshTokenRepository.cs` — EF Core CRUD for refresh tokens with `SaveChangesAsync`
- `AdminSeeder.cs` — Runtime admin seed via `UserManager.CreateAsync()` (idempotent, reads from appsettings)
- `EF Core Migration (InitialCreate)` — Identity schema + RefreshToken table with unique index + FK

### API Layer (Endpoints)
- `AuthController.cs` — 4 endpoints at `/api/v1/auth/`:
  - `POST /register` — Create user, return AuthResponse
  - `POST /login` — Validate credentials, set httpOnly AccessToken + RefreshToken cookies, return AuthResponse
  - `POST /refresh` — Rotate refresh token, issue new access token, set new cookies
  - `POST /logout` — Revoke refresh token, clear cookies (requires `[Authorize]`)
- `ExceptionHandlingMiddleware.cs` — Global exception handler returning ProblemDetails (RFC 7807)
- `Program.cs` — Updated with service registrations, migration auto-apply, admin seed

## Verification Results

| Test | Result |
|------|--------|
| `dotnet build` | ✅ Build succeeded (0 errors, 0 warnings) |
| API starts, migrations auto-apply | ✅ Migrated to local MSSQLSERVER |
| Admin seeded on startup | ✅ admin@calbooking.com created |
| POST /register (new user) | ✅ 200 — returns email + isAdmin=false |
| POST /login (valid credentials) | ✅ 200 — returns email + isAdmin=true |
| POST /login (invalid password) | ✅ 401 |
| POST /register (duplicate email) | ✅ 400 — ProblemDetails error |
| Cookies | AccessToken (httpOnly) + RefreshToken (httpOnly) |

## Deviations
- **D-13 changed**: Local SQL Server (MSSQLSERVER) instead of Docker SQL Server — user has SSMS installed
- Connection string: `Server=localhost;Database=CalendarBookingDb;User Id=sa;Password=<user-provided>;TrustServerCertificate=True;`
- `docker-compose.yml` removed from project
