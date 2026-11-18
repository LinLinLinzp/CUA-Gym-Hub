# AppFolio Property Manager design

## 1. Visual theme

A light property operations workspace with a warm off-white canvas, ink-blue masthead and plum primary actions. A horizontal navigation bar leaves the full content width available for dense lists. Use a readable serif for page titles and a compact sans-serif for controls and data. Render AppFolio as plain text with a system font.

## 2. Palette

| Role | Value | Use |
| --- | --- | --- |
| Masthead | `#20283A` | Brand, top navigation and account area |
| Masthead foreground | `#F8F5EF` | Brand and masthead links |
| Active masthead item | `#39425B` | Selected link with pale lavender bottom underline |
| Canvas | `#F6F4EF` | Page background |
| Surface | `#FFFFFF` | Tables, panels, dialogs and fields |
| Subtle surface | `#F1EFF5` | Table header and selected in-page segments |
| Primary text | `#242737` | Headings and rows |
| Secondary text | `#555D70` | Supporting text and field hints |
| Border | `#DEDAE4` | Rules and separators |
| Control border | `#82798D` | Inputs and secondary button outlines |
| Action | `#553981` | Buttons and links |
| Action hover | `#432867` | Active button hover and key links |
| Focus | `#8051BF` | Keyboard ring with 2px gap |
| Success | `#215942` on `#E5F2EA` | Paid, completed, active |
| Warning | `#704514` on `#F9EDDA` | Due soon, partial, scheduled |
| Urgent | `#8D2C42` on `#F8E6EB` | Urgent, overdue, invalid |
| Neutral | `#4B5265` on `#EEEDF2` | Archived, canceled, unassigned |

## 3. Typography

| Role | Family | Size / line height | Weight |
| --- | --- | --- | --- |
| AppFolio wordmark | Segoe UI, system-ui, sans-serif | 23 / 28px | 700 |
| Page title | Georgia, serif | 38 / 44px | 400 |
| Section title | Segoe UI, system-ui, sans-serif | 18 / 24px | 650 |
| Table, body and form controls | Segoe UI, system-ui, sans-serif | 14 / 20px | 400–600 |
| Status or metadata | Segoe UI, system-ui, sans-serif | 12 / 16px | 600 |
| Summary values | Segoe UI, system-ui, sans-serif | 30 / 36px | 650 |

Use tabular figures and right alignment for monetary columns. Keep unit labels, IDs and dates together. Use sentence case.

## 4. Layout

- Desktop masthead is 64px tall with 32px gutters. AppFolio sits on the left, the five navigation links follow, and the account name and initials sit on the right.
- Main content has a 1440px maximum width, 32px desktop gutters, 32px top padding and 24px between sections. Page titles lead with a breadcrumb on detail views and one primary action when available.
- The overview uses a row of four summary cards followed by two columns for urgent orders and upcoming expirations. Put the property and unit counts on the same card. Use light borders and an original line motif on the overview only where it does not compete with data.
- List pages place search and labeled filters above a bordered table with 48px minimum row height and 16px cell padding. Add pagination at 20 rows with a count and previous/next controls. Sort and filter before paginating, and return to the first page on filter changes.
- Detail pages use a main record column and a 320px summary column where useful, with a 24px gap. Show linked tables or timelines below the record fields. Rent ledger balances stay near the top.
- Below 900px, place the navigation on a second scrollable row and wrap filters. Below 720px, stack summary and detail columns, use 16px gutters, and confine horizontal table scrolling to the table region.

## 5. Components and feedback

- Primary and secondary buttons are at least 40px tall with 12px horizontal padding and an 8px radius. Use plum fill and white type for primary actions, white fill with an outline for secondary actions.
- Fields have persistent visible labels, a minimum 40px control height, 8px radius and 12px horizontal padding. Stack field groups with a 16px gap. Pair inline errors with form fields and keep input after validation.
- Tables use a flat 12px-radius container and 1px border. Linked names or IDs carry navigation, and sortable column buttons expose direction. Use text labels inside status pills.
- Center dialogs at a maximum of 600px with 24px padding, 16px radius and a `rgba(23, 26, 39, .45)` scrim. Focus the first logical field, keep focus inside, support Escape and return focus to the opener. On narrow screens allow the body of the dialog to scroll.
- Give empty collections and filtered-out results distinct copy. Offer a relevant create action or Clear filters. Show success feedback after save and link to the affected record when the user is on another page.
- Use original CSS shapes or locally authored icons for magnifiers, arrows and status marks. Use account initials and omit external visuals, fonts and fonts loaded at runtime. Maintain visible keyboard focus and readable labels at all supported widths.

## 6. Elevation

Use borders for cards and tables. Dropdowns and dialogs may use `0 12px 32px rgba(26, 29, 47, .14)`. Keep motion limited to short opacity changes and respect reduced-motion preferences.
