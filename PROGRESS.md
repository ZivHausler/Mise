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

## Phase 3: Post-V1 Features & Improvements

### Google OAuth & Account Merging
- [x] Google OAuth login and registration flow
- [x] Account merging: link existing email account to Google
- [x] Account merging: link Google account to existing email
- [x] Frontend Google sign-in button on login/register pages

### Notification System
- [x] Notification dispatcher with channel routing (email, SMS, in-app)
- [x] Event-driven: order.created, order.statusChanged, inventory.lowStock, payment.received
- [x] Notification preferences UI (per-channel toggles)
- [ ] Actual email delivery (currently logs to console)
- [ ] Actual SMS delivery (currently logs to console)
- [ ] App push notifications (UI shows "Coming Soon")

### Order Improvements
- [x] 9-digit sequential order numbers (starting at 100000001)
- [x] Numeric order status enum (0-3: received, in_progress, ready, delivered)
- [x] Bidirectional status transitions (can move status backward)
- [x] Price difference indicator on order form (+/- from recipe base price)
- [x] Order detail page with formatted dates, short IDs, creation date

### Server-Side Pagination & Search
- [x] Inventory: paginated API with search and group filtering (10 items/page)
- [x] Customer orders: server-side pagination
- [x] Customer payments: server-side pagination
- [x] Payments page: server-side pagination
- [x] RTL-aware chevron icons in pagination controls

### Settings Module
- [x] Groups management (CRUD for ingredient/recipe groups)
- [x] Units management (CRUD for measurement units)
- [x] Profile settings (update name, email)
- [x] Notification preferences (per-channel toggles)
- [x] Language toggle (Hebrew/English)
- [x] Team settings tab (UI)

### Store Management (New Module)
- [x] Store setup page for new users
- [x] Store creation with name, type, address, phone
- [x] Store invite system (generates invite links, console-only for now)
- [x] Store name component in sidebar/topbar
- [x] Database migration for stores table

### Architecture Refactoring
- [x] Generic CRUD base class with Zod schema validation
- [x] Refactored all modules to use CRUD base (customers, inventory, orders, payments, recipes, settings)
- [x] Removed individual create/update/delete use-case files in favor of generic CRUD
- [x] Added Zod schemas per module (customer.schema, inventory.schema, order.schema, etc.)
- [x] Redis caching layer (`redis-client.ts`)

### UI/UX Improvements
- [x] New customer modal (inline creation)
- [x] Drag-and-drop recipe steps (desktop: grip handle, mobile: long-press)
- [x] Improved dashboard layout (Quick Actions in separate row)
- [x] RTL fixes: date locale, currency (NIS to shekel symbol), translation keys
- [x] Mobile nav using translation keys instead of hardcoded English

### Inventory Enhancements
- [x] Recipe cost calculation with ingredient enrichment
- [x] Stock adjustments with price tracking
- [x] Package size support
- [x] Debounced search input
- [x] Clickable group chips for filtering

---

## Major Features Summary

| Feature | Backend | Frontend | Status |
|---------|---------|----------|--------|
| Auth (email + password) | Done | Done | Complete |
| Google OAuth | Done | Done | Complete |
| Recipes (CRUD, sub-recipes, costing) | Done | Done | Complete |
| Inventory (CRUD, stock, groups, search) | Done | Done | Complete |
| Customers (CRUD, preferences, search) | Done | Done | Complete |
| Orders (CRUD, status pipeline, numbering) | Done | Done | Complete |
| Payments (CRUD, summary, history) | Done | Done | Complete |
| Analytics (revenue, popular, stats) | Done | Done | Complete |
| Notifications (dispatcher, preferences) | Partial | Done | Email/SMS stubbed |
| Settings (groups, units, profile) | Done | Done | Complete |
| Store Management | Done | Done | New |
| Server-Side Pagination | Done | Done | Complete |
| i18n (Hebrew RTL + English LTR) | — | Done | Complete |
| Security Hardening | Done | — | Complete |

---

## Known Bugs & Issues

### Stubbed / Incomplete
1. **Email notifications** — `channels/email.ts` logs to console instead of sending actual emails (no SMTP/SendGrid configured)
2. **SMS notifications** — `channels/sms.ts` logs to console instead of sending actual SMS (no Twilio configured)
3. **Store invites** — invite links are printed to console, not emailed to recipients
4. **App push notifications** — UI shows "Coming Soon" badge, no backend implementation

### Configuration Gaps
5. **Rate limiting values** are hardcoded (100 req/min global, 10 req/15min auth) — should be env vars for production tuning
6. **RabbitMQ retry config** hardcoded (5s TTL, 3 retries) — should be configurable
7. **No frontend `.env.example`** — only `VITE_GOOGLE_CLIENT_ID` is used but undocumented
8. **`FRONTEND_URL`** has inline fallback to `localhost:5173` — should fail explicitly in production

### Code Quality
9. **Console.log in production code** — notification channels and RabbitMQ event bus use `console.log`/`console.error` instead of the Pino logger
10. **MongoDB only used for recipes** — configured in docker-compose but could be documented as optional

### Missing
11. **No README.md** — no project README or setup instructions
12. **E2E tests** — detailed plan exists (`E2E_PLAN.md`) but not yet implemented
13. **No CONTRIBUTING.md or SETUP.md** for onboarding new developers

---

## Test Coverage

- **136 unit tests** across 27 test files (Vitest) — all passing
- Covers: Auth, Recipes, Inventory, Customers, Orders, Payments, Core infrastructure
- E2E test plan drafted but not yet executed

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
| 10 | Google OAuth, notifications, pagination | Complete | — | — |
| 11 | Stores, CRUD refactoring, caching, UI polish | Complete | feat/major-improvements | — |
