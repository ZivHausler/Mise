# Mise — Progress Tracker

> Bakery management platform. Hebrew RTL app built with Fastify + React + PostgreSQL.
> Last verified against codebase: 2026-03-14

---

## Architecture

- **Monorepo**: pnpm workspaces + Turborepo
- **Backend**: Fastify + layered architecture (Route → Controller → Service → Repository)
- **Frontend**: React + Vite + Tailwind CSS + Zustand + TanStack Query
- **Mobile**: React Native / Expo (storefront customer app)
- **Database**: PostgreSQL (primary) + MongoDB (recipes)
- **Caching**: Redis via ioredis
- **Events**: RabbitMQ (in-memory fallback)
- **Validation**: Zod schemas shared between frontend and backend
- **i18n**: i18next — Hebrew (RTL) + English (LTR)
- **Auth**: JWT (@fastify/jwt) + Google OAuth + invitation-only registration
- **Observability**: Grafana dashboards, Pino logger, admin audit log

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

## Completed Features

### Core Modules
- [x] **Auth** — Email/password registration, login, JWT with refresh, bcrypt, profile endpoint
- [x] **Google OAuth** — Login/register, account merging (email↔Google both directions)
- [x] **Recipes** — MongoDB CRUD, composable sub-recipes, recursive cost calculation, ingredient enrichment, image uploads (GCS + local), publish/unpublish toggle for storefront
- [x] **Inventory** — PostgreSQL CRUD, transactional stock adjustments with log, low-stock event publishing, package size, supplier text field
- [x] **Customers** — PostgreSQL CRUD, JSONB preferences, multi-field search
- [x] **Orders** — PostgreSQL CRUD, JSONB items, 9-digit sequential numbering, bidirectional status pipeline, order calendar view, recurring orders
- [x] **Payments** — PostgreSQL CRUD, payment summary (unpaid/partial/paid), refunds, method & status filtering, PayPal payment method
- [x] **Analytics** — Revenue (daily/total), popular recipes, order stats by status, customer frequency

### Storefront Module (Customer-Facing)
- [x] **Store discovery** — Public API to browse all storefront-enabled stores (`GET /s/discover`, LIMIT 50)
- [x] **Store pages** — Public store info by slug, published recipe menu with tag/search/lang filters
- [x] **Customer auth** — Google Sign-In for storefront customers, JWT with `iss: 'storefront'` claim, profile management
- [x] **Order placement** — Customers place orders via storefront, `source` column tracks origin (`web`/`storefront`)
- [x] **Order tracking** — Real-time SSE status updates, order notifications (bilingual), phone-verified access
- [x] **Customer cancellation** — Customers can request cancellation, bakery approves/declines
- [x] **PayPal payments** — Order creation, capture, checkout HTML page for storefront
- [x] **Storefront types** — Shared types: `PublicStoreInfo`, `PublicMenuItem`, `PublicOrderConfirmation`, `PublicOrderStatus`, `PublicOrderNotification`
- [x] **15 public endpoints** under `/s/` prefix (rate-limited, no auth required for browsing)

### Storefront Mobile App (Expo)
- [x] React Native / Expo app in `apps/storefront/`
- [x] Google Sign-In auth flow
- [x] Store discovery & menu browsing
- [x] Order placement & tracking
- [x] PayPal payment integration
- [x] Bilingual support (Hebrew/English)
- [x] EAS build configuration

### Order Approval & Cancellation Flow
- [x] **Pending approval status** — New `PENDING_APPROVAL` (0) status for storefront orders requiring bakery approval
- [x] **7-status pipeline** — PENDING_APPROVAL → RECEIVED → IN_PROGRESS → READY → DELIVERED, plus CANCELLED and CANCELLATION_REQUESTED
- [x] **Approve/decline endpoints** — Role-gated (owner/manager/admin) routes for order and cancellation management
- [x] **Order notifications** — `order_notifications` table, bilingual messages (Hebrew + English) for all status transitions
- [x] **Real-time SSE** — Channel-based SSE broadcasting to storefront customers on status changes
- [x] **Frontend** — `ActionRequiredSection` component with collapsible pending approval/cancellation cards, inline approve/decline buttons, pending count badge

### Customer Identity System
- [x] **Global customers table** — Google identity (google_id, email, first_name, last_name, phone)
- [x] **Per-store CRM** — `customer_stores` table (renamed from `customers`) for store-specific records
- [x] **Identity linking** — FK between global identity and per-store CRM, unique constraint per store
- [x] **Profile completion** — `isProfileComplete` check for storefront customers

