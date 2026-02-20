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
- [x] SSE endpoint — real-time server-sent events for pushing notifications to connected clients
- [ ] Actual email delivery (currently logs to console)
- [ ] Actual SMS delivery (currently logs to console)
- [ ] App push notifications (UI shows "Coming Soon")

### Order Improvements
- [x] 9-digit sequential order numbers (starting at 100000001)
- [x] Numeric order status enum (0-3: received, in_progress, ready, delivered)
- [x] Bidirectional status transitions (can move status backward)
- [x] Price difference indicator on order form (+/- from recipe base price)
- [x] Order detail page with formatted dates, short IDs, creation date
- [x] Exclude paid orders from payment log modal (`excludePaid` filter)

### Server-Side Pagination & Search
- [x] Inventory: paginated API with search and group filtering (10 items/page)
- [x] Customer orders: server-side pagination
- [x] Customer payments: server-side pagination
- [x] Payments page: server-side pagination
- [x] RTL-aware chevron icons in pagination controls

### Settings Module
- [x] Groups management (CRUD for ingredient/recipe groups)
- [x] Units management (CRUD for measurement units with categories and conversion factors)
- [x] Profile settings (update name, email)
- [x] Notification preferences (per-channel toggles)
- [x] Language toggle (Hebrew/English)
- [x] Team settings tab (UI)
- [x] Loyalty settings tab (enable/disable program, earning rate, redemption value, min redeem threshold, live preview)

### Store Management (Multi-Tenancy)
- [x] Store setup page for new users
- [x] Store creation with name, type, address, phone
- [x] Store invite system — join-store and create-store invitation types
- [x] Store name component in sidebar/topbar
- [x] Database migration for stores table with full multi-tenancy (store_id FK on all data tables)
- [x] Store switching (`POST /stores/select` re-issues JWT with new storeId)
- [x] Store member management (list members, invite new members)
- [x] Store roles: Owner, Manager, Employee
- [x] Invitation-only registration system-wide (no open signups)
- [x] Invitation landing page (validates token, routes to register or store setup)

### Loyalty System (Points-Based Rewards)
- [x] Per-store loyalty configuration (enable/disable, earning rate, redemption value, minimum threshold)
- [x] Automatic point earning on payment received (configurable points per shekel)
- [x] Automatic point deduction on payment refund (capped at current balance)
- [x] Manual point adjustments with description (admin feature)
- [x] Point redemption for discounts with shekel value calculation
- [x] Append-only transaction ledger (earned, redeemed, adjusted)
- [x] Customer balance summary with lifetime earned/redeemed stats
- [x] Paginated transaction history per customer
- [x] Event-driven integration with payment system (PAYMENT_RECEIVED, PAYMENT_REFUNDED)
- [x] Loyalty settings tab in Settings page with live preview
- [x] Adjust Points modal and Redeem Points modal on customer detail
- [x] Full i18n support (English + Hebrew)
- [x] 11 unit tests covering all service methods

### Production Module (Batch Production Planning)
- [x] Production batches CRUD (create, list, detail, update, delete)
- [x] 7-stage production pipeline (To Prep → Mixing → Proofing → Baking → Cooling → Ready → Packaged)
- [x] Auto-generate batches from upcoming orders
- [x] Manual batch creation with recipe, quantity, date, priority, assignee
- [x] Batch-to-order linking (track which orders a batch fulfills)
- [x] Prep list with per-batch ingredient requirements and prep status tracking
- [x] Aggregated prep view (total ingredients needed across all batches)
- [x] Stage transitions with event publishing
- [x] Kanban board view (drag batches across stages)
- [x] Timeline view (visual production schedule)
- [x] Prep list view (aggregated ingredient checklist)
- [x] Kiosk mode (tablet-friendly production floor view)
- [x] Batch detail modal with order sources and prep items
- [x] Database migration (`017_production_batches.sql`)
- [x] Full i18n support (English + Hebrew)

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
- [x] Debounced search inputs (`useDebouncedValue` hook)
- [x] RotatingImage decorative component

### Inventory Enhancements
- [x] Recipe cost calculation with ingredient enrichment
- [x] Stock adjustments with price tracking
- [x] Package size support
- [x] Debounced search input
- [x] Clickable group chips for filtering

### Payment Improvements
- [x] Payment refund support (`POST /payments/:id/refund`)
- [x] Refund confirmation modal in UI
- [x] Exclude already-paid orders from payment log modal dropdown
- [x] Payment method filtering (cash, credit_card)
- [x] Payment status filtering (unpaid, partial, paid)

