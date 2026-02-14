# Mise Design System

> The visual foundation for the Mise bakery management app.
> Warm, cozy, functional -- built on shadcn/ui + Tailwind CSS.

---

## Color Palette

### Philosophy

The palette draws from natural bakery ingredients: warm dough, golden crusts, rich chocolate, fresh cream, and flour-dusted surfaces. It should feel inviting and artisanal, never cold or corporate.

### Primary Colors

| Token | Name | Hex | Usage |
|-------|------|-----|-------|
| `primary-50` | Flour | `#FDF8F3` | Page backgrounds, subtle fills |
| `primary-100` | Cream | `#FAF0E4` | Card backgrounds, hover states |
| `primary-200` | Dough | `#F3DCC5` | Borders, dividers, input backgrounds |
| `primary-300` | Honey | `#E8C49A` | Inactive elements, placeholder text bg |
| `primary-400` | Caramel | `#D4A06A` | Secondary text, icons |
| `primary-500` | Crust | `#C4823E` | Primary brand color, CTA buttons |
| `primary-600` | Baked | `#A66A2E` | Primary hover, active states |
| `primary-700` | Espresso | `#7A4D20` | Headings, dark accents |
| `primary-800` | Cocoa | `#5C3A18` | Dark text on light backgrounds |
| `primary-900` | Dark Roast | `#3D2610` | Primary text color |

### Accent Colors

| Token | Name | Hex | Usage |
|-------|------|-----|-------|
| `accent-400` | Berry | `#C2616B` | Alerts, badges, sale prices |
| `accent-500` | Raspberry | `#A84850` | Danger buttons, error states |
| `accent-600` | Jam | `#8E3640` | Danger hover |

### Semantic Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `success-light` | `#E8F5E1` | Success background |
| `success` | `#4A9B3F` | Success text, icons, borders |
| `success-dark` | `#2D6A25` | Success emphasis |
| `warning-light` | `#FFF4D6` | Warning background |
| `warning` | `#D4920A` | Warning text, icons, borders |
| `warning-dark` | `#9B6B00` | Warning emphasis |
| `error-light` | `#FDE8E8` | Error background |
| `error` | `#C53030` | Error text, icons, borders |
| `error-dark` | `#9B2C2C` | Error emphasis |
| `info-light` | `#E3F0FC` | Info background |
| `info` | `#2B6CB0` | Info text, icons, borders |
| `info-dark` | `#1E4E8C` | Info emphasis |

### Neutral Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `neutral-50` | `#FAFAF9` | Lightest background |
| `neutral-100` | `#F5F5F3` | Alternate row background |
| `neutral-200` | `#E7E5E2` | Borders, dividers |
| `neutral-300` | `#D6D3CE` | Disabled backgrounds |
| `neutral-400` | `#A8A29D` | Placeholder text |
| `neutral-500` | `#78726B` | Secondary text |
| `neutral-600` | `#57534C` | Body text |
| `neutral-700` | `#44403B` | Subheadings |
| `neutral-800` | `#292524` | Headings |
| `neutral-900` | `#1C1917` | Primary text |

### Order Status Colors

| Status | Background | Text/Border | Dot |
|--------|-----------|-------------|-----|
| Received | `#E3F0FC` | `#2B6CB0` | `#2B6CB0` |
| In Progress | `#FFF4D6` | `#D4920A` | `#D4920A` |
| Ready | `#E8F5E1` | `#4A9B3F` | `#4A9B3F` |
| Delivered | `#F5F5F3` | `#57534C` | `#57534C` |
| Cancelled | `#FDE8E8` | `#C53030` | `#C53030` |

### Payment Status Colors

| Status | Background | Text/Border |
|--------|-----------|-------------|
| Unpaid | `#FDE8E8` | `#C53030` |
| Partial | `#FFF4D6` | `#D4920A` |
| Paid | `#E8F5E1` | `#4A9B3F` |

---

## Typography

### Font Stack

| Purpose | Font | Fallback | Notes |
|---------|------|----------|-------|
| Headings (English) | **Frank Ruhl Libre** | Georgia, serif | Classic, warm serif with Hebrew support |
| Headings (Hebrew) | **Frank Ruhl Libre** | serif | Used in Israeli print, familiar and readable |
| Body (English) | **Assistant** | system-ui, sans-serif | Designed for Hebrew + Latin; clean and modern |
| Body (Hebrew) | **Assistant** | system-ui, sans-serif | Native Hebrew design by Ben Nathan for Google Fonts |
| Monospace | **JetBrains Mono** | monospace | For prices, quantities, codes |

### Type Scale

Based on a 1.25 ratio (major third) with 16px base:

| Token | Size | Weight | Line Height | Usage |
|-------|------|--------|-------------|-------|
| `display` | 36px / 2.25rem | 700 | 1.2 | Hero headings (rare) |
| `h1` | 30px / 1.875rem | 700 | 1.25 | Page titles |
| `h2` | 24px / 1.5rem | 600 | 1.3 | Section headings |
| `h3` | 20px / 1.25rem | 600 | 1.35 | Card titles, subsections |
| `h4` | 18px / 1.125rem | 600 | 1.4 | Widget titles |
| `body-lg` | 18px / 1.125rem | 400 | 1.6 | Introductory paragraphs |
| `body` | 16px / 1rem | 400 | 1.6 | Default body text |
| `body-sm` | 14px / 0.875rem | 400 | 1.5 | Secondary text, table content |
| `caption` | 12px / 0.75rem | 400 | 1.4 | Labels, timestamps, hints |
| `overline` | 11px / 0.6875rem | 600 | 1.4 | Uppercase labels, category tags |

