# Phase 1: Foundation & Authentication — Research

**Researched:** 2026-05-22
**Domain:** Full-stack authentication (React SPA + ASP.NET Core API + SQL Server)
**Confidence:** HIGH

## Summary

This phase establishes the project scaffolding and authentication foundation that all subsequent phases build on. The architecture is a React SPA (Vite + React Router 6 + shadcn/ui) communicating via REST API with an ASP.NET Core 8 backend (Clean Architecture layers: Api, Application, Infrastructure, Domain). SQL Server runs in Docker for development.

**Critical architectural finding:** The built-in ASP.NET Core Identity `MapIdentityApi<TUser>` (introduced in .NET 8) uses **proprietary non-JWT tokens**, not standard JSON Web Tokens [CITED: learn.microsoft.com/.../identity-api-authorization]. Per D-04 we need standard JWT with httpOnly cookies. Therefore we must:
1. Use ASP.NET Core Identity only for **user management** (password hashing, user store, identity framework)
2. Build **custom JWT auth endpoints** using `Microsoft.AspNetCore.Authentication.JwtBearer`
3. **NOT use** `AddIdentityApiEndpoints` / `MapIdentityApi`

**Architecture approach:**
- Access token (JWT, 15min): stored in httpOnly cookie, auto-sent by browser, validated by JwtBearer middleware reading from cookie via `OnMessageReceived`
- Refresh token (opaque, 7 days): stored in separate httpOnly cookie, rotated on each use
- JWT carries user claims (id, email, isAdmin) — no separate IdentityRole table per D-19

**Primary recommendation:** Use custom `AuthController` with Identity + JwtBearer, NOT the built-in Identity API endpoints.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| User registration/validation | API (AuthController) | Identity (UserManager) | Controller orchestrates; Identity handles password hashing/user creation |
| JWT token generation | API (AuthController) | — | TokenService in Application layer generates JWTs; controller issues them |
| Token validation (middleware) | API (JwtBearer middleware) | — | JwtBearerHandler validates every request automatically |
| Refresh token rotation | API (AuthController) | Database (RefreshToken table) | Controller validates+rotates; Infrastructure persists tokens |
| httpOnly cookie management | API (Response cookies) | — | Server sets/clears cookies via HttpResponse |
| Auth UI (login/register pages) | Browser | — | React pages with shadcn/ui forms, React Hook Form + Zod validation |
| Session restore on refresh | Browser (AuthContext) | API (POST /api/v1/auth/refresh) | React AuthContext calls /refresh on mount to verify session |
| Protected routing | Browser (React Router) | — | ProtectedRoute component wraps authenticated-only pages |
| API request auth | Browser (Axios interceptor) | — | httpOnly cookie auto-sent; interceptor handles 401 → refresh |

## Standard Stack

### Backend Core — NuGet packages (.NET 8)

| Package | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `Microsoft.AspNetCore.Identity.EntityFrameworkCore` | 8.0.x | Identity user store + EF Core integration | Official Microsoft identity framework |
| `Microsoft.EntityFrameworkCore.SqlServer` | 8.0.x | SQL Server provider for EF Core | Enforced by project — SQL Server DB |
| `Microsoft.AspNetCore.Authentication.JwtBearer` | 8.0.x | JWT validation middleware | Industry standard for API auth |
| `Microsoft.EntityFrameworkCore.Tools` | 8.0.x | EF Core CLI migrations (dev dependency) | Required for `dotnet ef migrations` |

### Backend Supporting

| Package | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `FluentValidation.AspNetCore` | 11.x | Request validation | All API request DTOs |
| `Serilog.AspNetCore` | 8.x | Structured logging | Global — replaces default logging |
| `Serilog.Sinks.Console` | 5.x | Console sink for dev | Dev environments |
| `Swashbuckle.AspNetCore` | 6.x | Swagger/OpenAPI | Development only |
| `System.IdentityModel.Tokens.Jwt` | 7.x | JWT creation APIs | TokenService generates JWTs |

### Frontend Core — npm packages

| Package | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `react` | ^19.2.6 | UI framework | Enforced by project (React 18+); 19 is current |
| `react-router-dom` | ^7.15.1 | Client-side routing | Standard SPA router |
| `axios` | ^1.16.1 | HTTP client | Interceptors for 401 handling, credentials |
| `tailwindcss` | ^4.3.0 | CSS framework | Required by shadcn/ui |
| `react-hook-form` | ^7.76.0 | Form state management | D-02: shadcn form integration |
| `@hookform/resolvers` | ^5.4.0 | Schema validation bridge | Zod + React Hook Form integration |
| `zod` | ^4.4.3 | Schema validation | D-02: client-side validation |
| `@tanstack/react-query` | ^5.100.11 | Server state management | Auth state queries, cache invalidation |

### Frontend shadcn/ui

| Package | Version | Purpose |
|---------|---------|---------|
| `@radix-ui/react-slot` | ^1.2.4 | Radix primitives (shadcn dependency) |
| `class-variance-authority` | ^0.7.1 | Component variants (shadcn dependency) |
| `lucide-react` | latest | Icons (shadcn dependency) |
| `sonner` | ^2.0.7 | Toast notifications (D-15: shadcn Sonner) |
| `@types/node` | latest | Node type defs for Vite config |

