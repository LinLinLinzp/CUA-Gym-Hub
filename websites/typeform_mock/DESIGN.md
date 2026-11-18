# Typeform account design

## 1. Visual theme

Use a warm cream account surface, a deep ink navigation rail, and saturated blue controls. Pair serif page titles with compact operational typography. Use an original CSS pattern of offset squares and quarter circles on empty-state and preview surfaces, drawn locally with gradients and rounded boxes. Render Typeform as plain text in the header.

## 2. Color palette

| Role | Value | Use |
| --- | --- | --- |
| Account background | `#F7F4ED` | Main canvas |
| Navigation | `#20283C` | Workspace rail |
| Navigation selected | `#394460` | Current workspace |
| Rail text | `#F7F4ED` | Workspace names and wordmark |
| Surface | `#FFFEFA` | Tables, panels, menus |
| Ink | `#222B3B` | Headings and body |
| Muted | `#535D70` | Dates, captions, placeholder text |
| Border | `#DAD7CE` | Table and panel separators |
| Control border | `#858B96` | Form fields |
| Primary | `#234DB5` | Primary actions, links, selection |
| Primary hover | `#193A93` | Hover on primary actions |
| Focus | `#2657D5` | Outer focus ring |
| Accent | `#F5CB71` | Illustration detail, selected rail marker |
| Success | `#176048` on `#E4F4EC` | Published |
| Warning | `#755000` on `#FDF0CD` | Draft changes |
| Danger | `#A32836` on `#FBE8E9` | Delete actions and errors |

## 3. Typography

| Role | System face | Size / line height | Weight | Tracking |
| --- | --- | --- | --- | --- |
| Typeform text | Segoe UI, system-ui, sans-serif | 21 / 26 px | 700 | -0.4 px |
| Main title | Georgia, serif | 42 / 48 px | 400 | -1 px |
| Section title | Segoe UI, system-ui, sans-serif | 20 / 28 px | 650 | -0.2 px |
| Body, controls | Segoe UI, system-ui, sans-serif | 14 / 20 px | 400–600 | normal |
| Metadata | Segoe UI, system-ui, sans-serif | 12 / 17 px | 500 | normal |

## 4. Layout

- Use a 224 px desktop workspace rail and a 64 px top bar. Apply 36 px horizontal padding to the content and cap the main content at 1320 px. Use an 8 px spacing base, 24 px between regions, and 12 px panel radii.
- Workspace landing uses a heading and create action above a unified search and filter toolbar and a flat table. Give each row 56 px minimum height, status text, and a labeled action button.
- Form header stacks the workspace breadcrumb, form title and status, then Build, Logic, and Responses tabs. Build splits into a 250 px question list and a flexible edit area, with preview as a separate route. Logic uses an ordered question index and rule cards with indented conditions and distinctly labeled fallback. Results places the response table under a filter bar, with a 400 px detail drawer.
- At narrow widths collapse the rail behind a labeled workspace toggle, stack editor and rule controls, and allow the response table to scroll horizontally within its panel. Fit the respondent card at 640 px maximum with 24 px viewport padding.

## 5. Component patterns

- Primary button uses a 40 px minimum height, 8 px corner radius, 16 px horizontal padding, white text, and the primary background. Secondary buttons use the surface and control border. Put visible text on high-impact actions.
- Inputs use 40 px minimum height, 8 px radius, and a 1 px control border. Show field errors adjacent to the input. Apply a 2 px outline with 2 px offset on keyboard focus.
- Use status pills with text and a tinted surface. Distinguish current navigation with text and an edge marker. Menus and dialogs support Escape, and dialog dismissal restores focus to the trigger.
- Use a centered dialog up to 480 px for confirmations. Place the action in its footer and name the affected form, question, or response count.

## 6. Elevation

- Tables and resting cards use a 1 px border with no shadow. Menus use `0 8px 28px #222B3B26`. Drawers and dialogs use `0 18px 60px #222B3B33` over a `#20283C66` scrim.
