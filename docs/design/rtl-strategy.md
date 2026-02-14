# RTL/LTR Strategy

> Hebrew RTL-first with full English LTR support.
> Bidirectional text handling for the Mise bakery app.

---

## Principles

1. **RTL-first**: Hebrew is the default language and the primary design direction
2. **Logical properties**: Use CSS logical properties (`start`/`end`) instead of physical (`left`/`right`)
3. **Automatic mirroring**: Layout flips entirely when switching to English LTR
4. **Selective exceptions**: Some elements do NOT mirror (logos, phone numbers, media controls)
5. **No separate stylesheets**: One codebase, direction determined by `dir` attribute

---

## Implementation Strategy

### HTML Setup

```html
<!-- Hebrew (default) -->
<html lang="he" dir="rtl">

<!-- English -->
<html lang="en" dir="ltr">
```

The `dir` attribute is set dynamically based on user language preference, stored in settings.

### Tailwind CSS Configuration

Tailwind v3+ supports logical properties and RTL via the `rtl:` and `ltr:` variants. Combined with the `dir` attribute on `<html>`, this enables automatic mirroring.

```tsx
// Instead of:
<div className="ml-4 pl-6 text-left border-l-2">

// Use:
<div className="ms-4 ps-6 text-start border-s-2">
```

### Logical Property Mapping

| Physical (avoid) | Logical (use) | RTL behavior |
|------------------|---------------|-------------|
| `margin-left` | `margin-inline-start` / `ms-` | Becomes margin-right |
| `margin-right` | `margin-inline-end` / `me-` | Becomes margin-left |
| `padding-left` | `padding-inline-start` / `ps-` | Becomes padding-right |
| `padding-right` | `padding-inline-end` / `pe-` | Becomes padding-left |
| `text-align: left` | `text-align: start` / `text-start` | Becomes right-aligned |
| `text-align: right` | `text-align: end` / `text-end` | Becomes left-aligned |
| `border-left` | `border-inline-start` / `border-s-` | Becomes border-right |
| `float: left` | `float: inline-start` | Becomes float right |
| `left: 0` | `inset-inline-start: 0` / `start-0` | Becomes right: 0 |
| `right: 0` | `inset-inline-end: 0` / `end-0` | Becomes left: 0 |

### Flexbox and Grid

Flexbox and CSS Grid automatically reverse in RTL when using `dir="rtl"`:

```tsx
// This row of buttons automatically mirrors in RTL:
<div className="flex gap-2">
  <Button>Cancel</Button>
  <Button variant="primary">Save</Button>
</div>
// LTR: [Cancel] [Save]  (Save on right)
// RTL: [Save] [Cancel]  (Save on left / start)
```

No extra RTL classes needed for flex/grid direction.

---

## What Mirrors

### Layout Elements

| Element | Mirrors? | Notes |
|---------|---------|-------|
| Sidebar | Yes | Moves from left to right side |
| Navigation items | Yes | Text and icons flow RTL |
| Content alignment | Yes | Text starts from right |
| Tables | Yes | Columns read right to left |
| Form labels | Yes | Labels above/end-aligned |
| Breadcrumbs | Yes | Right to left with reversed separators |
| Pagination | Yes | Previous on right, Next on left |
| Search icon position | Yes | Moves to end of input |
| Toast position | Yes | Appears top-left instead of top-right |
| Notification panel | Yes | Slides from left instead of right |

### Icons

| Icon Type | Mirrors? | Examples |
|-----------|---------|----------|
| Directional arrows | Yes | Back arrow, forward arrow, chevrons |
| Navigation icons | Yes | Menu drawer direction |
| Progress indicators | No | Checkmarks, loading spinners |
| Media controls | No | Play, pause, volume |
| Universal symbols | No | Search, settings, trash, heart |
| Brand logos | No | Mise logo stays as-is |
| External platform icons | No | WhatsApp, email icons |

### Mirroring with CSS

```css
/* For icons that need mirroring */
[dir="rtl"] .icon-mirror {
  transform: scaleX(-1);
}
```

Or with Tailwind:
```tsx
<ChevronIcon className="rtl:scale-x-[-1]" />
```

---

## What Does NOT Mirror

### Numbers and Dates

```
// Numbers are always LTR, even in Hebrew context
Price: 180 NIS  →  ₪180  (Hebrew: ₪180)

// Dates
Feb 14, 2026  →  14 בפברואר 2026

// Phone numbers are always LTR
054-123-4567 (same in both directions)
```

Use `dir="ltr"` on inline elements containing numbers and phone numbers when embedded in RTL text:

```tsx
<span dir="ltr" className="inline-block">054-123-4567</span>
```

### URLs and Email Addresses

Always displayed LTR:
```tsx
<span dir="ltr">sarah@email.com</span>
```

### Media and Charts

- Chart axes remain in their standard orientation (left-to-right for time)
- Video/audio progress bars are not mirrored
- Image galleries scroll in the same direction

---

## Bidirectional Text Handling

### Mixed Content