### Admin Panel (New Module)
- [x] Admin access gate (`GET /admin/access` + frontend `AdminRoute` guard)
- [x] Admin layout shell with dedicated sidebar navigation
- [x] **Admin Dashboard** — analytics cards (total users, stores, active invitations, signups/day) + embedded Grafana panels with range selector (week/month/year)
- [x] **User Management** — paginated user table with search, promote/demote admin (with safety guards: can't self-modify, can't touch other admins), enable/disable users
- [x] **Store Management** — paginated store table with search, expandable member list, inline edit (name, address)
- [x] **Invitation Management** — paginated invitation list with rich filters (status, search, store, user, role, date range), create store invitations, revoke pending invitations
- [x] **Audit Log** — paginated audit log with filters (user, HTTP method, status code, date range, text search), live polling every 10s for new entries on page 1, click-to-expand modal showing request/response body as formatted JSON
- [x] **Audit log body storage** — request and response bodies stored in separate tables (`admin_audit_log_request_body`, `admin_audit_log_response_body`) with 10KB cap and truncation
- [x] Admin audit middleware — global `onSend` hook that fire-and-forgets every authenticated API call to the audit log (skips admin GET requests to avoid feedback loops)
- [x] Admin analytics endpoint (`GET /admin/analytics`) — totalUsers, totalStores, activeInvitations, signupsPerDay with configurable range

### Server-Sent Events (SSE)
- [x] SSE infrastructure (connection manager, heartbeat, reconnection)
- [x] Real-time order updates via SSE

### Grafana Observability
- [x] Grafana service in Docker Compose (port 3002, anonymous viewer access)
- [x] Provisioned PostgreSQL data source
- [x] Pre-built admin dashboard JSON with panels: signups chart, orders/revenue per day, financial stat cards (total revenue, avg order value, outstanding balance), order status pie chart, payment method pie chart, stores created over time, top stores table, inactive stores table
- [x] CSP configured for Grafana iframe embedding in admin dashboard

---

## Database Migrations

| # | Migration | Description |
|---|-----------|-------------|
| 1 | `001_initial.sql` | Core schema: users, customers, ingredients, inventory_log, orders, payments |
| 2 | `002_settings.sql` | Units with conversion factors, unit_categories, groups, notification_preferences, ingredient_groups (many-to-many) |
| 3 | `003_default_groups.sql` | Seeds default ingredient groups |
| 4 | `004_inventory_log_price.sql` | Adds `price_paid` to inventory_log |
| 5 | `005_package_size.sql` | Adds `package_size` to ingredients |
| 6 | `006_google_auth.sql` | Adds `google_id` to users, makes `password_hash` nullable |
| 7 | `007_order_number.sql` | Auto-incrementing `order_number` sequence (starts at 100000001) |
| 8 | `008_stores.sql` | Full multi-tenancy: stores, users_stores (with roles), store_invitations; adds store_id FK to customers, ingredients, orders, groups, units |
| 9 | `009_invitation_only.sql` | Makes `store_id` nullable in invitations (NULL = create-store type), adds OWNER role |
| 10 | `010_admin_role.sql` | Adds `is_admin` boolean to users, creates `admin_audit_log` table |
| 11 | `011_admin_module.sql` | Adds `disabled_at` to users, `revoked_at` to store_invitations |
| 12 | `012_audit_log_bodies.sql` | (Superseded) Added request/response body columns to audit log |
| 13 | `013_split_audit_log_bodies.sql` | Splits bodies into separate tables, migrates existing data |
| 14 | `014_audit_log_cascade.sql` | Cascade deletes for audit log body tables |
| 15 | `015_user_onboarding.sql` | Adds `onboarding_completed_at` to users for product tour tracking |
| 16 | `016_loyalty.sql` | Loyalty system: `loyalty_config` (per-store settings), `loyalty_transactions` (append-only ledger), `loyalty_points` column on customers |
| 17 | `017_production_batches.sql` | Production batches, batch-order links, batch prep items for production planning |

---

## Major Features Summary

| Feature | Backend | Frontend | Status |
|---------|---------|----------|--------|
| Auth (email + password) | Done | Done | Complete |
| Google OAuth + account merging | Done | Done | Complete |
| Recipes (CRUD, sub-recipes, costing) | Done | Done | Complete |
| Inventory (CRUD, stock, groups, search, pagination) | Done | Done | Complete |
| Customers (CRUD, preferences, search) | Done | Done | Complete |
| Orders (CRUD, status pipeline, numbering) | Done | Done | Complete |
| Payments (CRUD, summary, refunds, filtering) | Done | Done | Complete |
| Analytics (revenue, popular, stats) | Done | Done | Complete |
| Notifications (dispatcher, preferences) | Partial | Done | Email/SMS stubbed |
| Settings (groups, units, profile, notifications) | Done | Done | Complete |
| Store Management (multi-tenancy) | Done | Done | Complete |
| Invitation System (join-store + create-store) | Done | Done | Complete |
| Admin Panel (users, stores, invitations, audit) | Done | Done | Complete |
| Admin Analytics + Grafana Dashboards | Done | Done | Complete |
| Admin Audit Log (with body capture) | Done | Done | Complete |
| Loyalty System (points rewards) | Done | Done | Complete |
| Production (batch planning, kanban, prep list) | Done | Done | Complete |
| Server-Side Pagination | Done | Done | Complete |
| i18n (Hebrew RTL + English LTR) | — | Done | Complete |
| Security Hardening | Done | — | Complete |

