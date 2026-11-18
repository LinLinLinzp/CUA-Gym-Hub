# ClickUp Mock — Data Model

> Source of truth for `src/data/seed.js` → `createInitialData()` and for `SCHEMA.md`.
> App key for dataManager: `APP = 'clickup'`.
> All state must be JSON-serialisable (ISO strings, numbers, arrays, plain objects).

## 0. Conventions

| Rule | Detail |
|------|--------|
| IDs | Fixed, prefixed, human-readable in seed (`tsk_001`, `doc_003`, `te_042`). New records created at runtime: `<prefix>_<Date.now().toString(36)><2 random base36 chars>` (e.g. `tsk_lz3k9a7f`). |
| Timestamps | `createdAt`, `updatedAt`, `dateClosed`, `submittedAt`, ... are full ISO strings from `new Date().toISOString()`. |
| Calendar dates | `startDate`, `dueDate`, sprint `startDate`/`endDate`, timesheet `periodStart`/`periodEnd` are `'YYYY-MM-DD'` strings (local date). |
| Durations | Time entries: `duration` in **integer seconds**. Task `timeEstimate`: **integer minutes**. Display helpers convert to `"1h 30m"`. |
| Money | Currency custom fields store numbers with 2 decimals (`4500.00` stored as number `4500`; display `$4,500.00`). |
| Status values | Task `status` is the lowercase status name of its Space (`'to do'`, `'in progress'`, `'in review'`, `'complete'`, `'closed'`) — same as ClickUp API. Status colour/type are looked up from `spaces[].statuses`. |
| Priority | `'urgent' | 'high' | 'normal' | 'low' | null` (ClickUp API names). |
| Seed dates | Relative to "today" computed **inside** `createInitialData()` from `new Date()` (runtime clock is frozen per task, so this is deterministic). Helper: `d(offsetDays) → 'YYYY-MM-DD'`, `ts(offsetDays, 'HH:MM') → ISO`. Never call `new Date()` at module top level; seed.js must be importable by Node (vite.config.js) — no `window`, no DOM. |
| No randomness in seed | Never `Math.random()` in `createInitialData()`; use explicit arrays / deterministic loops. |
| Robustness | Every array may be empty or missing in injected state; every optional field may be missing. Always read with `(state.tasks || [])`, `task.assigneeIds || []`, etc. |

Let `TODAY = startOfDay(new Date())`, `S = Monday of the ISO week of TODAY minus 7 days` (start of the current sprint). Example: if today is Wed 2026-11-18, `S = 2026-11-09`, current sprint = 11/9–11/22.

---

## 1. Top-level shape

```js
{
  workspace: {...},            // §2
  currentUserId: 'u_jordan',
  users: [...],                // §3 (12)
  teams: [...],                // §3b (user groups, 3)
  spaces: [...],               // §4 (4, each with statuses)
  folders: [...],              // §5 (4, one is a Sprint Folder)
  lists: [...],                // §6 (12)
  sprints: [...],              // §7 (4)
  tasks: [...],                // §8 (~90 incl. subtasks)
  customFields: [...],         // §9 (6)
  tags: [...],                 // §10 (~16)
  comments: [...],             // §11 (~45)
  activity: [...],             // §12 (~80)
  docs: [...],                 // §13 (10)
  docPages: [...],             // §14 (~32)
  timeEntries: [...],          // §15 (~75)
  timer: null,                 // §16 running timer or null
  timeTags: [...],             // §17 (5)
  timesheets: [...],           // §18 (6 submissions)
  timesheetSettings: {...},    // §19
  notifications: [...],        // §20 (~22)
  favorites: [...],            // §21
  viewSettings: {},            // §22 (keyed by location)
  trash: []                    // §23 (ids of soft-deleted objects, optional helper)
}
```

---

## 2. workspace

```js
{
  id: 'ws_9012',
  name: 'Lumen Labs',
  initials: 'L',
  color: '#E5484D',
  plan: 'Business Plus',
  clickApps: { sprintPoints: true, timeTracking: true, timeEstimates: true, multipleAssignees: true, billableDefault: false },
  sprintPointScale: [1, 2, 3, 5, 8, 13]
}
```

## 3. users (12)

