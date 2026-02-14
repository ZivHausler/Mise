# Mise — Progress Tracker

> Updated by team members as work progresses.

---

## Team Members

| Role | Agent | Status |
|------|-------|--------|
| Designer (UX/UI) | designer | Complete |
| Architect | architect | Complete |
| Backend Developer | backend-dev | Complete |
| Frontend Developer | frontend-dev | Complete |
| QA Engineer | qa-engineer | Complete |
| Security Researcher | security-researcher | Complete |

---

## Phase 1: Research & Design

### Designer
- [x] Research bakery websites for inspiration
- [x] Design baker-side UX/UI
- [x] Design customer-side UX/UI
- [x] Create design system documentation

### Architect
- [x] Research scalable architecture patterns
- [x] Define project structure
- [x] Define module boundaries and communication patterns
- [x] Scaffold monorepo with all workspaces (apps/api, apps/web, packages/shared, packages/db, packages/ui)
- [x] Set up Turborepo pipeline configuration
- [x] Set up TypeScript strict configs with path aliases
- [x] Set up ESLint + Prettier
- [x] Create Docker Compose for PostgreSQL, MongoDB, Redis
- [x] Create Dockerfiles for API and Web apps
- [x] Scaffold all 6 backend modules with layered architecture (types, repository, service, controller, routes)
- [x] Set up core infrastructure (errors, events, DI, logger, database, cache)
- [x] Set up frontend with Vite + React + Tailwind + i18n (Hebrew RTL + English LTR)
- [x] Create shared packages (types, validation schemas, constants, utils)
- [x] Document scaling strategy

#### Architecture Decisions
- **Monorepo**: pnpm workspaces + Turborepo
- **Backend**: Fastify + layered architecture (Route -> Controller -> Service -> Repository)
- **DI Container**: Awilix (classic injection, constructor-based)
- **Event Bus**: In-memory for V1, swappable to RabbitMQ/Redis Streams
- **Error Handling**: Custom typed error hierarchy with global error handler
- **Database**: PostgreSQL (pg pool) + MongoDB (native driver for recipes)
- **Caching**: Redis via ioredis with interface abstraction
- **Validation**: Zod schemas shared between frontend and backend
- **Frontend State**: Zustand (client) + TanStack Query (server)
- **i18n**: i18next with Hebrew (RTL) + English (LTR)
- **Styling**: Tailwind CSS with warm bakery theme tokens

---

## Phase 2: Implementation

### Backend Developer
- [x] Set up Fastify server with TypeScript
- [x] Implement core infrastructure (errors, DI, logging, DB connections)
- [x] Implement Auth module (register, login, JWT, refresh, profile)
- [x] Implement Recipes module (CRUD, sub-recipes, cost calculation, MongoDB)
- [x] Implement Inventory module (CRUD, stock adjust, low-stock alerts, log)
- [x] Implement Customers module (CRUD, preferences, search)
- [x] Implement Orders module (CRUD, status pipeline, event publishing)
- [x] Implement Payments module (create, summary, history)
- [x] Implement Notifications module (event subscribers)
- [x] Implement Analytics module (revenue, popular recipes, order stats)
- [x] Create PostgreSQL migration schema
- [x] Wire all modules into Fastify with route prefixes
- [x] Implement auth middleware (JWT verification via @fastify/jwt)
- [x] Use cases for all modules with validation

#### Backend Implementation Details
- **Auth**: Register with password rules (8+ chars, uppercase, number), login with bcrypt, JWT via @fastify/jwt, token refresh, profile endpoint
- **Recipes**: MongoDB-backed, composable sub-recipes, recursive cost calculation, ingredient enrichment from inventory
- **Inventory**: PostgreSQL, transactional stock adjustments with log, low-stock event publishing
- **Customers**: PostgreSQL, JSONB preferences (allergies, favorites), multi-field search
- **Orders**: PostgreSQL, JSONB items, status pipeline with flow validation (received->in_progress->ready->delivered), event publishing
- **Payments**: PostgreSQL, payment summary with auto-calculated status (unpaid/partial/paid), order verification
- **Notifications**: Event bus subscribers for order.created, order.statusChanged, inventory.lowStock, payment.received
- **Analytics**: Revenue (daily/total), popular recipes, order stats by status, customer frequency

