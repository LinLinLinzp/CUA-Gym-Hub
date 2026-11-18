# The Home Depot account design

## Visual theme

Build a light account workspace with warm paper tones, dark evergreen navigation, and restrained orange accents. Use a plain-text The Home Depot wordmark in the masthead. Give the overview a wide, two-column introduction with a compact original workshop illustration on the right. Workflow pages use the same shell with fewer illustrations and more room for records and forms.

## Color palette

| Role | Color | Use |
| --- | --- | --- |
| Navigation | `#172820` | Masthead and selected workspace panels |
| Canvas | `#F7F5EF` | Page background |
| Surface | `#FFFFFF` | Forms, record panels and dialogs |
| Highlight surface | `#EDE7DB` | Overview introduction and catalog image wells |
| Text | `#202721` | Headings and body |
| Muted text | `#515D54` | Metadata and supporting copy |
| Brand orange | `#F66B27` | Accent line and decorative illustration details |
| Primary action | `#A83B12` | Filled actions with white text and links on light surfaces |
| Primary hover | `#8B2D0C` | Hover and pressed actions |
| Border | `#DCD7CC` | Panel seams and table row dividers |
| Input border | `#778278` | Visible input boundary |
| Focus | `#256853` | Focus outline on light surfaces, `#FFC4A3` on dark surfaces |
| Success | `#205B43` on `#E4F2E8` | Delivered, completed and refunded |
| In progress | `#754810` on `#FAECD7` | Processing, reserved and requested |
| Error | `#982F2C` on `#FBEAE8` | Input errors and destructive confirmation |
| Neutral | `#4F5752` on `#ECEDE9` | Cancelled, unknown and inactive |

Pair status color with an explicit label. Use tabular numbers for prices and quantities.

## Typography

| Role | Font | Size / line height | Weight | Letter spacing |
| --- | --- | --- | --- | --- |
| Wordmark | Segoe UI, system-ui, sans-serif | 20 / 26 px | 750 | -0.02em |
| Page heading | Georgia, serif | 40 / 46 px desktop, 32 / 38 px mobile | 700 | -0.025em |
| Section heading | Segoe UI, system-ui, sans-serif | 22 / 28 px | 700 | -0.015em |
| Card heading | Segoe UI, system-ui, sans-serif | 17 / 23 px | 700 | Normal |
| Body, fields and buttons | Segoe UI, system-ui, sans-serif | 16 / 24 px | 400 or 650 | Normal |
| Metadata | Segoe UI, system-ui, sans-serif | 14 / 20 px | 400 or 600 | Normal |

## Layout and assets

- Use a 68 px masthead above a 48 px full-width account navigation on desktop. The masthead contains brand text at left and account identity at right. Account navigation highlights the selected destination with a bottom rule and `aria-current`.
- Center masthead contents, navigation and body within a 1200 px maximum width. Apply 32 px lateral desktop padding, 16 px mobile padding and 32 px top padding. Use 24 px gaps between regions, 16 px gaps within grids and 8 px gaps within grouped controls.
- On Overview, place the heading and actionable links in the left portion of the introduction and an original workbench composition on the right. Below, place recent orders in the wider column and reservation/list summaries in the narrower column. Use a 2:1 desktop ratio and stack below 860 px.
- Use original, locally authored CSS illustrations or locally generated raster artwork for the workbench and equipment category thumbnails. Keep the illustration subordinate to heading and controls. Use textual names for tools and products, and provide an image-free fallback for unknown keys. Keep images decorative where adjacent text carries the meaning.
- Under 640 px, let the navigation wrap above the main content. Reflow data rows into stacked cards with the same field labels and actions. Stack form fields and panel actions as needed to fit 360 px without horizontal overflow.

## Component patterns

- Buttons have a minimum 44 px height, 16 px horizontal padding and 8 px radius. Use solid primary actions and bordered neutral secondary actions. Show destructive confirmation with a specific verb and the affected record name or number.
- Inputs are at least 44 px high with a 1 px input border and 8 px radius. Use visible labels, inline errors and an error summary for longer forms. Add a 2 px outline separated by a 2 px offset for keyboard focus. Keep typed values when validation fails.
- Panels use a 12 px radius and 1 px border. Use flat list rows with generous vertical spacing. Place search and filter controls directly above their results, show result counts there, and keep the Reset filters action near active filters.
- Group rental and return flows into labeled form sections with an adjacent estimate when space permits. Place confirmation and validation messages near the actions and announce them accessibly. Use confirmation dialogs for short destructive actions. Trap focus while open, allow Escape to dismiss and restore focus to the trigger.
- Show a short empty state with a relevant link or reset button when applicable. Use a neutral skeleton or loading message before state resolves.

## Elevation

Use borders for record panels. Use `0 6px 20px rgb(23 40 32 / 0.10)` for transient popovers and `0 18px 52px rgb(23 40 32 / 0.22)` for dialogs over a `rgb(23 40 32 / 0.48)` scrim.
