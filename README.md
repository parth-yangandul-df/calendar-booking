# Calendar Booking System

Web-based scheduling platform. Users define monthly availability, book time slots with auto-generated Google Meet links, and get email notifications.

## Stack

| Layer | Tech |
|-------|------|
| Frontend | React 19 + Vite + shadcn/ui + Tailwind CSS v4 |
| Backend | ASP.NET Core 8 Web API (Clean Architecture) |
| Database | SQL Server + EF Core 8 |
| Auth | ASP.NET Core Identity + custom JWT (httpOnly cookies) |
| Background jobs | Hangfire (SQL Server store) |
| Email | MailKit SMTP |

## Quick Start

```bash
# 1. Start SQL Server
docker compose up -d

# 2. Backend
cd src/backend
dotnet restore
dotnet run --project Api

# 3. Frontend
cd client
npm install
npm run dev
```

**Secrets:** Copy `.env.example` to `.env` and fill in credentials. See [docs/README.md](docs/README.md) for full docs.

## Project Structure

```
├── .env                    # Local secrets (gitignored)
├── .env.example            # Env template (safe to commit)
├── docs/                   # Refined documentation
├── client/                 # React frontend
└── src/backend/            # ASP.NET Core API
    ├── Domain/             # Entities, enums
    ├── Application/        # Use cases, DTOs, interfaces
    ├── Infrastructure/     # EF Core, repositories, services
    └── Api/                # Controllers, middleware
```

## Documentation

Full docs at [docs/README.md](docs/README.md):

- [Project Overview](docs/01-project/overview.md)
- [Requirements](docs/01-project/requirements.md)
- [Architecture](docs/02-technology/architecture.md)
- [Roadmap](docs/04-roadmap/roadmap.md)
- [Phase Details](docs/05-phases/README.md)

## Status

v1.0 — All 4 phases complete. ✅
