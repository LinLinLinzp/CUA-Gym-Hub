# clickup_mock Schema

**Base URL**: `http://localhost:5384/`
**Go Endpoint**: `GET /go?sid=<sid>` → `{initial_state, current_state, state_diff}`
**Inject**: `POST /post?sid=<sid>` with body `{"action":"set","state":{...}}`
**Reset**: `POST /post?sid=<sid>` with body `{"action":"reset"}`
**State read**: `GET /state?sid=<sid>` → `{stored_state, has_custom_state, sid}`

App key: `clickup`. State is JSON-safe. `src/data/seed.js` exports the pure,
deterministic `createInitialData()` function. Runtime dates are computed inside
that function; historical timestamps are clamped to the seed clock so they never
appear in the future. The default current user is Jordan Rivera, `u_jordan`.

`src/utils/dataManager.js` is an unchanged copy of the Harbor template. On a
fresh session it merges injected objects over defaults, replaces arrays, and
sends one baseline `set`. One store effect persists each subsequent reducer
snapshot with `set_current`. A refresh uses the session's local cache. The Doc
editor also dispatches `VIEW_DOC` on mount, including direct loads and reloads.
The running timer and toast only update their UI. `/go`, `/state`, `/post`,
`/upload`, and `/files` come from the standard state API in development and
preview and from the Harbor site host in production. Internal navigation
retains a `sid` present in the URL. `reset` restores the session's initial
snapshot. A browser that already loaded the session retains its local cache.

## State Schema

Fields ending in `At`, entry `start`/`end`, and timer `start` are ISO timestamps.
Calendar dates are local `YYYY-MM-DD` strings. New IDs have a type prefix and a
time/random suffix. Seed IDs are fixed. Optional fields can be absent. Every
collection below is an array unless explicitly identified as an object.

| Key | Shape |
|---|---|
| `workspace` | Object: `{id,name,initials,color,plan,clickApps,sprintPointScale:number[]}`. `clickApps` has `sprintPoints,timeTracking,timeEstimates,multipleAssignees,billableDefault` booleans. |
| `currentUserId` | User ID string. Missing/unknown users render a placeholder rather than crashing. |
| `users` | `{id,name,initials,email,role,title,color,timezone,weeklyCapacityHours,status}`. Role: owner/admin/member/guest. Presence is static. |
| `teams` | `{id,name,handle,memberIds:userId[]}`. |
| `spaces` | `{id,name,color,icon,private,memberIds,orderIndex,createdAt,statuses:[{id,name,color,type,orderIndex}]}`. Status type: open/custom/done/closed. |
| `folders` | `{id,spaceId,name,isSprintFolder,orderIndex,hidden,createdAt,sprintSettings?}`. Sprint settings detailed below. |
| `lists` | `{id,spaceId,folderId:null\|id,name,color?,description?,isBacklog,orderIndex,createdAt,archived}`. |
| `sprints` | Sprint records detailed below. |
| `tasks` | Task records detailed below. |
| `customFields` | `{id,name,type,scope:{type,id},options?:[{id,name,color?}],currency?}`. Scope type: space/list/folder. Field type: dropdown/currency/number/text/date/labels. |
| `tags` | `{name,spaceId,fg,bg}`. Task tags store tag **names**. |
| `comments` | `{id,parentType,parentId,pageId?,blockId?,quote?,authorId,text,mentions:userId[],createdAt,updatedAt,resolved,assigneeId,replyToId,reactions:[{emoji,userIds}]}`. Parent type: task/doc. |
| `activity` | `{id,taskId,actorId,type,field,from,to,createdAt}`. Values can be primitives, arrays, objects, or null. |
| `docs` | Doc records detailed below. |
| `docPages` | Page and block records detailed below. |
| `timeEntries` | Time entry records detailed below. |
| `timer` | `null` or `{taskId:null\|id,userId,start,billable,description,tagIds}`. |
| `timeTags` | `{id,name,color}`. Entry tags store these IDs. |
| `timesheets` | Approval submission records detailed below. |
| `timesheetSettings` | Object: `{approvalsEnabled,deadline:{day,time},reminders:{before,after},approvers:{[userId]:userId[]},dailyCapacityHours,weeklyCapacityHours}`. Preferences never run an autonomous scheduler. |
| `notifications` | `{id,userId?,type,actorId,taskId?,docId?,timesheetId?,commentId?,text,createdAt,read,cleared,savedForLater}`. Missing `userId` belongs to the current viewer; explicitly addressed notifications are visible only to that user. |
| `favorites` | `{type,id}`. Type: task/doc/list/folder/space/sprint/everything. |
| `viewSettings` | Object keyed by `everything`, `space:<id>`, `folder:<id>`, `list:<id>`, `sprint:<id>`. Fields below. |
| `preferences` | Object: `{theme:'light'\|'dark',startOfWeek:'monday'\|'sunday',timeFormat:'12h'\|'24h'}`. |
| `dashboards` | `{id,name,widgets:string[]}`. Types: sprint_burndown/velocity/time_by_user/tasks_by_status/overdue. Widgets derive their data on render. |
| `trash` | Optional empty compatibility array. Trash is derived from `tasks[].deleted` and `docs[].deleted`, not this array. |

