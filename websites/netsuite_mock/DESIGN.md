# Design System Inspired by Oracle NetSuite (Redwood Experience)

## Implementation palette and layout

Use the workspace design below across the app. Preserve the ERP vocabulary, fields, action labels, record links and table density documented in the references. The workspace shell, navigation, layout, typography and palette have their own visual identity.

| Element | Implementation |
|---|---|
| Canvas and surfaces | Warm canvas `#F4F1ED`, white panels `#FFFFFF`, divider `#DFD9D2`, table header `#EEEAE5`, row hover `#F7F3FC` |
| Text and interactive | Ink `#241F2A`, muted text `#625968`, plum primary `#5A3B78`, primary hover `#472D62`, links `#50346E`, focus ring `#805AB3`, selected tint `#EAE1F3` |
| Status | Neutral `#EFECF1`/ `#4D4453`, pending `#FFF1D5`/ `#724D12`, positive `#E5F2E8`/ `#2E6441`, blocked `#F9E6E4`/ `#8A3C34`. Pair every color with a text label. |
| Type | System sans-serif such as `system-ui, -apple-system, sans-serif`. Page titles 24/30 px at weight 650, body and table cells 14/20 px, field labels 12/17 px at weight 600. Set tabular numbers on money and quantity columns. |
| Header | 52 px utility bar with a plain text NetSuite label, a 320–480 px record search and account identity. A thin bottom border defines the bar. |
| Navigation | 224 px left rail under the utility bar. Use expandable Transactions and Lists groups with nested text links, 32 px rows and a pale plum current-page indicator. Collapse into a labelled menu on narrow screens. |
| Work area | Fluid with 24 px desktop gutters and a 16 px compact gutter. Compose a page heading, document number/status, action toolbar, field panels and lower table. Keep breadcrumbs and return links near the heading. |
| Record panels | Use one or two metadata columns and an independent 260 px Summary rail on wide screens. Stack the Summary below metadata on narrow screens. Give active record tabs tinted backgrounds and clear focus outlines. |
| Tables and filters | Use 36 px headers and 36 px minimum rows, right-aligned numeric cells, 12 px horizontal cell padding and an Edit/View column. Group filters in a collapsible shelf above the table. Keep horizontal scrolling inside wide table panels. |
| Dashboard and modals | Two-column dashboard with reminders first and operational KPIs second. Panel radius 8 px, 16 px spacing, quiet borders. Use app dialogs for confirms and validation, with keyboard focus restored to the initiating control. |

## Product screenshot observations

The reference measurements below describe Oracle's interface. [Reference 01](assets/screenshots/01_redwood_item_fulfillment_view.jpg) shows Redwood, and [the screenshot index](assets/README.md) covers the Classic-era record forms, navigation, lists and dashboards. Use these for field order, control states and workflow research.

## 1. Visual Theme & Atmosphere

NetSuite is a dense, record-centric ERP. Every screen is either a **record page** (big title, the record's identity line,
a status pill, a row of action buttons, collapsible field sections in a 3-column grid, then a row of subtabs that holds
line-item tables), a **list page** (title, a View selector, a collapsible Filters band, a wide sortable table with `Edit | View`
links), or the **Home dashboard** (portlets). Redwood replaces the old blue-grey chrome with a warm off-white canvas
(`#FAF9F7`), a white sticky header with a thin decorative pattern strip on top, and a deep slate-teal navigation bar.
Typography is plain and businesslike. Labels are small and grey, values are near-black, and accents are muted teal.
Information density is high: tables have many columns, rows are about 43px tall, and there is almost no decoration apart from the header strip.

The brand reads "ORACLE / NetSuite" (small letter-spaced ORACLE above a larger NetSuite wordmark), top-left of the header.

## 2. Color Palette & Roles

