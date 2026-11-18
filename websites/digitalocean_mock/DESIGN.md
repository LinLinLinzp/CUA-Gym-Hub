# DigitalOcean account design

## 1. Visual theme and atmosphere

Use an original account layout with a dark horizontal account bar and a full-width light navigation band. Display DigitalOcean in text at the left and the current team and user at the right. Group Droplets, Domains, and Snapshots as first-level destinations. Keep the resource views compact and quiet, with a warm work surface, blue controls, and clear table columns.

The overview uses a compact blue panel with an original local CSS illustration of offset outlined squares and dotted guide lines. Keep it to a small area beside the project summary. Draw any supporting glyphs locally and pair them with labels. Use system fonts and local styles throughout.

## 2. Color palette

| Role | Value | Use |
| --- | --- | --- |
| Account bar | `#10243A` | Dark top chrome |
| Primary action | `#1754C7` | Buttons, links, active underline |
| Primary hover | `#124399` | Hovered action |
| Focus | `#266ADB` | Visible offset outline |
| Canvas | `#F5F6F2` | Page background |
| Surface | `#FFFFFF` | Tables, panels, dialogs |
| Text | `#13273A` | Main labels and data |
| Secondary text | `#4F6374` | Subtitles and metadata |
| Border | `#D5DFE5` | Table and panel dividers |
| Active | `#16604D` on `#E3F4EA` | Active or available status |
| Neutral | `#43586A` on `#EAF0F4` | Off status |
| Caution | `#805210` on `#FFF1D8` | Compatibility and restore notices |
| Error | `#A02833` on `#FCECEE` | Errors and destructive intent |

## 3. Typography

| Role | Font | Size / line height | Weight | Letter spacing |
| --- | --- | --- | --- | --- |
| Brand | Segoe UI, system-ui, sans-serif | 20 / 26 px | 700 | −0.02em |
| Page title | Segoe UI, system-ui, sans-serif | 32 / 40 px | 650 | −0.025em |
| Section title | Segoe UI, system-ui, sans-serif | 19 / 26 px | 650 | −0.01em |
| Body and controls | Segoe UI, system-ui, sans-serif | 14 / 20 px | 400–600 | normal |
| Caption | Segoe UI, system-ui, sans-serif | 12 / 17 px | 500 | normal |
| IPs and DNS values | Consolas, ui-monospace, monospace | 13 / 18 px | 400 | normal |

## 4. Spacing and layout

- Account bar is 64 px tall. Navigation band is 48 px tall. Content maxes out at 1280 px with 40 px desktop gutters and 16 px mobile gutters.
- Start main content 32 px below navigation. Leave 24 px between the title, control bar, and table. Keep table rows at least 56 px tall with 16 px horizontal padding.
- Resource details and creation screens use a flexible main column and 300 px facts or summary column with a 24 px gap. Stack the summary below the main section under 900 px. Let catalogs and controls wrap. Keep wide data tables scrollable within their own container.
- Panels have 12 px corners. Buttons and inputs have 8 px corners. Use 4 px increments for local spacing.

## 5. Component patterns

- Primary buttons use a solid primary blue and white text, with a minimum height of 40 px and 16 px inline padding. Outline secondary buttons have a white background and a 1 px border. Destructive submit actions use solid error red with white text.
- Inputs use a 1 px border, white surface, 40 px minimum height, and explicit labels. Show errors beneath the field and focus the first invalid input where practical.
- Tables live on a white surface with a 1 px outline. Use sentence-case headers and visible row actions. Text labels accompany color-coded statuses. Present one clear primary action in each page header.
- Use a 480 px side panel for short edit forms and a centered dialog up to 460 px wide for confirmations. Keep focus in modal surfaces, restore it on close, and show the resource's name in destructive dialogs. Success feedback uses a polite live region.
- State-specific empty views explain how to add the relevant resource or clear the filters. Link missing-record screens back to the list. Preserve readable layouts when values are absent or names are long.

## 6. Shadow and elevation

Tables and inline panels use borders. Menus use `0 6px 20px rgba(16, 36, 58, 0.13)`. Dialogs use `0 20px 50px rgba(16, 36, 58, 0.24)` above a `rgba(16, 36, 58, 0.40)` scrim.
