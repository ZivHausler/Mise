# Mise — Bakery Management App

> A bakery management app to help organize inventory, recipes, orders, customers, and payments.

---

## Tech Stack

| Layer       | Technology                          |
| ----------- | ----------------------------------- |
| Frontend    | React (responsive web) + shadcn/ui  |
| Backend     | Node.js + Fastify (TypeScript)      |
| Database    | PostgreSQL + MongoDB                |
| Hosting     | AWS / GCP (TBD)                     |
| Language    | TypeScript (monorepo, shared types) |
| Monorepo    | pnpm workspaces + Turborepo         |

### Monorepo

This is a **single repository** containing both frontend and backend. One repo, one `git push`, one place to read and deploy from.

- **pnpm workspaces** for dependency management across packages
- **Turborepo** for build orchestration (parallel builds, caching)
- Shared TypeScript types between frontend and backend — no type drift
- Single `package.json` at the root, workspace `package.json` in each app/package

### Database Split

- **PostgreSQL** — Structured/relational data: users, orders, customers, inventory, ingredients, units, payments
- **MongoDB** — Flexible/document data: recipes (complex nested structures with steps, variations, notes)

### Frontend

- **shadcn/ui** component library with a warm, bakery-themed design
- Responsive — works on desktop and mobile browsers
- Bilingual: Hebrew (RTL) + English (LTR) with i18n
- Future-ready to migrate to React Native for native mobile

---

## Design Direction

- **Warm & bakery-themed** — soft colors, rounded corners, cozy feel
- Clean and functional — not cluttered
- RTL-first for Hebrew, with full LTR English support
- Accessible and touch-friendly for mobile use

---

## Frontend Architecture Principles

### Component Design Philosophy

The frontend must be built with **maximum reusability** in mind. Every component should be generic, composable, and built to be used across the entire app — not just for the screen it was first needed on.

### Clean Component Tree

- **Minimal raw HTML in component renders** — a component's return should be a composition of other components, not a soup of `<div>`s and `<span>`s
- Component files should read like a clear hierarchy: components calling components
- If you find yourself writing more than a couple of raw HTML elements inside a return, extract a component
- Every "piece" of UI should be its own component with a clear, single responsibility

### Reusable Primitives

Build a design system layer on top of shadcn/ui with bakery-themed defaults:

**Typography** — Preset text components with fixed size, font, and weight:
- `Title` — page titles
- `Subtitle` — section headings
- `Paragraph` — body text
- `Label` — form labels
- `ErrorText` — error messages (red, smaller)
- `InfoText` — informational hints (muted, smaller)
- `Caption` — small secondary text

**Buttons** — Single `Button` component with preset variants:
- `primary`, `secondary`, `ghost`, `danger`, `link`
- Sizes: `sm`, `md`, `lg`
- Support for icons, loading state, disabled state

**Modals** — Generic `Modal` component:
- Preset sizes: `sm`, `md`, `lg`, `full`
- Accepts `children` for content
- Accepts callback functions: `onConfirm`, `onCancel`, `onClose`
- Variants: `alert`, `confirm`, `form`, `custom`

**Form Components** — Reusable form building blocks:
- `TextInput`, `TextArea`, `Select`, `Checkbox`, `Toggle`, `DatePicker`, `NumberInput`
- All with built-in label, error, and hint text support
- Consistent validation pattern across all form components

**Layout Components:**
- `Page` — standard page wrapper with title and actions
- `Section` — content grouping with optional heading
- `Card` — content container
- `Stack` / `Row` — flex layout primitives (vertical / horizontal)
- `Divider`, `Spacer`

**Data Display:**
- `DataTable` — generic sortable, filterable table
- `EmptyState` — placeholder when no data exists
- `StatusBadge` — colored badges for order status, payment status, etc.
- `StatCard` — analytics number display

### Single File Components (SFC)

Every component is **one file**. Logic, markup, and styles — all in a single `.tsx` file. No separate CSS files, no folder-per-component, no splitting.

```
components/
├── Button.tsx
├── Modal.tsx
├── Title.tsx
└── Card.tsx
```

**Structure within a component file:**
1. **Imports & types** — at the top
2. **Styles** — defined as objects or Tailwind classes inline, within the same file
3. **Component function** — logic (hooks, handlers), then a clean JSX return
4. **Exports** — at the bottom

**Styling approach:**
- **Tailwind** for all styling — keeps everything in the single file
- Theme tokens (colors, spacing, fonts) defined once in `tailwind.config` and used via Tailwind classes
- No separate `.css` files per component — everything lives in the `.tsx`
- One component = one file. Period.

### Rules

1. **No one-off styled divs** — if it has a visual purpose, it's a component
2. **Props over customization** — components expose preset variants, not raw style overrides
3. **Composition over configuration** — complex UI is built by nesting simple components, not by adding more props to a single component
4. **Consistent naming** — components are PascalCase, props describe what they do, not how they look
5. **SFC always** — a component's logic, markup, and styles are never spread across unrelated files. One component = one folder with its `.tsx` and `.module.css`

---

## Backend Architecture

### Layered Architecture

