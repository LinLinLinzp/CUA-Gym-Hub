# ClickUp — Research Summary (plan agent, 2026-11-18)

> Mock directory: `websites/clickup_mock` · Dev port **5384** · App key `clickup`
> Companion docs: `../DESIGN.md` (style guide) · `data_model.md` (entities & seed) · `../TODO.md` (dev checklist)
> Contract: `SEED.md` + `HARBOR_CONTRACT.md` override generic plan rules.

## 1. App overview

ClickUp (app.clickup.com) is an all-in-one work management platform for tasks, docs, sprints, time tracking, chat, goals and dashboards. Its hierarchy is:

**Workspace › Space › Folder › List › Task › Subtask (› nested subtask)**

- A Space defines the statuses (each with a type: open, custom, done, closed), tags and ClickApps.
- A Folder groups Lists. A **Sprint Folder** is a special folder that holds a **Backlog** list plus time-boxed sprint lists.
- Every location (Everything, Space, Folder, List, Sprint) can show the same tasks through **Views** (List, Board, Calendar, Gantt, Table, Workload...). Views can be grouped, sorted, filtered and column-configured.
- **Docs** are rich-text documents with nested pages. A Doc can be attached to any location, marked as a Wiki, shared and linked to tasks.
- **Time tracking** works through a global timer, manual entries and a time estimate field. It rolls up into the **Timesheets Hub** (My timesheet, All timesheets, Approvals).

Scenario per SEED: **组织办公 (office collaboration)**, tier A. Highest fidelity is required for the four SEED workflows: **tasks, docs, sprints, time tracking**.

## 2. Personas & primary workflows

| Persona | Default user? | Daily workflows |
|---|---|---|
| **Jordan Rivera** — Head of Product Engineering, Workspace Owner | ✅ pre-logged-in | Triage Inbox, check My Tasks (Today/Overdue), run Sprint 23 (review board, move tasks, complete sprint, plan Sprint 24 from Backlog), write sprint planning docs, track time on client work (Acme, Northwind), submit own timesheet, approve the team's timesheets |
| Engineers (Priya, Marcus, Diego, Sam) | seed actors | Move sprint tasks through statuses, set points, log time, comment |
| Marketing (Olivia, Noah, Aisha) | seed actors | Launch campaign lists, content calendar, briefs in Docs |
| Ops (Ben, Grace) | seed actors | Billable client work, onboarding wiki docs |

Agent-training tasks this sandbox must support (examples):
- "Create a task 'Draft Q1 OKRs' in Q4 Product Launch, assign Olivia, set priority High, due next Friday."
- "Move all urgent bugs to In Progress and assign them to Sam."
- "Add the 3 highest-priority Backlog tasks to Sprint 24 and give each 3 points."
- "Mark Sprint 23 as done and move unfinished tasks to Sprint 24."
- "Create a doc 'Sprint 24 Retro' in the Platform Sprints folder with pages 'What went well' and 'What to improve'."
- "Start a timer on 'Acme kickoff workshop', stop it, and mark it billable." / "Log 2h 30m yesterday on tsk_087 with tag Meeting."
- "Submit last week's timesheet." / "Approve Priya's timesheet; request changes on Diego's with comment ..."

## 3. Feature inventory (priority)

### Core shell (P0)
- Black icon rail with Home, Docs, Dashboards (P2) and Timesheets. **Only implemented items are shown.**
- Top bar with workspace switcher (static menu), global Search (⌘K command palette), running-timer pill, "+ New" quick create, notification bell and user avatar menu.
- Sidebar with Home section (Inbox+badge, Replies, Assigned Comments, My Tasks), Favorites, and a Spaces tree (Space › Folder › List / Sprint Folder › sprints + Backlog) with hover "…" and "+".
- Main panel with location header, view tabs and toolbar.
- Harbor state wiring (`loadState`/`saveState`, `stateApi` plugin, `/go` from middleware), port 5384.