| id | name | initials | email | role | title | color |
|----|------|----------|-------|------|-------|-------|
| u_jordan | Jordan Rivera | JR | jordan.rivera@lumenlabs.io | owner | Head of Product Engineering | #7B68EE |
| u_priya | Priya Shah | PS | priya.shah@lumenlabs.io | member | Senior Backend Engineer | #0091FF |
| u_marcus | Marcus Chen | MC | marcus.chen@lumenlabs.io | member | Frontend Engineer | #30A46C |
| u_elena | Elena Petrova | EP | elena.petrova@lumenlabs.io | admin | Engineering Manager | #AB4ABA |
| u_sam | Sam Okafor | SO | sam.okafor@lumenlabs.io | member | QA Engineer | #F76B15 |
| u_hannah | Hannah Kim | HK | hannah.kim@lumenlabs.io | member | Product Designer | #E93D82 |
| u_diego | Diego Alvarez | DA | diego.alvarez@lumenlabs.io | member | DevOps Engineer | #12A594 |
| u_olivia | Olivia Bennett | OB | olivia.bennett@lumenlabs.io | admin | Marketing Lead | #E5484D |
| u_noah | Noah Williams | NW | noah.williams@lumenlabs.io | member | Content Strategist | #3E63DD |
| u_aisha | Aisha Rahman | AR | aisha.rahman@lumenlabs.io | member | Growth Marketer | #FFB224 |
| u_ben | Ben Carter | BC | ben.carter@lumenlabs.io | member | Operations Manager | #8E4EC6 |
| u_grace | Grace Liu | GL | grace.liu@lumenlabs.io | guest | People Ops Partner | #0D74CE |

Extra fields on every user: `timezone: 'America/New_York'`, `weeklyCapacityHours: 40`, `status: 'online'|'away'|'offline'` (jordan/priya/marcus online; others offline — static, never toggled automatically). Avatars are generated initials circles (no images).

### 3b. teams (user groups)

```js
[
  { id: 'tm_platform', name: 'Platform Team', handle: '@platform', memberIds: ['u_jordan','u_priya','u_marcus','u_elena','u_sam','u_diego'] },
  { id: 'tm_marketing', name: 'Marketing', handle: '@marketing', memberIds: ['u_olivia','u_noah','u_aisha'] },
  { id: 'tm_ops', name: 'Operations', handle: '@ops', memberIds: ['u_ben','u_grace','u_hannah'] }
]
```

## 4. spaces (4)

```js
{
  id: 'sp_eng', name: 'Engineering', color: '#3E63DD', icon: 'E',   // icon letter shown in 20px rounded square
  private: false, memberIds: [...], orderIndex: 0,
  statuses: [
    { id: 'st_eng_todo',   name: 'to do',       color: '#87909E', type: 'open',   orderIndex: 0 },
    { id: 'st_eng_prog',   name: 'in progress', color: '#0091FF', type: 'custom', orderIndex: 1 },
    { id: 'st_eng_review', name: 'in review',   color: '#AB4ABA', type: 'custom', orderIndex: 2 },
    { id: 'st_eng_block',  name: 'blocked',     color: '#E5484D', type: 'custom', orderIndex: 3 },
    { id: 'st_eng_done',   name: 'complete',    color: '#30A46C', type: 'done',   orderIndex: 4 },
    { id: 'st_eng_closed', name: 'closed',      color: '#30A46C', type: 'closed', orderIndex: 5 }
  ],
  createdAt
}
```

| id | name | color | statuses (name:color:type) |
|----|------|-------|----------------------------|
| sp_eng | Engineering | #3E63DD | as above |
| sp_mkt | Marketing | #E5484D | to do:#87909E:open, in progress:#0091FF:custom, review:#F76B15:custom, complete:#30A46C:done, closed:#30A46C:closed |
| sp_design | Design | #12A594 | to do:#87909E:open, in progress:#0091FF:custom, in review:#AB4ABA:custom, complete:#30A46C:done, closed:#30A46C:closed |
| sp_ops | Operations | #8E4EC6 | open:#87909E:open, in progress:#0091FF:custom, waiting:#FFB224:custom, complete:#30A46C:done, closed:#30A46C:closed |

"Done" semantics: a task is **closed/complete** when its status type is `done` or `closed`. Setting such a status sets `dateClosed = now`; reopening clears it.

## 5. folders (4)

```js
{ id, spaceId, name, isSprintFolder: false, orderIndex, hidden: false, createdAt }
```
| id | space | name | isSprintFolder |
|----|-------|------|----------------|
| fd_sprints | sp_eng | Platform Sprints | true |
| fd_platform | sp_eng | Platform | false |
| fd_campaigns | sp_mkt | Campaigns | false |
| fd_clients | sp_ops | Client Work | false |

