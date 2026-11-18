# MongoDB Atlas — project console design

## Visual direction

Set the console on a warm ivory canvas with a dark forest masthead, a horizontal project menu and a wide content column. Put project context in the masthead beside the text wordmark. Keep project tools reachable from one navigation row. Use compact, legible tables and quiet borders. Give the Overview an original CSS composition of three offset rounded rectangles connected by thin lines to suggest replica nodes. Keep the composition decorative and omit it on small screens.

## Color

| Token | Value | Use |
| --- | --- | --- |
| Masthead | `#142C25` | Global bar and wordmark backdrop |
| Canvas | `#F6F5F0` | Page background |
| Surface | `#FFFFFF` | Tables, menus and forms |
| Text | `#182D27` | Headings and data |
| Secondary text | `#52625B` | Captions and metadata |
| Border | `#D9E1DA` | Dividers, raised surfaces |
| Input outline | `#87978E` | Editable fields |
| Action | `#17543D` | Links and white-on-green buttons |
| Action hover | `#113D2E` | Primary hover |
| Focus | `#17744F` | Two-pixel outline with two-pixel offset |
| Mint | `#DDF3E5` | Selected tabs and healthy badges |
| Amber | `#FFF0D3` | Paused, pending and expiry badges with `#6D460C` text |
| Danger | `#A8343D` | Destructive controls and form errors |

Use explicit status words with the tint. Reserve pale mint on the masthead for the signed-in avatar or project indicator.

## Typography and layout

| Role | Family | Size / leading | Weight | Tracking |
| --- | --- | --- | --- | --- |
| Wordmark | Segoe UI, system-ui | 20 / 28 px | 700 | −0.02em |
| Page title | Georgia, serif | 40 / 46 px | 400 | −0.03em |
| Section heading | Segoe UI, system-ui | 21 / 28 px | 650 | −0.015em |
| Body and controls | Segoe UI, system-ui | 14 / 21 px | 400–600 | normal |
| Metadata | Segoe UI, system-ui | 12 / 18 px | 500 | normal |
| IP and machine identifiers | Consolas, monospace | 13 / 20 px | 400 | normal |

- Masthead 64 px, navigation 48 px, content max width 1280 px. Center content and use 36 px desktop gutters, 20 px below 900 px.
- Use a 4 px spacing scale. Place 24 px between toolbar and heading and 16 px between overview cards. Main surfaces use 12 px corners and 1 px borders.
- At narrow widths, let the navigation scroll horizontally, stack form grids and keep tables in locally scrollable labeled regions. Maintain a visible project switcher and keyboard access.

## Components

- **Overview.** Split heading region with project name and deployment action on the left and CSS node composition on the right. Below, use linked metric cards for Clusters, Database Users and IP Access List. Show project membership as a project access link and display the latest event rows only if P2 is implemented.
- **Workspace lists.** Use a title and single primary action, a search field followed by labeled filters, then a border-framed table. Use 40 px headers and at least 48 px rows with subtle separators. Place pagination in the footer. Left-align labels and right-align action menus. Row menus include the target name in their accessible label.
- **Details.** Cluster detail uses a breadcrumb, name and state, primary configuration action and an actions menu. Show infrastructure fields in a two-column definition list that stacks on small screens.
- **Buttons and inputs.** Use 40 px controls, 8 px radius and 14 px horizontal padding. Primary action has a filled green background, secondary action a surface and outline. Show errors by the field and associate text programmatically.
- **Forms and confirmations.** Use a right-side sheet up to 560 px wide for forms, with sticky Cancel/Save controls, and a centered dialog up to 440 px wide for confirmation. Use 24 px padding with 16 px field spacing. Move focus into the dialog, contain it while open and return it to the trigger on close. Keep success feedback accessible and preserve the list position.
- **Elevation.** Tables and overview cards use borders. Menus use `0 6px 18px #142C251A`. Modal sheets and dialogs use `0 16px 48px #142C2533` over a `#142C2566` scrim.