### Primary chrome
- **Header background** (`#FFFFFF`): global header (logo, search, Help, user).
- **Header pattern strip** (8px tall, top edge of header): Redwood abstract shapes. Build it from flat blocks/rounded blobs in
  `#92C0CF` (light teal), `#C9DCE0` (pale teal), `#36677D` (slate teal), `#E8D5A4` (sand) and `#F0EFED` (warm grey). Use inline SVG or CSS gradients. No images.
- **Nav bar background** (`#325C73`): the 40px main navigation (center tabs).
- **Nav item active / hover** (`#1A2F40`): the background of the current center tab (e.g. Home house icon when on Home). Hover uses `#284B5E`.
- **Nav text** (`#FFFFFF`, 15px, weight 500).
- **Canvas / page background** (`#FAF9F7`): behind all page content.
- **Content surface** (`#FFFFFF`): subtab panels, tables, portlets, cards, dropdown menus.

### Text
- **Text primary** (`#161513`): titles, values, table cells.
- **Text secondary / labels** (`#52514F`): field labels, inactive subtabs, captions.
- **Text muted** (`#6F6C69`): placeholders, help text, "To Be Generated", empty states.
- **Text on dark** (`#FFFFFF`).

### Interactive
- **Primary button** (`#36677D`, hover `#2B5468`, active `#1F4152`, text white): Save, Edit, Submit, the main workflow button (Fulfill, Receive, Accept Payment).
- **Secondary button** (bg `#FFFFFF`, border `1px #8F8E8C`, text `#161513`; hover bg `#F1EFED`): Back, Cancel, Bill, Print, Actions, Close Order.
- **Link** (`#1F5E6B`, hover underline, hover color `#123F49`): entity names, "Created From" links, Edit | View links in lists.
- **Focus ring** (`0 0 0 2px #FFFFFF, 0 0 0 4px #36677D`): keyboard focus on inputs/buttons.
- **Subtab active underline** (`#347792`, 3px).
- **Selected row / hover row** (`#EEF4F6` / `#F5F4F2`).

### Surface & borders
- **Section divider** (`#E5E4E2`): line under the button row; between header & content.
- **Table header background** (`#F1F2F4`).
- **Table row border** (`#E0E0DE`, 1px).
- **Input border** (`#8F8E8C`, 1px; hover `#5F5E5C`; disabled bg `#F1EFED`, border `#C9C8C6`).
- **Card/portlet border** (`#E0E0DE`, 1px).
- **Status pill** (bg `#E9EEF4`, border `1px #A3A8AC`, text `#161513`).

### Status (pills, banners, KPI arrows)
- **Success** (`#508223`; banner bg `#EEF5E8`, border `#7DAA4F`): "Confirmation — Transaction successfully Saved".
- **Warning** (`#AC630C`; banner bg `#FEF5E6`, border `#E2A33B`): credit-limit warning, backorder notice.
- **Error** (`#C74634`; banner bg `#FCEDEA`, border `#D9776A`): validation errors, credit hold, Overdue text.
- **Info** (`#2B6D8C`; banner bg `#EAF3F7`).
- **Required asterisk** (`#C74634`).

Status pill tints (all with `#161513` text, 1px border in the darker tone):
| Status group | bg | border |
|---|---|---|
| Pending Approval / Pending Supervisor Approval | `#FDF3E1` | `#E2A33B` |
| Pending Fulfillment / Pending Receipt / Open / Picked / Packed | `#E9EEF4` | `#A3A8AC` |
| Partially Fulfilled / Partially Received / Pending Billing… / Pending Bill | `#E6F0F4` | `#6E9FB3` |
| Billed / Fully Billed / Paid In Full / Shipped / Deposited | `#EBF4E5` | `#7DAA4F` |
| Closed / Cancelled / Voided / Rejected by Supervisor | `#F1EFED` | `#9E9B98` |

### Charts (dashboard KPI/trend portlets)
Series palette: `#36677D`, `#7BB3C7`, `#E2A33B`, `#7DAA4F`, `#8E6CAF`, `#C74634`. Gridlines `#E5E4E2`, axis text `#6F6C69` 12px.

