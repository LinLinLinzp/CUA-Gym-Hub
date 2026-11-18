# Heroku workspace design

## Visual theme

Use a dark plum workspace rail, a slim light breadcrumb bar, and a paper-toned main canvas. Keep Heroku as text in the rail. Use a violet accent for actions and selection. The inventory table should be the dominant surface on the Applications screen. Use the local CSS texture as a small accent within the desktop heading band and retain a clear background behind all heading text.

## Color palette

| Token | Value | Use |
|---|---|---|
| Rail | #21172B | Workspace navigation background |
| Rail text | #F7F1FC | Wordmark and active navigation text |
| Rail muted | #C8BAD3 | Secondary navigation and account metadata |
| Canvas | #F6F4F8 | Application background |
| Surface | #FFFFFF | Tables, toolbar and forms |
| Text | #241A2D | Body and headings |
| Muted | #62596D | Metadata, table labels and hints |
| Border | #DDD6E5 | Field outlines and separators |
| Brand | #6942A6 | Primary buttons, links, and selected borders |
| Brand hover | #533282 | Hovered primary actions |
| Brand soft | #F0EAF9 | Selected rows and navigation accents |
| Focus | #8A60BC | Visible focus outline, with offset |
| Success | #206047 on #E8F5EF | Running or active |
| Warning | #855018 on #FFF0D9 | Maintenance or pending |
| Danger | #9C3039 on #FBECEF | Failed, delete, or validation errors |
| Neutral | #51465C on #EEEAF1 | Stopped or expired |

Always use text labels with status colors. Dark-rail focus indicators should use the light rail-text color.

## Typography

Use local system fonts. Use Segoe UI, system-ui, sans-serif for the interface and Consolas, ui-monospace, monospace for versions and optional process commands.

| Role | Size | Weight | Line height | Tracking |
|---|---|---|---|---|
| Wordmark | 23px | 700 | 28px | -0.03em |
| Page heading | 34px | 650 | 40px | -0.035em |
| Section heading | 19px | 650 | 26px | -0.015em |
| Body and navigation | 14px | 400 / 600 | 21px | 0 |
| Table labels and captions | 12px | 600 / 400 | 18px | 0.01em |
| Code and release versions | 13px | 500 | 20px | 0 |

## Layout

- At 1024px and wider, use a 224px workspace rail, a 60px breadcrumb bar above the main pane, and 32px horizontal content padding. Give main content a 1360px maximum width. Keep 24px between main sections and 12px between controls.
- The rail holds the wordmark, Applications link and signed-in account identity. The main toolbar carries breadcrumbs and search or filters where relevant. Put per-app Overview, Resources, Releases and Settings tabs below the app heading.
- Use a heading/action row, then a white inventory panel with its toolbar and table. Rows are 52px minimum with 16px horizontal cell padding. Overview uses two summary panels and a recent release panel. Resources has stacked Dynos and Add-ons tables. Releases uses one version table. Settings uses a narrow form and a separately bordered deletion section.
- Below 1024px, reduce the content padding to 20px. At 720px or less, collapse the rail into a top navigation strip, use 16px content padding, and stack summary panels. Keep tab labels and form controls visible. Allow wide tables to scroll inside their own containers.
- Use native buttons, inputs and selects with useful labels. Preserve visible focus, table header associations, dialog focus return, and Escape cancellation.

## Components and elevation

- Buttons are at least 40px high with 14px horizontal padding and 8px corners. Primary buttons use white text on the brand fill. Secondary buttons use the surface color with a 1px border. Use danger fill for a confirmed destructive action.
- Inputs are at least 40px high with a 1px border, 8px corners, and 12px horizontal padding. Keep errors near their input and retain entered values on validation failure.
- Surfaces use a 1px border and 12px corners. Use shadow 0 1px 2px rgb(40 21 56 / 7%) for tables, 0 8px 24px rgb(40 21 56 / 14%) for menus, and 0 20px 64px rgb(40 21 56 / 24%) for dialogs.
- Dialogs are up to 520px wide with 24px padding. Place the primary action last in tab order. Provide an accessible title, a Cancel action, and a sentence identifying the affected resource. Announce a saved result without moving focus.
- Use the original local stylesheet [heading-texture.css](public/visuals/heading-texture.css) for the optional header accent with the class heading-texture. Give its empty decorative element aria-hidden="true" and remove it at narrow widths. Set its parent to position relative and keep the local accent out of the heading and action hit areas.
