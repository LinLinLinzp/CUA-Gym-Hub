# Grafana workspace design system

## 1. Visual theme

Use a light observability workspace with a warm paper background and a deep aubergine header. Place `Grafana` in plain text at the far left, followed by the workspace name. Place the main section links in the header and spell out the active section. Keep page navigation horizontal and place folder filters inside the dashboard library. Large typography, open margins, and thin borders give the operational tables and graphs room to breathe.

On the dashboard library, use an offset introductory row with title and actions on the left and the original [metric illustration](assets/header-metrics.svg) on the right. Keep the illustration decorative and hide it on narrow screens. Actual panel charts are drawn locally from deterministic data and include axis labels and units.

## 2. Color palette and roles

| Role | Token | Use |
| --- | --- | --- |
| Header | `#301D35` | Workspace header and active navigation |
| Header text | `#FFF8F4` | Brand and active links on aubergine |
| Header muted | `#DAC9D8` | Workspace name and inactive links |
| Canvas | `#F8F4EF` | Main workspace |
| Surface | `#FFFCF8` | Cards, tables, forms, menus |
| Text | `#271C2C` | Titles and body |
| Muted text | `#655563` | Secondary labels and timestamps |
| Border | `#DCCFD6` | Dividers and card outlines |
| Input border | `#9B8998` | Visible input and select boundaries |
| Primary action | `#A53A2A` | Primary buttons and links on light surfaces |
| Primary hover | `#852D23` | Pressed and hover state |
| Focus | `#7046A1` | 2px focus ring with 3px offset on light surfaces. Use `#FFD38A` in the header. |
| Success | `#285F4D` on `#DFF0E7` | Normal and successful test |
| Warning | `#764B11` on `#FAEBCB` | Pending |
| Error | `#9A302B` on `#FAE2DF` | Alerting or error |
| Neutral | `#51415D` on `#EEE7F1` | Paused and no data |
| Series | `#297968`, `#B04931`, `#76569B` | Distinct plotted series with labeled legends |

## 3. Typography

Use `Inter, 'Segoe UI', system-ui, sans-serif` with a local package if Inter is included. Use `ui-monospace, Consolas, monospace` for query and metric values and tabular numerals for counts.

| Role | Size | Weight | Line height | Tracking |
| --- | --- | --- | --- | --- |
| Brand text | 23px | 750 | 28px | -0.025em |
| Page heading | 36px | 700 | 42px | -0.035em |
| Section title | 20px | 650 | 28px | -0.02em |
| Table and body | 14px | 400 | 21px | normal |
| Button and field label | 14px | 650 | 20px | normal |
| Caption and chip | 12px | 550 | 17px | 0.01em |

## 4. Spacing and layout

- Header is 72px high on desktop with a 24px gap between links. Use the same centered 1320px maximum width for header and body. Body gutters are 40px desktop and 16px on small screens. Place the workspace navigation in a wrapping row on compact layouts.
- Library introduction and toolbars use 24px vertical gaps. The library has a 224px folder column, 24px gap, and fluid list. Below 900px the folder navigation moves above the list. Allow table overflow within its own region on small screens and keep names and actions reachable.
- Dashboard panels use a two-column grid with 16px gaps, stacking below 760px. Alert rules use folder/group bands above table rows. Contact points use a list with aligned integration summaries and a menu at the row end. Editors use a 760px content column with one labeled section per task and a closing save/cancel row.
- Dialogs have a 560px maximum width, 24px padding, and scroll internally on short viewports. Set input rows and primary buttons to a minimum 42px block size. Use a 4px spacing base, 10px button/input radius and 16px card/dialog radius.

## 5. Component patterns

- Primary action buttons use `#A53A2A` with `#FFF8F4` text and `padding: 10px 16px`. Secondary buttons use the surface color, a 1px outline, and dark text. Separate destructive actions from primary actions and use verb labels in confirmation dialogs.
- Inputs use `border: 1px solid #9B8998`, `padding: 10px 12px`, and a visible label above. Keep error text against the relevant field and preserve form values on validation failure. Use a monospace textarea with a four-line minimum for metric queries.
- Tables use 1px separators, a softly tinted header (`#F1E8EC`), and minimum 54px rows. Dashboard and rule names are links. Avoid nested interactive elements in clickable rows. Status chips use text plus a small marker and keep meaning available without color.
- Use accessible native controls where practical. Dialogs manage focus, Escape, and return focus to their opener. Menu buttons expose expanded state, and validation messages and save results are announced through suitable live regions. Empty layouts name the missing item and surface a relevant action.

## 6. Shadow and elevation

Use flat cards with a 1px border. Menus use `0 8px 24px rgb(48 29 53 / 12%)` and dialogs use `0 20px 64px rgb(48 29 53 / 24%)` over `rgb(38 23 43 / 38%)`. Use hover fill `#F2E8ED` for interactive rows.
