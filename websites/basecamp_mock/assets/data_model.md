# Basecamp state model

`src/data/seed.js` exports `createInitialData()`, a pure function that returns fresh JSON data with the shape below. These are the sandbox keys in `/go.current_state`. The product API models projects containing tools, lists containing to-dos, boards containing posts, schedules containing events and comments linked to a recording. [Basecamp API overview](https://github.com/basecamp/bc-api)

## Top-level keys

| Key | Shape and fields |
| --- | --- |
| `workspace` | Object. `id`, `name`, `timeZone` and `currentUserId`, all strings. Time zone is an IANA name and the actor ID relates to `people`. |
| `people` | Array. `id`, `name`, `email`, `role` (job title), `avatarColor` (hex), all strings, and `isAdmin` (boolean). Derive initials from the name. |
| `projects` | Array. `id`, `name`, `description`, `color` (hex), all strings, and `memberIds` (person ID array). Project tools link back by `projectId`. |
| `todoLists` | Array of mutable records. `projectId`, `name`, `description` (strings), `position` (integer), `status` (`active\|trashed`). |
| `todos` | Array of mutable records. `projectId`, `listId`, `title`, `notes` (strings); `assigneeIds`, `completionNotifyIds` (person ID arrays); `startsOn`, `dueOn` (date string or null); `position` (integer); `completed` (boolean); `completedById` (person ID or null); `completedAt` (ISO timestamp or null); `status` (`active\|trashed`). |
| `messageBoards` | Array of mutable records. `projectId`, `title` (strings); `sortOrder` (`newest\|latest_comment\|alphabetical`). One board per project. |
| `messageCategories` | Array. `id`, `boardId`, `name`, `emoji` (strings); `position` (integer). Board-scoped categories sorted by position. |
| `messages` | Array of mutable records. `projectId`, `boardId`, `subject`, `bodyHtml` (strings); `categoryId` (category ID or null); `notifyRecipientIds` (person ID array); `status` (`draft\|active\|trashed`); `statusBeforeTrash` (`draft\|active` or absent); `publishedAt`, `pinnedAt` (ISO timestamps or null); `pinnedById` (person ID or null). |
| `schedules` | Array. `id`, `projectId`, `title` (strings). One schedule per project. |
| `scheduleEntries` | Array of mutable records. `projectId`, `scheduleId`, `title`, `notes`, `timeZone` (strings); `joinUrl` (HTTP(S) URL or null); `participantIds` (person ID array); `allDay` (boolean); `startsOn`, `endsOn` (date strings); `startsAt`, `endsAt` (ISO timestamps or null); `status` (`active\|trashed`). P2 `recurrence` is absent, null or `{ frequency, untilOn }`. |
| `comments` | Array of mutable records. `projectId`, `parentId`, `bodyHtml` (strings); `parentType` (`message\|todo`); `status` (`active\|trashed`). |

Mutable records include `id`, `createdById` and `updatedById` (strings), plus `createdAt` and `updatedAt` (ISO timestamps). Set creator and updater together on create. Preserve creator and ID on edits and stamp the updater and time on every successful mutation. Use a collision-safe ID for new records and reserve deterministic IDs in the seed. New writes use string IDs. Comparing incoming identifiers as strings at lookup boundaries also permits injected numeric IDs.

## Relationships and behavior

- Resolve `todos.listId → todoLists.id`, `messages.boardId → messageBoards.id`, `messages.categoryId → messageCategories.id`, and `scheduleEntries.scheduleId → schedules.id` within the same project or board as appropriate. Both comment types resolve `parentId` within `projectId`. Picker choices are people in `projects.memberIds`; deduplicate selected IDs. Missing members render neutral bylines or initials and an empty picker if no people can be resolved.
- A missing optional array is read as empty; missing description or notes are read as empty text; missing category presents as uncategorized. Missing sort order uses `newest`; missing status uses `active`; missing `completed` means open. Use stable ID order for equal or missing positions. A missing tool or parent shows an unavailable state or is filtered from the affected results. Preserve unrecognized fields from injected records when mutating them and apply defaults locally during rendering.
- Completion is independent of trash. A list hides all descendants while trashed; restoring it reveals its active children. New list/task positions append after the current tail. Reorder open tasks within the list and move between active lists in the same project. Update all changed positions together; use a stable position and ID sort.
- Show active messages using `publishedAt` with `createdAt` fallback and an ID tie-break. Board settings persist per board. Pinned items appear in order of pin time, above other messages. Filter them with the same match rules as ordinary rows. Latest-comment sort uses the latest active reply's `createdAt` or publication time when more recent. Derive counts from matching comments. Preserve the author of a draft on publication and place it on the board based on its publication timestamp. Safe rich text supports paragraphs, emphasis, ordered and unordered lists and validated links. Sanitize stored and injected rich text before rendering. Render external destinations as copyable links or text within the offline app.
- A date-only field is a calendar date formatted as `YYYY-MM-DD`. A to-do may have no dates, a due date, or an inclusive date range with both endpoints. Identify overdue to-dos by comparing their due date with today in the workspace time zone. For timed events store both ISO instants and their calendar date in the event's zone. On create use the workspace zone or fall back to UTC. On edit use the stored zone when valid. Display timed events in the workspace zone and compute their covered calendar days from the instants. A timed end exactly at midnight excludes the new day. An all-day range includes both stored dates and uses null time fields so no zone conversion shifts it. Render dated open to-dos from their source records and show spans on each covered day. Use `new Date()` from the runtime for relative displays and Today.
- P2 recurrence frequencies are `daily`, `weekdays`, `weekly`, `monthly` and `yearly`. `untilOn` is inclusive or null for unbounded. Occurrences use the series' local time and duration, preserve all-day date spans and are derived only for the displayed window. Skip nonexistent calendar dates in monthly/yearly patterns. No generated occurrence is saved. One-time events have no recurrence or use null.
- Word counts, reply counts, progress, excerpts, calendar markers, people previews and search indexes are derived. Query, open sections, form input, selected date and calendar presentation live in the view or URL. Record updates are explicit user commits through the Harbor state templates. Recipient fields are intent data.

## Example `createInitialData()` result

One record per key illustrates the shape. Expand to the fixture volumes below.

```json
{
  "workspace": {
    "id": "workspace-northstar", "name": "Northstar Studio",
    "currentUserId": "person-maya", "timeZone": "America/Chicago"
  },
  "people": [
    {
      "id": "person-maya", "name": "Maya Chen", "email": "maya@northstar.example",
      "role": "Project Lead", "avatarColor": "#CBE6DA", "isAdmin": true
    }
  ],
  "projects": [
    {
      "id": "project-website", "name": "Website Relaunch",
      "description": "Rebuild the marketing site and prepare for the December release.",
      "memberIds": ["person-maya"], "color": "#D8EDE4"
    }
  ],
  "todoLists": [
    {
      "id": "list-launch-checklist", "projectId": "project-website",
      "name": "Launch checklist", "description": "Final checks before the staged rollout.",
      "position": 0, "status": "active",
      "createdById": "person-maya", "createdAt": "2026-10-19T15:00:00.000Z",
      "updatedById": "person-maya", "updatedAt": "2026-10-19T15:00:00.000Z"
    }
  ],
  "todos": [
    {
      "id": "todo-redirect-map", "projectId": "project-website", "listId": "list-launch-checklist",
      "title": "Review the redirect map", "notes": "Spot-check the highest traffic legacy paths.",
      "assigneeIds": ["person-maya"], "completionNotifyIds": [],
      "startsOn": "2026-11-17", "dueOn": "2026-11-19",
      "position": 0, "completed": false, "completedById": null,
      "completedAt": null, "status": "active",
      "createdById": "person-maya", "createdAt": "2026-11-02T16:00:00.000Z",
      "updatedById": "person-maya", "updatedAt": "2026-11-02T16:00:00.000Z"
    }
  ],
  "messageBoards": [
    {
      "id": "board-website", "projectId": "project-website", "title": "Message Board",
      "sortOrder": "newest", "createdById": "person-maya",
      "createdAt": "2026-10-19T15:00:00.000Z", "updatedById": "person-maya",
      "updatedAt": "2026-10-19T15:00:00.000Z"
    }
  ],
  "messageCategories": [
    {
      "id": "category-website-announcement", "boardId": "board-website",
      "name": "Announcement", "emoji": "📣", "position": 0
    }
  ],
  "messages": [
    {
      "id": "message-launch-plan", "projectId": "project-website", "boardId": "board-website",
      "categoryId": "category-website-announcement", "subject": "December release plan",
      "bodyHtml": "<p>We will start with the staging walkthrough on Thursday.</p>",
      "notifyRecipientIds": ["person-maya"], "status": "active",
      "publishedAt": "2026-11-12T15:00:00.000Z",
      "pinnedAt": "2026-11-12T15:05:00.000Z", "pinnedById": "person-maya",
      "createdById": "person-maya", "createdAt": "2026-11-12T15:00:00.000Z",
      "updatedById": "person-maya", "updatedAt": "2026-11-12T15:05:00.000Z"
    }
  ],
  "schedules": [
    {
      "id": "schedule-website", "projectId": "project-website", "title": "Schedule"
    }
  ],
  "scheduleEntries": [
    {
      "id": "event-staging-walkthrough", "projectId": "project-website", "scheduleId": "schedule-website",
      "title": "Staging walkthrough", "notes": "Meet in Cedar and bring the device checklist.",
      "joinUrl": null, "participantIds": ["person-maya"], "allDay": false,
      "startsOn": "2026-11-19", "endsOn": "2026-11-19",
      "startsAt": "2026-11-19T16:00:00.000Z", "endsAt": "2026-11-19T16:45:00.000Z",
      "timeZone": "America/Chicago", "status": "active",
      "createdById": "person-maya", "createdAt": "2026-11-12T16:00:00.000Z",
      "updatedById": "person-maya", "updatedAt": "2026-11-12T16:00:00.000Z"
    }
  ],
  "comments": [
    {
      "id": "comment-release-device", "projectId": "project-website",
      "parentType": "message", "parentId": "message-launch-plan",
      "bodyHtml": "<p>The device checklist is ready for the walkthrough.</p>", "status": "active",
      "createdById": "person-maya", "createdAt": "2026-11-13T16:30:00.000Z",
      "updatedById": "person-maya", "updatedAt": "2026-11-13T16:30:00.000Z"
    }
  ]
}
```

## Default fixture distribution

| Collection | Fixture targets |
| --- | --- |
| Projects and people | 8 projects and 24 people. Use Website Relaunch, Client Onboarding, Editorial Calendar, Creative Operations, Product Research, Office Operations, Partner Launch and Studio Handbook. Studio Handbook has three empty tools. Maya Chen, Jordan Patel, Leila Brooks and Owen Reed overlap across projects. |
| To-dos | 24 lists and 96 items. Website Relaunch has six lists and about 30 to-dos, including Launch checklist, QA round two and Content migration. Include around 25 completed to-dos, several unassigned tasks and several ranges. |
| Posts and categories | 8 boards, five categories per board (Announcement, FYI, Pitch, Question, Update), 48 published posts and six drafts across authors. Place roughly 16 published posts on Website Relaunch and seed five board categories there. Include posts without a category and a pinned kickoff. |
| Schedule | 8 schedules and 48 events, with about 12 on Website Relaunch. Include concentrated November 2026 dates, adjacent-month events and a mix of single-day all-day, multi-day and timed entries. Keep all fixture dates within October–December 2026. Use fixed timestamps in other dated fixture collections too. |
| Comments | 96 comments linked to real seeded messages and to-dos, with some longer threads and many items with zero replies. Include varied authors and timestamps later than their parents' creation. |

Stable list and record IDs make injected-world fixtures and Playwright assertions readable. Verify changes by IDs in `/go.current_state` and use the top-level diff to identify changed collections. The implementation's `SCHEMA.md` documents the final shapes and observable writes.
