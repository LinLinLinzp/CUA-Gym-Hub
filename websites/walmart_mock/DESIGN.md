# Design system inspired by Walmart

## Visual theme

Use Walmart as the text brand, blue for primary actions and yellow as a small accent. The public references show prominent search, nearby-store context, large product photos, and clear purchase actions. The app uses a white masthead, a separate pale-blue navigation row, rectangular controls, and compact lists for account workflows. This gives shopping, pickup, and purchase history a consistent layout across screen sizes. [Walmart brand refresh](https://corporate.walmart.com/news/2025/01/13/walmart-introduces-updated-look-and-feel-a-testament-to-heritage-and-innovation)

## Color tokens

The blue and yellow draw from Walmart's public material. The remaining values define the app's palette.

| Token | Value | Use |
|---|---|---|
| `--brand-blue` | `#0053E2` | Primary buttons, active navigation indicator, constructive links |
| `--brand-blue-hover` | `#003DAA` | Hover or pressed primary action |
| `--ink` | `#152543` | Wordmark, headings, prices and main text |
| `--muted` | `#485870` | Secondary details and helper text |
| `--accent` | `#FFC220` | Small highlight behind a savings label with dark text |
| `--page` | `#F6F8FC` | Canvas behind cards |
| `--surface` | `#FFFFFF` | Masthead, cards, overlays |
| `--panel-blue` | `#EAF2FF` | Navigation row, selected slots, pickup summary |
| `--border` | `#D7DFEB` | Card boundaries and row dividers |
| `--input-border` | `#7889A1` | Input and neutral control outlines |
| `--success-text` / `--success-bg` | `#14633C` / `#EAF6EF` | Fulfilled and confirmed statuses |
| `--warning-text` / `--warning-bg` | `#734B00` / `#FFF3D1` | Expiring reservation and order cutoff |
| `--error-text` / `--error-bg` | `#9B1C31` / `#FFF0F1` | Validation, unavailable item and destructive action |

## Typography

Use locally bundled Inter with `system-ui, sans-serif` fallback. Use tabular numerals for totals, quantities, and aligned dates.

| Role | Size | Weight | Line height | Letter spacing |
|---|---:|---:|---:|---:|
| Text wordmark | 24 px | 800 | 28 px | -0.5 px |
| H1 | 32 px | 750 | 38 px | -0.6 px |
| H2 | 22 px | 700 | 28 px | -0.2 px |
| H3 | 17 px | 650 | 24 px | 0 |
| Body, search, inputs | 16 px | 400 | 24 px | 0 |
| Buttons | 14 px | 650 | 20 px | 0 |
| Price total | 22 px | 750 | 28 px | -0.3 px |
| Secondary details | 13 px | 500 | 18 px | 0 |

## Spacing and layout

- Use a 4 px spacing grid with 8, 12, 16, 24, 32 and 48 px intervals. Center content at a 1320 px max width with 32 px side gutters on desktop and 16 px on small screens.
- The desktop masthead is 68 px tall with a text wordmark, rectangular search field and Cart control. Beneath it, use a 48 px navigation row for Shop, Pickup, Purchase history and Registry. Place the upcoming pickup store/window in a contextual panel below this row when relevant.
- The home view leads with one feature area and a pickup shortcut, then a department grid and item cards. Use checkout-relevant content and local, realistic images. Use a 1:1 product image well with `object-fit: contain`.
- At 1100 px and wider, use a 224 px sidebar and four columns of results where space allows. Use a fluid lines column and a 320 px summary with a 24 px gap for cart and checkout. Purchase history uses a full-width list with date and order number leading the row and the action trailing it.
- Below 900 px, place search on its own masthead row, use horizontally scrollable navigation, and bring filters into a dialog. Stack checkout and detail grids. Use two product columns on typical phones, with one column below 360 px. Maintain readable order status, line names and totals at 390 px.

## Component patterns

| Component | Specification |
|---|---|
| Button | 44 px minimum height, 16 px horizontal padding, 8 px radius. Primary uses blue fill and white text. Secondary uses white fill, blue text and a 1 px border. Destructive confirmation uses error color with a clear action name. |
| Search and form input | 44 px minimum height, 8 px radius, 12 px inline padding and a 1 px input border. Provide persistent form labels and inline error text linked to the invalid field. Search has a clear control and a submit button. |
| Card and line item | White surface, 1 px border, 12 px radius and 16–20 px padding. Price and quantity stay adjacent to purchase actions. Use 72 px product thumbnails for cart and 56 px for purchase history previews. Use 44 px target sizes for quantity controls. |
| Status | Use short labels with a semantic color and text. Place stock, eligibility and cutoff labels by the relevant line or action. Omit badges that repeat adjacent copy. |
| Pickup picker | Desktop uses a store selector and date strip above a two-column grid of 56 px radio tiles. Mobile uses one column. Show time range, fee and availability on each tile. Show the chosen slot in a compact summary near Reserve or Save changes. |
| Purchase history and order detail | Use a bordered row list with a search/filter toolbar. Detail places status, cutoff and relevant actions near the order number and receipt totals beside the line list on desktop. |
| Return steps | Use a 760 px form column for Items, Details, Method and Review. Keep persistent item labels and show a small reviewed total close to Submit. Use text to explain ineligibility. |
| Registry item | Manage view uses product rows with requested and purchased quantities. Recipient view uses product cards and a clear Mark as purchased action when the registry still requests more units. |
| Dialog | 480 px common width, 24 px padding, 12 px radius, and at most viewport width minus 32 px. Keep focus within it, close on Escape where safe and return focus to the invoking control. Use dialogs for confirmation and picking a target registry. |
| Feedback | Use inline feedback for rejected changes and a short confirmation for successful saves. Place persistent confirmation information in the owning view. Use a visible 2 px focus ring with 2 px offset and keyboard-operable choices. |

## Shadow and elevation

- Cards use a border for separation. Apply `0 2px 8px rgba(21, 37, 67, 0.08)` to elevated summaries.
- Popovers use `0 8px 22px rgba(21, 37, 67, 0.16)`.
- Dialogs use `0 16px 44px rgba(21, 37, 67, 0.22)` with a `rgba(21, 37, 67, 0.48)` backdrop.

See the screenshot notes in [assets/README.md](assets/README.md) for the source of each visual reference.
