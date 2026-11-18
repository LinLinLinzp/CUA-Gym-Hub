# Grubhub account design

## Visual theme

Give the account the legibility of a restaurant receipt and the color of a neighborhood café. Use a warm paper background, dark teal type and clay accents. Put `Grubhub` in plain bold type on the left side of a light header. Set the page title in a serif face, with the information and controls in a system sans serif. The left rail, split desktop layout and small illustrated cuisine tiles give orders, deliveries and refunds a consistent home.

At desktop width, the Orders view opens with the page title and a `Browse restaurants` action. Search and the status filters sit immediately above the entries. Put a small next-delivery panel in the right column that links to the Scheduled deliveries view. Hide the panel when there is no upcoming delivery and let the list expand. Keep the order actions within the entries and receipt, where the diner can see which order is affected.

## Color palette

| Token | Hex | Role |
| --- | --- | --- |
| `page` | `#F6F3EB` | Main background. |
| `surface` | `#FFFCF6` | Cards, header and dialogs. |
| `ink` | `#142F2D` | Body copy and headings. |
| `muted` | `#50615A` | Metadata and secondary copy. |
| `border` | `#DAD3C5` | Surface rules and card edges. |
| `field-border` | `#82786C` | Input boundaries. |
| `brand` | `#A13D2B` | Text wordmark and small clay accents. |
| `action` | `#21534C` | Primary buttons, active rail link and key links. |
| `action-hover` | `#173F39` | Primary hover. |
| `selected` | `#E6EEE4` | Active navigation, current filter and upcoming panel. |
| `focus` | `#AC481D` | Focus-visible outline. |
| `positive-bg` / `positive-ink` | `#E6F0E3` / `#28513E` | Delivered, approved and refunded. |
| `pending-bg` / `pending-ink` | `#FAECD4` / `#714C20` | Placed, scheduled and requested. |
| `alert-bg` / `alert-ink` | `#F7E5DF` / `#8D3527` | Cancelled, denied and field errors. |

## Typography

| Role | Font | Size / line height | Weight | Tracking |
| --- | --- | --- | --- | --- |
| Wordmark | `system-ui, Segoe UI, sans-serif` | `24px / 28px` | `800` | `-0.06em` |
| Page title | `Georgia, Cambria, serif` | `46px / 50px` | `400` | `-0.035em` |
| Section heading | `Georgia, Cambria, serif` | `25px / 30px` | `400` | `-0.025em` |
| Card title | `system-ui, Segoe UI, sans-serif` | `17px / 23px` | `650` | `-0.015em` |
| Body and controls | `system-ui, Segoe UI, sans-serif` | `15px / 22px` | `400` or `600` | `0` |
| Metadata and status | `system-ui, Segoe UI, sans-serif` | `13px / 18px` | `500` | `0` |

Use tabular numerals for amounts and times. On narrow screens set the page title to `36px / 42px`. Display currency with two decimal places and match the language of the control to the action it confirms.

## Layout and spacing

- The header is `72px` tall with a bottom border. Its inner content and main shell share a `1360px` maximum width and `32px` horizontal gutters. Use `40px` for the top padding below the header.
- Use a `204px` navigation rail and `32px` gap to the content area. The desktop rail shows the diner's name above the three account links. Use `44px` row height, `12px` horizontal inset and `8px` radius for links.
- At widths of `1200px` and above, the Orders page can reserve `260px` for the next-delivery panel, with `24px` between columns. Its list uses one column and the entries maintain reading order when the panel stacks. Receipt and checkout pages use the same two-column proportions for the totals summary, which follows the form or receipt when stacked.
- Use a spacing scale of `4`, `8`, `12`, `16`, `24`, `32`, and `40px`. Card padding is `20px`, card gap `12px`, card radius `14px`. Route content uses `minmax(0, 1fr)` where needed so long restaurant names and order IDs wrap.
- Below `900px`, move the three account links into a horizontal nav below the header. Use the labels `Orders`, `Scheduled`, and `Refunds` at narrow widths, with the full section name in its heading. Reduce horizontal gutters to `16px`, stack forms and side content, and place card actions beneath the item summary. At `390px`, the header still shows the brand text and actionable restaurant and bag links at a usable size.

## Components and original local artwork

- **Order and case cards.** Group the title, date and ID at the top. Place status and price on the right with wrapping on small displays. Keep the preview to two lines and provide explicit action links, with one main action per card. For receipts, divide items, totals, delivery and payment details with thin borders. IDs and masked payment details stay selectable.
- **Cuisine tiles.** Use a `56px` square with `10px` radius on order cards and a shallow banner using the same motif on catalog cards. Author abstract motifs locally with CSS backgrounds and pseudo-elements, using warm green for greens, ochre for rice, dusty plum for noodles and clay for pizza, tacos and sandwiches. A three-line or concentric-ring pattern is enough to distinguish categories. Provide a paper and ink fallback for uncategorized injected data. The tiles are decorative and hidden from assistive technology.
- **Buttons and inputs.** Use a `44px` minimum control height with `10px` radius. A primary button uses action fill with white text and `16px` inline padding. A secondary button uses the surface fill, ink text and a field border. Text links are underlined on hover and focus. Add a `2px` focus-visible outline with a `3px` offset. Search and filters have explicit accessible labels. Status badge text accompanies status color.
- **Schedule and refund dialogs.** Use a native dialog or equivalent with labeled headings, Escape dismissal, initial focus and focus restoration. Limit width to `560px` with `24px` padding and a `16px` radius. Stack the next steps on mobile with the confirm button after form fields. Show the currently booked window before the reschedule inputs. Keep inline errors near the affected field and announce the result after confirmation.
- **Elevation.** Cards use a `1px` border. The dialog and header menu use `0 12px 36px rgb(20 47 45 / 18%)` shadows. Dialog overlays use `rgb(20 47 45 / 40%)`. Use subtle opacity or background transitions and respect reduced-motion preferences.

## Visible content

Use account labels and workflow controls as the primary text. Order confirmation shows the order ID, next or scheduled delivery information, and a link back to Orders. Refund confirmation shows the case ID, status and submitted amount with a link to the original receipt. Empty views name the missing content and offer the next relevant action, such as `Browse restaurants` or `Clear filters`.
