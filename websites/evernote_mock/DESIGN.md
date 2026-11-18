# Evernote account workspace design

## Visual theme

Use an original editorial workbench with a deep pine horizontal masthead, warm paper surfaces and large serif collection headings. Notes are a full-width collection of readable cards. The editor opens in a right-side sheet with a paper-like writing surface. Notebooks use a directory grid, while Tasks uses a compact list with dates and priority aligned in columns.

Set the plain text **Evernote** in the masthead and use the account holder's initials in a circular avatar. Use CSS for the paper surfaces, colored notebook tabs and simple ornament-free empty-state illustrations. Draw any functional line icons locally using CSS or a bundled icon font. Give icons visible text labels when their action would otherwise be unclear.

## Color palette

| Role | Value | Usage |
| --- | --- | --- |
| Masthead | `#12372D` | Top command bar |
| Masthead text | `#F7FBF5` | Brand, search, profile |
| Workspace | `#F6F3EB` | Page background |
| Paper | `#FFFEFA` | Cards, editor, dialogs |
| Ink | `#202A24` | Headings and body |
| Secondary ink | `#536057` | Dates, labels, descriptions |
| Border | `#DDDCD0` | Card edges and dividers |
| Interactive green | `#176442` | Primary button and links |
| Interactive hover | `#104C33` | Pressable green hover |
| Selected | `#DEEBDF` | Selected tabs and controls |
| Focus | `#087654` | Keyboard outline on light surfaces |
| Amber | `#805119` on `#F6E8CE` | Flagged tasks |
| Overdue and destructive | `#9B302D` on `#F9E8E5` | Overdue dates and destructive actions |
| Completed and saved | `#275D46` on `#E7F0E7` | Completion and saved feedback |

Use text, symbols and labels with status colors. Use a light focus ring on the masthead.

## Typography

Use Georgia or Cambria for display headings. Use Segoe UI or the system sans-serif stack for controls, metadata and body. Use tabular numerals for dates and counts.

| Role | Size | Weight | Line height | Tracking |
| --- | --- | --- | --- | --- |
| Masthead wordmark | 22px | 700 | 28px | -0.3px |
| Collection heading | 40px | 600 | 46px | -0.8px |
| Editor title | 32px | 600 | 38px | -0.5px |
| Note and notebook card title | 18px | 650 | 24px | 0 |
| Control and list row | 14px | 600 | 20px | 0 |
| Body | 15px | 400 | 23px | 0 |
| Metadata and chips | 12px | 500 | 16px | 0 |

## Layout

- Masthead is 68px tall, with 32px horizontal padding, 24px left-group gap, a centered search field up to 440px wide and account identity aligned right.
- Section navigation is 52px tall. Place Notes, Notebooks, Tasks and Trash in the left group. Place New note and the section's creation actions in the right group. Indicate the current section with an underline and `aria-current`.
- Collections use a maximum width of 1336px, 32px side padding and 32px top padding. The title, item count and relevant controls share the collection header. Use spacing increments of 4, 8, 12, 16, 24 and 32px.
- At desktop width use three note columns with 16px gaps. Each card has 18px padding and 144px minimum height. Show the notebook name and last edit above the title, then up to two lines of excerpt and tags. Keep the card's primary link and its actions as separate controls.
- Notebook tiles use the same grid, a 4px accent tab, name and note count. Tasks uses a single list whose rows are at least 52px tall with checkbox, task title, linked note, due date and actions.
- The right-side note sheet is up to 640px wide on desktop, with a sticky action header, a scrollable body and a 32px writing inset. The writing area uses a 68-character measure. List and editor have independent scrolling. Task detail may use the same sheet at 480px.
- Below 1080px use two columns. Below 720px use one column, 16px gutters, an accessible wrapped command area and full-width detail sheets. Stack task metadata beneath the title when space is tight. Verify menus and dialogs at both widths.

## Components

Primary buttons use a 40px minimum height, 8px radius, 14px horizontal padding, green fill and white text. Secondary buttons use paper, ink and a border. Icon controls have 40px hit areas and accessible names. Give the visible focus outline a 2px stroke and 2px offset.

Search fields and form inputs are 40px or taller, with 8px corners and 12px padding. Use visible labels in editors and dialogs. Keep selected filter chips removable and include a Clear filters control when filters are active.

Cards use paper, a 1px border and a 12px radius. On hover, darken the border. Use a 4px accent mark for selected or current objects where relevant. Wrap long titles and truncate card excerpts only. Display full title and body in detail.

Dialogs use paper, 14px corners, 24px padding and a 440px maximum width. The dialog identifies the object involved and gives destructive actions explicit labels. Focus the first meaningful field or the cancel option in a destructive dialog. Return focus on dismissal. Keep toast feedback brief and announce it through a polite live region.

## Elevation

| Surface | Shadow |
| --- | --- |
| Resting card | None |
| Hovered card | `0 2px 8px #202A2410` |
| Menu | `0 6px 20px #18282022` |
| Sheet | `-12px 0 36px #1828201F` |
| Dialog | `0 16px 48px #18282030` |
| Dialog backdrop | `#18282055` |
