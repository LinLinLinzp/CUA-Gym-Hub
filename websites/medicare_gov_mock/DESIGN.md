# Medicare.gov Account Design

## 1. Visual direction

Use an editorial account workspace with a warm paper canvas, a navy navigation rail and an airy main column. The desktop overview opens with a simple greeting and three clearly labeled ways to act. Put member and coverage details in a compact right column and use the remaining width for claims and short summaries. Display `Medicare.gov` as typeset text at the top of the rail.

Create `public/coverage-illustration.svg` locally for the overview. Draw two intersecting rounded fields and three broad, curved paths in teal, mint and muted coral. Confine the drawing to the right third of the overview introduction and keep it behind no text. Mark it decorative. Build all small navigation symbols locally with a consistent 20 px outline and pair them with text.

## 2. Color tokens

| Token | Value | Use |
| --- | --- | --- |
| `--nav` | `#102C42` | Rail, narrow-screen header |
| `--canvas` | `#F7F5EF` | App background |
| `--surface` | `#FFFFFF` | Cards, forms, tables |
| `--ink` | `#152D3E` | Primary copy |
| `--muted` | `#506474` | Supporting copy |
| `--border` | `#D6DEDA` | Rules and card edges |
| `--input-border` | `#798C90` | Input outlines |
| `--action` | `#00675C` | Buttons and underlined links |
| `--action-hover` | `#045149` | Interactive hover |
| `--mint` | `#E2F1E8` | Coverage and selected states |
| `--coral` | `#C66F53` | Decorative illustration |
| `--success` | `#235C43` | Completed and reviewed text |
| `--warning` | `#795000` | Pending-status text on `#FFF0CC` |
| `--error` | `#972B3F` | Validation and denied-status text on `#FCE9EC` |

## 3. Typography

Use `Georgia, "Times New Roman", serif` for page titles and the overview greeting. Use `system-ui, "Segoe UI", sans-serif` for controls, navigation, body copy and numeric tables. Use tabular numerals in cost columns.

| Role | Size | Weight | Line height |
| --- | --- | --- | --- |
| Wordmark | 23 px | 700 | 1.2 |
| Overview greeting | 44 px | 400 | 1.12 |
| Page title | 36 px | 400 | 1.15 |
| Section heading | 22 px | 650 | 1.25 |
| Card heading | 18 px | 650 | 1.35 |
| Body and controls | 16 px | 400–650 | 1.5 |
| Table and secondary text | 14 px | 400–650 | 1.45 |

## 4. Layout

- At 1100 px and above, use a 232 px rail, a centered main region up to 1320 px wide, and 40 px content padding. Use a 12-column grid with 24 px gaps. Let the claims preview span eight columns and coverage span four.
- At 768–1099 px, use a 200 px rail and 24 px content padding. Let coverage and working data panels flow into one column when needed.
- Below 768 px, move the wordmark and four navigation destinations into a wrapping top header. Use 16 px page padding, 16 px section gaps and a 32 px page title. Scope horizontal scrolling to data tables that need it. Keep the page itself within the viewport.
- Use a 72 px desktop wordmark region, 44 px minimum interactive height, 16 px card radius, 8 px field and control radius, and 24 px desktop card padding.

## 5. Components and interaction

- Use white text on teal for the primary action and a one-pixel teal outline for secondary actions. Keep links underlined in prose and use a visible, two-color keyboard focus ring on all surfaces.
- Give form fields labels above their controls, with helper text followed by field-level errors tied to the control. Focus the first invalid field on submit. Announce submitted confirmations and updated results counts in a polite live region.
- Use an active rail row with a mint edge and a lighter navy background. Put the Claims and Enrollment list filters above their data. Pair every color-coded status with readable wording.
- Place plan filters in a horizontal panel that wraps. Use a comparison tray below results, with a solid white background and a compact selected-plan list. Use headers for the side-by-side comparison table and make its scroll region keyboard reachable.
- Use a narrow, single-column enrollment form with a text step label and inline review controls. Put confirmation number and effective date in a dedicated confirmation card.

## 6. Elevation

Use a 1 px `--border` with `0 1px 2px #102C420D` for cards. Use `0 8px 24px #102C4217` for raised panels and trays. Maintain 4.5:1 contrast for normal text and ensure all workflows work with keyboard navigation and at 200% zoom.