### Tasks (P0/P1 — SEED workflow)
- List view grouped by status, with collapsible groups, inline "+ Add Task", inline cell editing (status, assignee, due date, priority, points, tags), subtask expand, row checkbox multi-select, bulk action bar, drag to reorder or change group.
- Board view: status columns, drag cards between columns to change status, "+ Add task" per column.
- Calendar view (P1-lite): month grid by due date, drag to reschedule (P2).
- Task modal / full page with breadcrumb, status pill + next-status arrow, assignees, dates, priority, sprint points, time estimate, track time, tags, custom fields, description, subtasks, checklists, relationships (linked docs, waiting on/blocking), attachments (local only, P2), and an Activity + Comments pane.
- Quick create: "+ Task" modal (name, list location, description, status, assignee, due, priority, tags).
- Task actions menu: copy link, duplicate, move, archive, delete (→ Trash), add to sprint, start timer.
- Group by / sort / filter / Me mode / show closed / search / columns (persisted per location in `viewSettings`).
- My Tasks (Today & Overdue, Next, Unscheduled, Done buckets), Everything view, Space overview.
- Inbox: notifications with Important/Other/Later/Cleared tabs, mark read, clear, open task. Replies and Assigned Comments views.

### Sprints (P0/P1 — SEED workflow)
- Sprint Folder overview at `/f/fd_sprints`: sprint cards (status, dates, points done/total, progress), Backlog link, "+ Create Sprints".
- Sprint list page: header "Sprint 23 (11/9 - 11/22) ▾", sprint status button (Not Started → Start Sprint / In Progress → Mark as Done), date chip, "Points: X/Y", forecast, view tabs Sprint List / Sprint Board / Report.
- Create Sprints modal (`sprint_create_modal.png`): choose start dates and how many sprints to create, generating names from the template.
- Add to sprint: Sprint column in Backlog and other lists, task view field, row "…" → Add to Sprint, and bulk "Sprints" action.
- Sprint Points field (1, 2, 3, 5, 8, 13 + custom) in list cells and the task view (`sprint_points_popover.png`).
- Start sprint (locks forecast = current total points). Complete sprint: "Mark Sprint as Done" dialog listing N unfinished tasks with "Move to: Sprint 24 / Backlog / Keep in sprint". Cannot be undone.
- Sprint report: burndown (points or tasks, guideline vs. actual), burnup, velocity across sprints 21–23, summary stats. All derived at render time from tasks/sprints, never stored.
- Sprint Folder settings modal (`sprint_automations_settings.png`): name template, duration, start day, measure of effort, automations (auto-create, auto-mark-done, move spillover).

### Docs (P1 — SEED workflow)
- Docs Hub `/docs`: tabs All / My Docs / Shared / Wikis / Archived, search, a "Recent / Favorites / Created by me" card row, and a table (Name, Location, Tags, Date updated, Date viewed, Sharing) with sort. "+ New Doc".
- Doc editor `/d/:docId/:pageId`: pages sidebar (tree, add page/subpage, drag reorder P2, rename, delete), cover + icon, title, contributors, "Last updated", and a block editor (Enter = new block, Backspace on empty = delete, "/" slash menu for heading/bullet/numbered/todo/quote/code/divider/callout/task link, todo checkbox toggle).
- Doc header: breadcrumb (location), ☆ favorite, Share modal (workspace/private/public link toggle, default permission, add members), "…" menu (Mark as Wiki, Rename, Move location, Duplicate, Archive, Delete, Export → toast only).
- Doc comments: per-page comment side panel, resolve.
- Link doc ↔ task (Relationships). The task view shows linked docs and the doc shows "Linked tasks".

