# Wayfair account design

## Visual theme

Build a quiet account workspace with a warm paper background, deep plum controls, and small original furniture illustrations. Use plain Wayfair text in a serif face at the upper left. The overview pairs a pale lavender welcome panel with a compact summary of upcoming deliveries and open requests. All workflow pages share the same account navigation, restrained section headings, and prominent contextual actions.

Use illustrations to identify products and support the overview. Give a task's status and next action priority over artwork. Use concise interface copy such as **Orders**, **Schedule delivery**, **Report damage**, and **Start a return**.

## Color tokens

| Token | Value | Use |
| --- | --- | --- |
| `--background` | `#F7F4EF` | Account canvas |
| `--surface` | `#FFFFFF` | Cards, header, dialog and fields |
| `--ink` | `#25212A` | Headings and main copy |
| `--muted` | `#655B69` | Labels, descriptions and metadata |
| `--brand` | `#4F2A68` | Wayfair text, primary buttons and links |
| `--brand-hover` | `#3B1D50` | Hover and pressed actions |
| `--brand-wash` | `#F0E8F5` | Overview panel and selected navigation |
| `--line` | `#E3DCE5` | Card outlines and dividers |
| `--field-line` | `#8A7E91` | Input and control outlines |
| `--focus` | `#593494` | Keyboard focus outline |
| `--success` / `--success-wash` | `#285943` / `#E9F3EC` | Delivered, confirmed and refunded |
| `--warning` / `--warning-wash` | `#735218` / `#FAF0D6` | Action needed and awaiting confirmation |
| `--error` / `--error-wash` | `#962E44` / `#FAE8ED` | Errors and destructive actions |
| `--neutral` / `--neutral-wash` | `#514659` / `#F0ECF1` | In-progress and historical statuses |

Show a readable status label on each badge. Tint and icons reinforce the label. Use the dark token for text on the matching tint and underline contextual links on hover.

## Typography

Use Georgia, `Times New Roman`, serif for brand text and primary headings. Use `system-ui`, `Segoe UI`, sans-serif for everything else. Use tabular numerals for totals, dates and order references.

| Role | Family | Size | Weight | Line height | Tracking |
| --- | --- | --- | --- | --- | --- |
| Wayfair text | Serif | 29 px | 700 | 34 px | −0.7 px |
| Page heading | Serif | 42 px desktop, 34 px narrow | 700 | 46 px / 40 px | −0.9 px |
| Section heading | Sans-serif | 22 px | 650 | 28 px | −0.25 px |
| Card heading | Sans-serif | 16 px | 650 | 22 px | Normal |
| Body | Sans-serif | 15 px | 400 | 22 px | Normal |
| Button and field label | Sans-serif | 14 px | 650 | 20 px | Normal |
| Metadata and status | Sans-serif | 13 px | 500 / 650 | 18 px | Normal |

## Spacing and layout

- Use a 4 px spacing base with common steps of 8, 12, 16, 20, 24, 32 and 40 px. Keep the desktop header at 72 px and cap its inner width and the account frame at 1440 px.
- At widths of 900 px and up, use a 232 px navigation rail, a 32 px gap, 32 px outer padding and a fluid content column capped at 1104 px. The rail shows the account holder's name above Overview, Orders, Deliveries, Damage claims and Returns. The active item uses `--brand-wash`, a plum 3 px leading bar, and `aria-current="page"`.
- Below 900 px, place the same labeled links in a wrapping navigation row below a 60 px header. Use 20 px outer padding, drop to 16 px below 480 px, and stack all columns. Keep controls usable at 360 px without page-level horizontal scrolling.
- Use 20 px card padding, 16 px list gaps, 32 px section separation and 14 px card radii. On desktop, the overview welcome panel is up to 176 px tall with a 40% illustration area. Follow it with two equal summary cards and a recent orders list. On mobile, let the welcome panel size to content and keep critical navigation above summaries.
- Give order cards a flexible summary row containing the number and placed date, status badge, and total. Put product previews and **View order** in the lower row. Group order detail by shipment. At 1100 px and up, a 280 px right column holds totals and address. Below that breakpoint, place those sections after the shipment and service actions.

## Component patterns

- **Buttons.** Use 44 px minimum height, 10 px radius and 16 px horizontal padding. Primary buttons have `--brand` fill and white type. Secondary buttons have a white fill and `--field-line` outline. Destructive confirmation uses `--error` with white type. Give icon-only controls a visible tooltip and accessible name. Apply a 3 px `--focus` outline with a 2 px offset on keyboard focus.
- **Fields.** Set a minimum height of 44 px, 8 px radius, and a 1 px `--field-line` outline. Place labels above inputs and error or eligibility text below. At narrow widths, make search full width and allow filters to wrap. Preserve entered values on validation errors.
- **Cards and status.** Use a white fill and 1 px `--line` outline. Use 24 px minimum height, 8 px horizontal padding and a 999 px radius for status badges. Align dates and status labels consistently between cards. Product previews are 56 px square on overview cards and 72 px square on order detail, with 8 px radii and `object-fit: cover`.
- **Shipment timeline.** Use a semantic list with a 2 px vertical rule, 8 px markers and the event time beneath each milestone. Mark the most recent event in plum and label the current shipment status in text. Keep the timeline visible alongside the appointment state when both are present.
- **Workflow dialogs.** Use a centered, scrollable dialog up to 560 px wide with 24 px inner padding, 16 px radius and a viewport gutter of at least 16 px. Start with a descriptive title, put selected items or current booking above inputs, and keep the back and confirmation buttons together at the bottom. Use focus containment, Escape to dismiss, and return focus to the trigger. Bring focus to the first invalid field or the confirmation heading as appropriate.
- **Feedback.** Place inline validation by the relevant field and announce submit feedback through an accessible status region. Show loading, no-results and unavailable states in the content area with explanatory copy and a recovery link when one exists. Confirmation views show the new reference and a link to the affected record.

## Elevation and surface

Cards rely on their outline. Dialogs use `0 24px 64px rgb(37 33 42 / 20%)` over a `rgb(37 33 42 / 36%)` scrim. Give popovers a 1 px outline and `0 8px 24px rgb(37 33 42 / 14%)`. Limit transitions to 150 ms for controls and honor reduced-motion preferences.

## Original local artwork

Create an original raster illustration of a reading corner for the overview. Use a plum upholstered chair, a warm oak end table and a sage lamp on a lavender background. Keep a 3:2 source composition and place the objects toward the right so text can occupy the left part of the panel without overlap. Store the illustration as a local WebP, around 600 by 400 px.

Create approximately 16 square product illustrations drawn from the synthetic assortment, including a sectional, dining chair, console, sideboard, lamp, rug and bedding. Use the same soft shadow and neutral background, with varied fabrics and finishes. Place WebP files under `public/images/` and map them to stable product image keys. Use a neutral, locally styled thumbnail placeholder for unknown keys. Give artwork empty alt text when the adjacent title already identifies the product. Render the Wayfair name as text and source every asset locally at runtime.
