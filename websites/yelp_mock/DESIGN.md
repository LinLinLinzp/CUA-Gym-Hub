# Yelp account design

## Visual theme

Build an account workspace with warm paper surfaces, dark plum navigation, and coral actions. The overview pairs a typographic account introduction with one original still life showing a folded neighborhood map, a café cup, and a reservation card. Activity lists use compact rows with light separators and clearly labeled actions.

Use Yelp as plain text in the top bar. Create the overview artwork and business thumbnails as original local raster illustrations under `public/art/`. Create distinct images for restaurants, cafés, home services, and other listing categories. Use local category artwork when a listing supplies no usable image. Reference imagery by local path and give decorative art empty alt text.

## Color

| Role | Value | Use |
| --- | --- | --- |
| Brand text and primary action | `#B52D32` | Yelp wordmark on paper, primary button background |
| Primary hover | `#952229` | Primary buttons and coral links |
| Paper | `#F8F4EE` | Page background |
| Surface | `#FFFFFF` | Cards, forms, and panels |
| Ink | `#261F24` | Headings and primary copy |
| Muted ink | `#665B63` | Dates, addresses, and secondary copy |
| Navigation | `#302331` | Account sidebar with `#FFF7F1` text |
| Selected navigation | `#514052` | Selected row with light text and a coral inset marker |
| Border | `#DED4CE` | Decorative dividers |
| Control border | `#8C787F` | Input outlines on white |
| Focus | `#345AA5` | 2px outline with 3px offset, use `#FCD49C` on plum |
| Success | `#255E46` on `#E7F3EB` | Saved, published, or confirmed |
| Pending | `#744610` on `#FFF0D7` | Submitted quote |
| Neutral | `#554A53` on `#EFE8EC` | Archived or past |
| Error | `#98252E` on `#FBE9E7` | Validation and cancellation |

Use labels with status colors. Distinguish selection and focus by shape, outline, or underline as well as fill.

## Typography

| Role | Family | Size / line height | Weight |
| --- | --- | --- | --- |
| Yelp text | system-ui, Segoe UI, sans-serif | 28 / 32px | 800 |
| Overview title | Georgia, serif | 48 / 52px | 400 |
| Screen heading | Georgia, serif | 36 / 42px | 400 |
| Section heading | system-ui, Segoe UI, sans-serif | 20 / 28px | 700 |
| Body | system-ui, Segoe UI, sans-serif | 16 / 24px | 400 |
| Labels and actions | system-ui, Segoe UI, sans-serif | 14 / 20px | 650 |
| Metadata and status | system-ui, Segoe UI, sans-serif | 13 / 18px | 500–650 |

## Layout

- The 72px white top bar holds Yelp text, Discover, and the signed-in identity. Use a 216px plum rail below it for Overview, Reviews, Bookmarks, Quote requests, and Reservations.
- Use 32px main padding, a 1120px content maximum, and 24px section gaps. The overview introduction is a two-column 3:2 panel. Follow it with four linked summaries in a 2-by-2 grid and a compact recent-activity list. Keep artwork out of the transaction screens so lists and forms can use the available width.
- Lists place search, filters, and action controls above records. A row uses a 52px thumbnail or initials cell, a flexible text area, and a labeled action or status. Business detail uses a 2:1 split for information and eligible actions. Quote and reservation details use a single readable column with a width up to 680px.
- At 860px and below, put account navigation in a wrap-capable row below the header, use 20px main padding, and stack business details. At 560px and below, use 16px padding, a 32px overview title, and single-column summaries. Move row actions below text as needed. Verify at 390px and 1440px.

## Components

- Buttons are at least 44px tall with 14px horizontal padding and an 8px radius. Primary buttons use solid coral and white text. Secondary buttons use white with an ink label and control border. Destructive controls use error text and a named confirmation step.
- Inputs are at least 44px tall with a visible label, a 1px control border, and an 8px radius. Place validation text below the affected input and link it through `aria-describedby`. Stars form a labeled radio group with five keyboard-operable options and a text rating.
- Cards use 16px corners and 20px padding. Rows and list panels use 12px corners when grouped in a bordered surface. Tabs show the active label with an underline and expose selection semantically.
- Use a focused dialog for review composition, collection selection, and destructive confirmations. Use routed details for quote and reservation history. Preserve form values during validation, return focus on dialog close, and announce successful mutations in a polite status region. Keep visible confirmation details available after any transient feedback.
- Empty views explain what belongs in the list and link to its working entry point. Use brief inline feedback for missing businesses or records and provide a route back to the parent view.

## Elevation

Use flat list surfaces. Use `0 8px 24px rgb(38 31 36 / 10%)` for menus and `0 18px 56px rgb(38 31 36 / 24%)` for dialogs with a `rgb(38 31 36 / 44%)` backdrop.