### Time tracking (P1 — SEED workflow)
- Global timer: start from task view "Track time", list row "…" → Start timer, or the top-bar "Track time" modal. The running pill sits in the top bar, and stopping it creates a time entry.
- Manual entry popover (`time_tracking_manual_popover.jpg`) with Timer / Manual / Range tabs, duration parser ("2h 10m", "2:10:30", "2 hours 10 minutes", "90m", "1.5h"), date ("When"), task selector, note, tags and billable toggle.
- Task view time tracking: "Time tracked" field with total, a popover listing entries (edit duration/date/note/billable/tags, delete), and "Time estimate" with a progress bar.
- Timesheets Hub `/timesheets`:
  - **My timesheet**: week grid (`timesheet_week_grid.png`) with rows by task + location and day cells (click → type duration → creates/adjusts entry).
  - Day header totals vs. capacity bar; summary card (`timesheet_summary_billable.png`) with tracked/40h and a billable donut.
  - Week navigation and filters (Billable, Tag). Display toggle: Timesheet / Time entries (list by date).
  - Row "…" (Delete row, Add note). "+ Add task" row. "Submit for approval" button with status badge.
  - **All timesheets**: member filter, read-only grid per person.
  - **Approvals**: To review / Changes requested / Approved / All. Opening a submission (`timesheet_approval_entry.png`) shows its entries and lets the reviewer Approve or Request changes (with comment). The owner can Withdraw and Resubmit.

### Secondary (P2)
- Dashboards with a sprint widget and time-tracked widget (read-only derived).
- Gantt-lite, Workload — skip unless P1 is complete.
- Settings: profile prefs (theme light/dark toggle, start of week), ClickApps toggles (Sprint Points / Time Estimates visibility).
- Keyboard shortcuts: ⌘K search, `T` new task (in list), `L`/`B`/`C` view switch, `Esc` close modal, `S` status in task view.
- Trash page (restore / delete forever), Archived filter.
- Favorites (☆ toggle in headers) and the sidebar Favorites section.
- Task templates and recurring tasks: display-only.

## 4. UI layout per view (with screenshot references)

### Global frame — `home_sidebar_list_view_3.0.png`
Black rail at left (56px). Top bar with the workspace pill "Lumen Labs ▾" at left, search pill centred "Search ⌘K", and at right an optional timer pill, "+ New", bell and avatar. The sidebar (260px, `#FCFCFC`) holds:
- Workspace header.
- Inbox (pink badge), Replies, Assigned Comments, My Tasks.
- "Favorites" (collapsible).
- "Spaces" header with "+".
- Each Space row shows a coloured letter square and name; its children are Folders (folder icon) and Lists (list icon + task count). The Sprint Folder shows a ⚡ icon with sprint rows labelled e.g. "Sprint 23 (11/9 - 11/22)" (current sprint marked with a dot) and "Backlog".

The main panel is white with a 12px radius.

### List view — `home_sidebar_list_view_3.0.png`, `sprint_list_groupby.png`, `list_view_classic_light.jpg`
- Location header: "📁 Platform › API & Integrations ☆ …" on the left; "Share" and avatars on the right.
- View tabs "☰ List | ⊞ Board | 📅 Calendar | + View".
- Toolbar:
  - Left: chips "Group: Status", "Subtasks", "Columns".
  - Right: "Filter", "Me mode" (avatar toggle), "Assignee", "Closed" toggle, a search input (expands) and the "+ Task ▾" dark button.
- Groups: collapsible caret + status pill "IN PROGRESS" + count + "…" + "+ Add Task". The table header row (Name, Assignee, Due date, Priority, …, "+") sits under the group pill.
- Rows: [checkbox on hover] [status circle] name [⤷ 2 subtask count] [☰ description icon] [tags inline] … cells.
- Group footer: "+ Add Task" ghost row that opens an inline editor (name input + assignee/date/priority icons + Save; Enter saves, Esc cancels).

### Board view — `board_view_cards.png`, `board_view_filter_popover.jpg`
Horizontal status columns with a header pill + count + "…" + "+". Cards are draggable. Each column ends with a "+ Add task" button. The Filter popover reads "Where [Status] [Is] [REVIEW]" with "+ Add filter" and "Clear all".

