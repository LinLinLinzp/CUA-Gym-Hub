# Moodle account workspace

## Visual direction

Design an original instructor workspace with a dark plum navigation rail, a warm paper canvas, and a clear orange action color. Set **Moodle** as text in the rail using the heading typeface. Keep the account name and initials in the rail footer. Let real course names, counts and dates establish hierarchy across the dashboard.

Use a dedicated main content region with a compact breadcrumb header and a spacious page title row. Keep dense surfaces such as the gradebook and participant roster compact. Decorate course cards with locally authored CSS gradients and simple line patterns inspired by maps and ruled paper. Assign patterns from the course ID, and place all text on solid surfaces.

## Color tokens

| Token | Value | Use |
| --- | --- | --- |
| Brand | `#A64014` | Primary buttons, active links and focus on light surfaces |
| Brand hover | `#88320F` | Hovered primary actions |
| Brand tint | `#FCE8DE` | Active course tab, small accent backgrounds |
| Rail | `#2E2435` | Persistent navigation |
| Rail text | `#F9F4F6` | Brand and navigation text |
| Rail active | `#49364E` | Selected nav background and keyboard hover |
| Rail accent | `#FFAC82` | Selected nav indicator and focus ring |
| Canvas | `#F7F3EE` | Main page background |
| Surface | `#FFFFFF` | Forms, cards and table |
| Ink | `#262230` | Headings and body |
| Muted ink | `#625A67` | Metadata and help |
| Border | `#DFD7D2` | Structural separators |
| Field border | `#918591` | Input outlines |
| Success | `#21644F` on `#E3F3EC` | Submitted and saved |
| Attention | `#784906` on `#FFF1D6` | Needs grading and late |
| Error | `#9C2733` on `#FAE8EB` | Invalid inputs |
| Neutral | `#514857` on `#EFEBF0` | Draft, hidden and suspended |

## Typography

| Role | Stack | Size / line height | Weight | Tracking |
| --- | --- | --- | --- | --- |
| Brand | Georgia, serif | 28 / 34 px | 700 | -0.5 px |
| Page title | Georgia, serif | 38 / 44 px | 700 | -0.7 px |
| Section title | system-ui, sans-serif | 20 / 28 px | 650 | 0 |
| Body and labels | system-ui, sans-serif | 15 / 22 px | 400 / 600 | 0 |
| Table | system-ui, sans-serif | 14 / 20 px | 400 / 600 | 0 |
| Supporting text | system-ui, sans-serif | 13 / 18 px | 500 | 0 |

Use tabular numerals for scores and counts. Use sentence case for labels and status text.

## Layout and controls

- Desktop rail is 228 px wide and the workspace header is 64 px high. Main content has 32 px outer padding, a maximum width of 1440 px and 20 px gutters. Maintain a visible selected nav label and a 3 px indicator.
- Dashboard uses a two-column grid with the grading queue in the wider column and upcoming work in the narrower column. My courses uses a responsive three-column card grid with compact 70 px graphic bands. Keep titles, term dates, category, visibility and star actions in the card body.
- Course pages place tabs below the course title and its short code. Arrange section panels vertically with row links to assignment details. Settings and grading forms use a 720 px content measure. Participant, submission and grader reports use tables with scoped column headers. Keep the gradebook overflow inside the table region and freeze the name column.
- Below 1024 px, reduce main padding to 24 px and use two card columns. Below 720 px, put navigation in a labelled menu above the content, stack columns, wrap filters and use 16 px main padding. Keep core row actions usable through contained table scrolling.
- Primary buttons use white text on brand, 40 px minimum height, 16 px horizontal padding and 8 px radius. Secondary controls use ink on white with a field border. Give icon controls an accessible name and a 40 px target. Inputs use a 1 px field border, 42 px minimum height and an 8 px radius. Focus uses a 2 px ring and 2 px offset. Place validation text beside the associated input.
- Cards use a 1 px border, 12 px radius and white background. Menus and dialogs use semantic controls, clear titles, Escape dismissal and restored trigger focus. Keep grade editing targets labelled by learner and grade item.

## Elevation

Cards and tables use a flat surface with a border. Use `0 8px 24px rgba(46, 36, 53, 0.14)` for menus and `0 16px 48px rgba(46, 36, 53, 0.24)` for dialogs with a `rgba(46, 36, 53, 0.42)` backdrop. Use status text alongside color.
