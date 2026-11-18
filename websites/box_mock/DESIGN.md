# Box workspace design

## Visual theme

Build an editorial workspace on a warm canvas with a top navigation bar, a compact document table, and a context column reserved for the open folder or file. Use a plain text **Box** wordmark. A serif page title, rust primary actions, neutral file rows, and tabular metadata give the workspace its own visual identity.

## Design tokens

| Role | Value | Use |
| --- | --- | --- |
| Canvas | `#F6F3EE` | Page background |
| Surface | `#FFFEFB` | Table, forms, and preview panel |
| Ink | `#252A2C` | Titles and body |
| Secondary | `#585E60` | Metadata and inactive navigation |
| Edge | `#DDD6CC` | Hairlines and table rules |
| Action | `#96392C` | Primary controls and active navigation |
| Action hover | `#792C22` | Hover and pressed primary controls |
| Focus | `#285C92` | 2px outline with 3px offset |
| Selected | `#F4E4DB` | Selected rows and tabs |
| Success | `#225744` on `#E6F0EB` | Active, approved, completed |
| Attention | `#75501E` on `#F9EEDA` | Pending and overdue |
| Critical | `#8A3029` on `#F8E7E3` | Rejected, destructive, and invalid |
| Archived | `#515657` on `#EDECE8` | Retired and historical |

## Type

| Role | Font stack | Size / line height | Weight | Tracking |
| --- | --- | --- | --- | --- |
| Wordmark | Segoe UI, system-ui, sans-serif | 24 / 28px | 750 | -0.04em |
| Page title | Georgia, serif | 40 / 44px | 400 | -0.035em |
| Section or dialog title | Segoe UI, system-ui, sans-serif | 19 / 26px | 650 | -0.01em |
| Body, nav, and controls | Segoe UI, system-ui, sans-serif | 14 / 20px | 400 or 600 | normal |
| Metadata and table headers | Segoe UI, system-ui, sans-serif | 12 / 18px | 500 or 600 | 0.01em |

## Layout and components

- Use a 64px top bar with wordmark, **Files**, **Tasks**, and **Governance** at left, and named search and a static initials badge at right. Cap the content at 1440px with 40px desktop gutters, 24px section gaps, and 8px control radii. Below 840px use 20px gutters and stack context under the primary column. Below 600px wrap search onto its own row and collapse optional columns into row detail, preserving names and actions.
- Put breadcrumb and page title above the primary action. Place All items, Folders, and Files filters and sort controls above a ruled table. Use 52px rows, 16px horizontal insets, and stable widths for modified, owner, and action columns. Use distinct folder and file-type markers drawn locally, without fetching brand marks, fonts, or images. Hover and keyboard focus expose the same actions and the full row remains readable.
- In a folder, arrange the contents and a roughly 300px context column in a 2-column grid with a 24px gap. Show collaborator summary and applicable retention coverage only where relevant. In a file preview, put a locally typeset synthetic first page on a neutral matte and place Activity in a 320px column. Seed local preview text and tables for the files used in task scenarios.
- Use quiet bordered controls at least 36px tall, with rust fill and white text on primary actions. Use text and icon together for important actions. Place labeled inline validation beneath its field and announce submitted outcomes through a live region. Status chips always include text.
- Use a 440px modal for short edits and a 600px modal or equivalent page for a folder picker or policy review. Use a labeled heading, contained keyboard focus, Escape to close, and focus return to the trigger. Allow keyboard operation with explicit menus and checkboxes. A dialog backdrop uses `rgba(30,23,20,.32)`. Dropdown shadow is `0 6px 18px rgba(36,26,20,.12)` and dialog shadow is `0 16px 48px rgba(36,26,20,.18)`. Resting lists use borders and no shadow.