### Store Branding & Customization
- [x] **Branding assets** — `logo_url`, `banner_url`, `description` (with English translations) on stores
- [x] **Image upload** — `ImageUploadZone` component with drag/drop, preview, replace, remove
- [x] **Store categories** — `category_subject` / `category_sub_subject` for discovery classification
- [x] **Theme to app** — `apply_theme_to_app` toggle to apply store theme to storefront
- [x] **URL validation** — Only managed URLs (GCS/local) accepted for branding; external URLs rejected
- [x] **Store slugs** — Auto-generated from name, unique, validated (min 3 chars, lowercase alphanumeric + hyphens), availability checking

### Recipe Categories
- [x] **Per-store categories** — `recipe_categories` table with unique name constraint
- [x] **CRUD** — Backend service + routes in `apps/api/src/modules/settings/categories/`
- [x] **Frontend** — `CategoriesTab` in settings with create/edit/delete and English translation support

### English Translations (Bilingual Content)
- [x] **`name_en` columns** — On stores, recipe_categories, allergens, ingredients
- [x] **`description_en` / `address_en`** — On stores
- [x] **AI translation** — `translateHebrewToEnglish()` via Gemini API with field-specific prompts (name vs description)
- [x] **TranslateButton component** — One-click AI translation with loading/success states, feature-gated behind `ai_chat`
- [x] **Default allergen translations** — Backfilled via migration

### Trial Plan (Dedicated)
- [x] Separate `trial` plan row in `plans` table (previously trial reused the `pro` plan)
- [x] Full Pro feature set, zero cost, hidden from UI
- [x] Existing trialing subscriptions migrated from `pro` to `trial`
- [x] Trial downgrade flow with PayPal refund handling
- [x] `trial_plan_selected` event type

### Notification System
- [x] **Notification dispatcher** — Channel routing (email, SMS, WhatsApp, in-app)
- [x] **Event-driven** — order.created, order.statusChanged, inventory.lowStock, payment.received
- [x] **Email delivery** — Resend API with localized HTML templates (Hebrew/English/Arabic)
- [x] **SSE** — Real-time server-sent events infrastructure (connection manager, heartbeat, reconnection, channel-based for storefront)
- [x] **Notification preferences UI** — Per-channel toggles in settings

### Store Management (Multi-Tenancy)
- [x] Store setup page, creation (name, type, address, phone)
- [x] Full multi-tenancy — `store_id` FK on all data tables
- [x] Store switching (`POST /stores/select` re-issues JWT)
- [x] Store roles: Owner (1), Manager (2), Employee (3), Admin (-1)
- [x] Invitation system — join-store and create-store types, email delivery via Resend
- [x] Invitation landing page (validates token, routes to register or store setup)
- [x] Store theme customization — 7 presets (Cream, White, Stone, Rose, Mint, Sky, Lavender)

### Subscription Tier System & Billing
- [x] Three tiers: Free (inventory+recipes), Basic 49₪/mo, Pro 99₪/mo
- [x] Feature-level gating — `requireTier()` middleware (backend) + `FeatureGate` component (frontend)
- [x] 14-day Pro trial for new stores with expiry reminder emails (3d, 1d, 0d)
- [x] Monthly billing with anchor days, proration for mid-period upgrades
- [x] Downgrade scheduling (takes effect at period end), cancel downgrade
- [x] Plan change preview (pricing, effective dates)
- [x] Payment providers: PayPal + PayPlus (Israeli processor) with webhooks
- [x] Grace period for failed payments (7 days), renewal recovery
- [x] Checkout flow with session management, stale session cleanup (cron)
- [x] Daily cron: period-end processing, trial reminders, grace period expiry
- [x] Admin force-plan-change endpoint
- [x] Full subscription UI: PricingCards, ConfirmUpgradeModal, DowngradeWarningModal, TrialBadge, TierBadge, PendingDowngradeBanner, FailedPaymentBanner
- [x] Payment history (paginated) + subscription event audit trail
- [x] Redis-cached feature checks (5-min TTL)

