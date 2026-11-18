# Semrush workspace design

## Visual theme

A warm, light workspace with an ink-green masthead and vivid orange primary actions. Projects opens as a portfolio ledger with a focused heading, a compact portfolio summary and a full-width directory. Both reporting tools use the same frame and keep the current project, active target or crawl, and next action visible. The masthead spells out **Semrush** in text.

## Tokens

| Role | Value | Use |
| --- | --- | --- |
| Masthead | `#132E2A` | Top navigation and workspace identity |
| Brand action | `#FF7548` | Primary button fill with `#251811` text |
| Action hover | `#FF956F` | Primary button hover |
| Background | `#F5F4EE` | Workspace canvas |
| Surface | `#FFFFFF` | Tables, cards, dialogs |
| Accent surface | `#E1EFE8` | Selected controls and summary panels |
| Primary text | `#182A24` | Headings and body |
| Muted text | `#52635B` | Metadata and descriptions |
| Link and chart | `#155C4C` | Links, chart strokes and focus outlines on light surfaces |
| Secondary chart | `#A34C2C` | Comparison data series |
| Border | `#D6DED7` | Card and row boundaries |
| Success | `#18653E` on `#E3F3E9` | Positive changes and passing checks |
| Warning | `#754719` on `#FFF0D5` | Warnings and crawl status cues |
| Error | `#A52A31` on `#FCE9E9` | Errors and destructive action text |
| Notice | `#374E62` on `#E8EFF6` | Notices and neutral status text |

## Typography

| Role | Font | Size / line height | Weight | Tracking |
| --- | --- | --- | --- | --- |
| Brand | `Segoe UI`, system-ui, sans-serif | 22 / 28px | 750 | −0.45px |
| Page heading | Same | 36 / 42px | 700 | −1px |
| Section heading | Same | 20 / 26px | 650 | −0.3px |
| KPI value | Same, tabular numerals | 30 / 36px | 700 | −0.7px |
| Body and controls | Same | 14 / 20px | 400 / 600 | Normal |
| Caption | Same | 12 / 16px | 500 | 0.1px |

## Layout

- Full-width 64px masthead. Text brand at left, horizontal navigation for Projects, Position Tracking and Site Audit, and a text avatar plus the account name at right. Use a 3px accent rule on the active navigation item.
- Main content max width 1360px including horizontal gutters. Space 36px at desktop and 20px below 900px. Use 24px gaps between sections, 12px between related controls, and a 4px base spacing unit.
- Projects page starts with heading and Create project. Under the heading, a 3-column slim summary shows project count, tracked projects and audited projects. A 56px filter toolbar precedes the directory. Use 52px minimum row heights and 16px cell padding. Each tool metric leads directly to its report or setup. Place result count and pagination under the table.
- Project overview uses a breadcrumb, project name and domain, then two tool panels with the latest relevant metrics and direct actions. Tool report pages put report context and controls under the breadcrumb, followed by report tabs, metrics and the selected report. Put the audit severity summary above issue and page drilldowns.
- Below 760px wrap the masthead navigation into a second row, stack metric panels, and collapse controls into multiple rows. Allow wide tables to scroll inside their container and keep the primary action and key labels reachable.

## Components and original visuals

- Primary buttons use the action fill, 40px minimum height, 14px horizontal padding and 8px radius. Secondary buttons use the white surface and 1px border. Selected tabs and filters use the accent surface with a corresponding selected state.
- Inputs use a white surface, 1px border and 8px radius, with labels above the fields. Outline focus at 2px with 2px offset. Show precise validation near the relevant field and keep the entered value. Confirmations show the object name and put Cancel before the destructive action in tab order.
- Cards and table shells use a 12px radius, 1px border and `0 1px 2px rgb(19 46 42 / 5%)` shadow. Dialogs use a 16px radius, up to 560px width and `0 20px 60px rgb(19 46 42 / 22%)` shadow. Use a modal backdrop at `rgb(19 46 42 / 45%)`. Menus use `0 8px 24px rgb(19 46 42 / 14%)`.
- Render original visuals with local CSS. Use a site-health ring and labeled severity bars for audit metrics. Use a simple trend chart with a restrained grid and date labels for ranking history, drawn with local CSS or canvas. Label series and data summaries in text, including states with no data. Use initials for the account and simple local geometric markers. Packaged system fonts and generated charts keep the interface usable offline.