### Font Weight Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `regular` | 400 | Body text |
| `medium` | 500 | Emphasized body, buttons |
| `semibold` | 600 | Subheadings, labels |
| `bold` | 700 | Page titles, headings |

---

## Spacing System

Based on a 4px grid:

| Token | Value | Usage |
|-------|-------|-------|
| `space-0` | 0px | No spacing |
| `space-0.5` | 2px | Hairline gaps |
| `space-1` | 4px | Tight padding (badges) |
| `space-2` | 8px | Inline spacing, icon gaps |
| `space-3` | 12px | Small padding, compact cards |
| `space-4` | 16px | Default padding, form field gaps |
| `space-5` | 20px | Medium gaps |
| `space-6` | 24px | Section padding, card padding |
| `space-8` | 32px | Large gaps, page sections |
| `space-10` | 40px | Section dividers |
| `space-12` | 48px | Page top/bottom padding |
| `space-16` | 64px | Large section spacing |
| `space-20` | 80px | Hero spacing |

---

## Border Radius

Rounded, soft edges to match the bakery feel -- nothing sharp.

| Token | Value | Usage |
|-------|-------|-------|
| `radius-sm` | 6px | Small elements: badges, chips |
| `radius-md` | 8px | Buttons, inputs, small cards |
| `radius-lg` | 12px | Cards, modals, dropdowns |
| `radius-xl` | 16px | Large cards, featured sections |
| `radius-2xl` | 24px | Image containers, hero elements |
| `radius-full` | 9999px | Avatars, circular buttons, pills |

---

## Shadows

Soft, warm shadows -- no harsh black edges.

| Token | Value | Usage |
|-------|-------|-------|
| `shadow-xs` | `0 1px 2px rgba(61, 38, 16, 0.05)` | Subtle lift: badges, chips |
| `shadow-sm` | `0 1px 3px rgba(61, 38, 16, 0.08), 0 1px 2px rgba(61, 38, 16, 0.04)` | Cards at rest |
| `shadow-md` | `0 4px 6px rgba(61, 38, 16, 0.07), 0 2px 4px rgba(61, 38, 16, 0.04)` | Card hover, dropdowns |
| `shadow-lg` | `0 10px 15px rgba(61, 38, 16, 0.08), 0 4px 6px rgba(61, 38, 16, 0.04)` | Modals, popovers |
| `shadow-xl` | `0 20px 25px rgba(61, 38, 16, 0.10), 0 10px 10px rgba(61, 38, 16, 0.04)` | Overlays, floating panels |

All shadows use warm brown (`#3D2610`) tints instead of pure black for cohesion with the bakery palette.

---

## Breakpoints

| Token | Value | Target |
|-------|-------|--------|
| `mobile` | 0 - 639px | Phones (portrait) |
| `sm` | 640px+ | Phones (landscape) / small tablets |
| `md` | 768px+ | Tablets (portrait) |
| `lg` | 1024px+ | Tablets (landscape) / small laptops |
| `xl` | 1280px+ | Desktops |
| `2xl` | 1536px+ | Large desktops |

Primary design targets: mobile (375px), tablet (768px), desktop (1280px).

---

## Transitions & Motion

| Token | Value | Usage |
|-------|-------|-------|
| `duration-fast` | 100ms | Hover color changes, opacity |
| `duration-normal` | 200ms | Button states, input focus |
| `duration-slow` | 300ms | Modal enter/exit, drawer slide |
| `duration-slower` | 500ms | Page transitions, toasts |
| `easing-default` | `cubic-bezier(0.4, 0, 0.2, 1)` | General transitions |
| `easing-in` | `cubic-bezier(0.4, 0, 1, 1)` | Elements exiting |
| `easing-out` | `cubic-bezier(0, 0, 0.2, 1)` | Elements entering |

---

## Z-Index Scale

| Token | Value | Usage |
|-------|-------|-------|
| `z-base` | 0 | Default stacking |
| `z-dropdown` | 10 | Dropdown menus |
| `z-sticky` | 20 | Sticky headers, navigation |
| `z-drawer` | 30 | Side drawers |
| `z-overlay` | 40 | Backdrop overlays |
| `z-modal` | 50 | Modals, dialogs |
| `z-popover` | 60 | Popovers, tooltips |
| `z-toast` | 70 | Toast notifications |

---

## Tailwind Config Mapping

```js
// tailwind.config.ts — theme extension
{
  colors: {
    primary: {
      50:  '#FDF8F3',
      100: '#FAF0E4',
      200: '#F3DCC5',
      300: '#E8C49A',
      400: '#D4A06A',
      500: '#C4823E',
      600: '#A66A2E',
      700: '#7A4D20',
      800: '#5C3A18',
      900: '#3D2610',
    },
    accent: {
      400: '#C2616B',
      500: '#A84850',
      600: '#8E3640',
    },
    // ... semantic + neutral as above
  },
  fontFamily: {
    heading: ['Frank Ruhl Libre', 'Georgia', 'serif'],
    body: ['Assistant', 'system-ui', 'sans-serif'],
    mono: ['JetBrains Mono', 'monospace'],
  },
  borderRadius: {
    sm: '6px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    '2xl': '24px',
  },
}
```

---

## Accessibility Standards

- **WCAG AA compliance** minimum (4.5:1 contrast for text, 3:1 for large text and UI elements)
- All interactive elements have visible focus indicators (2px ring in `primary-500`)
- Color is never the sole indicator of state -- always paired with icons, text, or patterns
- Minimum touch target: 44x44px for mobile
- `prefers-reduced-motion` respected for all animations
- `prefers-color-scheme` support planned for V2 (dark mode)

---

*This document is the single source of truth for all visual decisions in Mise.*
