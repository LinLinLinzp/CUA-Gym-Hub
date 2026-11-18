# StudentAid.gov account design

## Visual direction

Use an editorial account workspace with a compact vertical navigation rail, soft stone canvas, cobalt masthead, and mint details. Set `StudentAid.gov` as a text wordmark at the upper left. The home screen opens with a personalized heading on a cobalt panel, followed by three workflow summaries and a compact activity ledger. Give each workflow its own page title and a clear path back to the overview.

Create a local CSS illustration for the dashboard masthead from overlapping paper shapes, three status dots, and an offset line pattern. Keep it decorative and separate from text. Use simple original CSS marks or local package icons for navigation. Use system fonts and ship all styling and artwork with the app.

## Color palette

| Role | Value | Use |
| --- | --- | --- |
| Canvas | `#F6F7F3` | Main workspace |
| Surface | `#FFFFFF` | Rail, cards, tables, dialog |
| Ink | `#172744` | Headings and body text |
| Muted ink | `#526176` | Secondary text |
| Cobalt | `#233A94` | Primary buttons and dashboard masthead |
| Cobalt hover | `#182B78` | Button and link hover |
| Indigo tint | `#E8EDFF` | Active route and in-review badge |
| Mint | `#BFF2D6` | Masthead accent and emphasis |
| Line | `#D7DFE7` | Table dividers and surface borders |
| Control line | `#76879A` | Inputs and interactive outlines |
| Focus | `#0E63C0` | Visible keyboard focus ring, with white separation on dark areas |
| Success | `#075839` on `#DEF5E9` | Processed or completed |
| Warning | `#744500` on `#FFF1CB` | Action required |
| Error | `#9A2638` on `#FCE8EA` | Invalid input |
| Neutral | `#46576D` on `#EDF0F5` | Draft or closed |

## Typography

| Role | Stack | Size / line height | Weight | Tracking |
| --- | --- | --- | --- | --- |
| Dashboard welcome | `Georgia, serif` | 44 / 49 px | 500 | -0.025em |
| Page heading | `Georgia, serif` | 36 / 43 px | 500 | -0.02em |
| Section title | `system-ui, Segoe UI, sans-serif` | 21 / 28 px | 650 | -0.01em |
| Data total | `system-ui, Segoe UI, sans-serif` | 28 / 34 px | 650 | -0.02em |
| Body and controls | `system-ui, Segoe UI, sans-serif` | 15 / 23 px | 400 / 600 | normal |
| Metadata and badges | `system-ui, Segoe UI, sans-serif` | 13 / 19 px | 500 / 600 | normal |

## Layout

- Use a 64 px header, 218 px navigation rail, and main content with 32 px desktop padding and a 1280 px maximum content width. Use 24 px between main sections and 16 px between related cards.
- Place the dashboard hero above the FAFSA, loan and repayment cards. Keep the main action beside the data it affects. Put account identity in the header and recent activity below the summaries.
- Index pages use a horizontal search and filter bar, a count, then data rows with direct links. For the forms and repayment flows, place a compact progress list beside a form column capped at 720 px. Loan detail uses a balance breakdown with servicer and loan facts alongside it.
- At widths below 960 px, use a wrapping top navigation and split the summary cards across available width. Below 620 px, stack the cards, replace tables with labeled rows, collapse progress indicators, and give controls at least 44 px targets. Keep key actions visible without horizontal scrolling.

## Components and interaction

- Primary buttons use cobalt fill, white text, 44 px minimum height, `12px 16px` padding, and 8 px radius. Secondary buttons use white fill, ink text and a control border. Text links are underlined in running text.
- Use 14 px radius on cards, 20 px radius on the hero, and 8 px on inputs. Inputs have a visible label above, 44 px minimum height, a one-pixel control border, and messages below. Put error summaries at the top of failed review steps and focus the first invalid field.
- Use semantic tables with visible sort labels on desktop, consistent date and dollar formats, and tabular numerals for amounts. Status badges include plain-language text. After SPA navigation, announce or focus the new heading. Keep status feedback adjacent to the completed action.
- Cards use `0 2px 6px rgba(23,39,68,.05)`; floating filters and menus use `0 8px 24px rgba(23,39,68,.12)`; dialogs use `0 20px 55px rgba(23,39,68,.18)`. Use inline confirmations and receipt pages for the core workflows. Add a dialog only when it reduces interruption, with a labelled title and focus restoration.
