# OpenTable account design

## 1. Visual theme and atmosphere

Build a dining journal with an ivory canvas, plum navigation and a compact printed-reservation motif. A date block, clear booking metadata and close-up food photography give the interface its character. Use OpenTable as a typeset wordmark with no icon. Photography and food illustration use original work bundled with the site. Use a subtle, CSS-authored plate-and-linen treatment when a restaurant has no local image.

## 2. Color palette and roles

| Role | Color | Use |
| --- | --- | --- |
| Brand and primary action | `#B52840` | Booking and confirmation actions, wordmark on ivory |
| Primary hover | `#942235` | Hovered primary buttons |
| Canvas | `#F8F4EE` | Main workspace |
| Surface | `#FFFDFC` | Cards, forms, dialogs |
| Navigation rail | `#29212E` | Account navigation background |
| Rail selected | `#493346` | Active route background, with `#F4A1AA` leading accent |
| Rail text | `#FBF5EF` | Wordmark, navigation and user text on the rail |
| Main text | `#28232B` | Headings and body text |
| Muted text | `#625762` | Metadata and supporting text |
| Divider | `#E2D8D0` | Card borders and list separators |
| Control outline | `#8B7C86` | Form fields and outlined controls |
| Blush | `#F9E5E7` | Date panels and selective highlights |
| Success | `#225C45` on `#E4F1E8` | Confirmed, submitted and earned |
| Pending | `#724A19` on `#F8EAD6` | Pending points |
| Error | `#9F233B` on `#F9E5E7` | Validation and cancellation |

## 3. Typography

| Role | Font stack | Size | Weight | Line height | Tracking |
| --- | --- | --- | --- | --- | --- |
| Wordmark | Georgia, serif | 27px | 700 | 1.05 | -0.04em |
| Page heading | Georgia, serif | 44px desktop, 34px mobile | 700 | 1.10 | -0.035em |
| Card heading | Georgia, serif | 25px | 700 | 1.15 | -0.025em |
| Section heading | system-ui, sans-serif | 19px | 650 | 1.30 | -0.015em |
| Body and controls | system-ui, sans-serif | 15px | 400–650 | 1.50 | normal |
| Caption and status | system-ui, sans-serif | 13px | 500–650 | 1.35 | normal |

Use tabular numerals for party sizes, points and times. On long lists, foreground the restaurant name and show date, time and party size on a single line when space allows.

## 4. Spacing and layout

- At `1024px` and wider, use a `216px` full-height rail. In the main area use `40px` horizontal padding, `36px` top padding and a `1160px` content max width. Put Reservations, Find a table, Reviews and Points in the rail beneath the wordmark. Keep the diner name and initials at the bottom. Mark the active screen with an accent and `aria-current`.
- Below `1024px`, move navigation into a `64px` top header and a four-item row under it. Use `24px` content padding and reduce to `16px` below `600px`. Dark rail treatment carries through the mobile header. Maintain a single reading order without horizontal overflow at `360px`.
- Use an `8px` spacing scale with a `24px` default section gap. Cards have `16px` corners, `24px` padding and a `1px` divider border. Reduce card padding to `16px` on narrow screens.
- Reservations starts with its title and Find a table action, then tabbed list and search. Feature the nearest visible upcoming booking as a two-pane card with a right-side image taking about one third of the width, close-cropped to `190px` height or more. Show the date in a `76px` blush tile in the metadata pane. On mobile the image stacks above the details. Other bookings use compact rows with thumbnail, restaurant and metadata, status, and a detail link.
- Find a table uses a filter bar above a three-column restaurant grid, two columns below `1024px` and one below `620px`. Restaurant cards use a `16:9` image, name, neighborhood, cuisine and price, with available time buttons below. The restaurant detail adds description, address and a visible booking panel. Keep the selected date, time and party coherent through the booking flow.
- Reservation detail uses a wide summary panel alongside a compact details and actions panel. On mobile, place actions after the summary. On Reviews, place To review and My reviews beneath the heading. On Points, place the balance and pending total above reward tiles, then list dated activity with signed totals aligned on the right.

## 5. Component patterns

| Component | Specification |
| --- | --- |
| Primary button | Brand fill, white type, `44px` minimum height, `16px` inline padding, `8px` corners |
| Secondary button | Surface fill, `1px` control outline, main text, same dimensions as primary |
| Focus | `2px` rose outline with `3px` offset on light surfaces, blush outline on the dark rail |
| Text field | `44px` minimum height, visible label above, `1px` control outline, `8px` corners, inline field error beneath |
| Tabs | Active tab has a `3px` brand underline and stronger label. Use labeled buttons or links with accessible active state. |
| Time selection | Outlined `44px` minimum target with visible selected state and an accessible full time label. Wrap onto new rows. |
| Status | Short text in a pill with `6px 10px` padding. Use labels alongside color. |
| Dialog | Centered, surface fill, max `520px`, mobile margin `16px`, padding `24px`, corners `16px`. Use a visible title, keyboard focus management, Escape and a clear dismissal action. Primary destructive action uses explicit cancellation language. |
| Empty state | Use a concise heading and a task-appropriate action when available. Show a clear-filters action for search misses and Find a table for an empty upcoming list. |

## 6. Elevation and asset direction

- Card shadow `0 4px 16px rgba(41, 33, 46, .05)`. Dialog shadow `0 18px 60px rgba(41, 33, 46, .22)`, with `rgba(41, 33, 46, .52)` scrim.
- Produce local food and dining-room imagery in warm, natural light. Use wide tabletop crops for discovery and reserve a more tightly cropped rendition for booking cards. Choose imagery by cuisine, with a reusable original fallback. Keep content text out of the images.
- Prefer compressed local raster files under `public/images/`. Use CSS for the date tile and plate fallback. Use empty alternative text for decorative crops beside a visible restaurant name. Functional icons need accessible labels or visible text.
