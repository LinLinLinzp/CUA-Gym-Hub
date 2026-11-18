# FreshBooks desktop design

## 1. Visual theme

Use a practical accounting workspace. Keep the page heading, primary action, filters and first rows visible together on a desktop. The research shows a sidebar anchored beside a white workspace, concise action labels, compact ledgers, document-like invoice editing and a clear green confirmation action. [Screenshot notes](assets/README.md#desktop-visual-references)

For this app, use a light rail, cool-gray canvas, white cards, an inset blue navigation indicator, and a blue/green action hierarchy. Use the FreshBooks wordmark text. Group dashboard figures in a distinct card grid, use labeled status pills, and put form help directly beside the control. Use the following implementation tokens as design targets.

## 2. Color palette

| Token | Hex | Role |
| --- | --- | --- |
| `--brand` | `#1768B9` | FreshBooks text, selected icons, links |
| `--brand-hover` | `#124F92` | Link and selected control hover |
| `--brand-soft` | `#E8F2FF` | Selected navigation, active tabs and focus context |
| `--rail` | `#E9F1F9` | Left rail |
| `--canvas` | `#F3F6FA` | Application background |
| `--surface` | `#FFFFFF` | Header, dialogs, cards and table background |
| `--surface-subtle` | `#F8FAFC` | Table header, section summary and preview background |
| `--ink` | `#142B46` | Primary text and numbers |
| `--muted` | `#53677E` | Secondary labels |
| `--border` | `#D7E1EB` | Cards, table rules and sections |
| `--control-border` | `#8195AA` | Text inputs and select triggers |
| `--positive` | `#287743` | Save, Send when sole primary action, Log Time and successful status text |
| `--positive-hover` | `#216439` | Hover for positive actions |
| `--positive-soft` | `#E5F4E9` | Paid, billed and active backgrounds |
| `--warning` / `--warning-soft` | `#79510D` / `#FFF1CF` | Outstanding, partial and unbilled |
| `--danger` / `--danger-soft` | `#962E40` / `#FBE8EC` | Overdue, errors and excess |
| `--focus` | `#1675CC` | Keyboard focus ring |
| `--overlay` | `rgba(11, 30, 51, 0.40)` | Modal scrim |

Use label text alongside every status color. Chart series may use `#367BC8`, `#D37F91` and `#DCAB53` on white with numeric labels or legend entries.

## 3. Typography

Use `Inter, system-ui, -apple-system, "Segoe UI", sans-serif`. Package Inter locally if selected. Use tabular numerals in dates, timers, ledgers and charts.

| Role | Size | Weight | Line height | Letter spacing |
| --- | --- | --- | --- | --- |
| Wordmark | 22 px | 750 | 28 px | −0.03 em |
| Page title | 30 px | 700 | 36 px | −0.025 em |
| Section/card title | 18 px | 650 | 24 px | −0.01 em |
| Large total | 28 px | 650 | 34 px | −0.02 em |
| Module navigation | 14 px | 600 | 20 px | 0 |
| Body/form/control | 14 px | 400 | 20 px | 0 |
| Button/row title | 14 px | 600 | 20 px | 0 |
| Label/table heading | 12 px | 600 | 18 px | 0.01 em |
| Caption/helper/status | 12 px | 500 | 17 px | 0 |

## 4. Spacing and layout

- Use a 4 px base unit. Common gaps are 8, 12, 16 and 24 px. The desktop rail is 216 px with 16 px inset. A utility header is 60 px high with right-aligned search and account identity. Use 42 px navigation rows with an 8 px radius and 20 px icons. Indent invoice sublinks by 20 px.
- The workspace has up to 1240 px inner width and 32 px outer padding at normal desktop widths. Stack page heading, section controls and work area with 20–24 px gaps. Default cards use 16–20 px inner spacing, 12 px radius and 1 px borders. Table section titles and filters live in one bar inside their card.
- Dashboard uses a two-column responsive grid. Let Outstanding Invoices take the wider column and give Spending/Unbilled Time explanatory labels only for actual figures. Use the next row for recent invoices. Provide links from summaries to filtered work.
- Invoice editor uses a flexible document card and a 264 px settings card, separated by 24 px. Keep document metadata in a two-column form grid and editor totals right-aligned under the line table. Expense editor uses the same grid, with a rectangular receipt area above or beside the expense fields. Retainer details use a 270 px terms card next to a flexible period card, followed by the tabbed ledger.
- At widths below 1100 px use 24 px content padding. At 960 px stack editor columns. At 760 px collapse the rail behind a menu toggle, move toolbar actions into a wrap row, stack dashboard cards and allow dense tables to scroll horizontally with their labels intact. Keep all save, cancel and entry controls reachable by keyboard and touch.

## 5. Component patterns

| Component | Style and interaction |
| --- | --- |
| Primary actions | 40 px minimum height, 16 px horizontal padding, 8 px radius, white text. Use blue for New or Generate navigation and green for confirmed writes. Show a busy state during uploads or save confirmation and prevent duplicate submission. |
| Secondary actions | 40 px minimum height, white fill, 1 px border, 8 px radius. Destructive actions are labeled in danger text and require confirmation. |
| Inputs | 40 px height, full labels above and 10–12 px internal padding. On invalid input, show a danger border and a short correction next to the field. Focus ring uses 2 px with a 2 px offset. |
| Ledger | 40 px header and 52–60 px rows, 1 px rules. Align amounts and time to the right. Use 16 px checkboxes with labeled hit areas. Selected rows use blue tint. Reveal row actions on hover or focus while retaining a keyboard-accessible menu trigger. |
| Tabs and period controls | Button or link semantics for the actual behavior. Show the selected tab with a blue underline and weight change. Day/Week/Month/All can use a compact 36 px segmented control. |
| Status | 22 px minimum height, 8 px horizontal padding, 11 px radius. Labels include Draft, Sent, Partial, Paid, Overdue, Unbilled, Billed and Inactive as applicable. |
| Dialog | Centered slide-free surface, 520 px normal width or 680 px for import, 24 px padding, 12 px radius, 1 px border. Use labeled heading, close control, focus trap and focus restoration. Place Cancel and the primary action at the lower right. |
| Timer | 320 px wide floating panel at the workspace lower right, 20 px from the edge, with a large tabular clock. Group assignment fields, Pause/Resume, Discard and Log Time. On small screens use available width with 16 px margins. |
| Feedback | Put field errors inline and save confirmations in a live region. Accompany charts with real numbers. Show an empty state action only when the user can take it from that screen. |

## 6. Shadow and elevation

| Role | CSS |
| --- | --- |
| Cards and ledgers | `0 1px 2px rgba(20, 43, 70, 0.06)` |
| Menus and timer | `0 8px 24px rgba(20, 43, 70, 0.15)` |
| Modal | `0 20px 60px rgba(11, 30, 51, 0.24)` |

Layer sticky header, dropdowns, timer and dialogs in increasing order. Keep dialogs above the utility and timer controls.
