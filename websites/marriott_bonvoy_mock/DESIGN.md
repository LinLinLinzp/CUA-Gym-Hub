# Marriott Bonvoy account design

## Visual direction

Use an editorial travel journal as the visual reference for this original account workspace. Arrange a warm paper canvas around an ink-colored vertical rail, with a generous opening above compact lists. Set “Marriott Bonvoy” in plain text in the navigation. Pair it with a warm coral accent and a muted olive status palette. Give the overview one original, local abstract architectural illustration of layered archways and daylight, created for this app with CSS shapes or authored bitmap art. Keep artwork in the overview so forms and lists have room for task information.

## Color

| Token | Value | Role |
| --- | --- | --- |
| Ink | `#232325` | Navigation rail and primary text |
| Paper | `#F6F3EB` | Main canvas |
| Surface | `#FFFCF7` | Cards, fields and dialogs |
| Muted | `#66615A` | Secondary text on paper |
| Line | `#DDD7CB` | Dividers and card borders |
| Accent | `#AB4234` | Primary action and inline links |
| Accent hover | `#883126` | Primary action hover |
| Rail text | `#F6F3EB` | Brand and navigation text |
| Rail selected | `#393636` | Active row on dark navigation |
| Success | `#315844` on `#E5EEE5` | Completed and available |
| Pending | `#744F18` on `#F7ECD4` | Submitted and in review |
| Error | `#9D302D` on `#F8E6E2` | Invalid fields and destructive actions |

## Typography

| Role | Family | Size / leading | Weight |
| --- | --- | --- | --- |
| Overview headline | Georgia, serif | 48 / 52 px desktop, 34 / 38 px small | 400 |
| Page headline | Georgia, serif | 38 / 44 px | 400 |
| Section title | Georgia, serif | 24 / 30 px | 400 |
| Brand | System UI, sans-serif | 18 / 22 px | 650 |
| Body, inputs | System UI, sans-serif | 15 / 22 px | 400 |
| Label, button | System UI, sans-serif | 14 / 20 px | 600 |
| Metadata | System UI, sans-serif | 13 / 18 px | 400 |

Use tabular numerals for balances, totals, and date columns. Give positive and negative points a visible sign and give status chips a text label.

## Layout

- Desktop rail is 228 px wide with 20 px insets, a text wordmark above the five destinations, and the member name and tier near the bottom. Use a 4 px accent marker and a tinted row for the current destination.
- Main area uses 40–48 px gutters, a 1120 px content maximum, 24 px between sections, and 16 px between related panels. The overview starts with heading and identity or balance beside the original artwork, followed by a next stay card and recent activity. Link to full workflows from the relevant summary.
- On list pages, stack title, controls, results, then paging. Keep the primary action aligned with the page title on wide screens and place it below the title when space is limited. Default to 12 results per page after filtering and sorting, with the visible range and visible paging controls.
- Give record detail pages a back link, identifier or property title, and a summary before secondary content. Folio charges use a semantic table with right-aligned numbers. At narrow widths, list rows stack their labeled fields and the folio table scrolls within its container if needed.
- Below 760 px, move navigation into a compact top header with a wrapping row of destinations, use a 20 px content inset and stack the overview and forms into one column. Keep keyboard focus within the visible viewport.

## Components and elevation

- Use 12 px surface radii, 1 px solid borders and 20 px padding. Let the list panel use row dividers, with clickable titles and explicit row actions.
- Primary actions have a 44 px minimum height, 8 px radius, accent fill and white text. Secondary actions use the surface color and a 1 px border. Inline links use the accent with an underline. Use a 2 px visible focus outline offset by 3 px.
- Inputs pair permanent labels with helpful inline errors. Use 44 px controls, 8 px corners and sufficient spacing for long select labels. Return focus to the triggering control when a dialog closes.
- Confirm update, cancellation and withdrawal in a dialog with clear consequences and explicit confirmation. Keep the dialog under 480 px wide, use a `rgba(35,35,37,.5)` backdrop and allow scrolling inside the viewport.
- Use flat lists and cards, with a slight `0 2px 10px rgba(35,35,37,.06)` shadow limited to the overview focal panel and `0 16px 48px rgba(35,35,37,.22)` for dialogs. Communicate success through a visible confirmation and an accessible live region.