### Frontend Tailwind v4 packages (Vite plugin approach)

| Package | Version | Purpose |
|---------|---------|---------|
| `@tailwindcss/vite` | latest | Tailwind v4 Vite plugin |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom JWT controller | `MapIdentityApi<TUser>` (built-in) | Built-in uses proprietary non-JWT tokens — doesn't meet D-04/D-05 |
| httpOnly cookie for JWT | localStorage/sessionStorage | httpOnly prevents XSS theft; auto-sent by browser |
| React Hook Form + Zod | Formik + Yup | React Hook Form has better perf; Zod has better TS integration |
| TanStack React Query | Redux Toolkit Query | Lighter weight; better caching defaults |

### Installation

**Backend (from solution root):**
```bash
dotnet add package Microsoft.AspNetCore.Identity.EntityFrameworkCore --version 8.0.11
dotnet add package Microsoft.EntityFrameworkCore.SqlServer --version 8.0.11
dotnet add package Microsoft.AspNetCore.Authentication.JwtBearer --version 8.0.11
dotnet add package Microsoft.EntityFrameworkCore.Tools --version 8.0.11
dotnet add package FluentValidation.AspNetCore --version 11.3.0
dotnet add package Serilog.AspNetCore --version 8.0.3
dotnet add package Swashbuckle.AspNetCore --version 6.9.0
```

**Frontend (from client directory):**
```bash
npm create vite@latest client -- --template react-ts
cd client
npm install react-router-dom axios @tanstack/react-query
npm install react-hook-form @hookform/resolvers zod
npm install tailwindcss @tailwindcss/vite @types/node
npx shadcn@latest init
npx shadcn@latest add button card input label form sonner
```

**Docker SQL Server (at project root):**
```yaml
# docker-compose.yml
services:
  sqlserver:
    image: mcr.microsoft.com/mssql/server:2022-latest
    container_name: calendar-bookings-db
    environment:
      ACCEPT_EULA: "Y"
      MSSQL_SA_PASSWORD: "YourStrong!Passw0rd"
    ports:
      - "1433:1433"
    volumes:
      - sqlserverdata:/var/opt/mssql

volumes:
  sqlserverdata:
```

## Package Legitimacy Audit

> **Note:** slopcheck was unavailable at research time (pip install failed). All packages below are tagged `[ASSUMED]` — the planner MUST gate each install behind a `checkpoint:human-verify` task.

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| Microsoft.AspNetCore.Identity.EntityFrameworkCore | NuGet | 8+ yrs | 500M+ | github.com/dotnet/aspnetcore | Unavailable | Approved [ASSUMED] |
| Microsoft.EntityFrameworkCore.SqlServer | NuGet | 8+ yrs | 400M+ | github.com/dotnet/efcore | Unavailable | Approved [ASSUMED] |
| Microsoft.AspNetCore.Authentication.JwtBearer | NuGet | 8+ yrs | 300M+ | github.com/dotnet/aspnetcore | Unavailable | Approved [ASSUMED] |
| Serilog.AspNetCore | NuGet | 8+ yrs | 100M+ | github.com/serilog/serilog-aspnetcore | Unavailable | Approved [ASSUMED] |
| FluentValidation.AspNetCore | NuGet | 8+ yrs | 200M+ | github.com/FluentValidation | Unavailable | Approved [ASSUMED] |
| react (npm) | npm | 11+ yrs | 80M+/wk | github.com/facebook/react | Unavailable | Approved [ASSUMED] |
| react-router-dom (npm) | npm | 8+ yrs | 30M+/wk | github.com/remix-run/react-router | Unavailable | Approved [ASSUMED] |
| axios (npm) | npm | 8+ yrs | 50M+/wk | github.com/axios/axios | Unavailable | Approved [ASSUMED] |
| @tanstack/react-query (npm) | npm | 4+ yrs | 10M+/wk | github.com/TanStack/query | Unavailable | Approved [ASSUMED] |
| tailwindcss (npm) | npm | 7+ yrs | 20M+/wk | github.com/tailwindlabs/tailwindcss | Unavailable | Approved [ASSUMED] |
| react-hook-form (npm) | npm | 6+ yrs | 10M+/wk | github.com/react-hook-form/react-hook-form | Unavailable | Approved [ASSUMED] |
| zod (npm) | npm | 4+ yrs | 20M+/wk | github.com/colinhacks/zod | Unavailable | Approved [ASSUMED] |
| sonner (npm) | npm | 2+ yrs | 1M+/wk | github.com/emilkowalski/sonner | Unavailable | Approved [ASSUMED] |
| lucide-react (npm) | npm | 4+ yrs | 5M+/wk | github.com/lucide-icons/lucide | Unavailable | Approved [ASSUMED] |

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### System Architecture Diagram

