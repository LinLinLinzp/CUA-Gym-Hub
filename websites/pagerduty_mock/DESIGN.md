# PagerDuty account design

## Visual theme

Use a dark forest sidebar beside a paper-white workspace, with a pale eucalyptus accent and restrained status colors. Let the incident title and current status carry the visual weight. The schedule view uses named coverage bands and the policy view uses a vertical sequence of editable levels. Shared margins and type make the three views feel like parts of the same workspace.

Render **PagerDuty** as plain text above **Acme Operations**. Use initials in circular responder avatars and CSS for timeline bands, rule connectors and status dots. Use locally drawn interface icons or local icon components. Every visual must render offline.

## Color palette

| Role | Token | Use |
| --- | --- | --- |
| Sidebar | `#142B2A` | Full-height navigation |
| Sidebar text | `#EDF5F0` | Wordmark and navigation text |
| Sidebar muted | `#ADC5BB` | Workspace and account context |
| Sidebar selection | `#25433F` | Active navigation background |
| Brand accent | `#BCEAC7` | Active navigation marker and profile avatar |
| Canvas | `#F5F7F3` | Workspace background |
| Surface | `#FFFFFF` | Forms, lists and details |
| Text | `#182D2B` | Headings and primary text |
| Muted | `#4E6260` | Metadata and secondary text |
| Border | `#D8E1D8` | Dividers and surface outlines |
| Control border | `#879C90` | Outlines of interactive fields |
| Primary | `#195642` | CTAs and inline links |
| Primary hover | `#124333` | Hover or pressed state |
| Focus | `#176AA3` | Visible 2 px keyboard outline with 2 px offset |
| Triggered | `#9F3431` on `#FCEFED` | Triggered status and destructive confirmation |
| Acknowledged | `#80530E` on `#FBF2DE` | Acknowledged status |
| Resolved | `#205C48` on `#E7F4EC` | Resolved status and success messages |
| Informational | `#315B79` on `#EAF2F8` | Callouts, override bands and selected value chips |

Use text labels with status colors and icons. Give consecutive schedule shifts distinct colors from pale mint, blue, gold and violet, with dark text and readable labels.

## Typography

Use `"Segoe UI", system-ui, sans-serif` and `ui-monospace, Consolas, monospace` for incident numbers and time values. Use tabular figures for dates, counts and durations.

| Role | Size | Weight | Line height | Tracking |
| --- | --- | --- | --- | --- |
| Wordmark | 22 px | 700 | 28 px | −0.4 px |
| Page title | 34 px | 700 | 42 px | −0.9 px |
| Section title | 19 px | 650 | 26 px | −0.2 px |
| Body and controls | 14 px | 400–600 | 21 px | normal |
| Table headings and metadata | 12 px | 500–650 | 18 px | normal |

## Layout

- Desktop sidebar 224 px wide, with 20 px side padding, 40 px navigation rows and 8 px gaps. Anchor the account identity at the bottom. The top workspace bar is 64 px high with a breadcrumb and any relevant timezone label.
- Main content uses 32 px horizontal padding and a 1440 px max width. Use a 24 px gap between regions and an 8 px spacing scale. Page title and primary action align on the same row when space permits.
- Surface corners are 12 px, control corners 8 px, status pills fully rounded. Tables have 44 px column headers and rows at least 56 px high.
- At 900 px and below, replace the sidebar with a compact header and an accessible navigation disclosure. Stack filters and action rows as needed. At narrow widths, present list metadata and schedules as readable cards or shift lists. Keep the page width within the viewport.

## View patterns

- **Incidents.** Place a compact status filter strip above a search-and-filter row, followed by one dense, bordered queue. Keep incident links prominent and show bulk controls only when rows are selected. Detail puts incident context and activity in the wider column, with assignment and notes in a narrower column. Stack these at small widths.
- **On-Call Schedules.** List schedule name, team, timezone, current responder and policy links. On detail, position week controls above the day grid. Give overrides their own lane and place effective coverage on the bottom lane. Restriction gaps remain visible and labeled in the shift list. In the editor, put the layer form above a timeline preview or alongside it on wide displays.
- **Escalation Policies.** Lay out ordered levels vertically. Indicate each rule's numeric position, show target chips with readable names, and label the timeout between rows. Offer explicit Move up and Move down actions in the editor. Surface linked services beside the rules on wide screens.
- **Forms.** Use visible field labels, a 40 px input height and inline error text adjacent to invalid fields. Keep Save and Cancel grouped at the end of the form. Use an accessible dialog for confirmation, with focus restored when it closes. Primary buttons are solid forest, secondary buttons have a border, and destructive confirmations use the triggered color pair.
- **Feedback.** Display empty and filtered-out states inside the affected surface, with a direct creation action or reset control when appropriate. Contrast table hover with `#F1F6F1`. Use status announcements for successful saves and keyboard-accessible controls throughout.

## Elevation

Use a 1 px border for list and detail surfaces. Dropdowns use `0 8px 24px #182D2B1F`. Confirmation dialogs use `0 18px 56px #182D2B33` over `#142B2A66`.
