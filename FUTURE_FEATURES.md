# Mise — Future Features Roadmap

> Features that would make bakers switch from WhatsApp groups, paper notebooks, Excel, and generic POS systems to Mise.

---

## Tier 1 — "Why bakers will switch" (Competitive Moats)

### 1. WhatsApp Integration
The single biggest reason bakers won't leave their current workflow. In Israel (and many markets), orders come in via WhatsApp.

- Send order confirmations & status updates via WhatsApp Business API
- Let customers reply to reorder ("same as last time")
- Send payment reminders
- Share the customer order portal link directly in WhatsApp

This alone could be the killer feature. Bakers won't open a new app if their customers are still messaging them on WhatsApp.

### 2. Supplier Management & Purchase Orders
Bakers spend hours calling suppliers and comparing prices:

- Link ingredients to suppliers (multiple suppliers per ingredient)
- Track supplier price history — "flour went up 15% this month"
- Auto-generate purchase orders from low-stock items or upcoming order needs
- Email/WhatsApp PO to supplier with one tap
- Receive deliveries: scan/confirm what arrived vs. what was ordered

### 3. Customer Credit / Tab System (חשבון שוטף)
Very common in Israeli bakeries — cafes and restaurants pay monthly:

- Running balance per customer
- Monthly statement generation
- Payment terms (net-30, net-60)
- Overdue alerts
- This is a bookkeeping nightmare in Excel and a huge pain point

### 4. Smart Pricing & Cost Alerts
Ingredient prices are volatile. Bakers need:

- Automatic recipe cost recalculation when ingredient prices change
- Margin erosion alerts: "Your chocolate croissant margin dropped from 65% to 42%"
- "What-if" pricing: "If flour goes up 10%, here's the impact on all recipes"
- Suggested selling price based on target margin

---

## Tier 2 — "Why bakers will stay" (Retention & Stickiness)

### 5. Seasonal Menus & Price Lists (מחירון)

- Create seasonal catalogs (Rosh Hashana, Passover, Shavuot, weekday vs. weekend)
- Shareable price list as a branded PDF or web link
- Customers can browse and order from it
- Activate/deactivate menus by date range

### 6. Time Slots & Capacity Planning
Bakeries get overwhelmed on holidays because they can't say no:

- Define pickup/delivery time slots with max capacity per slot
- "Friday 10am-12pm: 15 orders max" — auto-closes when full
- Production capacity limits: "I can only bake 50 challahs on Friday"
- Prevents overbooking, which is a major bakery pain point

### 7. Order Templates & Quick Reorder

- Save a customer's recurring configuration as a template ("Cafe X: 20 croissants, 10 baguettes, 5 focaccia")
- One-click reorder from template
- Template modification tracking ("Cafe X increased croissants from 20 to 25 starting January")

### 8. Allergen Cross-Check

- Flag customer allergies in their profile (already has `preferences` JSONB)
- When creating an order, auto-warn: "Customer is allergic to nuts — Pistachio Cake contains nuts"
- Dietary labels on recipes: kosher, vegan, gluten-free, nut-free
- Filter recipes by dietary requirement when building an order

### 9. Delivery Management
Many small bakeries do their own deliveries:

- Delivery zones with fees
- Route optimization (group nearby deliveries)
- Driver assignment (for bakeries with 1-2 drivers)
- Delivery status tracking (picked up → in transit → delivered)
- Print delivery manifest sorted by route

---

## Tier 3 — "Delight features" (Differentiation)

### 10. Receipt Generation (קבלה)
Invoices are already implemented. Receipts are the missing piece:

- Auto-generate receipts on payment confirmation
- Sequential receipt numbering (legal requirement)
- PDF export with store branding
- Link receipts to invoices and payments
- Integration-ready for Israeli accounting software (Hashavshevet, Rivhit, Green Invoice)

### 11. Waste & Spoilage Tracking

- Log waste events (burned batch, expired ingredients, unsold items)
- Track waste cost over time
- Identify patterns: "You waste 12% of cream every week — order less"
- Shelf-life tracking on inventory items

### 12. Loyalty & Customer Engagement

- Points system or punch card ("buy 10 challahs, get 1 free")
- Birthday/anniversary auto-reminders
- Customer segmentation: VIP, regular, new, dormant
- Automated re-engagement: "Haven't seen customer X in 30 days"

### 13. AI Assistant for Admins & Owners
Give store owners and admins an intelligent co-pilot:

- Natural language queries: "How much did I sell this week?", "Which recipes have the lowest margins?"
- Smart suggestions: "You're running low on flour and have 12 orders due Friday — consider reordering"
- Anomaly detection: "Revenue dropped 30% compared to same week last month"
- Order forecasting based on historical patterns and upcoming holidays
- Auto-generated daily/weekly business summaries
- Accessible via a chat-style panel in the app (owners & admins only)

### 14. Custom Cake Builder
For bakeries that do custom work:

- Layer/size/flavor/decoration configurator
- Photo reference uploads from customer
- Dynamic pricing based on complexity
- Design approval workflow (baker sends mockup → customer approves)

---

## Recommended Build Order

| Priority | Feature | Why |
|----------|---------|-----|
| 1st | **Supplier Management + Purchase Orders** | Saves hours/week on procurement. Hard to replicate in WhatsApp/Excel. |
| 2nd | **Customer Credit / Tab System** | The monthly billing pain is real and sticky — once data is in, they won't leave. |
| 3rd | **WhatsApp Integration** | Meets bakers where they are. Removes the "but my customers use WhatsApp" objection. |
| 4th | **Time Slots & Capacity** | Prevents the holiday meltdown. Seasonal but high-impact. |
| 5th | **Invoice Generation** | Legal requirement in Israel. Currently outsourced to separate software. |

The first three can be built on top of existing modules (orders, inventory, customers, payments). WhatsApp requires external API integration (Meta Business API or a provider like Twilio/Green API). The rest build incrementally on top.
