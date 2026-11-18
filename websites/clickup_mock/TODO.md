# ClickUp Mock — TODO

> Status: IMPLEMENTED — developer checks PASS; browser certification pending
> Last updated by: dev agent, 2026-11-18
> Research: `assets/README.md` | Data model: `assets/data_model.md` | Style: `DESIGN.md` | Screenshots: `assets/screenshots/`
> Contract: `SEED.md` + `HARBOR_CONTRACT.md` (these override anything below if they conflict)
> **Dev server port: 5384** (never any other port) · App key: `clickup` · Default user: **Jordan Rivera (`u_jordan`)**


## Initial developer verification — 2026-11-18

- Implemented all 13 P0, 45 P1, and 12 P2 items below. Seed contains 97 tasks, 11 Docs, 33 pages, 74 time entries, and 6 timesheets.
- `npm run build`: PASS. `npm test`: 7 passing state/parser checks.
- `npm run check:render`: 90 passing route renders (30 route cases × seed, empty arrays/unknown user, and 500-task/1,000-entry worlds).
- `npm run check:client`: 20 passing DOM checks covering user edits, Doc creation/editing/sharing, Sprint completion/spillover, timer start/stop, session-preserving navigation, exactly one baseline push, and zero idle/timer-display saves.
- Built preview on **5377**: 10 deep-link routes, state baseline/current/diff, session isolation, and local upload roundtrip all PASS.
- `src/utils/dataManager.js` is byte-identical to the required template.
- `AUDIT.md` and `TEST.md` did not exist at handoff and were not created or edited. The browser access host was unavailable. Real-browser visual review and Harbor/Playwright certification remain for the test agent; developer checks are not a claim of that certification.
- Drag pages normally to nest, or hold Shift while dropping to reorder.

## Review fixes — 2026-11-18

No P0 issues were open. Fixed the audit P1 first, then TEST P1, then the reported P2 gaps in existing completed TODO items. AUDIT.md and TEST.md were read but left unchanged for their owners to retest.

Developer validation: `npm test` passes 9 checks; `npm run check:render` passes 90 renders; `npm run check:client` passes 46 checks, with one baseline push and zero idle/timer-display saves. The client checks cover geometry at 1440×900 and 1280×720 using a DOM harness; real-browser retesting remains with the test agent. Dev server runs on **5377**. `dataManager.js` remains byte-identical to the template.

- [x] **AUDIT-001 / BUG-004 (P1)**: preserve existing assignees when using Assign to me or M.
- [x] **BUG-001 (P1)**: Enter submits forms without invoking Cancel or Clear.
- [x] **BUG-002 (P1)**: keep bottom-edge popovers inside the viewport.
- [x] **BUG-003 (P1)**: retain parent popovers while using nested time-entry menus.
- [x] **BUG-005…014 (P2)**: fix selection order, editor keyboard/mentions, labels, rename target, history noise, validation, billable defaults, and seed timestamps.
- [x] **VISUAL-001…004 (P2)**: correct heading sizes, toolbar alignment, task fields, and timesheet row controls.

## Round 2 review fixes — 2026-11-18

No AUDIT P0/P1 or TEST P0 issues were open. Fixed the remaining TEST P1 first, then repaired the reported P2 gaps in completed features. AUDIT.md and TEST.md remain unchanged for their owners.

Developer validation: build PASS; `npm test` 10/10; `npm run check:render` 90/90; `npm run check:client` 54/54, with exactly one baseline push, 23 user saves, and zero idle saves. The client harness now checks that Edit/Delete dialogs have no covering Time tracked popover, that task timers stop, clipboard denial is caught, new pages display Untitled, and sprint-date forms submit. `/state` and `/go` smoke checks pass on **5377** with 97 default tasks and an empty initial diff. `dataManager.js` remains byte-identical to the template. Browser visual review and Playwright/Harbor certification remain with the test agent.

- [x] **BUG-003 (P1)**: close the Time tracked popover before opening Edit, Delete, or Add time dialogs so Save and Confirm remain clickable.

- [x] **AUDIT-101 / BUG-015…020 (P2)**: remove the unused stub; fix timer toggle, clipboard errors, incomplete filters, accessible names, sprint-date submission, and empty page titles.

- [x] **VISUAL-005 (P2)**: compact 360px purple time card with icon tabs, searchable task picker, note, expandable When date, tag picker, and round billable toggle.
- [x] **VISUAL-006 (P2)**: add 24px before Velocity. Retain the green completed line and blue scope line explicitly required by DESIGN.md; the test report’s suggested yellow line conflicts with those exact tokens.

## Developer verification on port 5384

The latest audit lists zero P0 issues, and all feature and seed checklist items are checked. The existing BUG-003 fix passed the DOM regression check. Opening either dialog closes the Time tracked popover, Save updates the entry duration, and Confirm removes the entry. Browser click-path retesting at both report viewports is pending with the test agent.

- [x] **SEED port alignment**. Dev and preview passed on 5384 with deep links and the Harbor state API. The client harness and current setup references use the same port.
- `npm run build` passed, along with 10 unit tests, 90 route renders, and 54 client checks. The client harness recorded one baseline push and zero idle saves.
- The fresh `dist/` matches the Harbor-certified ClickUp build byte for byte. Its certification passed render, sync, idle, and hydration.

## Status Legend
- [ ] Not started
- [~] In progress
- [x] Done

## SEED workflow → TODO map (every workflow is P0/P1)

| SEED workflow | TODO items | State records written |
|---|---|---|
| **Tasks** | P0-11, P1-T1…T17 | `tasks[]`, `activity[]`, `comments[]`, `notifications[]` (read/cleared), `viewSettings{}` |
| **Docs** | P1-D1…D9 | `docs[]`, `docPages[]`, `comments[]` (parentType `doc`), `tasks[].linkedDocIds` |
| **Sprints** | P1-S1…S9 | `sprints[]`, `tasks[].sprintId/sprintHistory/sprintPoints`, `folders[].sprintSettings`, `lists[]` (backlog), `activity[]` |
| **Time tracking** | P1-TT1…TT10 | `timer`, `timeEntries[]`, `timesheets[]`, `tasks[].timeEstimate`, `activity[]` |

Global rule for every mutation below: it goes through the store reducer, and the store's single effect calls `saveState('clickup', state)`. Records use `actor = state.currentUserId` and timestamps from `new Date().toISOString()`. New ids follow `prefix_` + `Date.now().toString(36)` + 2 chars (see data_model.md §0).

---

## P0 — Core Shell
<!-- Without these, the app cannot render. Dev implements these first. -->

- [x] **P0-1 Scaffold**: in `websites/clickup_mock` run `npm create vite@latest . -- --template react` (JS). Install `react-router-dom`, `@fontsource/inter`, `lucide-react`. Optional: `@dnd-kit/core` + `@dnd-kit/sortable` for drag and drop (HTML5 DnD is also fine). Do not add CDN links. In `index.html`, set `<title>ClickUp</title>` and an inline-SVG favicon (ClickUp chevron logo, gradient `#8930FD→#49CCF9` / `#FF02F0→#FFC800`). Commit `package-lock.json`.
- [x] **P0-2 Harbor state wiring**:
  - Copy `../../templates/dataManager.js` **unchanged** to `src/utils/dataManager.js`.
  - Write `vite.config.js`:
    ```js
    import { defineConfig } from 'vite'
    import react from '@vitejs/plugin-react'
    import { stateApi } from '../../templates/state-api.js'
    import { createInitialData } from './src/data/seed.js'
    export default defineConfig({
      plugins: [react(), stateApi(createInitialData)],
      server: { port: 5384, strictPort: true },
      preview: { port: 5384, strictPort: true },
    })
    ```
  - `/go`, `/state`, `/post`, `/upload` are served by the middleware. **Do NOT create Go.jsx or a `/go` React route** (this overrides plan.md).
  - `src/data/seed.js` must be pure (no `window` or DOM, importable by Node) and use no `Math.random`.
