# KAYAK Account Design

## 1. Visual theme

Design this account as a travel folio. Use a warm paper background, ink-blue navigation and a terracotta action color. Make the workspace feel like an organizer with itinerary cards, ruled lists and a vertical trip timeline. Set **KAYAK** as plain uppercase type in the masthead.

On the Trips index, use a 156 px high wide feature panel with the title and New trip action on the left. On the right, include a locally authored abstract route illustration with a dotted curve, two waypoints and pale contour arcs. Draw it in CSS as a local asset or create an original local raster. Keep it decorative and hidden from assistive technology. On small screens, leave the space to the title and action. Use compact title bars for Alerts and Bookings where the records are the focus.

## 2. Color palette

| Role | Value | Use |
| --- | --- | --- |
| Brand text and navigation | `#142A34` | Wordmark, headings, active navigation text |
| Workspace | `#F7F5EF` | Application background |
| Surface | `#FFFFFF` | Cards, masthead, inputs and dialogs |
| Feature panel | `#E7EFE9` | Trips title panel |
| Body text | `#1E3038` | Main text |
| Secondary text | `#4F626B` | Dates, descriptions and quiet labels |
| Main action | `#A43D28` | Primary buttons with white text |
| Main action hover | `#85301F` | Primary button hover |
| Link and focus | `#185D70` | Text links and visible focus ring |
| Divider | `#D8DCD7` | Cards, row separators |
| Input outline | `#899891` | Inputs, secondary buttons |
| Neutral status | `#EDF0EE` / `#40534B` | Past, completed and paused |
| Positive status | `#E0F0E8` / `#20563E` | Upcoming, active and confirmed |
| Attention status | `#F6E9CC` / `#654B12` | Planning and pending |
| Error | `#FBECE9` / `#932B28` | Inline errors and destructive actions |

Pair all status colors with text labels. Use a dedicated focus ring even on active controls.

## 3. Type

Use Georgia for display headings and system UI text (Segoe UI on Windows) for navigation, controls and data. Use tabular digits for prices and itinerary times.

| Role | Size / leading | Weight | Tracking |
| --- | --- | --- | --- |
| KAYAK masthead text | 22 / 26 px | 800 | 0.12 em |
| Page heading | 40 / 46 px | 700 | −0.025 em |
| Mobile page heading | 32 / 37 px | 700 | −0.02 em |
| Section heading | 22 / 28 px | 700 | −0.01 em |
| Record title | 17 / 23 px | 650 | Normal |
| Body and controls | 15 / 22 px | 400 / 600 | Normal |
| Caption and status | 13 / 18 px | 500 / 600 | Normal |

## 4. Layout

- Desktop at 1024 px and up uses a 64 px masthead and a centered shell up to 1320 px wide with 32 px outer padding. Use a 224 px navigation rail, 32 px column gap and a fluid workspace. Keep page headers, toolbars and records on the same left edge.
- Navigation links have a 44 px minimum height and 10 px radius. Use a muted teal background and an inset rule for the current view and mark it with `aria-current`. Show the account initials and name in the masthead.
- Use 24 px between page sections and 16 px between records. Use a two-column trip grid at workspace widths of 640 px or more. Keep booking and alert rows in a single column. Align repeated data such as amount and date on desktop.
- Below 1024 px, put navigation in a horizontal bar below the masthead and reduce outer padding to 24 px. Below 600 px, use 16 px outer padding, stack the toolbar controls and row metadata, and collapse trip cards to one column. Preserve access to all actions without horizontal scrolling at 360 px.

## 5. Components

- Primary button uses a 44 px minimum height, 8 px radius and 16 px horizontal padding. Secondary button uses a white surface and a 1 px input-outline border. Apply a 2 px focus ring with a 2 px offset. Use direct action labels such as New trip, New alert and Add booking.
- Text inputs, selects and date inputs use a 44 px minimum height, 8 px radius and visible labels. Put field errors next to their controls. Put search and filters in a wrapping toolbar with a 12 px gap. Announce search results without shifting focus.
- Cards use a 14 px radius, 1 px border and 18 px padding. A trip card links with its title and includes destination, dates, item count and status. Alert and booking lists use similar typography with separators between records. Keep dates, prices and status legible on narrow screens.
- The itinerary uses a single vertical rail with a heading for each date, a fixed-width time column when space permits, and event content next to it. Link booking entries to receipt details and keep manual entries editable from their row.
- Use a 540 px maximum dialog width, 24 px padding and 16 px radius. Give long forms an internal scroll area and keep the action row reachable. On small screens make dialogs fit within the viewport. Set initial focus appropriately, trap focus, support Escape and restore focus to the invoking control. Confirm deletion by naming the affected record.
- Use an inline empty state with a heading and the action for that view. Keep status feedback concise and announce successful saves in an `aria-live` region.

## 6. Elevation

Keep most surfaces flat. Featured cards may use `0 2px 6px rgba(20,42,52,.06)`. Use `0 8px 24px rgba(20,42,52,.14)` for floating menus and `0 20px 60px rgba(20,42,52,.22)` for dialogs, with an `rgba(20,42,52,.45)` backdrop.