## 3. Typography Rules

Oracle Sans is not available offline. Use the system stack:
`font-family: "Oracle Sans", "Segoe UI", -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif;`
Numbers use `font-variant-numeric: tabular-nums` in tables and summary boxes.

| Role | Size | Weight | Line height | Color | Notes |
|------|------|--------|-------------|-------|-------|
| Record/list page title ("Item Fulfillment", "Sales Orders") | 26px | 700 | 32px | `#161513` | preceded by 24px record-type icon, followed by 18px search glyph |
| Record identity line ("IF-8241  Juniper Field Supply") | 20px | 400 | 28px | `#161513` | number then 16px gap then entity name |
| Section heading ("Primary Information") | 16px | 700 | 24px | `#161513` | 12px chevron left, collapsible |
| Field label | 13px | 400 | 18px | `#52514F` | sentence case (Redwood). 4px above value |
| Field value (view) | 15px | 400 | 22px | `#161513` | |
| Input text | 14px | 400 | 20px | `#161513` | |
| Nav item | 15px | 500 | 40px | `#FFFFFF` | |
| Button | 14px | 600 | 30px | per button | |
| Subtab | 15px | 400 (active 700) | 24px | `#535250` / `#161513` | |
| Table header | 14px | 600 | 20px | `#161513` | |
| Table cell | 14px | 400 | 20px | `#161513` | numbers right-aligned |
| Portlet title | 15px | 700 | 22px | `#161513` | uppercase NOT used in Redwood |
| Reminder count | 24px | 700 | 28px | `#36677D` (red `#C74634` when overdue) | |
| KPI value | 22px | 700 | 28px | `#161513` | |
| Caption / helper | 12px | 400 | 16px | `#6F6C69` | |
| Status pill | 13px | 400 | 18px | `#161513` | |
| Header user name | 15px | 600 | 20px | `#161513` | second line 13px `#52514F` "Cascade Industrial Supply - Administrator" |

## 4. Spacing & Layout

- **App min width**: 1280px (horizontal scroll below); designed at 1440px.
- **Global header**: 64px total = 8px pattern strip + 56px white bar. It is sticky (`position: sticky; top:0; z-index:100`) together with the nav bar.
  - Logo block at left 24px: "ORACLE" 10px/700 letter-spacing 1.5px over "NetSuite" 22px/500. The block is 104px wide.
  - Global search input: starts at x=130, 750px wide (flex, max 750), 40px tall, radius 4px, 1px `#888886` border, 16px magnifier icon at left 16px, placeholder "Search".
  - Right cluster (gap 24px): Create New icon button (24px doc-plus glyph), 1px divider, "Help" (circle-? icon + text), user block (person icon + 2-line name/company-role) with ▾ menu.
- **Nav bar**: 40px tall, bg `#325C73`. Three 48px-wide icon cells (Recent Records clock, Shortcuts star, Home house), then text tabs with 12px horizontal padding. `•••` overflow at far right (24px from edge).
- **Page content padding**: 24px left/right, 20px top. Content max-width none (fluid).
- **Record page vertical rhythm** (from screenshot 01):
  - Title row baseline at ~y=140 (20px below nav), identity row +32px, button row +43px (buttons 32px tall, 16px gap between buttons, separator 1px×32px `#C9C8C6` with 16px margins between groups).
  - Divider `#E5E4E2` 16px below buttons. Section heading 24px below divider.
  - Field grid: 3 equal columns with 24px gutter (column x positions 24 / 550 / 1076 at 1440px). Each field is label (18px) + 4px + value (22px) with 11px spacing between fields (≈53px pitch).
  - Summary box (transactions with amounts) sits in the 3rd column of Primary Information, 300px wide, top-aligned.
  - Subtab band: 40px below last section. Tabs 48px tall, 32px gap between labels. Active = bold + 3px `#347792` underline. A 1px `#D6D5D3` bottom border spans the full width. Tab panel is white with 0 padding for tables, 24px padding for field panels.
