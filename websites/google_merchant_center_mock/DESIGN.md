# Google Merchant Center design guide

## Visual theme

Use a compact retail operations workspace with warm paper surfaces, deep forest text, and a muted orange accent. Set the product name “Google Merchant Center” as plain text in the dark horizontal header. On Overview, pair a short account summary with original product forms and a wide catalog-status panel. Use consistent, high-contrast tables on operational pages.

## Color palette

| Role | Value | Usage |
| --- | --- | --- |
| Header | `#142D29` | Global header and primary button hover |
| Primary | `#23584B` | Primary buttons, active navigation text and links |
| Canvas | `#F7F5EF` | Workspace background |
| Surface | `#FFFEFA` | Tables, controls and dialog backgrounds |
| Ink | `#1B2B27` | Titles and normal text |
| Muted | `#53645D` | Secondary copy |
| Border | `#DADFD5` | Card and row separators |
| Control border | `#899A91` | Input and secondary button outlines |
| Accent | `#E7A878` | Overview illustration and selected visualization accents |
| Selected | `#DFEDE4` | Active navigation and selected rows |
| Focus | `#335DB5` | Two-pixel visible outline with two-pixel offset |
| Success | `#235D45` on `#E4F2E8` | Approved and successful |
| Warning | `#80531D` on `#F8EACF` | Limited and partial |
| Error | `#8D322E` on `#F7E4E0` | Disapproved and failed |
| Pending | `#3D5281` on `#E8EDF8` | Pending and under review |

## Typography

Use `system-ui, "Segoe UI", sans-serif` and `ui-monospace, Consolas, monospace` for identifiers. Use tabular numbers for prices and counts.

| Role | Size | Weight | Line height | Letter spacing |
| --- | --- | --- | --- | --- |
| Page title | 36px | 680 | 42px | -0.035em |
| Section title | 21px | 660 | 28px | -0.018em |
| Header brand | 17px | 660 | 24px | 0 |
| Body | 14px | 400 | 21px | 0 |
| Control | 14px | 600 | 20px | 0 |
| Secondary | 12px | 500 | 17px | 0.01em |

## Spacing and layout

- Global header 64px. Place brand and workspace navigation on the left and the synthetic merchant/operator label on the right. Use a single horizontal section navigation to reach Overview, Products, Data sources and Needs attention.
- Center a shell up to 1440px with 36px inline and 30px block padding. Use a 20px panel gap, 12px radii, and a 4px spacing unit. Overview uses a full-width summary panel and a 2:1 grid for operational cards.
- Detail workspaces use a summary header with breadcrumbs, then a 2:1 grid for the primary record and supporting relationships. Editors use a readable 760px form column and a footer with Cancel and Save.
- At widths under 960px, reduce margins to 20px and stack overview and detail grids. At compact widths, wrap or horizontally scroll the navigation and allow table scrolling within its panel. Keep dialogs and forms within the viewport.

## Components and elevation

- Primary button has a green fill, white text, an 8px radius, and a 40px minimum height. Secondary button uses the surface color and a 1px control border. Give icon-only buttons accessible names and 40px hit targets.
- Inputs have a visible label, 40px minimum height, 8px radius and 1px control border. Put field errors adjacent to inputs and associate them with accessible descriptions. Maintain entered values when validation fails.
- Tables use a 44px header and 60px baseline rows. Align monetary and count fields right, keep identifiers visible, and reserve 40px for product thumbnails. Use descriptive text alongside status colors and light row highlights for hover, focus and selection. Put combined filters and search above the table and the result range and pagination below it.
- Overview cards and lists use a 1px border and `0 1px 2px #142D290C` shadow. A dialog uses a 14px radius, `0 20px 60px #142D2933` shadow and a `#142D2966` backdrop. Keep Escape, focus restoration, and labelled confirmation controls predictable.
- Use original, locally authored CSS geometry for the overview illustration and thumbnail placeholders. Real product reference fields can contain text URLs, while rendered artwork uses app-owned assets only. Avoid remote fonts or artwork.
