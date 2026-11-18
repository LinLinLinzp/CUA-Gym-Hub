# Twilio Console — Design system

## 1. Visual theme

Use a warm, light operations workspace with charcoal typography, plum navigation accents, and a single red `Twilio` text wordmark. Use crisp tables and generous gutters. A small original CSS bar chart on Overview shows message counts by status from the loaded records.

The global header spans the viewport with the wordmark at left and the account name and user initials at right. Below it, a warm navigation rail groups Phone Numbers, Messaging, and Monitor links. The Overview starts with a title and one primary action, then a row of three linked metrics followed by a wide Recent Messages panel and a narrow Delivery Status chart. Use these same surfaces and type roles throughout the account.

## 2. Color palette

| Token | Value | Use |
| --- | --- | --- |
| Wordmark | `#C52242` | Twilio brand text |
| Canvas | `#F8F6F2` | Main workspace |
| Navigation | `#F2EEE8` | Sidebar, muted panels |
| Surface | `#FFFFFF` | Header, tables, input fields, forms |
| Text | `#261F29` | Titles and body |
| Muted | `#645B67` | Captions, hints, secondary metadata |
| Border | `#DED7E0` | Table separators, cards, outlines |
| Control border | `#8B808D` | Input boundary |
| Primary | `#613C6F` | Primary buttons, links, and focus ring |
| Primary hover | `#4F305B` | Button hover |
| Selected | `#EDE2F1` | Current navigation and selected filter |
| Success | `#185A45` on `#E6F4EB` | Active, delivered, received |
| Pending | `#744900` on `#F9ECD6` | Accepted, queued, sent |
| Failure | `#95263E` on `#F9E5E9` | Failed, undelivered, destructive action |

## 3. Typography

| Role | Font | Size | Weight | Line height | Letter spacing |
| --- | --- | --- | --- | --- | --- |
| Wordmark | Segoe UI / system sans | 22 px | 750 | 26 px | -0.025em |
| Page title | Segoe UI / system sans | 34 px | 700 | 40 px | -0.025em |
| Section heading | Segoe UI / system sans | 18 px | 650 | 24 px | -0.01em |
| Table/body/control | Segoe UI / system sans | 14 px | 400–600 | 20 px | normal |
| Metadata | Segoe UI / system sans | 12 px | 500 | 16 px | normal |
| SIDs | Consolas / system monospace | 12 px | 400 | 18 px | normal |

Use tabular numbers for timestamps, counts and prices. Status badges include readable text. Keep page titles and primary actions visible without opening a menu.

## 4. Spacing and layout

- Header height 64 px, rail width 224 px, main padding 32 px, content maximum 1440 px, panel gap 20 px, card radius 12 px.
- Use a three-column metric row and a 2:1 split for the Overview detail panels. Collapse panels into a single column below 900 px.
- Below 760 px use 16 px main padding, an accessible navigation drawer, wrapped filter controls, and horizontal scrolling inside table panels. Keep actions and pagination reachable.
- Large lists use 48 px minimum rows, 16 px horizontal cell padding, a 40 px column header row, and a pagination footer.

## 5. Components

- Primary buttons use a 40 px minimum height, 8 px radius, 14 px semibold white text on the primary token, and 14 px horizontal padding. Secondary buttons use a white surface, plum text, and visible outline. Destructive actions use the failure color and a named confirmation.
- Labeled form inputs use a 40 px minimum height, 8 px radius, 12 px horizontal padding, and a visible border. Use a 2 px focus ring with 2 px offset. Match errors to fields and announce submission results.
- White table and form cards use a 1 px border. Rows have a subtle selection or hover fill, and row links remain reachable by keyboard. Use a consistent link label or an accessible name that identifies the row.
- Use a centered, 480 px maximum-width purchase/release confirmation with 24 px internal padding, a clear heading, and visible Cancel and confirmation controls. Trap and restore focus and support Escape. Number and service details use page sections and visible Save controls.
- Use a single filter toolbar with accessible labels, an applied result count, and Clear filters where appropriate. Use neutral empty panels with a relevant action such as Clear filters or Buy a Number.
- Build chart bars and swatches in CSS. Use text labels, visible values, and built-in or locally drawn UI primitives. Keep the account header and tables free of ornamental artwork.

## 6. Elevation

Use borders to define cards and tables. Use `0 8px 24px rgba(38, 31, 41, 0.10)` for popovers and `0 20px 56px rgba(38, 31, 41, 0.22)` for dialogs over `rgba(38, 31, 41, 0.46)`.
