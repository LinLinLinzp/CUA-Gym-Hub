# Chase account workspace design

## Visual theme

Use a restrained banking workspace with a deep navy side rail, a warm paper background, and a blue balance panel with a small original decorative motif. Set `Chase` as plain text in the rail. Rely on clear balance labels, generous spacing, and aligned amounts to make account activity easy to scan. Use original CSS shapes for the panel motif and locally implemented interface icons.

## Color palette

| Token | Value | Role |
| --- | --- | --- |
| Rail | `#122741` | Side navigation background |
| Rail active | `#284666` | Current destination with a `#91D9E8` indicator |
| Paper | `#F6F5F0` | App background |
| Surface | `#FFFFFF` | Cards, tables, and review panels |
| Ink | `#11243B` | Main text |
| Secondary ink | `#4D6175` | Labels, muted rows, and help |
| Panel blue | `#164879` | Balance panel |
| Accent | `#91D9E8` | Balance panel decoration and rail indicator |
| Action | `#185595` | Primary buttons and links |
| Action hover | `#123F72` | Hover on primary controls |
| Border | `#D8E0E8` | Panel edges and dividers |
| Field border | `#788A9D` | Input boundaries |
| Success | `#17634C` on `#E5F4EB` | Completed or enabled status |
| Warning | `#774B0E` on `#FDF0D7` | Scheduled or pending status |
| Error | `#9F253A` on `#FBEAED` | Error or destructive choice |

## Typography

Use `system-ui, 'Segoe UI', sans-serif` throughout. Use tabular numerals for money and dates.

| Role | Size / line height | Weight | Letter spacing |
| --- | --- | --- | --- |
| Brand text | 23 / 28 px | 700 | −0.4 px |
| Page title | 34 / 42 px | 700 | −0.8 px |
| Main balance | 40 / 46 px | 650 | −1 px |
| Section title | 21 / 28 px | 650 | −0.2 px |
| Controls and rows | 15 / 22 px | 400–650 | Normal |
| Labels | 13 / 18 px | 500–650 | Normal |

## Layout

- At desktop widths use a 220 px navigation rail, a 64 px utility header and a centered content region capped at 1240 px. Set content padding to 32 px and section gaps to 24 px. The utility header shows the active destination and synthetic customer name.
- In Accounts, place the deposit balance panel above account cards on the left and recent transactions on the right. Use a two-column `minmax(0, 1.55fr) minmax(0, 1fr)` grid. Account detail uses a balance header followed by a full-width ledger. Separate deposit totals from credit balances.
- Transfers and Bill pay place forms or the payee picker in the left column and activity on the right. Give review its own clearly headed panel with a summary and adjacent Back and Confirm controls. Disputes and Alerts use a full-width header with a narrow list or selector above the details.
- Below 900 px collapse content into one column. Below 720 px move the rail into a horizontally scrollable navigation bar below the brand header, lower content padding to 16 px, and stack filter controls. On narrow screens show transaction fields in compact rows with merchant and amount first. Keep the page free of horizontal overflow.

## Components

- Panels use a 1 px border, 14 px radius and 20–24 px padding. The blue balance panel has white text with 24 px padding. Limit its original decorative artwork to the corner using low-opacity concentric arcs or offset lines in CSS. Keep balances and actions outside the decorative area.
- Buttons and input fields have 44 px minimum height and 8 px corner radius. Primary buttons use white on action blue, horizontal padding of 16 px and weight 650. Secondary controls use a white surface and 1 px field border. Keep a visible 2 px focus outline with an offset.
- Tables use a 48 px minimum row height, row dividers, right-aligned amounts, and written status labels. Add a text link or button for row actions so selection works by keyboard. Associate inline validation with its control and keep it visible until corrected.
- Use a modal only for short confirmations such as cancellation. Keep focus within the dialog, support Escape and restore focus to the trigger. Use form review panels for multi-step tasks and a live region for saves or errors.
- Use `0 2px 10px rgba(17,36,59,.06)` for elevated panels and `0 16px 36px rgba(17,36,59,.18)` for dialogs. Most cards can rely on borders.