- [x] **P0-3 Store** (`src/store/AppStore.jsx`):
  - `AppProvider` holds `state` via `useReducer`. On mount it runs `const s = await loadState('clickup', createInitialData)` and renders a neutral full-screen loader (white, centred grey spinner, no brand text needed) until loaded. Then `dispatch({type:'HYDRATE', state: s})`.
  - One `useEffect([state])` calls `saveState('clickup', state)` when `loaded && !justHydrated`.
  - Expose `useStore()` → `{ state, dispatch, actions }`, where `actions` are named helpers (`createTask`, `updateTask`, ...). Each action must write the structured records listed in this file.
  - Normalise injected state defensively with `const arr = (x) => Array.isArray(x) ? x : []`. Selectors must never crash on missing optional fields, an empty `users`, or an unknown `currentUserId` (fall back to the first user or a placeholder "You").
- [x] **P0-4 Seed** `src/data/seed.js` → `export function createInitialData()`, implemented exactly per data_model.md (all collections, fixed ids, dates relative to `new Date()` computed inside the function). See "Data Seed" below for volumes.
- [x] **P0-5 Routing** (`App.jsx`): `BrowserRouter` **inside** `AppProvider`. All routes render inside `<AppShell>` (rail + top bar + sidebar + main panel).
  - `/` → redirect to `/inbox` (preserve `?sid=`)
  - `/inbox`, `/inbox/replies`, `/inbox/assigned-comments`
  - `/my-tasks`
  - `/everything?view=list|board`
  - `/s/:spaceId?view=list|board|calendar` (space overview + all its tasks)
  - `/f/:folderId` (normal folder: tasks of all its lists; Sprint Folder: sprint overview, see P1-S1)
  - `/l/:listId?view=list|board|calendar`
  - `/sprint/:sprintId?view=list|board|report`
  - `/t/:taskId` (task full page). The task **modal** opens over any route via the query param `?task=<id>`.
  - `/docs?tab=all|mine|shared|wikis|archived`
  - `/d/:docId` and `/d/:docId/:pageId`
  - `/timesheets?tab=my|all|approvals&week=YYYY-MM-DD` (week = Monday)
  - `/timesheets/approvals/:timesheetId`
  - `/trash` (P2), `/dashboards` (P2), `/settings` (P2)
  - `*` → a simple "Page not found" with a link back to Inbox

  Hard reload on every route must work. Unknown ids show an in-panel "This item doesn't exist or was deleted" empty state, not a crash.
- [x] **P0-6 sid-preserving navigation**: create `src/utils/nav.js` with `useNav()` that wraps `navigate(to)` and keeps the current `?sid=`, merging other query params. Add a `<SLink>` component that does the same. Use them everywhere. Anything leaving the SPA uses `withSid()`.
- [x] **P0-7 App layout** (DESIGN.md §4):
  - Black rail 56px with items Home (→ /inbox), Docs (→ /docs), Timesheets (→ /timesheets), Dashboards (P2, hide until built). The active item is highlighted.
  - Top bar 44px, `#FCFCFC`:
    - Left: workspace pill "L Lumen Labs ▾". Its menu shows workspace name, plan "Business Plus" and items Settings (P2) and Trash (P2); unimplemented items are hidden.
    - Centre: search pill "Search" + "⌘K".
    - Right: timer pill (only when `state.timer`), "+ New" (menu: Task, Doc, Track time), bell (unread count), avatar "JR" menu (name, email, "Settings"; "Log out" inert/omitted).
  - Sidebar 260px `#FCFCFC` (P0-8). Main panel white, radius 12px, border `#EBEBEB`, 8px gap to the window edge.
- [x] **P0-8 Sidebar tree**:
  - Header "Home". Items: Inbox (pink badge = unread, non-cleared notifications), Replies, Assigned Comments (badge = unresolved comments assigned to me), My Tasks.
  - "Favorites" section (collapsible; shows `favorites[]` with icons; hidden when empty).
  - "Spaces" section header with a "+" button (P2 create space; hide the button until implemented). Under it: "Everything", then each Space.
    - A Space row shows a coloured letter square + name; it expands on caret click and expansion state lives in local UI state.
    - Children: folders (Folder icon; Sprint Folder uses a Zap icon), each listing its lists, and folderless lists. Show a muted task count (open, non-archived, non-deleted, top-level) on the right.
    - Under the Sprint Folder: sprints sorted by index desc, displayed with dates; the current in-progress sprint has a small blue dot. Then "Backlog".
  - Active route item: bg `#EDEDED`.
  - Hover "…" menu on lists: Rename (P1-T17), Add to Favorites, Archive (P2). Hover "+" on a list opens the Create Task modal prefilled with that list.
- [x] **P0-9 Location header + view tabs + toolbar** (shared `LocationHeader` component used by Space/Folder/List/Sprint/Everything):
  - Breadcrumb (Space › Folder › List) with ☆ favorite toggle (P1-T17).
  - View tabs: List / Board / Calendar. The active tab is synced to `?view=` and also saved in `viewSettings[loc].view`.
  - Toolbar (P1-T9…T11) and the "+ Task ▾" dark split button: the main click opens Create Task modal with the location prefilled; the caret menu offers "Task" and "Doc".
- [x] **P0-10 Shared primitives**: `Avatar`/`AvatarStack`, `StatusIcon` + `StatusPill`, `PriorityFlag`, `TagChip`, `DateChip` (relative label: Today / Tomorrow / Yesterday / "Mon" within this week / "Nov 25"; red when overdue and not closed), `Dropdown`/`Popover` (closes on outside click and Esc), `Modal`, `Toast` (UI-only), `ConfirmDialog`, `EmptyState`. Write `formatDuration(seconds)` → "1h 30m" / "45m" / "0m", `formatClock(seconds)` → "0:12:45", and `parseDuration(str)` → seconds (P1-TT3).
- [x] **P0-11 Task data helpers** (`src/utils/tasks.js`):
  - `statusOf(task)` resolves `{name,color,type}` from `space.statuses`, with a grey fallback if unknown.
  - `isClosed(task)`.
  - `locationOf(task)` returns `{space, folder, list}`.
  - `visibleTasks(state, filter)` excludes `deleted` and, by default, `archived`.
  - `tasksForLocation(locKey)`: a Space/Folder includes all of its lists; a sprint uses `task.sprintId === id`.
  - `trackedSeconds(taskId)`, `subtasksOf(id)`.
  - These are used by every view.
- [x] **P0-12 SCHEMA.md**: document every top-level key and record shape (copy from data_model.md, kept in sync with the code). Include the **Observable State Changes** table: one row per action listed in this TODO (action → collection → fields changed/added → example). See the template at the bottom of this file.
- [x] **P0-13 Build check**: `npm run build` passes, `npm run preview` serves on 5384, and `dist/` works with deep links. No console errors on any route with the seed, with `{}` injected state, or with 500 injected tasks.

---

## P1 — Primary Features
<!-- Core features a user interacts with in the first 5 minutes. -->

### Tasks (SEED workflow)

