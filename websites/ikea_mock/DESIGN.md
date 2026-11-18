# IKEA account design

## Visual direction

Use a warm, airy account workspace for organizing purchases and home services. Set IKEA as plain bold text in the header. Pair ink and off-white with deep cobalt and small touches of yellow. Use a custom furniture vignette in the account hero and keep shopping, scheduling and returns in view from the account navigation.

## Color

| Role | Value | Where to use |
| --- | --- | --- |
| Page | `#F5F3EE` | Account background |
| Surface | `#FFFFFF` | Forms, list cards and dialog surfaces |
| Ink | `#17232B` | Headings and product or order names |
| Secondary ink | `#50616A` | Descriptions, dates, subtotals |
| Blue | `#17436A` | Active navigation, primary controls, hero background |
| Blue hover | `#103450` | Primary control hover and pressed states |
| Yellow | `#F5CC51` | Hero illustration and occasional highlight with ink text |
| Outline | `#DADFD9` | Card dividers and surface edges |
| Input outline | `#72828B` | Field and control boundaries |
| Success | `#245841` on `#E4F1E8` | Delivered and confirmed states |
| Warning | `#744415` on `#FFF0D9` | Pending or incomplete states |
| Error | `#A12633` on `#FCEBED` | Inline validation and unavailable actions |

## Typography

Use the system stack `system-ui, "Segoe UI", sans-serif`. Use tabular numerals for prices and reference numbers.

| Role | Size / line | Weight | Tracking |
| --- | --- | --- | --- |
| Account headline | 48 / 52 px | 750 | -0.04em |
| Page heading | 36 / 42 px | 720 | -0.03em |
| Section heading | 23 / 30 px | 680 | -0.02em |
| Row title and control | 15 / 22 px | 650 | Normal |
| Body | 15 / 23 px | 400 | Normal |
| Caption and status | 13 / 18 px | 550 | Normal |

## Layout

The header is 72 px high with the text brand at left and the cart and profile at right. Center the content in a 1440 px maximum frame with 32 px outer padding. Use a 224 px account rail and a 32 px gap. Start the main content with 32 px top padding. Use a 24 px section gap, a 16 px gap among related cards and 20–24 px card padding.

On the overview, place the greeting and primary action on a 246 px minimum-height blue panel with the illustration on its right. Below it, show three linked cards for the cart, deliveries and assembly, and returns. Then show recent purchases with a link to all orders. At 960 px and below, put navigation in a wrapping row above the main content. At 640 px and below, use 16 px page padding, a 34 px overview heading and single-column cards. Keep schedule options and confirmation controls in the document flow.

Use a broad list column and a 320–340 px summary column for cart and checkout where they fit. In stacked views, place the summary after the form or items. Use rows for orders and services with the date and reference beneath the headline, and a clearly labeled status at the end.

## Components and states

- Primary actions use a 44 px minimum height, 16 px horizontal padding, 9 px corner radius, blue background and white text. Secondary controls use a white surface, ink text and an input-outline border. Use a visible 2 px focus outline with 2 px offset and keep controls usable with keyboard and touch.
- Fields use persistent labels, inline errors and 44 px minimum height. Quantity controls expose the product name in their accessible label. Schedule choices use native radios or equivalent selection semantics and show date, time range and fee when relevant. Status labels include text.
- White cards use a 1 px outline and 14 px radius. Let the active navigation link use a pale blue background and a left accent. For confirmations, use one 480 px maximum-width dialog with clear action labels, focus management and Escape close.
- Use no shadow on standard lists. Use `0 12px 32px rgba(23, 35, 43, 0.12)` for overlays. Honor reduced motion and announce feedback with a live region.
- Create original local imagery for the hero and category thumbnails. Art direction for the hero is a small living room vignette with an ochre floor lamp, cream shelving, plant and a pale oak bench against the blue panel. Product art can be a set of local furniture illustrations by category with a shared warm backdrop and a graceful missing-art fallback. Keep meaningful text and controls in HTML.
