# Baker-Side UX Design

> Complete UX flows for the bakery owner/admin interface.
> Optimized for desktop-first with full mobile support.

---

## Information Architecture

### Main Navigation (Sidebar)

```
Logo: Mise
---
Dashboard
Orders
Recipes
Inventory
Customers
Payments
---
Settings
```

Each section maps to a top-level route. The sidebar remains visible on desktop and collapses to a bottom tab bar on mobile.

### Mobile Bottom Tabs (5 items)

```
Dashboard | Orders | Recipes | Inventory | More
```

"More" expands to: Customers, Payments, Settings.

---

## 1. Dashboard

### Purpose
At-a-glance overview of today's bakery operations. The baker opens this first thing in the morning.

### Layout (Desktop)

```
+--------------------------------------------------+
| Good morning, [Name]          Today: Feb 14, 2026 |
+--------------------------------------------------+
| [StatCard]  [StatCard]  [StatCard]  [StatCard]    |
| Today's     Pending     Low Stock   Revenue       |
| Orders: 12  Orders: 5   Items: 3    Today: 2,450 |
+--------------------------------------------------+
| Today's Orders (Pipeline)    |  Quick Actions     |
| [mini kanban: 3 cols]        |  + New Order       |
|                              |  + New Recipe       |
|                              |  + Log Payment      |
+-----------+------------------+--------------------+
| Recent Activity              |  Low Stock Alerts   |
| - Order #142 marked ready    |  - Flour: 2kg left  |
| - Payment received for #139  |  - Butter: 500g     |
| - New order from Sarah       |  - Eggs: 12 left    |
+------------------------------+--------------------+
```

### StatCards

| Metric | Icon | Trend |
|--------|------|-------|
| Today's Orders | Package | vs. yesterday |
| Pending Orders | Clock | count only |
| Low Stock Items | AlertTriangle | count only |
| Today's Revenue | Coins | vs. yesterday |

### Mobile Layout

- StatCards: 2x2 grid
- Pipeline: horizontal scroll, single row
- Quick Actions: floating action button (FAB) with menu
- Activity and alerts: stacked sections, expandable

---

## 2. Orders

### Overview Page

Two view modes, toggled by the baker:

#### Pipeline View (Default)

Kanban-style board with 4 columns:

```
+----------+----------+----------+----------+
| Received | In Prog. |  Ready   | Delivered|
| (5)      | (3)      | (2)      | (8)      |
+----------+----------+----------+----------+
| [Card]   | [Card]   | [Card]   | [Card]   |
| [Card]   | [Card]   | [Card]   | [Card]   |
| [Card]   |          |          | [Card]   |
| [Card]   |          |          | ...      |
+----------+----------+----------+----------+
```

**Order Card in Pipeline:**
```
+-------------------------------+
| #142  Sarah Cohen             |
| Chocolate Cake x1, Rolls x12 |
| Due: Today 14:00              |
| [Paid]                  [->]  |
+-------------------------------+
```

- Cards are draggable between columns to change status
- Color-coded top border by status
- Quick-action button (`->`) advances to next status
- Click card to open detail view

#### List View

Standard DataTable with columns:
- Order # | Customer | Items | Due Date | Status | Payment | Total | Actions

Sortable by any column. Filters: status, date range, customer, payment status.

### Order Detail Page

```
+--------------------------------------------------+
| <- Back to Orders              [Edit] [Delete]    |
+--------------------------------------------------+
| Order #142                                        |
| Status: [StatusBadge: In Progress]  [Advance ->]  |
+--------------------------------------------------+
| Customer          | Due Date                      |
| Sarah Cohen       | Feb 14, 2026 at 14:00         |
| 054-123-4567      |                               |
+-------------------+-------------------------------+
| Items                                             |
| +-----------------------------------------------+ |
| | Recipe          | Qty | Unit Price | Subtotal  | |
| | Chocolate Cake  | 1   | 180        | 180       | |
| | Dinner Rolls    | 12  | 5          | 60        | |
| +-----------------------------------------------+ |
|                              Total: 240 NIS       |
+--------------------------------------------------+
| Notes                                             |
| "No nuts, dairy-free chocolate for the cake"      |
+--------------------------------------------------+
| Payment                                           |
| Status: [Partial]  Paid: 100 / 240 NIS           |
| [+ Log Payment]                                   |
+--------------------------------------------------+
| Timeline                                          |
| Feb 13 09:00 - Order created                      |
| Feb 13 10:30 - Payment: 100 NIS (cash)            |
| Feb 14 07:00 - Status: In Progress                |
+--------------------------------------------------+
```

### Create/Edit Order Form

```
Customer:       [Search/Select Customer] [+ New]
Due Date:       [DatePicker]
Due Time:       [TimePicker]

Items:
  [Search Recipe] [Qty] [Price]     [Remove]
  [Search Recipe] [Qty] [Price]     [Remove]
  [+ Add Item]

Notes:          [TextArea]

                          Total: [auto-calculated]
                    [Cancel]  [Save Order]
```

- Recipe search with autocomplete
- Price auto-fills from recipe but is editable
- Total auto-calculates
- Customer can be created inline