Sprint Folder extra field:
```js
sprintSettings: {
  nameTemplate: 'Sprint {INDEX} ({START_DATE} - {END_DATE})',
  durationDays: 14,
  startDay: 'monday',
  dateFormat: 'M/D',
  measureOfEffort: 'sprint_points',     // 'sprint_points' | 'time_estimates'
  nonWorkingDays: ['saturday','sunday'],
  automations: {
    autoCreate: false, autoCreateCount: 2,
    autoMarkDone: true,                  // display only; never fires on a timer
    moveSpilloverToNext: true
  },
  backlogListId: 'li_backlog'
}
```

## 6. lists (12)

```js
{ id, spaceId, folderId /* null = folderless */, name, color /* optional */, description, isBacklog: false, orderIndex, createdAt, archived: false }
```
| id | space | folder | name | notes |
|----|-------|--------|------|-------|
| li_backlog | sp_eng | fd_sprints | Backlog | `isBacklog: true` |
| li_api | sp_eng | fd_platform | API & Integrations | |
| li_bugs | sp_eng | fd_platform | Bug Tracker | |
| li_infra | sp_eng | null | Infrastructure | |
| li_launch | sp_mkt | fd_campaigns | Q4 Product Launch | |
| li_content | sp_mkt | fd_campaigns | Content Calendar | |
| li_events | sp_mkt | null | Events & Webinars | |
| li_dsys | sp_design | null | Design System | |
| li_research | sp_design | null | User Research | |
| li_acme | sp_ops | fd_clients | Acme Corp Onboarding | billable client work |
| li_northwind | sp_ops | fd_clients | Northwind Retainer | billable client work |
| li_hiring | sp_ops | null | Hiring Pipeline | |

## 7. sprints (4)

A sprint is a time-boxed List inside a Sprint Folder. Tasks join a sprint via `task.sprintId` (their home `listId` stays, e.g. Backlog).

```js
{
  id: 'spr_23', folderId: 'fd_sprints', spaceId: 'sp_eng',
  index: 23,
  name: 'Sprint 23 (11/9 - 11/22)',        // generated from nameTemplate at creation; user can rename
  startDate: 'YYYY-MM-DD', endDate: 'YYYY-MM-DD',
  status: 'not_started' | 'in_progress' | 'done',
  goal: 'Ship token refresh + webhook retries',   // optional sprint goal text
  forecastPoints: 38 | null,      // locked total points when sprint was started
  startedAt: ISO | null, startedBy: userId | null,
  completedAt: ISO | null, completedBy: userId | null,
  completedPoints: number | null, // points of tasks closed when marked done
  committedTaskIds: [],           // task ids in sprint at start (forecast)
  completedTaskIds: [],           // closed tasks at completion
  spilloverTaskIds: [],           // incomplete tasks at completion
  spilloverToSprintId: null,      // sprint id | 'backlog' | null (left in place)
  createdAt, createdBy
}
```
| id | index | dates | status | forecast | completed | notes |
|----|-------|-------|--------|----------|-----------|-------|
| spr_21 | 21 | S-28 → S-15 | done | 31 | 31 | all tasks complete |
| spr_22 | 22 | S-14 → S-1 | done | 34 | 29 | spillover: tsk_009, tsk_010 → spr_23 (`spilloverToSprintId: 'spr_23'`) |
| spr_23 | 23 | S → S+13 | in_progress | 38 | null | current sprint |
| spr_24 | 24 | S+14 → S+27 | not_started | null | null | 3 planned tasks |

Derived (never stored): sprint total points = Σ `sprintPoints` of non-deleted tasks with `sprintId === sprint.id` (+ subtasks if rollup); done points = same filtered to closed tasks; burndown series from tasks' `dateClosed`.

## 8. tasks (~90)

```js
{
  id: 'tsk_001',
  name: 'Implement token refresh for mobile API clients',
  description: 'Plain text with \n newlines. Lines starting with "- " render as bullets.',
  status: 'in progress',
  priority: 'high',
  assigneeIds: ['u_priya'],
  watcherIds: ['u_jordan','u_priya'],
  tags: ['backend','security'],          // tag names (see §10)
  listId: 'li_backlog',
  sprintId: 'spr_23' | null,
  sprintHistory: ['spr_22','spr_23'],    // every sprint the task has been in (spillover trail)
  parentId: null,                        // subtask → parent task id (same list)
  startDate: 'YYYY-MM-DD' | null,
  dueDate: 'YYYY-MM-DD' | null,
  timeEstimate: 480 | null,              // minutes
  sprintPoints: 5 | null,
  customFields: { cf_component: 'opt_api' },
  checklists: [
    { id: 'ck_001', name: 'Release checklist', items: [
      { id: 'cki_001', name: 'Update OpenAPI spec', resolved: true,  assigneeId: 'u_priya' },
      { id: 'cki_002', name: 'Add integration tests', resolved: false, assigneeId: null }
    ] }
  ],
  linkedDocIds: ['doc_003'],
  dependencies: { waitingOn: [], blocking: [] },   // task ids
  orderIndex: 1000,                      // for manual ordering within list
  createdBy: 'u_elena', createdAt: ISO, updatedAt: ISO,
  dateClosed: ISO | null, closedBy: userId | null,
  archived: false,
  deleted: false, deletedAt: null, deletedBy: null
}
```
Derived (never stored): `timeTracked` = Σ timeEntries.duration for task; subtask count; checklist progress.

