# Design system for the Word workflow sandbox

## 1. Visual theme and atmosphere

Use a light document workspace with a strong blue action color, restrained borders, an uninterrupted white writing surface, and compact editing controls. The design takes functional cues from Word for the web’s page canvas, anchored feedback and review commands. Use an original library with a pale navigation rail and a separate action row in the editor. Place collaboration tools in a tabbed right panel and sharing in a right drawer. Reference screenshots inform density, visual hierarchy and control vocabulary. All artwork, previews and sample content used in the UI are original or locally licensed. See the [reference notes](assets/README.md#visual-references).

## 2. Color palette and roles

The values are implementation tokens. Microsoft’s screenshots informed the white paper, pale review area, muted inactive cards and saturated blue controls. Use the values below across the new component layouts.

| Role | Color | Use |
| --- | --- | --- |
| Brand action | `#185ABD` | Primary actions, active text and control highlights |
| Brand hover | `#134C9B` | Hover and pressed states for filled actions |
| Selection | `#E6F0FE` | Active rail entry, toolbar toggle or focused thread surface |
| Workspace | `#EDF2F6` | Editor canvas surrounding the document |
| Library background | `#F6F8FB` | Header, rail and editor panel background |
| Paper and surfaces | `#FFFFFF` | Editor page, rows, drawers, menus and selected comment cards |
| Inactive card | `#F0F3F7` | Unselected comments or collapsed thread previews |
| Main text | `#172B40` | Titles, labels and controls |
| Muted text | `#526378` | Metadata, status text and placeholders |
| Border | `#D2DCE8` | Dividers and passive control outlines |
| Form border | `#8294AA` | Text inputs and key interactive edges |
| Focus | `#205BAB` | Visible 2 px outer ring with 2 px offset |
| Success | `#176342` | Saved or confirmed actions |
| Warning | `#805300` | Access or selection warnings |
| Error | `#A12338` | Validation, destructive actions and default deletion markup |
| Insertion | `#245EA6` | Default insertion markup, with other accessible hues by author |
| Comment range | `#FFF0B8` | Text highlight when a thread is selected |

## 3. Typography

Use local system fonts for chrome and document content. Bundle fonts locally only if a chosen face requires distribution. Preserve readable fallback metrics.

| Role | Font | Size | Weight | Line height | Letter spacing |
| --- | --- | --- | --- | --- | --- |
| Library heading | `Segoe UI`, system-ui, sans-serif | 28 px | 650 | 36 px | -0.35 px |
| Section or drawer heading | same | 19 px | 650 | 26 px | -0.15 px |
| Document title control | same | 17 px | 600 | 24 px | 0 |
| Row title | same | 15 px | 600 | 22 px | 0 |
| Chrome, controls and comments | same | 14 px | 400–600 | 20 px | 0 |
| Metadata and status | same | 12 px | 400–600 | 16 px | 0 |
| Paper body | Aptos, Calibri, `Segoe UI`, sans-serif | 11 pt | 400 | 1.45 | 0 |
| Paper headings | same as paper | 24 / 18 / 14 pt | 650 / 650 / 600 | 1.25 | 0 |

## 4. Layout and spacing

| Area | Desktop dimensions and behavior |
| --- | --- |
| Library header | 56 px high; wordmark at left, width-capped document search centered in the remaining space, actor avatar at right |
| Library rail | 208 px wide, 16 px internal padding, 36 px navigation rows, 4 px row gaps |
| Library main | 32 px horizontal and top padding, maximum reading area 1200 px, `24 px` between main sections |
| Start cards | 124–164 px wide, 94 px minimum high, 12 px gaps and 10 px radius; show blank plus the first few template cards with overflow access |
| Library table | 44 px heading strip and 52 px minimum row height; stable title, owner, modified, favorite and overflow columns |
| Editor header | 52 px high with Back to documents, editable title and saved status grouped at left; mode, Comments, Share and profile at right |
| Editor command area | A 34 px tab strip and 44 px command row directly below; commands align left with 8 px group gaps; unsupported actions are omitted from the strip |
| Writing canvas | Scrollable with 24 px top/side padding. Paper centered up to 816 px wide at 100%, minimum page height 1056 px, 72 px desktop document inset. For a narrow canvas, allow fluid width and 28 px minimum inset |
| Document status bar | 30 px high, below the canvas, with word count and zoom space; keep it visible while scrolling |
| Collaboration panel | 344 px wide, scrolls independently, 16 px side padding, 12 px between cards, 28 px avatars |
| Share drawer | 420 px desktop width, inset from right by 12 px with 12 px corners, 24 px inner padding; keep actions visible and body scrollable |

Below 1100 px, collapse the library rail to 64 px and retain text in accessible labels. Below 900 px, dock collaboration as a dismissible overlay so the canvas retains writing space, shorten the editor title as needed, and put excess commands behind an overflow menu. Below 640 px, use compact text/icon controls, hide the secondary library columns, and allow the Share drawer and Comments panel to occupy the width. Keep key actions keyboard-accessible at every width.

## 5. Component patterns

- **Primary button** uses a 36 px minimum height, 8 px radius, 12 px horizontal padding and a white-on-blue label. Secondary buttons use a white fill and 1 px `#D2DCE8` border. Icon buttons have a 34 px square target, a visible focus indicator and a tooltip or accessible name.
- **Form controls** use 36 px minimum height with a 1 px `#8294AA` border, 6 px radius and 10 px inset. Put validation immediately below the relevant field. Recipient chips have 6 px radius, 8 px horizontal padding and a labeled removal control.
- **Menus** are anchored to the invoking control, use 8 px corners and 6 px inner padding, and contain 34 px rows. Position against the viewport edge when necessary. Escape closes the menu and returns focus.
- **Library rows** use white surfaces with a divider between rows. Keep the star and more button reachable by keyboard and show them consistently on touch. Active filters use a tinted background and a reinforced text label.
- **Document canvas** maintains a visible caret and native keyboard selection behavior. Group review controls by command, show a margin indicator with accessible label in Simple Markup and use underlines for insertions and strikethrough for deletions in All Markup. A change card includes the author, kind and decision controls. Use labels and shapes alongside color.
- **Comment cards** align author and time above the comment body. Show a 2 px blue edge and white surface on selection, with muted backgrounds for inactive cards. Use an active range highlight when in focus. Replies have a 12 px inset with separators between replies. Offer Post and Cancel below the composer. Show resolved and detached states with text.
- **Share and Manage access** use the same drawer structure, with current-step title and dismiss button at top, a content area, and distinct action area. Recipient list, role menu, optional message and primary Send appear in that order on the invite step. Manage access groups People and Links, with permission labels and labeled per-row action menus. Display confirmation beside its action and use text for success and revocation states.

## 6. Shadow and elevation

| Element | Shadow |
| --- | --- |
| Paper | `0 1px 4px rgba(22, 42, 67, 0.13)` |
| Selected comment card | `0 1px 4px rgba(22, 42, 67, 0.10)` |
| Overflow menu | `0 4px 12px rgba(22, 42, 67, 0.16)` |
| Share drawer or popup collaboration panel | `0 12px 32px rgba(22, 42, 67, 0.21)` |
| Drawer overlay | `rgba(23, 43, 64, 0.22)` scoped to the app viewport |
