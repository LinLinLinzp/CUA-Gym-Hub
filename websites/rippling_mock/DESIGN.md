# Rippling account workspace design

## Visual theme

Use a warm white canvas, an aubergine top navigation bar and pale lilac selection states. The dashboard uses a wide operational overview with a narrow queue alongside it. Lists and detail pages use bordered white surfaces and clear page actions. Render Rippling as plain text in the header and set the page title to Rippling.

## Palette

| Role | Value | Use |
| --- | --- | --- |
| Brand and navigation | `#351B3B` | Top bar and selected text on lilac |
| Navigation text | `#FCF5FF` | Wordmark and navigation |
| Canvas | `#F8F6F3` | App background |
| Surface | `#FFFFFF` | Tables, cards and dialogs |
| Main text | `#271E2B` | Titles and body |
| Secondary text | `#645C69` | Labels and metadata |
| Action | `#624079` | Primary buttons and links |
| Action hover | `#4F2E65` | Hover and active fill |
| Selected surface | `#F0E6F7` | Selected tabs and rows |
| Border | `#E2DBE4` | Panel outlines and row dividers |
| Control outline | `#8A798D` | Input and secondary action boundaries |
| Focus ring | `#734796` | Two pixels with two-pixel offset |
| Success | `#245840` on `#E8F4EA` | Active, available or approved |
| Warning | `#754500` on `#FFF0D5` | Pending or draft |
| Negative | `#8C3045` on `#FBEAF0` | Errors and declined requests |
| Neutral | `#514657` on `#EFEAF0` | Inactive, retired and cancelled |

## Typography and spacing

Use Segoe UI, system-ui, sans-serif with tabular numerals for totals and dates. Use normal letter spacing except for the wordmark and display title, which can use −0.02em.

| Role | Size / line height | Weight |
| --- | --- | --- |
| Wordmark | 23 / 28 px | 700 |
| Page heading | 32 / 38 px | 700 |
| Panel heading | 19 / 26 px | 650 |
| Body and controls | 14 / 21 px | 400–600 |
| Table supporting text | 13 / 19 px | 400 |
| Status and metadata | 12 / 18 px | 600 |

- Desktop header is 64 px. Place the wordmark and workspace name on the left, the five destinations across the middle, and the signed-in identity on the right. Use a lilac underline for the current destination.
- Center content at up to 1280 px with 32 px outer padding. Keep a 24 px gap between dashboard columns and 16 px between related controls. Use a 4 px spacing unit.
- At 960 px, put navigation on a second scrollable row and collapse the dashboard to one column. At 640 px, use 16 px padding, wrap toolbars and keep horizontal table scrolling within its own container.

## Components

- **Dashboard.** Put the organization name above a two-column work area. The main column links to Employees, Devices, Time Off and Payroll and shows live counts derived from loaded state. The side column links directly to pending requests and draft runs. Display available inventory when it helps users choose the next action.
- **Lists.** Use a heading and primary action, then search and filters, then a bordered table with 44–52 px rows and 20-row pagination. Show status as text inside tinted pills. Use real buttons for sort and real links for detail destinations. Filtered empty states include Clear filters. Empty collections show a relevant create action.
- **Details.** Place a breadcrumb above the heading. Put primary actions in the heading row. Group record fields in a wide panel and related records or history in a secondary panel that stacks on smaller screens.
- **Forms and confirmation.** Use labelled controls with a 40 px minimum height, 8 px radius and visible focus. Use dialogs around 640 px wide, expanding to 840 px for payroll lines. Keep actions visible, put errors next to inputs, and restore focus on close. Keep success feedback in a live region.
- **Visual assets.** Use locally styled initials for employee avatars, CSS accents and locally authored icons if needed. Use plain text for the brand name. Keep every asset available in the built bundle.
- **Elevation.** Keep tables flat with a 1 px border and 12 px corner radius. Use `0 6px 20px rgba(53, 27, 59, 0.12)` for menus and `0 16px 48px rgba(53, 27, 59, 0.24)` for dialogs.