### Seed task list (implement all; descriptions 1–4 sentences, realistic)

Offsets are days relative to TODAY unless prefixed `S` (sprint start). Status abbreviations: TD=to do, IP=in progress, IR=in review, BL=blocked, CO=complete. P: U/H/N/L/– = urgent/high/normal/low/null.

**Sprint 23 (in progress) — listId li_backlog, sprintId spr_23 (12 tasks, 38 pts)**
| id | name | status | P | assignees | pts | due | tags |
|----|------|--------|---|-----------|-----|-----|------|
| tsk_001 | Implement token refresh for mobile API clients | IP | H | priya | 5 | +2 | backend, security |
| tsk_002 | Webhook delivery retries with exponential backoff | IP | H | priya, diego | 8 | +4 | backend |
| tsk_003 | Redesign notification settings page | IR | N | marcus | 3 | +1 | frontend |
| tsk_004 | Migrate billing service to Postgres 16 | IP | U | diego | 5 | 0 (today) | infra |
| tsk_005 | Add rate-limit headers to public API | CO (closed S+2) | N | priya | 2 | -3 | backend |
| tsk_006 | Fix flaky checkout E2E tests | CO (closed S+3) | H | sam | 3 | -4 | qa, tech-debt |
| tsk_007 | Dark mode tokens for dashboard widgets | CO (closed S+6) | L | marcus | 2 | -1 | frontend |
| tsk_008 | Audit logging for admin actions | TD | N | elena | 3 | +6 | security |
| tsk_009 | Bulk export tasks to CSV | IP | N | marcus | 3 | -1 (overdue) | frontend, customer-request (spillover from spr_22, sprintHistory ['spr_22','spr_23']) |
| tsk_010 | Search indexing for archived docs | BL | N | priya | 2 | +3 | backend (spillover from spr_22) |
| tsk_011 | Load test webhook pipeline at 5k rps | TD | L | sam, diego | 1 | +8 | qa |
| tsk_012 | Release notes for v4.12 | CO (closed S+8) | L | jordan | 1 | -2 | docs |

Subtasks: tsk_001 → `tsk_001a` "Persist refresh token in secure storage" (CO, priya, 0 pts), `tsk_001b` "Handle 401 retry in API client" (IP, priya). tsk_002 → `tsk_002a` "Dead-letter queue for failed webhooks" (TD, diego), `tsk_002b` "Retry policy config UI" (TD, marcus). tsk_004 → `tsk_004a` "Dry-run migration on staging" (CO, diego).

**Sprint 24 (not started) — sprintId spr_24 (3 tasks)**: tsk_013 "SSO group sync for enterprise workspaces" (TD, H, priya, 8 pts, due S+20), tsk_014 "Keyboard shortcuts cheat sheet modal" (TD, L, marcus, 2), tsk_015 "Upgrade React Native to 0.76" (TD, N, marcus, 5).

**Sprint 22 (done) — 10 tasks**: tsk_016–tsk_023 all CO with `dateClosed` spread S-13…S-2 (pts 5,3,3,2,5,3,2,6 → 29) + tsk_009/tsk_010 (spilled over, now in spr_23). Names: "GraphQL pagination cursors", "Onboarding checklist empty states", "Sentry release tracking", "Fix timezone bug in due date picker", "Workspace usage metrics endpoint", "Refactor permissions middleware", "Avatar upload compression", "Slack integration v2 OAuth scopes". All have `sprintHistory: ['spr_22']`.

**Sprint 21 (done) — 8 tasks**: tsk_024–tsk_031 CO, dateClosed S-27…S-16, pts 3,5,2,5,3,8,2,3 (=31). Names: "Two-factor recovery codes UI", "Postgres connection pooling", "Task duplication endpoint", "Mobile push notification batching", "Improve list view virtualization", "Migrate CI to GitHub Actions", "Doc export to PDF", "Fix comment reaction race condition".