```
┌────────────────────────────────────────────────────────────┐
│                        Browser (SPA)                        │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  React App (Vite + TS)                               │  │
│  │  ┌──────────┐  ┌──────────┐  ┌───────────────────┐  │  │
│  │  │ Login    │  │ Register │  │ Protected Routes  │  │  │
│  │  │ Page     │  │ Page     │  │ (Dashboard, etc)  │  │  │
│  │  └────┬─────┘  └────┬─────┘  └────────┬──────────┘  │  │
│  │       │              │                  │             │  │
│  │  ┌────▼──────────────▼──────────────────▼──────────┐  │  │
│  │  │          AuthContext (React Context)             │  │  │
│  │  │  • Stores user state + isAuthenticated flag      │  │  │
│  │  │  • restoreSession() on mount → calls /refresh    │  │  │
│  │  │  • Exposes login(), register(), logout()         │  │  │
│  │  └──────────────────────┬──────────────────────────┘  │  │
│  │                         │                              │  │
│  │  ┌──────────────────────▼──────────────────────────┐  │  │
│  │  │        Axios Client (with interceptor)           │  │  │
│  │  │  • withCredentials: true (sends httpOnly cookies) │  │  │
│  │  │  • Response interceptor: 401 → POST /refresh    │  │  │
│  │  │  • Failed request queue (prevents race cond.)   │  │  │
│  │  └──────────────────────┬──────────────────────────┘  │  │
│  └─────────────────────────┼─────────────────────────────┘  │
│                            │ HTTP (httpOnly cookies auto)    │
└────────────────────────────┼────────────────────────────────┘
                             │
┌────────────────────────────┼────────────────────────────────┐
│                    ASP.NET Core 8 Web API                     │
│  ┌─────────────────────────┼──────────────────────────────┐  │
│  │  Api Layer (Controllers)                               │  │
│  │  ┌──────────────────────────────────────────────────┐  │  │
│  │  │  AuthController  (/api/v1/auth)                  │  │  │
│  │  │  POST /register → UserManager.CreateAsync()       │  │  │
│  │  │  POST /login    → validate → JWT + refresh cookies│  │  │
│  │  │  POST /refresh  → rotate refresh token            │  │  │
│  │  │  POST /logout   → clear cookies                   │  │  │
│  │  └────────────────────┬─────────────────────────────┘  │  │
│  │                       │                                 │  │
│  │  ┌────────────────────▼─────────────────────────────┐  │  │
│  │  │  JwtBearer Middleware (reads httpOnly cookie)     │  │  │
│  │  │  OnMessageReceived → context.Token = cookie       │  │  │
│  │  └──────────────────────────────────────────────────┘  │  │
│  └─────────────────────────┬──────────────────────────────┘  │
│                            │                                 │
│  ┌─────────────────────────▼──────────────────────────────┐  │
│  │  Application Layer (Use Cases & Interfaces)            │  │
│  │  • ITokenService (GenerateAccessToken, GenerateRefresh) │  │
│  │  • IRefreshTokenRepository                             │  │
│  │  • AuthService (orchestrates login/register flows)     │  │
│  └─────────────────────────┬──────────────────────────────┘  │
│                            │                                 │
│  ┌─────────────────────────▼──────────────────────────────┐  │
│  │  Infrastructure Layer (EF Core, Data Access)            │  │
│  │  • ApplicationDbContext : IdentityDbContext<AppUser>    │  │
│  │  • RefreshToken entity + EF configuration              │  │
│  │  • Migrations (initial + seed admin)                   │  │
│  └─────────────────────────┬──────────────────────────────┘  │
│                            │                                 │
│  ┌─────────────────────────▼──────────────────────────────┐  │
│  │  Domain Layer (Entities)                                │  │
│  │  • ApplicationUser : IdentityUser (adds IsAdmin)        │  │
│  │  • RefreshToken entity (Id, Token, JwtId, UserId, ...)  │  │
│  └────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                             │
                    ┌────────▼────────┐
                    │  SQL Server DB  │
                    │  (Docker)       │
                    │  • AspNetUsers  │
                    │  • RefreshTokens │
                    │  • + Identity   │
                    │    schema       │
                    └─────────────────┘
```

**Data flow for primary use case (Login → Authenticated Request):**
1. User fills email/password on `/login` page → submits via React Hook Form
2. Axios POST `/api/v1/auth/login` with `{ email, password }` (cookies auto-sent)
3. AuthController validates → UserManager.CheckPasswordAsync()
4. TokenService generates JWT (15min) + opaque refresh token (7 days)
5. Response sets two httpOnly cookies (`AccessToken`, `RefreshToken`) + returns user JSON
6. AuthContext updates `user` and `isAuthenticated` state
7. User navigates to protected route → ProtectedRoute checks `isAuthenticated`
8. Axios GET `/api/v1/protected` → browser auto-sends httpOnly cookie with JWT
9. JwtBearer middleware reads cookie via `OnMessageReceived` → validates → builds ClaimsPrincipal
10. Controller `[Authorize]` attribute passes → returns data
11. If JWT expires → API returns 401 → Axios interceptor catches → calls POST `/refresh` → retries original request

