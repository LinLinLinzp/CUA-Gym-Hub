# Databricks workspace design

## 1. Visual theme

Use a deep plum masthead with the brand set as plain text, followed by a light workspace canvas that brings names, status, and primary actions into focus. Organize the product around a horizontal navigation row and centered content. Use persimmon for primary actions and cool lavender for selected surfaces. The default workspace identity is Acme Analytics.

## 2. Color palette

| Role | Token | Use |
| --- | --- | --- |
| Masthead | `#251D34` | Global identity and navigation background |
| Masthead text | `#F9F5FE` | Brand, workspace, active navigation |
| Masthead secondary | `#DDD0ED` | Inactive navigation and user context |
| Brand accent | `#FF765E` | Selected navigation underline and small accents |
| Canvas | `#F7F5F9` | App background |
| Surface | `#FFFFFF` | Cards, inputs, tables, menus |
| Raised tint | `#F0EAF7` | Selected tabs, notebook gutters, soft emphasis |
| Ink | `#271C35` | Main text |
| Muted ink | `#625972` | Secondary detail, labels and timestamps |
| Border | `#DED6E7` | Dividers and cards |
| Control border | `#92839F` | Form control boundaries |
| Primary | `#A83525` | Filled action with white text |
| Primary hover | `#84271B` | Hovered filled action |
| Link | `#583285` | Linked object names and focus rings |
| Success | `#196044` on `#E3F4EB` | Running compute and successful runs |
| Warning | `#734900` on `#FFF0D1` | Queued, paused, or interrupted work where applicable |
| Error | `#A02B3D` on `#FBE9ED` | Failures and destructive-action context |
| Neutral | `#514963` on `#EEEBF2` | Terminated, manual, skipped and canceled |

## 3. Typography

| Role | Family | Size | Weight | Line height | Tracking |
| --- | --- | --- | --- | --- | --- |
| Brand | system-ui | 22 px | 750 | 28 px | −0.04 em |
| Page title | system-ui | 34 px | 730 | 40 px | −0.035 em |
| Section heading | system-ui | 20 px | 700 | 28 px | −0.02 em |
| Body and controls | system-ui | 14 px | 400–650 | 21 px | normal |
| Labels and metadata | system-ui | 12 px | 550 | 18 px | normal |
| Code and technical values | Consolas, monospace | 13 px | 400 | 20 px | normal |

## 4. Layout and spacing

- Use a 60 px masthead with brand and workspace on the left and a synthetic initials avatar on the right. Place section navigation in a 44 px row directly underneath. Indicate selection with a 3 px underline and higher contrast text.
- Limit the app body to 1360 px and center it with 40 px outer padding at desktop widths, 24 px at tablet widths and 16 px on mobile. Use 24 px between sections and a spacing scale of 4, 8, 12, 16, 24, 32, 40, and 48 px.
- On Overview, place a short workspace heading and three one-click creation actions above a three-column row of functional metrics. Follow with a recent activity list and a compute summary in an approximately 2:1 grid. Stack these on narrow screens. An original background of offset dots and thin arcs can be authored in local CSS on the overview heading surface. Keep it behind the right edge, away from text and controls.
- For Workspace, Jobs and Compute, align title and primary action above a compact filter strip and a white table panel. Use 42 px table headers, 52 px rows, and 16 px horizontal cell padding. Allow accessible horizontal scrolling when columns outgrow the viewport.
- Detail pages begin with breadcrumb, heading, status where applicable, and actions. Use a flexible content column and a 300 px context column where useful. Put secondary context below the main content on small screens. A notebook editor stays wide enough for source and outputs.

## 5. Component patterns

- Primary buttons have a minimum height of 38 px, 14 px horizontal padding, an 8 px radius, and 650 weight. Secondary buttons use white backgrounds, ink labels, and a 1 px border. Icon-only actions require an accessible name. Use explicit verbs for destructive confirmations.
- Inputs share the 38 px minimum height and an 8 px radius. Pair labels with controls, place validation below the field, and draw a 2 px focus outline with a 2 px offset. Use a visible focus ring on menu items, editor controls, and table links.
- Panels use 14 px radii and a 1 px border. Table status pills use a 12 px label, a small status dot, and 8 px horizontal padding. Include text for every status. Cell editors use a softly tinted gutter, a language label, a monospaced editor, and a bordered output region underneath.
- Dialogs use a 520 px maximum width or 640 px for task and compute forms, 24 px padding, and a tinted backdrop. Support Escape, focus containment and return, and keyboard completion. Put the strongest action last and inline errors next to their inputs.
- Use original CSS geometry and typographic initials for decorative elements. Keep illustrations and icons local and keep the brand rendered as text.

## 6. Shadow and elevation

| Surface | Shadow |
| --- | --- |
| Table and card | `0 1px 2px #251D340A` |
| Menu and popover | `0 10px 28px #251D3421` |
| Dialog | `0 20px 60px #251D3438` |