**Backlog (li_backlog, sprintId null) — 12 tasks**: tsk_032–tsk_043 TD, mix of priorities, some with points, some without (needed for "Add to sprint" & bulk-add practice). Names: "Gantt view dependency arrows", "Recurring task templates", "Offline mode for mobile docs", "Custom field formulas v2", "Reduce bundle size of editor", "Import from Trello", "Per-assignee sprint points", "Workload view capacity warnings", "Public API v3 deprecation plan", "Accessibility audit of task view", "Calendar sync with Outlook", "Rate limiting for AI endpoints".

**li_api (6)**: tsk_044–tsk_049 ("Zapier trigger for status change", "OpenAPI spec cleanup", "Webhook signature v2", "Partner API sandbox", "Pagination docs examples", "Deprecate v1 time tracking endpoint") — mixed statuses.
**li_bugs (8)**: tsk_050–tsk_057 bug reports, tags `bug`, priorities incl. 2 urgent ("Board view crashes when column has 500+ cards", "Due date shows wrong day for UTC+13", "Comment @mentions not notifying guests", "Duplicate tasks after offline sync", "Export CSV missing custom fields", "Sidebar flickers on Safari 18", "Time entry rounding off by 1 minute", "Doc page drag-and-drop loses nesting").
**li_infra (3)**: tsk_058–tsk_060 ("Rotate TLS certificates", "Terraform module for Redis", "On-call runbook update").
**li_launch (7)**: tsk_061–tsk_067 ("Launch landing page copy", "Product Hunt launch assets", "Press kit", "Customer webinar dry-run", "Pricing page A/B test", "Launch email sequence", "Partner co-marketing brief"), assignees olivia/noah/aisha, 2 assigned to jordan.
**li_content (5)**: tsk_068–tsk_072 blog/social posts with due dates over next 3 weeks.
**li_events (3)**: tsk_073–tsk_075.
**li_dsys (4)**: tsk_076–tsk_079 (hannah, marcus).
**li_research (3)**: tsk_080–tsk_082.
**li_acme (4)**: tsk_083–tsk_086 ("Acme kickoff workshop", "Configure Acme workspace hierarchy", "Acme admin training session", "Acme data migration from Asana") — jordan, ben; billable time entries.
**li_northwind (3)**: tsk_087–tsk_089 ("Monthly retainer report – November", "Northwind automation review", "Quarterly roadmap sync").
**li_hiring (3)**: tsk_090–tsk_092 ("Senior Frontend Engineer – screen candidates", "Draft DevOps job description", "Interview loop for QA Lead").

Coverage requirements: ≥10 tasks assigned to u_jordan (spread over 5+ lists), ≥4 overdue open tasks, ≥4 due today/tomorrow, ≥8 with no due date, every status of every space used at least once, 2 archived tasks (`archived: true`), 1 soft-deleted task (`deleted: true`) to populate Trash.

## 9. customFields (6)

```js
{ id, name, type: 'dropdown'|'currency'|'number'|'text'|'date'|'labels', scope: { type: 'space'|'list'|'folder', id }, options: [{ id, name, color }], currency: 'USD' }
```
| id | name | type | scope | options |
|----|------|------|-------|---------|
| cf_component | Component | dropdown | space sp_eng | opt_web Web App #0091FF, opt_api API #30A46C, opt_mobile Mobile #F76B15, opt_infra Infra #8E4EC6 |
| cf_severity | Severity | dropdown | list li_bugs | opt_s1 S1 – Critical #E5484D, opt_s2 S2 – Major #F76B15, opt_s3 S3 – Minor #FFB224 |
| cf_channel | Channel | labels | space sp_mkt | Email, Social, Blog, Paid, Events |
| cf_budget | Budget | currency | space sp_mkt | — |
| cf_client | Client | dropdown | folder fd_clients | Acme Corp, Northwind Traders |
| cf_rate | Hourly Rate | currency | folder fd_clients | — (e.g. 150) |

Task value shapes: dropdown → option id; labels → array of option ids; currency/number → number; text → string; date → 'YYYY-MM-DD'.

## 10. tags (space-scoped)

```js
{ name: 'backend', spaceId: 'sp_eng', fg: '#0D74CE', bg: '#E6F4FE' }
```
Engineering: backend, frontend, infra, security, qa, tech-debt, customer-request, bug, docs. Marketing: launch, seo, social, email. Design: ux, ui-kit. Ops: client, hiring.

