# Dropbox Account Workspace

## Visual direction

Use a horizontal navigation band above a warm ivory canvas. The file index takes most of the width, with a compact folder-navigation column on its left in Files. Put the brand name in plain text at the top left and use a deep blue for the navigation band. Cream surfaces, teal primary controls and a serif page title establish the workspace’s identity. The same frame supports Requests, Shared and Deleted files.

Draw folder and file type marks as original local CSS shapes or authored SVGs. Use initials on solid-color circles for contacts. Seeded previews use synthetic document text and locally authored artwork. Keep typography and assets available offline.

## Palette

| Role | Color | Use |
| --- | --- | --- |
| Navigation | `#1D2B50` | Header, with `#FFFFFF` labels and a `#3D4D73` active tab |
| Canvas | `#F5F3EE` | Page background |
| Surface | `#FFFFFF` | Tables, forms and menus |
| Ink | `#20272E` | Primary text |
| Muted ink | `#53616B` | Secondary metadata |
| Divider | `#DCDDD6` | Panels and row separators |
| Primary / hover | `#00645B` / `#004E47` | Primary buttons with white text |
| Hover / selection | `#F2F6F3` / `#E0F0E9` | File rows |
| Focus | `#2166C4` | 2px ring offset by 2px, with a white ring in the header |
| Success / warning / error | `#235B47` / `#815413` / `#A92B32` | Status text paired with a readable label |

## Typography

| Role | Stack | Size / line height | Weight |
| --- | --- | --- | --- |
| Brand | Segoe UI, system-ui, sans-serif | 21 / 26 px | 700 |
| Page title | Georgia, Times New Roman, serif | 36 / 42 px | 400 |
| Section and dialog heading | Segoe UI, system-ui, sans-serif | 19 / 26 px | 650 |
| Row label and control | Segoe UI, system-ui, sans-serif | 14 / 20 px | 600 |
| Body | Segoe UI, system-ui, sans-serif | 14 / 21 px | 400 |
| Metadata | Segoe UI, system-ui, sans-serif | 12 / 18 px | 400 |

## Spacing and layout

- **Header.** 68 px tall on desktop. Brand, destination tabs, search and account initials in that order. Keep search at 250–340 px when space allows. Main canvas max width 1440 px, centered with 32 px inline padding and 28 px top padding.
- **Files.** 208 px local folder-navigation column with a 24 px gap to the file index. Breadcrumbs above the title. Title and primary toolbar actions share a row on desktop. Put filters and the selection toolbar above the index. Align sortable column headers and row contents. Use 52 px rows, a 40 px header row and 14 px cell padding.
- **Shared and Deleted files.** Full-width table with tabs or filters directly below the page heading. Preserve the same row height and action-menu placement. Deleted files adds the original path and deletion metadata.
- **Requests.** Open and Closed tabs above a table. Details use a two-column layout with request form and status on the left, submissions on the right. Recipient page uses a centered 560 px form card.
- **Preview and versions.** Preview pane with an optional 304 px details or versions column. Preserve filename and back navigation while previewing a revision.
- **Narrow screens.** Below 900 px, collapse the folder column into a “Folders” button and place search on a second header row when needed. Below 640 px, wrap navigation, stack details below content and show file metadata behind an accessible row details action. Toolbars wrap without clipping actions.

## Components

- Buttons use a 38 px minimum height, 14 px inline padding and a 7 px radius. Secondary actions use a white background and 1 px divider border. Destructive confirmation uses the error color. Keep action verbs visible.
- Fields use a 42 px minimum height, 1 px border, 7 px radius, and a label above the control. Show error text beside the field and preserve draft values through validation.
- Row menus have a visible ellipsis, an accessible name that includes the row title, and keyboard operation. Native checkboxes identify their row and bulk selection scope. Pointer hover and keyboard focus both reveal secondary row actions.
- Dialogs use a 480 px width, 24 px padding, 12 px radius and an overlay of `rgba(24,33,43,.42)`. Trap focus while open and restore it on close. Keep Cancel and the primary action visible. Side panels use a divider edge and an explicit Close button.
- Tables and resting cards rely on 1 px borders and 10 px radii. Menus use `0 8px 24px rgba(25,35,52,.13)`; dialogs use `0 24px 72px rgba(25,35,52,.23)`.

Empty views identify the current context and offer a relevant available action. Confirmation feedback follows successful actions and stays short.