- [x] **P1-T1 List view** (`/l/:listId`, `/s/:id`, `/f/:id` normal folder, `/everything`, `/sprint/:id?view=list`). Reference: `home_sidebar_list_view_3.0.png`, `sprint_list_groupby.png`.
  - Groups default to status, in status `orderIndex` order. Closed statuses are hidden unless the "Closed" toggle is on; the done type is shown collapsed at the bottom.
  - Group header: caret (collapse, UI state), StatusPill (uppercase name), count, "…" menu (Collapse all groups, Hide group (UI)), and "+ Add Task" which opens an inline row.
  - Column header row under each group: Name, Assignee, Due date, Priority, plus optional columns from `viewSettings.columns` (Sprint Points, Sprint, Tags, Time tracked, Time estimate, Start date, Date created, custom fields).
  - Row 40px:
    - Hover checkbox, status circle (click → status dropdown), name (click → opens task modal `?task=id`), subtask count chip "⤷ 2" (click toggles subtask expansion), description icon if the description is non-empty, checklist "2/5" chip if checklists exist, tag chips inline after the name (max 3 + "+N").
    - Cells: assignee AvatarStack (click → assignee picker), DateChip (click → date picker), PriorityFlag + label (click → priority dropdown), points "◆ 5".
    - Hover "…" (P1-T8).
  - Subtasks render indented under the parent when expanded (`viewSettings.subtasks`).
  - Empty list: EmptyState "No tasks yet" + "+ Add Task".
  - Cell edits call `updateTask` (P1-T5).
- [x] **P1-T2 Inline create (list & board)**:
  - "+ Add Task" turns into an input row: placeholder "Task Name or type '/' for commands", with mini assignee / due date / priority buttons and "Save" (Enter). Esc cancels.
  - Empty name: Save is disabled and the input gets a red border on Enter.
  - Status = the group's status (or the board column). Location = the current list. If the location is a Space/Everything/Folder, use the first list (Space default); in a sprint, use the Backlog list + `sprintId` = sprint.
  - After save, the input stays open for rapid entry.
  - **Writes**: `tasks[]` push `{id, name, status, listId, sprintId, assigneeIds, dueDate, priority, createdBy:'u_jordan', createdAt, updatedAt, orderIndex: max+1000, ...defaults}`; `activity[]` push `{type:'created', taskId, actorId, createdAt}`. If created in a sprint, also add `sprintHistory:[sprintId]`.
