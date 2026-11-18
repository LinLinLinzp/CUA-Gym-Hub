# United Airlines account design

## Visual theme

Use a warm off-white workspace, ink-blue type and amber for the next-step emphasis. Use the words “United Airlines” as a text wordmark. The overview opens with a large next-trip card that pairs a typographic route with an original route illustration. Miles and travel credits sit alongside as compact utility cards with labeled values and direct links.

Make the illustration locally with CSS. A dotted flight path joins two endpoint markers over a quiet, abstract grid inside the trip card. Keep every airport code, time and fare outside the decorative layer as readable text. Use local system typography and draw any simple controls with CSS or text. Treat decorative elements as hidden from assistive technology.

## Color roles

| Role | Value | Use |
| --- | --- | --- |
| Ink | `#102844` | Wordmark, titles, hero background |
| Page | `#F6F5EF` | Main canvas |
| Panel | `#FFFFFF` | Tables, forms, cards |
| Body | `#263A51` | Primary text |
| Muted | `#52647A` | Metadata, captions |
| Action | `#174D8C` | Links and primary buttons |
| Action hover | `#113B6D` | Primary hover |
| Amber | `#F5C975` | Hero accent and prominent hero action with ink text |
| Border | `#D6DEE6` | Dividers and passive card outlines |
| Input outline | `#738198` | Interactive control boundary |
| Focus | `#0066C1` | Visible outline offset by 3 px |
| Success | `#1C634B` on `#E6F5ED` | Available and confirmed states |
| Warning | `#744A06` on `#FFF1D1` | Limited eligibility and pending states |
| Error | `#9C293C` on `#FAE9EC` | Errors and cancelled states |

## Typography

Use `system-ui, "Segoe UI", sans-serif` and tabular numerals for money, miles, flight numbers and times.

| Role | Size / line height | Weight | Tracking |
| --- | --- | --- | --- |
| Wordmark | 18 / 24 px | 750 | −0.02em |
| Page heading | 38 / 44 px | 720 | −0.035em |
| Hero route codes | 44 / 48 px | 720 | −0.04em |
| Section heading | 22 / 28 px | 680 | −0.02em |
| Body | 15 / 22 px | 400 | Normal |
| Control | 14 / 20 px | 650 | Normal |
| Metadata | 13 / 18 px | 500 | Normal |

## Layout

- Desktop masthead is 72 px tall with the brand on the left and the member's initials and name on the right. Below it, place a 216 px vertical navigation rail and a main area padded by 32 px. Center main content within a 1240 px maximum.
- At 1024 px and above, use a two-thirds and one-third split for the overview, with the wide trip panel next to stacked miles and credits cards. Use a 20 px gap, 16 px card radius and 24 px interior padding.
- Below 860 px, move navigation into a wrapping row below the masthead and stack major panels. At phone widths, use 16 px page padding and render tables as labeled rows or cards. Keep route information and checkout totals visible without horizontal page scrolling. Allow horizontal scrolling within a seat map only if the cabin cannot fit at the minimum target size.

## Component patterns

- Buttons and inputs have a minimum height of 44 px and a 10 px radius. Labels sit above fields and error details appear immediately below the related field. Use a solid blue primary action and bordered secondary action on white.
- List controls sit above rows with explicit status, search and sort labels. Pair status text with color. Cards use a 1 px outline and `0 2px 10px rgb(16 40 68 / 5%)` shadow. Elevated review dialogs use a 16 px radius and `0 18px 50px rgb(16 40 68 / 18%)` shadow.
- Seat maps show column headers, row numbers, a physical aisle gap, named states in a legend and 44 px targets. Each seat button's accessible name includes its seat, position and relevant state or fee. Mark draft selection with a check and outline, and the current assignment with a text label.
- Keep review totals and confirmation controls adjacent. In dialogs, move focus inside, handle Escape, restore focus to the launcher, and announce confirmation changes. Return an inline empty state with a relevant next action for empty trips, ledger entries and credits.
