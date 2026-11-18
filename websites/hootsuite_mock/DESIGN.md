# Hootsuite workspace design

The interface uses a pale sage canvas, cream working surfaces, and dark evergreen controls. A horizontal header keeps the three workspace destinations visible. The narrow date columns, aligned review rows, and stream boards share a modular grid, with white space around the controls and enough density to show several records on a laptop. The word `Hootsuite` is set as live text. Use plain network names or letter tiles for social profiles and initials for people.

## Color tokens

| Role | Value | Use |
| --- | --- | --- |
| Canvas | `#EDF2EB` | Main background |
| Surface | `#FFFEF9` | Header, panels, cards, forms |
| Subtle surface | `#F5F7F0` | Table headers, unselected calendar days, board hover |
| Text | `#192D26` | Headings, body text |
| Secondary text | `#4D655A` | Labels, dates, helper copy |
| Border | `#CAD7CD` | Panel and row dividers |
| Control outline | `#7B9184` | Form and outlined button boundaries |
| Primary | `#184B3A` | Primary buttons, active tabs, links |
| Primary hover | `#103B2C` | Filled button hover |
| Focus | `#005E60` | 2px keyboard focus ring with 2px offset |
| Accent | `#DBEAB8` | Selected dates and board highlights |
| Scheduled, approved | `#DCECE1` / `#235440` | Fill and text |
| Pending approval | `#FFF0CD` / `#694813` | Fill and text |
| Rejected, destructive | `#FCE4DD` / `#792E23` | Rejected status, inline errors, destructive confirmation |
| Draft, canceled | `#EEF0EC` / `#465950` | Fill and text |
| Published | `#E4EBF7` / `#344E77` | Fill and text |

## Type

| Role | Font | Size / line height | Weight | Tracking |
| --- | --- | --- | --- | --- |
| Wordmark | Georgia, serif | 22px / 26px | 700 | −0.4px |
| Page heading | Georgia, serif | 40px / 44px | 700 | −1px |
| Section title | System UI, Segoe UI, sans-serif | 18px / 26px | 650 | 0 |
| Body and controls | System UI, Segoe UI, sans-serif | 14px / 21px | 400 or 600 for control labels | 0 |
| Metadata | System UI, Segoe UI, sans-serif | 12px / 18px | 500 | 0 |

Apply tabular numerals to schedule times and date labels. Use sentence case in controls and status labels.

## Shell and layout

- Use a 68px horizontal header with 32px inline padding. Place the text wordmark and workspace name on the left, Planner, Approvals, and Streams together near the center, then New post and the signed-in initials at the right. Give the active link a pale green background and a visible focus state. Wrap the navigation into a second row as space tightens.
- Center the working area with a 1520px max width and 32px gutters. Use a 4px spacing unit, 12px interior panel padding, 16px gaps between panels, and 24px between title, toolbar, and content. Scale outer padding to 16px below 768px.
- Planner opens with the heading and view switch on one row, then date navigation and filters. Place seven equal columns on a shared cream panel. Draw thin vertical dividers, use a narrow green edge and textual status on each post card, and give today's date a pale lime fill. Each card shows time, caption excerpt, and the social network or profile count. Give the grid an 840px minimum width inside its own horizontal scroll area. List view uses stacked rows with Date, Post, Profiles, and Status headers.
- Approvals uses a 40px-high tab strip above a 58:42 split queue and detail on wide screens. Show caption, requester or reviewer, date, and status in each row. Keep the opened post details in a separate adjacent cream panel. Stack queue and detail below 900px and bring the selected result into view. Place Approve and Reject beneath the preview with room for note fields and the resulting validation text.
- Streams has a 216px board index and a horizontally scrollable grid of 272px feed columns with 12px gaps. Keep board actions next to the selected board name and stream actions on the column header. Use small colored initials tiles, simple dividers, and natural caption lengths. At narrow widths put the board picker before the columns and keep scrolling inside the feed area.

## Components and local visuals

- Buttons are at least 40px high with 12px horizontal padding, a 6px radius, and visible keyboard focus. Use `#184B3A` with `#FFFFFF` for primary actions. Secondary buttons use the cream surface and a 1px control outline. Destructive actions use `#792E23` text, with the corresponding pale fill on hover.
- Inputs are at least 40px high with a 1px control outline and 6px radius. Place visible labels above all fields, with associated error copy directly below. Use text alongside color for statuses and validation.
- Content panels have a 1px border and 10px radius. Status pills use 4px vertical and 8px horizontal padding and a full radius. Reserve one accent per selected or focused region and let the canvas show around panels.
- The composer is a centered modal up to 800px wide with a form and preview columns, a 16px radius, and 24px padding. Stack the preview underneath the form on narrow screens. Use a footer row for draft, review, and schedule actions. Confirmation dialogs cap at 440px. Keep close buttons keyboard reachable, make Escape dismiss pending edits, and return focus to the control that opened the dialog.
- Create local visuals in CSS using the sage surface palette, profile letter tiles, and simple borders on cards and date cells. Small action icons can use locally authored CSS shapes and accessible text labels. Use system fonts throughout. The shell has no hero or decorative image slots.

## Elevation

Use borders for resting surfaces. Menus can use `0 8px 24px rgba(25, 45, 38, 0.14)` and modals `0 20px 64px rgba(25, 45, 38, 0.22)` above a `rgba(25, 45, 38, 0.34)` scrim.
