# Uber rider account design

## Visual direction

Use the visual language of a transit timetable and a paper receipt. A narrow navy masthead and a centered navigation strip frame a warm off-white page. The overview pairs a trip ledger with a compact set of receipt and support shortcuts. Use the name “Uber” as ordinary text in the masthead. The hierarchy, colors, typography and artwork are original to this account UI.

Draw the route illustration with local CSS and HTML. On the overview banner, use a faint repeating street grid, an angular two-tone route, and two circular endpoints. At desktop widths the art occupies the right third of the banner and stays clear of heading text. In trip detail, use a pickup circle and destination square connected by a vertical dashed line. The addresses remain real text. Render payment brands as text beside the masked digits. Use original local line icons or simple CSS shapes for navigation and controls. Hide decorative art from assistive technology.

## Color roles

| Role | Token | Value |
| --- | --- | --- |
| Masthead and primary ink | `--ink` | `#152840` |
| Page background | `--canvas` | `#F6F4ED` |
| Panels | `--surface` | `#FFFEFA` |
| Body text | `--text` | `#243648` |
| Secondary text | `--muted` | `#536274` |
| Separators and decorative outlines | `--line` | `#D9DFDF` |
| Input border | `--control-line` | `#748292` |
| Links, focus and primary actions | `--action` | `#174FB7` |
| Action hover | `--action-hover` | `#123B91` |
| Active tab and selected row | `--selected` | `#E5EDFC` |
| Overview banner | `--banner` | `#E9EFFB` |
| Success ink and background | `--success`, `--success-bg` | `#17644E`, `#E4F2EB` |
| Pending ink and background | `--warning`, `--warning-bg` | `#744700`, `#FBEDD4` |
| Error ink and background | `--error`, `--error-bg` | `#A02939`, `#FCEBEF` |

Use text in every status chip. Blue marks rider actions and selection. Use a 2px action-color focus outline with 3px offset, and a light outline on the navy masthead. Keep interactive labels readable at 200% zoom and verify contrast for text and form controls.

## Typography

| Role | Stack | Size / line height | Weight | Tracking |
| --- | --- | --- | --- | --- |
| Page heading | Georgia, serif | 42 / 46 px | 700 | −0.03 em |
| Section heading | Georgia, serif | 25 / 32 px | 700 | −0.02 em |
| Masthead brand text | system-ui, sans-serif | 24 / 30 px | 700 | −0.03 em |
| Body and form labels | system-ui, sans-serif | 15 / 23 px | 400 / 600 | normal |
| Navigation and controls | system-ui, sans-serif | 14 / 20 px | 600 | normal |
| Dates, IDs and totals | ui-monospace, Consolas, monospace | 13 / 20 px | 500 | normal |

Use tabular numerals for money and align line item amounts on the right. Reserve monospace for values that benefit from alignment or identification.

## Layout

- Masthead 60px tall, with the brand at the left of the content grid and rider initials and name at the right. Keep the rider identity static unless a supported destination is attached.
- Navigation strip 52px tall with a bottom rule. Overview, Trips, Receipts, Expense profiles, Lost items and Refunds share one row at desktop widths. The active item gets tinted background and a 2px underline. Use `aria-current` on the active destination.
- Center content at 1200px max-width with 36px desktop gutters, 24px section gaps and 32px top spacing. Overview banner uses 26px padding and a 10px radius. Its heading is “Your rider account.” Below, give Recent trips two thirds of the available space and task links the remaining third.
- Use full-width list panels. Search and labelled filters precede the rows. Keep secondary numeric and status columns aligned and show the active trip link clearly. Detail pages put the main record in a wider left column and related account actions or summary in the right column.
- At 840px, stack overview and detail columns. At 600px, use 16px gutters, a 34px page heading, a horizontally scrollable navigation strip and stacked filter controls. Ledger rows become vertically grouped, with field names retained where helpful. Keep primary actions visible at 360px and preserve the page width.

## Components and feedback

- Primary button uses a 44px minimum height, 16px inline padding, 8px radius, blue fill and white text. Secondary button uses paper fill and a 1px input border. Destructive confirmation uses error ink with a labelled action.
- List panels use a paper surface, 1px rule and 10px radius. Rows use 14px vertical and 16px horizontal padding. Give row links a visible focus state and keep secondary actions independent of row navigation.
- Inputs use the same 44px height and 8px radius, with an external visible label. Place validation near its field and associate it programmatically. Keep entered data on validation failure. Use date and numeric inputs for ranges and requested amounts where appropriate.
- Form dialogs use a 560px maximum width, 24px padding and 12px radius. Larger fare request forms may be inline. Dialogs manage focus, support Escape, return focus to their trigger when dismissed, and scroll internally on small screens. Use a clear primary action and Cancel button.
- Display action confirmations beside the relevant record or in a polite live region. Default empty lists describe the missing content and expose the relevant action when one is available. Filtered empty lists show a clear-filters control.

## Elevation

Use borders across the ledger and form surfaces. Cards may use `0 1px 2px rgba(21, 40, 64, 0.06)`. Menus use `0 8px 24px rgba(21, 40, 64, 0.12)`. Modal scrim uses `rgba(21, 40, 64, 0.46)` and dialog shadow uses `0 16px 44px rgba(21, 40, 64, 0.18)`.
