# Bakery Storefront Menu Screen -- Design Spec (v2)
## Inspired by Wolt's Restaurant Page Patterns

**Date**: 2026-03-11
**Target**: React Native Expo (apps/storefront)
**Direction**: RTL (Hebrew primary), LTR English fallback
**Supersedes**: Previous Uber Eats-based spec

---

## 1. Why Wolt Over Uber Eats

Wolt's design language is a better fit for our bakery storefront than Uber Eats because:

- **Warmth over utility**: Wolt uses rounded corners, playful micro-interactions, and softer shadows. Uber Eats is more utilitarian and dark. Our bakery brand is warm and inviting.
- **Clean white surfaces with personality**: Wolt's signature look -- bright white cards on a light background with generous whitespace -- aligns perfectly with our cream/brown theme.
- **Food-first photography**: Wolt prioritizes large food images in vertical cards (not small thumbnails in list rows). For a bakery where pastry appearance drives purchases, this is essential.
- **Scroll-spy category navigation**: Wolt's horizontal pill tabs sync with scroll position, keeping all items visible while providing quick navigation. This is better for bakeries with 15-30 items than Uber Eats' filtering approach.
- **Bottom sheet detail views**: Wolt pioneered the multi-page scrollable bottom sheet pattern (they even open-sourced it as `wolt_modal_sheet`). It feels native and elegant for item detail views.
- **European design sensibility**: Wolt (Finnish, now DoorDash-owned) has a cleaner, more European feel that suits an Israeli bakery app better than Uber's American maximalism.

### Core Wolt Design Principles We Adopt
1. **Let food photos breathe** -- large images, minimal UI chrome
2. **Rounded everything** -- 16px card radii, pill-shaped tabs, 24px search bar radii
3. **Subtle depth** -- very soft shadows (almost flat), no heavy elevation
4. **Progressive disclosure** -- show essentials in the list, detail on tap via bottom sheet
5. **Playful motion** -- spring-based animations, bounce on add-to-cart, smooth parallax

---

## 2. Screen Architecture (Top to Bottom)

```
+--------------------------------------------------+
|  [HERO HEADER - Cover Photo + Gradient]          |  <- Collapses on scroll
|  Store Logo | Store Name                         |
|  "Fresh bakery * Ramat Gan"                      |
|  [Open Now] [Pickup: 15 min]                     |
+--------------------------------------------------+
|  [COMPACT HEADER - appears on scroll]            |  <- Sticky, z-index top
|  Store Name (centered)                           |
+--------------------------------------------------+
|  [SEARCH BAR - pill shaped]                      |  <- Sticky below header
+--------------------------------------------------+
|  [CATEGORY PILLS - horizontal scroll]            |  <- Sticky below search
|  All | Breads | Pastries | Cakes | Cookies ...   |
+--------------------------------------------------+
|                                                  |
|  [SECTION HEADER] "Breads"                       |
|  +--------------------+  +--------------------+  |
|  | [MENU CARD]        |  | [MENU CARD]        |  |
|  | Image (top)        |  | Image (top)        |  |
|  | Name               |  | Name               |  |
|  | Description        |  | Description        |  |
|  | Price    [+]       |  | Price    [+]       |  |
|  +--------------------+  +--------------------+  |
|                                                  |
|  [SECTION HEADER] "Pastries"                     |
|  +--------------------+  +--------------------+  |
|  | ...                |  | ...                |  |
|  +--------------------+  +--------------------+  |
|                                                  |
+--------------------------------------------------+
|  ~~ gradient fade ~~                             |
|  [FLOATING CART BUTTON]                          |  <- Fixed bottom
|  Cart Icon + Count Badge | "View Cart" | Total   |
+--------------------------------------------------+
```

---

## 3. Component Specifications

### 3.1 Hero Header (AnimatedHeroHeader)

**Current state**: Avatar circle with initials, text-only store info, accent line. Collapses from 140px to 56px.
**Target state**: Full-bleed cover photo with gradient overlay and store info overlaid. Wolt-style parallax collapse.

