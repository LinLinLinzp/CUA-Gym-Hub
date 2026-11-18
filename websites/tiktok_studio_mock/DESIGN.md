# TikTok Studio design system

## Visual direction

Use the visual language of an independent culture magazine's production desk. A dark forest header spans the page, with text branding at the left, centered account navigation, and the creator's initials and New post action at the right. The workspace sits on warm ivory. Deep evergreen provides structure, with small coral and aqua details. Serif page titles and original editorial cover photographs distinguish the workspace from the public product.

## Color tokens

| Role | Value | Usage |
| --- | --- | --- |
| Canvas | `#F5F2E9` | Workspace background |
| Surface | `#FFFCF5` | Cards, forms, tables, dialogs |
| Ink | `#172822` | Body copy and headings |
| Muted | `#4F6359` | Helper text and table metadata |
| Line | `#D8DED4` | Card borders and row separators |
| Masthead | `#112B24` | Header background |
| Masthead text | `#F5F5E8` | Header brand, links and account |
| Action | `#175C49` | Primary buttons and chart line |
| Action hover | `#104638` | Primary button hover |
| Aqua | `#7CE5CF` | Header active marker and New post button |
| Coral | `#FE627C` | Small attention markers and secondary chart highlight |
| Positive | `#235D48` on `#DDF0E3` | Published status |
| Upcoming | `#77460D` on `#F7EACF` | Scheduled status |
| Destructive | `#9B2941` on `#FBE8EB` | Error and destructive states |

Use ink on light aqua and light coral. Pair every status color with visible text. Use a 2 px offset focus ring in `#175C49` on ivory and `#7CE5CF` on the masthead.

## Typography

| Role | Family | Size / line height | Weight | Tracking |
| --- | --- | --- | --- | --- |
| Page title | Georgia, serif | 48 / 52 px | 400 | −0.035em |
| Section heading | Georgia, serif | 26 / 30 px | 400 | −0.02em |
| Brand text | Segoe UI, system-ui, sans-serif | 20 / 24 px | 700 | −0.025em |
| Controls and body | Segoe UI, system-ui, sans-serif | 15 / 22 px | 400 or 600 | Normal |
| Metadata | Segoe UI, system-ui, sans-serif | 13 / 18 px | 500 | Normal |
| Large figures | Segoe UI, system-ui, sans-serif | 28 / 34 px | 650 | −0.025em |

Use tabular numerals for metric columns and chart labels. Reduced layout uses a 36 / 40 px title. All typography is available offline via system fonts or bundled local equivalents.

## Workspace layout

- Masthead height is 76 px at desktop. Center header content and workspace within a 1280 px max width with 36 px horizontal padding. Give page heading blocks 40 px top and 24 px bottom spacing. Use 20–24 px gaps between cards.
- Use a 12-column content grid. Overview has an eight-column trend card and a four-column drafts card, followed by recent publications and replies to handle. Analytics uses a metric strip, a full-width trend panel, then a ranked list or saved reports.
- Posts use a full-width bordered table with 72 px minimum row height and a 44 × 56 px cover crop. Drafts use a three-column card grid, each card with a 16:9 cover crop, caption, readiness, and edit action. Comments use an inbox list with a narrow post-context column and inline reply editors.
- The composer uses seven columns for the editor and five for the preview. Use a smaller screen fallback with single-column content, an overflow-safe table region, and navigation that wraps into a second header row below 900 px. Preserve access to all actions at 375 px.

## Components and elevation

- Primary buttons have a 40 px minimum height, 16 px horizontal padding, 8 px radius, and action background with white text. Secondary buttons use the surface color and a 1 px line border. Give icon buttons an accessible label and a 40 × 40 px target.
- Fields use 42 px minimum height, 12 px horizontal padding, 8 px radius, a visible label, and contextual error text. Keep table controls in a single toolbar where space permits, with the search field first.
- Cards use a 14 px radius, 1 px line border, 20 px padding, and no shadow. Menus and dialogs use shadows of `0 8px 24px #112B2424` and `0 24px 72px #112B2440` respectively. Center confirmation dialogs within a 440 px max width and return focus to the initiating action on close.
- Charts use a dark evergreen line on lightly ruled ivory, visible axes, and values available to keyboard and screen reader users through a data table or chart-point controls.
- Use original local still lifes and close-up culture editorial photographs or illustrations for covers. Suggested subjects are ink rollers, a repaired book spine, a textile motif, neon signage, an archival drawer, and a pottery glaze. Use local media paths and typographic initials for avatar fallbacks. Use an original account mark or initials and render “TikTok Studio” in plain text.