## 11. comments (~45)

```js
{
  id: 'cm_001',
  parentType: 'task' | 'doc',
  parentId: 'tsk_001' | 'doc_002',
  pageId: null | 'pg_004',          // for doc comments
  authorId: 'u_elena',
  text: 'Can we make sure the refresh token TTL is configurable per workspace?',
  mentions: ['u_priya'],            // user ids parsed from @Name
  createdAt: ISO, updatedAt: ISO | null,
  resolved: false,
  assigneeId: null,                 // "assigned comment"
  reactions: [{ emoji: '👍', userIds: ['u_priya','u_jordan'] }],
  replyToId: null                   // threaded reply → parent comment id
}
```
Seed: ~38 task comments (3–6 on the 8 most active sprint/launch tasks), 2 threaded replies, 2 assigned comments (one to jordan, unresolved), 6 doc comments.

## 12. activity (~80)

Task history feed shown in Task view's Activity panel.
```js
{ id: 'ac_001', taskId: 'tsk_001', actorId: 'u_elena', type: 'status_changed', field: 'status', from: 'to do', to: 'in progress', createdAt: ISO }
```
`type` ∈ `created | status_changed | assignee_added | assignee_removed | priority_changed | due_date_changed | start_date_changed | points_changed | estimate_changed | sprint_added | sprint_removed | moved | renamed | description_changed | tag_added | tag_removed | subtask_added | checklist_item_resolved | time_tracked | custom_field_changed | archived | unarchived | deleted | restored | doc_linked`.
Every user-driven task mutation appends one activity record (actor = currentUserId).

## 13. docs (10)

```js
{
  id: 'doc_001', title: 'Engineering Handbook', icon: '📘',
  location: { type: 'space', id: 'sp_eng' },     // 'workspace' | 'space' | 'folder' | 'list'
  ownerId: 'u_elena', isWiki: true, tags: ['handbook'],
  sharing: { visibility: 'workspace' | 'private' | 'public', memberIds: [], defaultPermission: 'edit' | 'comment' | 'view', publicLinkEnabled: false },
  linkedTaskIds: [],
  archived: false, deleted: false, deletedAt: null,
  createdAt, createdBy, updatedAt, updatedBy, lastViewedAt
}
```
| id | title | icon | location | owner | wiki | pages |
|----|-------|------|----------|-------|------|-------|
| doc_001 | Engineering Handbook | 📘 | space sp_eng | elena | yes | Overview; Code Review Guidelines; On-call Rotation (sub: Escalation Policy); Release Process |
| doc_002 | Sprint 23 Planning Notes | 🗓️ | folder fd_sprints | jordan | no | Goals & Scope; Capacity; Risks |
| doc_003 | API Design Guidelines | 🔌 | list li_api | priya | no | Principles; Versioning; Error Format |
| doc_004 | Incident Postmortem – Billing Outage | 🚨 | space sp_eng | diego | no | Summary; Timeline; Action Items |
| doc_005 | Q4 Launch Brief | 🚀 | list li_launch | olivia | no | Positioning; Audience; Launch Timeline; Budget |
| doc_006 | Brand Voice & Messaging | ✍️ | space sp_mkt | noah | yes | Voice Principles; Words We Use |
| doc_007 | Design System Principles | 🎨 | space sp_design | hannah | yes | Foundations (sub: Color, Typography); Components |
| doc_008 | Acme Corp Onboarding Plan | 🤝 | folder fd_clients | ben | no | Scope; Schedule; Stakeholders |
| doc_009 | New Hire Onboarding Checklist | ✅ | space sp_ops | grace | yes | Week 1; Week 2 |
| doc_010 | Weekly Product Sync – Notes | 📝 | workspace | jordan | no | Agenda Template; Last Week's Sync; This Week's Sync |

Additionally seed 1 archived doc `doc_011` "Q3 Retro (old)" (`archived: true`, 1 page) so the Archived tab is non-empty → 11 docs total.

## 14. docPages (~32)