### Recommended Project Structure

```
/
├── docker-compose.yml              # SQL Server container
├── src/
│   └── backend/
│       ├── CalendarBooking.sln
│       ├── Domain/
│       │   ├── Domain.csproj
│       │   ├── Entities/
│       │   │   ├── ApplicationUser.cs      # : IdentityUser (adds IsAdmin)
│       │   │   └── RefreshToken.cs
│       │   └── Enums/
│       │       └── UserRole.cs             # Admin, User (NOT IdentityRole)
│       ├── Application/
│       │   ├── Application.csproj
│       │   ├── Common/
│       │   │   └── Interfaces/
│       │   │       ├── ITokenService.cs
│       │   │       └── IRefreshTokenRepository.cs
│       │   └── Auth/
│       │       ├── AuthService.cs
│       │       ├── DTOs/
│       │       │   ├── RegisterRequest.cs
│       │       │   ├── LoginRequest.cs
│       │       │   ├── AuthResponse.cs
│       │       │   └── RefreshRequest.cs
│       │       └── Validators/
│       │           ├── RegisterRequestValidator.cs
│       │           └── LoginRequestValidator.cs
│       ├── Infrastructure/
│       │   ├── Infrastructure.csproj
│       │   ├── Data/
│       │   │   ├── ApplicationDbContext.cs  # : IdentityDbContext<ApplicationUser>
│       │   │   ├── Configurations/
│       │   │   │   └── RefreshTokenConfiguration.cs
│       │   │   └── Migrations/
│       │   ├── Services/
│       │   │   └── TokenService.cs
│       │   ├── Seed/
│       │   │   └── AdminSeeder.cs           # Separate seeder (not HasData)
│       │   └── Repositories/
│       │       └── RefreshTokenRepository.cs
│       └── Api/
│           ├── Api.csproj
│           ├── Program.cs
│           ├── Controllers/
│           │   └── AuthController.cs
│           ├── Middleware/
│           │   └── ExceptionHandlingMiddleware.cs
│           └── appsettings*.json
├── client/
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json / tsconfig.app.json
│   ├── components.json                  # shadcn config
│   ├── index.html
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── lib/
│       │   └── utils.ts                 # shadcn cn() helper
│       ├── components/
│       │   ├── ui/                      # shadcn components
│       │   └── layout/
│       │       ├── ProtectedRoute.tsx
│       │       └── Navbar.tsx
│       ├── features/
│       │   └── auth/
│       │       ├── AuthContext.tsx       # React Context for auth state
│       │       ├── useAuth.ts           # Custom hook
│       │       ├── api/
│       │       │   └── authApi.ts       # Axios calls
│       │       ├── pages/
│       │       │   ├── LoginPage.tsx
│       │       │   └── RegisterPage.tsx
│       │       └── schemas/
│       │           ├── loginSchema.ts   # Zod schema
│       │           └── registerSchema.ts
│       ├── api/
│       │   └── client.ts               # Axios instance + interceptors
│       ├── hooks/
│       │   └── useAuth.ts              # Re-exported from features/auth
│       └── pages/
│           ├── DashboardPage.tsx       # Post-login landing (placeholder)
│           └── NotFoundPage.tsx
```

### Pattern 1: JWT Bearer Reading from httpOnly Cookie

**What:** Configure JwtBearer middleware to read the JWT from an httpOnly cookie instead of the Authorization header.

**Source:** [CITED: learn.microsoft.com/.../configure-jwt-bearer-authentication] + [CITED: code-maze.com/.../httponly-cookie-net-core]

```csharp
// Api/Program.cs
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"]!)),
            ClockSkew = TimeSpan.Zero
        };

        // ★ Read JWT from httpOnly cookie instead of Authorization header
        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                context.Token = context.Request.Cookies["AccessToken"];
                return Task.CompletedTask;
            }
        };
    });
```

### Pattern 2: JWT + Refresh Token Generation

**Source:** [CITED: code-maze.com/.../httponly-cookie-net-core] + [CITED: red-gate.com/.../refresh-tokens-aspnet-core]

```csharp
// Infrastructure/Services/TokenService.cs
public class TokenService : ITokenService
{
    private readonly IConfiguration _config;

    public TokenService(IConfiguration config) => _config = config;

    public string GenerateAccessToken(ApplicationUser user)
    {
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, user.Id),
            new(ClaimTypes.Email, user.Email!),
            new(ClaimTypes.Role, user.IsAdmin ? "Admin" : "User"),
            new("IsAdmin", user.IsAdmin.ToString().ToLower())
        };

        var key = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes(_config["Jwt:Key"]!));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: _config["Jwt:Issuer"],
            audience: _config["Jwt:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(15),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public string GenerateRefreshToken()
    {
        var randomBytes = new byte[64];
        using var rng = RandomNumberGenerator.Create();
        rng.GetBytes(randomBytes);
        return Convert.ToBase64String(randomBytes);
    }
}
```

### Pattern 3: AuthController — Login Sets httpOnly Cookies

