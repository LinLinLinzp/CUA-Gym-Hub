# Venmo account workspace

## 1. Visual theme

Use a horizontal account navigation and a light, cool-gray workspace. The desktop overview pairs a wide activity ledger with a compact column for balance and outstanding requests. The brand is the plain text **Venmo**, set in the same typeface as the rest of the interface. Use original CSS geometry in the balance card and local initials avatars throughout the account.

## 2. Color palette

| Token | Value | Use |
| --- | --- | --- |
| Brand | `#008CFF` | Masthead text and balance card accent |
| Action | `#005BB8` | Primary buttons and links |
| Action hover | `#00458F` | Hover and active actions |
| Navigation active | `#E8F3FF` | Active tab background |
| Canvas | `#F3F6FA` | Page background |
| Surface | `#FFFFFF` | Header, panels and dialogs |
| Ink | `#14263A` | Titles and primary labels |
| Muted | `#526478` | Supporting text |
| Border | `#D8E1EB` | Panel borders and separators |
| Input border | `#78899D` | Form control boundaries |
| Balance panel | `#132D49` | Dark balance card |
| Success | `#166549` on `#E4F5ED` | Received or completed |
| Pending | `#78510D` on `#FFF2D4` | Pending or partially settled |
| Error | `#A32532` on `#FDECEE` | Validation or declined |
| Neutral | `#526478` on `#EDF2F7` | Canceled or secondary status |

## 3. Typography

Use `system-ui, "Segoe UI", sans-serif` with tabular numerals for money and date columns.

| Role | Size / line height | Weight | Tracking |
| --- | --- | --- | --- |
| Brand text | 25 / 30 px | 750 | -0.03em |
| Page heading | 36 / 42 px | 700 | -0.035em |
| Section heading | 20 / 28 px | 700 | -0.02em |
| Balance amount | 36 / 42 px | 700 | -0.02em |
| Row title or form label | 15 / 22 px | 600 | Normal |
| Body | 15 / 22 px | 400 | Normal |
| Metadata | 13 / 18 px | 500 | Normal |

## 4. Spacing and layout

- Use a 68 px masthead with brand at left, Overview, Activity, Requests, Splits and Statements in the center, and the account avatar at right. Keep the content and masthead inner width at 1200 px with 32 px horizontal gutters.
- Start content 32 px below the masthead. Overview has a heading with Pay or request and Split an expense actions, then a two-column grid of `minmax(0, 2fr) minmax(280px, 1fr)` with a 24 px gap. Place the activity ledger in the wide panel and stack balance and pending requests in the compact column.
- Activity, Requests and Splits use a single main panel with search or filters before the list. Detail routes retain the same header and return navigation. Statements uses period controls above a totals row and a ledger preview.
- At 900 px and below use one content column. At 600 px and below use 16 px gutters and 28 px headings. Keep the account name and navigation accessible by using a scrollable second header row. Use stacked label/value rows when table columns would become unreadable. Keep primary actions at least 44 px tall.

## 5. Components

- Primary button uses the action color, white text, 10 px radius, 44 px minimum height and 16 px horizontal padding. Secondary button uses a white surface and bordered outline. Use a 2 px action-colored focus ring with 3 px offset. Retain visible labels for icon actions.
- Inputs use a white surface, 1 px input border, 10 px radius and 44 px minimum height. Give controls visible labels, show errors below the related control, and associate errors programmatically.
- Panels use 16 px radius, 1 px border and 24 px padding. Use 60–68 px ledger rows with dividers, 36 px circular avatars, one primary description and a secondary note or date line. Right-align signed amounts. Pair status colors with visible text.
- Build the balance graphic with two clipped CSS outline circles at the lower right of the dark card, in `rgba(102,188,255,.22)`, behind the amount. Style avatars with initials on a fixed palette of muted colors derived from the contact ID. Keep decorative shapes hidden from assistive technology.
- Open Pay or request and split creation in a right-hand sheet up to 480 px wide. Use a title, labeled dismiss button, independently scrollable body and a sticky confirmation footer. At small widths use a full-width sheet. Trap focus while open, restore focus on dismissal and allow Escape. Show the review before the final action. Announce success or validation results with appropriate live regions.

## 6. Elevation

Use `0 1px 2px rgba(20,38,58,.06)` for panels, `0 8px 24px rgba(20,38,58,.12)` for floating controls, and `-16px 0 48px rgba(20,38,58,.18)` for the sheet. The sheet scrim is `rgba(20,38,58,.38)`. Respect reduced-motion preferences.
