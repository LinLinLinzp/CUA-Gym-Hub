# basecamp_mock Schema

- **Base URL** `http://localhost:5385/`
- **Go Endpoint** `GET /go?sid=<sid>` → `{initial_state, current_state, state_diff}`
- **Inject** `POST /post?sid=<sid>` with body `{"action":"set","state":{...}}`
- **Reset** `POST /post?sid=<sid>` with body `{"action":"reset"}`
- **State read** `GET /state?sid=<sid>` → `{stored_state, has_custom_state, sid}`

The diff is keyed by top-level collection. Match records in `current_state` by their IDs and relationships. The first `set` or `set_current` captures the baseline, and `reset` restores the baseline to server-side current state. Vite stores state by SID. Harbor sitehost stores state by site within a task. A `set` request supplies the current server snapshot. On hydration, arrays in that snapshot replace default arrays and objects merge recursively. A partial injection can produce diff entries when the first browser load fills omitted fields.

On a cache miss, editable routes wait for the baseline `set` POST to succeed. A cached hard reload reads the latest server state, including direct API injections and resets. A single browser Web Lock per origin coordinates initialization and saves. Each save reads the server snapshot inside the lock, applies the user action, and sends the full updated snapshot in one `set_current` POST when fields change. Payloads above the keepalive byte limit use a regular POST.

The tab keeps pending actions in session storage by SID. A hard reload previews applicable queued actions over the acknowledged snapshot and offers **Retry save**. A user-triggered retry replays the queue against the latest server state. Verify persistence using `/go.current_state`.

The current replay path treats an unchanged snapshot as a completed action. An action blocked by a trashed parent can therefore disappear from the queue without a POST. Form edits can also send unchanged field values from a stale tab. On a fresh cache, a failed state read can fall back to seeded data and send it as the baseline POST, replacing server-side current state.

## State Schema

Seeded and newly created mutable records have `id`, `createdById`, `createdAt`, `updatedById` and `updatedAt`. The actor comes from `workspace.currentUserId`, and timestamps are ISO instants. Generated IDs and actor values stamped by the store are strings. Lookups also accept injected numeric IDs. Create sets all five fields. Other writes preserve ID and creator fields and stamp the updater and update time on each changed record. Missing optional arrays are read as empty. Missing status is read as active and missing completion is read as open.

| Key | Type | Description |
| --- | --- | --- |
| `workspace` | Object | `id, name, currentUserId, timeZone`. |
| `people` | Array | `id, name, email, role, avatarColor, isAdmin`. |
| `projects` | Array | `id, name, description, memberIds[], color`. |
| `todoLists` | Mutable record array | `projectId, name, description, position, status`. |
| `todos` | Mutable record array | `projectId, listId, title, notes, assigneeIds[], completionNotifyIds[], startsOn, dueOn, position, completed, completedById, completedAt, status`. Dates use `YYYY-MM-DD` or null. `completedAt` is an ISO instant or null. |
| `messageBoards` | Mutable record array | `projectId, title, sortOrder`. Sort is `newest`, `latest_comment`, or `alphabetical`. |
| `messageCategories` | Array | `id, boardId, name, emoji, position`. |
| `messages` | Mutable record array | `projectId, boardId, categoryId, subject, bodyHtml, notifyRecipientIds[], status, publishedAt, pinnedAt, pinnedById` and optional `statusBeforeTrash`. Category and pin fields may be null. Message status is active, draft or trashed. Publication and pin times are ISO instants or null. |
| `schedules` | Array | `id, projectId, title`. |
| `scheduleEntries` | Mutable record array | `projectId, scheduleId, title, notes, joinUrl, participantIds[], allDay, startsOn, endsOn, startsAt, endsAt, timeZone, status` and optional `recurrence`. Date-only fields use `YYYY-MM-DD`. Time fields are ISO instants for timed events and null for all-day events. URLs are HTTP(S) or null. Recurrence is absent, null or `{frequency, untilOn}`, with frequency `daily`, `weekdays`, `weekly`, `monthly` or `yearly`, and an inclusive date or null in `untilOn`. |
| `comments` | Mutable record array | `projectId, parentType, parentId, bodyHtml, status`. Parent type is `todo` or `message`. |

### Default IDs

- Workspace `workspace-northstar`, with Maya Chen as `person-maya`.
- Projects `project-website`, `project-onboarding`, `project-editorial`, `project-creative`, `project-research`, `project-office`, `project-partner` and `project-handbook`. Board and Schedule IDs use the same suffix with `board-` and `schedule-` prefixes.
- Website Relaunch examples include `list-launch-checklist`, `list-qa-round-two`, `todo-redirect-map`, `category-website-announcement`, `message-launch-plan` and `event-website-content-freeze`. The full fixture is in [seed.js](src/data/seed.js).