#### Layout (Expanded)
```
+-----------------------------------------------+
|                                                 |
|            [HERO IMAGE - full bleed]            |
|                                                 |
|  +-gradient overlay (bottom 60%)-------------+  |
|  |                                           |  |
|  |  [Store Logo 48x48]  Store Name           |  |
|  |                      "Bakery * Ramat Gan" |  |
|  |                      [Open] [15 min]      |  |
|  +-------------------------------------------+  |
+-----------------------------------------------+
```

#### Dimensions & Values

| Property | Value | Notes |
|---|---|---|
| Hero image height (expanded) | **240px** | Full-width, edge-to-edge |
| Cover image contentFit | `cover` | |
| Gradient overlay | Bottom 60%, `transparent` to `rgba(0,0,0,0.55)` | Ensures text legibility on any photo |
| Store logo | **48x48px**, `borderRadius: 12` | White 2px border, sits over gradient |
| Store name | `fontSize: 24`, `fontWeight: 700`, `color: #FFFFFF` | Heebo Bold |
| Store name shadow | `textShadowColor: rgba(0,0,0,0.3)`, `textShadowOffset: {0,1}`, `textShadowRadius: 3` | Ensures readability |
| Subtitle | `fontSize: 13`, `fontWeight: 400`, `color: rgba(255,255,255,0.85)` | e.g. "Fresh bakery * Ramat Gan" |
| Info pills | `height: 28`, `borderRadius: 14`, `bg: rgba(255,255,255,0.2)` | "Open Now", "Pickup: 15 min" |
| Info pill text | `fontSize: 12`, `fontWeight: 500`, `color: #FFFFFF` | |
| Content padding (within gradient) | `paddingHorizontal: 20`, `paddingBottom: 16` | |
| Gap: logo to text | **12px** horizontal | |
| Gap: name to subtitle | **4px** | |
| Gap: subtitle to pills | **10px** | |
| Pills gap | **8px** between pills | |