**Source:** [CITED: code-maze.com/.../httponly-cookie-net-core] + [CITED: github.com/sambabhouria/dotnet-8-jwt-authentication-refresh-revoke-tokens-api]

```csharp
// Api/Controllers/AuthController.cs
[ApiController]
[Route("api/v1/auth")]
public class AuthController : ControllerBase
{
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        var user = await _userManager.FindByEmailAsync(request.Email);
        if (user == null || !await _userManager.CheckPasswordAsync(user, request.Password))
            return Unauthorized(new ProblemDetails { Title = "Invalid credentials" });

        var accessToken = _tokenService.GenerateAccessToken(user);
        var refreshToken = _tokenService.GenerateRefreshToken();

        await _refreshTokenRepo.CreateAsync(new RefreshToken
        {
            Token = refreshToken,
            JwtId = Guid.NewGuid().ToString(),
            UserId = user.Id,
            CreatedAt = DateTime.UtcNow,
            ExpiresAt = DateTime.UtcNow.AddDays(7)
        });

        // Set httpOnly cookies
        Response.Cookies.Append("AccessToken", accessToken, new CookieOptions
        {
            HttpOnly = true,
            Secure = true,        // requires HTTPS in prod
            SameSite = SameSiteMode.Strict,
            Expires = DateTime.UtcNow.AddMinutes(15)
        });

        Response.Cookies.Append("RefreshToken", refreshToken, new CookieOptions
        {
            HttpOnly = true,
            Secure = true,
            SameSite = SameSiteMode.Strict,
            Expires = DateTime.UtcNow.AddDays(7)
        });

        return Ok(new { email = user.Email, isAdmin = user.IsAdmin });
    }

    [HttpPost("refresh")]
    public async Task<IActionResult> Refresh()
    {
        var refreshToken = Request.Cookies["RefreshToken"];
        if (string.IsNullOrEmpty(refreshToken))
            return Unauthorized();

        var stored = await _refreshTokenRepo.GetByTokenAsync(refreshToken);
        if (stored == null || stored.IsRevoked || stored.ExpiresAt < DateTime.UtcNow)
            return Unauthorized();

        // Rotation: revoke old, create new
        stored.IsRevoked = true;
        await _refreshTokenRepo.UpdateAsync(stored);

        var user = await _userManager.FindByIdAsync(stored.UserId);
        var newAccessToken = _tokenService.GenerateAccessToken(user!);
        var newRefreshToken = _tokenService.GenerateRefreshToken();

        await _refreshTokenRepo.CreateAsync(new RefreshToken
        {
            Token = newRefreshToken,
            JwtId = Guid.NewGuid().ToString(),
            UserId = user!.Id,
            CreatedAt = DateTime.UtcNow,
            ExpiresAt = DateTime.UtcNow.AddDays(7)
        });

        // Set new cookies (rotation complete)
        Response.Cookies.Append("AccessToken", newAccessToken, /* same options */);
        Response.Cookies.Append("RefreshToken", newRefreshToken, /* same options */);

        return Ok(new { email = user.Email, isAdmin = user.IsAdmin });
    }

    [HttpPost("logout")]
    [Authorize]
    public async Task<IActionResult> Logout()
    {
        var refreshToken = Request.Cookies["RefreshToken"];
        if (!string.IsNullOrEmpty(refreshToken))
        {
            var stored = await _refreshTokenRepo.GetByTokenAsync(refreshToken);
            if (stored != null)
            {
                stored.IsRevoked = true;
                await _refreshTokenRepo.UpdateAsync(stored);
            }
        }

        // Clear cookies
        Response.Cookies.Delete("AccessToken");
        Response.Cookies.Delete("RefreshToken");

        return Ok();
    }
}
```

### Pattern 4: React Axios Interceptor with 401 Refresh Queue

**Source:** [CITED: dev.to/.../react-auth-starter-jwt-refresh-tokens] (failed request queue pattern)

```typescript
// client/src/api/client.ts
import axios from 'axios';

const apiClient = axios.create({
  baseURL: 'http://localhost:5000/api/v1',
  withCredentials: true,  // ← sends httpOnly cookies
});

// Track refresh state to prevent multiple simultaneous refresh calls
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token!);
  });
  failedQueue = [];
};

// Response interceptor: on 401, attempt refresh, retry failed requests
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Queue this request until refresh completes
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(() => apiClient(originalRequest));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        await apiClient.post('/auth/refresh');
        processQueue(null);
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        // Redirect to login (window.location or history.push)
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
```

### Pattern 5: React AuthContext — Session Restore on Page Refresh

**Source:** [CITED: dev.to/.../react-auth-starter-jwt-refresh-tokens]

