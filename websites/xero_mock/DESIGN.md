# Design System Inspired by Xero (web app, go.xero.com, 2025–2026 navigation)

> No reference screenshots could be downloaded: the build sandbox has no outbound network,
> and WebFetch/image search are blocked. These tokens come from web research (Xero brand
> palette, XUI design-system write-ups, Xero Central help articles) plus detailed knowledge of the
> production UI. Where a value is approximate it is marked "≈". Keep the hierarchy, density and
> component behaviour exactly as described; small hex drift is acceptable.

## 1. Visual Theme & Atmosphere

Xero is a calm, dense, utilitarian accounting UI built on Xero's in-house design system **XUI**.
A **dark navy global header** runs across the top with the round cyan Xero logo, the organisation
switcher, and the main menus (Home · Sales · Purchases · Reporting · Accounting · Tax · Contacts).
Below that, pages use a **light grey canvas** with **white panels/cards** that have thin cool-grey
borders and almost no shadow. Typography is a neutral sans-serif in near-black navy (`#000A1E`).
Primary actions are **XUI blue** (`#0078C8`). Financial figures are right-aligned with tabular numerals,
thousands separators and 2 decimals, never with a currency symbol inside tables (the currency code
"GBP" is shown in headers/totals instead). Status is conveyed with soft-tinted pill badges and red
text for "Overdue". The bank-reconciliation screen is the one place with strong colour: matched
suggestions are shown in **pale green boxes** with a green **OK** button between the statement line
and the match.

## 2. Color Palette & Roles

### Primary
- **Xero Brand Blue / logo** (`#13B5EA`): Logo circle, brand accents, chart series "money in", focus rings (at 40% alpha).
- **Global header (navy)** (`#0B1F3A` ≈): Top navigation bar background (56px tall).
- **Header hover** (`rgba(255,255,255,0.12)`): Menu item hover/open background in the header.
- **Canvas background** (`#F2F3F4`): Page background behind panels.
- **Surface / panel** (`#FFFFFF`): Cards, tables, forms, modals.
- **Text primary** (`#000A1E`): Body copy, table text, headings.
- **Text secondary** (`#59606D`): Labels, captions, column headers, helper text.
- **Text muted / placeholder** (`#8C919A`).

### Accent
- **Action blue** (`#0078C8`): Primary buttons, links, active tab underline, selected nav item, checkbox fill.
- **Action blue hover** (`#00609F`); **pressed** (`#004E82`).
- **Link-blue tint background** (`#E6F2FA`): Selected table row, active filter chip, info banners.

### Interactive
- **Link** (`#0078C8`, underline on hover only).
- **Standard (secondary) button**: bg `#FFFFFF`, border `#A6ABB3`, text `#000A1E`; hover bg `#F2F3F4`.
- **Create / Reconcile OK green** (`#1F8A3A`): Reconcile "OK" button, "Reconcile" in Find & Match, "Make payments". Hover `#18722F`.
- **Destructive** (`#CB1E2F`): Delete / Void confirmation buttons, error text.

### Surface & Borders
- **Border default** (`#D4D7DB`): Panel borders, table outer border, input borders.
- **Border subtle / row divider** (`#E6E7E9`).
- **Table header background** (`#F7F8F8`).
- **Row hover** (`#F5F9FC`).
- **Selected row** (`#E6F2FA`).
- **Match box (reconcile)**: bg `#EEF7E8`, border `#A8D18D`, header text `#1F6B2E`.
- **Statement line box (reconcile)**: bg `#FFFFFF`, border `#D4D7DB`; when reconciled-in-flight fades to 0 opacity over 300ms.
- **Modal overlay**: `rgba(0,10,30,0.45)`.

### Status (pill badges, 12px/600, radius 12px, padding 2px 8px)
| Status | Text | Background |
|---|---|---|
| Draft | `#59606D` | `#E6E7E9` |
| Awaiting Approval | `#8A5300` | `#FFF1DB` |
| Awaiting Payment | `#00589B` | `#E6F2FA` |
| Overdue (derived) | `#CB1E2F` | `#FCE8EA` |
| Paid | `#0A6A2E` | `#E3F4E8` |
| Voided / Deleted | `#59606D` | `#F2F3F4` (text line-through) |
| Reconciled ✓ | `#1F8A3A` icon only |  |

- **Success** (`#1F8A3A`), **Warning** (`#E88B00`), **Error** (`#CB1E2F`), **Info** (`#0078C8`).
- Negative numbers in reports: shown with leading minus `-1,234.56` in `#000A1E` (Xero does not colour them red); totals rows bold.
- Chart colours: money in `#13B5EA`, money out `#A6ABB3` (grey), profit line `#0078C8`, overdue bars `#CB1E2F`, draft bars `#D4D7DB`.