---

## 3. Recipes

### Overview Page

Grid view (default) or list view toggle.

#### Grid View

```
+---------------+  +---------------+  +---------------+
| [Photo]       |  | [Photo]       |  | [Placeholder] |
| Chocolate     |  | Sourdough     |  | Dinner Rolls  |
| Cake          |  | Bread         |  |               |
| Category:     |  | Category:     |  | Category:     |
| Cakes         |  | Breads        |  | Bread         |
| Cost: 45 NIS  |  | Cost: 12 NIS  |  | Cost: 3 NIS   |
| Price: 180NIS |  | Price: 35 NIS |  | Price: 8 NIS  |
+---------------+  +---------------+  +---------------+
```

- Cards show photo (or category-themed placeholder), name, category, cost, and price
- Click to open detail, hover to show quick edit button
- Filter by category, search by name
- Sort by: name, cost, price, last modified

### Recipe Detail Page

```
+--------------------------------------------------+
| <- Back to Recipes             [Edit] [Delete]    |
+--------------------------------------------------+
| [Photo Gallery]                                   |
| Chocolate Cake                                    |
| Category: Cakes  |  Yield: 1 cake (12 servings)  |
+--------------------------------------------------+
| Description                                       |
| Rich dark chocolate layer cake with ganache...    |
+--------------------------------------------------+
| TABS: [Ingredients] [Steps] [Sub-Recipes] [Cost]  |
+--------------------------------------------------+

--- Ingredients Tab ---
| Ingredient     | Qty  | Unit | Cost/Unit | Total  |
| Dark Chocolate | 300  | g    | 0.08      | 24.00  |
| Butter         | 200  | g    | 0.04      | 8.00   |
| Flour          | 250  | g    | 0.005     | 1.25   |
| ...            |      |      |           |        |
|                       Ingredients Total:  | 42.50  |

--- Steps Tab ---
1. Preheat oven to 180C
2. Melt chocolate and butter together
3. Mix dry ingredients in a separate bowl
...

--- Sub-Recipes Tab ---
| Sub-Recipe       | Used In Step | Cost   |
| Ganache          | Step 7       | 18.00  |
| Chocolate Shards | Decoration   | 5.00   |
                     Sub-Recipe Total: 23.00

--- Cost Tab ---
| Ingredient Cost:    42.50 NIS |
| Sub-Recipe Cost:    23.00 NIS |
| Total Cost:         65.50 NIS |
| Selling Price:     180.00 NIS |
| Margin:            114.50 NIS (63.6%) |
```

### Create/Edit Recipe Form

Multi-section form, single page with sections:

```
Name:           [TextInput]
Category:       [Select: Cakes, Breads, Pastries, Cookies, Custom...]
Description:    [TextArea]
Yield:          [NumberInput] [Unit: servings/pieces/kg]
Photos:         [FileUpload - drag & drop, max 5]

--- Ingredients ---
[Search Ingredient] [Qty] [Unit]     [Remove]
[Search Ingredient] [Qty] [Unit]     [Remove]
[+ Add Ingredient]

--- Steps ---
[1. TextArea]                        [Remove]
[2. TextArea]                        [Remove]
[+ Add Step]

--- Sub-Recipes ---
[Search Recipe]  [Used in step: Select]  [Remove]
[+ Add Sub-Recipe]

--- Pricing ---
Calculated Cost:  65.50 NIS (auto)
Selling Price:    [NumberInput] NIS

                    [Cancel]  [Save Recipe]
```

- Ingredients search links to inventory
- Sub-recipes search links to other recipes
- Cost auto-calculates as ingredients change
- Steps are reorderable (drag handle)

---

## 4. Inventory

### Overview Page

DataTable with real-time stock levels:

```
+--------------------------------------------------+
| Inventory              [+ Add Item]  [Filters v]  |
+--------------------------------------------------+
| [Search...]                                       |
+--------------------------------------------------+
| Name          | Category | Stock | Unit | Status  |
| Flour         | Dry      | 2.0   | kg   | [Low!]  |
| Butter        | Dairy    | 1.5   | kg   | [OK]    |
| Eggs          | Dairy    | 12    | pcs  | [Low!]  |
| Dark Choc.    | Choc.    | 0.8   | kg   | [OK]    |
| Sugar         | Dry      | 5.0   | kg   | [Good]  |
+--------------------------------------------------+
```

Stock status thresholds (configurable per item):
- **Good**: > 2x threshold (green)
- **OK**: > threshold (no color)
- **Low**: <= threshold (warning, amber)
- **Out**: 0 (error, red)

### Inventory Item Detail