### Tasks

```js
{
  id, name, description, status, priority, assigneeIds: [], watcherIds: [],
  tags: [], listId, sprintId: null, sprintHistory: [], parentId: null,
  startDate: null, dueDate: null, timeEstimate: null, sprintPoints: null,
  customFields: {}, checklists: [], linkedDocIds: [],
  dependencies: {waitingOn: [], blocking: []}, orderIndex,
  createdBy, createdAt, updatedAt, dateClosed: null, closedBy: null,
  archived: false, deleted: false, deletedAt: null, deletedBy: null,
  attachments: [] // optional until first upload
}
```

`status` is a lower-case Space status name, not a status ID. A task is done when
its status type is done or closed. Changing the status to a done or closed type
sets `dateClosed` and `closedBy`. Changing it to an open type clears both.
`priority` is urgent/high/normal/low/null.
`timeEstimate` is **minutes**; `sprintPoints` is an integer or null. `customFields`
map field ID to option ID (dropdown), option ID array (labels), number
(currency/number), or string (text/date). Currency numbers display two decimals.

A checklist is `{id,name,items:[{id,name,resolved,assigneeId}]}`. An attachment is
`{id,name,url,size,mime,uploadedBy,createdAt}`. Upload URLs are local
`/files/<sid>/<stored-name>`. `dependencies` contain task IDs. Linked Doc IDs
stay symmetric with `docs[].linkedTaskIds`. Subtasks are tasks with `parentId`;
list/sprint/deletion changes on parents propagate to children. A task's home
`listId` does not change when it joins a sprint.

### Sprints and Sprint Folder settings

```js
{
  id, folderId, spaceId, index, name, startDate, endDate,
  status: 'not_started' | 'in_progress' | 'done', goal,
  forecastPoints: null, startedAt: null, startedBy: null,
  completedAt: null, completedBy: null, completedPoints: null,
  committedTaskIds: [], completedTaskIds: [], spilloverTaskIds: [],
  spilloverToSprintId: null, createdAt, createdBy
}
```

Start locks `forecastPoints` and the committed task ID snapshot. Completion
records completed points/IDs and selected unfinished IDs. Both stored point
snapshots sum `tasks[].sprintPoints`, including when the folder’s live effort
display is configured to show estimate hours. The selected or default
destination is a sprint ID, `'backlog'` (task `sprintId=null`), or null (keep
tasks in place). A done sprint cannot be restarted. Reports include committed
tasks that have since spilled over, so old reports remain populated.

```js
sprintSettings: {
  nameTemplate, durationDays, startDay, dateFormat,
  measureOfEffort: 'sprint_points' | 'time_estimates', nonWorkingDays,
  automations: {autoCreate,autoCreateCount,autoMarkDone,moveSpilloverToNext},
  backlogListId
}
```

Auto-create is applied only when the user completes a sprint. Auto-mark-done is
a stored preference, never executed on a timer. All charts are derived, not
persisted.

### Docs and pages