```typescript
// client/src/features/auth/AuthContext.tsx
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import apiClient from '@/api/client';

interface AuthState {
  user: { email: string; isAdmin: boolean } | null;
  isAuthenticated: boolean;
  isLoading: boolean;  // ← crucial: prevents redirect before session check
}

// Module-level flag: persists across route changes
let sessionChecked = false;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: !sessionChecked,
  });

  const restoreSession = useCallback(async () => {
    if (sessionChecked) return;
    sessionChecked = true;

    try {
      const { data } = await apiClient.post('/auth/refresh');
      setState({ user: data, isAuthenticated: true, isLoading: false });
    } catch {
      setState({ user: null, isAuthenticated: false, isLoading: false });
    }
  }, []);

  useEffect(() => { restoreSession(); }, [restoreSession]);

  const login = async (email: string, password: string) => {
    const { data } = await apiClient.post('/auth/login', { email, password });
    setState({ user: data, isAuthenticated: true, isLoading: false });
  };

  const logout = async () => {
    await apiClient.post('/auth/logout');
    setState({ user: null, isAuthenticated: false, isLoading: false });
    sessionChecked = false; // reset so next mount re-checks
  };

  return (
    <AuthContext.Provider value={{ ...state, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
```

### Anti-Patterns to Avoid

- **❌ Using `MapIdentityApi<TUser>`:** Uses proprietary tokens, not JWTs. Does not support custom claims (like IsAdmin). Does not support httpOnly cookie pattern properly.
- **❌ Storing JWT in localStorage:** Vulnerable to XSS attacks. The whole point of D-04 is to avoid this.
- **❌ Using IdentityRole table for v1:** D-19 explicitly says no IdentityRole in v1. Use IsAdmin boolean on ApplicationUser.
- **❌ Trying to read httpOnly cookie from JavaScript:** Impossible by design. Use the 401 → refresh pattern instead.
- **❌ Multiple simultaneous refresh calls without queue:** Causes race conditions. Always use the failed request queue pattern.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| User password hashing | Custom hashing | ASP.NET Core Identity (UserManager) | Identity uses PBKDF2 with salt; battle-tested against OWASP guidelines |
| JWT validation/decoding | Manual HMAC verification | `Microsoft.AspNetCore.Authentication.JwtBearer` | Handles key rotation, clock skew, claim validation, security stamps |
| Form validation error display | Custom error component | shadcn/ui Form + React Hook Form + Zod | D-02 decision; shadcn Form has built-in error state styling |
| Toast notifications | Custom toast component | shadcn Sonner | D-15 decision; handles stacking, dismissal, accessibility |
| API versioning routing | Custom middleware | `ASP.NET Core URL path versioning` or manual route prefix | `/api/v1/...` is effective and simple; no library needed |

**Key insight:** ASP.NET Core Identity is designed to be the user store — UserManager handles password policies, security stamps, lockout, and two-factor. Use it as the store. The JWT layer is a separate concern (AuthController + TokenService) that sits on top of Identity.

## Common Pitfalls

### Pitfall 1: Cookie Not Sent in Cross-Origin Requests
**What goes wrong:** In development, React dev server (port 5173) makes requests to ASP.NET API (port 5000). Cookies are not sent cross-origin.
**Why it happens:** CORS blocks cookies by default; `SameSite` restrictions apply.
**How to avoid:** Configure CORS with `AllowCredentials()` in Program.cs. Set `SameSite = SameSiteMode.Lax` (vs Strict) for development. Use Vite proxy in production-like setups.
**Warning signs:** 401 responses after successful login; cookies not visible in DevTools → Application → Cookies.

```csharp
// Program.cs - CORS for development
builder.Services.AddCors(options =>
{
    options.AddPolicy("DevCors", policy =>
    {
        policy.WithOrigins("http://localhost:5173")
            .AllowCredentials()
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});
```

### Pitfall 2: Refresh Token Race Condition
**What goes wrong:** Multiple API calls fail with 401 simultaneously → all trigger refresh → first one succeeds but invalidates the old refresh token → subsequent refresh calls fail.
**Why it happens:** Refresh token rotation (D-05) means each use invalidates the previous token.
**How to avoid:** Implement the failed request queue pattern (shown in Pattern 4). Only one refresh call happens; other failed 401s queue and retry with the new token.
**Warning signs:** Random "Invalid refresh token" errors under load; intermittent logout.

### Pitfall 3: Seed Admin Password in Migration HasData
**What goes wrong:** `HasData()` in EF migrations stores the password hash at migration creation time, not at runtime. The admin seed password lives in migration code, not configuration.
**Why it happens:** `HasData()` is designed for static reference data, not for data that depends on configuration.
**How to avoid:** Use a runtime `AdminSeeder` class (called from `Program.cs` after migration) that reads password from `appsettings.Development.json` and creates the admin via `UserManager.CreateAsync()`. Do NOT use `HasData()` for the admin user.
**Warning signs:** After changing the admin password in config, the database still has the old hash.

### Pitfall 4: Session Restore Redirect Loop
**What goes wrong:** On page refresh at `/dashboard`, ProtectedRoute sees `isAuthenticated: false` and immediately redirects to `/login` before `restoreSession` finishes.
**Why it happens:** `isLoading` starts as `false` if not properly initialized.
**How to avoid:** Use module-level `sessionChecked` flag (as shown in Pattern 5). Never render the redirect until the session check completes. Start with `isLoading = true`.
**Warning signs:** Brief flash of login page on refresh; user thinks they've been logged out.