```js
{
  id: 'pg_001', docId: 'doc_001', parentPageId: null, title: 'Overview', icon: null,
  cover: null | { type: 'gradient', value: 'linear-gradient(135deg,#8930FD,#49CCF9)' },
  orderIndex: 0,
  blocks: [
    { id: 'b_001', type: 'h1', text: 'Welcome to Platform Engineering' },
    { id: 'b_002', type: 'paragraph', text: 'This handbook is the source of truth for how we build, review and ship.' },
    { id: 'b_003', type: 'bullet', text: 'Code review within 1 business day' },
    { id: 'b_004', type: 'todo', text: 'Read the on-call policy', checked: false },
    { id: 'b_005', type: 'task_link', taskId: 'tsk_008' }
  ],
  createdAt, createdBy, updatedAt, updatedBy
}
```
Block `type` ∈ `paragraph | h1 | h2 | h3 | bullet | numbered | todo | quote | code | divider | callout | task_link`. Text is plain text with optional inline marks encoded as markdown-ish `**bold**`, `*italic*`, `` `code` ``, `[label](url)` (render, don't need WYSIWYG). Each page 3–10 realistic blocks.

## 15. timeEntries (~75)

```js
{
  id: 'te_001',
  taskId: 'tsk_083' | null,          // null = "No task selected"
  userId: 'u_jordan',
  start: ISO, end: ISO,
  duration: 5400,                    // seconds, = (end-start)/1000
  billable: true,
  description: 'Kickoff workshop with Acme stakeholders',
  tagIds: ['tt_meeting'],
  source: 'timer' | 'manual' | 'timesheet',
  locked: false,                     // true once included in a submitted/approved timesheet
  createdAt: ISO, updatedAt: ISO
}
```
Seed (deterministic, explicit arrays):
- **u_jordan**: ~28 entries over the last 3 weeks (current week Mon→yesterday + 2 previous weeks), 1–3 per weekday, durations 0:30–3:00, on tsk_012, tsk_061, tsk_062, tsk_083–tsk_086, tsk_087, plus 2 with `taskId: null` ("Interviewing"). Entries on li_acme / li_northwind tasks `billable: true`; others false. Previous week totals ≈ 38h; current week so far ≈ 14–20h.
- **u_priya, u_marcus, u_diego, u_sam** (Platform): ~8 entries each over previous + current week on sprint tasks (non-billable).
- **u_ben**: ~6 billable entries on client tasks.
- Entries belonging to submitted/approved timesheets have `locked: true`.

## 16. timer

```js
null | { taskId: 'tsk_001' | null, userId: 'u_jordan', start: ISO, billable: false, description: '', tagIds: [] }
```
Seed: `null`. Only one running timer (for current user). Elapsed is computed at render time from `start` and `new Date()`; a display-only tick (component-local `useState` + interval) is allowed but must never write to the store.

## 17. timeTags (5)

`tt_meeting Meeting #0091FF`, `tt_dev Development #30A46C`, `tt_review Code Review #AB4ABA`, `tt_support Support #F76B15`, `tt_admin Admin #87909E`.

## 18. timesheets (approval submissions, 6)

```js
{
  id: 'tsh_001', userId: 'u_priya',
  periodStart: 'YYYY-MM-DD' /* Monday */, periodEnd: 'YYYY-MM-DD' /* Sunday */,
  status: 'submitted' | 'changes_requested' | 'approved' | 'withdrawn',
  totalSeconds: 144000, billableSeconds: 0,
  entryIds: ['te_101', ...],
  approverIds: ['u_jordan'],
  submittedAt: ISO,
  reviewedBy: null | userId, reviewedAt: null | ISO,
  reviewComment: '',
  history: [{ action: 'submitted' | 'approved' | 'changes_requested' | 'withdrawn' | 'resubmitted', userId, at: ISO, comment: '' }],
  comments: [{ id, userId, text, createdAt }]
}
```
Seed (W-1 = previous week, W-2 = two weeks ago):
| id | user | period | status | reviewer |
|----|------|--------|--------|----------|
| tsh_001 | u_jordan | W-2 | approved | u_elena |
| tsh_002 | u_jordan | W-1 | submitted | (approver u_elena) |
| tsh_003 | u_priya | W-1 | submitted | to review by u_jordan |
| tsh_004 | u_marcus | W-1 | changes_requested | u_jordan, comment "Please split the 6h block on Tuesday across the tasks you worked on." |
| tsh_005 | u_diego | W-1 | submitted | to review by u_jordan |
| tsh_006 | u_sam | W-2 | approved | u_jordan |

## 19. timesheetSettings

```js
{
  approvalsEnabled: true,
  deadline: { day: 'monday', time: '10:00' },
  reminders: { before: true, after: true },
  approvers: { u_priya: ['u_jordan'], u_marcus: ['u_jordan'], u_diego: ['u_jordan'], u_sam: ['u_jordan'], u_jordan: ['u_elena'], u_ben: ['u_jordan'] },
  dailyCapacityHours: 8,
  weeklyCapacityHours: 40
}
```

## 20. notifications (~22)

```js
{
  id: 'nt_001',
  type: 'assigned' | 'comment' | 'mention' | 'status_changed' | 'due_date' | 'doc_comment' | 'timesheet_submitted' | 'timesheet_approved' | 'timesheet_changes_requested' | 'sprint_started',
  actorId: 'u_elena',
  taskId: 'tsk_008' | null, docId: null, timesheetId: null, commentId: null,
  text: 'assigned this task to you',
  createdAt: ISO,
  read: false, cleared: false, savedForLater: false
}
```
Seed: 22 across last 7 days; 9 unread; types mixed; 2 `timesheet_submitted` (tsh_003, tsh_005 — Jordan is their approver), 1 `timesheet_approved` (tsh_001), 2 mentions of Jordan, 1 assigned comment, 2 doc comments, 4 already cleared.

## 21. favorites

```js
[{ type: 'sprint', id: 'spr_23' }, { type: 'list', id: 'li_launch' }, { type: 'doc', id: 'doc_001' }]
```

## 22. viewSettings

Keyed by location key: `everything`, `space:<id>`, `folder:<id>`, `list:<id>`, `sprint:<id>`, `mytasks`.
```js
'list:li_api': {
  view: 'list' | 'board' | 'calendar',
  groupBy: 'status' | 'assignee' | 'priority' | 'tags' | 'dueDate' | 'none',
  sortBy: null | 'dueDate' | 'priority' | 'name' | 'sprintPoints' | 'createdAt',
  sortDir: 'asc' | 'desc',
  showClosed: false,
  subtasks: 'collapsed' | 'expanded' | 'separate',
  meMode: false,
  search: '',               // NOT persisted (local state); listed here for clarity only
  filters: [{ id, field: 'status'|'assignee'|'priority'|'tags'|'dueDate'|'sprintPoints'|'sprint', op: 'is'|'is_not'|'is_set'|'is_not_set', value }],
  columns: ['assignee','dueDate','priority']   // optional extra: 'sprintPoints','timeTracked','timeEstimate','tags','startDate','sprint','customField:<id>'
}
```
Seed: `{}` (defaults applied in code). Defaults: List/sprint → `columns: ['assignee','dueDate','priority']` (+ `'sprintPoints'` for sprint & backlog locations, + `'sprint'` for backlog).

## 23. trash

Not a separate collection: soft-deleted tasks/docs have `deleted: true`. Trash page lists them; Restore sets `deleted:false`; "Delete permanently" removes the record.

---

## createInitialData() skeleton

```js
// src/data/seed.js
export function createInitialData() {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const pad = (n) => String(n).padStart(2, '0');
  const fmt = (dt) => `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
  const addDays = (dt, n) => { const x = new Date(dt); x.setDate(x.getDate() + n); return x; };
  const d = (offset) => fmt(addDays(today, offset));
  const ts = (offset, hhmm = '09:00') => { const [h, m] = hhmm.split(':').map(Number); const x = addDays(today, offset); x.setHours(h, m, 0, 0); return x.toISOString(); };
  const dow = (today.getDay() + 6) % 7;              // 0 = Monday
  const S = addDays(today, -dow - 7);                // current sprint start (Monday of previous week)
  const sd = (offset) => fmt(addDays(S, offset));
  const sts = (offset, hhmm) => { ... };             // ISO relative to S

  const users = [...];
  const spaces = [...];
  // ... build every collection with explicit arrays (no Math.random)
  return {
    workspace, currentUserId: 'u_jordan', users, teams, spaces, folders, lists, sprints,
    tasks, customFields, tags, comments, activity, docs, docPages, timeEntries,
    timer: null, timeTags, timesheets, timesheetSettings, notifications, favorites,
    viewSettings: {}
  };
}
```

## Relationships

```
workspace 1─* spaces 1─* folders 1─* lists 1─* tasks 1─* subtasks(tasks.parentId)
spaces 1─* lists (folderless, folderId=null)
folders(isSprintFolder) 1─* sprints 1─* tasks (tasks.sprintId)
tasks 1─* comments(parentType='task') / activity / timeEntries
docs 1─* docPages (tree via parentPageId) ; docs 1─* comments(parentType='doc')
tasks *─* docs (task.linkedDocIds ↔ doc.linkedTaskIds — keep both in sync)
users 1─* timeEntries ; timesheets *─* timeEntries (entryIds)
notifications → task | doc | timesheet
```
