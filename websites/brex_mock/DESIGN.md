# Brex workspace design

## Visual theme

Design a finance workspace for the fictional company Northstar Studio. Use a full-width plum masthead, a pale lavender canvas, white ledger surfaces and lime highlights. Set **Brex** in plain text at the left edge of the masthead. Give the overview an asymmetric composition. Place spend and review counts across the top, a wide recent-expense ledger below, and a narrower category chart and shortcuts alongside it. On the four work pages, align tabs, filters and tables to the same content grid.

Build the card illustration locally in CSS. Use three offset rounded lavender contours clipped into the upper right of a plum card, with a text label, the masked last four digits and the holder name in the lower left. Draw the category chart with CSS bars and adjacent amount labels. Use local system fonts and original geometric UI accents.

## Color palette

| Role | Value | Application |
| --- | --- | --- |
| Masthead and card | `#261C35` | Workspace bar and virtual card |
| Masthead text | `#F9F5FB` | Wordmark and navigation |
| Canvas | `#F5F2F8` | Page background |
| Surface | `#FFFFFF` | Tables, panels, dialogs |
| Text | `#211A2B` | Headings and body |
| Secondary text | `#645B70` | Metadata and field hints |
| Rule | `#E2DBE8` | Table separators and card borders |
| Control outline | `#8A7D96` | Form field boundary |
| Action | `#52377D` | Primary button, links, focused controls |
| Action hover | `#402860` | Primary button and link hover |
| Highlight | `#DBF184` | Masthead active indicator and small chart accents |
| Row hover | `#F8F4FB` | Table row and menu hover |
| Positive | `#216445` on `#E7F5EB` | Active, approved, attached |
| Attention | `#714700` on `#FFF0C9` | Locked, unmatched, pending |
| Negative | `#942C45` on `#FCEBF0` | Denied, destructive intent |
| Neutral | `#584C63` on `#EFEAF2` | Canceled, archived, removed |

## Typography

Use `system-ui, "Segoe UI", sans-serif`. Apply `font-variant-numeric: tabular-nums` to monetary amounts, dates and card digits. Right-align money in tables and keep the currency visible where currencies can differ.

| Role | Size / line height | Weight | Tracking |
| --- | --- | --- | --- |
| Wordmark text | 23 / 28 px | 750 | -0.6 px |
| Page heading | 36 / 42 px | 700 | -1 px |
| Section heading | 19 / 26 px | 650 | -0.2 px |
| Summary figure | 27 / 34 px | 700 | -0.5 px |
| Body and controls | 14 / 21 px | 400 or 600 | 0 |
| Table headers and captions | 12 / 18 px | 600 | 0.15 px |

## Spacing and layout

- Use a 64 px masthead and no persistent sidebar. Place the workspace name next to the Brex text, evenly spaced links for Overview, Cards, Expenses, Receipts and Spend limits, and the signed-in user at the right. Mark the active page with lime and `aria-current`.
- Center the content in a 1440 px maximum width with 40 px horizontal and 36 px top padding. At widths below 1000 px reduce padding to 24 px. At widths below 640 px use 16 px, place links in a horizontally scrollable second masthead row, stack overview panels and allow wide tables to scroll in their own container.
- Use a 24 px gap between page sections, 16 px between overview panels, and 8 px between related controls. Align the primary action with the page heading on desktop and below it on narrow widths. Tables use a 40 px header and rows at least 52 px high.
- Use a deep-linkable detail panel up to 480 px wide anchored at the right of a list. At phone widths it fills the viewport. Keep the heading and primary action accessible for long content. Use a centered dialog up to 520 px wide for submissions and confirmations.

## Components

- Buttons and fields have a minimum height of 40 px and an 8 px radius. Primary buttons have a plum fill and white text. Secondary buttons use a white fill with a visible border. Show a 2 px focus outline with a 2 px gap, using lime in the masthead and plum on light surfaces.
- Tables sit in bordered white surfaces with 14 px corners. Use labeled, keyboard-focusable detail links in the first column. Add full-text status chips with 8 px inline padding and rounded ends. Keep search, filters and sorting above the table and place record counts and paging controls below.
- Provide labeled controls, inline validation, accessible notifications, a visible close button and Escape handling for overlays, and focus restoration to the launching control when available. Avoid nested modal focus traps when opening an edit or confirmation from a detail view.
- Empty lists explain how to clear a filter or start a relevant workflow. Empty injected worlds show zero or unavailable values, and dependent forms explain which record is needed before submission. Pending uploads and submissions disable repeated confirmation.

## Elevation

Keep the masthead and tables flat. Use `0 2px 10px rgba(38,28,53,.045)` for overview panels, `0 8px 24px rgba(38,28,53,.13)` for popovers, and `0 16px 48px rgba(38,28,53,.22)` for detail panels and dialogs. Use a `rgba(38,28,53,.35)` backdrop for modal dialogs.
