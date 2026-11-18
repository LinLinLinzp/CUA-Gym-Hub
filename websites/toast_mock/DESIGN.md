# Toast operations workspace

## Visual direction

Give the workspace the warmth of a neighborhood restaurant and the density of an operations ledger. Use a deep aubergine navigation rail, warm ivory canvas, cream-white work surfaces, and coral for primary actions. Set the Toast wordmark as plain text. A restrained serif heading and a workmanlike system sans body give the overview an editorial feel while keeping tables easy to scan.

## Color tokens

| Role | Value | Use |
| --- | --- | --- |
| Canvas | `#F7F3EC` | Main background |
| Surface | `#FFFDF9` | Tables, cards, dialogs |
| Rail | `#231923` | Left navigation |
| Rail active | `#432D3C` | Current route |
| Rail text | `#FFF7EF` | Main navigation text |
| Rail muted | `#CDBBC6` | Location and role |
| Text | `#2C2029` | Headings and body |
| Muted | `#6C5C65` | Secondary text |
| Border | `#E4DBD3` | Dividers and surface outlines |
| Primary | `#AE3F29` | Filled action with white text, links |
| Primary hover | `#8B3020` | Filled action hover |
| Accent | `#F5B39E` | Wordmark accent or selected nav rule |
| Focus | `#634B9B` | 2px focus ring on light surfaces |
| Success | `#235B44` on `#E4F2E7` | Published, paid, closed |
| Warning | `#6D4518` on `#F7E8CF` | Draft, open, partial refund |
| Error | `#8B302B` on `#F9E5DE` | Voided, unavailable, validation |

## Typography

| Role | Font | Size / line height | Weight | Tracking |
| --- | --- | --- | --- | --- |
| Wordmark | Georgia, serif | 30 / 34 px | 700 | −0.04em |
| Page heading | Georgia, serif | 40 / 46 px | 400 | −0.035em |
| Section heading | Segoe UI, system-ui, sans-serif | 19 / 26 px | 650 | −0.015em |
| Table and body | Segoe UI, system-ui, sans-serif | 14 / 21 px | 400 | Normal |
| Form label and navigation | Segoe UI, system-ui, sans-serif | 14 / 20 px | 600 | Normal |
| Metadata and badge | Segoe UI, system-ui, sans-serif | 12 / 18 px | 600 | Normal |

Use tabular numerals for prices, times, and check identifiers. Keep a visible label with each navigation icon. Use uppercase sparingly for table headers.

## Layout

- Desktop rail 224 px wide, fully visible at 1280 × 800. Wordmark and location sit at the top. Main navigation follows. The manager identity anchors the bottom.
- Utility bar 60 px high with location context and current business date. Main content padding 32 px with a 1,280 px maximum width, 24 px between page sections, and 16 px between summary cards.
- Page header pairs a title with one primary action when available. Filter controls sit below the header and above the table. Use a single bordered table surface with 52 px rows, 16 px cell padding, and clear row actions.
- Order details use a main ledger and a 320 px summary card, with the ledger first at narrow widths. Form dialogs are 540 px wide. The refund review can use 640 px to keep amounts beside line names. Keep actions visible while long forms scroll.
- Below 960 px, reduce content padding to 20 px and let table controls wrap. Below 720 px, place navigation in a labeled horizontal bar, stack summaries and detail columns, and contain table overflow within its surface.

## Components and elevation

- Primary buttons use a 40 px minimum height, 8 px radius, and 14 px semibold label. Secondary actions use a surface fill, 1 px border, and dark text. Destructive actions have a named confirmation.
- Inputs use a 40 px minimum height, 8 px radius, persistent labels, and linked inline validation. Dialogs restore focus to their trigger. Use visible keyboard focus on all controls and a screen-reader status region for commit feedback.
- Cards and tables use 12 px radii and a 1 px border. Quiet panels have no shadow. Use `0 12px 40px rgb(35 25 35 / 16%)` for floating dialogs and a `rgb(35 25 35 / 40%)` scrim.
- Use original local visuals where they help identify a section. A simple CSS-built warm rule and block pattern can frame the overview heading. Navigation uses icons from an installed offline package. Use text initials for the manager avatar and text status labels with color.
