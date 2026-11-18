# Udemy Account Design

## 1. Visual theme

Use the word **Udemy** as a plain text wordmark. Give the account an editorial library treatment with a warm paper background, deep plum type, and three color families for original course artwork. Use a compact, shared navigation bar and a wide, centered canvas. On the learner home, align a stack of course rows with a smaller resume panel. On the instructor home, use a workbench with a course table and a small Q&A summary.

Use system fonts and local artwork. For course thumbnails, make reusable CSS illustrations from combinations of overlapping discs, concentric rings, and ruled lines. Theme them by course category using the illustration colors below. Keep graphics decorative and place course names in HTML. Use the same system for a wide lesson placeholder, with a meaningful local lesson title and content beside it.

## 2. Color palette

| Token | Value | Role |
| --- | --- | --- |
| Canvas | `#F8F5EF` | App background |
| Surface | `#FFFCF7` | Panels and dialogs |
| Ink | `#251C30` | Headings and body |
| Secondary ink | `#5C5364` | Metadata and helper text |
| Border | `#D9D0DC` | Panel and input outlines, row separators |
| Primary | `#623B8C` | Main action and active links |
| Primary hover | `#4E2D73` | Main action hover |
| Selected | `#EEE4F6` | Active tab and selected rows |
| Focus | `#7446AA` | Keyboard focus ring |
| Success | `#255640` on `#DDEDE3` | Completed, published |
| Warning | `#664407` on `#F5E8C7` | Draft or in review, with distinct text labels |
| Error | `#8C2944` on `#F7E2E8` | Form errors and destructive actions |
| Artwork | `#DCC6F0`, `#EBC0A8`, `#BBD9CC` with `#372748` | Lavender, terracotta and green course art |

## 3. Typography

| Role | Family | Size and line height | Weight | Tracking |
| --- | --- | --- | --- | --- |
| Wordmark | `system-ui, sans-serif` | 24 / 28 px | 750 | −0.04 em |
| Page title | `Georgia, serif` | 48 / 52 px | 400 | −0.035 em |
| Section title | `Georgia, serif` | 28 / 34 px | 400 | −0.02 em |
| Row title | `system-ui, sans-serif` | 16 / 22 px | 650 | Normal |
| Body | `system-ui, sans-serif` | 15 / 23 px | 400 | Normal |
| Label / metadata | `system-ui, sans-serif` | 13 / 18 px | 550 | Normal |

## 4. Spacing and layout

- Use a 68 px header with a 1 px divider and a centered main area up to 1200 px wide. Place My learning and Instructor beside the wordmark and the account name at the end.
- Use 32 px horizontal and 40 px top content padding, 24 px column gaps, and 12 px panel radii. Library columns use `minmax(0, 1fr) 300px`. Place search and filters above the library rows. Use 96 × 64 px artwork in each row.
- Use a lesson workspace with `minmax(0, 1fr) 320px` columns and switchable Overview, Curriculum and Q&A. Stack the syllabus below the content on narrow screens while keeping Q&A in the tab order.
- Use a 208 px instructor rail for Courses and Q&A. In Q&A, place filters above the thread list and show the selected thread in a wider reading pane. Under 900 px, stack side panels under the main view and use a back link from the thread detail. Under 600 px, use 16 px content padding and a 36 px page title. Keep all actions available.

## 5. Component patterns

- Use 42 px minimum height for buttons and inputs, 8 px radius, 12 px inline padding, and an adjacent 2 px focus ring with 2 px offset. Use plum fill and white text for the primary button. Use a bordered surface for secondary buttons and retain descriptive labels for icon controls.
- Give cards and rows a one-pixel border or divider. Let the title, supporting metadata and progress meter read in sequence. Display a numerical or textual progress value alongside the meter. Render status text inside any colored status pill.
- Use a 520 px maximum dialog width with 24 px padding, initial focus, Escape handling, and focus restoration. Keep validation beside the relevant input. Provide a polite live region for successful saves and an inline empty state where a filter yields no matches.

## 6. Elevation

- Base rows and panels use borders and flat surfaces.
- Menus use `0 8px 24px rgb(37 28 48 / 12%)`. Dialogs use `0 20px 52px rgb(37 28 48 / 20%)` and a `rgb(37 28 48 / 35%)` backdrop.
