# Customer-Side UX Design

> UX flows for customer-facing features (planned for V3).
> Designed now to inform architecture and API decisions.

---

## Overview

The customer-facing side is a **public web page** per bakery, accessible via a link (e.g., `mise.app/bakery-name` or a custom domain). No app download required. Mobile-first design since most customers will access via phone (WhatsApp link, Instagram bio, etc.).

---

## 1. Bakery Storefront Page

### Purpose
Public landing page for the bakery. Shows the menu, bakery info, and allows ordering.

### Layout (Mobile-First)

```
+----------------------------------+
| [Bakery Logo]                    |
| Bakery Name                     |
| "Fresh baked daily in Tel Aviv" |
| Open: Sun-Thu 7:00-18:00        |
| [Call] [WhatsApp] [Map]         |
+----------------------------------+
| [Tab: Menu] [Tab: About]        |
+----------------------------------+

--- Menu Tab ---

| Category Filter Pills:           |
| [All] [Cakes] [Breads] [Pastry] |
+----------------------------------+
| +------------------------------+ |
| | [Photo]                      | |
| | Chocolate Cake               | |
| | Rich dark chocolate layers   | |
| | 180 NIS                      | |
| | [Add to Order]               | |
| +------------------------------+ |
|                                  |
| +------------------------------+ |
| | [Photo]                      | |
| | Sourdough Bread              | |
| | Artisan sourdough, 24hr...   | |
| | 35 NIS                       | |
| | [Add to Order]               | |
| +------------------------------+ |

--- About Tab ---
| About the bakery                |
| Location map (embedded)         |
| Hours of operation              |
| Contact details                 |
```

### Design Notes

- Hero area uses the bakery's brand color (set by the baker in settings)
- Menu items use recipe photos uploaded by the baker
- Items without photos get a styled placeholder with the category icon
- Category filter is a horizontal scrollable pill bar
- Sticky header with bakery name on scroll

---

## 2. Menu Item Detail

Tapping an item opens a detail sheet (bottom sheet on mobile, modal on desktop):

```
+----------------------------------+
| [Photo - full width]             |
+----------------------------------+
| Chocolate Cake                   |
| 180 NIS                         |
+----------------------------------+
| Rich dark chocolate layer cake   |
| with ganache frosting and        |
| chocolate shards.                |
+----------------------------------+
| Allergens: Dairy, Eggs, Gluten   |
+----------------------------------+
| Quantity:  [- 1 +]               |
| Notes:    [TextInput]            |
|           "Any special requests" |
+----------------------------------+
| [Add to Order - 180 NIS]        |
+----------------------------------+
```

- Allergen info auto-generated from recipe ingredients
- Quantity selector with increment/decrement buttons
- Notes field for customization requests
- Large, thumb-friendly "Add to Order" button at bottom

---

## 3. Order Cart

Accessible via a floating cart button (badge showing item count):

```
+----------------------------------+
| Your Order                 [X]   |
+----------------------------------+
| Chocolate Cake        x1   180   |
|   "No nuts please"          [-]  |
| Sourdough Bread       x2    70   |
|                              [-] |
+----------------------------------+
| Subtotal:              250 NIS   |
+----------------------------------+
| Pickup Date: [DatePicker]        |
| Pickup Time: [Select: morning    |
|               slots]             |
+----------------------------------+
| Your Details:                    |
| Name:  [TextInput] *            |
| Phone: [TextInput] *            |
| Email: [TextInput]              |
+----------------------------------+
| Notes: [TextArea]               |
|        "Delivery instructions"  |
+----------------------------------+
| [Place Order - 250 NIS]         |
+----------------------------------+
```

### Flow

1. Customer fills in contact info
2. Selects preferred pickup/delivery date and time
3. Taps "Place Order"
4. Confirmation screen appears
5. Order is created in the baker's system with status "Received"

### Validation

