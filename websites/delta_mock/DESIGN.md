# Delta account design system

## Visual theme

Use a warm, paper-toned account workspace with a fixed-width navigation rail at desktop sizes. Pair oversized destination names and airport codes with a dark, rust-accented itinerary panel. Render the Delta name as bold typographic text. Use a departure and arrival route line drawn in CSS, with endpoint circles and an intermediate route marker. The line communicates the trip structure and can be reused at small sizes.

## Color palette and roles

| Token | Value | Use |
| --- | --- | --- |
| Ink | `#191E28` | Headings, body text, dark panel background |
| Paper | `#F5F2EC` | Main page background |
| Surface | `#FFFCF7` | Rows, rail, dialogs, form fields |
| Brand | `#A3263C` | Delta text, primary buttons, active links |
| Brand hover | `#791C2E` | Primary button hover |
| Brand tint | `#F6E4E7` | Selected navigation and quiet accent treatments |
| Route accent | `#E6A28F` | Route line and markers on dark surfaces |
| Secondary text | `#5A606A` | Labels and supporting data |
| Divider | `#DDD5C9` | Card and table dividers |
| Control edge | `#897E70` | Input outlines |
| Success | `#216047` on `#E5F2E9` | Confirmed and available |
| Warning | `#78521D` on `#FFF1D2` | Expiring and submitted |
| Error | `#9C2539` on `#FBE9ED` | Canceled status and validation |
| Neutral | `#515764` on `#ECE9E3` | Past, expired and used |

## Typography

Use Segoe UI, system-ui, sans-serif for the interface and Georgia, serif for page and hero headings. Enable tabular numbers for amounts, airport times and mileage values.

| Role | Size | Weight | Line height | Letter spacing |
| --- | --- | --- | --- | --- |
| Page title | 48px desktop, 36px mobile | 400 | 1.10 | -0.035em |
| Feature destination | 36px desktop, 28px mobile | 400 | 1.12 | -0.025em |
| Section title | 22px | 650 | 1.25 | -0.02em |
| Airport code and account metrics | 28px | 700 | 1.10 | -0.025em |
| Controls | 14px | 600 | 1.35 | normal |
| Body and itinerary rows | 15px | 400 | 1.50 | normal |
| Metadata and status | 13px | 500 | 1.40 | normal |

## Spacing and layout

- Desktop workspace uses a 232px rail and a main canvas. Center the content column within the main canvas at a maximum width of 1120px, with 48px desktop gutters and 32px between major regions. Use 24px for card interiors.
- On My Trips, place a compact account heading over the trip workspace. When an upcoming flight exists, use the next departure for a dark itinerary panel with destination and departure date on the left and the airport route on the right. Keep the Find a trip action alongside the page heading and place list tabs and search directly above the list.
- Trip details place segments in the primary column and reservation metadata and actions in a 300px side column. Review steps use a wider primary column for changes and a side column for the price breakdown. SkyMiles and eCredits place their metrics above a full-width activity list or wallet rows.
- Below 900px, move the rail into a top header with a horizontal three-item navigation row below the wordmark. Reduce gutters to 24px. Below 600px, use 16px gutters, stack card sections, and replace wide table layouts with labeled rows. Maintain an accessible 44px minimum height for interactive controls.

## Components

- Primary buttons are 44px minimum height with 16px horizontal padding, 10px radius, brand fill, and white text. Secondary buttons use the same box with a surface fill, 1px control edge and ink text. Keyboard focus uses a 2px brand ring with 3px offset and a contrasting ring on the dark panel.
- Inputs use a 44px minimum height, 10px radius, surface fill, 1px control edge and 12px horizontal padding. Show persistent labels and inline errors with programmatic association. Tabs use text plus a 2px active underline. Status chips include a status word as well as the state color.
- Cards use a 16px radius and 1px divider border. Separate dense rows with single dividers and at least 16px vertical padding. Keep distinct links identifiable by their label.
- Use full-page review for booking changes, cancellation and redemption. A short lookup form can use a dialog of up to 480px. Move focus into the dialog, support Escape, restore focus to the opener and use a programmatic title.
- Announce submission errors and success. Confirmation views show the relevant reference and link to the resulting trip, credit or request history. Empty states show the next available action where applicable.

## Elevation

Use `0 2px 10px rgba(25, 30, 40, 0.05)` for the dark itinerary panel and `0 20px 64px rgba(25, 30, 40, 0.20)` for dialogs. Keep regular list cards flat. Dialog underlays use `rgba(25, 30, 40, 0.44)`.
