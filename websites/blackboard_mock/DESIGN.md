# Blackboard instructor workspace

## Visual theme

Use a light, print-inspired teaching workspace with a graphite masthead, warm ivory canvas, and cobalt actions. A horizontal global navigation and an editorial course index establish the identity. Course signatures use original CSS geometry drawn locally. Show a plain-text Blackboard wordmark, followed by the three navigation links and the signed-in instructor at the right.

## Palette

| Token | Color | Role |
| --- | --- | --- |
| Masthead | `#21242B` | Global navigation |
| Canvas | `#F7F5EF` | Page background |
| Surface | `#FFFFFF` | Cards, tables, and form panels |
| Ink | `#21242B` | Primary content |
| Muted ink | `#5E6570` | Supporting content |
| Border | `#D9D9D2` | Dividers and passive outlines |
| Control border | `#7C828E` | Input boundaries |
| Action | `#2445B8` | Links, filled buttons, focus rings |
| Action hover | `#1C348B` | Filled button hover |
| Action wash | `#EDF1FF` | Selected rows and view controls |
| Success | `#17603E` on `#E6F3EA` | Open and Posted |
| Warning | `#795114` on `#F8EED8` | Needs grading and awaiting post |
| Error | `#A12532` on `#FCEBEB` | Validation and destructive actions |
| Neutral | `#495460` on `#EDF0F2` | Closed, Complete, Draft, and Hidden |

## Typography

| Role | Font stack | Size / line height | Weight | Tracking |
| --- | --- | --- | --- | --- |
| Page title | Georgia, serif | 42 / 46 px | 700 | -0.02em |
| Course title | Georgia, serif | 24 / 29 px | 700 | -0.01em |
| Section title | system-ui, sans-serif | 18 / 24 px | 650 | normal |
| Navigation and body | system-ui, sans-serif | 15 / 22 px | 400–650 | normal |
| Metadata and status | system-ui, sans-serif | 13 / 18 px | 500–650 | normal |
| Course codes and points | ui-monospace, Consolas, monospace | 13 / 18 px | 500 | normal |

## Spacing and view layout

- Masthead is 64 px high at desktop sizes. Use a centered 1280 px content frame with 32 px gutters, 40 px top padding, and a 24 px section gap. Use 16 px gutters under 640 px and allow the masthead to wrap. Keep the same links reachable.
- Courses starts with a page title, followed by a search and filter row and a result count. Group cards by term with pinned favorites in their own labeled section. Cards use a 12 px radius, 20 px internal padding, and an 18 px grid gap. Use three columns above 1100 px, two above 720 px, and one below. Keep course titles, access, and favorite controls separate targets.
- Make an original CSS course signature in each card's 56 px top strip. Use locally authored `linear-gradient` ruled lines, `radial-gradient` arcs, and a solid base chosen deterministically from cobalt, sage, and clay. Keep text below the strip. Use a solid swatch fallback for unknown subjects and mark the artwork decorative.
- Course overview uses a compact identity header with breadcrumbs, code, course title, term, and status. Place Overview, Roster, Grade Center, Announcements, and Course Settings navigation directly below. On wide screens use a two-thirds content list with a one-third course details card. Stack on narrow screens.
- Grade Center global view uses a course work queue. Course Grade Center places Grades and Gradable Items above a white semantic table. Set grid headers to 48 px minimum height, rows to 44 px minimum height, and the student column to 200 px with a sticky opaque surface during horizontal scroll. Keep score buttons and posting controls inside the scroller's usable area.
- Announcements uses a search/filter toolbar, compact textual statuses, and single-line list summaries. Use a 480 px maximum-width right drawer for the full message; widen the compose form to 560 px. At narrow widths use the full viewport for open drawers and editing.

## Components and interaction

- Buttons and labeled inputs should be at least 40 px tall with an 8 px radius. Filled primary buttons use Action with white text. Secondary buttons use Surface, Action text, and the Control border. Use a visible 2 px focus ring with 2 px offset. Icon-only controls such as favorite require an accessible name and response state.
- Use solid badges with 6 px horizontal padding and an explicit status word. Show empty, filtered-empty, loading, and missing-course states alongside a relevant recovery action when available.
- Keep form labels above inputs. Show validation below its field and focus the first invalid field on submit. Use accessible dialogs or drawers with Escape, focus return, and backdrop `rgba(33, 36, 43, 0.42)`. Explicit confirmation appears for destructive actions and grade posting.
- Use `0 1px 2px rgba(33, 36, 43, 0.06)` for cards and `0 12px 32px rgba(33, 36, 43, 0.16)` for the elevated form surface. Keep feedback concise and near the user's action, with an accessible status region for success.
