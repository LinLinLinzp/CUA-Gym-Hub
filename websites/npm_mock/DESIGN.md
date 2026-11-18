# npm account UI design

Use a warm, light registry workspace with a fixed-width graphite navigation rail and a compact package inventory. A plain lowercase `npm` wordmark sits at the top of the rail in system monospace, with no surrounding logo shape. The page feels like an operations console through aligned columns, strong typography, and visible package names. Use simple original CSS glyphs and initials tiles for visual identification. All workspaces and names come from the local synthetic seed.

## Palette

| Role | Value | Use |
| --- | --- | --- |
| Canvas | `#F6F4F0` | Workspace background |
| Surface | `#FFFFFF` | Lists, controls, and forms |
| Rail | `#242328` | Global navigation |
| Rail selected | `#3B3339` | Active navigation item |
| Rail text | `#F9F5F5` | Wordmark and primary nav |
| Text | `#27232A` | Titles and primary content |
| Secondary text | `#655C65` | Descriptions and dates |
| Border | `#E2DBDC` | Dividers and surface borders |
| Input border | `#8F838B` | Inputs and filter controls |
| Primary | `#A82D43` | Primary buttons, links, active indicators, and focus rings |
| Primary hover | `#8B2036` | Hovered primary controls |
| Soft accent | `#F9E8ED` | Selected filters and private badges with `#802D49` text |
| Neutral | `#EDEAF0` / `#514959` | Neutral chips, including public visibility |
| Success | `#E5F1EA` / `#245B45` | Active status and success messages |
| Warning | `#F8EDDA` / `#754711` | Expiration and deprecation states |
| Danger | `#FBE7E9` / `#921E35` | Revoked, destructive confirmations, and validation |

## Typography

Use `system-ui, -apple-system, "Segoe UI", sans-serif` for prose and `ui-monospace, Consolas, monospace` for packages, scopes, versions, and token fragments. Use tabular numerals for counts and dates in rows.

| Role | Size / line height | Weight | Tracking |
| --- | --- | --- | --- |
| Wordmark | 27 / 30px | 750 | -0.06em |
| Page title | 36 / 40px | 700 | -0.045em |
| Section title | 21 / 26px | 650 | -0.02em |
| Row title | 14 / 20px | 650 | 0 |
| Body and controls | 14 / 21px | 400–600 | 0 |
| Table headers and metadata | 12 / 18px | 500–650 | 0.01em |

## Layout

- Use a 216px rail and 64px contextual header at widths from 960px. Place the content in a 1,200px maximum-width column with 36px outer padding and a 24px vertical rhythm. The rail puts Packages, Access Tokens, and Organizations in that order and anchors the signed-in account at the bottom.
- Put the title, one-line purpose where needed, and primary action in a shared header row. Place filter and search controls above a bordered list with a separate pagination footer. Package rows use a 64px minimum height and 16px cell padding. In detail views, expose a concise overview followed by a visible tab row and the active panel.
- Use 12px surface radius, 8px control radius, and 6px status-pill radius. At widths below 960px, move the rail into a compact header and keep all three links visible. At widths below 640px, use 16px outer padding and stacked controls. Preserve access to row actions and all columns through responsive stacked rows or a labeled scroll region.

## Components and elevation

- Primary button uses `#A82D43`, white text, 600 weight, 40px minimum height, and 16px horizontal padding. Secondary button uses a white surface with an input-strength outline. Destructive actions use an explicit action label and red treatment inside the confirm dialog. Focus uses a 2px accent ring with 2px offset.
- Search and select controls use a 40px minimum height, visible labels or accessible names, and a 1px input border. Field messages sit below the relevant input. Interactive row controls have dedicated links or buttons, and state chips use readable labels alongside color.
- Tables have a 40px header row on `#FAF7F6` and 1px dividers. Hover uses `#FBF6F7`. Keep long names legible with wrapping or accessible truncation. Use one white empty-state panel with a next action when available.
- Use minimal surface elevation (`0 1px 2px #27232A0D`). Menus use `0 8px 24px #27232A26`. Confirmation dialogs use a 480px maximum width, 24px padding, overlay `#24232880`, and shadow `0 24px 64px #27232A40`. Set dialog focus on open, support Escape, and return focus on close. Token and organization creation use dedicated routes for longer forms.
