# SharePoint design system

## 1. Visual theme and atmosphere

Use a light workplace directory with a warm canvas, dark pine ink and a mint accent. Home pairs an asymmetric cream welcome panel with an original abstract motif of overlapping paper shapes. Site pages carry the same visual language through compact site banners. Use CSS shapes or commissioned-for-this-project local artwork for the decoration. Use typographic initials for people and original local icons for content types.

The account header pairs a text SharePoint wordmark with a wide search field and an account avatar displaying Morgan Ellis's initials. Put the global navigation on a slim warm rail beneath it. Keep the working views quieter than Home so users can scan real record names and table columns.

## 2. Color palette and roles

| Role | Value | Usage |
|---|---|---|
| Brand and primary action | `#12584E` | Wordmark, primary buttons, active links |
| Primary hover | `#0B443B` | Hover on filled buttons |
| Background | `#F6F5F0` | App canvas and navigation rail |
| Surface | `#FFFFFF` | Cards, tables and form panels |
| Hero panel | `#F0EDDE` | Home introduction and decorative backdrop |
| Ink | `#192B27` | Titles and body text |
| Secondary ink | `#4E625B` | Metadata and descriptions |
| Mint | `#E2F1E9` | Active navigation and selected rows |
| Border | `#D8E0D9` | Cards and dividers |
| Input border | `#697F75` | Input and select boundaries |
| Focus ring | `#276FBE` | Visible focus outlines |
| Success | `#24633F` | Completion and active states |
| Warning | `#80550B` | Duplicate or partial upload feedback |
| Error and destructive | `#A12D37` | Validation text and destructive actions |

## 3. Typography

| Role | Font | Size | Weight | Line height | Tracking |
|---|---|---|---|---|---|
| Wordmark | Segoe UI, system-ui, sans-serif | 21 px | 700 | 28 px | -0.3 px |
| Home title | Georgia, serif | 44 px | 400 | 50 px | -0.7 px |
| Page title | Segoe UI, system-ui, sans-serif | 32 px | 700 | 40 px | -0.4 px |
| Section title | Segoe UI, system-ui, sans-serif | 21 px | 650 | 28 px | normal |
| Body and controls | Segoe UI, system-ui, sans-serif | 14 px | 400–600 | 20 px | normal |
| Metadata | Segoe UI, system-ui, sans-serif | 12 px | 400–600 | 16 px | normal |

## 4. Spacing and layout

- Make the header 64 px tall and global rail 184 px wide on desktop. Use 32 px main padding, 24 px section spacing and 16 px card gaps. Cap the main column at 1440 px.
- Home uses a 208 px minimum-height hero, a three-column followed-sites grid and an adjacent Activity card only when there is content derived from existing records. The Sites directory uses a one-line filter toolbar with a consistent card grid.
- Site home begins with a site-type label, title, description and Follow action. Its Overview and Site contents navigation sits below the banner. Site contents groups lists and libraries with a common New menu.
- List and library pages use breadcrumbs above the title, a wrapping command bar, and a bordered table with 40 px header and 48 px rows. List item and preview panels use a 440 px maximum width and reserve 24 px for content padding. Folders reuse the library table and extend the breadcrumb.
- Below 900 px use a two-column card grid and collapse the rail into a labeled navigation control. Below 600 px use one card column, 16 px page padding, a separate search row and full-width panels. Allow tables to scroll horizontally while their toolbar remains usable.

## 5. Component patterns

- Buttons are 36–40 px high with an 8 px radius and 12–16 px inline padding. Primary buttons use white text on pine. Secondary buttons use a white surface with a border. Icon actions have an accessible name and an explicit focus ring.
- Inputs are at least 40 px high and have persistent labels. Errors appear next to the affected field. Forms keep the primary action and Cancel visible, restore focus on close and retain entered values after validation errors.
- Cards use a 14 px radius, 1 px border and 16–20 px padding. Use a single row-level menu for Edit, Rename, Move to and Delete where applicable. Expose selection clearly through a checkbox column and a count in the command bar.
- Use a side panel for item editing and file details. Use a centered dialog for short creation forms and delete confirmation. Scope modal keyboard focus, support Escape and restore focus to the invoking control.
- Empty states name the current collection and offer an action where the user can create content. Use status announcements for successful mutations and upload errors.

## 6. Shadow and elevation

Use no resting shadow on table surfaces. Use `0 2px 8px #192B270D` on hovered cards, `0 8px 24px #192B2726` on menus and panels, and `0 16px 48px #192B2733` on dialogs. Use a `#192B2759` backdrop behind modal dialogs.