- **Tables**: header 42px, rows 43px, cell padding 0 24px (first col 24px left padding), sublist max-width = content width. Right-align quantity/amount columns.
- **List pages**: Filters band is collapsible, white, border `#E0E0DE`, radius 4px, padding 16px 24px, filters laid out in a 4–6 column grid of 200px selects. Table toolbar is 48px.
- **Dashboard**: 3 columns. The left column is 320px fixed, the center is flexible, and the right is 360px. Gap 16px. Portlets: white, 1px `#E0E0DE`, radius 6px, header 44px (title 15px/700 at 16px padding, right side has a `⋯` menu), body padding 16px.
- **Border radius**: buttons/inputs 4px, pills 12px, portlets/cards/modals 6px, dropdown menus 4px.
- **Modal**: width 480px (alerts) / 720px (pickers), header 52px, body padding 24px, footer right-aligned buttons, overlay `rgba(22,21,19,0.45)`.

## 5. Component Patterns

**Primary button**
```css
.btn-primary { height:32px; padding:0 14px; background:#36677D; color:#fff; border:1px solid #36677D;
  border-radius:4px; font:600 14px/30px var(--font); cursor:pointer; }
.btn-primary:hover { background:#2B5468; border-color:#2B5468; }
.btn-primary:disabled { background:#A9BEC7; border-color:#A9BEC7; cursor:not-allowed; }
```
**Secondary button**: `background:#fff; color:#161513; border:1px solid #8F8E8C;` same metrics; hover `#F1EFED`.
**Split button** (Save ▾): primary left part + 28px caret part separated by 1px `rgba(255,255,255,.4)`. The caret menu offers "Save & New", "Save & Copy" (and "Save & Print" which just saves then opens print view).
**Actions menu button**: secondary button with text "Actions" + 10px ▾ caret; menu = white card, 4px radius, shadow (see §6), items 36px tall, 14px text, 16px padding, hover `#F5F4F2`, disabled items `#9E9B98`.
**Icon buttons in list toolbar**: 32×32, transparent, glyph 18px `#52514F`, hover bg `#F1EFED`, radius 4px, tooltip on hover.

**Text input / select (edit mode)**
```css
.ns-input { height:32px; padding:0 10px; border:1px solid #8F8E8C; border-radius:4px; background:#fff;
  font:400 14px var(--font); color:#161513; width:100%; max-width:440px; }
.ns-input:hover { border-color:#5F5E5C; } .ns-input:focus { outline:none; box-shadow:0 0 0 2px #fff,0 0 0 4px #36677D; }
.ns-input[readonly] { background:transparent; border-color:transparent; padding-left:0; }
```
- Select/combobox shows a 10px ▾ caret (`#52514F`) at right 10px. Large lists (customers, vendors, items) are **typeahead comboboxes**: placeholder `<Type then tab>`, dropdown of up to 12 matches (bold match), `Tab`/`Enter` picks the highlighted match, `Esc` closes. A trailing "⋯ List" icon opens the Popup Picker modal (search + paged list).
- Date fields: text input `M/D/YYYY` + 16px calendar icon button opening a month calendar popover (prev/next month, "Today" link).
- Checkbox: 16px square, 1px `#8F8E8C`, checked bg `#36677D` with white tick.
- Required: label followed by ` *` in `#C74634`.
- Read-only/computed fields in edit mode render as plain value text (no box), e.g. "To Be Generated".

**Status pill**: `display:inline-flex; height:24px; padding:0 10px; border-radius:12px; font-size:13px;` tint per §2 table.

**Field section (collapsible)**: header row `⌄ Primary Information` (16px/700) with 12px chevron. Click toggles. Collapsed shows `›`. Grid 3 columns below.

**Subtabs**: `display:flex; gap:32px; border-bottom:1px solid #D6D5D3; background:#fff; padding:0 24px; height:48px;` tab `font-size:15px; color:#535250;` active `font-weight:700; color:#161513; box-shadow: inset 0 -3px 0 #347792;`.