### Invoice & Credit Note System
- [x] Invoice CRUD with sequential gapless numbering per store (INV-00001)
- [x] Credit note generation linked to original invoices (CN-00001)
- [x] PDF generation via jsPDF — RTL/Hebrew support, store branding, item snapshots
- [x] VAT tracking, customer/store snapshots for audit trail
- [x] Auto-generate settings (auto_generate_invoice, auto_generate_credit_note)
- [x] Role-based access (owner/manager)
- [x] Frontend: GenerateInvoiceModal, InvoicesPage with filtering & pagination

### WhatsApp Integration
- [x] Meta Embedded Signup OAuth flow (token exchange, WABA discovery)
- [x] Per-store WhatsApp configuration (`whatsapp_config` table)
- [x] Outbound notifications: order confirmations, low-stock alerts, payment received
- [x] Multilingual messages (Hebrew, English, Arabic)
- [x] Frontend: IntegrationsTab with connect/disconnect flow
- [x] Feature-gated by subscription tier + `FEATURE_WHATSAPP` env flag
- [x] Test coverage in notification dispatcher tests

### AI Chat Assistant
- [x] Gemini API integration with streaming responses
- [x] Chat panel UI (AiChatPanel, AiChatFab)
- [x] Tool calling and entity references
- [x] Conversation history management
- [x] Owner/admin only access
- [x] Hebrew and English language-aware context
- [x] **AI translation** — Hebrew-to-English translation with field-specific prompts (names: 1-5 words, descriptions: tone-preserving)

### Receipt Scanner (OCR)
- [x] Google Gemini 2.5 Flash for receipt parsing
- [x] Extracts items, vendor, date, total — supports Hebrew and English
- [x] 2-stage matching: local fuzzy (Levenshtein) → AI fallback
- [x] Frontend: ReceiptScannerModal with review table, manual selection, quick ingredient creation
- [x] Bulk apply via `adjustBulk()`

### Allergen System
- [x] Allergen CRUD service and settings UI tab (AllergensTab)
- [x] `allergens` table + `ingredient_allergens` junction table
- [x] Recipe tags system for dietary labels

### Production Module (Batch Planning)
- [x] Production batches CRUD
- [x] 7-stage pipeline (To Prep → Mixing → Proofing → Baking → Cooling → Ready → Packaged)
- [x] Auto-generate batches from upcoming orders
- [x] Batch-to-order linking, prep list with aggregated ingredient requirements
- [x] Views: Kanban board, Timeline, Prep list, Kiosk mode
- [x] Full i18n support

### Loyalty System (Points-Based Rewards)
- [x] Per-store config (enable/disable, earning rate, redemption value, threshold)
- [x] Auto earn on payment, auto deduct on refund
- [x] Manual adjustments, point redemption for discounts
- [x] Append-only transaction ledger, customer balance summary
- [x] Settings tab with live preview, Adjust/Redeem modals
- [x] 11 unit tests

### Admin Panel
- [x] Admin access gate + AdminRoute guard
- [x] Dashboard — analytics cards + embedded Grafana panels
- [x] User Management — paginated table, promote/demote admin, enable/disable
- [x] Store Management — paginated table, expandable members, inline edit
- [x] Invitation Management — paginated list, rich filters, create/revoke
- [x] Audit Log — paginated, filters, live polling, request/response body viewer
- [x] Audit middleware (global `onSend` hook, fire-and-forget)

### Settings Module
- [x] **ProfileTab** — User name, phone, email (replaced old AccountTab)
- [x] **PreferencesTab** — Language, date/time format, week start day, Friday/Saturday visibility
- [x] **AppearanceTab** — Theme picker with visual swatches, "apply theme to app" toggle
- [x] **StorefrontTab** — Slug management, enable/disable storefront, branding (logo/banner/description), store categories
- [x] **CategoriesTab** — Recipe category CRUD with English translations
- [x] **AllergensTab** — Allergen management
- [x] **NotificationsTab** — Per-channel notification toggles
- [x] **BillingTab** — Payment history, subscription management
- [x] **TeamTab** — Team member management
- [x] **LoyaltyTab** — Loyalty program configuration

### Bulk Operations
- [x] Bulk stock adjustments (`adjustBulk()`) — partial success handling, correlation IDs
- [x] Bulk ingredient delete (`deleteBulk()`) — prevents deletion of recipe-linked items

