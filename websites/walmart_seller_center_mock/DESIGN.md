# Walmart Seller Center — design system

## Visual theme

Use a light workspace with a horizontal account bar and a single level of navigation. Put the Walmart Seller Center text wordmark on the left and the seller name and initials on the right. Content sits on a cool paper background, with white working surfaces and saturated blue for actions. Use warm yellow sparingly in the Overview illustration and one accent underline. The account should feel at home in an operations team where people spend a day reading lists, scanning deadlines and confirming changes.

## Color palette

| Role | Token | Application |
|---|---|---|
| Brand and primary action | `#0055A6` | Wordmark, filled actions, active navigation |
| Action hover | `#004282` | Primary button hover |
| Focus | `#1977D0` | Keyboard focus outline |
| Accent | `#FFC540` | Overview illustration and active navigation underline |
| Canvas | `#F4F7FA` | Page outside cards |
| Surface | `#FFFFFF` | Account bar, tables, form panels |
| Alternate surface | `#EDF4FC` | Overview hero and selected table row |
| Border | `#DCE4EC` | Cards, table rules, dividers |
| Field border | `#7B8B9C` | Inputs and selects |
| Primary text | `#16273C` | Titles, rows, totals |
| Secondary text | `#4F6073` | Metadata, column headings, helper text |
| Success | `#17613C` on `#E7F4EC` | Published, shipped, refunded |
| Attention | `#805100` on `#FFF2D6` | Low stock, new, received |
| Error | `#A12632` on `#FCECEF` | Invalid fields, canceled orders |
| Neutral | `#3F5265` on `#EEF2F6` | Draft, retired, missing metadata |

## Typography

Use a local system stack, `"Segoe UI", system-ui, sans-serif`. Apply tabular figures to counts, quantities and amounts. Item SKUs and order IDs use the same typeface at 13px with medium weight.

| Role | Size | Weight | Line height | Tracking |
|---|---|---|---|---|
| Overview heading | 36px | 700 | 44px | -0.025em |
| Page heading | 30px | 700 | 38px | -0.02em |
| Panel title | 18px | 650 | 24px | -0.01em |
| Wordmark | 19px | 700 | 24px | -0.02em |
| Table and form text | 14px | 400–600 | 20px | normal |
| Supporting metadata | 12px | 500 | 16px | normal |

## Spacing and layout

- Center the workspace within a 1440px maximum width with 36px desktop gutters, 28px from the navigation to the page title, and 24px between panels. Align the full-width account and navigation contents to the same grid.
- The 64px account bar and 48px navigation strip sit above the workspace. Use Overview, Catalog, Orders and Returns as text links. The active tab uses bold blue type and a 3px bottom rule. The account initials badge is 32px.
- Overview uses a 200px feature panel, followed by three equal summary cards and two queue panels for unshipped orders and received returns. Keep the hero title and one sentence left aligned. Use an original flat illustration of a shipping carton, label and handcart on the right. Use local CSS shapes or an original local raster illustration. Keep the illustration decorative and leave item photography out of this phase. Category thumbnails can use original local raster artwork or simple CSS silhouettes.
- Each queue places its title and primary action above a white 12px-radius working card. Inside, put tabs or summary counts first, then search and filters, then table and footer. Use 44px minimum rows in Orders and Returns and 60px in Catalog. Thumbnails are 36px square. Use 16px horizontal cell padding and prioritize item or record ID at the left.
- Detail pages use a back link, title, status and available actions above a 2:1 grid. Place line items and activity left, totals and metadata right. Item setup uses labeled sections within one 760px form with actions in a footer.
- At 900px use 24px gutters and stack the paired overview panels. At 680px use 16px gutters, allow navigation to scroll, stack details and filters, and give wide tables their own horizontal scroll. Keep action buttons and inputs visible without scrolling the whole page horizontally.

## Component patterns and elevation

- Buttons are at least 40px high with 8px radius, 14px semibold labels and 16px horizontal padding. Primary uses blue fill and white text. Secondary uses white fill, 1px border and dark text. Use error-colored text or fill for destructive confirmation. Provide clear hover, disabled and 2px focus-visible states.
- Inputs and selects use a persistent label except when an equivalent accessible search label is provided. Use 40px minimum height, 8px radius, 1px field border and 12px padding. Show validation below the field and associate it with the input.
- Status pills use 12px semibold text with 4px vertical and 8px horizontal padding and a 999px radius. Use status names in text. Cards use a single 1px border and a subtle `0 1px 2px rgba(22,39,60,.06)` shadow where separation helps.
- Use confirmation dialogs with a visible title, summary of affected records and a labeled final action. Use a 480px default width, up to 640px for refund lines, with 16px radius, 24px padding and a `0 16px 48px rgba(22,39,60,.22)` shadow. Trap and restore focus, support Escape, and keep errors visible. Short success messages supplement the immediately updated table, detail and activity views.
