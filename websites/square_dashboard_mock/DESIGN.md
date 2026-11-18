# Square Dashboard design system

## 1. Visual theme and atmosphere

Build a warm, editorial workspace for a small home-goods merchant. The top of the app is a continuous plum account bar with the Square name set in ordinary text, a horizontal route navigation, and the signed-in account at the far right. Use an oat canvas, white working surfaces, a serif editorial heading and compact sans-serif controls. Keep the navigation at the top across all widths.

On Overview, pair an orders and sales workspace with a narrower balance card. Build the sales chart from the local order data. For the balance card use a small original CSS line pattern in the corner with the text and controls placed clear of it. Item thumbnails may use original local artwork or CSS category swatches with initials. All visual assets and font files ship with the site.

## 2. Color palette and roles

| Role | Value | Use |
| --- | --- | --- |
| Account bar | `#2C202D` | Global navigation background |
| Account bar text | `#FFF8F0` | Square text, active routes, signed-in identity |
| Account secondary | `#DCCFDA` | Inactive routes and location context on plum |
| Canvas | `#F6F1E9` | Workspace background |
| Surface | `#FFFEFC` | Forms, lists and working cards |
| Primary text | `#272229` | Page headings, table data and labels |
| Muted text | `#62585F` | Metadata and field hints |
| Primary action | `#54344E` | Filled action with white text and text links |
| Primary hover | `#42263E` | Hovered filled action |
| Accent | `#B85940` | Chart line and selected navigation marker |
| Accent on plum | `#F1A48D` | Active navigation underline |
| Border | `#E4D9D2` | Card edge and dividers |
| Control border | `#9B8C94` | Input boundary |
| Focus | `#8C3B6D` | Focus ring on light surfaces, use `#F1A48D` on plum |

| Status | Ink | Fill | Examples |
| --- | --- | --- | --- |
| Positive | `#205439` | `#E3F0E5` | Completed, paid, active |
| Attention | `#704308` | `#FBEDD3` | Pending, ready |
| Neutral | `#514158` | `#EEE7F0` | New, in progress, archived |
| Critical | `#842E38` | `#FBE7E6` | Failed, canceled, field error |

## 3. Typography rules

Use `Georgia, Cambria, serif` for page titles and `system-ui, -apple-system, "Segoe UI", sans-serif` for controls and content. Use `font-variant-numeric: tabular-nums` for amounts, counts and timestamps in tables.

| Role | Family | Size | Weight | Line height | Tracking |
| --- | --- | --- | --- | --- | --- |
| Square text | Sans | 23px | 700 | 28px | -0.5px |
| Page heading | Serif | 42px desktop, 32px narrow | 400 | 1.12 | -0.8px |
| Section heading | Sans | 19px | 650 | 25px | -0.2px |
| Metric amount | Serif | 32px | 400 | 38px | -0.6px |
| Body and controls | Sans | 14px | 400, 600 for actions | 21px | 0 |
| Table labels and metadata | Sans | 12px | 500 | 17px | 0.1px |

## 4. Spacing and layout

- Use a 4px spacing base with 8, 12, 16, 24, 32 and 40px steps. The top bar is 72px tall on desktop. Bar and workspace align to a max-width of 1320px with 32px side padding and 32px top padding.
- Use two columns in Overview, about 2:1, with a 24px gap. Working cards have 20–24px padding, a 16px radius and 1px border. Items, Orders, Refunds and Payouts use a wide table below the page title and filter row. Desk-height rows target 56px. Keep currency right-aligned and status consistently placed.
- At widths below 900px, move navigation to its own horizontally scrollable row, reduce the side padding to 20px and wrap the filter row. At widths below 700px, use a single-column grid and 16px side padding. Let wide tables scroll inside their own container.

## 5. Component patterns

- **Navigation.** Links are 14px with 16px of inline padding and a 44px minimum hit area. Indicate the current route with `aria-current="page"` and a 3px warm underline. Place the merchant and seller on a separate right-aligned account block that can wrap below the brand on narrow screens.
- **Buttons.** Use `min-height: 40px`, `padding: 0 14px`, and `border-radius: 9px`. The primary button uses the plum action color. Secondary buttons use the surface with a 1px control border. Include visible hover, pressed, disabled and focus-visible styles. Use an action verb and object where space allows.
- **Inputs and filters.** Use a visible label on form fields and clear labels for search and filters. Controls are at least 40px tall with a 1px control border and an 8px radius. Use a 2px focus ring and a 2px offset. Place validation text beside or directly beneath the affected control. Update a result count when a filter changes.
- **List and detail.** Use a contrasting table header and subtle horizontal separators. Link the item name, order number, refund ID or payout ID with a visible focus target. Keep detail views URL-addressable with a clear return link. Use a 2:1 main/summary grid on wide details and stack it on narrow screens. Put a clear recovery action in empty search results and missing-record pages.
- **Forms and dialogs.** Use a route-based item editor, a 520px maximum dialog for transfer/refund review, and a 380px maximum dialog for confirmation-only actions. Use an 18px radius and 24px padding on dialogs. Move focus into the dialog on open, contain keyboard focus, support Escape before confirming, and restore focus when the dialog closes. Stack footer buttons when space is limited.
- **Feedback.** Use text in every status pill and include inline confirmation near the changed record. Announce action completion in a polite live region. Use a short opacity transition where appropriate and respect `prefers-reduced-motion`.

## 6. Shadow and elevation

| Surface | CSS |
| --- | --- |
| Card | `0 1px 2px rgb(44 32 45 / 5%)` |
| Dropdown | `0 8px 20px rgb(44 32 45 / 14%)` |
| Dialog | `0 24px 64px rgb(44 32 45 / 25%)` |
| Backdrop | `rgb(44 32 45 / 45%)` |
