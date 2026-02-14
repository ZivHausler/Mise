# Responsive Strategy

> How Mise adapts from desktop to tablet to mobile.
> Mobile-friendly, desktop-optimized.

---

## Breakpoint System

| Token | Min Width | Target Devices | Primary Use |
|-------|-----------|---------------|-------------|
| `mobile` | 0px | Phones (320-639px) | Single column, bottom nav |
| `sm` | 640px | Large phones landscape | Minor adjustments |
| `md` | 768px | Tablets portrait | 2-column where needed |
| `lg` | 1024px | Tablets landscape, small laptops | Sidebar appears |
| `xl` | 1280px | Desktops | Full layout |
| `2xl` | 1536px | Large desktops | Max content width |

### Design Targets

Primary design mockups and testing at three widths:
- **375px** -- iPhone SE / small Android (mobile baseline)
- **768px** -- iPad portrait (tablet baseline)
- **1280px** -- Standard laptop/desktop (desktop baseline)

---

## Navigation Adaptation

### Desktop (lg+)

```
+--------+-------------------------------------------+
| Side   |  Top Bar                                  |
| bar    +-------------------------------------------+
| 260px  |                                           |
|        |  Content Area                             |
| Logo   |  (max-width: 1200px, centered)            |
| Nav    |                                           |
| items  |                                           |
| User   |                                           |
+--------+-------------------------------------------+
```

- Sidebar: 260px, collapsible to 64px (icons only)
- Content area: fluid, max-width 1200px, centered with auto margins
- Top bar: page title, search, notifications, user avatar

### Tablet (md - lg)

```
+-------------------------------------------+
| Top Bar (hamburger menu)                  |
+-------------------------------------------+
|                                           |
| Content Area                              |
| (full width with padding)                 |
|                                           |
+-------------------------------------------+
```

- Sidebar: hidden by default, opens as overlay drawer from start edge
- Hamburger menu in top bar triggers sidebar drawer
- Content uses full width with 24px padding

### Mobile (< md)

```
+-------------------------------------------+
| Top Bar (compact)                         |
+-------------------------------------------+
|                                           |
| Content Area                              |
| (full width, 16px padding)               |
|                                           |
|                                           |
+-------------------------------------------+
| Bottom Tab Bar                            |
| [Dash] [Orders] [Recipes] [Inv.] [More]  |
+-------------------------------------------+
```

- No sidebar -- replaced by bottom tab bar
- Top bar simplified: logo + search icon + notification bell
- Content full width with 16px padding
- Bottom tab bar: 5 items, 56px height + safe area inset

---

## Layout Patterns Per Module

### Dashboard

| Element | Mobile | Tablet | Desktop |
|---------|--------|--------|---------|
| Stat Cards | 2x2 grid | 4 in row | 4 in row |
| Pipeline | Horizontal scroll | 2-column | 4-column |
| Quick Actions | FAB button | Button row | Sidebar card |
| Activity | Full width list | 2-column with alerts | 2-column with alerts |

### Orders (Pipeline View)

| Breakpoint | Behavior |
|-----------|----------|
| Desktop | 4 columns visible, cards side by side |
| Tablet | 2 columns visible, horizontal scroll for others |
| Mobile | 1 column visible, horizontal swipe between columns, tab bar to jump |

### Orders (List View) / All DataTables

| Breakpoint | Behavior |
|-----------|----------|
| Desktop | Full table with all columns |
| Tablet | Table with key columns, horizontal scroll for extras |
| Mobile | **Card list view** -- each row becomes a card |

#### Mobile Card View for Tables

```
+----------------------------------+
| Order #142                       |
| Sarah Cohen                      |
| Chocolate Cake x1, Rolls x12    |
| Due: Today 14:00                 |
| [In Progress]        240 NIS    |
+----------------------------------+
```

Each card shows the most important fields. Tap to see full details.

### Recipes (Grid View)

| Breakpoint | Columns |
|-----------|---------|
| Desktop | 3-4 cards per row |
| Tablet | 2-3 cards per row |
| Mobile | 1-2 cards per row (compact cards) |

### Forms

| Breakpoint | Behavior |
|-----------|----------|
| Desktop | 2-column layout for short fields (name + phone side by side) |
| Tablet | 2-column where it fits, single for long fields |
| Mobile | Single column, full-width fields |

Forms always use full-width submit buttons on mobile.

### Modals

| Size | Desktop | Tablet | Mobile |
|------|---------|--------|--------|
| `sm` | 400px centered | 400px centered | Full-width bottom sheet |
| `md` | 560px centered | 560px centered | Full-width bottom sheet |
| `lg` | 720px centered | 90% width centered | Full-screen |
| `full` | 90vw centered | 95% width | Full-screen |

On mobile, all modals become **bottom sheets** that slide up from the bottom, or full-screen for complex forms.

---

## Touch Optimization

### Touch Targets

- Minimum size: **44x44px** for all interactive elements
- Buttons on mobile: 48px height minimum
- Table rows: 48px height minimum, full-row tap area
- List items: 56px height minimum

### Gestures

| Gesture | Action |
|---------|--------|
| Swipe right on order card | Advance status |
| Swipe left on order card | Options menu (edit, delete) |
| Pull down on list | Refresh data |
| Long press on item | Select for bulk actions |

### Thumb Zone

On mobile, primary actions are placed in the **bottom third** of the screen (easy thumb reach):
- FAB (floating action button) bottom-end corner
- Bottom sheet actions at bottom
- Form submit buttons at bottom, sticky

---

## Content Priority

On smaller screens, content is progressively disclosed:

### What stays visible

- Primary identifiers (order number, customer name, recipe name)
- Current status
- Key metric (price, quantity, due date)
- Primary action button

### What gets hidden / collapsed

- Secondary details (address, email, notes)
- Full timestamps (show relative: "2 hours ago")
- Statistics and trends
- Bulk action toolbars (appear on selection)
- Column data in tables (switch to card view)

### Progressive Disclosure Patterns

- **Expandable sections**: tap to show more details
- **Detail pages**: tap card to navigate to full detail view
- **Bottom sheets**: contextual info appears as a sheet
- **Tabs**: instead of showing everything, organize into tabs

---

## Typography Scaling

| Token | Desktop | Mobile |
|-------|---------|--------|
| `display` | 36px | 28px |
| `h1` | 30px | 24px |
| `h2` | 24px | 20px |
| `h3` | 20px | 18px |
| `body` | 16px | 16px (no change) |
| `body-sm` | 14px | 14px (no change) |
| `caption` | 12px | 12px (no change) |

Body text and smaller should not scale down on mobile -- they are already at the minimum comfortable reading size.

---

## Responsive Utilities

### CSS Classes (Tailwind)

```
.hide-mobile     → hidden below md
.hide-desktop    → hidden above lg
.mobile-only     → visible only below md
.desktop-only    → visible only above lg
```

### Component Props

Components accept responsive behavior through dedicated props rather than breakpoint-specific className overrides:

```tsx
<DataTable
  mobileView="cards"     // "cards" | "scroll"
  columns={columns}
  data={data}
/>

<Modal
  mobilePresentation="sheet"  // "sheet" | "fullscreen" | "modal"
  size="md"
/>
```

---

## Performance Considerations

- Images: use `srcset` and `sizes` for responsive images
- Lazy load below-the-fold content on mobile
- Reduce animation complexity on mobile (`prefers-reduced-motion`)
- Virtualize long lists (orders, inventory) on all breakpoints
- Skeleton loading for perceived performance

---

*Mobile is not an afterthought -- it is a primary usage context for bakers checking orders on their phone in the kitchen.*
