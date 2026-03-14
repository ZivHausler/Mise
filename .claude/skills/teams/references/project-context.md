# Mise Project Context

## Overview
Mise is a Hebrew RTL bakery management platform built as a monorepo with pnpm workspaces + Turborepo.

## Architecture
- **Backend**: `apps/api` — Fastify, layered (Route → Controller → Service → Repository)
- **Frontend**: `apps/web` — React + Vite + Tailwind CSS + Zustand + TanStack Query
- **Database**: `packages/db` — PostgreSQL (primary) + MongoDB (recipes only)
- **Shared**: `packages/shared` — Shared types and utilities
- **Core**: `apps/core` or `apps/api/src/core` — Event bus, base classes

## Key Patterns

### Backend
- Routes registered via Fastify plugin pattern
- Auth via `@fastify/jwt` — `request.user` has `userId`, `storeId`, `role`
- Multi-tenancy: all queries filter by `store_id`
- Middleware: `requireAuth`, `requireRole()`, `requireTier()`
- Validation: Zod schemas
- Events: EventBus (RabbitMQ with in-memory fallback)
- Notifications: NotificationDispatcher with Email/SMS/WhatsApp channels

### Frontend
- React Router v6 with lazy loading
- Zustand stores: `useAuthStore`, `useAppStore`
- TanStack Query for server state
- i18next for i18n (Hebrew primary, English)
- Tailwind CSS with RTL support (logical properties)
- FeatureGate component for tier-based page access
- AppShell wraps all authenticated routes

### Database
- PostgreSQL migrations in `packages/db/src/migrations/`
- Sequential numbered migrations (001 through 033)
- Store table: id (SERIAL), name, code, address, phone, email, taxNumber, vatRate, theme
- Recipes in MongoDB with fields: name, description, tags, ingredients, steps, sellingPrice, photos, totalCost
- Orders: SERIAL id, auto orderNumber, customer_id FK, items JSON, status (0-3), totalAmount
- Customers: SERIAL id, name, phone, email, address, preferences JSONB, loyaltyEnabled
- Payments: order_id FK, amount, method ('cash'), status

### Subscription Tiers
- Free: inventory + recipes only
- Basic (49₪/mo): + customers, orders, payments, invoices
- Pro (99₪/mo): + production, analytics, WhatsApp, AI chat
- `requireTier()` middleware checks store's plan
- `FeatureGate` component on frontend
- Feature flags cached in Redis (5-min TTL)

### Store Themes
- 7 presets: cream, white, stone, rose, mint, sky, lavender
- Stored in `stores.theme` column
- Applied via CSS classes in frontend

### Notifications
- Event-driven: order.created, payment.received, inventory.lowStock, etc.
- Channels: Email (Resend API), SMS (stubbed), WhatsApp (Meta WABA), In-app (SSE)
- Per-user preferences stored in notification_preferences table

## File Structure
```
apps/
  api/src/
    modules/
      auth/
      customers/
      inventory/
      orders/
      payments/
      recipes/
      stores/
      notifications/
      subscription/
      invoices/
      production/
      loyalty/
      analytics/
      admin/
      ai-chat/
    core/
    plugins/
  web/src/
    pages/
    components/
    stores/ (zustand)
    hooks/
    api/ (TanStack Query hooks)
    i18n/
    utils/
packages/
  db/src/migrations/
  shared/src/
```

## Conventions
- Commits: descriptive, Co-Authored-By Claude
- Hebrew RTL app (bakery management)
- Primary color: warm brown #C4823E, bg: cream #FDF8F3
- HTTPS local dev via @vitejs/plugin-basic-ssl
- Payment amounts in agorot (NIS × 100) for subscriptions
- Order amounts in NIS for regular orders
