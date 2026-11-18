# SurveyMonkey workspace design

## Visual theme

Use a dark indigo workspace rail, a warm pearl canvas and sea-glass teal controls. The header and table should feel like a focused research workspace with a strong typographic hierarchy and enough room to scan a dense survey list. Set the wordmark in text as **SurveyMonkey**. Use original CSS drawings for the small document glyph and the aggregate cards' line, channel and response motifs. Draw results bars in CSS from the actual data. Keep fonts and art local.

## Color palette

| Token | Value | Role |
| --- | --- | --- |
| Rail | `#20233C` | Workspace rail and mobile menu |
| Rail text | `#F8F6F4` | Wordmark and primary rail labels |
| Rail muted | `#BFC2D8` | Workspace metadata |
| Rail active | `#3A405D` | Current navigation item |
| Canvas | `#F5F4F0` | Work area |
| Surface | `#FFFFFF` | Cards, tables, dialogs and question forms |
| Ink | `#20233C` | Titles and body |
| Muted ink | `#51566B` | Metadata and helper copy |
| Border | `#DEDFE6` | Card borders and row dividers |
| Control border | `#767C91` | Input and secondary button boundaries |
| Action | `#00685D` | Primary button and link text |
| Action hover | `#005349` | Primary button hover |
| Selected | `#DDF3EC` | Selected view, open status background |
| Closed | `#FFF0D8` / `#734407` | Closed status background / text |
| Draft | `#EBEDF4` / `#424960` | Draft and partial status background / text |
| Destructive | `#A42D43` | Destructive buttons, validation errors |
| Focus | `#126FAD` | Focus outline on light surfaces |

## Typography

| Role | Font | Size / line height | Weight | Tracking |
| --- | --- | --- | --- | --- |
| Wordmark | Segoe UI, system-ui, sans-serif | 22 / 28px | 750 | −0.7px |
| Page title | Georgia, serif | 40 / 46px | 700 | −1px |
| Section heading | Segoe UI, system-ui, sans-serif | 22 / 28px | 700 | −0.3px |
| Aggregate number | Segoe UI, system-ui, sans-serif | 31 / 36px | 700 | −0.8px |
| Body and controls | Segoe UI, system-ui, sans-serif | 14 / 21px | 400 or 600 | 0 |
| Labels and metadata | Segoe UI, system-ui, sans-serif | 12 / 17px | 500 or 600 | 0.1px |

## Spacing and layout

- Use a 224px rail, 64px context header and 32px work-area padding. Cap wide content at 1240px and center within the space available to the work area.
- Use a 4px base spacing scale. Set major section gaps at 24px, control gaps at 8px or 12px, and card padding at 20px.
- Use three equal columns for the library counts and allow the table to span the full work area. The survey row height is 58px minimum with 16px horizontal padding.
- Use a flexible main editor column plus a 256px question-type panel in Design, and a 640px maximum form width for participant entry. At widths under 900px, place the question-type panel above the editor. At widths under 760px, use a top header with reachable navigation, 16px gutters and a horizontally scrollable table region. Let filters wrap and stack aggregate cards below 520px.

## Components

- **Buttons and fields.** Use 40px minimum heights, 8px corners, 14px horizontal padding and exact action labels. Use a 2px focus outline with 2px offset. Rail focus uses pearl for contrast. Destructive confirmations give the safe action initial focus and return focus to the trigger on close.
- **Cards and tables.** Use a 12px radius and 1px border. Give hovered table rows a faint teal background and keep the main action a real link. Keep status text visible alongside any dot. Expose explicit labels on icon-only menu and reorder controls.
- **Tabs.** Use a 44px minimum target, a 3px teal underline and semibold text for the selected tab. Use matching active and focus styles when tabs are links.
- **Dialogs and detail panels.** Use a 480px maximum dialog width, 14px radius, 24px padding and a dark indigo scrim at 52% opacity. Use field-level error messages and tie them to their controls. Response detail has a 640px maximum reading width.
- **Analysis bars.** Use 8px-high rounded tracks, teal fills and text labels with counts. Keep the numbers readable with color disabled.

## Elevation

Keep tables and question cards flat. Use `0 6px 18px rgba(32, 35, 60, 0.12)` for menus and `0 20px 60px rgba(32, 35, 60, 0.22)` for dialogs.