## 3. Typography Rules

Font stack (offline, no web fonts): `"Helvetica Neue", Helvetica, Arial, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`.
Numbers: `font-variant-numeric: tabular-nums;` everywhere amounts appear.

| Role | Font | Size | Weight | Line Height | Letter Spacing |
|------|------|------|--------|-------------|----------------|
| Page title (H1, e.g. "Invoices") | stack | 24px | 700 | 32px | -0.2px |
| Section title (H2, card titles "Invoices owed to you") | stack | 17px | 700 | 24px | 0 |
| Sub-section (H3, report section "Trading Income") | stack | 15px | 700 | 20px | 0 |
| Header menu item | stack | 15px | 600 | 56px (bar) | 0 |
| Body / table cell | stack | 14px | 400 | 20px | 0 |
| Table header | stack | 13px | 600 | 18px | 0 (colour `#59606D`) |
| Form label | stack | 13px | 600 | 18px | 0 |
| Input text | stack | 14px | 400 | 20px | 0 |
| Button | stack | 14px | 600 | 20px | 0 |
| Caption / helper / breadcrumb | stack | 12px | 400 | 16px | 0 |
| Big figure (dashboard balance) | stack | 28px | 700 | 34px | -0.3px |
| Report title block (org name, report name, date) | stack | 20px / 15px / 14px | 700 / 600 / 400 | 1.3 | 0 |

## 4. Spacing & Layout

- Global header height: **56px**, full width, fixed top, navy. Content starts at 56px.
- Page header band (breadcrumb + H1 + actions): white, height ≈ 88px, padding 16px 24px, bottom border `#E6E7E9`.
- Breadcrumb above H1: 12px link text e.g. "Sales overview ›".
- Content max width: **1280px** centred for list pages; reports and reconcile use full width with 24px side padding.
- Content padding: 24px. Card gap: 16px (dashboard grid gap 16px).
- Dashboard grid: 3 columns ≥1200px (each card ≈ 400px wide, min-height 300px), 2 columns 800–1199px, 1 below.
- Table row height: 44px (list tables), 36px (report rows), header row 40px.
- Inputs: height 36px, padding 0 10px, radius 3px, border 1px `#A6ABB3`; focus border `#0078C8` + `0 0 0 3px rgba(19,181,234,0.35)`.
- Buttons: height 36px (standard), 32px (small, in tables/toolbars), padding 0 14px, radius 3px.
- Border radius: panels 4px, buttons/inputs 3px, pills 12px, modals 6px, avatar 50%.
- Tabs (status tabs on lists): 44px tall, 14px/600, inactive `#59606D`, active `#000A1E` with 3px bottom bar `#0078C8`; counts in parentheses "Draft (6)".
- Modal widths: small 480px, medium 640px, large 960px (Find & Match uses an inline expanding panel, full row width).
- Right-side drawers (contact quick view, help): 400px.

## 5. Component Patterns

### Global header (navy)
- Left: 32px round logo (circle `#13B5EA`, white lowercase "xero" wordmark, inline SVG). Then org switcher: org name "Brightwater Creative Ltd" 15px/600 white + chevron-down; click opens dropdown (white panel, 280px): org name, "Settings", "Files" (disabled grey if not implemented), divider, "My Xero" (disabled), list of organisations (current with ✓).
- Menus: Home, Sales ▾, Purchases ▾, Reporting ▾, Accounting ▾, Tax ▾, Contacts ▾. 15px/600 white, padding 0 14px; active section shows 3px white underline at bottom of bar. Dropdowns: white panel, min-width 240px, radius 4px, shadow level 2, items 40px tall 14px, hover `#F2F3F4`; groups separated by 1px `#E6E7E9`; last item "<Section> settings".
- Right: icon buttons 40×40 white icons — "+" (Create new), magnifier (Search), bell (Notifications, red dot badge when count>0), "?" (Help), avatar circle 32px bg `#13B5EA` initials "HC" white 13px/700.

### Buttons
- Primary: `background:#0078C8; color:#fff; border:1px solid #0078C8; border-radius:3px; height:36px; padding:0 14px; font:600 14px stack;` hover `#00609F`.
- Split button (e.g. "Approve & email ▾"): primary + attached 32px caret segment separated by 1px `rgba(255,255,255,0.4)`; caret opens menu right-aligned.
- Standard: white, border `#A6ABB3`, text `#000A1E`; hover bg `#F2F3F4`.
- Borderless/link button: text `#0078C8`, no border, hover underline.
- Green "OK" (reconcile): 56×36px, bg `#1F8A3A`, white 14px/700, disabled = bg `#E6E7E9` text `#8C919A`.
- Destructive: bg `#CB1E2F`, white.