## Minimal Inject Example

```json
{
  "action": "set",
  "state": {
    "workspace": {"name": "Harbor Workspace", "currentUserId": "p-1", "timeZone": "UTC"},
    "people": [{"id": "p-1", "name": "Avery Lee"}],
    "projects": [{"id": "pr-1", "name": "Launch", "memberIds": ["p-1"]}],
    "todoLists": [{"id": "l-1", "projectId": "pr-1", "name": "Checklist"}],
    "todos": [],
    "messageBoards": [{"id": "b-1", "projectId": "pr-1"}],
    "messageCategories": [],
    "messages": [],
    "schedules": [{"id": "s-1", "projectId": "pr-1"}],
    "scheduleEntries": [],
    "comments": []
  }
}
```

## Observable State Changes (for LLM evaluation)

Each write below also updates `updatedById` and `updatedAt` on the changed records. An append also sets `id`, `createdById` and `createdAt`.

| User Action | State Field Changed |
| --- | --- |
| Create list | Append `todoLists` with `projectId, name, description, position, status: active`. |
| Edit list | Change `todoLists.name, description`. |
| Trash list | Set `todoLists.status: trashed`. Children keep their own status. |
| Add to-do | Append `todos` with `projectId, listId, title, notes, assigneeIds, completionNotifyIds, startsOn, dueOn, position, status: active, completed: false, completedById: null, completedAt: null`. |
| Edit to-do | Change `todos.title, notes, startsOn, dueOn` and write `assigneeIds` or `completionNotifyIds` when their picker changes. |
| Complete or reopen to-do | Set `todos.completed, completedById, completedAt`. On reopen the actor and completion time are null. |
| Move or reorder to-do | Move changes `todos.listId`. Move and reorder write the new `position` on affected records in one commit. |
| Trash to-do | Set `todos.status: trashed`. |
| Comment on to-do | Append `comments` with `projectId, parentType: todo, parentId, bodyHtml, status: active`. |
| Change board sort | Change `messageBoards.sortOrder`. |
| Compose message or draft | Append `messages` with `projectId, boardId, categoryId, subject, bodyHtml, notifyRecipientIds, status, publishedAt, pinnedAt, pinnedById`. Draft publication time and initial pin fields are null. |
| Edit a published message | Write `messages.subject, bodyHtml, status: active` and write `categoryId` or `notifyRecipientIds` when their controls change. Preserve the stored `publishedAt` field. |
| Save changes to a draft | Write `messages.subject, bodyHtml, status: draft, publishedAt: null` and write `categoryId` or `notifyRecipientIds` when their controls change. |
| Publish draft | Update the same message ID with `status: active`, a new `publishedAt`, `subject` and `bodyHtml`. Write `categoryId` or `notifyRecipientIds` when their controls change. |
| Pin or unpin message | Set `messages.pinnedAt, pinnedById` to the current instant and actor or clear both to null. |
| Trash message or draft | Set `messages.status: trashed`, record the former status in `statusBeforeTrash`, and clear both pin fields. |
| Reply to message | Append `comments` with `projectId, parentType: message, parentId, bodyHtml, status: active`. |
| Edit or trash a Message Board reply | Change `comments.bodyHtml` on edit or set `comments.status: trashed` on trash. The project Trash UI currently lists lists, to-dos, messages and events. |
| Add event | Append `scheduleEntries` with `projectId, scheduleId, title, notes, joinUrl, participantIds, allDay, startsOn, endsOn, startsAt, endsAt, timeZone, recurrence, status: active`. |
| Edit or reschedule event | Change `scheduleEntries.title, notes, joinUrl, allDay, startsOn, endsOn, startsAt, endsAt, timeZone, recurrence` and write `participantIds` when its picker changes. Keep the same ID. All-day saves write null instants and inclusive dates. |
| Trash event | Set `scheduleEntries.status: trashed`. |
| Restore list, to-do or event | Set `todoLists.status`, `todos.status` or `scheduleEntries.status` to active. A to-do requires an active parent list. |
| Restore message or draft | Set `messages.status` to its prior draft or active status, defaulting to active, and remove `statusBeforeTrash`. Drafts are visible to their authors only. |

Navigation, filtering, search, calendar selection, draft form input, closing a dialog and failed validation are view-only. Recipient IDs record intent. Calendar occurrences, list progress and thread counts are derived.