### Task view — `task_view_header_fields.png`, `task_checklists_dark.jpg`, `task_relationships_popover.png`, `sprint_points_popover.png`
- Modal top bar: breadcrumb (Space / Folder / List), a task ID chip (`tsk_001` → shown as "#86b2…" style short id), "…", expand-to-full-page and ×.
- Left column:
  - Title (editable, 26px bold) with an "Ask AI" chip omitted.
  - A 2-column field grid:
    - Status (pill + ▸ next), Assignees
    - Dates (start → due), Priority
    - Time Estimate, Track Time (▶ 0:00:00 + total)
    - Sprint Points, Tags
    - Sprints (chip list), Relationships
  - "Fields" section for custom fields (`task_view_header_fields.png`: Objective dropdown chip, Owner, Cost $13,955.07).
  - Description (click to edit textarea).
  - Tabs "Details | Subtasks N | Checklists N" (`task_checklists_dark.jpg`): subtasks table with an inline add row; checklists with progress, items (checkbox, assign, delete), "+ Add item", "+ Checklist".
- Right column, "Activity": filter (All/Comments/History), history lines ("Priya changed status from To Do to In Progress · Nov 12 at 10:14 am") and comments with avatar, reactions and reply. The composer at the bottom has "Comment…", @mention autocomplete and a "Send" button.

### Sprint pages — `sprint_header_status_menu.png`, `sprint_create_modal.png`, `sprint_automations_settings.png`, `sprint_burndown_burnup_cards.png`, `sprint_velocity_card.png`, `sprint_completed.png`
- Header "⚡ Sprint 23 (11/9 - 11/22) ▾ ⓘ", then a sprint-status button ("In Progress ▾" blue / "Not Started" grey / "Done" green) with the menu "Mark Sprint as In Progress" and "Mark Sprint as Done". Next come the date chip "11/9 - 11/22" and "Points: 18/38".
- View tabs: Sprint List | Sprint Board | Sprint Report.
- The Sprint Folder overview shows a card per sprint (status, date range, progress bar of points, tasks count, "Start sprint" / "Complete" buttons), Backlog count and a velocity mini chart.

### Docs — `docs_hub_and_doc.png`, `doc_page_editor.png`, `doc_connected.png`
- The Docs Hub has a heading "Docs", a search input, "+ New Doc" (purple) at the top right, three card groups (Recent, Favorites, Created by Me) and a table of all docs.
- The doc page has:
  - A breadcrumb "Engineering / Engineering Handbook / Overview" with ☆, "Share" and "…".
  - A pages sidebar (toggle "Show pages") with page tree, "+ Add page" and search.
  - Content: optional gradient cover, emoji icon, a 36px title, a row of contributor avatars + "Last updated at 11:47 am", then blocks.