### Image Uploads
- [x] Dual storage: Google Cloud Storage + local filesystem
- [x] Recipe image upload component (RecipeImageUpload)
- [x] Branding image upload (ImageUploadZone) with drag/drop, preview, replace, remove
- [x] Signed upload URLs, JPEG/PNG/WebP (5-6MB max)
- [x] Store-isolated paths, temp → permanent promotion
- [x] Consolidated upload URL generation (shared helper for temp + branding uploads)

### UI/UX
- [x] Onboarding product tour (React Joyride, per-user tracking, desktop 8 / mobile 7 steps)
- [x] Mobile PWA (manifest + install prompt)
- [x] Server-side pagination across all modules
- [x] Drag-and-drop recipe steps
- [x] Debounced search inputs
- [x] Order printing (PDF download + browser print)
- [x] RTL fixes (dates, currency ₪, chevrons, CSS logical properties)

### Security
- [x] Invitation-only registration (no open signups)
- [x] JWT with refresh tokens, bcrypt 12 rounds
- [x] Rate limiting: 1000 req/min global, 10 req/15min auth endpoints
- [x] Helmet CSP, HSTS, referrer policy
- [x] Parameterized SQL, NoSQL injection guards, input length limits
- [x] Password reset flow with secure email tokens
- [x] Storefront JWT isolation — `iss: 'storefront'` claim, rejected on admin routes with `AUTH_INSUFFICIENT_PERMISSIONS`
- [x] Role-gated order approval/cancellation (owner/manager/admin only)
- [x] Branding URL validation — only managed URLs accepted, external URLs rejected
- [x] GCS path traversal protection — URL parsed and normalized before store ownership check

### Code Quality (Review Session — 2026-03-14)
- [x] `ORDER_STATUS` consolidated to `@mise/shared` (single source of truth)
- [x] `STATUS_TRANSITIONS` complete for all 7 statuses
- [x] `dateStringSchema` shared Zod validator (replaced 14 inline regex occurrences)
- [x] `buildDynamicUpdate` SQL utility (eliminated boilerplate in store repository)
- [x] `useMutationWithToast` React Query factory (9 hooks refactored)
- [x] `useStoreSwitch` custom hook (extracted from AppShell + Sidebar)
- [x] SSE dead client cleanup on broadcast failure
- [x] SSE skips DB queries when no channel listeners
- [x] `getPublishedMenu` parallel query execution
- [x] Unbounded queries capped (LIMIT 50/100 on public endpoints)
- [x] Auth middleware no longer mutates JWT payload
- [x] `handleTrialDowngrade` refactored (extracted `executePayPalRefund` + `recordDowngrade` helpers)
- [x] Raw SQL moved from checkout service to subscription repository
- [x] PayPal capture ID extraction centralized in helper function
- [x] `togglePublish` endpoint Zod-validated

### Testing
- [x] 1,270 unit tests across 100 test files (Vitest) — all passing
- [x] E2E test suite
- [x] Covers: Auth, Recipes, Inventory, Customers, Orders, Payments, Loyalty, Subscriptions, Checkout, Webhooks, Storefront, Store branding/slugs/categories, AI translation, Order approval, Production, Core infrastructure

---

## Partially Implemented