```
+--------------------------------------------------+
| <- Back                        [Edit] [Delete]    |
+--------------------------------------------------+
| Flour (All-Purpose)                                |
| Category: Dry Goods                                |
+--------------------------------------------------+
| Current Stock: 2.0 kg                              |
| Low-Stock Threshold: 5.0 kg                        |
| Cost per Unit: 5.00 NIS/kg                         |
| Status: [Low Stock!]                               |
+--------------------------------------------------+
| [+ Add Stock]  [- Use Stock]  [= Adjust]          |
+--------------------------------------------------+
| Stock Log                                          |
| Feb 14 - Used 0.5kg (Order #142)                   |
| Feb 13 - Added 5kg (restock)                       |
| Feb 12 - Used 1.2kg (Order #138)                   |
| Feb 12 - Used 0.3kg (Order #137)                   |
+--------------------------------------------------+
| Used In Recipes                                    |
| - Chocolate Cake (250g)                            |
| - Sourdough Bread (500g)                           |
| - Dinner Rolls (200g)                              |
+--------------------------------------------------+
```

### Add/Adjust Stock Modal

```
+-----------------------------+
| Adjust Stock: Flour         |
+-----------------------------+
| Type:  [Add / Use / Set]    |
| Amount: [NumberInput] kg    |
| Reason: [Select: Restock,  |
|          Order use, Waste,  |
|          Correction, Other] |
| Notes:  [TextInput]         |
+-----------------------------+
|        [Cancel] [Confirm]   |
+-----------------------------+
```

---

## 5. Customers

### Overview Page

DataTable with columns:
- Name | Phone | Email | Orders | Last Order | Total Spent

Search by name or phone. Sort by any column.

### Customer Detail Page

```
+--------------------------------------------------+
| <- Back                        [Edit] [Delete]    |
+--------------------------------------------------+
| Sarah Cohen                                        |
| Phone: 054-123-4567                                |
| Email: sarah@email.com                             |
| Address: 15 Herzl St, Tel Aviv                     |
+--------------------------------------------------+
| Preferences / Notes                                |
| Allergies: Tree nuts                               |
| Favorites: Chocolate Cake, Sourdough               |
| Notes: "Prefers morning deliveries"                |
+--------------------------------------------------+
| TABS: [Order History] [Payments]                   |
+--------------------------------------------------+

--- Order History ---
| Order # | Date     | Items          | Total | Status    |
| #142    | Feb 14   | Choc. Cake x1  | 240   | In Prog.  |
| #128    | Feb 01   | Rolls x24      | 120   | Delivered |
| #115    | Jan 20   | Sourdough x3   | 105   | Delivered |

                              Total Spent: 465 NIS
```

### Create/Edit Customer Form

```
Name:       [TextInput] *
Phone:      [TextInput] *
Email:      [TextInput]
Address:    [TextArea]
Allergies:  [TextInput] (comma-separated or tags)
Favorites:  [Multi-select recipes]
Notes:      [TextArea]

             [Cancel]  [Save Customer]
```

---

## 6. Payments

### Overview Page

DataTable showing all payment transactions:

```
+--------------------------------------------------+
| Payments               [+ Log Payment] [Filters]  |
+--------------------------------------------------+
| Date     | Order # | Customer    | Amount | Method |
| Feb 14   | #142    | Sarah Cohen | 100    | Cash   |
| Feb 13   | #139    | Dan Levi    | 350    | Card   |
| Feb 12   | #138    | Miri Alon   | 85     | Cash   |
+--------------------------------------------------+
```

Filter by: date range, method, customer.

### Log Payment Modal

```
+-------------------------------+
| Log Payment                   |
+-------------------------------+
| Order:    [Search/Select]     |
| Amount:   [NumberInput] NIS   |
| Method:   [Select: Cash,     |
|            Credit Card, Bank  |
|            Transfer, Other]   |
| Date:     [DatePicker]        |
| Notes:    [TextInput]         |
+-------------------------------+
|        [Cancel] [Log Payment] |
+-------------------------------+
```

Selecting an order auto-populates the remaining balance.

---

## 7. Settings

### Sections

```
Settings
├── Profile          (bakery name, logo, contact info)
├── Account          (email, password change)
├── Preferences      (language, currency, timezone)
├── Notifications    (low stock alerts, order alerts)
├── Categories       (manage recipe and inventory categories)
└── Units            (manage measurement units)
```

Each section is a card-based form within the settings page. Navigation between sections via a vertical tab list (desktop) or accordion (mobile).

---

## Global UX Patterns

### Search

- Global search in the top bar: searches across orders, recipes, customers, inventory
- Module-specific search within each DataTable
- Debounced input (300ms) with instant feedback
- Recent searches remembered (last 5)

### Keyboard Shortcuts (Desktop)

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + K` | Open global search |
| `Ctrl/Cmd + N` | New item (context-aware) |
| `Escape` | Close modal / cancel |
| `Ctrl/Cmd + S` | Save form |

### Notifications

- In-app toast notifications for actions (saved, deleted, error)
- Bell icon in top bar with notification badge count
- Notification panel slides from end (right LTR, left RTL)

### Confirmation Dialogs

All destructive actions require confirmation:
```
+-------------------------------------+
| Delete Order #142?                  |
|                                     |
| This action cannot be undone.       |
| The order and its payment records   |
| will be permanently removed.        |
|                                     |
|           [Cancel] [Delete]         |
+-------------------------------------+
```

Delete button uses `danger` variant. Cancel is `secondary`.

---

*All screens follow the layout, typography, spacing, and color patterns defined in the design system.*
