# Wikipedia account workspace

## Visual theme

Design a contributor’s reading desk with deep blue navigation, a warm paper canvas and a type hierarchy drawn from print indexes. Set `Wikipedia` as plain serif text in the masthead. Distinguish the workspace through its vertical account navigation, broad illustrated entry panel, ruled reading lists and compact controls. Use the original local CSS illustration in [`public/visuals/reading-desk.css`](public/visuals/reading-desk.css) on the trailing side of the workspace hero, separated from the headline and controls. Keep documentation and article text out of the illustration.

## Color palette

| Role | Value | Use |
| --- | --- | --- |
| Navigation | `#142A38` | Desktop rail and compact mobile masthead |
| Active navigation | `#244352` | Selected rail item, with `#A9D8CA` leading rule |
| On navigation | `#F7FAF9` | Masthead and rail labels |
| Muted on navigation | `#B7C8CA` | Secondary account text |
| Canvas | `#F4F1E8` | Workspace background |
| Paper | `#FFFCF5` | Article sheets, forms, tables and selectors |
| Ink | `#182D34` | Headings and body text |
| Muted ink | `#4E635F` | Metadata, captions and helper text |
| Action | `#13594C` | Primary button fill and inline links |
| Action hover | `#0D443B` | Hovered primary fills and links |
| Division | `#D8DACE` | Structural borders and row rules |
| Field border | `#697C74` | Interactive field and secondary control outlines |
| Focus | `#A34B1C` | Three-pixel keyboard focus outline on paper |
| Success | `#205A41` on `#E8F2E8` | Confirmation feedback and positive change readouts |
| Warning | `#70460D` on `#FBF0D4` | Unpublished changes or attention states |
| Error | `#8B302D` on `#FAEBE6` | Invalid inputs and destructive confirmations |

## Typography

| Role | Stack | Size / line height | Weight | Tracking |
| --- | --- | --- | --- | --- |
| Brand | Georgia, Times New Roman, serif | 28 / 34 px | 700 | −0.6 px |
| Workspace and article titles | Georgia, Times New Roman, serif | 48 / 52 px desktop, 34 / 40 px phone | 400 | −1.2 px desktop |
| Section headers | Georgia, Times New Roman, serif | 25 / 32 px | 700 | −0.2 px |
| Article prose | Georgia, Times New Roman, serif | 18 / 30 px | 400 | normal |
| Controls and lists | Segoe UI, system-ui, sans-serif | 15 / 22 px | 400 or 600 | normal |
| Metadata | Segoe UI, system-ui, sans-serif | 13 / 18 px | 400 | normal |
| Article source | Consolas, ui-monospace, monospace | 14 / 22 px | 400 | normal |

## Layout

- Desktop uses a 232 px rail spanning the viewport and a 72 px search and account header over the content area. Keep the wordmark and primary navigation in the rail. Place the username and a local initials mark in the header. Keep the account indicator informational unless it links to a working feature.
- Center content at a maximum width of 1160 px with 36 px desktop gutters. Use a 224 px minimum-height workspace hero and a 24 px gap between the article index and watch preview. Render article reading panes at a maximum of 72 characters per line with a roughly 184 px section index when space permits.
- Use an 8 px spacing scale with 4 px increments for compact alignment. Cards use a 12 px radius and 24 px inner padding. List rows use at least 52 px of height. Keep whitespace between sections rather than adding decorative labels.
- Below 1040 px, stack workspace panels when the second column would be narrower than 280 px. Below 860 px, use a full-width masthead with wrapping navigation and a full-width search row. Below 600 px, use 16 px gutters, stack dense metadata, and put the article section index before the prose. Keep all workflows usable at 360 px without horizontal page scrolling. Limit horizontal overflow to code or diff content when needed.

## Components and states

| Component | Treatment |
| --- | --- |
| Primary action | `#13594C` background, white text, 8 px radius, 44 px minimum height, 14 px horizontal inset |
| Secondary action | Paper background, 1 px field border, ink text, same height and inset as primary |
| Links and tabs | Underline inline text links. Use visible labels with an underline or filled active surface for the article routes and watchlist subnavigation. |
| Inputs | Paper background, ink text, 1 px field border, 8 px radius and 44 px minimum height. Give composers a persistent label and show validation next to the field. |
| Lists | Thin division rules, title first, contributor and timestamp on a secondary line. Show minor status or a thread reply count where it affects review. |
| Inline feedback | Color with explicit text and a status or alert role. Retain feedback near the triggering control and restore focus after dialogs. |
| Confirmation dialog | Paper surface, 12 px radius, 24 px padding, maximum width 480 px, descriptive title and reachable Cancel and Remove actions. |
| Keyboard focus | Use a 3 px ring with a 2 px offset. Use `#A9D8CA` within the navigation rail. |

## Elevation

- Content panels and tables use borders and no shadows.
- Floating controls use `0 8px 24px #142A381A`.
- Modal surface uses `0 24px 60px #142A3833` over a `#142A3866` scrim.
