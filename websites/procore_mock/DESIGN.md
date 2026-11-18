# Procore workspace design

## Visual theme

Use a warm limestone canvas, a dark blue-green navigation rail, and a burnt-orange action color. Keep the four project tools in the same visible positions on every desktop view. The overview uses a compact project introduction and four flat metric cards. Tool screens devote most of their space to records. Reserve the Procore name for a plain text wordmark and browser title.

## Color

| Token | Color | Use |
| --- | --- | --- |
| Canvas | `#F5F3EE` | Workspace background |
| Rail | `#122C2E` | Primary navigation background |
| Rail foreground | `#F4F8F7` | Rail links and text wordmark |
| Rail selection | `#254446` | Active tool with a 3 px `#FF974F` edge |
| Ink | `#182625` | Main text and strong headings |
| Muted | `#4F6260` | Secondary text and metadata |
| Paper | `#FFFFFF` | Cards, controls, tables, and drawers |
| Separator | `#E0E4DF` | Dividers and card outlines |
| Control outline | `#919F99` | Input and secondary button boundaries |
| Primary | `#A73A14` | Primary actions with white text |
| Primary hover | `#872D0F` | Hovered primary action |
| Link and focus | `#00616A` | Text links and focus rings on light surfaces |
| Success | `#205943` on `#E5F2EA` | Approved, complete, closed |
| Pending | `#62480C` on `#FFF0CD` | Open, review, approval |
| Error | `#8C2639` on `#FBE7EB` | Rejected and inline errors |
| Neutral | `#415450` on `#EAF0ED` | Draft and inactive records |

## Type

| Role | Family | Size / line height | Weight | Letter spacing |
| --- | --- | --- | --- | --- |
| Wordmark | Segoe UI, system-ui, sans-serif | 23 / 28 px | 750 | -0.6 px |
| Page title | Georgia, serif | 36 / 42 px | 700 | -0.7 px |
| Section title | Segoe UI, system-ui, sans-serif | 17 / 24 px | 650 | 0 |
| Body and controls | Segoe UI, system-ui, sans-serif | 14 / 21 px | 400–650 | 0 |
| Table headers and labels | Segoe UI, system-ui, sans-serif | 13 / 19 px | 650 | 0 |
| Secondary metadata | Segoe UI, system-ui, sans-serif | 12 / 17 px | 500 | 0 |

Use tabular numerals for dates, quantities, and costs. Right-align comparable monetary and quantity columns.

## Layout

- Desktop has a 224 px rail, a 64 px utility bar, and a main column with 32 px padding and a 1,440 px content maximum. Put project navigation above the four tool links. A simple account label and initials sit in the top bar.
- The project overview starts with the project name, number, and city, followed by four linked tool cards with one count and a corresponding state label per card. Give cards a 16 px gap and 20 px internal padding.
- Tool headers put the tool name above the list, with Create on the right. The toolbar puts search and filters above the table, with the count beside them or below when space wraps.
- Record detail uses a wide content column and a roughly 300 px summary column. Place state-changing actions beside the record title and show status near the title. For Daily Log, place the date controls and completion action above the four entry sections.
- At 960 px and below, switch the rail to a labeled menu opened from the utility bar and wrap tool controls. Below 700 px, stack summary columns and use a horizontally scrollable table with the record title among the first columns.

## Components and local artwork

- Use 8 px radii on controls and cards. Primary and secondary buttons are at least 40 px tall with 14 px horizontal padding. Primary uses a solid burnt-orange fill. Secondary uses a white surface and the control outline.
- Use 40 px inputs with external labels, explicit error text, and a 2 px focus outline with a 2 px offset. Use a light outline on the dark rail. Status chips always include visible text.
- Use 46 px table rows as a baseline with a 1 px divider and generous wrapping for long titles. Give sortable headings an announced sort direction. Drawers can be 520 px wide with a sticky action footer. Use a centered confirmation dialog about 400 px wide for destructive actions.
- Keep the overview visual local and original. Use CSS linework based on a structural plan grid with an inset rectangle and two dashed guide lines. Place it at the far right of the project introduction, behind no information, and hide it when the introduction narrows. Use simple CSS initials circles for people and native controls for date and file inputs.
- Keep cards flat with a 1 px border. Use `0 8px 24px rgb(18 44 46 / 14%)` for floating menus and `0 20px 48px rgb(18 44 46 / 20%)` for dialogs.