- Name and phone are required
- Date must be at least 1 day in advance (configurable by baker)
- Available time slots defined by baker in settings
- Minimum order amount (optional, configurable)

---

## 4. Order Confirmation

```
+----------------------------------+
| [Checkmark Icon]                 |
|                                  |
| Order Placed!                    |
| Order #142                       |
|                                  |
| We received your order and       |
| will confirm it shortly.         |
|                                  |
| Pickup: Feb 15, 2026             |
|         10:00 - 12:00            |
|                                  |
| You'll receive updates via       |
| WhatsApp at 054-123-4567         |
|                                  |
| [Track Your Order]              |
| [Back to Menu]                  |
+----------------------------------+
```

---

## 5. Order Tracking

Customer can track order status via a link (sent via WhatsApp/SMS):

```
+----------------------------------+
| Order #142                       |
| Placed: Feb 14, 2026             |
+----------------------------------+
| Status Timeline:                 |
|                                  |
|  [*] Received       Feb 14 09:00 |
|   |                              |
|  [*] Confirmed      Feb 14 09:30 |
|   |                              |
|  [*] In Progress    Feb 15 06:00 |
|   |                              |
|  [ ] Ready                       |
|   |                              |
|  [ ] Picked Up                   |
|                                  |
+----------------------------------+
| Items:                           |
| - Chocolate Cake x1              |
| - Sourdough Bread x2             |
|                                  |
| Total: 250 NIS                   |
| Payment: Unpaid                  |
+----------------------------------+
| Questions? Contact the bakery:   |
| [Call] [WhatsApp]                |
+----------------------------------+
```

- Vertical timeline showing completed steps (filled circles) and upcoming steps (empty circles)
- Status updates appear in real-time when the baker advances the order
- No login required -- accessed via a unique link token

---

## 6. Customer Authentication (Optional)

For returning customers who want to see order history:

### Light Authentication

- Phone number + OTP (one-time password via SMS)
- No password to remember
- Creates/links to customer profile in baker's system

### Authenticated Customer View

```
+----------------------------------+
| Hi, Sarah!                       |
| [Your Orders] [Favorites] [Info] |
+----------------------------------+

--- Your Orders ---
| #142 | Feb 14 | In Progress | 250  |
| #128 | Feb 01 | Delivered   | 120  |
| #115 | Jan 20 | Delivered   | 105  |

--- Favorites ---
| [Reorder: Chocolate Cake]        |
| [Reorder: Sourdough x3]         |

--- Your Info ---
| Name: Sarah Cohen                |
| Phone: 054-123-4567              |
| Allergies: Tree nuts             |
| [Edit Info]                      |
```

---

## Design Principles for Customer Side

### Visual Identity

- Uses the baker's brand colors (primary color configurable)
- Falls back to Mise warm palette defaults
- Bakery logo displayed prominently
- Photo-forward: food photography is the hero element

### Performance

- Lightweight -- minimal JS for fast load on mobile networks
- Images lazy-loaded and optimized (WebP with fallbacks)
- Works offline-ish: menu loads from cache, orders require network

### Accessibility

- Large touch targets (48px minimum)
- High contrast text over images (gradient overlays)
- Screen reader friendly item cards
- Language matches bakery setting (Hebrew or English)

### Communication

- WhatsApp integration as primary communication channel
- SMS fallback for order updates
- No email spam -- email is optional, only for receipts if provided

---

## Customer Side Architecture Impact

This design influences the API to expose:

1. **Public bakery profile endpoint** (no auth)
2. **Public menu endpoint** (no auth, returns published recipes with prices)
3. **Create order endpoint** (no auth, requires contact info)
4. **Order status endpoint** (token-based, no auth)
5. **OTP auth endpoints** (phone number + verify code)
6. **Customer profile endpoints** (authenticated)

The backend should be designed with these public endpoints in mind from V1, even if the customer-facing frontend is built in V3.

---

*This document ensures the customer experience is considered during architecture and API design, preventing costly refactoring later.*