```js
// docs[]
{
  id,title,icon,location:{type:'workspace'|'space'|'folder'|'list',id:null|id},
  ownerId,isWiki,tags:[],
  sharing:{visibility:'workspace'|'private'|'public',defaultPermission,
    memberIds:[],memberPermissions:{[userId]:permission},publicLinkEnabled},
  linkedTaskIds:[],archived,deleted,deletedAt,deletedBy?,
  createdAt,createdBy,updatedAt,updatedBy,lastViewedAt
}
// docPages[]
{
  id,docId,parentPageId:null,title,icon:null,
  cover:null|{type:'gradient',value},orderIndex,
  blocks:[{id,type,text?,checked?,taskId?}],
  createdAt,createdBy,updatedAt,updatedBy
}
```

Permissions are full/edit/comment/view. Block types: paragraph/h1/h2/h3/bullet/
numbered/todo/quote/code/divider/callout/task_link. Task-link blocks resolve their
task ID live. Text stores plain text with optional Markdown inline marks. Editing
a page updates both page and parent Doc timestamps. The editor records
`lastViewedAt` on mount and when the Doc ID changes. The last page cannot be
deleted. Deleting a page removes its descendants. Duplication gives pages,
blocks, and checklists fresh IDs.

### Time and approvals

```js
// timeEntries[] — duration is integer SECONDS
{
  id,taskId:null,userId,start,end,duration,billable,description,tagIds:[],
  source:'timer'|'manual'|'timesheet',locked:false,createdAt,updatedAt
}
// timesheets[]
{
  id,userId,periodStart,periodEnd,
  status:'submitted'|'approved'|'changes_requested'|'withdrawn',
  totalSeconds,billableSeconds,entryIds:[],approverIds:[],submittedAt,
  reviewedBy:null,reviewedAt:null,reviewComment:'',
  history:[{action,userId,at,comment}],
  comments:[{id,userId,text,createdAt}]
}
```

`parseDuration` accepts `2h`, `2h30m`, `90m`, `1.5h`, `2:10`, `2:10:30`, and full
unit words. A bare number <=24 is hours; a larger bare number is minutes.
Invalid, zero, and negative inputs return null. Manual ranges must be positive
and at most 24 hours. Editing a duration with the date unchanged preserves the
start and recomputes the end. The edit form prefills the duration to whole
minutes, so saving a different field can also shorten a sub-minute remainder.
Stopping a timer records at least one second. Starting another timer stops the
previous one first. Discard creates no entry.

Week periods are Monday–Sunday. Cell increases append only the delta; decreases
reduce/delete latest entries first. Clearing a nonempty cell requires UI
confirmation. Submission snapshots totals and entry IDs, then locks the listed
entries and disables cell edits for the week. Global manual/range entry and
timer stop can still add entries dated within that period. Withdrawal or
requesting changes unlocks the snapshot entries. Approval retains their locks.
Only an approver listed in the submission can review, and only the owner can
withdraw a submitted sheet. Review notifications address the owner explicitly.

### View settings and UI-only state

```js
{
  view:'list'|'board'|'calendar'|'report'|'gantt',
  groupBy:'status'|'assignee'|'priority'|'tags'|'dueDate'|'none',
  groupDir:'asc'|'desc',sortBy:null,sortDir:'asc'|'desc',
  showClosed:false,showArchived:false,showInSprints:false,
  subtasks:'collapsed'|'expanded'|'separate',meMode:false,
  columns:['assigneeIds','dueDate','priority'],
  filters:[{id,field,op:'is'|'is_not'|'is_set'|'is_not_set',value}]
}
```

Filter fields: status/assignee/priority/tags/dueDate/sprintPoints/sprint.
Due-date values: overdue/today/this_week/no_date. Optional columns: sprintPoints,
sprintId,tags,timeTracked,timeEstimate,startDate,createdAt,customField:<id>.
Compatibility aliases `assignee` and `sprint` also render. Search, selection,
recently opened work, collapsed groups, calendar month, sidebar expansion,
unsaved form input, and blank timesheet rows are local UI state. Timesheet week
and active hub tab live in the URL, not business state.

### Default IDs