---

## Infrastructure

| Service | Image | Port | Purpose |
|---------|-------|------|---------|
| PostgreSQL | postgres:16-alpine | 5432 | Primary database |
| MongoDB | mongo:7 | 27017 | Recipe document storage |
| Redis | redis:7-alpine | 6379 | Caching layer |
| RabbitMQ | rabbitmq:3-management | 5672 / 15672 | Message queue (event bus) |
| Grafana | grafana/grafana-oss:latest | 3002 | Admin analytics dashboards |

---

## Security Model

- Invitation-only registration (no open signups)
- JWT-based authentication with refresh tokens
- Three-tier authorization: public → authenticated → store-scoped → admin
- Store roles: Owner (1), Manager (2), Employee (3), Admin (-1)
- Admin audit log captures every authenticated mutation (fire-and-forget)
- Rate limiting: 1000 req/min globally, 10 req/15min on auth endpoints
- Helmet CSP, HSTS, referrer policy, XSS filter
- All SQL queries parameterized, NoSQL injection guards, input length limits

---

## Known Bugs & Issues

### Stubbed / Incomplete
1. **Email notifications** — `channels/email.ts` logs to console instead of sending actual emails (no SMTP/SendGrid configured)
2. **SMS notifications** — `channels/sms.ts` logs to console instead of sending actual SMS (no Twilio configured)
3. **Store invites** — invite links are printed to console, not emailed to recipients
4. **App push notifications** — UI shows "Coming Soon" badge, no backend implementation

### Configuration Gaps
5. ~~**Rate limiting values** are hardcoded~~ — **Fixed**: now configurable via `RATE_LIMIT_MAX`, `RATE_LIMIT_WINDOW`, `AUTH_RATE_LIMIT_MAX`, `AUTH_RATE_LIMIT_WINDOW` env vars
6. **RabbitMQ retry config** hardcoded (5s TTL, 3 retries) — should be configurable
7. ~~**No frontend `.env.example`**~~ — **Fixed**: added `VITE_API_URL` and `VITE_GOOGLE_CLIENT_ID`
8. ~~**`FRONTEND_URL`** has inline fallback to `localhost:5173`~~ — **Fixed**: now fails explicitly in production, dead `??` fallbacks removed

### Code Quality
9. ~~**Console.log in production code**~~ — **Fixed**: all replaced with standalone Pino logger (`appLogger`)
10. **MongoDB only used for recipes** — configured in docker-compose but could be documented as optional

### Missing
11. ~~**No README.md**~~ — **Done**: added comprehensive README
12. ~~**E2E tests**~~ — **Done**: E2E test suite implemented
13. **No CONTRIBUTING.md or SETUP.md** for onboarding new developers

---

## Test Coverage

- **147 unit tests** across 28 test files (Vitest) — all passing
- Covers: Auth, Recipes, Inventory, Customers, Orders, Payments, Loyalty, Core infrastructure
- E2E test suite implemented

---

## Future Plans

### High Impact
- [ ] **Reports & Export** — PDF/Excel export for orders, payments, inventory (bakers need printable summaries for end-of-day/week/month)
- [x] **Order calendar view** — see orders by due date on a calendar, critical for bakery production planning
- [x] **Production planning** — batch production with 7-stage pipeline, auto-generate from orders, aggregated prep list, kanban + timeline + kiosk views
- [x] **Recurring orders** — many bakeries have weekly standing orders from cafes/restaurants
- [ ] **Customer-facing order portal** — let customers place orders directly via a link (right now it's baker-only)

### Medium Impact
- [ ] **Image uploads** — recipe photos, store logo (currently no file upload support)
- [ ] **Batch operations** — bulk status changes on orders, bulk stock adjustments
- [ ] **Inventory alerts** — actual notifications when stock is low (currently events fire but nothing reaches the user besides an in-app count)
- [x] **Order printing** — PDF download + browser print for order slips / production sheets
- [ ] **Profit margins** — recipe cost vs selling price analytics, margin trends over time
- [ ] **Search across modules** — global search bar (find a customer, order, or recipe from one input)

### Polish & DevEx
- [x] **Onboarding product tour** — interactive React Joyride tour overlaying the real app UI, highlights sidebar/bottom-tab nav items and key actions, tracked per-user with restart from settings, responsive (desktop 8 steps / mobile 7 steps with navigation)
- [ ] **Offline support** — service worker + local cache for flaky connections (bakeries aren't always in great WiFi zones)
- [x] **Mobile PWA** — add manifest + install prompt, bakeries often use tablets/phones
- [ ] **Webhook integrations** — let stores connect to external services (accounting software, delivery apps)

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
| 12 | Admin panel, audit logging, Grafana dashboards | Complete | main | — |