### Frontend Developer
- [x] Set up React app with Vite + TypeScript
- [x] Implement design system primitives (Typography, Button, Layout, Card, Modal, FormFields, DataDisplay, Feedback)
- [x] Implement i18n (Hebrew RTL + English LTR) with full translation files
- [x] Implement Tailwind config with bakery design system tokens (colors, fonts, shadows, spacing, animations)
- [x] Implement state management (Zustand: auth, app, toast stores)
- [x] Implement API layer (TanStack Query hooks for all modules, axios client with JWT interceptor)
- [x] Implement routing with React Router (lazy-loaded pages, protected routes, 404)
- [x] Implement App Shell (Sidebar, TopBar, BottomTabs, Breadcrumbs, responsive drawer)
- [x] Implement Auth pages (Login, Register)
- [x] Implement Dashboard page (stat cards, order pipeline, quick actions)
- [x] Implement Orders pages (Kanban pipeline + list view, detail, create/edit form)
- [x] Implement Recipes pages (grid + list view, tabbed detail, create/edit form with ingredients/steps)
- [x] Implement Inventory page (stock table, add item modal, adjust stock modal)
- [x] Implement Customers pages (table, detail with order history tabs, create modal)
- [x] Implement Payments page (transaction log, log payment modal)
- [x] Implement Settings page (language toggle, profile, logout)
- [x] Implement More page (mobile navigation)
- [x] Implement 404 Not Found page

#### Frontend Implementation Details
- **Design System**: Full bakery palette (primary, accent, semantic, neutral), Frank Ruhl Libre headings, Assistant body font, warm shadows with brown tints
- **Components**: 15 reusable components (Typography x8, Button, Modal, FormFields x7, DataTable, StatusBadge, StatCard, EmptyState, Spinner, Skeleton, Toast)
- **RTL**: CSS logical properties throughout (ms/me/ps/pe/start/end), dir attributes on number/phone/email inputs, icon mirroring with rtl:scale-x-[-1]
- **Performance**: React.memo on all components, useMemo for filtered/sorted data, useCallback for handlers, lazy-loaded routes with Suspense, proper key props
- **State**: Zustand for auth/app/toast, TanStack Query for all API calls with cache invalidation
- **Responsive**: Desktop sidebar (260px/64px collapsed), tablet hamburger drawer, mobile bottom tabs (5 items), adaptive grids

### QA Engineer
- [x] Set up testing framework (Vitest config, mock factories, test helpers)
- [x] Write unit tests for Core infrastructure (errors, event bus, auth middleware) — 22 tests
- [x] Write unit tests for Auth module (register, login, getUserProfile) — 12 tests
- [x] Write unit tests for Inventory module (CRUD, adjustStock, service low-stock events) — 26 tests
- [x] Write unit tests for Customers module (CRUD, preferences, validation) — 13 tests
- [x] Write unit tests for Recipes module (CRUD, cost calculation, sub-recipes, circular refs) — 18 tests
- [x] Write unit tests for Orders module (CRUD, status pipeline, events, delete constraints) — 26 tests
- [x] Write unit tests for Payments module (create, summary, service events) — 19 tests
- **Total: 136 tests across 27 test files — all passing**

### Security Researcher
- [x] Audit authentication implementation (JWT secret enforcement, token expiry, bcrypt 12 rounds)
- [x] Check for SQL injection vulnerabilities (all queries parameterized, ILIKE wildcards escaped)
- [x] Check for NoSQL injection vulnerabilities (MongoDB $regex and $operator injection fixed)
- [x] Check for XSS vulnerabilities (no dangerouslySetInnerHTML, React auto-escaping, CSP headers)
- [x] Validate input sanitization (max length limits on all fields, global NoSQL sanitize middleware)
- [x] Review API rate limiting / DDoS protection (auth-specific 10/15min limit, 1MB body limit)
- [x] Review CORS and security headers (explicit origins, full Helmet config with CSP/HSTS)
- [x] Harden error handling (no stack traces in production, rate limit error handling)
- [x] Create security audit documentation (`docs/security/security-audit.md`)

#### Security Findings Summary
- **2 Critical** fixes: JWT secret enforcement, NoSQL injection in recipe search
- **3 High** fixes: Auth rate limiting, Helmet/CSP hardening, SQL ILIKE wildcard escaping
- **4 Medium** fixes: Input length limits, error detail masking, health endpoint hardening, token expiry
- **2 Low** acknowledged: Docker MongoDB auth (dev-only), .env.example defaults
- **9 Positive** findings: parameterized SQL, bcrypt, auth middleware coverage, Zod validation, etc.
- Full report: `docs/security/security-audit.md`

---

## Milestones

| # | Milestone | Status | Branch | PR |
|---|-----------|--------|--------|----|
| 1 | Project scaffolding + architecture | Complete | — | — |
| 2 | Core infrastructure (DB, DI, errors, logging) | Complete | — | — |
| 3 | Auth module (backend) | Complete | — | — |
| 4 | Recipes module (backend) | Complete | — | — |
| 5 | Inventory module (backend) | Complete | — | — |
| 6 | Customers module (backend) | Complete | — | — |
| 7 | Orders module (backend) | Complete | — | — |
| 8 | Payments module (backend) | Complete | — | — |
| 9 | Integration, polish, security hardening | Complete | — | — |
