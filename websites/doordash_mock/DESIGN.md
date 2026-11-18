# DoorDash account design

## Visual theme

Use a warm paper canvas and a dark plum header, with display-serif section titles and structured order rows. Put DoorDash in typeset text at the left of the header and the account name at the right. Place the four account destinations in a horizontal navigation row below. The restrained orange-red accent connects the brand name to primary actions. Use an original local food illustration or local CSS artwork for cuisine thumbnails. Give decorative artwork an empty alt attribute and keep merchant and status information in text.

## Color tokens

| Role | Value | Use |
| --- | --- | --- |
| Canvas | `#F6F2EB` | Page background |
| Surface | `#FFFDFA` | Cards and forms |
| Ink | `#241C22` | Primary body copy |
| Muted | `#675A63` | Secondary text |
| Header | `#2B1A2C` | Masthead background |
| Header text | `#FFF7EE` | Masthead content |
| Primary | `#A63223` | Buttons with white text and links on pale surfaces |
| Primary hover | `#852719` | Hover and pressed |
| Brand accent | `#FF947D` | Wordmark on plum |
| Border | `#DDD1CA` | Section and row separators |
| Input outline | `#8B787F` | Control boundaries |
| Focus | `#6750AB` | Visible keyboard focus against light surfaces |
| Success | `#235C43` on `#E0F1E7` | Delivered, issued, or active |
| Pending | `#754510` on `#FCEDD4` | In progress or requested |
| Error | `#8E2E30` on `#F9E2E2` | Canceled, declined, or validation errors |

## Typography

| Role | Font | Size / line height | Weight | Letter spacing |
| --- | --- | --- | --- | --- |
| Page title | Georgia, serif | 48 / 52 px | 600 | -0.03em |
| Panel title | Georgia, serif | 26 / 32 px | 600 | -0.02em |
| Wordmark | system-ui, sans-serif | 22 / 26 px | 800 | -0.04em |
| Body | system-ui, sans-serif | 15 / 22 px | 400 | normal |
| Action and nav | system-ui, sans-serif | 14 / 20 px | 650 | normal |
| Metadata | system-ui, sans-serif | 13 / 18 px | 500 | normal |

Use tabular numerals for money. Use system fonts or locally installed font assets.

## Spacing and layout

- Masthead 64 px tall, account navigation 52 px tall, both aligned to the main column. No desktop sidebar.
- Main column max width 1160 px with 32 px margins where space permits. Use a 48 px top inset, 24 px between sections and 12 px between related controls.
- Index pages have a title row, an optional primary action and a full-width list. Detail pages use a main panel and a roughly 300 px summary column, separated by a 24 px gap.
- Below 760 px, stack the summary and item metadata, use 16 px outer padding, and keep navigation accessible without page-level horizontal scrolling.

## Components and elevation

- Buttons and inputs are at least 44 px tall with 10 px radius. Secondary buttons use the surface, ink and input outline. Show keyboard focus with a 2 px ring and 2 px offset. Use explicit labels and distinguish errors in text.
- Order rows use 16 px padding and a 56 px thumbnail. Group and refund lists use the same reading order, with text pills for status. Use a clear link or button for each row action. Show a searchable empty state with a clear-filters button when applicable.
- Receipt, refund, and checkout summaries share a two-column label/amount grid. Cart lists group lines by participant. DashPass uses a larger membership card above a compact billing table.
- Confirm dialogs use a 520 px maximum width, 20 px radius, 24 px padding, focus containment, Escape to dismiss and focus restoration. Put consequences and amount on the confirmation screen. Announce confirmation and validation in accessible live regions.
- Panels use a 1 px border and 16 px radius. Use `0 2px 10px rgba(43, 26, 44, 0.06)` for elevated cards and `0 16px 56px rgba(43, 26, 44, 0.22)` for dialogs.

