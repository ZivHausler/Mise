# Mise — Bakery Management App

A full-stack bakery management application built with TypeScript. Manage recipes, inventory, orders, customers, and payments — with multi-tenancy, admin tools, and Hebrew/English i18n support.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Monorepo | pnpm workspaces + Turborepo |
| Backend | Fastify, PostgreSQL, MongoDB, Redis, RabbitMQ |
| Frontend | React 18, Vite, Tailwind CSS, Zustand, TanStack Query |
| Auth | JWT + Google OAuth, bcrypt, invitation-only registration |
| Validation | Zod (shared between frontend and backend) |
| DI | Awilix |
| i18n | i18next (Hebrew RTL + English LTR) |
| Observability | Pino logging, Grafana dashboards |
| Testing | Vitest |

## Project Structure

```
mise/
├── apps/
│   ├── api/          # Fastify backend
│   ├── web/          # React frontend
│   └── e2e/          # End-to-end tests
├── packages/
│   ├── db/           # Database migrations & schemas
│   ├── shared/       # Shared types & Zod validation
│   └── ui/           # Component library
├── grafana/          # Provisioned dashboards & data sources
└── docker-compose.yml
```

## Prerequisites

- **Node.js** >= 20
- **pnpm** >= 9.1
- **Docker** & **Docker Compose** (for infrastructure services)

## Getting Started

### 1. Clone and install

```bash
git clone <repo-url>
cd Mise
pnpm install
```

### 2. Set up environment variables

```bash
cp .env.example .env
```

Edit `.env` and set at minimum:

- `JWT_SECRET` — a strong random string
- `GOOGLE_CLIENT_ID` — for Google OAuth (optional)
- `ADMIN_SECRET` — for admin operations

### 3. Start infrastructure services

```bash
docker compose up -d
```

This starts:

| Service | Port |
|---------|------|
| PostgreSQL 16 | 5432 |
| MongoDB 7 | 27017 |
| Redis 7 | 6379 |
| RabbitMQ 3 | 5672 (AMQP), 15672 (management UI) |
| Grafana | 3002 |

### 4. Run database migrations

Migrations run automatically when the API server starts.

### 5. Start development servers

```bash
pnpm dev
```

- **API** → http://localhost:3001
- **Web** → http://localhost:5173
- **Grafana** → http://localhost:3002

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start all dev servers |
| `pnpm build` | Build all packages |
| `pnpm test` | Run tests |
| `pnpm lint` | Lint all packages |
| `pnpm type-check` | TypeScript type checking |
| `pnpm format` | Format code with Prettier |

## Backend Modules

| Module | Description |
|--------|-------------|
| **Auth** | Email/password + Google OAuth, JWT with refresh tokens |
| **Stores** | Multi-tenant store management, roles (Owner/Manager/Employee) |
| **Recipes** | MongoDB-backed, sub-recipes, recursive cost calculation |
| **Inventory** | Stock tracking, adjustments with price logging, low-stock alerts |
| **Customers** | Customer profiles with preferences (allergies, favorites) |
| **Orders** | Status pipeline (received → in_progress → ready → delivered), sequential numbering |
| **Payments** | Payment tracking, refunds, auto-calculated status |
| **Notifications** | Event-driven dispatcher (order, inventory, payment events) |
| **Analytics** | Revenue, popular recipes, order stats |
| **Settings** | Groups, units, notification preferences |
| **Admin** | User/store/invitation management, audit log, analytics dashboard |

## Architecture

```
Route → Controller → Service → Repository → Database
                        ↕
                    Event Bus (RabbitMQ)
```

- **Layered architecture** with dependency injection (Awilix)
- **Event-driven** notifications via RabbitMQ subscribers
- **Multi-tenant** — all data tables scoped by `store_id`
- **Invitation-only** registration system

## Security

- JWT authentication with token refresh and blacklisting
- bcrypt password hashing (12 rounds)
- Parameterized SQL queries, NoSQL injection guards
- Helmet CSP, HSTS, rate limiting (1000 req/min global, 10 req/15min auth)
- Input sanitization and length limits on all fields
- Admin audit log for all authenticated mutations

## License

Private
