# Basecamp interface design

## 1. Visual theme and atmosphere

Use the project-centered workflow shown in the archived Basecamp references. Give the workspace a distinct visual identity with a dark pine header, a permanent desktop project rail and a warm canvas. Present the project name and tool links consistently. The quieter white work surfaces make task rows, message subjects and event times easy to scan.

The public screenshots show warm neutral grounds, white work surfaces, green action/checkbox cues, and blue or violet Schedule accents. Samples from the reference files include `#F5EFE6` on the project hub, `#3CB371` in the composer and `#6F61A8` on the Schedule toolbar. Use the implementation palette below for contrast and visual distinction. [Basecamp project hub](https://signalvnoise.com/svn3/the-tool-we-built-to-keep-everyone-in-the-loop-at-basecamp/) · [Message types](https://signalvnoise.com/svn3/new-in-basecamp-3-message-types/) · [Recurring events](https://signalvnoise.com/svn3/new-in-basecamp-recurring-events/)

## 2. Color palette and roles

| Role | Token | Use |
| --- | --- | --- |
| Header | `#18362E` | 64 px top bar, white Basecamp wordmark and navigation |
| Header hover | `#284B40` | Navigation hover and pressed states |
| Canvas | `#F5F2EA` | Main page background |
| Project rail | `#EEEFE5` | Desktop project navigation |
| Surface | `#FFFFFF` | Project cards, list sections, composer, calendar and menus |
| Text | `#202D29` | Titles, reading text and labels |
| Muted text | `#54635C` | Bylines, metadata, help text and placeholders |
| Border | `#D6DDD4` | Card borders, grid and row dividers |
| Control border | `#77847B` | Interactive field boundaries |
| Primary | `#25664E` | Primary action fill, checked tasks and progress |
| Primary hover | `#1B513F` | Primary action hover |
| Active surface | `#E0F0E7` | Selected rail links, tool and people chips |
| Link | `#224F83` | Inline links and record titles when link emphasis is needed |
| Schedule | `#574789` | Calendar selection and event symbols |
| Schedule surface | `#EEE9FA` | Selected dates, agenda labels and calendar toolbar |
| Focus | `#2459A4` | Visible focus ring on light surfaces. Use `#D4EBFC` on the dark header. |
| Success | `#25664E` | Saved feedback and completed tasks |
| Warning | `#80500F` on `#FFF2D6` | Overdue status with label |
| Error | `#A02D34` on `#FDECEF` | Inline validation and destructive action text |

Use labels or icons alongside color for selected dates, validation and completion.

## 3. Typography

Use the offline system sans stack `system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`. Keep letter spacing normal except for the largest headings. Use tabular numerals for dates, times and counts.

| Role | Size | Weight | Line height | Tracking |
| --- | --- | --- | --- | --- |
| Page title | 30 px | 700 | 36 px | −0.02em |
| Tool section title | 21 px | 700 | 28 px | −0.01em |
| Card/record title | 16 px | 650 | 22 px | Normal |
| Body and inputs | 15 px | 400 | 22 px | Normal |
| Long post body | 16 px | 400 | 26 px | Normal |
| Buttons and labels | 14 px | 650 | 20 px | Normal |
| Small metadata | 13 px | 400 | 18 px | Normal |

## 4. Spacing and layout

- At 1024 px and wider, use the shared 64 px full-width header. Project screens have a 220 px rail, a 32 px content gutter and a fluid work area with a 1120 px maximum. Home uses the full main canvas without the project rail. Header links start beside the wordmark and the current person sits at the right.
- Home uses a three-column project grid above 1100 px and two columns from 680 px. Project overview renders To-dos and Message Board in the first row, with a full-width Schedule preview beneath. Cards have 18 px padding, a 12 px radius and a 16 px gap. Card titles and preview links have explicit focus states.
- Tool pages use a left-aligned breadcrumb above the page title. Keep the create action beside the title at desktop widths and directly below it on narrow screens. Tool cards are fluid. Detail, drafts and full-page editors are limited to 760 px for reading and editing.
- Schedule uses a 300 px month selector beside the agenda in one work area. Below 850 px of work area they stack with the calendar first. Use a seven-column calendar, date cells at least 36 px high and compact count indicators. Show agenda day labels above each group and reserve a 96 px time column on wide screens.
- Below 1024 px collapse project navigation into a labeled top row beneath the 64 px header. Below 680 px use a single column, 16 px side gutters, wrapping controls and at least 44 px tap targets for major actions. Keep title, relevant back link and primary action visible without horizontal scrolling.
- Use a 4 px spacing scale with 8 px between related controls, 12 px between rows, 16 px for section interiors, 24 px between sections and 32 px around major page groups. Use 8 px field and action radii, 12 px card and panel radii, and pill shapes for people/category chips.

## 5. Component patterns

- **Primary and secondary actions.** Use inline-flex controls with 8 px icon gap, 36 px minimum height and 8 × 14 px padding on desktop. Primary uses green with white text. Secondary uses white with a control border and dark text. For keyboard focus use `outline: 2px solid var(--focus); outline-offset: 2px`. Confirm destructive actions in a focused dialog with the item title.
- **To-do lists.** Use one bordered surface per list, with title and a progress ratio or thin 4 px bar. Every task has a 20 px checkbox in a 32 px target, title link, assignee/date metadata and an options button. Completed rows retain their label and use a visible check and muted treatment. Inline creation uses the section's pale accent, left-aligned inputs and explicit save/cancel.
- **Message Board.** Use an accessible list of rows with a 32 px local initials avatar, subject and excerpt, a byline and count at the right. The name and excerpt wrap before the count drops to its own line on narrow screens. Pin and category labels communicate state. In detail, put the byline below the subject, body and thread in reading order and the comment composer at the end.
- **Rich text and roster.** Inputs use 40 px minimum height and 10 × 12 px padding. Place labels above inputs in full-page forms. Rich text adds a toolbar and at least 160 px of writing space. People pickers show name options and removable chips. Use local initials and a stable color from `people`. Indicate errors under the field and leave the entered values visible.
- **Schedule.** Separate the calendar toolbar from the agenda with a border. Use a violet selected day with white text and a dot plus an accessible count where work is scheduled. Agenda shows event title, time or All day, and participant initials when present. Add a labeled icon to distinguish dated to-dos. The event form groups starts and ends and hides time inputs when All day is checked.
- **Menus and dialogs.** Menus are white, at least 180 px wide, with 36 px row targets and an accessible name attached to every menu trigger. Escape dismisses menus and dialogs and returns focus. Dialogs have 24 px padding and a 460 px max width. Center the dialog at desktop widths and inset it 16 px on narrow screens.

## 6. Shadow and elevation

| Surface | CSS shadow |
| --- | --- |
| Resting card | `0 1px 2px rgb(32 45 41 / 6%)` |
| Card hover | `0 4px 12px rgb(32 45 41 / 10%)` |
| Menu / picker | `0 8px 20px rgb(32 45 41 / 16%)` |
| Dialog | `0 16px 40px rgb(32 45 41 / 24%)` with `rgb(24 54 46 / 30%)` backdrop |