- **Current user**: `u_jordan` (Jordan Rivera). Other users: `u_priya`, `u_marcus`, `u_elena`, `u_sam`, `u_hannah`, `u_diego`, `u_olivia`, `u_noah`, `u_aisha`, `u_ben`, `u_grace`.
- **Spaces**: `sp_eng` (Engineering), `sp_mkt` (Marketing), `sp_design` (Design), `sp_ops` (Operations).
- **Folders**: `fd_sprints` (Platform Sprints, Sprint Folder), `fd_platform`, `fd_campaigns`, `fd_clients`.
- **Lists**: `li_backlog` (Backlog, in `fd_sprints`), `li_api`, `li_bugs`, `li_infra`, `li_launch`, `li_content`, `li_events`, `li_dsys`, `li_research`, `li_acme`, `li_northwind`, `li_hiring`.
- **Sprints**: `spr_21` (done), `spr_22` (done, spillover → `spr_23`), `spr_23` (in_progress, contains today), `spr_24` (not_started).
- **Tasks**: `tsk_001` through `tsk_092` plus `tsk_001a`, `tsk_001b`, `tsk_002a`, `tsk_002b`, and `tsk_004a` (97 total, 5 subtasks, 2 archived, 1 deleted).
- **Sample docs**: `doc_001` … `doc_011` (`doc_002` linked to `tsk_001`/`tsk_002`; `doc_011` archived).
- **Timesheets**: `tsh_001` … `tsh_006`.
- **Workspace**: `ws_9012` ("Lumen Labs").

## Minimal Inject Example

```json
{
  "currentUserId": "u_jordan",
  "users": [
    { "id": "u_jordan", "name": "Jordan Rivera", "initials": "JR", "email": "jordan.rivera@lumenlabs.io", "role": "owner", "title": "Head of Product Engineering", "color": "#7B68EE" }
  ],
  "spaces": [
    { "id": "sp_eng", "name": "Engineering", "color": "#3E63DD", "icon": "E", "orderIndex": 0, "statuses": [{ "id": "st_todo", "name": "to do", "color": "#87909E", "type": "open", "orderIndex": 0 }, { "id": "st_done", "name": "complete", "color": "#30A46C", "type": "done", "orderIndex": 1 }] }
  ],
  "folders": [],
  "lists": [
    { "id": "li_backlog", "spaceId": "sp_eng", "folderId": null, "name": "Backlog", "isBacklog": true, "orderIndex": 0, "archived": false }
  ],
  "sprints": [],
  "tasks": [
    { "id": "tsk_inject_1", "name": "Injected task", "description": "", "status": "to do", "priority": null, "assigneeIds": ["u_jordan"], "watcherIds": [], "tags": [], "listId": "li_backlog", "sprintId": null, "sprintHistory": [], "parentId": null, "startDate": null, "dueDate": null, "timeEstimate": null, "sprintPoints": null, "customFields": {}, "checklists": [], "linkedDocIds": [], "dependencies": { "waitingOn": [], "blocking": [] }, "orderIndex": 1000, "createdBy": "u_jordan", "createdAt": "2026-01-01T09:00:00.000Z", "updatedAt": "2026-01-01T09:00:00.000Z", "dateClosed": null, "closedBy": null, "archived": false, "deleted": false }
  ],
  "timer": null
}
```

Arrays in the injected `state` fully replace the corresponding default array (e.g. supplying `tasks` above replaces all seeded tasks); omitted top-level keys keep their seeded defaults via `mergeWithDefaults`.

## Observable State Changes (for LLM evaluation)

All action rows refer to reducer actions in `src/store/reducer.js`. Task updates
append activity for each business field changed, with actor ID, old/new values,
and a current ISO timestamp. Metadata (`deletedAt`, `deletedBy`, `dateClosed`,
`closedBy`) is written with its business action and does not create separate
activity records. Assign to me and the M shortcut add the current user while
preserving existing assignees. Multiple synchronous actions may be persisted together
as one complete state snapshot.

