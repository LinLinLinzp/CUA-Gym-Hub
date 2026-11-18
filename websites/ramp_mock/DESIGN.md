# Ramp account workspace design

## Visual direction

Use a warm paper canvas, dark evergreen navigation, and a restrained lime accent. Center the workspace on a horizontal navigation bar and a wide content column. Combine serif page headings with compact tabular data and plain status labels. Use **Ramp** as live text in a medium-weight sans serif.

Use system fonts and CSS for the interface. An original card preview can use two offset circles and a diagonal border drawn with CSS, with the mask and last four rendered in text. Use initials for people and a neutral two-letter tile for vendors. Keep decorative elements out of the data tables.

## Color tokens

| Token | Value | Use |
| --- | --- | --- |
| Navigation | `#172E29` | Main bar |
| Navigation text | `#F5FAF4` | Wordmark and selected navigation label |
| Navigation muted | `#C2D1CA` | Unselected navigation labels |
| Canvas | `#F4F3ED` | Main background |
| Surface | `#FFFFFF` | Panels, tables, form controls |
| Ink | `#1D2C25` | Main copy and labels |
| Muted | `#53645C` | Supporting text |
| Divider | `#D9E0DA` | Table rows and surface outlines |
| Control outline | `#73857A` | Input boundary |
| Action | `#214F40` | Primary button and text links |
| Action hover | `#163D30` | Primary button hover |
| Accent | `#D8ED91` | Active navigation underline and Overview highlight |
| Focus | `#34785B` | Focus ring on light surfaces |
| Success | `#235741` on `#E1F1E7` | Active, approved, paid |
| Warning | `#714915` on `#FAEDD4` | Pending, locked, scheduled |
| Error | `#842E35` on `#F8E7E9` | Rejected, destructive action |
| Neutral | `#4C5C52` on `#E9EDE9` | Draft, terminated, canceled |

## Type

| Role | Font | Size / line height | Weight |
| --- | --- | --- | --- |
| Wordmark | Segoe UI, system-ui, sans-serif | 25 / 30 px | 700 |
| Page title | Georgia, serif | 42 / 48 px | 400 |
| Panel title | Segoe UI, system-ui, sans-serif | 20 / 28 px | 650 |
| Body and inputs | Segoe UI, system-ui, sans-serif | 15 / 22 px | 400 |
| Table and navigation | Segoe UI, system-ui, sans-serif | 14 / 20 px | 400–650 |
| Label and status | Segoe UI, system-ui, sans-serif | 13 / 18 px | 600 |

Use tabular numerals for amounts and counts. Right-align numeric columns and keep dates on one line when space permits.

## Layout and components

- Use a 68 px desktop navigation bar. Position the text brand and workspace name at the left, workflow links across the center, and the signed-in identity at the right. Mark the current destination with a 3 px accent underline and `aria-current`.
- Center a 1240 px content column with 40 px top and 32 px horizontal padding at desktop widths. Use 24 px section gaps, 16 px internal gaps, and 12 px panel corners. Collapse to 16 px horizontal padding below 720 px. On narrow screens, give navigation its own scrollable row.
- Overview opens with a two-column region. Use an evergreen summary panel with a lime count and an adjacent white panel for records needing attention. Below, use a simple list of recent bills or approvals with links to details. Stack panels on narrow screens.
- List pages put one primary action at the end of the page-heading row, followed by a toolbar with a labeled search field and filters. Tables use a white surface, roughly 54 px rows, 12 px horizontal cell padding, and pale green row hover. Use semantic tables and explicit row links. Allow horizontal scrolling on narrow screens.
- Detail pages use a full-width heading and breadcrumb, followed by a fluid content column and a 320 px summary panel. Stack them below 900 px. Use forms in dialogs for actions that require input. Use a dedicated full-width section for the bill line editor.
- Buttons use 40 px minimum height, 14 px inline padding, an 8 px radius, and a 600 weight. Primary buttons use action-green fill and white text. Secondary buttons use white fill and the control outline. Use error text for destructive actions. Give input controls 40 px minimum height and visible labels.
- Dialogs use a 560 px maximum width, a 12 px radius, and 24 px padding. Provide a visible title, Cancel, Escape handling, initial focus, focus trapping, and focus restoration. Match field errors to labels and keep entered values available after validation.
- Render status in a compact pill with readable text. Use a visible 2 px focus outline with a 2 px offset, switching to lime on dark surfaces. Announce confirmations through a shared live region and show the committed change in context.

## Elevation

Flat tables and data panels use borders. Use `0 10px 28px rgb(23 46 41 / 12%)` for menus and `0 24px 72px rgb(23 46 41 / 20%)` for dialogs. Use a `rgb(23 46 41 / 38%)` dialog scrim. Keep transitions short and respect reduced-motion settings.