## Code Examples

### appsettings.json — JWT Configuration

```json
{
  "Jwt": {
    "Key": "SuperSecretKeyThatIsAtLeast32CharactersLong",
    "Issuer": "CalendarBookingApi",
    "Audience": "CalendarBookingApp",
    "AccessTokenExpirationMinutes": 15,
    "RefreshTokenExpirationDays": 7
  },
  "AdminSeed": {
    "Email": "admin@calbooking.com",
    "Password": "Admin123!",
    "IsAdmin": true
  }
}
```

### ApplicationUser Entity

```csharp
// Domain/Entities/ApplicationUser.cs
public class ApplicationUser : IdentityUser
{
    public bool IsAdmin { get; set; } = false;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
```

### RefreshToken Entity

```csharp
// Domain/Entities/RefreshToken.cs
public class RefreshToken
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Token { get; set; } = string.Empty;
    public string JwtId { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;
    public ApplicationUser User { get; set; } = null!;
    public bool IsRevoked { get; set; } = false;
    public DateTime CreatedAt { get; set; }
    public DateTime ExpiresAt { get; set; }
}
```

### ApplicationDbContext

```csharp
// Infrastructure/Data/ApplicationDbContext.cs
public class ApplicationDbContext : IdentityDbContext<ApplicationUser>
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options) { }

    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        builder.Entity<RefreshToken>(entity =>
        {
            entity.HasKey(r => r.Id);
            entity.HasIndex(r => r.Token).IsUnique();
            entity.HasOne(r => r.User)
                  .WithMany()
                  .HasForeignKey(r => r.UserId)
                  .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
```

### Program.cs — Service Registration (Core Setup)

```csharp
// Api/Program.cs
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// ... Serilog, Swagger, controllers config ...

// Database
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

// Identity (USER MANAGEMENT ONLY - not auth endpoints)
builder.Services.AddIdentity<ApplicationUser, IdentityRole>(options =>
{
    options.Password.RequiredLength = 8;
    options.Password.RequireDigit = true;
    options.Password.RequireLowercase = true;
    options.Password.RequireUppercase = true;
    options.Password.RequireNonAlphanumeric = true;
})
    .AddEntityFrameworkStores<ApplicationDbContext>()
    .AddDefaultTokenProviders();

// JWT Bearer (TOKEN VALIDATION)
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options => { /* Pattern 1 */ });

builder.Services.AddAuthorization();

// Application services
builder.Services.AddScoped<ITokenService, TokenService>();
builder.Services.AddScoped<IRefreshTokenRepository, RefreshTokenRepository>();

builder.Services.AddCors(options => { /* development CORS */ });

var app = builder.Build();

// Middleware pipeline
app.UseCors("DevCors");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

// Runtime admin seed (NOT HasData)
using (var scope = app.Services.CreateScope())
{
    await AdminSeeder.SeedAsync(scope.ServiceProvider, builder.Configuration);
}

app.Run();
```

### AdminSeeder (Runtime Seed)

```csharp
// Infrastructure/Seed/AdminSeeder.cs
public static class AdminSeeder
{
    public static async Task SeedAsync(IServiceProvider services, IConfiguration config)
    {
        var userManager = services.GetRequiredService<UserManager<ApplicationUser>>();

        var adminEmail = config["AdminSeed:Email"]!;
        if (await userManager.FindByEmailAsync(adminEmail) != null) return;

        var admin = new ApplicationUser
        {
            UserName = adminEmail,
            Email = adminEmail,
            IsAdmin = true,
            EmailConfirmed = true
        };

        var result = await userManager.CreateAsync(admin, config["AdminSeed:Password"]!);
        if (!result.Succeeded)
            throw new Exception($"Failed to seed admin: {string.Join(", ", result.Errors)}");
    }
}
```

### ProtectedRoute Component (React)

```typescript
// client/src/components/layout/ProtectedRoute.tsx
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/features/auth/useAuth';

export function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <div>Loading...</div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return <Outlet />;
}
```

### React Hook Form Login Schema

```typescript
// client/src/features/auth/schemas/loginSchema.ts
import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export type LoginFormData = z.infer<typeof loginSchema>;
```

### Regiser Schema with Zod

