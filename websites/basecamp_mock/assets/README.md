# Basecamp product research

Basecamp puts tasks, decisions and dates in project-level tools. Home answers “where is this work?” and the project page answers “which tool holds it?” The seed names the historical Schedule workflow, so the public Basecamp 3 project and Schedule examples anchor the information architecture. The plan takes category filtering and pinning from later product documentation. The desktop rail and styling for this sandbox are specified in [DESIGN.md](../DESIGN.md). [Basecamp 3 product preview](https://signalvnoise.com/posts/3955-a-preview-of-whats-new-in-basecamp-3) · [Current feature overview](https://basecamp.com/features) · [Official walkthroughs](https://basecamp.com/learn)

## Personas and daily workflows

| Persona | Daily work |
| --- | --- |
| Project lead, Maya Chen | Open the project, create a checklist, assign tasks, post the release plan and schedule a walkthrough. |
| Team member, Jordan Patel | Find a dated assignment, add a comment, check it off and find the next review. |
| Stakeholder, Leila Brooks | Filter the Message Board to announcements, ask a follow-up and verify that a milestone moved. |
| Operations coordinator, Owen Reed | Check participant schedules, post a multi-day event and update the agenda after a reschedule. |

## Feature inventory

| Priority | Area | Interaction and data |
| --- | --- | --- |
| P0 | Home and project shell | Pre-signed-in identity, project directory and name filter, project membership display, tool previews, deep links and responsive navigation. |
| P0 | Harbor runtime | Baseline load, explicit user-action commits, SID isolation, JSON state endpoints, injected-world loading and built offline operation. |
| P1 | To-dos | Create and edit lists. Add, assign, date, move, reorder, complete, reopen, discuss, trash and restore a task. Browse open/completed items and filter by person, text and due state. |
| P1 | Message Board | Browse, search, filter by category and save shared sort. Compose, save a draft, reopen, publish, edit, pin and trash posts. Add, edit and trash replies. |
| P1 | Schedule | Step through months or jump to a day, read the agenda, filter dates/participants, see dated to-dos, create timed and all-day events, add participants, reschedule, trash and restore events. |
| P1 | Find and trash | Search across projects and recover directly trashed records from each project. |
| P2 | Repeating events | Create and edit a recurrence series. Calculate occurrence display locally. |
| P2 | My Assignments and shortcuts | View personal work across projects and access forms or Find via keyboard shortcuts. |

## Major views and behavior

### Home and project overview

Home's public desktop example shows a shared top bar, card rows below the workspace heading, project descriptions and member faces. The project screenshot shows a title, description and project people above tool summaries. Implement those content priorities with the planned project rail, clickable tool titles and record previews. Every business action can be reached from the project, given its corresponding state records. [Basecamp 3 home redesign](https://signalvnoise.com/svn3/a-bunch-of-big-updates-for-basecamp-3/) · [Basecamp project walkthrough](https://signalvnoise.com/svn3/the-tool-we-built-to-keep-everyone-in-the-loop-at-basecamp/)

### To-dos and task detail

Lists group work by project and show a completion ratio. The public list example shows the open work near a contextual add button, with completed rows below. The edit example uses labeled rows for assignees, completion recipients, dates and notes. A to-do detail should expose those fields together with completion and comments. Modern help confirms date ranges and list-level organization. The plan uses list-backed tasks and a simple Move control alongside drag reorder. [To-do completion recipients](https://signalvnoise.com/svn3/new-in-basecamp-3-decide-who-gets-notified-when-completing-a-to-do/) · [To-dos and lists](https://5.basecamp-help.com/article/1077-to-dos)

### Message Board, editor and detail

The reference board is a scrollable list pairing an avatar, title, byline, excerpt and reply count. The archived composer starts with a message-type row, then the title and formatting toolbar. Use full-page composition, selectable recipients and a private drafts list. Keep replies below the post. The original board sort feature applied to the whole project and offered newest, latest comment and alphabetical order. The current help also confirms filters and pinning. [Message types](https://signalvnoise.com/svn3/new-in-basecamp-3-message-types/) · [2018 board sorting](https://signalvnoise.com/svn3/new-in-basecamp-sort-the-message-board/) · [Message Board help](https://5.basecamp-help.com/article/1075-message-board)

### Schedule, event editor and detail

The older Schedule uses month navigation and date markers to drive a chronological agenda. It renders an event or dated assignment on each applicable day, with time and attendee data alongside the event. Public event screenshots show consistent date and time fields, people chips and a compact date badge on detail. The plan keeps month selection and agenda on the same route and derives due-date rows from active to-dos. Event editing keeps the event ID stable. [Basecamp 3 Schedule walkthrough](https://signalvnoise.com/svn3/new-in-basecamp-3-an-all-new-schedule-design/) · [Recurring event walkthrough](https://signalvnoise.com/svn3/new-in-basecamp-recurring-events/) · [Current calendar help](https://5.basecamp-help.com/article/1120-calendar)

### Desktop and narrow layouts

The archived iOS walkthrough shows native tabs and a compact project tools menu. The archived Android walkthrough shows quick-add actions for the same project tools. Preserve the same business flow on narrow web screens with the responsive layout in the design guide. Use native-feeling buttons, labeled menus and browser keyboard navigation. The current shortcut reference informs the optional shortcuts. [Basecamp 3 iOS walkthrough](https://signalvnoise.com/svn3/basecamp-3-for-ios-hybrid-architecture/) · [Basecamp 3 Android quick add](https://signalvnoise.com/svn3/only-on-android-add-basecamp-3-to-dos-events-messages-and-files-from-the-home-screen/) · [Basecamp app listing](https://apps.apple.com/us/app/basecamp-project-management/id1015603248) · [Shortcut reference](https://basecamp.com/keyboard)

## Screenshot index

These public images are for research. The implementation uses local UI components, its own layout and original seed content. The screenshots live outside the runtime asset directory.

| File | What it shows | Source |
| --- | --- | --- |
| [home.png](screenshots/home.png) | Horizontal navigation, warm workspace background, rows of project and team cards, compact member previews. | [Home screen launch](https://signalvnoise.com/svn3/a-bunch-of-big-updates-for-basecamp-3/) |
| [project-hub.png](screenshots/project-hub.png) | Project title and roster above white tool summary cards and recent activity. | [Project example](https://signalvnoise.com/svn3/the-tool-we-built-to-keep-everyone-in-the-loop-at-basecamp/) |
| [todo-list.png](screenshots/todo-list.png) | List name, progress ratio, checkbox rows, person labels and in-context creation. | [To-do list example](https://signalvnoise.com/svn3/the-tool-we-built-to-keep-everyone-in-the-loop-at-basecamp/) |
| [todo-editor.png](screenshots/todo-editor.png) | Editor rows for assignees, completion recipients, due date and notes, plus save and discard controls. | [To-do editor](https://signalvnoise.com/svn3/new-in-basecamp-3-decide-who-gets-notified-when-completing-a-to-do/) |
| [message-board.webp](screenshots/message-board.webp) | Desktop board before the 2022 visual refresh with row excerpts, comment-count badges, a create action and board controls. | [Before/after walkthrough](https://updates.37signals.com/post/design-refresh-multiple-tools-and-plenty-more) |
| [message-compose.png](screenshots/message-compose.png) | Category buttons above a large title field and toolbar. | [Message types](https://signalvnoise.com/svn3/new-in-basecamp-3-message-types/) |
| [message-detail.png](screenshots/message-detail.png) | Public shared-post example with subject, byline and formatted message body. | [Post reading view](https://signalvnoise.com/svn3/the-tool-we-built-to-keep-everyone-in-the-loop-at-basecamp/) |
| [schedule.png](screenshots/schedule.png) | Date markers above a grouped agenda, time labels, participants and contextual add action. | [Schedule redesign](https://signalvnoise.com/svn3/new-in-basecamp-3-an-all-new-schedule-design/) |
| [schedule-overview.png](screenshots/schedule-overview.png) | Schedule heading, primary event action and accent-color month grid. | [Schedule controls](https://signalvnoise.com/svn3/new-in-basecamp-recurring-events/) |
| [event-editor.png](screenshots/event-editor.png) | Cropped start/end controls, repeat settings and participant chips. | [Event editor](https://signalvnoise.com/svn3/new-in-basecamp-recurring-events/) |
| [event-detail.png](screenshots/event-detail.png) | Date tile, event name, author, time zone and recurrence label. | [Event detail](https://signalvnoise.com/svn3/new-in-basecamp-recurring-events/) |

## Data and scope

The app starts in Northstar Studio as Maya Chen. Fixed users and projects provide pickers and context. Lists and tasks, board settings and posts, schedule entries and comments are stored in the named collections. Each mutable record carries ID, creator, timestamps and references for Harbor verification. Counts, search results, calendar dates and agenda projections come from those records. Full shapes and fixture targets are in the [data model](data_model.md). [Basecamp API](https://github.com/basecamp/bc-api) · [To-dos](https://github.com/basecamp/bc-api/blob/master/sections/todos.md) · [Messages](https://github.com/basecamp/bc-api/blob/master/sections/messages.md) · [Schedule entries](https://github.com/basecamp/bc-api/blob/master/sections/schedule_entries.md)

The exercise begins inside an existing workspace. Authentication, billing, other project tools, external uploads and outbound delivery fall outside the seeded workflows. Recipient selections persist locally and can be checked in Harbor. Repeating events, if implemented, are computed from a saved rule during rendering.
