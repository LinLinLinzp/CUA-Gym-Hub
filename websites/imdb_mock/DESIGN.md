# IMDb account workspace design

## Visual direction

Use a warm ivory canvas, a dark plum account rail, and an editorial layout for a personal film collection. Pair large serif headings with crisp utility text. Use original, unboxed IMDb text in the rail above the account navigation. Show the active account through its name and initials. Original poster art provides the color and texture across the account.

## Color roles

| Role | Value | Use |
| --- | --- | --- |
| Canvas | `#F7F3EA` | Working area |
| Surface | `#FFFDF8` | Cards, controls, dialogs |
| Ink | `#262333` | Primary text |
| Muted ink | `#605B68` | Metadata and supporting text |
| Rail | `#282239` | Navigation background |
| Rail active | `#423652` | Active navigation background |
| Rail ink | `#F9F3E7` | Navigation text |
| Brand gold | `#F2CA66` | IMDb text on plum and small highlights on dark art |
| Primary action | `#58417A` | Buttons, active controls, links |
| Action hover | `#45325F` | Primary hover and pressed states |
| Selected | `#EEE6F6` | Selected control fill |
| Border | `#DDD4C7` | Dividers and card outlines |
| Input border | `#807687` | Form boundaries |
| Focus | `#7751A3` | Focus outline on light surfaces, use brand gold on the rail |
| Success | `#246451` | Completed action feedback |
| Warning | `#79511B` | Attention and validation hints |
| Error | `#9E3347` | Errors and destructive actions |

## Typography

Use Georgia for display headings and the system UI stack for account chrome, controls, and copy. Use tabular numbers for scores, years, and counts.

| Role | Stack | Size / line height | Weight | Tracking |
| --- | --- | --- | --- | --- |
| Brand text | System UI | 27 / 32 px | 800 | −0.025em |
| Page title | Georgia | 48 / 52 px | 600 | −0.035em |
| Section title | Georgia | 28 / 34 px | 600 | −0.02em |
| Row or card title | System UI | 16 / 22 px | 650 | normal |
| Body | System UI | 15 / 23 px | 400 | normal |
| Control | System UI | 14 / 20 px | 600 | normal |
| Metadata | System UI | 13 / 19 px | 400 | normal |

## Layout

- At widths of 1024 px and up, use a 232 px rail and a flexible workspace. The rail has 22 px gutters, 44 px navigation rows, 4 px between rows, and the account identity below the brand with 28 px separation.
- Place search in a 72 px top band, aligned with the main content. Use 36 px desktop horizontal and top padding, a 1200 px maximum content width, 24 px between sections, and 16 px between related controls. Search has a 440 px maximum width.
- Your Activity starts with its H1 and account collection links showing live counts. Below, use a Watchlist shelf with three to five portrait covers depending on space and a recent ratings and lists area in two columns. Keep the collection links and first row of artwork visible in a typical desktop first viewport.
- Use a 220 px-wide poster on title detail, with metadata and actions beside it. Reflow detail and overview into single-column sections as available width falls. At 1023 px and below, use a top bar with brand and account identity above a labeled navigation row. At 560 px and below, use 16 px gutters, 34 / 39 px page headings, wrapping controls, and no page-level horizontal scrolling.
- Collection pages place the title and primary action above a utility row of filters, sort, and result count. Rows use a 56 × 84 px cover, flexible text, and an action group with descriptive labels. A row pairs its title with type, year, and any applicable score or date. Show counts adjacent to their collection labels.
- Use the spacing scale 4, 8, 12, 16, 24, 32, and 48 px. Use 8 px radii for controls and 12 px on cards and dialogs.

## Interaction and components

| Component | Specification |
| --- | --- |
| Primary button | Purple fill, white text, 40 px min height, 14 px horizontal padding |
| Secondary button | Ivory surface, ink, 1 px input border, matching height |
| Destructive action | Error ink on light surfaces, solid error with white text for confirmation |
| Search and fields | Visible label or accessible search label, 1 px input border, 40 px min height |
| Filter and score controls | Selected fill plus visible selected label or check, and equivalent accessible state |
| Rating picker | Ten numbered options in a five-column grid with distinct selected and focused states |
| Collection menu | Titled row action trigger, anchored panel, Escape closes and restores focus |
| Dialog | Up to 520 px wide, 24 px padding, overlay `#18142180`, named title, focus containment and restoration, Escape and Cancel, submission controls below fields |
| Feedback | Inline validation beside the field and a concise status message after a successful write |
| Artwork fallback | 2:3 neutral plum or clay cover, short original title or initials, readily readable adjacent title link |

Use a 2 px visible focus outline with 2 px offset. Interactive controls should be comfortably usable by touch, with 44 px targets where track width allows. Use aria-current for navigation and real inputs, links, and buttons for interaction. Respect reduced-motion preferences. Keep empty states short, with one action that helps the user continue.

## Local visual assets and elevation

Prepare an original cover art system with several distinct compositions for synthetic genres. Use locally generated raster images with original imagery such as an empty railway platform, fog over a pier, a night bus shelter, a frost-covered antenna, and abstract landscapes. Art should vary in subject, palette, and framing, and all crop variants should read at thumbnail sizes. Overlay synthetic title text locally where it helps identify a cover. Store assets under `public/art/`, reference them by local path, and provide the fallback above for injected titles. Derive collection covers from the first few member titles in custom order or show the empty cover treatment.

Keep cards flat with a 1 px border. Use `0 8px 24px #2623331A` for menus and `0 20px 64px #26233332` for dialogs.