Every request flows through a strict, unidirectional layer chain. No layer may skip or bypass another.

```
Route → Controller → Service → Use Case → Repository → Database
```

| Layer          | Responsibility                                                                 | Rules                                                            |
| -------------- | ------------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| **Route**      | Define HTTP method, path, attach controller                                    | No logic. Just wiring.                                           |
| **Controller** | Parse request (params, body, query), call service, return response             | No business logic. No DB access. No direct use-case calls.       |
| **Service**    | Orchestrate use cases, handle cross-cutting concerns (auth context, events)    | No DB access. No HTTP concepts (req/res). Calls use cases only.  |
| **Use Case**   | Single business operation with business rules and validation                   | No HTTP concepts. No event publishing. Calls repositories only.  |
| **Repository** | Data access — CRUD operations, queries, transactions                           | No business logic. Only talks to the database.                   |

### Why This Matters

- **Microservices-ready** — any service or controller can be extracted to its own microservice with minimal refactoring. The boundaries are already clean.
- **Testable** — each layer can be unit tested in isolation by mocking the layer below it.
- **Readable** — you can understand what a service does without reading DB queries, and what a controller does without reading business rules.

### Dependency Injection

- Use a DI container to wire layers together
- Every layer depends on **interfaces/abstractions**, not concrete implementations
- This makes swapping implementations trivial (e.g., swap Postgres repository for an in-memory one in tests)

### Event-Driven Architecture

An abstracted event bus for decoupled, async communication between domains.

**EventBus Interface:**
```typescript
interface EventBus {
  publish(event: DomainEvent): Promise<void>;
  subscribe(eventName: string, handler: EventHandler): void;
}
```

- **Implementation:** RabbitMQ (via amqplib), but swappable thanks to the abstraction
- **Events are published by services**, not use cases or controllers
- **Event handlers** are separate modules — they subscribe to events and trigger side effects

**Event examples:**
| Event                  | Published when...              | Handled by...                                    |
| ---------------------- | ------------------------------ | ------------------------------------------------ |
| `order.created`        | New order is placed            | Notification service (push/email to baker)       |
| `order.statusChanged`  | Order moves to next stage      | Notification service, Analytics logger            |
| `inventory.lowStock`   | Stock falls below threshold    | Notification service (alert to baker)            |
| `payment.received`     | Payment is logged for an order | Analytics logger, Order service (update status)  |
| `recipe.updated`       | Recipe is modified             | Cache invalidation, Cost recalculation           |

### Error Handling

Custom typed error classes with a global Fastify error handler.

```
AppError (base)
├── ValidationError     (400)
├── NotFoundError       (404)
├── UnauthorizedError   (401)
├── ForbiddenError      (403)
├── ConflictError       (409)
└── InternalError       (500)
```

- All errors extend a base `AppError` class with `statusCode`, `message`, and `errorCode`
- A global Fastify `onError` hook catches all errors and returns a consistent JSON response
- Use cases throw domain errors; the global handler translates them to HTTP responses
- No try/catch spaghetti in controllers — they just call services and return

### Logging & Observability

- **Pino** (Fastify built-in) for structured JSON logging
- **Correlation IDs** — every incoming request gets a unique `requestId`, propagated through all layers and into event payloads
- Log levels: `trace`, `debug`, `info`, `warn`, `error`, `fatal`
- Logs include: `requestId`, `userId` (if authenticated), `layer`, `action`, `duration`

### Backend Folder Structure

```
apps/api/
├── src/
│   ├── modules/                  # Feature modules (domain-driven)
│   │   ├── orders/
│   │   │   ├── order.routes.ts
│   │   │   ├── order.controller.ts
│   │   │   ├── order.service.ts
│   │   │   ├── use-cases/
│   │   │   │   ├── createOrder.ts
│   │   │   │   ├── updateOrderStatus.ts
│   │   │   │   └── getOrdersByCustomer.ts
│   │   │   ├── order.repository.ts
│   │   │   ├── order.types.ts
│   │   │   └── order.events.ts
│   │   ├── customers/
│   │   ├── recipes/
│   │   ├── inventory/
│   │   ├── payments/
│   │   ├── notifications/
│   │   └── analytics/
│   ├── core/                     # Shared infrastructure
│   │   ├── errors/               # Custom error classes
│   │   ├── events/               # EventBus interface + RabbitMQ implementation
│   │   ├── middleware/           # Auth, correlation ID, request logging
│   │   ├── database/            # DB connections (Postgres + MongoDB)
│   │   ├── di/                  # Dependency injection container
│   │   └── logger/              # Pino setup + correlation ID context
│   ├── config/                  # Environment config
│   └── server.ts                # Fastify app bootstrap
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
└── package.json
```

### Module Boundaries

- Each module is **self-contained** — it owns its routes, controller, service, use cases, repository, types, and events
- Modules communicate through **services** (direct calls within the monolith) or **events** (async, for decoupled side effects)
- A module should **never import another module's repository directly** — always go through that module's service
- This ensures that when a module is extracted to a microservice, the contract is already defined

---

## Core Modules

### 1. Orders

