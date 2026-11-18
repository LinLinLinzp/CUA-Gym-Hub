# Snowflake account console design

## Visual theme

Use a blue-black horizontal account bar above a warm paper canvas. Page titles and headings are left aligned with ample space around dense tables. Blue is reserved for navigation, focus, and primary actions. Use compact monochrome icons made locally with CSS or custom SVG and always pair uncommon actions with text. The logo and browser title use the word Snowflake in text.

## Color

| Token | Value | Use |
| --- | --- | --- |
| Account bar | `#152738` | Global navigation and account context |
| On account bar | `#F6FAFD` | Account bar text |
| Selected navigation | `#66D1ED` | Active underline and focus outline on the dark bar |
| Canvas | `#F7F6F2` | Overall page background |
| Surface | `#FFFFFF` | Tables, cards, dialogs, and result panes |
| Subtle surface | `#F1F5F7` | Table headers, SQL toolbar, and hover rows |
| Ink | `#14283C` | Body, headings, and identifiers |
| Muted | `#526477` | Secondary text and metadata |
| Divider | `#D9E1E7` | Row and section boundaries |
| Control border | `#8395A5` | Outlines for inputs and secondary controls |
| Action blue | `#155AA3` | Primary button, links, and focus on light surfaces |
| Action hover | `#104985` | Primary hover and active states |
| Success | `#176348` on `#E8F5ED` | Started, successful runs, and active grants |
| Neutral status | `#465970` on `#EAF0F5` | Suspended and system role |
| Warning | `#7B5206` on `#FFF1D6` | Pending edits and missing context |
| Error | `#982C29` on `#FDEBE8` | Failed runs, field errors, and destructive actions |

## Typography

| Role | Font | Size / leading | Weight | Tracking |
| --- | --- | --- | --- | --- |
| Wordmark | Segoe UI, system-ui, sans-serif | 21px / 26px | 700 | −0.4px |
| Page title | Georgia, serif | 36px / 42px | 400 | −0.8px |
| Section title | Segoe UI, system-ui, sans-serif | 19px / 26px | 650 | 0 |
| Navigation, body, controls | Segoe UI, system-ui, sans-serif | 14px / 20px | 400–600 | 0 |
| Column header, caption | Segoe UI, system-ui, sans-serif | 12px / 17px | 600 | 0.1px |
| SQL, identifiers, counts | Consolas, monospace | 13px / 20px | 400 | 0 |

## Spacing and layout

- At desktop widths, the top account bar is 64px high. Its inner grid and the content container share a 1440px maximum width and 40px horizontal padding. Wordmark and nav are on the left, account and user context on the right.
- Use 32px between the account bar and the page title and 24px between toolbars, cards, and data. A desktop detail page uses a flexible main column and a 304px side panel. Surface panels use 20px padding, a 1px divider, and 12px radius.
- The overview uses a three-column row of linked metric cards. Lists use full-width tables with 38px headers, 46px minimum rows, 16px horizontal cell padding, and tabular numerals. Primary create actions sit beside the title. Search and filters appear above the list with room to wrap.
- The worksheet has a compact context toolbar, a main editor with at least 260px height, and a results pane underneath with visible Results and Recent runs tabs. Keep the Run button on the same toolbar row as Save when space permits. Give the editor and wide result tables their own scroll containers.
- Below 900px, reduce padding to 24px and stack detail panels below the main content. Below 640px, use 16px padding, a second row for horizontal navigation, and a single-column overview. Let wide tables scroll within their panel while keeping the main action visible.

## Components and elevation

- Buttons use a 36px minimum height, `0 14px` padding, 8px radius, and 600 weight. Primary buttons use action blue with white text. Secondary buttons use white with a control border. Destructive confirmations use error red with white text.
- Inputs and selects use a 38px minimum height, 8px radius, and 1px control border. Pair controls with visible labels and place errors next to fields. Add a 2px focus ring with a 2px offset. Keep status text visible inside compact rounded pills.
- The dialog centers at up to 520px wide with 24px padding, 16px radius, and `rgba(21,39,56,.40)` scrim. Return focus to the invoking control after closing. Keep dialog contents scrollable at short viewport heights.
- Cards and tables are flat. Use `0 8px 24px rgba(21,39,56,.14)` on menus and `0 18px 54px rgba(21,39,56,.22)` on dialogs. Draw any decorative mark locally and omit decoration that competes with primary actions.
