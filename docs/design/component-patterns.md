# Mise Component Patterns

> How every component type should look and behave in Mise.
> Built on top of shadcn/ui with bakery-themed defaults.

---

## Guiding Principles

1. **Composition over configuration** -- complex UI is built by nesting simple components
2. **Props describe variants, not styles** -- no raw className overrides
3. **Single File Components** -- one `.tsx` file per component
4. **Consistent states** -- every interactive component handles: default, hover, focus, active, disabled, loading
5. **RTL-aware** -- all components work in both LTR and RTL without modification

---

## Buttons

### Variants

| Variant | Background | Text | Border | Use Case |
|---------|-----------|------|--------|----------|
| `primary` | `primary-500` | `white` | none | Main actions: Save, Create, Confirm |
| `secondary` | `primary-100` | `primary-700` | `primary-200` | Secondary actions: Cancel, Back |
| `ghost` | `transparent` | `primary-700` | none | Tertiary actions, toolbar buttons |
| `danger` | `accent-500` | `white` | none | Destructive: Delete, Remove |
| `link` | `transparent` | `primary-500` | none | Inline text actions |

### Sizes

| Size | Height | Padding (horizontal) | Font Size | Icon Size |
|------|--------|---------------------|-----------|-----------|
| `sm` | 32px | 12px | 14px | 16px |
| `md` | 40px | 16px | 14px | 18px |
| `lg` | 48px | 24px | 16px | 20px |

### States

- **Hover**: Shift to next darker shade (e.g., `primary-500` -> `primary-600`)
- **Focus**: 2px ring in `primary-500` with 2px offset
- **Active**: Scale down to 0.98
- **Disabled**: 50% opacity, `cursor: not-allowed`
- **Loading**: Spinner replaces icon, text remains, pointer events disabled

### Props

```tsx
interface ButtonProps {
  variant: 'primary' | 'secondary' | 'ghost' | 'danger' | 'link';
  size: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;       // Icon before text (after text in RTL)
  iconPosition?: 'start' | 'end';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}
```

---

## Cards

### Variants

| Variant | Background | Border | Shadow | Use Case |
|---------|-----------|--------|--------|----------|
| `default` | `white` | `neutral-200` | `shadow-sm` | Standard content container |
| `elevated` | `white` | none | `shadow-md` | Featured content, dashboard stats |
| `flat` | `primary-50` | none | none | Subtle grouping, nested content |
| `interactive` | `white` | `neutral-200` | `shadow-sm` -> `shadow-md` on hover | Clickable cards, list items |

### Structure

```
Card
  CardHeader          (optional: title + actions row)
    CardTitle         (h3 typography)
    CardActions       (button group, top-right / top-left in RTL)
  CardContent         (main content area)
  CardFooter          (optional: bottom actions or metadata)
```

### Specs

- Padding: `space-6` (24px)
- Border radius: `radius-lg` (12px)
- Gap between header/content/footer: `space-4` (16px)

---

## Modals / Dialogs

### Sizes

| Size | Width | Use Case |
|------|-------|----------|
| `sm` | 400px | Confirmations, alerts |
| `md` | 560px | Forms, detail views |
| `lg` | 720px | Complex forms, recipe editing |
| `full` | 90vw / 90vh | Full-screen editors, image preview |

### Variants

| Variant | Has Footer Actions | Use Case |
|---------|-------------------|----------|
| `alert` | OK button only | Information display |
| `confirm` | Cancel + Confirm | Destructive action confirmation |
| `form` | Cancel + Save | Data entry |
| `custom` | Any children | Custom content |

### Structure

```
ModalOverlay          (backdrop: black at 50% opacity)
  Modal
    ModalHeader       (title + close button)
    ModalContent      (scrollable content area)
    ModalFooter       (action buttons, end-aligned)
```

### Behavior

- Closes on Escape key
- Closes on overlay click (configurable)
- Focus trapped within modal
- Scroll locked on body when open
- Entrance: fade + scale from 0.95
- Exit: fade + scale to 0.95
- Duration: 200ms

---

## Forms

### Field Layout

Every form field follows a consistent vertical stack:

```
Label                 (semibold, body-sm)
Input / Select / etc. (the control)
HintText              (optional, muted caption)
ErrorText             (conditional, error color, caption)
```

Gap between label and control: `space-1` (4px)
Gap between control and hint/error: `space-1` (4px)
Gap between form fields: `space-4` (16px)

### Input Fields

| State | Border | Background | Text |
|-------|--------|-----------|------|
| Default | `neutral-200` | `white` | `neutral-900` |
| Hover | `neutral-300` | `white` | `neutral-900` |
| Focus | `primary-500` (2px) | `white` | `neutral-900` |
| Error | `error` | `error-light` | `neutral-900` |
| Disabled | `neutral-200` | `neutral-100` | `neutral-400` |

### Specs

- Height: 40px (md), 32px (sm), 48px (lg)
- Padding: 12px horizontal
- Border: 1px, `radius-md`
- Font: `body` size
- Placeholder: `neutral-400`

### Form Components

