# Docker Hub account design

## Visual direction

Use a charcoal navigation rail, warm-white canvas, and vermilion primary actions. The repository index pairs a compact navigation rail with a wide inventory table. Use flat surfaces, aligned numeric columns, and monospace repository paths, tags, and digests to make dense technical information easy to scan.

Set the Docker Hub wordmark in bold live text. Use CSS for initials, status dots and empty-state illustrations. Use locally drawn monochrome line icons for repository, team, search, lock, copy, chevron, and overflow controls. Keep the same icon stroke width and optical size throughout.

## Color

| Role | Value | Use |
| --- | --- | --- |
| Canvas | `#F6F5F1` | Main page background |
| Surface | `#FFFFFF` | Forms, tables, dialogs |
| Rail | `#242629` | Persistent account navigation |
| Rail text | `#F8F7F3` | Wordmark and active label |
| Rail muted | `#C1C4C6` | Secondary navigation label |
| Rail selected | `#383B3F` | Active item background |
| Primary text | `#1F272B` | Headings and body text |
| Secondary text | `#566165` | Metadata and helper copy |
| Border | `#DADDD8` | Dividers and table edges |
| Control border | `#858D89` | Form field edge |
| Action | `#A93424` | Primary buttons and active emphasis |
| Action hover | `#8B281A` | Primary hover |
| Focus | `#166B77` | Focus outline on light surfaces |
| Public / success | `#255A45` on `#E6F2EB` | Visibility chip and status feedback |
| Private | `#4C475E` on `#F0EDF5` | Visibility chip |
| Warning | `#684600` on `#FAEBC6` | Immutable and confirmation context |
| Error | `#982F26` on `#FBECE8` | Errors and danger panels |

## Type

| Role | Family | Size / line height | Weight | Letter spacing |
| --- | --- | --- | --- | --- |
| Wordmark | system-ui, Segoe UI, sans-serif | 22 / 28 px | 750 | -0.03em |
| Page title | system-ui, Segoe UI, sans-serif | 36 / 42 px | 700 | -0.045em |
| Section title | system-ui, Segoe UI, sans-serif | 20 / 28 px | 650 | -0.02em |
| Body and controls | system-ui, Segoe UI, sans-serif | 14 / 21 px | 400–650 | normal |
| Metadata | system-ui, Segoe UI, sans-serif | 12 / 17 px | 500 | normal |
| Identifiers and commands | ui-monospace, Consolas, monospace | 13 / 20 px | 500 | normal |

## Spacing and layout

- Use a 224px rail on desktop. Place the brand 24px from the top and left, navigation below at a 36px gap, and signed-in user identity at the bottom. Use 40px navigation rows with 16px icons, 12px gaps, and 6px corner radii.
- Place a 56px utility row above the main section for breadcrumbs and namespace context. Give the main section 36px horizontal and 32px top padding, with 24px between major groups. Limit content to 1440px. Use a 4px spacing base.
- Put each page title and its primary action on the same row when space allows. Place results controls directly above the table. On repository details, position General, Tags, Permissions, and Settings directly below the title with a 2px active underline.
- Below 960px, reduce outer padding to 24px. Below 700px, move account navigation into a top bar with wrapping controls, stack form fields, and keep data tables in their own horizontally scrollable region.

## Components and interaction

- **Tables.** Use a white surface, 1px border, 8px corner radius, 40px column header and 58px default rows. Apply `#F3F5F2` hover feedback. Use visible links for object names and keep left-to-right keyboard order consistent with the row. Render a labeled search field, filters, and pagination as native or fully accessible controls.
- **Buttons and fields.** Use 40px minimum block size for primary controls with 8px radii and 14px horizontal padding. Primary buttons use a solid action background and white text. Secondary buttons use a white background and control border. Focus uses a 2px outline and 2px offset. Size search flexibly and keep all fields labeled.
- **Status.** Render visibility, immutability, and permission as readable text, with color as an additional cue. Display save errors beneath their fields. Use a polite live region for saves and copy feedback, and return focus to the initiating control when dismissing a dialog.
- **Forms and details.** Constrain create and edit forms to 560px. Use a pale monospace command block with a labeled Copy control. Include local empty states with a direct way to clear search or start a supported create flow.
- **Confirmation.** Use a dialog up to 480px wide, 24px padding, and 12px radius. Show the object name and affected resources above Cancel and the destructive action. Focus Cancel initially and preserve selection on dismissal.

## Elevation

Tables and panels are flat. Menus use `0 8px 24px rgba(31,39,43,.12)`. Dialogs use `0 16px 48px rgba(31,39,43,.22)` over a `rgba(22,27,29,.45)` scrim.
