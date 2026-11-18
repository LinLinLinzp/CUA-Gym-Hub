# ShipStation workspace design

## 1. Visual theme

Use a warm-neutral canvas, evergreen accents, and a vertical linen-colored navigation rail. Build the workspace around a spacious page header and compact lists on white surfaces, with a stable summary panel on record pages. Use “ShipStation” as plain typeset text. Use only original, local assets: CSS-drawn accents, locally authored line icons, and a typeset label preview.

At 1440 × 900, show the four destinations and account identity in the rail, with the page title, primary action, queue filters, and the first order rows visible together. Place the active status filters in a horizontal strip within the main canvas. Keep the top strip for the breadcrumb on detail pages and the current section name on list pages.

## 2. Color

| Token | Value | Use |
| --- | --- | --- |
| Canvas | `#F8F7F3` | Main background |
| Rail | `#F0EEE6` | Navigation and account footer |
| Surface | `#FFFFFF` | Lists, forms, dialogs |
| Text | `#202A26` | Headings, labels, table body |
| Muted text | `#56635C` | Secondary detail and supporting copy |
| Border | `#DEDCD2` | Table rules and card separators |
| Control border | `#858F85` | Editable input outlines |
| Evergreen | `#195C43` | Primary action and linked text |
| Evergreen hover | `#124731` | Primary hover |
| Evergreen tint | `#DCECE2` | Selected nav and active chips |
| Focus | `#176A50` | Three-pixel focus ring with two-pixel offset |
| Ready/info | `#E8EFF8` / `#294E78` | Awaiting Shipment, Outstanding, Open |
| Success | `#E1F0E7` / `#205D42` | Active, Shipped, Processed, Received |
| Warning | `#F8ECD5` / `#74480D` | Awaiting Payment, On Hold |
| Danger | `#F8E8E5` / `#882F28` | Cancelled, Voided, error feedback |
| Neutral | `#EEECE6` / `#505A54` | Archived and secondary badges |

## 3. Typography

Use the system sans stack `"Segoe UI", system-ui, sans-serif` with tabular numerals for money, counts, and dates. Use the same stack for the text wordmark. Keep title case for navigation and named actions, with sentence case for messages.

| Role | Size / line height | Weight | Tracking |
| --- | --- | --- | --- |
| Wordmark | 21 / 26 px | 750 | -0.5 px |
| Page title | 36 / 42 px | 700 | -1.1 px |
| Panel or form heading | 19 / 26 px | 650 | -0.2 px |
| Body and buttons | 14 / 20 px | 400–600 | Normal |
| Table rows | 13 / 19 px | 400–600 | Normal |
| Table labels and secondary copy | 12 / 18 px | 450–650 | Normal |

## 4. Layout

- Navigation rail width 224 px, with 20 px horizontal inset, 44 px navigation rows, 4 px between rows, and account identity at the bottom. Use a two-letter initials avatar in a 34 px circle.
- Main strip height 58 px. Content padding 36 px desktop, 24 px at widths under 1100 px, and 16 px at widths under 760 px. Place the page header 26 px below the strip. Align the primary action to the page title on wide screens.
- Queue status filters align horizontally, with 8 px gaps and an overflow scroll at narrow widths. Leave 16 px between filters and the results card. Card radius 14 px; header tool strip and footer use 16 px padding.
- Table headings 42 px high with a warm-gray fill. Data rows have a 52 px minimum height, 16 px inline cell padding, and subtle separators. Use a 20 px gap between detail columns. Allocate approximately 65% to the body and 35% to the summary panel. Collapse to one column below 1000 px.
- Below 760 px use a horizontal scrolling row of the four navigation destinations below the wordmark. Wrap toolbars and allow the table to scroll inside its card. Keep page-level scrolling vertical.

## 5. Components

- **Section rail.** Set icon size to 18 px, icon gap to 10 px, and row radius to 8 px. Emphasize the active label with 650 weight and an evergreen tint.
- **Primary action.** Height at least 40 px, 14 px horizontal padding, 8 px radius, evergreen fill, and white text. Secondary actions use white fill and a 1 px neutral border. Use the danger text and tinted surface for destructive confirmation.
- **Input and selection.** Use 40 px controls, 8 px radius, 12 px inner padding, visible labels, and errors below the relevant fields. A checkbox in the header selects the current page only and supports the indeterminate state. Show the selected count next to the available actions.
- **Status badge.** Use palette pairs above with text, 7 px horizontal padding, 3 px vertical padding, and a pill radius. Preserve text when color contrast changes.
- **Details.** Use a breadcrumb and stable record title. Group related sections under concise headings with a 1 px border, 14 px radius, and 20 px padding. Display actual record links inside the summary.
- **Forms and confirmations.** Center dialogs with a 640 px maximum width for editors and 460 px for confirmations. Constrain height to the viewport and scroll the content above the footer. Keep accessible names, visible labels, an Escape close action, focus containment, and focus restoration. Use a compact inline status region for success, warnings, and errors.
- **Label previews.** Typeset a local 4:6 portrait label with address panels, service, tracking text, and an internal reference. Use simple preset bars as a decorative graphic outside the meaningful tracking text. Mark the printout “Sample postage” so it is distinguishable from a carrier document.
- **Empty states.** Preserve the search controls when nothing matches and provide Clear Filters. With a genuinely empty list, expose the applicable existing create action. Render missing fields as an em dash or an explicit empty detail state.

## 6. Elevation

Use `0 1px 2px rgba(32, 42, 38, 0.06)` for cards, `0 8px 24px rgba(32, 42, 38, 0.14)` for popovers, and `0 24px 70px rgba(32, 42, 38, 0.20)` for dialogs over a `rgba(32, 42, 38, 0.40)` backdrop.