Hebrew text with English words (common in bakery context -- recipe names, ingredient brands):

```
// Hebrew paragraph with English brand name
"השתמשו ב-Valrhona שוקולד לתוצאה הטובה ביותר"
```

The browser handles this automatically with the Unicode Bidirectional Algorithm (UBi-Di). Ensure:

1. Set `dir` on the container element
2. Use `<bdi>` tag for user-generated content that might be in either language
3. Use `dir="auto"` on input fields to auto-detect direction

```tsx
// For user-generated content where language is unknown:
<bdi>{customerName}</bdi>

// For input fields:
<input dir="auto" />
```

### Form Inputs

| Input Type | Direction | Notes |
|-----------|-----------|-------|
| Name (Hebrew) | RTL | Follows page direction |
| Name (English) | LTR | `dir="auto"` detects |
| Email | LTR | Always LTR |
| Phone | LTR | Always LTR |
| Address (Hebrew) | RTL | Follows page direction |
| Recipe name | auto | Could be either language |
| Notes/Description | auto | Could be mixed |
| Number fields | LTR | Numbers are LTR |
| Search | auto | User decides |

### Implementation for Form Inputs

```tsx
// Inputs that should auto-detect:
<TextInput dir="auto" />

// Inputs that are always LTR:
<TextInput dir="ltr" type="email" />
<TextInput dir="ltr" type="tel" />
<NumberInput dir="ltr" />
```

---

## i18n Implementation

### Translation Structure

```
locales/
├── he.json     (Hebrew - default)
└── en.json     (English)
```

### Translation Keys

Use dot-notation namespaced keys:

```json
{
  "orders.title": "הזמנות",
  "orders.status.received": "התקבלה",
  "orders.status.inProgress": "בהכנה",
  "orders.status.ready": "מוכנה",
  "orders.status.delivered": "נמסרה",
  "orders.actions.create": "הזמנה חדשה",
  "common.save": "שמור",
  "common.cancel": "ביטול",
  "common.delete": "מחק",
  "common.search": "חיפוש..."
}
```

### Language Switcher

- Placed in the top bar (desktop) or settings page
- Toggle between Hebrew and English
- Language preference stored in user settings (DB) and localStorage (fallback)
- Page reloads with new `dir` and `lang` attributes
- All content including toasts, errors, and dates respect the active language

### Date and Number Formatting

```tsx
// Hebrew locale
new Intl.DateTimeFormat('he-IL').format(date)
// → "14 בפבר׳ 2026"

// English locale
new Intl.DateTimeFormat('en-IL').format(date)
// → "Feb 14, 2026"

// Currency
new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS' }).format(180)
// → "‏180.00 ₪"
```

---

## Testing RTL

### Checklist for Every Component

- [ ] Text aligns to the start edge (right in RTL, left in LTR)
- [ ] Icons in correct position (start/end, not left/right)
- [ ] Directional icons are mirrored (arrows, chevrons)
- [ ] Non-directional icons are NOT mirrored (search, trash)
- [ ] Padding and margins are correct on both sides
- [ ] Form labels are properly aligned
- [ ] Input text direction is correct (auto for text, ltr for numbers/email)
- [ ] Scrollbars appear on the correct side
- [ ] Modals/drawers open from the correct edge
- [ ] No horizontal overflow or layout breaks
- [ ] Navigation flows in the correct direction
- [ ] Keyboard navigation (Tab order) follows visual flow

### Testing Approach

1. Develop in RTL mode (Hebrew first)
2. Switch to LTR to verify -- should work without changes
3. Test with mixed-language content (Hebrew + English)
4. Test on mobile in both directions
5. Automated visual regression tests in both directions

---

## Common Pitfalls to Avoid

1. **Hardcoded `left`/`right`** -- Always use `start`/`end` logical properties
2. **Hardcoded `padding-left: 16px`** -- Use `ps-4` instead
3. **`text-align: left`** -- Use `text-start`
4. **Absolute positioned elements with `left: 0`** -- Use `start-0`
5. **`margin-right: auto` for end-alignment** -- Use `me-auto` or flex `justify-end`
6. **Forgetting `dir="ltr"` on phone/email/URL elements** in RTL context
7. **CSS transforms for layout** -- These do NOT auto-mirror; use explicit RTL overrides
8. **Icon fonts with directional glyphs** -- Use SVG icons with `rtl:scale-x-[-1]`

---

## shadcn/ui RTL Compatibility

shadcn/ui components use Radix UI primitives which have good RTL support. However, verify:

- **DropdownMenu**: Opens in correct direction
- **Sheet/Drawer**: Slides from correct edge (`side="end"` not `side="right"`)
- **Tabs**: Tab order follows RTL
- **Tooltip**: Positioned correctly relative to trigger
- **Dialog**: Close button in correct corner

Override when needed:
```tsx
<Sheet side="end">  {/* Not "right" -- "end" auto-mirrors */}
```

---

*RTL is not a feature to add later -- it is baked into every line of CSS and every component from day one.*
