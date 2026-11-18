# LexisNexis research workspace design

## Visual theme

Build an editorial workspace with an ink-blue navigation rail, a warm paper canvas and white reading surfaces. On the workspace landing page, place a broad research panel above two compact sections for recent folders and unread alerts. Section pages prioritize lists, labeled metadata and a consistent action slot beside the heading. Render LexisNexis as a text wordmark. Use CSS for an original, subtle repeating rule pattern in the search panel and locally bundled functional icons.

## Color palette

| Role | Color | Use |
| --- | --- | --- |
| Navigation | #182C37 | Rail and compact navigation backdrop |
| Navigation selection | #294550 | Current route with an inset #8DD5C8 edge |
| Canvas | #F7F5F0 | Main background |
| Surface | #FFFFFF | Panels, inputs and record lists |
| Search panel | #E8F3EF | Landing search background |
| Strong text | #1D303A | Headings, labels and body copy |
| Secondary text | #52616A | Supporting metadata |
| Border | #D8DFDB | Dividers and panel outlines |
| Primary action | #14665B | Buttons, selected filters and links |
| Primary hover | #0D5149 | Filled button hover |
| Focus | #137FA2 | 2px outline with 3px offset |
| Positive | #215C42 on #E5F3EB | Positive treatment and active status |
| Caution | #79510C on #FFF2D5 | Caution, paused and expired states |
| Negative | #8B2F34 on #FAE8E7 | Negative treatment and destructive controls |
| Neutral | #465864 on #EEF1F3 | Neutral treatment, archive and general metadata |

## Typography

| Role | Font | Size | Weight | Line height | Tracking |
| --- | --- | --- | --- | --- | --- |
| Page title | Georgia, serif | 38px | 400 | 1.14 | -0.035em |
| Document title | Georgia, serif | 32px | 400 | 1.18 | -0.025em |
| Section title | system-ui, sans-serif | 18px | 650 | 1.35 | -0.01em |
| Body and controls | system-ui, sans-serif | 14px | 400–650 | 1.5 | 0 |
| Caption | system-ui, sans-serif | 12px | 500 | 1.45 | 0 |
| Opinion text | Georgia, serif | 17px | 400 | 1.65 | 0 |

## Layout and spacing

- A 224px desktop rail holds the wordmark, five stacked navigation items and the current user at its foot. A 64px main top strip holds breadcrumbs and route context.
- Main content has 40px horizontal and 32px vertical padding, a 1200px maximum width and 24px section gaps. The workspace search panel uses 32px inset padding and spans the content width. Below it, folders take three fifths of the width and alerts take two fifths.
- The list frame has a 48px toolbar with a result count and rows at least 58px tall. Group row title and citation or source on the left, status and date in stable columns, and actions on the right. Long names wrap. Document readings use a 70-character measure and a separate action bar.
- At 900px, reduce horizontal padding to 24px and the rail to 188px. At 760px, switch to a compact text-labeled nav, stack landing panels and group supporting metadata inside each row. At 480px, use 16px padding and wrap toolbars.

## Components and elevation

- Primary buttons have a 40px minimum height, 8px radius, 16px horizontal padding and white text. Secondary buttons use a white surface and a neutral border. Use text for page tasks and accessible names for icon buttons.
- Inputs and selects have visible labels, 42px minimum height, 8px radius and a 1px border. Put validation near the affected control. Long picker lists scroll within the dialog.
- Panels use 12px corners and a 1px border, with no resting shadow. Status labels use text and a 4px radius. Active filters include a clear action.
- Dialogs are at most 560px wide with 24px padding, 14px radius, a 0 18px 48px rgba(24, 44, 55, 0.22) shadow and an rgba(16, 32, 42, 0.35) backdrop. Dropdowns use 0 8px 24px rgba(24, 44, 55, 0.12).
- Move focus into dialogs and restore it to the trigger on close. Escape dismisses transient controls. Name the target in destructive confirmations and announce mutation feedback through an accessible live region. Keep visible focus and supplemental status text throughout.
