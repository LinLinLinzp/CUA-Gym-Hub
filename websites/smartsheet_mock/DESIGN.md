# Design System Inspired by Smartsheet

## 1. Visual Theme & Atmosphere

Use a horizontal navigation bar, warm canvas, and compact white work surfaces. Give the workspace directory a visible list of workspaces beside a sortable sheet table. Keep recognizable workflow labels such as Grid, Gantt, Forms, Automation, and Project Settings. Use a plain-text Smartsheet identifier in the header and document title.

The research references show a dense grid, a shared task timeline, and concrete field and workflow editors. The dimensions and tokens below define this implementation’s distinct visual system. Screenshots are research assets and stay outside the runtime bundle. [Visual reference inventory](assets/README.md#visual-references)

## 2. Color Palette & Roles

| CSS token | Value | Role |
| --- | --- | --- |
| `--brand` | `#14365E` | Smartsheet name, links on pale surfaces, informational labels |
| `--canvas` | `#F7F5EF` | Main workspace and form background |
| `--surface` | `#FFFFFF` | Navigation, table, fields, dialogs |
| `--surface-subtle` | `#F1F3EF` | Table header, timeline headers, inset controls |
| `--text` | `#172723` | Titles, body copy, cell values |
| `--text-muted` | `#53635E` | Metadata, group labels, placeholders |
| `--accent` | `#176450` | Primary actions, selected tab, Gantt completion fill |
| `--accent-hover` | `#104B3D` | Hover for primary actions |
| `--accent-soft` | `#DFEFE7` | Selection background and current-workspace indicator |
| `--border` | `#D9DFD8` | Panels, gridlines, header edges |
| `--field-border` | `#758781` | Unfocused inputs and keyboard-friendly resize handles |
| `--warning` | `#805008` on `#FFF2D7` | Pending approval, validation advisory |
| `--success` | `#1C6349` on `#E5F3EA` | Approved and completed |
| `--danger` | `#A22B31` on `#FBE6E7` | Declined, errors and destructive actions |
| `--focus` | `#2458C5` | Visible keyboard focus ring and selected cell border |
| `--gantt-bar` | `#90C5AD` | Scheduled task fill beneath completion overlay |
| `--gantt-line` | `#506B63` | Dependency connector strokes |

## 3. Typography Rules

Bundle Instrument Sans locally and use `system-ui, sans-serif` as fallback. Use tabular numbers for dates, position, and percentage values.

| Role | Size | Weight | Line height | Letter spacing |
| --- | --- | --- | --- | --- |
| Page title | 28px | 650 | 34px | −0.02em |
| Sheet or dialog title | 20px | 650 | 26px | −0.015em |
| Panel heading | 16px | 650 | 22px | 0 |
| Body and inputs | 14px | 400 | 21px | 0 |
| Table cell and control | 13px | 400–600 | 18px | 0 |
| Caption and status | 12px | 500 | 16px | 0.005em |

## 4. Spacing & Layout

- Use a 4px spacing unit. Top navigation is 56px high with 24px desktop horizontal padding and a bottom border. Group Home and Browse after the product name, put Search and Notifications on the right, and anchor Create at the far right.
- Home and Browse use 24px outer padding, a 20px column gap, and a 224px workspace directory beside the sheet table. Directory and table controls begin under a shared page title. At viewport widths below 960px, use a workspace dropdown and 16px outer padding.
- Sheet pages use a 60px title strip and 44px action row with Grid/Gantt on the left and Filter, Forms, Automation, and context actions on the right. Make inner table edges align at 16px from the viewport edge on desktop. Keep the project settings button in the Gantt toolbar.
- Sheet grid headers are 36px high and data rows are 32px high. Use a 48px row-number gutter and a 236px primary column, followed by 104–160px typed columns. The grid owns its horizontal scroll. Long cell values truncate with a full-value tooltip.
- In Gantt, use a 40:60 initial split with minimum widths of 320px and 360px at desktop size and an accessible divider. Both panes share the vertical scroll position. Give the timeline a 64px two-tier date header and align task bars to the same 32px row height as the grid. Use 12px bars, 10px diamonds, and a muted weekend shade. Label the Today marker and expose date and progress in task tooltips.
- Form builder uses a central 680px maximum-width response preview and a 300px properties panel on the right. Available fields open from Add field, with up/down buttons alongside field ordering. A public form uses a centered 600px-wide card with 24px padding. At narrow widths, place properties and content in a single column.
- Notifications use a two-pane list and detail view with a 320px inbox column. The workflow builder uses a centered 760px form with Trigger, Condition, and Request approval sections, a compact summary and a bottom Save/Cancel row.

## 5. Component Patterns

| Component | Specification |
| --- | --- |
| Buttons | Min-height 36px, 8px by 12px padding, 6px radius. Primary uses `--accent` and white text. Secondary uses a white background and `--field-border`. Icon-only controls have an accessible label and tooltip. |
| Inputs | Min-height 36px, 6px radius, 10px horizontal padding. Persistent label above the input and an inline error underneath. Use `aria-invalid` and connect the error via `aria-describedby`. |
| Tabs | Underline 2px in `--accent`, 12px horizontal padding, min-height 38px. Route and current selection are both discoverable by keyboard. |
| Panels and menus | White surface, 1px border, 8px radius. Use a 32px menu row minimum with 10px side padding. Escape closes menus and restores trigger focus. |
| Grid selection | 2px inset `--focus` outline with `--accent-soft` fill. A contextual editor fills the selected cell and errors keep focus near the invalid value. |
| Dialogs | 480px standard width, `min(480px, calc(100vw - 32px))`, 24px padding, 12px radius. Keep title and actions visible when internal content scrolls. Trap focus while open and restore it when closed. |
| Status | Compact 20px pill with text and a semantic tint. Precede unread approval rows with a dot and expose an unread label. Keep errors and schedule states distinguishable by text or shape. |
| Focus | `2px solid var(--focus)` with a 2px offset. Keep all required workflows operable via keyboard, including cell editing, form field arrangement, and schedule edits. |

## 6. Shadow & Elevation

Directory and grid surfaces rest on borders. Menus and floating editors use `0 6px 20px rgba(23, 39, 35, 0.13)`. Dialogs use `0 16px 48px rgba(23, 39, 35, 0.23)` over a `rgba(23, 39, 35, 0.35)` backdrop. Keep the grid sticky header below menus and dialogs.