#### Collapsed State (Compact Header Bar)
- **Height**: 56px
- **Background**: `surface` (#FDF8F3) with 0.98 opacity
- **Bottom border**: `1px solid rgba(0,0,0,0.06)` -- subtle separator
- **Store name**: `fontSize: 17`, `fontWeight: 600`, centered, `color: textStrong`
- **Name truncation**: `numberOfLines: 1`, ellipsize middle
- No back arrow needed (this is the root storefront screen)

#### Animation Spec (react-native-reanimated)
| Animation | scrollY Range | Interpolation |
|---|---|---|
| Hero container height | 0 -> 240 | 240px -> 0px (CLAMP) |
| Image parallax translateY | 0 -> 240 | 0 -> -70px (image scrolls slower) |
| Image + gradient opacity | 0 -> 180 | 1 -> 0 |
| Store info opacity | 0 -> 120 | 1 -> 0 (fades earlier than image) |
| Compact header opacity | 180 -> 240 | 0 -> 1 (fades in as hero disappears) |
| Compact header translateY | 180 -> 240 | -10 -> 0 (subtle slide down) |

All interpolations use `Extrapolation.CLAMP`.

#### Fallback (No Cover Photo)
- Solid background: `surfaceSecondary` (#F9EDE0)
- Store logo centered and larger: **64x64px**
- Store name below logo, centered, `fontSize: 28`, `color: textStrong`
- Total fallback height: **160px**
- Collapse behavior: same proportional animation but with reduced scroll distance (120px)

#### New Sizing Constants
```typescript
// Add to spacing.ts sizing object:
headerHeroHeight: 240,             // Full hero with cover photo
headerHeroFallbackHeight: 160,     // No-photo fallback
headerCollapsedHeight: 56,         // Compact toolbar (unchanged)
headerCollapseScrollDistance: 240,  // Full scroll distance for collapse
headerParallaxFactor: 0.29,        // Image moves at ~29% of scroll speed
```

---

### 3.2 Search Bar

**Current state**: Always visible, borderRadius 12, between header and category tabs.
**Target state**: Pill-shaped (Wolt style), integrated into sticky zone.

#### Design Decision
Keep the search bar always visible (not hidden behind an icon) because:
- Bakery menus are small enough that search is a quick filter, not a navigation necessity
- Wolt shows search prominently on their restaurant page
- Simpler to implement than an overlay search system

#### Style Changes

| Property | Current | New (Wolt-style) |
|---|---|---|
| Border radius | 12px | **24px** (full pill shape) |
| Height | 48px | 48px (unchanged) |
| Background | `surfaceSecondary` | `surfaceSecondary` (unchanged) |
| Search icon | Emoji magnifying glass | **SVG icon**, 20x20, `color: textTertiary` |
| Clear button | 20x20 circle, `bg: textTertiary` | **24x24** circle for better touch target |
| Placeholder text | `fontSize: 15` | `fontSize: 15` (unchanged) |
| Outer padding | `vertical: 8, horizontal: 16` | `vertical: 6, horizontal: 16` (slightly tighter) |
| Inner padding horizontal | 14px | **16px** |
| Gap: icon to input | 10px | **12px** |

---

### 3.3 Category Pills (CategoryTabs)

**Current state**: Scrollable pills with border on inactive, not sticky, no scroll-spy.
**Target state**: Wolt-style filled pills, sticky below search, scroll-spy sync.

#### Visual Changes

| Property | Active State | Inactive State |
|---|---|---|
| Height | 36px | 36px |
| Border radius | 999px (pill) | 999px (pill) |
| Background | `primary` (#C4823E) | `surfaceSecondary` (#F9EDE0) |
| Border | **none** | **none** (remove current 1.5px border) |
| Text color | `onPrimary` (#FFFFFF) | `textPrimary` (#7A4D20) |
| Font size | 14px | 14px |
| Font weight | 600 (Heebo SemiBold) | 500 (Heebo Medium) |
| Padding horizontal | 18px | 18px |

Key change: **Remove the border on inactive pills.** Wolt uses filled backgrounds, not outlines. The contrast between `surfaceSecondary` fill and `surface` background is enough to define the pill shape. This creates a softer, more cohesive look.

#### Container
- **Background**: `surface`
- **Padding**: `bottom: 10px`, `top: 0`
- **Gap between pills**: **10px**
- **Content padding horizontal**: **16px**
- **Bottom divider**: 1px `border` color -- visually separates navigation from content

#### Scroll-Spy Behavior (New)
Currently, tapping a category **filters** the list to show only that category. This should change to Wolt's pattern:

1. **All items are always visible**, grouped by category sections
2. Tapping a category pill **scrolls to that section** (using `SectionList.scrollToLocation`)
3. As the user scrolls through sections, the **active pill updates automatically**
4. Implementation approach:
   - Track section header Y positions via `onLayout` callbacks on section headers
   - On scroll, determine which section header is closest to the top of the visible area (offset by sticky header height)
   - Update `activeCategory` state accordingly
   - Auto-scroll the pill ScrollView to center the active pill using `scrollTo`

#### Transition Animation
- Active pill background: `withTiming` color transition, **200ms**
- Auto-scroll pill into view: `animated: true` on `scrollTo`

---

### 3.4 Menu Item Cards (MenuItemCard)

**Current state**: 2-column grid, vertical card with top image at 0.85 ratio. Good foundation.
**Target state**: Refined to match Wolt's polish level.

#### Layout (Unchanged - 2-column vertical grid)
The 2-column vertical card grid is correct for a bakery. Wolt uses this same pattern for restaurants with strong photography. We keep it.

```
+-------------------+
|                   |
|   [Item Image]    |
|                   |
|            [+]    |  <- quick-add overlay
+-------------------+
|  Item Name        |
|  Short desc...    |
|  [allergens]      |
|  25 NIS           |
+-------------------+
```

#### Card Dimensions

| Property | Current | New |
|---|---|---|
| Card width | `(screenWidth - 32 - 12) / 2` | Same |
| Image height ratio | `cardWidth * 0.85` | `cardWidth * 0.9` (slightly taller) |
| Border radius | 16px | 16px (unchanged) |
| Background | #FFFFFF | #FFFFFF (unchanged) |
| Shadow opacity | 0.08 | **0.05** (softer, Wolt-like) |
| Shadow radius | 8 | **12** (more diffused) |
| Shadow offset | {0, 2} | **{0, 1}** (tighter to card) |
| Elevation (Android) | 3 | **2** (subtler) |
| Press scale | 0.97 | 0.97 (unchanged) |
| Press animation | instant | **withSpring({damping: 15, stiffness: 150})** |

#### Quick-Add Button (Overlay on Image)

| Property | Current | New |
|---|---|---|
| Position | bottom: 8, left: 8 | bottom: 8, **start: 8** (RTL-aware) |
| Size | 36x36 | 36x36 (unchanged) |
| Background | N/A | **#FFFFFF, opacity: 0.95** |
| Icon | Plus text | **Plus SVG icon**, 18px, `color: primary` |
| Shadow | N/A | `offset: {0,1}, opacity: 0.12, radius: 4` |
| Press state | N/A | **bg becomes `primary`, icon becomes white** |
| Border radius | 18px (circle) | 18px (unchanged) |

#### Content Area

| Property | Current | New |
|---|---|---|
| Padding | top: 10, sides: 12, bottom: 12 | Same |
| Name fontSize | 15 | 15 (unchanged) |
| Name lines | 1 | **2** (bakery items have descriptive Hebrew names) |
| Description fontSize | 12 | 12 (unchanged) |
| Description lines | 2 | 2 (unchanged) |
| Description opacity | 0.8 | **1.0** (rely on `textSecondary` color instead of opacity) |
| Price fontSize | 17 | 17 (unchanged) |

#### Placeholder (No Photo)
- **Background**: Soft palette color from `getPlaceholderColor` (keep current approach)
- **Icon**: Replace bread emoji with a bakery SVG icon, 28px, in a 56x56 frosted circle
- This matches Wolt's clean placeholder approach (no emojis in production UI)

---

### 3.5 Section Headers

**Current state**: Accent bar + bold title. Good design.
**Target state**: Minor refinement, add top divider.

| Property | Current | New |
|---|---|---|
| Padding top | 20px | **24px** (more breathing room) |
| Padding bottom | 12px | 12px (unchanged) |
| Accent bar | 4x20px, borderRadius 2, `primary` | **4x22px** (slightly taller) |
| Title fontSize | 20px | 20px (unchanged) |
| Title fontWeight | 700 | 700 (unchanged) |
| Letter spacing | -0.2 | **-0.3** (slightly tighter) |

**New**: Add a 1px hairline divider in `border` color **above** each section header (except the first). This provides clearer visual separation between sections, matching Wolt's clean section breaks.

```
-------- thin divider (1px, border color, 16px horizontal inset) --------
  [accent bar]  Section Title
```

---

### 3.6 Floating Cart Button

**Current state**: Good implementation with bounce animation, emoji cart icon.
**Target state**: Add gradient fade above, replace emoji with SVG.

#### Gradient Fade (New -- Wolt's signature pattern)
Wolt adds a gentle gradient above their sticky action bar so content doesn't abruptly cut off behind the button.

| Property | Value |
|---|---|
| Gradient height | **32px** |
| Gradient direction | Bottom to top |
| Gradient colors | `[rgba(surface, 0), rgba(surface, 0.98)]` |
| Position | Directly above the button wrapper |

For the cream theme: `['rgba(253,248,243,0)', 'rgba(253,248,243,0.98)']`

#### Button Changes

| Property | Current | New |
|---|---|---|
| Cart icon | Emoji (shopping cart) | **SVG shopping bag icon**, 20x20, white |
| Shadow color | `primary` | `primary` (unchanged) |
| Shadow opacity | 0.35 | **0.30** (slightly softer) |
| Shadow radius | 12 | **14** |
| Border radius | 16px | 16px (unchanged) |
| Height | 56px | 56px (unchanged) |

Everything else (badge, labels, prices, animations) remains unchanged -- the current implementation is already well-aligned with Wolt patterns.

---

### 3.7 Item Detail Bottom Sheet

Wolt pioneered the scrollable bottom sheet pattern and open-sourced their implementation. Our `ItemDetailSheet` should follow their conventions.

#### Structure
```
+-----------------------------------------------+
|  [Drag handle - 36x4px, rounded, centered]     |
+-----------------------------------------------+
|                                                 |
|            [Large Item Image]                   |
|            full-width, 240px tall               |
|                                                 |
+-----------------------------------------------+
|  Item Name                                      |
|  Full description (multi-line)                  |
|                                                 |
|  [Allergen badges row]                          |
|                                                 |
|  [Quantity: [-] [2] [+] ]                       |
|                                                 |
+-----------------------------------------------+
|  [Add to Cart -- 55.00 NIS]           button   |
+-----------------------------------------------+
```

#### Specs

| Property | Value |
|---|---|
| Sheet max height | **85% of screen** |
| Sheet border radius (top) | **24px** (Wolt uses 24px consistently) |
| Sheet background | `card` (#FFFFFF) |
| Drag handle | `width: 36, height: 4, borderRadius: 2, bg: border (#F0D9BF)` |
| Drag handle margin top | **12px**, centered |
| Image height | **240px**, full-width, `contentFit: cover` |
| Content padding horizontal | **20px** |
| Item name | `fontSize: 24`, `fontWeight: 700`, `color: textStrong` |
| Description | `fontSize: 15`, `lineHeight: 22`, `color: textSecondary` |
| Gap: name to description | **8px** |
| Gap: description to allergens | **12px** |
| Gap: allergens to quantity | **20px** |
| Add-to-cart button | `height: 52`, `borderRadius: 14`, `bg: primary` |
| Add-to-cart text | `fontSize: 16`, `fontWeight: 600`, white |
| Button bottom spacing | `safeAreaInsets.bottom + 16` |

#### Animation
- Sheet entry: spring-based slide up, `damping: 20, stiffness: 200`
- Backdrop: fade in `rgba(0,0,0,0.45)`, **200ms**
- Drag-to-dismiss threshold: **150px** downward drag

---

## 4. Skeleton Loading States

Wolt uses shimmering placeholder blocks that precisely match the layout of the content they replace.

### Shimmer Animation
| Property | Value |
|---|---|
| Base color | `surfaceSecondary` (#F9EDE0) |
| Highlight color | `rgba(255,255,255,0.4)` |
| Sweep direction | Right-to-left (RTL) |
| Duration | **1200ms**, ease-in-out, infinite |

### Skeleton Layout Sequence
1. **Hero area**: Full-width rect, 240px, borderRadius 0 (or 160px for fallback height)
2. **Search bar**: Full-width rect (minus 32px padding), 48px, borderRadius **24** (pill shape)
3. **Category tabs**: 4 pill rects (56/72/64/80px wide), 36px tall, borderRadius 999
4. **Menu grid**: 2x2 card skeletons, each `cardWidth x ~230px`, borderRadius 16
5. **Second row**: Same 2x2 grid with 12px gap below first row

---

## 5. Color Application Guide

Using the cream palette as reference:

| Element | Token | Hex |
|---|---|---|
| Screen background | `surface` | #FDF8F3 |
| Card background | `card` | #FFFFFF |
| Category pill (inactive) bg | `surfaceSecondary` | #F9EDE0 |
| Category pill (active) bg | `primary` | #C4823E |
| Category pill (active) text | `onPrimary` | #FFFFFF |
| Category pill (inactive) text | `textPrimary` | #7A4D20 |
| Item name | `textStrong` | #5C3A18 |
| Item description | `textSecondary` | #D4A06A |
| Price | `textStrong` | #5C3A18 |
| Section header title | `textStrong` | #5C3A18 |
| Section accent bar | `primary` | #C4823E |
| Floating cart button bg | `primary` | #C4823E |
| Floating cart text/icons | `onPrimary` | #FFFFFF |
| Search placeholder | `textTertiary` | #E4BF94 |
| Dividers | `border` | #F0D9BF |
| Hero gradient bottom | -- | rgba(0,0,0,0.55) |
| Hero text (on gradient) | -- | #FFFFFF |
| Hero subtext (on gradient) | -- | rgba(255,255,255,0.85) |
| Info pills on hero | -- | rgba(255,255,255,0.2) bg |
| Quick-add button bg | -- | rgba(255,255,255,0.95) |
| Quick-add "+" icon | `primary` | #C4823E |
| Cart gradient fade | -- | rgba(253,248,243,0) to rgba(253,248,243,0.98) |

---

## 6. Typography Quick Reference

| Element | Size | Weight | Line Height | Font |
|---|---|---|---|---|
| Hero store name | 24 | 700 | 32 | Heebo Bold |
| Hero subtitle | 13 | 400 | 18 | Heebo Regular |
| Info pill text | 12 | 500 | 16 | Heebo Medium |
| Compact header title | 17 | 600 | 22 | Heebo SemiBold |
| Search input | 15 | 400 | 20 | Heebo Regular |
| Category pill label | 14 | 500/600 | 18 | Heebo Medium/SemiBold |
| Section header | 20 | 700 | 28 | Heebo Bold |
| Menu item name | 15 | 600 | 20 | Heebo SemiBold |
| Menu item description | 12 | 400 | 17 | Heebo Regular |
| Menu item price | 17 | 700 | 22 | Heebo Bold |
| Cart button label | 15 | 600 | 20 | Heebo SemiBold |
| Cart button total | 17 | 700 | 22 | Heebo Bold |
| Cart badge count | 13 | 700 | 16 | Heebo Bold |
| Sheet item name | 24 | 700 | 32 | Heebo Bold |
| Sheet description | 15 | 400 | 22 | Heebo Regular |
| Sheet CTA button | 16 | 600 | 20 | Heebo SemiBold |

Use `theme.font(weight)` helper which selects Heebo vs Inter based on active locale.

---

## 7. Shadow System

Three consistent levels (Wolt uses very subtle shadows):

| Level | Use Cases | iOS Shadow | Android |
|---|---|---|---|
| **Subtle** | Cards, compact header | `offset: {0,1}, opacity: 0.05, radius: 12` | `elevation: 2` |
| **Medium** | Quick-add button, search overlay | `offset: {0,2}, opacity: 0.10, radius: 6` | `elevation: 4` |
| **Strong** | Floating cart button | `offset: {0,6}, opacity: 0.30, radius: 14, color: primary` | `elevation: 8` |

Key insight: Wolt's shadows are significantly softer than Uber Eats. The cards feel almost flat, with just enough shadow to suggest layering. This creates the clean, bright feel.

---

## 8. Animation Specifications

| Animation | Trigger | Implementation |
|---|---|---|
| Hero collapse | Scroll 0-240px | `interpolate` with CLAMP, see Section 3.1 table |
| Hero parallax | Scroll 0-240px | `translateY: interpolate(scrollY, [0,240], [0,-70])` |
| Compact header appear | Scroll 180-240px | Opacity 0->1, translateY -10->0 |
| Card press | Touch down/up | `scale: withSpring(0.97, {damping:15, stiffness:150})` |
| Quick-add press | Touch down/up | `scale: withSpring(0.9, {damping:12})` |
| Cart button entry | First item added | `FadeIn(200)` + `translateY: withSpring(from: 20, to: 0)` |
| Cart item bounce | Count changes | `translateY: withSequence(spring(-6, {damping:8, stiffness:200}), spring(0))` |
| Badge pulse | Count changes | `scale: withSequence(timing(1.3, 100ms), spring(1, {damping:8}))` |
| Category pill scroll | Section becomes visible | `scrollTo({x, animated: true})` |
| Bottom sheet open | Tap menu item | Spring slide up, `{damping:20, stiffness:200}` |
| Bottom sheet backdrop | Sheet open/close | `withTiming(0.45, {duration: 200})` |

---

## 9. RTL Considerations

| Concern | Approach |
|---|---|
| `flexDirection: 'row'` | Automatically mirrors in RTL -- no changes needed |
| Quick-add button | Use `start: 8` instead of `left: 8` for RTL-aware positioning |
| Price display | Force `writingDirection: 'ltr'` (numbers always LTR) |
| Category pills | ScrollView starts from right in RTL; "All" is rightmost (first) |
| Section accent bar | `start` position means right side in RTL |
| Horizontal padding | Always use `paddingHorizontal`, never separate `left`/`right` |
| Text alignment | Default `textAlign` is correct for RTL; explicit `textAlign: 'right'` only if needed |
| Gradient fade direction | Bottom-to-top for cart gradient (same in both directions) |
| Shimmer sweep | Right-to-left in RTL, left-to-right in LTR |
| Hero info layout | Row with logo on the `start` side (right in RTL) |

---

## 10. Spacing & Layout Summary

| Constant | Value | Usage |
|---|---|---|
| `pageHorizontalPadding` | 16px | Content inset from screen edges |
| `cardGap` | 12px | Between grid cards |
| `sectionGapTop` | 24px | Above section headers |
| `sectionGapBottom` | 12px | Below section headers |
| `componentGap` | 6-8px | Between search bar, category tabs |
| `cardBorderRadius` | 16px | All cards |
| `searchBarBorderRadius` | 24px | Pill-shaped search |
| `pillBorderRadius` | 999px | Category tabs |
| `buttonBorderRadius` | 14-16px | CTAs |
| `sheetBorderRadius` | 24px | Bottom sheet top corners |
| `listContentPaddingBottom` | 120px | Clearance for floating cart |
| `heroHeight` | 240px | Expanded hero image |
| `heroFallbackHeight` | 160px | No-photo fallback |
| `compactHeaderHeight` | 56px | Collapsed sticky header |
| `searchBarHeight` | 48px | |
| `categoryContainerHeight` | 46px (pills + padding) | |
| `categoryPillHeight` | 36px | |
| `floatingCartHeight` | 56px | |
| `cartGradientHeight` | 32px | Fade gradient above cart |

---

## 11. Component Tree

```
MenuScreen
  |-- AnimatedHeroHeader (NEW - replaces AnimatedHeader)
  |     |-- HeroImage (parallax, gradient overlay)
  |     |-- StoreInfoOverlay (logo, name, subtitle, info pills)
  |     |-- CompactHeaderBar (sticky, appears on scroll)
  |
  |-- StickyNavZone (wrapper, sticks below compact header)
  |     |-- SearchBar (pill-shaped, borderRadius: 24)
  |     |-- CategoryTabs (filled pills, scroll-spy, no borders)
  |
  |-- SectionList (menu content)
  |     |-- SectionDivider (1px hairline, new)
  |     |-- SectionHeader (accent bar + category name)
  |     |-- MenuRow (2-column flex row)
  |     |   |-- MenuItemCard (grid card)
  |     |       |-- CardImage + QuickAddButton overlay
  |     |       |-- CardContent (name, desc, allergens, price)
  |
  |-- CartGradientFade (32px gradient, new)
  |-- FloatingCartButton (absolute positioned)
  |
  |-- ItemDetailSheet (bottom sheet, 24px top radius)
        |-- DragHandle
        |-- SheetImage (240px)
        |-- SheetContent (name, description, allergens)
        |-- QuantitySelector
        |-- AddToCartButton
```

---

## 12. Key Changes from Current Implementation

| # | Change | Impact | Effort |
|---|---|---|---|
| 1 | **Hero cover photo header** replacing avatar/initials | High -- biggest visual upgrade | Large |
| 2 | **Pill-shaped search bar** (borderRadius 12 -> 24) | Medium -- feels more modern | Trivial |
| 3 | **Remove category pill borders**, use filled `surfaceSecondary` bg | Medium -- cleaner look | Trivial |
| 4 | **Scroll-spy on category tabs** | High -- much better navigation UX | Medium |
| 5 | **Gradient fade above cart button** | Medium -- polished detail | Small |
| 6 | **Softer card shadows** (opacity 0.08 -> 0.05) | Low-Medium -- subtly cleaner | Trivial |
| 7 | **Replace all emoji icons with SVG** (cart, search, clear, placeholder) | Medium -- consistent cross-platform | Medium |
| 8 | **Section divider hairlines** | Low -- clearer section breaks | Small |
| 9 | **Item name 2-line allowance** | Low -- better for long Hebrew names | Trivial |
| 10 | **Bottom sheet 24px top radius** | Low -- Wolt signature detail | Trivial |
| 11 | **Quick-add press state** (bg swap to primary) | Low -- polish | Small |
| 12 | **Remove description opacity**, use `textSecondary` directly | Low -- cleaner code | Trivial |

### Implementation Priority
**Phase 1 (Visual Impact):** Items 1, 2, 3, 6, 9, 10, 12
**Phase 2 (Interaction Polish):** Items 4, 5, 8, 11
**Phase 3 (Icon System):** Item 7

---

## 13. Files to Modify

| File | Changes |
|---|---|
| `components/store/AnimatedHeader.tsx` | **Full rewrite** -> `AnimatedHeroHeader.tsx` with cover photo, gradient, compact bar |
| `components/menu/CategoryTabs.tsx` | Remove border style, add filled bg, implement scroll-spy |
| `components/menu/MenuItemCard.tsx` | Softer shadows, image ratio 0.9, name 2-line, remove desc opacity |
| `components/menu/SearchBar.tsx` | borderRadius 24, tighter vertical padding |
| `components/menu/FloatingCartButton.tsx` | Add gradient fade component above, replace emoji |
| `components/menu/QuickAddButton.tsx` | SVG icon, press state with color swap |
| `screens/MenuScreen.tsx` | Wire scroll-spy, new header, section dividers |
| `theme/spacing.ts` | Add hero sizing constants |
| `api/types.ts` | Ensure `PublicStoreInfo` includes `coverImage` / `coverPhoto` field |

---

## Sources

- [Wolt Multi-Page Scrollable Bottom Sheet UI Design](https://careers.wolt.com/en/blog/tech/an-overview-of-the-multi-page-scrollable-bottom-sheet-ui-design)
- [Wolt App UI - Free UI Kit (Figma)](https://www.figma.com/community/file/1324314768602037147/wolt-app-ui-free-ui-kit-recreated)
- [Wolt Food Delivery App Redesign UX/UI Case Study (Behance)](https://www.behance.net/gallery/175151187/Wolt-Food-Delivery-App-Redesign-UXUI-Case-Study)
- [MAUI UI - Replicating Wolt App (Andreas Nesheim)](https://www.andreasnesheim.no/maui-ui-july-2023-replicating-wolt-app/)
- [Create a Sleek UI in Flutter - Wolt Case Study (Nomtek)](https://www.nomtek.com/blog/sleek-ui-in-flutter-wolt)
- [Wolt Icon System Redesign](https://careers.wolt.com/en/blog/tech/wolt-icon-system-redesign)
- [Designing for Online Retail Experience at Wolt](https://careers.wolt.com/en/blog/design/designing-for-online-retail-experience)
- [Wolt User Flow Analysis (Medium)](https://medium.com/@deepikanarvekar1909/wolt-user-flow-67ec705879de)
- [Wolt on Dribbble](https://dribbble.com/wolt)
- [Wolt Food Delivery App Screenshots (Templateshake)](https://templateshake.com/product/wolt-food-delivery/)
- [Food Delivery App - Wolt UI Inspiration (Figma)](https://www.figma.com/community/file/1498345334464081462/food-delivery-app-wolt-ui-inspiration)
- [Unboxing Wolt - Wireframing Analysis (Medium)](https://magdalenasteinlein.medium.com/unboxing-wolt-e27914b49f88)
- [Optimizing Wolt's Food Ordering Flow (Medium)](https://medium.com/@luisaklaus12/optimizing-the-user-experience-a-case-study-on-wolts-food-ordering-flow-d27ee6e0fdfb)