| Feature | What exists | What's missing |
|---------|------------|----------------|
| **SMS Notifications** | Channel class exists, dispatcher routes to it, UI toggles exist | Stubbed — logs to console only, no provider (Twilio etc.) |
| **Push Notifications** | DB schema (`channel_push`), UI toggle with "Coming Soon" | No service worker, no FCM/Web Push, no push channel class |
| **Inventory Low-Stock Alerts** | Events fire, email delivery works | SMS stubbed, push not implemented |
| **Profit Margins** | Recipe cost calculation exists, `sellingPrice` field | No margin analytics, no trends, no reporting endpoint |
| **Global Search** | Per-module search (customers, inventory, recipes) | No unified cross-module search bar |
| **Smart Pricing** | Recipe cost calc, `costPerUnit` on ingredients | No auto-recalc on price change, no margin erosion alerts, no what-if |
| **Supplier Management** | `supplier` text field on ingredients table | No supplier entity, no contacts, no price history, no CRUD |
| **Allergen Cross-Check** | Allergen CRUD, ingredient-allergen links, recipe tags | No auto-warning when ordering for allergic customer |
| **WhatsApp (inbound)** | Outbound notifications fully working | No inbound message handling, no message templates, no media messages |
| **Webhooks** | PayPal + PayPlus payment webhooks | Not general-purpose (stores can't connect external services) |

---

## Not Started

### Tier 1 — "Why bakers will switch" (Competitive Moats)

#### Supplier Management & Purchase Orders
Bakers spend hours calling suppliers and comparing prices.
- Link ingredients to suppliers (multiple suppliers per ingredient)
- Track supplier price history — "flour went up 15% this month"
- Auto-generate purchase orders from low-stock items or upcoming order needs
- Email/WhatsApp PO to supplier with one tap
- Receive deliveries: scan/confirm what arrived vs. what was ordered

#### Customer Credit / Tab System (חשבון שוטף)
Very common in Israeli bakeries — cafes and restaurants pay monthly.
- Running balance per customer
- Monthly statement generation
- Payment terms (net-30, net-60)
- Overdue alerts
- No tables, no balance tracking, no payment terms exist in code

#### Smart Pricing & Cost Alerts (full version)
Ingredient prices are volatile.
- Automatic recipe cost recalculation when ingredient prices change
- Margin erosion alerts: "Your chocolate croissant margin dropped from 65% to 42%"
- "What-if" pricing: "If flour goes up 10%, here's the impact on all recipes"
- Suggested selling price based on target margin

### Tier 2 — "Why bakers will stay" (Retention & Stickiness)

#### Seasonal Menus & Price Lists (מחירון)
- Create seasonal catalogs (Rosh Hashana, Passover, Shavuot)
- Shareable price list as branded PDF or web link
- Activate/deactivate menus by date range

#### Time Slots & Capacity Planning
Bakeries get overwhelmed on holidays because they can't say no.
- Define pickup/delivery time slots with max capacity per slot
- Production capacity limits per recipe/day
- Auto-close when full, prevents overbooking

#### Order Templates & Quick Reorder
- Save a customer's recurring configuration as a template
- One-click reorder from template
- Template modification tracking

#### Delivery Management
Many small bakeries do their own deliveries.
- Delivery zones with fees
- Route optimization (group nearby deliveries)
- Driver assignment
- Delivery status tracking
- Print delivery manifest sorted by route

### Tier 3 — "Delight features" (Differentiation)

#### Receipt Generation (קבלה)
Invoices exist. Receipts are the missing piece.
- Auto-generate receipts on payment confirmation
- Sequential receipt numbering (legal requirement)
- PDF export with store branding
- Link receipts to invoices and payments
- Integration-ready for Israeli accounting software

#### Waste & Spoilage Tracking
- Log waste events (burned batch, expired ingredients, unsold items)
- Track waste cost over time
- Identify patterns: "You waste 12% of cream every week — order less"
- Shelf-life tracking on inventory items

#### Custom Cake Builder
For bakeries that do custom work.
- Layer/size/flavor/decoration configurator
- Photo reference uploads from customer
- Dynamic pricing based on complexity
- Design approval workflow

### Other Missing Features

- [ ] **Reports & Export** — PDF/Excel bulk export for orders, payments, inventory
- [ ] **Offline Support** — Service worker + local cache for flaky connections
- [ ] **General-Purpose Webhooks** — Let stores connect to external services (accounting software, delivery apps)

---

## Recommended Build Order

| Priority | Feature | Why |
|----------|---------|-----|
| 1st | **Supplier Management + Purchase Orders** | Saves hours/week on procurement. Hard to replicate in WhatsApp/Excel. |
| 2nd | **Customer Credit / Tab System** | Monthly billing pain is real and sticky — once data is in, they won't leave. |
| 3rd | **Smart Pricing & Cost Alerts** | Extends existing cost calc. High value with moderate effort. |
| 4th | **Time Slots & Capacity** | Prevents the holiday meltdown. Seasonal but high-impact. |
| 5th | **Receipt Generation** | Legal requirement in Israel. Builds on existing invoice system. |

---

## Database Migrations

| # | Migration | Description |
|---|-----------|-------------|
| 1 | `001_initial.sql` | Core schema: users, customers, ingredients, inventory_log, orders, payments |
| 2 | `002_settings.sql` | Units, unit_categories, groups, notification_preferences, ingredient_groups |
| 3 | `003_default_allergens.sql` | Seeds default allergens |
| 4 | `004_inventory_log_price.sql` | Adds `price_paid` to inventory_log |
| 5 | `005_package_size.sql` | Adds `package_size` to ingredients |
| 6 | `006_google_auth.sql` | Adds `google_id` to users, makes `password_hash` nullable |
| 7 | `007_order_number.sql` | Auto-incrementing `order_number` sequence (starts at 100000001) |
| 8 | `008_stores.sql` | Multi-tenancy: stores, users_stores, store_invitations; store_id FK on all tables |
| 9 | `009_invitation_only.sql` | Nullable store_id in invitations (create-store type), OWNER role |
| 10 | `010_admin_role.sql` | `is_admin` on users, `admin_audit_log` table |
| 11 | `011_admin_module.sql` | `disabled_at` on users, `revoked_at` on invitations |
| 12 | `012_audit_log_bodies.sql` | (Superseded) Request/response body columns |
| 13 | `013_split_audit_log_bodies.sql` | Splits bodies into separate tables |
| 14 | `014_audit_log_cascade.sql` | Cascade deletes for audit log bodies |
| 15a | `015_user_onboarding.sql` | `onboarding_completed_at` on users |
| 15b | `015_recurring_group.sql` | Recurring order group support |
| 16 | `016_loyalty.sql` | Loyalty config, transactions ledger, customer points |
| 17 | `017_production_batches.sql` | Production batches, batch-order links, prep items |
| 18 | `018_order_status_integer.sql` | Numeric order status enum |
| 19 | `019_uuid_to_serial.sql` | UUID to serial ID migration |
| 20 | `020_fix_serial_defaults.sql` | Fix serial default values |
| 21a | `021_customer_loyalty_enabled.sql` | Customer loyalty enabled flag |
| 21b | `021_rename_groups_to_allergens.sql` | Rename groups to allergens |
| 21c | `021_user_language.sql` | User language preference |
| 22 | `022_customer_loyalty_tier.sql` | Customer loyalty tier |
| 23 | `023_recipe_tags.sql` | Recipe tags for dietary labels |
| 24 | `024_whatsapp.sql` | WhatsApp config table, notification preference column |
| 25 | `025_store_theme.sql` | Store theme column |
| 26 | `026_invoices.sql` | Invoices table, invoice_counters |
| 27 | `027_invoice_order_number.sql` | Backfill order display numbers |
| 28a | `028_auto_invoice_settings.sql` | Auto-generate invoice/credit note flags |
| 28b | `028_loyalty_enhancements.sql` | Loyalty tier enhancements |
| 29 | `029_subscription_tiers.sql` | Plans table, store_subscriptions, subscription_events |
| 30 | `030_subscription_billing.sql` | Subscription payments, billing enhancements |
| 31 | `031_drop_plan_name_he.sql` | Remove Hebrew plan names |
| 32 | `032_payment_integration.sql` | Checkout sessions, payment provider fields |
| 33 | `033_password_reset_tokens.sql` | Password reset tokens |
| 34 | `034_storefront.sql` | Store slugs, `storefront_enabled` flag, PayPal payment method, payment `reference` column |
| 35 | `035_order_approval.sql` | Order approval flow: PENDING_APPROVAL/CANCELLED/CANCELLATION_REQUESTED statuses, `source`/`cancellation_reason`/`previous_status` columns, `order_notifications` table |
| 36 | `036_customer_identity.sql` | Rename `customers` → `customer_stores`, global `customers` identity table with Google ID |
| 37 | `037_customer_profile_fields.sql` | Split `name` into `first_name`/`last_name`, add `phone` to customers |
| 38 | `038_store_branding.sql` | Add `logo_url`, `banner_url`, `description` to stores |
| 39 | `039_store_apply_theme_to_app.sql` | Add `apply_theme_to_app` boolean toggle to stores |
| 40 | `040_recipe_categories.sql` | Create `recipe_categories` table (per-store, unique name) |
| 41 | `041_store_categories.sql` | Add `category_subject`/`category_sub_subject` to stores |
| 42 | `042_english_translations.sql` | Add `name_en`/`description_en` to stores, `name_en` to categories/allergens, backfill allergen translations |
| 43 | `043_english_translations_v2.sql` | Add `address_en` to stores, `name_en` to ingredients |
| 44 | `044_trial_plan.sql` | Dedicated trial plan, migrate trialing subscriptions, `trial_plan_selected` event type |

---

## Known Issues

1. **SMS notifications** — Stubbed (logs to console, no provider configured)
2. **Push notifications** — UI shows "Coming Soon", no backend
3. **MongoDB** — Only used for recipes, could be documented as optional
4. **No CONTRIBUTING.md** for onboarding new developers
