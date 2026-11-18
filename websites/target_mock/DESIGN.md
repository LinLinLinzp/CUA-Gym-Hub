# Design system for Target shopping

## 1. Visual theme and atmosphere

Use the familiar Target vocabulary of product imagery, plain-language fulfillment and a red action color. Give this interface its own warm-white surfaces, deep navy navigation band, serif page titles and outlined product tiles. Use a text Target wordmark in red. Keep prices, store availability and the next task action visible before secondary product information.

The reference set shows dense shopping controls beside product imagery, store status next to the fulfillment choice and short labels for Circle benefits and return methods. The dimensions and palette below are implementation choices for the new interface. Use the source screenshots as research references. [Reference annotations](assets/README.md#reference-screenshots)

## 2. Color palette and roles

| Token | Value | Use |
| --- | --- | --- |
| `--brand` | `#CC0000` | Target wordmark, primary action, quantity badge |
| `--brand-hover` | `#A30000` | Hover and active fill for primary actions |
| `--nav` | `#203747` | Secondary navigation band with white labels |
| `--canvas` | `#F8F6F1` | Page background |
| `--surface` | `#FFFFFF` | Product tiles, forms and dialogs |
| `--image-surface` | `#F2F0EB` | Product image wells and skeletons |
| `--text` | `#222B30` | Body, headings and prices |
| `--muted` | `#58656C` | Dates, helper text and secondary labels |
| `--link` | `#254C66` | Underlined links and inline navigation |
| `--border` | `#DAD7CF` | Panels, row dividers and cards |
| `--control-border` | `#8F999D` | Inputs and selectable controls |
| `--circle` / `--circle-bg` | `#653D63` / `#F2E8F1` | Circle promotion text and soft offer backgrounds |
| `--success` / `--success-bg` | `#166442` / `#E5F2EB` | In stock, ready and confirmed |
| `--warning` / `--warning-bg` | `#78480C` / `#FFF1DD` | Low stock, expiry and action required |
| `--error` / `--error-bg` | `#A32131` / `#FBE9EC` | Field errors and unavailable items |
| `--focus` | `#315B9B` | 3px focus outline with 2px offset |

## 3. Typography

| Role | Local stack | Size / line height | Weight | Tracking |
| --- | --- | --- | --- | --- |
| Page title | Georgia, Times New Roman, serif | 40 / 46px | 700 | −0.025em |
| Section title | Georgia, Times New Roman, serif | 28 / 34px | 700 | −0.015em |
| Product name, card title | system-ui, sans-serif | 16 / 22px | 650 | 0 |
| Price and totals | system-ui, sans-serif | 24 / 30px | 750 | −0.015em |
| Body and form controls | system-ui, sans-serif | 16 / 24px | 400 | 0 |
| Button and navigation | system-ui, sans-serif | 15 / 20px | 650 | 0 |
| Caption and status | system-ui, sans-serif | 13 / 18px | 500 | 0 |

Set prices, quantities and order numbers to `font-variant-numeric: tabular-nums`. At mobile widths use `32 / 38px` for page titles and `24 / 30px` for section titles.

## 4. Spacing and layout

- Desktop verification viewport is `1440 × 900`. Center content at a `1248px` maximum width with `32px` outer gutter. Use the `4, 8, 12, 16, 24, 32, 48px` spacing scale.
- Header uses a `72px` light row with wordmark, left-starting search and account/cart controls. Put Categories, Target Circle and store context in a `44px` deep navy band. The search starts around `200px` from the desktop content edge and expands to `560px`. The utility band displays one store selector with the current name and a change affordance.
- Home begins with a `2:1` split between a featured shopping panel and a store or offer panel. Keep category navigation and product rows immediately below. Catalog shows a `216px` filter rail, `24px` gutter and responsive grid of 2–4 cards. A card's image well is square with centered local imagery.
- Product details use a `minmax(0, 1fr) 400px` split with `32px` gutter. Place price and stock on the purchase panel before variant, fulfillment and quantity controls. Put specifications and returns below the split.
- Cart and checkout use a `minmax(0, 1fr) 328px` split with `24px` gutter. Group cart rows in bordered sections by fulfillment and store. Use a `96px` thumbnail on desktop and `72px` at narrow widths. Checkout and returns place the available choices in the main column and a persistent review summary alongside. Constrain order history and details to `1008px` with open whitespace around status cards.
- At widths below `900px` collapse the filter rail to a dialog and use `20px` gutters. Below `700px` stack columns and move search to its own row. Use `16px` gutters, `12px` gaps, 44px targets and a two-column product grid where titles and controls still fit. At or below `360px` use one column if cards clip. Order details and return forms remain in normal page flow so buttons and statuses can scroll into view.

## 5. Component patterns

| Component | Specification |
| --- | --- |
| Primary button | Red fill, white text, `min-height: 44px`, `padding: 0 18px`, `border-radius: 8px`. Show darker fill on hover. Use clear pending and disabled labels where applicable. |
| Secondary button | White fill, text color, 1px control border, same height and radius. Outlined fulfillment tiles show an extra inset `2px` navy ring and selected marker. |
| Search and fields | White, 1px control border, `min-height: 44px`, `border-radius: 8px`, `12px` inline padding. Use labeled fields and error text immediately below invalid input. |
| Cards and lists | White background, 1px border, `12px` radius. Product image well fills the top, details use `16px` padding and pricing/actions share the bottom rhythm. Order and cart rows use `16–24px` padding and a thin divider. |
| Status and offer labels | `13 / 18px`, `4px 8px` padding, `6px` radius with an explicit text label such as Ready for pickup or Automatically applied. Use status colors plus icon or text. |
| Dialogs | `480px` max for barcode and confirm, `620px` for store picker, `16px` radius, `24px` padding with backdrop `rgba(20, 29, 35, .55)`. At narrow widths use a bottom sheet with visible close control. Restore focus to the opener on close. |

Interactivity uses predictable Tab order, Enter to submit the focused form, and Escape to dismiss dialogs. Use a visible focus indicator, labels on icon buttons, live announcements for committed cart changes and text for errors. Local images have alt text based on the product title and variant.

## 6. Shadow and elevation

Keep catalog cards and order rows flat with a border. Apply `0 4px 14px rgba(32, 55, 71, .10)` to dropdown surfaces and sticky summaries when visibly detached. Use `0 18px 56px rgba(17, 27, 33, .22)` for dialogs. Use a 120ms color and border transition and respect reduced motion.
