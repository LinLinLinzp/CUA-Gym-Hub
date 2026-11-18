# Zotero — Account UI Design

## Visual theme

Use an editorial research workspace with a warm paper canvas, wine-red brand text, cream navigation surfaces, and ink-colored typography. Make the library name the dominant heading. Separate browsing, editing, and citation composition into clear surfaces so that the reference list has room to breathe.

Render Zotero as text in a heavy serif. Build the visuals locally with CSS rules, small type tiles with paper marks, and typographic initials. Use the same type tiles in item rows, details, and citation selection. Pair every meaningful tile with text.

## Color

| Role | Hex | Use |
| --- | --- | --- |
| Brand | `#902F40` | Zotero wordmark, primary actions, active navigation |
| Brand hover | `#762435` | Hover on solid primary actions |
| Brand tint | `#F4E6E9` | Selected library, active filter, focused row background |
| Canvas | `#FAF7F1` | Workspace |
| Surface | `#FFFDFA` | Header, table, forms, and drawers |
| Navigation surface | `#F2EDE4` | Collection browser |
| Ink | `#292521` | Main text |
| Muted | `#635B54` | Secondary text and metadata |
| Border | `#E2D9CC` | Dividers, table lines, panel borders |
| Control border | `#8E8176` | Input edges |
| Success | `#2F634D` | Confirmations |
| Warning | `#785009` | Cautions |
| Error | `#9D2E37` | Validation and destructive action text |

## Typography

| Role | Stack | Size | Weight | Line height | Tracking |
| --- | --- | --- | --- | --- | --- |
| Wordmark | Georgia, serif | 28px | 700 | 1 | −0.03em |
| Page title | Georgia, serif | 42px | 500 | 1.12 | −0.035em |
| Section or dialog title | Georgia, serif | 25px | 700 | 1.2 | −0.02em |
| Body and controls | system-ui, sans-serif | 14px | 400 / 600 | 1.5 | Normal |
| Row title | system-ui, sans-serif | 14px | 650 | 1.45 | Normal |
| Metadata | system-ui, sans-serif | 12px | 500 | 1.45 | Normal |

## Layout

- Header height is 64px. At desktop widths, give it 32px horizontal padding and a 24px gap between brand and primary navigation. Leave account initials and name at the right.
- Center the content at up to 1440px. Use 32px outer padding, 24px between regions, a 232px collection panel, and a fluid reference column. At 1280px, the workspace fits its main controls and five or more reference rows above the fold.
- The workspace heading spans the layout with a parent-library link on collection or item routes. Place search, filters, sort, and New Item above the list. The active collection appears in the tree and the workspace heading. Use a 16px panel radius, 12px panel inner spacing, and rows at least 56px tall.
- At 840px and below, put the collection tree behind a labeled disclosure. At 600px and below, use 16px outer padding, a 32px page title, stacked controls, and article-style rows with secondary metadata on the next line. Make the details drawer full width. Keep selection checkboxes and primary actions directly accessible.

## Components

- Primary buttons use solid brand with white text. Secondary buttons use the surface with a control border. Use 40px minimum height on desktop, 44px on touch layouts, 8px radius, and 14px side padding. Use visible 2px brand focus outlines with a 3px offset.
- Use a real label for inputs, 40px minimum field height, and inline field errors. Keep form focus in the dialog while open, dismiss on Escape when safe, and return focus to the trigger.
- Give the library directory three columns above 990px, two columns from 481px through 990px, and one column at 480px and below. Within each card show name, role, reference count, and optional description. Make the library name the entry link and place management actions in a separate labeled menu.
- Use a 420px item drawer and keep details scrollable. Show bibliographic metadata, tags, collection memberships, and relevant actions grouped by purpose. The citation composer is a centered dialog up to 680px wide with a paper preview and labeled save, copy, and download actions. Citation history uses the same page header and list styling.
- Use a 1px border and minimal shadow for resting surfaces. Use `0 6px 20px rgba(42,32,24,.10)` for menus and `0 18px 48px rgba(42,32,24,.18)` for dialogs and drawers. Set the backdrop to `rgba(41,37,33,.38)`. Honor reduced motion.
- Show actionable empty states for empty libraries and collections. Give filtered results a Clear Filters action. Use an inline status region for successful changes and errors. Keep menu targets stable when a list refreshes.