| User action | Collection(s) | Exact change / example |
|---|---|---|
| Inline/modal task creation | tasks, activity | Append task with fixed defaults and requested `name,listId,status,assigneeIds,dates,priority,tags,sprintPoints,sprintId`; append `created`. |
| Rename task / edit description | tasks, activity | `name` / `description`, `updatedAt`; activity `renamed` / `description_changed`. |
| Change status | tasks, activity | `status,updatedAt,dateClosed,closedBy`; `status_changed`. |
| Add/remove assignees | tasks, activity | `assigneeIds,updatedAt`; one `assignee_added/assignee_removed` per user. |
| Edit priority / start / due | tasks, activity | `priority,startDate,dueDate,updatedAt`; corresponding `_changed` activities. |
| Set points / estimate | tasks, activity | `sprintPoints` (integer/null), `timeEstimate` (minutes/null); `points_changed/estimate_changed`. |
| Add/remove/create tag | tasks, tags, activity | Task `tags`; optional new space-scoped tag; `tag_added/tag_removed`. |
| Edit custom field | tasks, activity | `customFields[cfId]`, `updatedAt`; `custom_field_changed` with `field=cfId`. |
| Add subtask | tasks, activity | Append child with `parentId` and parent's list/sprint; `subtask_added` on parent. |
| Checklist create/rename/delete/item edits | tasks, activity | Replace `checklists`, set `updatedAt`; `checklist_changed`. |
| Resolve checklist item | tasks, activity | `checklists[].items[].resolved`; `checklist_item_resolved` with item name. |
| Add/edit/delete comment | comments | Append record; edit `text,mentions,updatedAt`; remove comment and replies on deletion. |
| Reply / mention / assign comment | comments | `replyToId`, parsed `mentions`, `assigneeId`, optional doc `pageId,blockId,quote`. |
| React / resolve comment | comments | Toggle current user in `reactions[].userIds`; set `resolved,updatedAt`. |
| Move task | tasks, activity | `listId,updatedAt`, children follow; `moved` from/to list IDs. |
| Duplicate task | tasks, docs, activity | Append task with fresh task/checklist/item IDs, title `(copy)`; synchronize retained Doc links; append `created`. |
| Archive/unarchive task + Undo | tasks, activity | `archived,updatedAt`; `archived/unarchived`. |
| Delete/restore task | tasks, activity | `deleted,deletedAt,deletedBy,updatedAt`, children follow; `deleted/restored`. |
| Bulk task action | tasks, activity | Apply the relevant field mutation independently to each selected task. |
| Drag row/card | tasks, activity | `orderIndex` and group field (`status/assigneeIds/priority`), `updatedAt`; activities. |
| Reschedule Calendar/Gantt | tasks, activity | `dueDate` and/or `startDate`, `updatedAt`; date activities. |
| Change active view, group, sort, columns, filters, or visibility toggles | viewSettings | Merge `viewSettings[locKey]` with fields such as `view`, `groupBy`, `sortBy`, `columns`, `filters`, `meMode`, `showClosed`, `showArchived`, `showInSprints`, and `subtasks`. |
| Favorite toggle | favorites | Append/remove `{type,id}`, e.g. `{type:'sprint',id:'spr_23'}`. |
| Rename hierarchy | lists, folders, sprints, spaces | Matching record `name`. |
| Mark read / clear / later / all | notifications | `read`, `cleared`, `savedForLater`, limited to current viewer. |
| Create Sprints | sprints | Append 1–10 not_started records, dates/names generated from folder settings. |
| Add/remove Sprint | tasks, activity | `sprintId,sprintHistory,updatedAt`, children follow; `sprint_added/sprint_removed`. |
| Start Sprint | sprints | `status,startedAt,startedBy,forecastPoints,committedTaskIds`. |
| Complete Sprint | sprints, tasks, activity | Completion snapshot fields (`completedTaskIds` includes completed subtasks; summary counts use top-level tasks); selected tasks move to destination; optional new sprint(s). |
| Edit Sprint dates / delete empty unstarted Sprint | sprints | `startDate,endDate` (end >= start); remove only if not_started and task-free. |
| Sprint Folder settings | folders | Replace matching `sprintSettings` object. |
| Create Doc | docs, docPages | Append Doc and its first empty paragraph page, with author/location/timestamps. |
| Enter or reload the Doc editor | docs | `lastViewedAt` on editor mount or Doc ID change. |
| Edit Doc title/icon/tags/wiki/location | docs | Requested fields plus `updatedAt,updatedBy`. |
| Add/duplicate/delete page | docPages | Append a page with timestamps and an empty paragraph, append a copy with fresh block IDs, or remove the page and its descendants. |
| Rename/reorder/nest page | docPages, docs | Page `title`, `orderIndex`, or `parentPageId`, with page and parent Doc edit metadata. |
| Edit/insert/delete/convert block, toggle todo | docPages, docs | `blocks`, page and Doc `updatedAt,updatedBy`. |
| Page cover/icon | docPages, docs | `cover:{type,value}` or null; `icon`; timestamps. |
| Share/invite/member permissions/public link | docs | `sharing.visibility/defaultPermission/memberIds/memberPermissions/publicLinkEnabled`, timestamps. |
| Duplicate/archive/delete/restore Doc | docs, docPages | Copy with fresh IDs / `archived` / `deleted,deletedAt,deletedBy`; restore clears deletion flag. |
| Link/unlink Doc and task | tasks, docs, activity | Symmetric `linkedDocIds/linkedTaskIds`, timestamps; `doc_linked/doc_unlinked`. |
| Add/remove task dependency | tasks, activity | `dependencies.waitingOn/blocking`, `updatedAt`; `dependencies_changed`. |
| Start/edit/discard timer | timer | Timer object; change `description,billable,tagIds`; discard sets null. |
| Stop/replace timer | timer, timeEntries, activity | Append timer-sourced entry, duration >=1; clear/replace timer; `time_tracked` for linked task. |
| Manual / Range time entry | timeEntries, activity | Append `source:'manual'`, start/end/duration/task/note/tags/billable; `time_tracked`. Billable defaults to true for tasks in `fd_clients`, otherwise `workspace.clickApps.billableDefault`; selecting another task updates the form default. |
| Edit/delete unlocked time entry | timeEntries | Requested fields + `updatedAt`, recomputed end; remove record on delete. |
| Edit timesheet day cell | timeEntries, activity | Append delta with `source:'timesheet'` and task activity, or reduce/remove latest entries. |
| Delete timesheet row | timeEntries | Remove unlocked entries for that task/user/week. |
| Submit/resubmit | timesheets, timeEntries | Submission snapshot and history; `locked=true` on included entries. |
| Withdraw | timesheets, timeEntries | `status:'withdrawn'`, history; `locked=false`. |
| Approve / request changes / reopen | timesheets, timeEntries, notifications | Review status/actor/date/comment/history; unlock changes_requested; add owner-addressed notification. |
| Approval comment | timesheets | Append `comments[]{id,userId,text,createdAt}`. |
| Permanently delete task/Doc | tasks/docs, comments, activity/docPages | Remove object and children/pages/comments; clean symmetric Doc-task references. |
| Preferences / ClickApps | preferences, workspace | Merge chosen preference / `workspace.clickApps` values. |
| New Space/Folder/List/Sprint Folder | spaces/folders/lists/sprints | Append record; Sprint Folder also creates Backlog and initial Sprint. |
| Manage statuses | spaces, tasks, activity | Replace `statuses`; migrate task names and closure fields for renamed statuses. |
| Upload attachment | tasks, activity | Append metadata in `attachments`; `attachment_added`. File bytes reside outside JSON state. |
| Watch/unwatch | tasks, activity | Toggle viewer ID in `watcherIds`; `watchers_changed`. |
| Add dashboard widget | dashboards | Append known type to matching `widgets`. |
| Copy link/ID or export | none | UI-only clipboard/toast. |

## Developer validation

- `npm test`: duration formats, task history/closure/child propagation, Sprint
  completion/spillover, Doc links and last-page guard, timer entries, timesheet
  submission/locking/review, and seed integrity.
- `npm run check:render`: 30 route cases × seed/empty/large worlds (500 tasks,
  1,000 time entries).
- `npm run check:client`: DOM client checks for boot, session navigation, task
  updates, modal interactions, time tracking, and no idle/timer-display saves.
- `npm run build`: offline static build.

Round 1 browser findings are recorded in `TEST.md`. This developer revision
adds regression checks for form submission, viewport-aware and nested popovers,
assignment, grouped selection, mentions, slash commands, billable defaults,
and seed timestamps. Real-browser visual review and Harbor/Playwright retesting
remain with the test agent; developer checks do not replace that certification.