- [x] **P1-T3 Create Task modal** (top-bar "+ New › Task", "+ Task" button, sidebar list "+", hotkey `T` outside inputs):
  - 600px modal. Fields:
    - Location picker "📋 List ▾": a searchable tree of Space › Folder › List; Backlog lists included.
    - Big "Task Name" input (required; error "Task name is required").
    - Description textarea "Add description".
    - Chip row: Status (defaults to the space's first status), Assignee (multi), Due date (with start date), Priority, Tags, Sprint Points (only if the list is in a Sprint Folder), Sprint (only if Sprint Folder).
    - Footer: "Create Task" purple button; ⌘/Ctrl+Enter submits.
  - After creating: toast "Task created · Open" (Open → opens the modal).
  - **Writes**: same as P1-T2, plus `description`, `tags`, `sprintPoints`, `startDate`.
- [x] **P1-T4 Task modal / page** (`?task=id` modal and `/t/:id` page share one `TaskDetail` component). Reference: `task_view_header_fields.png`, `task_checklists_dark.jpg`, `sprint_points_popover.png`, `task_relationships_popover.png`.
  - **Top bar**: breadcrumb Space / Folder / List (clickable), task id chip "#tsk_001" (click copies the id; toast "Copied"), relationship count, "…" menu (P1-T8), expand ⤢ (→ `/t/:id`), × (removes the `task` param).
  - **Left**:
    - Parent link "⤴ Parent task name" for subtasks.
    - Editable title (contentEditable/textarea; save on blur or Enter; empty reverts).
    - Field grid:
      - Status split pill: the main part opens the status dropdown; "▸" moves to the next status in order.
      - Assignees: avatars + "+" picker.
      - Dates: "Start → Due" (date picker with quick options).
      - Priority.
      - Time Estimate (P1-TT7).
      - Track Time (P1-TT1/TT6).
      - Sprint Points (P1-S4).
      - Sprints (chip of the sprint name, × to remove, + to add; only for tasks in a Sprint Folder list).
      - Tags (picker with search + "Create tag").
      - Relationships ("Linked docs" chips + "Add" → doc search; "Waiting on"/"Blocking" task search).
    - Custom Fields section ("Fields", collapsible): the custom fields that apply to the task's scope, edited by type (dropdown chip, currency input "$", number, text, date).
    - Description: click to edit the textarea; render bullets for lines starting "- ". Save on blur.
    - Tabs "Subtasks N" / "Checklists N":
      - Subtask table: status, name, assignee, due, priority, plus an "+ Add subtask" inline row.
      - Checklists: name (rename inline), progress "2/5", items with checkbox, name inline edit, assignee avatar picker and delete ×. Then "+ Add item" and "+ Add checklist", plus a checklist "…" menu (Rename, Delete).
  - **Right "Activity" pane**: a filter dropdown (All / Comments / History). Merged chronological feed of `activity` lines ("**Priya Shah** changed status from **to do** to **in progress** · Nov 12 at 10:14 am") and comment cards (P1-T6).
  - The modal closes on Esc or overlay click. Field edits persist immediately.
  - Missing optional fields render "Empty" placeholders.
- [x] **P1-T5 Edit task fields** (from any surface: list cell, board card, task view, bulk bar). `updateTask(id, patch)` must:
  - (a) set `updatedAt`;
  - (b) push one `activity` record per changed field. Types are `status_changed` (from/to names), `assignee_added`/`assignee_removed` (to = userId), `priority_changed`, `due_date_changed`, `start_date_changed`, `points_changed`, `estimate_changed`, `tag_added`/`tag_removed`, `renamed`, `description_changed` (no from/to text needed), `custom_field_changed` (field = cf id);
  - (c) on a status change into a done/closed type, set `dateClosed = now` and `closedBy`; on a change out of done/closed, clear both;
  - (d) assigning another user is allowed. Do **not** generate notifications for other users (they are not the viewer).
  - **Writes**: `tasks[i]` fields, `activity[]`.
- [x] **P1-T6 Comments on tasks**:
  - Composer at the bottom of Activity: textarea "Write a comment…", "@" opens a user autocomplete (inserts "@Priya Shah" and records the id in `mentions`), the "Assign comment" icon picks a user, and "Send" (or Enter; Shift+Enter makes a newline). Empty send is disabled.
  - Comment card: avatar, name, relative time, text with highlighted mentions, reaction bar (👍 🎉 ❤️ 👀 toggle, plus "+" picker of 8 emojis), Reply (opens a nested composer; the reply gets `replyToId`), "…" (Edit, own comments only; Delete with confirm; Resolve, for assigned comments).
  - **Writes**: `comments[]` push `{id, parentType:'task', parentId, authorId:'u_jordan', text, mentions, assigneeId, replyToId, reactions:[], resolved:false, createdAt}`. Edit sets `text` + `updatedAt`. Reactions update `reactions[].userIds`. Resolve sets `resolved:true`. Delete removes the record.
- [x] **P1-T7 Subtasks & checklists**:
  - Add subtask: inline row in the task view "Subtasks" tab, and the "+" icon on a list row (hover) → creates a child.
  - **Writes**: `tasks[]` push with `parentId`, the same `listId`/`sprintId` as the parent, and status = the space's first status; `activity[]` `{type:'subtask_added', taskId: parentId, to: newId}`.
  - Checklist CRUD updates `tasks[i].checklists`. Resolving an item pushes `activity {type:'checklist_item_resolved', to: itemName}`.
- [x] **P1-T8 Task "…" menu & delete/archive/duplicate/move**. The menu appears on the list row hover, board card hover and task view. Items:
  - Copy link (toast).
  - Copy ID (toast).
  - Open in new tab → `/t/:id` via `withSid`.
  - Rename (focus title).
  - Duplicate (copy with name "<name> (copy)", new ids for checklists; **writes** `tasks[]` push + `activity created`).
  - Move to… (list picker; **writes** `listId`, and `activity moved` from/to list ids; subtasks move too).
  - Add to Sprint › (sprint list) (P1-S3).
  - Start timer (P1-TT1).
  - Archive (**writes** `archived:true` + `activity archived`; toast with Undo, which sets it back to false).
  - Delete (ConfirmDialog "Delete task? It will be moved to Trash." → **writes** `deleted:true, deletedAt, deletedBy` + `activity deleted`; subtasks also deleted).

  Archived tasks show only when the "Archived" filter is on. Deleted tasks only appear in Trash (P2).
- [x] **P1-T9 Multi-select & bulk actions**:
  - The row checkbox appears on hover and stays visible once any row is selected. Shift-click selects a range. The group header checkbox selects the whole group.
  - Selection shows the bottom floating dark bar "N Tasks selected ×" with: Status (dropdown), Assignees (add/remove picker), Dates (due date picker), Priority, Tags (add), Sprint (Add to sprint / Remove from sprint — Sprint Folder lists only, else hidden), Move (list picker), Duplicate, Archive, Delete (confirm).
  - Each applies `updateTask` to every selected task (one activity per task per field), then clears the selection.
  - Selection is UI state (not persisted).
- [x] **P1-T10 Group / sort / subtasks / columns / closed / Me mode** (toolbar; persisted per location in `viewSettings[locKey]`):
  - "Group: Status ▾" popover (`sprint_list_groupby.png`): Status, Assignee, Priority, Tags, Due date, None; Ascending/Descending.
  - Sort: in the column header menus (click "Due date" header → Sort ascending/descending, Clear) and in the popover. Options: dueDate, priority (urgent→low→none), name, sprintPoints, createdAt.
  - "Subtasks ▾": Collapse all / Expand all / As separate tasks.
  - "Columns": checkbox list of optional columns.
  - "Closed" toggle (show closed tasks).
  - "Me mode" (avatar button): only tasks where `u_jordan` is an assignee.
  - **Writes**: `viewSettings[locKey] = {...}`.
- [x] **P1-T11 Filter + search**:
  - "Filter" button opens a popover (`board_view_filter_popover.jpg`). Each row is "Where [Field ▾] [is ▾] [Value ▾]". Fields: Status, Assignee, Priority, Tags, Due date (Overdue / Today / This week / No date), Sprint Points, Sprint. Plus "+ Add filter" and "Clear all".
  - The button shows a count badge "Filter 2" when active. Filters are ANDed and persisted in `viewSettings[locKey].filters`.
  - Toolbar search (magnifier expands into an input "Search tasks…") filters by name/description case-insensitively. It is local UI state, cleared on location change.
- [x] **P1-T12 Board view** (`?view=board`; `board_view_cards.png`):
  - Columns = statuses of the location's space; for multi-space locations (Everything), group by status name. Closed columns are collapsed unless "Closed" is on. Column header: pill + count + "+".
  - Cards: list name (when outside its list), name, subtask count, assignee avatars, DateChip, priority flag, points chip, tags. Click → task modal. Hover "…".
  - Drag a card to another column → `updateTask(status)`. Drag within a column reorders (`orderIndex` written).
  - "+ Add task" at the column bottom → inline card input (P1-T2).
  - Group by Assignee/Priority also works: dragging changes that field.
  - **Writes**: `tasks[i].status|assigneeIds|priority`, `orderIndex`, `activity[]`.
- [x] **P1-T13 Calendar view** (`?view=calendar`):
  - Month grid (Mon start) with "‹ Today ›" navigation and a month label.
  - Tasks are placed on their `dueDate` as small chips (status colour bar + name); "+N more" opens the day list. A "No due date" side tray lists unscheduled tasks.
  - Click a chip → task modal. Drag a chip to another day → `updateTask({dueDate})`.
  - Click an empty day → inline quick-create with that due date.
- [x] **P1-T14 My Tasks** (`/my-tasks`):
  - Header "My Tasks". Collapsible buckets over tasks assigned to `u_jordan` (not deleted/archived):
    - **Today & Overdue**: due ≤ today, not closed.
    - **Next**: due within 7 days.
    - **Later**: due beyond 7 days.
    - **Unscheduled**: no due date, not closed.
    - **Done**: closed in the last 7 days, collapsed by default.
  - Rows show the status icon (clickable), name, location breadcrumb (muted), DateChip and priority. Click → modal.
  - Also: "Assigned comments" count card and a link to the Inbox.
- [x] **P1-T15 Inbox** (`/inbox`):
  - Tabs: **Primary** (not cleared, not later), **Other** (types status_changed/due_date), **Later** (`savedForLater`), **Cleared**.
  - Rows are grouped Today / Yesterday / Last 7 days. Each row shows: actor avatar, "**Elena Petrova** assigned you a task", task name + location, relative time, unread dot.
  - Hover actions: ✓ Clear, 🕑 Save for later, ● Mark read/unread. Header actions: "Mark all as read", "Clear all".
  - Click a row → marks it read and opens the task modal (or the doc / approval page for doc and timesheet types).
  - `/inbox/replies`: comments that reply to Jordan's comments or mention Jordan.
  - `/inbox/assigned-comments`: unresolved comments with `assigneeId === u_jordan`, each with a "Resolve" button (writes `comments[i].resolved = true`).
  - **Writes**: `notifications[i].read|cleared|savedForLater`, `comments[i].resolved`. The badge count updates live.
- [x] **P1-T16 Global search ⌘K** (top-bar pill or Cmd/Ctrl+K):
  - Command palette modal (640px) with an input "Search tasks, docs, people, and more…". Results are grouped: Tasks (name/id match; status icon + location), Docs, Pages, Lists/Spaces, People.
  - Arrow keys navigate, Enter opens, Esc closes. With an empty query, show "Recent" (the last 5 opened tasks/docs, kept in UI state — fine not to persist).
  - Quick actions at the bottom: "Create task", "Create doc", "Track time".
- [x] **P1-T17 Favorites & list rename**:
  - ☆ in location headers, task view and doc header toggles `favorites[]` (`{type,id}`); the sidebar Favorites section updates.
  - Renaming a list/folder/sprint via the sidebar "…" › Rename uses an inline input. **Writes** `lists[i].name` / `folders[i].name` / `sprints[i].name`.

### Sprints (SEED workflow)

- [x] **P1-S1 Sprint Folder overview** (`/f/fd_sprints`):
  - Header "⚡ Platform Sprints" with ☆, "⚙ Sprint settings" (P1-S8) and a purple "+ Create Sprints" button (P1-S2).
  - **Current sprint** hero card: name, status pill, dates, a days-left label ("6 days left" computed from `new Date()`), a points progress bar "18 / 38 pts", task counts by status type and an "Open sprint" button.
  - **Upcoming** and **Completed** sections hold sprint cards (status, dates, points completed/forecast, # tasks, spillover count for done sprints).
  - A **Backlog** card: task count, total points, "Open Backlog".
  - A **Velocity** mini bar chart (last 3 done sprints + current: committed vs completed, derived).
- [x] **P1-S2 Create Sprints modal** (`sprint_create_modal.png`):
  - "Select sprint dates" dropdown lists the next 6 candidate periods after the latest sprint's `endDate`, using `durationDays` and `startDay` from settings, e.g. "Sprint 25 - (12/7) 12/7 - 12/20".
  - "How many sprints do you want to create?" number input 1–10 (validation: 1–10, integer; error text in red).
  - Hint "You can edit sprint names via sprints settings."
  - Buttons Cancel / "Create" purple.
  - **Writes**: `sprints[]` push N records `{id, folderId, spaceId, index: last+1…, name from nameTemplate, startDate, endDate, status:'not_started', forecastPoints:null, committedTaskIds:[], completedTaskIds:[], spilloverTaskIds:[], spilloverToSprintId:null, createdAt, createdBy}`. The new sprints appear in the sidebar immediately.
- [x] **P1-S3 Add tasks to a sprint / remove**. Entry points:
  - (a) The "Sprint" column in Backlog and other Sprint Folder lists: click → dropdown of not_started/in_progress sprints + "Remove from sprint".
  - (b) Task view "Sprints" field.
  - (c) Task "…" › Add to Sprint ›.
  - (d) Bulk bar "Sprint".
  - (e) Drag a Backlog row onto a sprint in the sidebar (P2).

  Adding to a done sprint is not allowed (done sprints are hidden from the pickers). Moving sets `sprintId` to the new sprint.
  **Writes**: `tasks[i].sprintId`, `tasks[i].sprintHistory` (append if new), `activity[] {type:'sprint_added'|'sprint_removed', to/from: sprintId}`. Subtasks follow their parent.
- [x] **P1-S4 Sprint Points** (`sprint_points_popover.png`):
  - The points cell / field opens a popover with quick buttons 1, 2, 3, 5, 8, 13, a custom number input (0–100 integer, validated), and "Clear".
  - When `measureOfEffort === 'time_estimates'`, the sprint UI shows estimate hours instead (still editable via P1-TT7).
  - The task view shows "TOTAL WITH SUBTASKS N points" when subtasks have points.
  - **Writes**: `tasks[i].sprintPoints` + `activity points_changed`.
- [x] **P1-S5 Sprint page** (`/sprint/:id`; `sprint_header_status_menu.png`):
  - Header "⚡ Sprint 23 (11/9 - 11/22) ▾ ⓘ". The caret menu offers Rename, Edit dates (start/end date picker, writes `startDate`/`endDate`; validation end ≥ start), Sprint settings, Delete sprint (only if not_started and no tasks; confirm).
  - Sprint status button: grey "Not Started" / blue "In Progress" / green "Done". Its menu holds "Mark Sprint as In Progress" and "Mark Sprint as Done".
  - Date chip "11/9 - 11/22". "Points: done/total" (and "Forecast: 38" with a lock icon if started).
  - View tabs: **Sprint List** (P1-T1 grouped by status, default columns + Sprint Points), **Sprint Board** (P1-T12), **Sprint Report** (P1-S7).
  - "+ Task" creates a task with `listId: backlogListId, sprintId`.
  - For done sprints: a read-only banner "This sprint was completed on Nov 8 by Jordan Rivera · 29 of 34 points completed". Tasks remain viewable.
- [x] **P1-S6 Start / complete sprint**:
  - **Start**: "Mark Sprint as In Progress" on a not_started sprint. If another sprint in the folder is in_progress, the ConfirmDialog warns "Sprint 23 is still in progress. Start Sprint 24 anyway?".
    **Writes** `sprints[i].status='in_progress', startedAt, startedBy, forecastPoints = Σ points of its tasks, committedTaskIds = current task ids`; `activity` not required.
  - **Complete**: "Mark Sprint as Done" opens a modal "Complete Sprint 23":
    - Summary "8 of 12 tasks completed · 21 of 38 points".
    - If there are unfinished tasks: a list of them (checkbox each, all checked) and "Move unfinished tasks to: [Sprint 24 (next not_started) ▾ | Backlog | Keep in Sprint 23]". The default is the next sprint when `automations.moveSpilloverToNext`, else Backlog. If no next sprint exists, the option offers "Create Sprint 24 and move".
    - Warning text "This action cannot be undone." Buttons Cancel / "Complete Sprint" purple.
    - **Writes**:
      - `sprints[i]`: `status='done'`, `completedAt`, `completedBy`, `completedPoints`, `completedTaskIds`, `spilloverTaskIds`, `spilloverToSprintId` (`sprintId` | `'backlog'` | `null`).
      - Each moved task: `sprintId` = target (or `null` for backlog), `sprintHistory` appended, plus `activity sprint_added`/`sprint_removed`.
      - If needed, `sprints[]` gains a new sprint.
    - A done sprint can't be reverted: the status menu is disabled with a tooltip.
- [x] **P1-S7 Sprint Report** (`?view=report`; `sprint_burndown_burnup_cards.png`, `sprint_velocity_card.png`, `sprint_completed.png`). Everything is **derived at render time**; nothing is stored.
  - Summary tiles: Forecast, Completed points, Remaining, Tasks done/total, Days left, Spillover (for done sprints).
  - **Burndown** SVG chart (x = each sprint day, y = remaining points). The dashed guideline goes from total to 0, and the actual line is computed from `dateClosed` of the sprint's tasks; it stops at today for an in-progress sprint. A toggle switches Points/Tasks.
  - **Burnup** (scope line + completed line).
  - **Velocity** bars for sprints 21…current (committed `forecastPoints` vs `completedPoints`; for the current sprint, completed so far). Show the average velocity text.
  - The charts must handle 0 tasks, with an empty-state message.
- [x] **P1-S8 Sprint Folder settings modal** (`sprint_automations_settings.png`):
  - Name template input (with {INDEX}, {START_DATE}, {END_DATE} hint), Sprint duration (1–8 weeks select), Start day (Mon–Sun), Date format, Measure of effort (Sprint Points / Time Estimates radio).
  - "Sprints Automation" checkboxes: "Create new sprints automatically" (with "Always create the next [N] sprints"; only applies when the user completes a sprint, by auto-creating up to N not_started sprints), "Automatically mark sprints as Done" (saved, informational: "takes effect at 11:59 PM on end date", **never** auto-executed by a timer), "Move unfinished (spillover) tasks to next sprint" (sets the default in the P1-S6 modal).
  - Save / Cancel. **Writes**: `folders[i].sprintSettings`.
- [x] **P1-S9 Backlog list** (`/l/li_backlog`): a normal list view with the "Sprint" and "Sprint Points" columns on by default. Toolbar extra: a "Show tasks in sprints" toggle (default off = only `sprintId == null`). Bulk "Add to Sprint" is prominent here.

### Docs (SEED workflow)

- [x] **P1-D1 Docs Hub** (`/docs`; `docs_hub_and_doc.png`):
  - Title "Docs", search input "Search Docs", purple "+ New Doc" button. Tabs: All, My Docs (owner = me), Shared with me, Wikis (`isWiki`), Archived.
  - Card row (on the All tab): **Recent** (sorted by `lastViewedAt`), **Favorites**, **Created by Me**, 4 items each with icon + title + location.
  - Table: Name (icon + title + wiki badge), Location (Space/Folder/List breadcrumb or "Workspace"), Tags, Date updated (relative), Date viewed, Sharing (lock/globe icon + avatars). Click a header to sort.
  - Row hover "…": Open, Rename, Favorite, Mark/Unmark Wiki, Duplicate, Archive/Unarchive, Delete (confirm → `deleted:true`).
  - Empty states for each tab.
- [x] **P1-D2 Create doc**:
  - "+ New Doc" (hub, top-bar "+ New › Doc", "+ Task ▾ › Doc" in a location, sidebar location "+").
  - Creates the doc immediately and navigates to `/d/:id/:pageId` with the title focused ("Untitled" placeholder). The location is the current location, or workspace if from the hub.
  - **Writes**: `docs[]` push `{id, title:'', icon:null, location, ownerId:'u_jordan', isWiki:false, tags:[], sharing:{visibility:'workspace', defaultPermission:'edit', memberIds:[], publicLinkEnabled:false}, linkedTaskIds:[], archived:false, createdAt, createdBy, updatedAt, updatedBy, lastViewedAt}` and `docPages[]` push the first page `{id, docId, parentPageId:null, title:'', orderIndex:0, blocks:[{id, type:'paragraph', text:''}], createdAt, createdBy, updatedAt, updatedBy}`.
  - An empty title is displayed as "Untitled".
- [x] **P1-D3 Doc page view & editor** (`/d/:docId/:pageId`; `doc_page_editor.png`, `docs_hub_and_doc.png`):
  - Doc top bar: breadcrumb (location › doc title › page), ☆, "Share" button, "…" menu.
  - Page content (760px column): optional cover (gradient; "Add cover" / "Change cover" from 6 local gradients / "Remove") and icon (emoji picker of ~40 emojis; "Add icon"), title (36px, editable), contributors avatars + "Last updated at 11:47 am by Priya Shah".
  - **Block editor**: each block is a contentEditable or auto-growing textarea styled per type.
    - Enter at the end creates a new paragraph block below (in a bullet/numbered/todo block it continues the same type; an empty list block plus Enter converts it to a paragraph).
    - Backspace on an empty block deletes it and focuses the previous one.
    - Markdown shortcuts at the start of a block: "# ", "## ", "### ", "- ", "1. ", "[] ", "> ", "```".
    - "/" at the start opens a **slash menu** (filterable): Heading 1/2/3, Text, Bulleted list, Numbered list, Checklist, Quote, Code block, Divider, Callout, Task (link existing task → `task_link` block rendering a task chip with live status; clicking opens the modal).
    - Todo blocks toggle `checked`. Drag handle ⋮⋮ on hover: menu Turn into…, Duplicate, Delete.
    - Inline marks: render `**bold**`, `*italic*`, `` `code` ``. ⌘B/⌘I wrap the selection (P2 if difficult).
  - Saves are debounced (≤500 ms after typing stops) and on blur — a user action, not a timer writing arbitrary data.
  - **Writes**: `docPages[i].blocks|title|icon|cover|updatedAt|updatedBy`, `docs[i].updatedAt|updatedBy`. Viewing a doc writes `docs[i].lastViewedAt` (on open only).
- [x] **P1-D4 Pages sidebar** (left of the doc content, 240px, toggle "Show pages / Hide pages"):
  - Page tree with expand carets, the active page highlighted and a page search input.
  - "+ Add page" at the bottom; hovering a page shows "+" (add subpage) and "…" (Rename, Duplicate, Move up/down, Delete with confirm, which also deletes subpages).
  - Drag to reorder/nest (P2; Move up/down covers P1).
  - **Writes**: `docPages[]` push/update `parentPageId`, `orderIndex`, `title`; delete removes records. A doc must keep ≥1 page: the last page can't be deleted (the menu item is disabled).
- [x] **P1-D5 Doc "…" menu & wiki/archive/rename/move**: Rename (focus title), Mark as Wiki / Remove Wiki (**writes** `isWiki`; a "Wiki" badge appears next to the title), Add tags (doc tag picker; **writes** `docs[i].tags`), Move (location picker; **writes** `location`), Duplicate (copies doc + pages with new ids, title "<title> (copy)"), Copy link (toast), Export (toast "Export started" only), Archive / Unarchive (**writes** `archived`; an archived doc shows a yellow banner "This Doc is archived · Unarchive"), Delete (confirm → `deleted:true, deletedAt`; navigate to /docs).
- [x] **P1-D6 Share modal**: title "Share this Doc".
  - "Invite by name" input with a user autocomplete → adds a member row with a permission dropdown (Full edit / Can edit / Can comment / Can view).
  - "Workspace" row with visibility select (Workspace can edit / Private).
  - "Share link publicly" toggle: when on, show a read-only URL `https://doc.clickup.com/9012/p/h/<docId>` and "Copy link" (toast).
  - Done.
  - **Writes**: `docs[i].sharing.{visibility, defaultPermission, memberIds, memberPermissions{userId:perm}, publicLinkEnabled}`.
- [x] **P1-D7 Doc comments**:
  - Selecting text or hovering a block shows a 💬 button → opens the right comment panel for the page. "Comments" toggle in the doc top bar with a count.
  - Thread composer like P1-T6 (mentions, reactions, resolve, reply). A "Resolved" filter.
  - **Writes**: `comments[]` with `parentType:'doc', parentId: docId, pageId, blockId (optional), quote (optional selected text)`.
- [x] **P1-D8 Link docs ↔ tasks**:
  - Task view Relationships › "Link Doc" (doc search popover) and doc top bar "Linked tasks (N)" popover › "Link task" (task search). Unlink with ×.
  - **Writes**: keep both sides in sync — `tasks[i].linkedDocIds` and `docs[j].linkedTaskIds`; `activity {type:'doc_linked', taskId, to: docId}`.
- [x] **P1-D9 Location docs**: in a Space/Folder/List location header, a "Docs" count chip lists docs whose `location` matches, with "+ New Doc". Docs also appear in the sidebar under their location (doc icon rows below the lists).

### Time tracking (SEED workflow)

- [x] **P1-TT1 Global timer start/stop**:
  - Start from: the task view "Track Time ▶" button, the list row "…" › Start timer, the top-bar "+ New › Track time" Timer tab (optional task picker, or none = "No task"), or the play buttons in the timesheet rows.
  - Starting while another timer runs stops the old timer first (creating its entry), then starts the new one; show the toast "Timer stopped on X".
  - **Writes on start**: `timer = {taskId, userId:'u_jordan', start: now ISO, billable: (task in fd_clients ? true : workspace.clickApps.billableDefault), description:'', tagIds:[]}`.
  - Top-bar pill while running: red dot + elapsed `H:MM:SS` + task name + ■ stop. The elapsed display uses a **component-local** 1s tick (`useState`+`setInterval` inside the pill component only). **The tick must never dispatch to the store.** Clicking the pill body opens the timer popover (edit note/billable/tags of the running timer → writes `timer.*`; "Discard" → `timer=null`, no entry).
  - **Writes on stop**: `timeEntries[]` push `{id, taskId, userId, start, end: now, duration: Math.max(1, Math.round((end-start)/1000)), billable, description, tagIds, source:'timer', locked:false, createdAt, updatedAt}`; `timer = null`; `activity {type:'time_tracked', taskId, to: duration}` if taskId.
- [x] **P1-TT2 Manual entry popover** (`time_tracking_manual_popover.jpg`). Opened from the task view time field "+ Add time", the top-bar "+ New › Track time", or the timesheet "+ Track time". Tabs:
  - **Timer**: start/stop (P1-TT1).
  - **Manual**: input "Enter time e.g. 3 hours 20 mins" (parsed live, preview "= 3h 20m"; invalid → red text "Invalid time format"), "When" date picker (default today; with time defaulting to now minus duration), task selector "Select task..." (search tasks; prefilled from context), note input "Enter a note", tags picker (time tags), "$" billable toggle, purple Save (disabled until the duration is valid and > 0).
  - **Range**: start datetime + end datetime pickers (validation end > start, max 24h).
  - **Writes**: `timeEntries[]` push with `source:'manual'`, `start`/`end` computed, `duration` in seconds; `activity time_tracked`.
- [x] **P1-TT3 Duration parser** `parseDuration(str)` (unit-tested logic, used by TT2/TT5). Accepts "2h", "2h 30m", "2h30m", "90m", "1.5h", "2:10" (h:mm), "2:10:30", "2 hours 10 minutes 30 seconds", "45 min", "3 hrs". A bare number ("3", "1.5") is treated as **hours** if ≤ 24, otherwise as minutes ("90" → 90m); document this rule in SCHEMA.md. Returns `null` when invalid or ≤ 0.
- [x] **P1-TT4 Task time entries list**: clicking the "Time tracked 3h 45m" value in the task view opens a popover:
  - Total + a bar vs. estimate.
  - Entries grouped by user: date, "9:00 am – 10:30 am", duration, note, billable $ icon (toggle), tag chips.
  - Row "…": Edit (inline: duration via the parser, date, note, tags, billable → **writes** `timeEntries[i].*` + `updatedAt`; changing the duration keeps `start` and recomputes `end`), Delete (confirm → removes the record).
  - Locked entries (`locked:true`) show a 🔒 icon and can't be edited (tooltip "This time entry is part of a submitted timesheet").
- [x] **P1-TT5 My timesheet — week grid** (`/timesheets?tab=my`; `timesheet_week_grid.png`, `timesheet_rows_timer.png`, `timesheet_summary_billable.png`):
  - Toolbar: "‹ ›" week arrows + a label "Nov 16 - Nov 22 ▾" (week picker) and a "This week" button; Filters (Billable: All / Billable / Non-billable; Tags) and Display (Timesheet | Time entries). The **week** lives in the URL param (not state).
  - Summary card "Your time 18h 35m (Nov 16 – Nov 22)": tracked/40h progress bar, billable donut (teal) with billable and non-billable amounts.
  - Grid:
    - Columns: Task/Location (play button, name, muted "Space / Folder / List"), Mon…Sun (header "Mon, Nov 16" + day total + capacity bar of 8h; today's header purple with a top border), Total, "…".
    - Rows: one per task (or "No task") with entries this week for the current user.
    - Footer: daily totals + week total.
    - Cells show the sum ("1h 15m") or "–".
  - **Cell edit**: click the cell → input; type a duration → Enter.
    - New total > old: push a `timeEntries` record for the difference on that day (start 09:00 local + existing, `source:'timesheet'`).
    - New total < old: reduce or delete entries of that cell, latest first.
    - Empty or 0: delete all entries of that cell (confirm if > 0).
    - Locked weeks are read-only.
  - "+ Add task" row at the bottom: task search → adds an empty row (UI only until time is entered).
  - Row "…": Delete row (confirm "Delete all time entries for this task this week?" → removes them).
  - **Writes**: `timeEntries[]` add/update/remove.
  - The "Time entries" display shows a flat list grouped by day: time range, task, note, tags, billable, duration, with edit/delete as in TT4.
- [x] **P1-TT6 Submit / withdraw timesheet**:
  - Top-right of My timesheet: status badge for the week (Open / Submitted / Approved / Changes requested) + a purple "Submit for approval" button (disabled when the week total is 0 or already submitted/approved). The button opens a review modal: week summary (total, billable, per-day totals), optional note, approver "Elena Petrova" (from `timesheetSettings.approvers`), Cancel / Submit.
  - **Writes**:
    - `timesheets[]` push `{id, userId:'u_jordan', periodStart, periodEnd, status:'submitted', totalSeconds, billableSeconds, entryIds, approverIds, submittedAt, reviewedBy:null, reviewedAt:null, reviewComment:'', history:[{action:'submitted', userId, at, comment}], comments:[]}`, or update the existing record if it was changes_requested/withdrawn (`status:'submitted'`, history `resubmitted`, refreshed totals).
    - `timeEntries[entryIds].locked = true`.
  - **Withdraw** (when submitted, not yet reviewed): "Withdraw" link → confirm → **writes** `status:'withdrawn'`, history entry, entries `locked=false`.
- [x] **P1-TT7 Time estimates**:
  - The task view "Time Estimate" field opens a popover with an input using `parseDuration` (stores minutes) and Clear.
  - The "Time tracked" field shows a progress bar `tracked / estimate`, which turns red when over.
  - List column "Time estimate" and "Time tracked" (P1-T10).
  - **Writes**: `tasks[i].timeEstimate` + `activity estimate_changed`.
- [x] **P1-TT8 Approvals tab** (`/timesheets?tab=approvals`; badge = submissions where Jordan is an approver and status `submitted`):
  - Sub-tabs **To review**, **Changes requested**, **Approved**, **All**. Filters: Timesheet owner (user select) and Time period (week picker).
  - Table: Owner (avatar + name), Period "Nov 9 – Nov 15", Total, Billable, Submitted (relative), Status pill. Click → `/timesheets/approvals/:id`.
- [x] **P1-TT9 Approval detail** (`/timesheets/approvals/:id`; `timesheet_approval_entry.png`):
  - Header: owner avatar + name, period, status pill, totals.
  - Read-only week grid of that user's entries in `entryIds`. A history list ("Submitted by Priya Shah · Nov 16 at 9:12 am").
  - Comments thread: add a comment → `timesheets[i].comments` push.
  - Actions (only if Jordan is an approver and status `submitted`):
    - **Approve** (green check): **writes** `status:'approved', reviewedBy, reviewedAt`, history `approved`; entries stay locked.
    - **Request changes**: a modal with a required comment textarea (error if empty) → **writes** `status:'changes_requested', reviewComment, reviewedBy, reviewedAt`, history; entries `locked=false`.
  - On an approved timesheet, an approver can "Reopen" (P2).
  - For Jordan's own submissions (approver Elena), show a read-only view with Withdraw instead.
- [x] **P1-TT10 All timesheets tab** (`?tab=all`):
  - Member filter (All members / a specific user / team) and a week picker. A table per member: name, Mon–Sun totals, week total, billable total, timesheet status pill. Expand a member row → their per-task rows (read-only).
  - "Insights" summary (`timesheet_insights.png`): total tracked, billable %, top tasks (derived, read-only).

---

## P2 — Secondary Features
<!-- Depth and realism, implement after P1 is complete. -->

- [x] **P2-1 Trash** (`/trash`, from the workspace menu): lists deleted tasks and docs with deleted date/by. Restore (**writes** `deleted:false`, `activity restored`) or "Delete forever" (confirm → removes the record and its subtasks/pages/comments).
- [x] **P2-2 Archived toggle**: the "Archived" filter in list toolbars shows archived tasks with an Unarchive action (**writes** `archived:false`, `activity unarchived`).
- [x] **P2-3 Drag & drop in List view**: reorder rows (`orderIndex`) and drag between status groups (`status`). Drag a Backlog row onto a sidebar sprint → add to sprint. Doc pages drag to reorder/nest.
- [x] **P2-4 Dashboards** (`/dashboards`, rail item): one seeded dashboard "Platform Sprint Dashboard" with derived widgets (Sprint burndown, Velocity, Time tracked this week by user, Tasks by status pie, Overdue tasks list). The widget layout is static, plus an "Add Widget" modal (purple button `#7B68EE`, `sprint_burndown_burnup_cards.png`) to add a widget of a known type (**writes** `dashboards[]` if implemented; add it to the seed + SCHEMA).
- [x] **P2-5 Settings** (`/settings`): Preferences (Theme Light/Dark — dark uses `list_view_3.0_dark.jpg` colours: bg `#1E1E1E`, panel `#252525`, text `#E8E8E8`; Start of week; Time format 12h/24h) → `preferences{}`. ClickApps toggles (Sprint Points, Time Estimates, Time Tracking visibility; billable by default) → `workspace.clickApps`.
- [x] **P2-6 Keyboard shortcuts**: `?` opens a cheat-sheet modal. `T` new task, `L`/`B`/`C` switch view in locations, `Esc` close, `S` focus status in the task modal, `M` assign to me in the task modal, `⌘Enter` submit modals.
- [x] **P2-7 Space/Folder/List creation**: sidebar "+ " › New Space (name, colour, statuses template), New Folder, New List, New Sprint Folder (creates a folder with `isSprintFolder`, default settings, a Backlog list and Sprint 1). **Writes** `spaces[]`/`folders[]`/`lists[]`/`sprints[]`.
- [x] **P2-8 Status management**: Space "…" › Edit statuses modal (rename, recolour, add, reorder, set type). **Writes** `spaces[i].statuses`; tasks with a renamed status are updated too.
- [x] **P2-9 Attachments** via `POST /upload` (multipart, local middleware) → `tasks[i].attachments[] {id, name, url:'/files/<sid>/<name>', size, mime, uploadedBy, createdAt}`. Thumbnail grid in the task view.
- [x] **P2-10 Gantt-lite** view tab: horizontal bars from startDate→dueDate per task, read-only plus drag to change dates.
- [x] **P2-11 Watchers**: eye icon in the task view to watch/unwatch (`watcherIds`).
- [x] **P2-12 Notification for timesheet events**: when Jordan approves or requests changes, push a `notifications` record **for the owner**. This is fine as a structured record, but the Inbox only shows Jordan's own notifications (`notifications[].userId` defaults to `u_jordan` when missing).

---

## Data Seed (implement in createInitialData())
<!-- Dev must create realistic seed data matching these specs. Full field specs & names in data_model.md. -->

- [x] **Workspace / users**: workspace "Lumen Labs" (`ws_9012`), `currentUserId: 'u_jordan'`, 12 users (§3), 3 teams.
- [x] **Hierarchy**: 4 spaces with per-space statuses (Engineering, Marketing, Design, Operations); 4 folders including the Sprint Folder `fd_sprints` "Platform Sprints" with `sprintSettings`; 12 lists including `li_backlog` (`isBacklog`).
- [x] **Sprints**: 4 — `spr_21` done (31/31), `spr_22` done (29/34, spillover tsk_009 + tsk_010 → spr_23), `spr_23` in_progress (current, starts the Monday of the previous week, 14 days, forecast 38), `spr_24` not_started. Dates are relative to today so spr_23 always contains today.
- [x] **Tasks**: ~90 incl. ~6 subtasks, exactly per data_model.md §8 tables. Coverage:
  - ≥10 assigned to Jordan.
  - ≥4 overdue open, ≥4 due today/tomorrow, ≥8 without a due date.
  - Every status used.
  - All 4 priorities + none.
  - 2 archived, 1 deleted.
  - Sprint 23 has a mix of to do / in progress / in review / blocked / complete, with complete tasks' `dateClosed` spread over the sprint days so the burndown has a shape.
  - Checklists on ≥5 tasks.
  - Custom field values on Engineering/Bugs/Marketing/Client tasks.
- [x] **Comments**: ~45 (38 task, 6 doc); 2 threaded replies, 2 assigned comments (1 unresolved assigned to Jordan), reactions on ~8.
- [x] **Activity**: ~80 records consistent with the tasks (a `created` for many, status changes for sprint tasks, sprint_added for spillovers).
- [x] **Docs**: 11 docs (doc_011 archived; 4 wikis) and ~32 pages with 3–10 realistic blocks each, using every block type at least once, including `task_link` blocks referencing sprint tasks. doc_002 is linked to tsk_001/tsk_002 (both sides).
- [x] **Time**:
  - ~75 time entries over 3 weeks. Jordan has ~28 (billable on li_acme/li_northwind tasks; 2 with no task); Priya/Marcus/Diego/Sam ~8 each; Ben ~6. All are on weekdays between 08:30 and 18:30, none in the future.
  - 5 time tags. `timer: null`.
- [x] **Timesheets**: 6 submissions (§18): Jordan W-2 approved, Jordan W-1 submitted (approver Elena), Priya W-1 submitted, Marcus W-1 changes_requested, Diego W-1 submitted, Sam W-2 approved. `entryIds` match real entries, and those entries are `locked:true` (except Marcus's, which are unlocked). `timesheetSettings` per §19.
- [x] **Notifications**: 22 for Jordan over the last 7 days: 9 unread, 4 cleared, 1 saved for later. Types are mixed (assigned, mention, comment, status_changed, due_date, doc_comment, timesheet_submitted ×2, timesheet_approved ×1, sprint_started).
- [x] **Favorites**: spr_23, li_launch, doc_001. `viewSettings: {}`.
- [x] **Volume sanity**: injecting 500 tasks / 1000 time entries must still render (use simple memoisation; no virtualization required).

## SCHEMA.md — Observable State Changes (template; dev fills it in with the final field names)

| User action | Collection(s) | Change |
|---|---|---|
| Create task (inline / modal) | tasks, activity | +1 task `{status, listId, sprintId?, createdBy, createdAt}`; +1 activity `created` |
| Change status / assignee / priority / dates / points / estimate / tags | tasks, activity | field updated + `updatedAt`; `dateClosed` set/cleared on done; +1 activity per field |
| Add subtask / checklist item / resolve item | tasks, activity | +1 task with `parentId` / `checklists[]` mutated |
| Comment / react / resolve (task or doc) | comments | +1 comment / `reactions` / `resolved` |
| Bulk action on N tasks | tasks, activity | N tasks updated, N activities |
| Move / duplicate / archive / delete task | tasks, activity | `listId` / new task / `archived` / `deleted, deletedAt` |
| Save view settings (group/sort/filter/columns) | viewSettings | `viewSettings[locKey]` |
| Inbox read / clear / later | notifications | `read` / `cleared` / `savedForLater` |
| Create sprints | sprints | +N `not_started` |
| Add/remove task to sprint | tasks, activity | `sprintId`, `sprintHistory`; activity `sprint_added/removed` |
| Start sprint | sprints | `status:'in_progress', startedAt, forecastPoints, committedTaskIds` |
| Complete sprint (+spillover) | sprints, tasks, activity | `status:'done', completedAt, completedPoints, completedTaskIds, spilloverTaskIds, spilloverToSprintId`; moved tasks' `sprintId` |
| Sprint settings | folders | `sprintSettings` |
| Create doc / page / edit blocks | docs, docPages | +doc +page / `blocks`, `title`, `updatedAt` |
| Wiki / share / archive / delete doc | docs | `isWiki` / `sharing` / `archived` / `deleted` |
| Link doc ↔ task | tasks, docs, activity | `linkedDocIds` + `linkedTaskIds`; activity `doc_linked` |
| Start timer | timer | `{taskId, userId, start, billable}` |
| Stop timer | timer, timeEntries, activity | `timer=null`; +1 entry `source:'timer', duration` |
| Manual / timesheet cell entry | timeEntries | +1 entry `source:'manual'|'timesheet'` (or adjusted/removed) |
| Edit / delete entry | timeEntries | fields updated / record removed |
| Submit / withdraw timesheet | timesheets, timeEntries | +1 or updated `status:'submitted'|'withdrawn'`; entries `locked` |
| Approve / request changes | timesheets, timeEntries | `status:'approved'|'changes_requested', reviewedBy, reviewedAt, reviewComment`; unlock on changes |
| Favorite toggle | favorites | +/- `{type,id}` |

## Out of Scope
<!-- Dev must NOT implement these. -->
- Authentication / login / signup / SSO / 2FA / password flows. The app starts pre-logged-in as **Jordan Rivera** (`u_jordan`, jordan.rivera@lumenlabs.io). "Log out" is inert or omitted.
- Chat / Channels / DMs, Whiteboards, Clips, ClickUp Brain / AI, Forms, Goals, Docs AI writer — **omit from the UI** (no dead buttons).
- Real integrations, webhooks, email/SMS, calendar sync, CSV/PDF export (toast only).
- Any automation, scheduler, `setInterval` or "simulated teammate activity" that writes to state. The running-timer display tick is component-local only.
- Real network/CDN/fonts/remote images (use `@fontsource/inter`, `lucide-react`, inline SVG).
- A `Go.jsx` page or `/go` React route — `/go` is served by `templates/state-api.js`.
- The words "Mock" or "Clone" anywhere in the UI or `<title>`.
