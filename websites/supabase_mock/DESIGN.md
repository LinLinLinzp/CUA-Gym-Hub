# Supabase workspace design

Use a light, warm-toned workspace with an ink-blue utility bar, strong display typography, and dense, readable data surfaces. Set the Supabase name as text. Use green for positive state, cyan for selected navigation, and a regular system font stack. Create geometric line icons locally with CSS or original inline vectors. Storage preview files may be original text, CSV, or local illustrations. Every visual needed at runtime ships with the site.

## Color

| Role | Color | Placement |
| --- | --- | --- |
| Utility bar | `#172D3D` | Top background with white text |
| Canvas | `#F4F2EC` | Page background |
| Surface | `#FFFEFA` | Lists, cards, dialogs |
| Primary ink | `#162B35` | Body text and headings |
| Secondary ink | `#4D6268` | Labels, metadata, secondary text |
| Border | `#CBD6D6` | Panels and row dividers |
| Control border | `#788C91` | Inputs and secondary controls |
| Primary action | `#086956` | Buttons with white text |
| Primary hover | `#075545` | Button hover |
| Selected and focus | `#16617C` | Text and focus outline |
| Selected surface | `#E3F2F7` | Tabs and selected rows |
| Success | `#17634D` on `#E3F3EA` | Enabled and active |
| Warning | `#794419` on `#FBEEDB` | Invited and restricted |
| Error | `#9E3038` on `#FCE8E8` | Invalid and destructive |

## Typography

| Role | Font | Size / line height | Weight |
| --- | --- | --- | --- |
| Wordmark | Segoe UI, system-ui, sans-serif | 22 / 28 px | 700 |
| Page title | Georgia, serif | 36 / 42 px | 700 |
| Section title | Segoe UI, system-ui, sans-serif | 20 / 26 px | 650 |
| Interface | Segoe UI, system-ui, sans-serif | 14 / 20 px | 400 |
| Metadata | Segoe UI, system-ui, sans-serif | 12 / 17 px | 500 |
| Identifiers and SQL | Consolas, ui-monospace, monospace | 13 / 19 px | 400 |

## Layout and interaction

- Use a 64 px utility bar with wordmark at left, project name beside it, and operator initials and name at right. Place Overview, Tables, Authentication, Storage, and Policies in a 48 px horizontal navigation band below it. Use an underline and background tint to signal the current section.
- Center the workspace to a 1440 px maximum width with 32 px desktop gutters. Use 24 px section spacing and 16 px gaps between related controls. Stack overview cards at narrow widths and keep navigation horizontally scrollable.
- Use a 260 px master list and a flexible detail area for Tables and Storage at widths above 960 px. Below that, stack the lists and details. Let dense data grids scroll inside their own containers and preserve visible labels and actions.
- Place the page title, any essential context, and the primary action above the data surface. Align search, filters, and an item count in the list toolbar. Use 42 px header rows and at least 44 px body rows. Apply a subtle tint on hover and use an explicit checkbox for bulk selection where supported.
- Use 38 px or taller labeled controls, 8 px control radii, and 12 px panel radii. Let text wrap where it clarifies a record and use monospaced type for paths and expressions. Keep field errors near their inputs and communicate statuses with text as well as color.
- Use a right-side editor at desktop widths, up to 480 px, with a full-width layout on narrow screens. Use centered confirmation dialogs up to 420 px. Use `0 12px 36px rgba(23,45,61,.16)` for overlays and `0 1px 2px rgba(23,45,61,.06)` for raised cards. Trap focus in dialogs, restore it on close, and use a 2 px visible focus outline.
