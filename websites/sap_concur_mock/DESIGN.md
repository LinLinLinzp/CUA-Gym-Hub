# SAP Concur workspace design

## 1. Visual theme and atmosphere

Use a compact corporate ledger aesthetic with an ink-blue navigation rail, warm off-white canvas, fine rules and restrained teal highlights. The signed-in workspace emphasizes scanning totals and distinguishing decisions. Use **SAP Concur** as a plain two-word text wordmark and as the title prefix. The navigation reads vertically, with a single annotated overview panel and structured tables below it.

Draw original inline strokes for Workspace, Expense, Requests and Approvals. The dashboard's right side can use CSS to draw a slim dotted route with three outlined waypoints as a quiet visual accent. Author any illustrative receipts locally as fictional merchant documents, with the actual seeded merchant and amount where appropriate. Keep all graphics offline.

## 2. Color palette and roles

| Token | Hex | Usage |
| --- | --- | --- |
| Brand ink | `#132942` | Rail and overview panel |
| Rail selected | `#223E59` | Current page and rail hover |
| Rail text | `#E4EEF5` | Rail labels |
| Rail accent | `#7EE0CA` | Selected marker and small overview accents |
| Canvas | `#F6F7F3` | Main background |
| Surface | `#FFFFFF` | Tables, controls and details |
| Text | `#192B3B` | Headlines and body |
| Secondary text | `#536477` | Metadata, subtitles and empty states |
| Border | `#DCE3E6` | Panel dividers and row rules |
| Control border | `#83929E` | Resting input outline |
| Primary | `#087062` | Primary action, links and focus outline |
| Primary hover | `#06594F` | Hover for filled primary action |
| Positive | `#215646` on `#E4F3EC` | Approved and paid |
| Pending | `#694B0F` on `#FDF0D3` | Pending approval |
| Returned | `#933E38` on `#FBECEA` | Sent back and validation |
| Neutral | `#45566A` on `#EAF0F4` | Draft and recalled |

## 3. Typography

Use `"Segoe UI", system-ui, sans-serif`. Apply `font-variant-numeric: tabular-nums` to dates, amounts and counts. Right-align currency values in tables and totals bars.

| Role | Size | Weight | Line height | Tracking |
| --- | --- | --- | --- | --- |
| Wordmark | 21 px | 750 | 26 px | -0.025 em |
| Page heading | 32 px | 700 | 38 px | -0.035 em |
| Section heading | 19 px | 650 | 26 px | -0.02 em |
| Body and controls | 14 px | 400 / 600 | 20 px | Normal |
| Table metadata | 13 px | 400 | 18 px | Normal |
| Field labels and chips | 12 px | 600 | 16 px | Normal |
| Summary amount | 26 px | 700 | 32 px | -0.02 em |

## 4. Spacing and layout

- At desktop widths use a 224 px rail and 64 px header, with 32 px main inset, 24 px section gaps, and a 1320 px content maximum. Place the account initials, full name and role in the header. Use active route text as the left header label.
- Place the home title, then a 140 px overview panel with three shortcut actions and a three-cell counts strip below it. Follow with a full-width recent-documents table. Counts link to their filtered lists.
- Use an action header and then a single toolbar on each library. Keep search first, followed by status or type and sort. Place a header row over 52 px minimum body rows and a simple pagination footer, with 15–20 records per page.
- In details place status and title above a main document column and a 320 px summary/activity column, separated by 24 px. Show the document's high-level fields in a compact grid above line items. Keep primary actions in the title area and repeat the total in the summary column.
- Below 960 px reduce the inset to 20 px and stack detail columns. At 760 px and below move the four labeled navigation links into a wrapped header row. Wrap toolbars and allow tables to scroll inside their regions. Preserve readable labels and reachable actions at a 360 px viewport.

## 5. Components and interaction

| Component | Specification |
| --- | --- |
| Primary button | 40 px min height, 14 px horizontal padding, 8 px radius, white on primary teal. Hover uses primary hover. |
| Secondary button | Same geometry, white background, control border and ink text. Destructive confirmation uses the returned color pairing and explicit action text. |
| Input and select | 40 px min height, 10 px horizontal padding, 7 px radius, 1 px control border, 6 px below label. Place validation adjacent to the field and associate it with accessible descriptions. |
| Card and table | White surface, 12 px radius and 1 px border. Table header uses canvas tint and sentence-case column labels. Open records via real title links. |
| Status chip | 24 px min height, 8 px side padding and pill radius. Always show status text. |
| Dialog | Centered, 520 px max width, 24 px padding, 14 px radius, dark scrim at 42 percent opacity. Restore trigger focus on close. Confirm and Cancel use visible text. |
| Focus | 2 px outline with 2 px offset on buttons and links. Use rail accent on the dark rail. |

## 6. Shadow and elevation

Use `0 1px 2px rgb(19 41 66 / 6%)` on panels, `0 8px 24px rgb(19 41 66 / 12%)` on menus and `0 20px 64px rgb(19 41 66 / 24%)` on dialogs. Reserve prominent elevation for active overlays.
