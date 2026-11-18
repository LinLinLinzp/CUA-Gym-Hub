# HealthCare.gov account design

## 1. Visual theme

Use a warm canvas, a deep blue masthead and large editorial headings. The account opens with a wide, softly tinted coverage panel. Place an original arc-and-grid pattern in its right third, built in a local stylesheet from concentric borders and a radial grid. A straightforward applications list and a compact next-step card follow the panel. Keep decorative artwork clear of controls and hidden from assistive technology.

Set **HealthCare.gov** as live header text. Use an account name on the opposite edge and primary navigation on a separate white row. Keep application forms quiet and focused, with one question group per section and a persistent visual indication of progress.

## 2. Color palette

| Role | Token | Usage |
|---|---|---|
| Masthead | `#172C3F` | Header and reversed brand |
| Ink | `#192B3A` | Heading and body |
| Muted | `#4C6170` | Dates and secondary text |
| Canvas | `#F8F6F1` | Page background |
| Surface | `#FFFFFF` | Cards, forms and navigation |
| Border | `#D7DFE0` | Card borders and rules |
| Field border | `#687D86` | Input and select outlines |
| Hero | `#E6F3F0` | Overview panel |
| Primary | `#115C58` | Filled primary buttons, links and selected controls |
| Primary hover | `#0A4642` | Hover and pressed actions |
| Focus | `#1A63A5` | Focus ring with light offset |
| Success | `#214B39` on `#E6F4ED` | Submitted status and completed actions |
| Attention | `#714917` on `#F9ECD5` | Drafts and pending steps |
| Error | `#8B2635` on `#FCEBED` | Validation and error summaries |

## 3. Typography

| Role | Font | Size / line height | Weight | Letter spacing |
|---|---|---|---|---|
| Wordmark | `system-ui, sans-serif` | 21 / 26 px | 750 | `-0.025em` |
| H1 | `Georgia, 'Times New Roman', serif` | 48 / 52 px | 400 | `-0.035em` |
| H2 | Georgia stack | 30 / 36 px | 400 | `-0.02em` |
| H3 or section label | system stack | 18 / 25 px | 700 | `0` |
| Body, inputs | system stack | 16 / 25 px | 400 | `0` |
| Navigation, buttons | system stack | 15 / 22 px | 650 | `0` |
| Labels, chips, dates | system stack | 14 / 20 px | 600 | `0` |

Use tabular numerals for premiums and comparison rows. Use 36 / 42 px for the H1 at narrow widths.

## 4. Spacing and layout

- Masthead 68 px high and horizontal navigation 52 px high on desktop.
- Center content at a max width of 1184 px with 32 px side and 36 px top padding. Use 16 px side and 24 px top padding below 640 px.
- Overview hero 24 px radius and 32 px padding, with a minimum height of 220 px on desktop. Stack the title, current next step and action. Reduce the artwork to a slim edge accent on small screens.
- Main content grid uses `minmax(0, 2fr) minmax(260px, 1fr)` and a 24 px gap for overview. Forms use `minmax(0, 680px) 260px` for the form and step rail when space permits. Use a single column below 900 px and bring the step indicator above the form. Keep account navigation visible at 390 px.
- Use spacing increments of 4, 8, 12, 16, 24, 32 and 48 px. Cards use 16 px radius and 24 px padding on desktop, 16 px padding on mobile. Labels align with the related control.

## 5. Component patterns

- **Primary action.** Teal fill, white text, 8 px radius, 12 px by 18 px padding and at least 44 px height. Secondary buttons have a white surface, 1 px teal outline and teal text. Text links use a visible underline and preserve the label when hovered or focused.
- **Focus.** Apply a 3 px focus-visible ring with 2 px offset, including on masthead links. Show selected and active states by border or underlining as well as color.
- **Inputs.** White with 1 px field border, 8 px radius, 12 px horizontal padding and a 44 px minimum height. Place instructions and inline errors below with `aria-describedby`. Move focus to the error summary on a failed submit. Use pertinent native input and label semantics.
- **Application list.** Use a structured table with headers at wide widths. On narrow screens, retain each application reference, year/location, status and primary action in stacked rows. Status chips are compact, use text and stay independent of action controls.
- **Plans.** Use stacked white cards with aligned cost columns and a visibly separate label for the after-credit premium. Display the compare action near results and a count when plans are selected. In the comparison view, preserve the metric labels and use a scrollable region on narrow screens. Provide a full-page review route for confirmation.
- **Forms and receipts.** Use a step indicator with current and completed text, an above-the-fold heading, and Back plus a primary action in consistent order. Present eligibility and enrollment confirmations inline as durable pages reachable from the application.
- **Icons.** Use locally drawn CSS or simple local marks for navigation and status where useful. Give every icon-only control an accessible name. Aligned dividers and typography are sufficient for sparse views.

## 6. Elevation

- Borders and spacing establish most hierarchy. Use `0 6px 18px rgba(23, 44, 63, 0.06)` on the overview next-step card.
- Menus and transient compare controls may use `0 10px 28px rgba(23, 44, 63, 0.12)`. Avoid sticky layers that obscure focused controls or the last item on small screens.