### Inputs
- Text/number/date: as in §4; date inputs show "18 Nov 2026" text format with a calendar popover (month grid, today ring `#13B5EA`).
- Select/combobox (contact, account, tax rate, item): input with caret; dropdown list 320px max-height scroll; account picker groups by type headings ("Revenue", "Expenses", "Current Assets"…) and shows "200 - Sales"; contact picker footer row "+ Add contact" (opens quick-create modal).
- Validation: red 1px border `#CB1E2F`, message 12px red under field; top-of-form error banner (light red `#FCE8EA`, left 4px red border) listing problems.

### Tables (lists)
- White panel with 1px `#D4D7DB` border, radius 4px. Header row `#F7F8F8`, 13px/600 `#59606D`, sortable headers show ▲/▼.
- Leading 40px checkbox column; when ≥1 row checked a toolbar appears above the table: "N items selected" + action buttons (Approve, Email, Print, Void, Delete, Make payment…) + selected total "GBP 3,240.00".
- Numbers right-aligned; dates "3 Nov 2026"; Overdue due-date cell text `#CB1E2F` with "Overdue" caption; row click opens record.
- Pagination footer: "Showing items 1–25 of 46" + page-size select (25/50/100/200) + prev/next.

### Summary tiles (top of Invoices/Bills lists)
Row of 4 white tiles (radius 4px, border, padding 12px 16px, clickable): label 13px `#59606D` "Draft (6)", value 20px/700 "4,050.00"; Overdue tile value red.

### Cards (dashboard)
White, border `#D4D7DB`, radius 6px, padding 20px, title 17px/700 + "…" overflow menu at top right; content charts in SVG (no chart library needed; recharts allowed if bundled).

### Modals
White, radius 6px, shadow level 3, header 20px/700 with × close, body padding 24px, footer right-aligned buttons (Cancel standard + primary). Overlay `rgba(0,10,30,0.45)`. Esc closes.

### Toasts
Bottom-left, navy `#0B1F3A` bg, white 14px, radius 4px, 4s auto-dismiss (UI only — never writes state). E.g. "Invoice INV-0047 approved".

### Reconcile row (key component)
Three columns per statement line, full width, 16px vertical gap between rows:
- Left box (≈42%): white, border; top line date "3 Nov 2026" 13px/600; payee 14px/700 "RIDGEWAY UNIVERSITY"; reference & description 12px `#59606D`; right side two amount columns headed "Spent" and "Received" (12px headers), amount 15px/700 in the relevant column; footer links "more ▾" (options: Discuss, Delete statement line…).
- Middle (≈8%): vertically centred green "OK" button.
- Right box (≈50%): tab strip "Match | Create | Transfer | Discuss" (13px/600, active tab white, others `#F2F3F4`); Match tab with suggestion = pale-green box showing contact bold, "Invoice: INV-0031", date, amount right-aligned, "View details" link, plus "Find & Match" link top-right of tab body; Create tab = 2-column mini-form (Who, What, Why, VAT; "Add details" link).

### Reports
White full-width panel; centred title block (Report name 20px/700; org name 15px; "For the month ended 31 October 2026" 14px `#59606D`). Toolbar above: date range pickers, "Compare with" select, "More ▾", "Update" primary. Rows: account names left (indented 16px), amounts right in 140px columns; section headers bold, totals rows bold with top border 1px `#000A1E`; "Net Profit" double underline. Amounts are links (blue on hover) that drill into Account Transactions.

## 6. Shadow & Elevation
- Level 0 (panels, cards): none, rely on 1px border.
- Level 1 (sticky table header, floating toolbars): `0 1px 2px rgba(0,10,30,0.12)`.
- Level 2 (dropdowns, popovers, date pickers): `0 4px 12px rgba(0,10,30,0.18), 0 0 0 1px rgba(0,10,30,0.08)`.
- Level 3 (modals, drawers): `0 12px 32px rgba(0,10,30,0.28)`.

## 7. Formatting rules (copy & numbers)
- Dates: `D MMM YYYY` ("3 Nov 2026"); stored as `YYYY-MM-DD`.
- Money: `1,800.00` (no symbol in tables); totals "GBP 1,800.00" or "£1,800.00" on dashboard cards.
- Document numbers: "INV-0047", quotes "QU-0012", credit notes "CN-0004", purchase orders "PO-0009".
- UK English copy throughout ("Organisation", "Authorised", "Favourites", "VAT").
- Page `<title>` pattern: "Invoices | Brightwater Creative Ltd | Xero" (never the word "Mock").
