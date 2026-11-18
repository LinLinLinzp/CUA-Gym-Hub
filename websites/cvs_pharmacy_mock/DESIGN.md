# CVS Pharmacy account design

## Visual direction

Use an original account workspace with a warm off-white canvas, white work surfaces, dark plum text, and restrained CVS red. Set “CVS Pharmacy” in plain text in the navigation rail. Keep the member’s next actions near the top and give dense lists enough room for patient names, store locations, and status labels to remain readable.

Use a small original illustration of a pharmacy bag, appointment card, and pill bottle built from simple geometric shapes for the overview. Draw it locally as SVG or CSS. Make it decorative and keep all workflow actions as labeled controls. Use locally drawn line icons or a bundled icon package for navigation and common controls.

## Color roles

| Role | Value | Use |
| --- | --- | --- |
| Brand and primary action | `#C90024` | Wordmark text, primary buttons, active navigation |
| Action hover | `#A6001F` | Hover on primary actions and links |
| Focus | `#315C9D` | Visible two-pixel outline with two-pixel offset |
| Canvas | `#F8F5F2` | Workspace background |
| Surface | `#FFFFFF` | Rail, cards, and forms |
| Brand tint | `#FCEBED` | Overview illustration panel and selected navigation |
| Primary text | `#291E26` | Headlines and body |
| Secondary text | `#645861` | Metadata and supporting copy |
| Border | `#E4DAD9` | Cards, rows, and dividers |
| Input border | `#817078` | Input edges on white |
| Ready or confirmed | `#205D49` on `#E6F3ED` | Ready pickups and confirmed appointments |
| Preparing | `#74500F` on `#FAEFD8` | Orders in progress and early refill messages |
| Error | `#98182B` on `#FCEBED` | Validation and failed submissions |
| Neutral | `#5E545B` on `#F1ECEF` | Past, hidden, and cancelled records |

## Typography

Use Segoe UI with system-ui and sans-serif fallbacks. Use tabular numerals for amounts and records with time or quantity columns.

| Role | Size | Weight | Line height | Tracking |
| --- | --- | --- | --- | --- |
| Wordmark | 21px | 750 | 1.15 | -0.02em |
| Page heading | 36px | 750 | 1.12 | -0.03em |
| Section heading | 23px | 700 | 1.25 | -0.015em |
| Body | 16px | 400 | 1.5 | normal |
| Control label | 14px | 650 | 1.3 | normal |
| Metadata | 13px | 500 | 1.4 | normal |

## Layout

- Desktop uses a 232px sidebar with 20px internal padding, a 64px top utility bar for patient/account context, and workspace padding of 32px. Start content within a 1200px maximum width.
- The overview uses a main column and a 320px upcoming-visit column with a 24px gap. Keep two or three rows per preview and link to the complete list. Use the illustration in the overview welcome panel.
- At 980px and below, collapse split content to one column. At 760px and below, use a header and a horizontally scrollable navigation strip, 16px content padding, and labeled stacked rows instead of clipped columns. Controls have a minimum 44px touch target.
- Use 24px between cards, 20px card padding, 16px card radius, and 10px control radius. Separate dense rows with a shallow divider and keep selection controls near row labels.

## Components and interaction

- Primary buttons use the red background with white text and padding of 10px 16px. Secondary buttons use a white surface, solid border, and dark text. Use verbs such as “Request refill”, “Check in for pickup”, and “Schedule appointment”.
- Inputs use a visible label, 44px minimum height, 12px horizontal padding, and a 1px border. Put field errors next to the field and preserve prior selections when an action fails.
- Status pills use text, 6px 10px padding, and full rounding. Put status and actionable controls in predictable locations across record types.
- Use an accessible confirmation dialog up to 460px wide for hiding, check-in, and cancellation. Keep focus inside while open, return focus to the trigger on dismissal, and present the patient and record reference in the confirmation.
- Use a main step form and an adjacent review summary for refill and vaccine scheduling on wide screens. Stack the summary below the form on narrow screens. Announce success in the receipt or record view and keep a visible way back to the list.
- Use `0 2px 8px rgba(41, 30, 38, .06)` on elevated cards and `0 16px 48px rgba(41, 30, 38, .18)` on dialogs. Keep routine list panels flat. Respect reduced-motion settings.
