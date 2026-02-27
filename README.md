# Mise — Bakery Management App

A full-stack bakery management application built with TypeScript. Manage recipes, inventory, orders, production, customers, invoices, and payments — with multi-tenancy, role-based access, feature flags, and Hebrew/English i18n support.

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
| Testing | Vitest (unit), Playwright (e2e) |

## Project Structure

```
mise/
├── apps/
│   ├── api/          # Fastify backend
│   ├── web/          # React frontend
│   └── e2e/          # Playwright end-to-end tests
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

- **API** → https://localhost:3001
- **Web** → https://localhost:5173
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
| `pnpm format:check` | Check Prettier formatting |
| `pnpm clean` | Clean all build artifacts |

## Backend Modules

| Module | Description |
|--------|-------------|
| **Auth** | Email/password + Google OAuth, JWT with refresh tokens and blacklisting |
| **Stores** | Multi-tenant store management, roles (Owner/Manager/Employee), invitation system |
| **Recipes** | MongoDB-backed, sub-recipes, recursive cost calculation, selling price tracking |
| **Inventory** | Stock tracking, adjustments with price logging, low-stock alerts, unit conversions |
| **Customers** | Customer profiles with preferences (allergies, favorites), duplicate detection |
| **Orders** | Status pipeline (received → in_progress → ready → delivered), recurring orders, sequential numbering |
| **Production** | Batch management, stage tracking, recipe-based prep items, order-to-batch generation |
| **Payments** | Payment tracking, refunds, auto-calculated payment status (paid/partial/unpaid) |
| **Invoices** | Invoice generation with VAT calculation, credit notes, business detail snapshots |
| **Loyalty** | Customer loyalty and rewards program |
| **Notifications** | Event-driven dispatcher (order, inventory, payment events), WhatsApp & SMS channels |
| **Analytics** | Revenue, popular recipes, order stats |
| **Settings** | Tags, units, notification preferences, WhatsApp Business integration |
| **Admin** | User/store/invitation management, audit log, analytics dashboard |

### Feature Flags

Modules behind feature flags for gradual rollout:

| Flag | Module |
|------|--------|
| `FEATURE_PRODUCTION` | Production batch management |
| `FEATURE_WHATSAPP` | WhatsApp Business integration |
| `FEATURE_SMS` | SMS notifications |

Flags are set via environment variables — use `*` for all stores or a comma-separated list of store IDs.

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
- **Feature flags** for controlled module rollout

## Security

- JWT authentication with token refresh and blacklisting
- bcrypt password hashing (12 rounds)
- Parameterized SQL queries, NoSQL injection guards
- Helmet CSP, HSTS, rate limiting (1000 req/min global, 10 req/15min auth)
- Input sanitization and length limits on all fields
- Admin audit log for all authenticated mutations

## License

Private