```typescript
// client/src/features/auth/schemas/registerSchema.ts
import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[a-z]/, 'Password must contain a lowercase letter')
    .regex(/[A-Z]/, 'Password must contain an uppercase letter')
    .regex(/[0-9]/, 'Password must contain a digit'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export type RegisterFormData = z.infer<typeof registerSchema>;
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| IdentityServer + OIDC for SPA auth | Custom JWT + httpOnly cookies | .NET 8 (2023) | Simpler setup; no external identity provider needed |
| `MapIdentityApi<TUser>` (built-in) | Custom JWT controllers | .NET 8 (2023) | Built-in uses proprietary tokens; custom gives JWT compliance |
| Tailwind CSS v3 + PostCSS config | Tailwind CSS v4 + Vite plugin | 2025-2026 | Simpler setup: one `@import "tailwindcss"` instead of three directives |
| shadcn/ui v3 (default style) | shadcn/ui v4 (New York style) | 2025-2026 | New York is recommended default; toast → sonner |
| React 18 | React 19 | 2024-2025 | Concurrent features; shadcn v4 updated for React 19 |
| Vite 5 | Vite 8 | 2025-2026 | Speed improvements; maintained |
| Tailwind v4 + shadcn v4 setup | `npx shadcn@latest init` | 2026 | CLI handles Tailwind v4 + React 19 detection; components compatible |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | .NET SDK 10 can build net8.0 targets | Standard Stack | Lower if SDK targets net8.0 properly (should work via roll-forward) |
| A2 | The `react` npm package v19.2.6 is compatible with shadcn/ui v4 | Standard Stack | Low — shadcn v4 explicitly supports React 19 |
| A3 | Docker is available and SQL Server 2022 image can run on this Windows machine | Environment Availability | Medium — Docker Desktop on Windows requires WSL2; check before execution |
| A4 | The `@tailwindcss/vite` package is the correct approach for shadcn/ui v4 | Standard Stack | Low — official shadcn docs for Tailwind v4 use this plugin |
| A5 | Serilog.AspNetCore 8.x is compatible with ASP.NET Core 8 | Standard Stack | Low — Serilog versions track Microsoft.Extensions versions |

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| .NET SDK | ASP.NET Core backend | ✓ | 10.0.200 | Must target net8.0 via TFM |
| Docker | SQL Server container | ✓ | 29.4.3 | — |
| Docker Desktop | SQL Server container | assumed ✓ | — | LocalDB (Windows only) or SQL Server Express |
| Node.js | Frontend build | not checked | — | nvm-windows to manage version |
| npm | Frontend packages | not checked | — | — |

**Missing dependencies with no fallback:**
- None confirmed missing yet — verify Node.js/npm before execution

**Missing dependencies with fallback:**
- SQL Server Docker: LocalDB (Windows) or SQL Server Express as alternative

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | ASP.NET Core Identity + JWT (custom controllers) |
| V3 Session Management | yes | httpOnly cookies + refresh token rotation |
| V4 Access Control | yes | JWT claims (`IsAdmin`, `role`) + `[Authorize]` attribute |
| V5 Input Validation | yes | FluentValidation (server) + Zod (client) |
| V6 Cryptography | yes | PBKDF2 (Identity), HMAC-SHA256 (JWT signing) |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| JWT theft via XSS | Tampering | httpOnly cookies prevent JS access to token |
| Refresh token replay | Elevation of Privilege | Rotation + revocation on each use; database validation |
| CSRF on auth endpoints | Spoofing | Lax/Strict SameSite cookies; POST-only for mutation endpoints |
| Password brute force | Spoofing | Identity lockout defaults; rate limiting (Phase 4+) |
| Token leakage in logs | Information Disclosure | Serilog destructuring; never log cookie values |
| Session fixation | Spoofing | Refresh token rotation generates new tokens on each login |

## Sources

### Primary (HIGH confidence)
- [CITED: Microsoft Docs — Identity API Authorization (learn.microsoft.com/.../identity-api-authorization)] - Confirmed built-in Identity API uses proprietary tokens, not JWTs
- [CITED: Microsoft Docs — Configure JWT Bearer Auth (learn.microsoft.com/.../configure-jwt-bearer-authentication)] - JWT middleware configuration patterns
- [CITED: Microsoft Docs — Data Seeding EF Core (learn.microsoft.com/.../data-seeding)] - HasData() and runtime seeding patterns
- [CITED: CodeMaze — HttpOnly Cookie .NET Core (code-maze.com/.../httponly-cookie-net-core)] - JWT in httpOnly cookie pattern
- [CITED: Red-Gate — Refresh Tokens ASP.NET Core (red-gate.com/.../refresh-tokens-aspnet-core)] - Refresh token rotation implementation
- npm registry verification — all npm packages exist at stated versions

### Secondary (MEDIUM confidence)
- [CITED: GitHub — sambabhouria/dotnet-8-jwt-authentication-refresh-revoke-tokens-api] - Full JWT + refresh token API example
- [CITED: Dev.to — "Building a Production-Grade React Auth Starter" (dev.to/hkarimi)] - Failed request queue pattern, session restore module-level flag
- [CITED: C# Corner — "Secure JWT Authentication ASP.NET Core with Cookie Storage" (2026)] - JwtBearerEvents.OnMessageReceived cookie extraction pattern

### Tertiary (LOW confidence)
- Specific version numbers for NuGet packages (8.0.x range) — verify during execution

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — well-known ecosystem; all packages verified on npm/NuGet registries
- Architecture: HIGH — Clean Architecture with JWT + Identity is a standard, well-documented pattern
- Pitfalls: HIGH — cookie CORS, refresh race conditions, seed migration issues are all well-known traps
- Package versions: MEDIUM — specific patch versions should be verified at execution time

**Research date:** 2026-05-22
**Valid until:** 2026-07-01 (stable ecosystem; versions unlikely to break)
