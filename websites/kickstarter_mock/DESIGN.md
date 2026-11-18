# Kickstarter Creator Studio design

## 1. Visual theme

Treat the creator account as an editorial workspace for independent cultural projects. Use a warm paper canvas, an ink-blue masthead, compact toolbars, and a serif display face for project titles. Use the brand name `Kickstarter` in plain text at the left of the masthead. Keep headings, status labels and buttons aligned to the creator’s next action.

Use original artwork for campaign covers. The direction is screen-printed posters with a small palette, geometric shapes, and strong silhouettes. The featured documentary cover can use overlapping pools of amber light on a dark blue athletic field. The Night Bus cover can show lit windows against a violet street grid. Produce art locally and bundle it under `public/art/`. Give records without an art key a consistent CSS illustration. The title remains readable as HTML alongside the cover.

## 2. Palette

| Role | Color | Use |
| --- | --- | --- |
| Masthead | `#182528` | Global navigation with `#FAFAEF` text |
| Canvas | `#F5F3EB` | Main background |
| Surface | `#FFFEFA` | Cards, tables, editors |
| Ink | `#1C2927` | Body and headings |
| Secondary text | `#50605A` | Metadata, hints and timestamps |
| Border | `#D8D9CF` | Panel edges and table dividers |
| Action | `#155843` | Filled buttons and links |
| Action hover | `#0C4334` | Filled button hover |
| Focus | `#1A6953` | Visible outline on light surfaces |
| Live | `#D9EFE4` / `#185642` | Status background and text |
| Funded | `#E1EAF4` / `#274A70` | Status background and text |
| Draft | `#F7EACC` / `#634718` | Status background and text |
| Inactive | `#ECEDE7` / `#4D5A52` | Archived and unsuccessful statuses |
| Error | `#FFF0EA` / `#922E25` | Validation and destructive actions |

## 3. Typography

| Role | Font stack | Size | Weight | Line height | Letter spacing |
| --- | --- | --- | --- | --- | --- |
| Masthead brand | `Segoe UI`, system-ui, sans-serif | 22px | 700 | 1.2 | −0.025em |
| Page title | Georgia, serif | 44px desktop / 34px compact | 400 | 1.08 | −0.035em |
| Project/card title | Georgia, serif | 25px | 400 | 1.2 | −0.02em |
| Section title | `Segoe UI`, system-ui, sans-serif | 19px | 650 | 1.25 | −0.015em |
| Body, controls | `Segoe UI`, system-ui, sans-serif | 15px | 400 / 600 | 1.45 | normal |
| Metadata and status | `Segoe UI`, system-ui, sans-serif | 13px | 400 / 600 | 1.35 | normal |

Use tabular numerals for funding, prices and counts. Render dates, currency and status labels as readable text. Preserve paragraph breaks when displaying campaign stories and updates.

## 4. Layout and spacing

- Masthead height is 64px. Center a 1280px container with 40px desktop gutters and 32px top padding. On screens below 700px, use 16px gutters and 24px top padding.
- At 1100px and up, show the Projects catalog as a three-column grid with a 20px gap. Below 1100px use two columns and below 700px use one. Place the page title and `New project` above the search, filter and sort controls. The project cards show a 16:9 cover, a compact metadata line, a title, and funding summary.
- On project routes, put the breadcrumb and project summary above a horizontal section navigation. Highlight the current section with an underline and `aria-current`. Allow horizontal scrolling for section links on narrow screens. Use a 3:2 overview grid for project information and funding or workflow summaries above 900px. Below 900px use a single column.
- Keep editor forms at up to 760px wide. Use a 16px gap between related fields and 24px between groups. Save and preview actions follow field order at the end. On mobile, stack form controls and let tables scroll inside their own container.
- Use a 4px spacing base, 10px panel radius, and 6px control radius. Use the same project header across Campaign, Rewards, Backer surveys and Updates.

## 5. Component patterns

- **Buttons** have a 42px minimum height and 16px horizontal padding. Primary buttons use action green with white text. Secondary buttons have an ink label and a 1px border. Dangerous confirmation buttons use error colors. A disabled action has nearby text explaining its prerequisite.
- **Fields** have a visible label, 42px minimum height, 12px padding, and a 1px neutral border. Mark invalid fields with `aria-invalid` and connect messages to the field. Place error text directly beneath the input.
- **Data rows** sit on the cream-white surface with 1px horizontal dividers and a 56px minimum row height. Give the row name a real link. Use familiar readable column headings and a visible count when filtering. For an empty list, give the relevant create action. For a filter with no matches, give a clear/reset action.
- **Status labels** use the appropriate background/text pair, 6px horizontal padding and a 4px radius. Use the written status in every instance. Add an unobtrusive funding bar where project funding data is available.
- **Confirmation dialogs** have a 480px maximum width and 24px padding. Put the project, reward, audience or recipient count in the confirmation text. Support Escape, focus containment, and return focus on close. Use polite live-region feedback after successful saves. Use a 2px focus ring with a 2px offset and a light ring in the masthead.

## 6. Elevation

Keep cards flat with a 1px border. Use `0 6px 20px rgba(24, 37, 40, .10)` for menus and `0 16px 48px rgba(24, 37, 40, .22)` for confirmation dialogs over a translucent ink scrim.
