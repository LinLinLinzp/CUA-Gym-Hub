# Recreation.gov account design

Build a trip ledger with a spacious cream canvas, a narrow account navigation rail and small field-guide illustrations. The primary content stays readable at dashboard density. Reserve the strongest color for booking and application actions.

## Color

| Role | Color | Use |
|---|---|---|
| Page | `#F5F2E9` | Canvas |
| Surface | `#FFFCF5` | Cards, forms and dialogs |
| Ink | `#192C28` | Headings and body |
| Secondary ink | `#4E625B` | Supporting labels |
| Evergreen | `#155448` | Primary action and selected navigation |
| Evergreen hover | `#113E35` | Hovered primary action |
| Mint | `#E0EBE5` | Selected navigation and confirmed status |
| Clay | `#A0472D` | Small illustration highlights |
| Border | `#D6DDD2` | Cards and separators |
| Control line | `#728579` | Input outlines |
| Focus ring | `#2465AB` | Keyboard focus |
| Pending | `#77531C` on `#F7EACF` | Submitted and deadline notices |
| Cancelled | `#8E2F2F` on `#F7E3E0` | Cancellation and form errors |

## Type

| Role | Font | Size / line-height | Weight |
|---|---|---|---|
| Brand text | System UI | 20 / 26 px | 750 |
| Page title | Georgia, serif | 44 / 48 px on desktop, 34 / 38 px on mobile | 400 |
| Section title | Georgia, serif | 28 / 34 px | 400 |
| Record title | System UI | 17 / 24 px | 650 |
| Body and controls | System UI | 15 / 22 px | 400–650 |
| Supporting labels | System UI | 13 / 18 px | 500–650 |

Use sentence case, tabular numbers for dates and fees, and underlines on prose links. Set page title tracking to -0.02em. Keep headings and names able to wrap.

## Layout

- Set the 64px full-width evergreen header above a centered shell of at most 1360px. Put the text wordmark on the left and the signed-in first name or initials on the right. Give the wordmark a link to the account overview.
- On desktop, set a 216px left rail and a fluid main column with 32px horizontal padding and 24px section gaps. The rail contains Overview, My reservations, My lotteries, Explore, and Find a lottery. Highlight the current section and keep the labels visible.
- At widths below 760px, use a single column with 16px gutters and wrap the navigation into a compact set of links. Stack form controls, fee details, and action groups on narrow screens. Keep confirm and dismiss actions visible without horizontal scrolling.
- The overview features a two-column next-trip card. Place dates, title, confirmation and action on the left and the [original landscape graphic](assets/trip-landscape.svg) on the right. Swap in a browse link when there is no upcoming trip. Keep the illustration decorative and remove its panel at narrow widths if needed. Below, show a short reservation list and the lottery summary or a link to find opportunities.
- Reservation and lottery lists use card-contained rows with a clear primary link, date or window, secondary context and a text status pill. Show a simple filter bar above results. Keep counts tied to actual results.
- Detail and review screens use a main information panel and a narrower fee or trip summary on desktop. Preserve the same reading order when stacked.

## Components

- Use 44px minimum interactive height for buttons and fields, an 8px control radius, 12px card radius and 1px borders. Primary buttons use evergreen and white. Secondary buttons use the surface and ink. Use the cancelled palette on destructive confirmation and keep a visible dismiss action.
- Use a clearly labeled form control for each date, party size, and equipment preference. Announce errors adjacent to inputs and near submit when a user must correct several fields. Render status messages in a live region and preserve details on the page after success.
- Use a 520px maximum width for cancellation dialogs with 24px inner padding, a 2px focus indicator and a backdrop of `rgba(25,44,40,.46)`. Trap focus, keep Escape and the close button available, and return focus to the invoker if dismissed.
- Use a flat outline on ordinary cards and `0 4px 16px rgba(25,44,40,.07)` for the next-trip card. Use `0 16px 48px rgba(25,44,40,.18)` for dialogs. Use CSS or local artwork for all decorative elements.
