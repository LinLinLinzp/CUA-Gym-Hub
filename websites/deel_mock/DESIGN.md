# Deel — Northstar Studio account design

## 1. Visual theme and atmosphere

Use a slate-and-apricot palette with a pale neutral workspace and a compact horizontal header. Pair dark editorial headings with legible financial tables. The overview uses a two-column composition with a clear work queue and a compact account summary. Build its small abstraction of overlapping forms and calendar marks with CSS and local system typography. Use the brand name `Deel` as plain text in the header and initials for worker avatars.

## 2. Color palette and roles

| Token | Value | Role |
| --- | --- | --- |
| Slate | `#192638` | Header, strong text, active labels |
| Canvas | `#F6F4EF` | Page background |
| Ink | `#172133` | Primary text |
| Muted | `#526074` | Supporting text |
| Apricot | `#FFCEAA` | Overview panel accent and active header tab underline |
| Action | `#254A78` | Primary buttons, links and focus outline on light surfaces |
| Action hover | `#1C3659` | Primary hover |
| Surface | `#FFFFFF` | Cards, dialogs, menu surfaces |
| Divider | `#DDDCD5` | Table and card boundaries |
| Control border | `#7B8594` | Default input border |
| Success | `#155B47` on `#E2F2EA` | Active, Paid, Approved |
| Warning | `#784512` on `#FFF0D6` | Pending signature, Pending, Overdue |
| Informational | `#254A78` on `#E7EFF9` | Open, Processing |
| Critical | `#8B2D35` on `#FBE9EA` | Denied and destructive confirmation |
| Neutral | `#465267` on `#ECEFF3` | Draft and Cancelled |

## 3. Typography

Use Georgia for page heading roles and `system-ui, 'Segoe UI', sans-serif` for the application. Use tabular numerals for invoice amounts and dates.

| Role | Typeface | Size / line height | Weight | Tracking |
| --- | --- | --- | --- | --- |
| Brand | System UI | 25 / 30 px | 750 | −0.5 px |
| Page title | Georgia | 40 / 46 px | 400 | −0.9 px |
| Section title | System UI | 19 / 26 px | 650 | −0.2 px |
| Body and form controls | System UI | 14 / 21 px | 400 | Normal |
| Header navigation | System UI | 14 / 20 px | 650 | Normal |
| Caption and status | System UI | 12 / 17 px | 600 | 0.1 px |

## 4. Spacing and layout

- Header height is 64 px. Align brand, workspace, nav links and signed-in identity in a centered 1320 px container with 32 px gutters.
- Content max width is 1320 px with 32 px gutters, 32 px top padding and 24 px between sections. The overview grid is `minmax(0, 1.7fr) minmax(0, 1fr)` with a 20 px gap.
- Cards use 16 px radius and 24 px interior padding. Tables use 44 px headers and approximately 56 px rows. Align numbers right and allow descriptions and record names to wrap.
- At widths below 900 px, collapse dashboard columns. At widths below 680 px, place nav on a second row, reduce gutters to 16 px and give wide tables a horizontal scroll container. Keep primary actions visible and avoid page-wide overflow.

## 5. Components

- Primary buttons use `#254A78`, white text, 42 px minimum height, `0 16px` padding and 9 px radius. Secondary buttons use a white background and a 1 px `#7B8594` border. Use visible 2 px focus outlines with a 2 px offset. Show text labels on significant actions.
- Search, selects and date inputs use 42 px minimum height, 10 px radius, 12 px horizontal padding, full text labels and adjacent error messages. Keep a clearly selected state in filters and tabs.
- Status badges use the palette above, `3px 9px` padding and 999 px radius. Include a meaningful text label for every status.
- Details use a back link, one page title, primary actions and grouped panels. Form routes share that shell and show step names, inline errors, retained values and a review before final submission.
- Dialogs use native semantics, 520 px maximum width, 24 px padding, 16 px radius and a dark translucent backdrop. Give the confirmation action a specific label. Announce successful actions in a polite status region.
- The overview illustration is an optional decorative corner within the account summary. Use an apricot field, one 82 × 62 px white card rotated −8 degrees and a 64 × 76 px background card rotated 11 degrees. Draw rules and three small square calendar cells with CSS, mark the decoration `aria-hidden`, and hide it when it would overlap text.

## 6. Shadow and elevation

Cards use a 1 px boundary with `0 1px 2px rgb(25 38 56 / 5%)`. Menus and dialogs use `0 12px 36px rgb(25 38 56 / 18%)`. Favor space and borders for hierarchy within lists and details.
