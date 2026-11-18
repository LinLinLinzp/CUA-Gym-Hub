# BILL Accounts Payable — Design

## Visual theme

Use a light finance workspace with a full-width dark plum header, a warm canvas, paper-white tables, and a clay primary action. The header carries BILL as plain text and holds the main navigation in a single row. Workspace pages use compact ledger tables, prominent dollar amounts, and a conspicuous next action. Build the status markers, dividers, and account monogram from local CSS and text. Use locally authored visual assets for any additional marks.

## Color palette

| Role | Value | Usage |
| --- | --- | --- |
| Header | `#241923` | Global navigation background |
| Header text | `#FFF9F3` | BILL text, account, active page |
| Inactive navigation | `#DED2DA` | Inactive header links |
| Active indicator | `#F4A27F` | Tab underline in the header |
| Canvas | `#F7F4EF` | Workspace background |
| Surface | `#FFFFFF` | Tables, forms, drawers |
| Tinted surface | `#FBF8F5` | Table header and review summary |
| Text | `#30252D` | Headings, cell content, amounts |
| Muted text | `#6F606A` | Metadata, help, secondary values |
| Border | `#E4DCD9` | Table rules and card borders |
| Control border | `#96868C` | Inputs and selects |
| Primary | `#983D27` | Filled buttons and text links |
| Primary hover | `#76301F` | Filled action hover |
| Focus | `#6F437C` | Visible outline with 2px offset |
| Waiting | `#6C4A16` on `#F8EBD3` | Pending approval / scheduled |
| Positive | `#235743` on `#E4F2E9` | Approved / paid |
| Stopped | `#8C3139` on `#FAE8E9` | Denied and blocked states |
| Active payment | `#413D71` on `#EEEAF8` | Processing |
| Neutral | `#5C5158` on `#EFE9EE` | Draft, unpaid, cancelled |

## Typography

| Role | Font stack | Size / line height | Weight | Tracking |
| --- | --- | --- | --- | --- |
| BILL text | `system-ui, 'Segoe UI', sans-serif` | 24px / 28px | 800 | `0.04em` |
| Page heading | `Georgia, serif` | 36px / 42px | 600 | `-0.025em` |
| Section heading | `system-ui, 'Segoe UI', sans-serif` | 18px / 26px | 650 | `-0.01em` |
| Body and controls | `system-ui, 'Segoe UI', sans-serif` | 14px / 21px | 400–650 | `normal` |
| Column labels | `system-ui, 'Segoe UI', sans-serif` | 13px / 18px | 650 | `normal` |
| Status and metadata | `system-ui, 'Segoe UI', sans-serif` | 12px / 18px | 500–650 | `normal` |
| KPI amount | `system-ui, 'Segoe UI', sans-serif` | 28px / 34px | 700 | `-0.02em` |

Use `font-variant-numeric: tabular-nums` for figures and right-align amount columns. Show currency explicitly on amount labels, confirmation summaries, and transaction detail.

## Spacing and layout

- Header is 64px tall with 28px side padding and a 24px gap between navigation links. Render the active link with a 3px lower rule. Keep the organization and account identity on the right.
- Workspace uses a max width of 1380px, centered with 36px desktop side padding and 32px top padding. Use a 24px section gap and 16px grid gap. Put each page's primary action beside its title.
- Overview contains three linked metric cards on one row with a full-width recent activity table below. Data lists use a full-width bordered table with 48px minimum rows, 16px cell padding, and controls directly above it.
- Detail pages use a 2:1 content and summary grid with a 24px gap. Forms with line items use the full workspace width. Review and confirmation dialogs use a 520px maximum width and 24px padding.
- Below 900px reduce content padding to 20px and stack detail columns as needed. Below 640px let the navigation occupy its own scrollable row, stack toolbars and metrics, and let a labelled table container scroll horizontally. Keep all actions keyboard accessible.

## Component patterns

- Primary and secondary buttons have a 40px minimum height, 14px horizontal padding, and 8px radius. Use white text on primary actions and a white surface with a visible border for secondary actions. Use a distinct danger style for Deny and Cancel payment confirmations.
- Inputs and selects have persistent visible labels, 40px minimum height, 8px radius, and inline errors linked to their controls. Use a visible 2px focus outline and real button elements for clear, sort, and pagination controls.
- Cards and tables use a 12px radius, solid border, and subtle row-hover tint `#FCF4EE`. Status pills use 12px type, a small CSS dot, and explicit status text. Table headings and buttons expose sorting state and meaningful labels to assistive technology.
- Modals use `rgba(36, 25, 35, 0.48)` behind the panel. Keep the primary and secondary action order consistent, focus the first usable control, and restore focus to the opener when dismissed. Announce local success or validation feedback with live regions.

## Elevation

- Cards and tables use borders on the workspace canvas.
- Menus use `0 6px 16px rgba(36, 25, 35, 0.12)`.
- Dialogs use `0 18px 60px rgba(36, 25, 35, 0.24)`.