### Timesheets — `timesheet_week_grid.png`, `timesheet_rows_timer.png`, `timesheet_summary_billable.png`, `timesheet_approval_entry.png`, `timesheet_insights.png`, `time_tracking_manual_popover.jpg`
- Tabs: My timesheet | All timesheets | Approvals (badge count).
- Toolbar: "‹ › Nov 16 - Nov 22 ▾", Filters (Billable, Tags), Display (Timesheet / Time entries), "+ Track time", and "Submit for approval" (purple) with a status badge (Open / Submitted / Approved / Changes requested).
- Grid:
  - Header cells "Mon, Nov 16" with a "7h 30m" total and a capacity bar (today's header in purple with a top border).
  - Body rows: play button + task name + location breadcrumb + day cells + row total + "…".
  - Footer: daily totals.
- Summary panel at right or top: "Your time 36h 49m / 40h", billable donut, billable vs non-billable amounts.

### Inbox / My Tasks
- Inbox:
  - Tabs: Primary | Other | Later | Cleared.
  - Rows are grouped by Today / Yesterday / Earlier. Each row shows avatar, actor + action text, task name, location, time ago and hover actions (✓ clear, ⏰ later, mark read).
  - Unread rows show a dot and bold text. Clicking a row opens the task modal.
- My Tasks: collapsible buckets with counts, list rows like the List view (status, name, location breadcrumb, due date, priority).

## 5. Data model overview

See `data_model.md`:
- Workspace and people: `workspace`, `users` (12), `teams`
- Hierarchy and work: `spaces` (4, with statuses), `folders` (4, 1 Sprint Folder), `lists` (12), `sprints` (4), `tasks` (~90), `customFields`, `tags`
- Collaboration: `comments`, `activity`
- Docs: `docs` (11), `docPages` (~32)
- Time: `timeEntries` (~75), `timer`, `timeTags`, `timesheets` (6), `timesheetSettings`
- Other: `notifications` (22), `favorites`, `viewSettings`

All values are JSON-safe. Seed dates are computed relative to the (frozen) runtime clock inside `createInitialData()`.

## 6. What to skip, and why

| Skip | Reason |
|---|---|
| Login, signup, SSO, 2FA, password, workspace invitations by email | Out of scope; the app starts pre-logged-in as Jordan Rivera. The avatar menu "Log out" is visually present but inert, or omitted. |
| Chat / Channels / DMs, Whiteboards, Clips, ClickUp Brain AI, Forms, Goals | Not in SEED workflows. **Omit from the rail and sidebar** rather than render dead buttons. |
| Real file uploads | Optional P2. If implemented, use `POST /upload` from state-api (local only). |
| Integrations (Slack, GitHub, Google Calendar), email notifications, webhooks | No network at runtime. |
| Automations engine, recurring task scheduler, sprint auto-create on a timer | The Harbor contract forbids timers or tickers writing to state. Sprint automation **settings** are stored, but they only take effect when the user acts (e.g. "Mark as Done" respects `moveSpilloverToNext`). |
| Real-time presence, typing indicators, simulated activity | Forbidden by the contract (no state changes without a user action). |
| Export PDF/CSV | Show a toast only. |

## 7. Harbor contract notes (must-read for dev)

- Copy `templates/dataManager.js` unchanged → `src/utils/dataManager.js`.
- `vite.config.js`: `import { stateApi } from '../../templates/state-api.js'`, `import { createInitialData } from './src/data/seed.js'`, and `plugins: [react(), stateApi(createInitialData)]`. Set `server: { port: 5384, strictPort: true }` and `preview: { port: 5384, strictPort: true }`.
- `/go`, `/state`, `/post` are served by the middleware. **Do not create a Go.jsx page or a /go route.**
- Boot: `await loadState('clickup', createInitialData)` before rendering routes, with a neutral loading state meanwhile.
- A single store effect calls `saveState('clickup', state)` after every user-driven change (skip the initial load).
- No `setInterval` writing state. The running-timer display uses a component-local tick only.
- Every action creates or updates structured records (ids, status, numbers, actor `u_jordan`, `createdAt` ISO, related ids).
- Render any injected state: empty arrays, missing fields, hundreds of records.
- Keep `?sid=` across navigation: wrap `navigate`/`Link` targets with `withSid()` or preserve `location.search`.
- No CDNs or Google Fonts: use `@fontsource/inter` and `lucide-react`.
- `<title>ClickUp</title>` (or "Sprint 23 | ClickUp" style). Never "Mock" or "Clone".
- Docs: `SCHEMA.md` must list every key and record shape plus an **Observable State Changes** table. `npm run build` must pass, and `package-lock.json` must be committed.

## 8. Sources consulted
- clickup.com/features/{tasks, docs, sprints, timesheets, time-tracking}
- help.clickup.com articles: Use Sprint Points; Timesheets Hub; Track time on tasks; How to set up Sprint planning; Intro to Docs; Timesheet approvals; Configure default Sprint Folder settings; Sprint statuses; Create a Sprint Folder; Use Task views
- Screenshots from clickup.com feature pages (images.ctfassets.net, cdn-staging.clickup-edge.com) and public screenshots via image search