- Create and manage orders
- Order status pipeline: `Received → In Progress → Ready → Delivered`
- Link orders to customers and recipes
- Order notes and special instructions
- Due date / delivery date tracking

### 2. Customers

- Customer profiles (name, phone, email, address, notes)
- Full order history per customer
- Customer preferences (allergies, favorites)
- Search and filter customers

### 3. Recipes

- Create recipes with:
  - Description and category
  - Ingredients list (linked to inventory) with quantities and units
  - Step-by-step instructions
  - Yield / servings
  - Pricing (manual or auto-calculated from ingredient costs)
  - Photos
  - Notes and variations
- **Composable recipes** — a recipe can contain other recipes as sub-components
  - Example: "Truffle Cheesecake" has its own instructions for the cheesecake base, but references a standalone "Truffles" recipe as a component
  - Sub-recipes are full recipes on their own — reusable across multiple parent recipes
  - Cost calculation rolls up automatically: parent recipe cost = own ingredients + sub-recipe costs
  - Nested depth is supported (a sub-recipe can itself contain sub-recipes)
  - Changing a sub-recipe automatically reflects in all parent recipes that use it
- Recipe cost breakdown (auto-calculated from ingredients + sub-recipes)
- Recipe categories / tags

### 4. Inventory

- Track ingredients and supplies
- Stock quantities with units
- Low-stock alerts (configurable thresholds)
- Ingredient cost per unit
- Inventory log (track additions, usage, adjustments)

### 5. Payments

- Manual payment logging (cash, credit card mock)
- Payment status per order: `Unpaid → Partial → Paid`
- Payment history
- Architected for future integration with real payment providers (Stripe, etc.)

### 6. Analytics & Dashboards

- Revenue overview (daily, weekly, monthly)
- Popular recipes / most ordered items
- Inventory usage trends
- Customer order frequency
- Cost vs. revenue per recipe

### 7. Auth & Roles

- Basic authentication (email + password)
- Groundwork for role-based access:
  - **Owner/Admin** — full access
  - **Staff** — limited access (e.g., manage orders, view recipes)
  - **Viewer** — read-only
- Settings page for user and app configuration

---

## Feature Priority

### Must Have (V1)

- [ ] User authentication (single user, basic login)
- [ ] Recipe CRUD (create, read, update, delete)
- [ ] Ingredient management with units and costs
- [ ] Recipe cost auto-calculation from ingredients
- [ ] Inventory tracking with stock levels
- [ ] Low-stock alerts
- [ ] Customer CRUD with contact info
- [ ] Order CRUD with status tracking pipeline
- [ ] Link orders to customers and recipes
- [ ] Payment logging (cash / mock credit card)
- [ ] Payment status per order
- [ ] Hebrew + English language toggle (RTL/LTR)
- [ ] Responsive layout (desktop + mobile)
- [ ] Warm bakery-themed UI

### Nice to Have (V1)

- [ ] Recipe photos upload
- [ ] Order notes / special instructions
- [ ] Customer preferences (allergies, favorites)
- [ ] Search and filter across all modules
- [ ] Basic dashboard with revenue overview

---

## Versioning Roadmap

### V1 — Core Foundation

> Goal: A fully functional app for a single bakery owner to manage day-to-day operations.

- All "Must Have" features above
- Single-user auth
- Manual data entry for everything
- Local-first data with cloud persistence
- Deploy to cloud (AWS/GCP)

### V2 — Insights & Multi-User

> Goal: Add analytics, multi-user support, and smarter features.

- Full analytics dashboards (revenue, popular items, trends, cost vs. profit)
- Role-based access control (owner, staff, viewer)
- Multi-user support with invitations
- Advanced inventory: auto-deduct stock when orders are placed
- Recipe scaling (adjust quantities by servings)
- Order calendar view
- Notifications (low stock, order status changes)
- Data export (CSV, PDF for reports)

### V3 — Integrations & Growth

> Goal: Connect to external services and scale the business.

- Real payment provider integration (Stripe / local Israeli provider)
- WhatsApp / SMS notifications to customers (order ready, delivery)
- Supplier management (track ingredient sources, reorder)
- Customer-facing order page (customers can place orders online)
- Mobile app (React Native)
- Backup & restore functionality
- Multi-branch support (if the bakery expands)

---

## Project Structure (Planned)

```
Mise/
├── apps/
│   ├── web/          # React frontend
│   └── api/          # Fastify backend
├── packages/
│   ├── shared/       # Shared TypeScript types, constants, utils
│   ├── db/           # Database schemas, migrations, seeds
│   └── ui/           # Shared UI components (if needed)
├── PLAN.md
├── README.md
└── package.json      # Monorepo root (pnpm workspaces / turborepo)
```

---

## Open Questions

- [ ] AWS vs. GCP — decide before deployment
- [ ] Which Israeli payment provider to integrate in V3?
- [ ] Exact bakery theme colors and branding (logo, palette)
- [ ] Offline-first strategy: service workers + local DB (IndexedDB / SQLite)?
- [ ] File storage for recipe photos (S3, Cloudinary, etc.)?

---

*This document is a living plan. We update it as requirements evolve.*