**Sublist (line items) in edit mode** (the NetSuite "machine")
- Table of committed lines (click a line to load it into the editor row; the selected line gets bg `#EEF4F6`).
- Editor row at the bottom (bg `#FFFBEA`, 1px `#E2A33B` top border while active) containing inputs per column.
- Under the table a button group: `✓ Add` (primary, small 28px), `✕ Cancel`, `+ Insert`, `🗑 Remove` (secondary small; disabled `#C9C8C6` when nothing selected), then `Copy Previous` and `Clear All Lines` (text buttons).
- When editing an existing line, the Add button reads `✓ OK`.
- Keyboard: Tab moves across cells and Enter on the last cell = Add.

**Summary box**: white card 300px, 1px `#E0E0DE`, radius 6px. Header "Summary" 15px/700 with 12px 16px padding and bottom border. Rows show the label (13px `#52514F`, uppercase NOT used) and the value right-aligned (15px tabular). The TOTAL row is bold 16px with a 1px `#161513` top border.

**List table**
- First column `Edit | View` (links). Sortable header click toggles ▲/▼ glyph (10px) next to label. Zebra striping none; hover `#F5F4F2`.
- Footer/top-right pager: select "1 – 50 of 148 ▾" + ◀ ▶ icon buttons.
- Empty state row: "No records to show." centered `#6F6C69`.

**Portlet**: title bar with portlet name and `⋯` (menu: Refresh, Minimize). Reminders portlet rows: 24px/700 number in teal, 14px label underneath or beside, entire row clickable, hover `#F5F4F2`.

**Banners** (top of record page, under title block): 1px border + 4px left accent bar, icon (✓/!/i), bold lead word ("Confirmation", "Warning", "Error"), message, × dismiss at right.

**Alert dialog** (replaces browser `alert()` — never use native dialogs; headless browsers auto-dismiss them):
modal 460px, title "acme.app.netsuite.com says" 15px/600, body message 14px, footer "OK" primary (and "Cancel" secondary for confirms).

**Dropdown menus (nav)**: white, min-width 220px, shadow §6, 4px radius. Items 36px tall, 14px, padding 0 16px, `›` chevron at right for items with flyouts. Hover bg `#EEF4F6`. Flyout opens to the right, aligned with hovered item. Section headers (if any) 12px/700 `#6F6C69`.

**Record-type icons** (inline SVG, 24px, stroke `#161513` 1.5px): document outline with a small badge glyph. Use one generic "document" icon for transactions, "person" for customers/vendors/employees, and "box" for items.

## 6. Shadow & Elevation

| Level | Use | CSS |
|---|---|---|
| 0 | page, sections | none |
| 1 | portlets, summary box, filters band | `0 1px 2px rgba(22,21,19,0.06)` |
| 2 | dropdown menus, combobox lists, calendar | `0 4px 12px rgba(22,21,19,0.16), 0 0 0 1px rgba(22,21,19,0.08)` |
| 3 | modals, popup picker | `0 12px 32px rgba(22,21,19,0.24)` |
| sticky | header + nav when scrolled | `0 2px 4px rgba(22,21,19,0.12)` |

## 7. Record formatting conventions
- Dates: `M/D/YYYY` (e.g. `11/13/2026`); posting period `Nov 2026`.
- Amounts: `1,333.36` (no currency symbol in forms/lists; Summary box also without symbol). Negative `-120.00`.
  The dashboard KPIs use `$1.2M` / `$84,210` style.
- Quantities: integers without decimals unless fractional.
- Transaction identity line: `<tranId>  <Entity Name>` e.g. `SO10458  Yakima Valley Cold Chain`.
- Window title: `<Record Type> - NetSuite (Cascade Industrial Supply)`; for lists `Sales Orders - NetSuite (Cascade Industrial Supply)`; Home `Home - NetSuite (Cascade Industrial Supply)`.