| Component | Description |
|-----------|-------------|
| `TextInput` | Single-line text, supports prefix/suffix icons |
| `TextArea` | Multi-line text, auto-resize option |
| `Select` | Dropdown selection, supports search |
| `Checkbox` | Boolean toggle with label |
| `Toggle` | Switch for on/off settings |
| `DatePicker` | Calendar popup for date selection |
| `NumberInput` | Numeric input with +/- buttons |
| `FileUpload` | Drag-and-drop file upload zone |

---

## Tables (DataTable)

### Structure

```
DataTable
  TableToolbar        (search, filters, bulk actions)
  TableHeader         (column names, sort indicators)
  TableBody
    TableRow          (alternating row backgrounds)
      TableCell       (text-aligned per content type)
  TablePagination     (page size selector, prev/next, page indicator)
```

### Specs

- Row height: 48px minimum
- Header: `neutral-100` background, `body-sm` semibold text
- Alternating rows: `white` / `neutral-50`
- Row hover: `primary-50`
- Cell padding: `space-3` vertical, `space-4` horizontal
- Sort indicator: chevron icon next to sortable column headers
- Selected row: `primary-100` background with `primary-500` left border (right border in RTL)

### Column Alignment

| Content Type | Alignment |
|-------------|-----------|
| Text | Start (left LTR, right RTL) |
| Numbers | End (right LTR, left RTL) |
| Currency | End, monospace font |
| Status | Center |
| Actions | End |

### Features

- Sortable columns (click header to toggle asc/desc)
- Filterable (toolbar filter chips)
- Searchable (search input in toolbar)
- Selectable rows (checkbox column)
- Bulk actions (appear when rows selected)
- Responsive: horizontal scroll on mobile, or card view below `md`

---

## Navigation

### Sidebar (Desktop)

- Width: 260px expanded, 64px collapsed
- Background: `primary-900` (dark)
- Text: `primary-200` default, `white` active
- Active item: `primary-100` text with `primary-500` start border (4px)
- Hover: `primary-800` background
- Logo at top, user menu at bottom
- Toggle button to collapse/expand
- Grouped items with section labels (`overline` typography)

### Top Bar

- Height: 64px
- Background: `white`
- Bottom border: `neutral-200`
- Contains: page title (start), search bar (center), notifications + user avatar (end)

### Mobile Navigation

- Bottom tab bar (5 max items)
- Height: 56px + safe area
- Active tab: `primary-500` icon + label
- Inactive: `neutral-400` icon + label
- Background: `white` with top border `neutral-200`

### Breadcrumbs

- Separator: `/` character
- Current page: `neutral-900` semibold
- Parent pages: `primary-500` link
- Max depth displayed: 3 (collapse middle with `...`)

---

## Status Badges

### Structure

Round pill with colored dot + text.

```
[*  Status Text ]
```

### Specs

- Height: 24px
- Padding: 4px 10px
- Font: `caption` (12px), `medium` weight
- Border radius: `radius-full`
- Dot: 6px circle, start-aligned

### Variants

Map to semantic colors defined in the design system for each domain (Order Status, Payment Status, Inventory Stock Level).

---

## Stat Cards

Used on the dashboard for key metrics.

### Structure

```
StatCard
  StatLabel           (caption, muted)
  StatValue           (h2, monospace for numbers)
  StatTrend           (optional: up/down arrow + percentage)
  StatChart           (optional: mini sparkline)
```

### Specs

- Card variant: `elevated`
- Min width: 200px
- Padding: `space-6`
- Trend up: `success` color with up arrow
- Trend down: `accent-500` color with down arrow

---

## Empty States

Shown when a list or section has no data yet.

### Structure

```
EmptyState
  Illustration        (simple SVG, bakery-themed)
  Title               (h3)
  Description         (body-sm, muted)
  Action              (primary button)
```

### Specs

- Centered vertically and horizontally
- Max width: 400px
- Illustration: 120px height
- Spacing between elements: `space-4`

### Example Illustrations

- Empty orders: bread basket illustration
- Empty recipes: recipe book illustration
- Empty customers: person outline
- Empty inventory: empty shelf illustration

---

## Toast Notifications

### Variants

| Variant | Icon | Border Color | Background |
|---------|------|-------------|-----------|
| `success` | Checkmark | `success` | `success-light` |
| `error` | X circle | `error` | `error-light` |
| `warning` | Alert triangle | `warning` | `warning-light` |
| `info` | Info circle | `info` | `info-light` |

### Specs

- Position: top-end (top-right LTR, top-left RTL)
- Width: 360px max
- Duration: 5s default, persistent for errors
- Entrance: slide from end + fade
- Stacking: newest on top, max 3 visible

---

## Loading States

### Spinner

- Size: 16px (inline), 24px (button), 40px (page)
- Color: `primary-500` (or `white` on dark backgrounds)
- Animation: 800ms rotation

### Skeleton

- Background: `neutral-200` with `neutral-100` shimmer
- Border radius matches the element being loaded
- Animation: 1.5s shimmer sweep

### Page Loading

- Full-page centered spinner with Mise logo (subtle pulse animation)

---

*All components are single-file `.tsx` implementations using Tailwind classes mapped to the design tokens above.*
