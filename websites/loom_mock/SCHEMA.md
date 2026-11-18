# loom_mock Schema

**Base URL**: `http://localhost:5407/`  
**Go Endpoint**: `GET /go?sid=<sid>` → `{initial_state, current_state, state_diff}`  
**Inject**: `POST /post?sid=<sid>` with body `{"action":"set","state":{...}}`  
**Reset**: `POST /post?sid=<sid>` with body `{"action":"reset"}`

`GET /state?sid=<sid>` returns `{stored_state, has_custom_state, sid}`. The first `set` establishes the server baseline. `set_current` replaces current state and preserves an established baseline. `reset` restores current state from the baseline or seed. For an injected world, use a fresh `sid` so the browser hydrates it from the server. Injected arrays replace seed arrays and injected objects merge recursively. Each successful mutation saves the complete state and retains additional injected top-level keys.

## State Schema

| Key | Type | Description |
| --- | --- | --- |
| `account` | object | `{ workspaceName, currentUserId }`. Both fields are strings. The current user ID is used as the actor even if the user directory has no matching entry. |
| `users` | array | `{ id, name, initials?, colorKey? }`. All fields are strings. |
| `videos` | array | `{ id, title, description?, ownerId, folderId, sampleKey?, durationSeconds, tags?, status, createdAt, updatedAt, updatedBy, archivedAt?, deletedAt? }`. The duration is a number in seconds. Tags are an array of strings. `folderId: null` means My Library. |
| `folders` | array | `{ id, name, ownerId, status, createdAt, updatedAt, updatedBy, archivedAt?, deletedAt? }`. Folders are flat. |
| `comments` | array | `{ id, videoId, parentId, authorId, body, timestampSeconds, status, createdAt, updatedAt, updatedBy, editedAt?, deletedAt? }`. `parentId: null` identifies a top-level comment. `timestampSeconds` is a number or null. |

IDs are strings and relationships reference IDs in the corresponding collections. Dates are ISO 8601 strings. `archivedAt` is null after restore. A missing status is treated as active. Video and folder statuses are `active`, `archived`, and `deleted`. Comment statuses are `active` and `deleted`. A supplied sparse record can omit display fields such as a title, description, owner, date or sample key. The application supplies display fallbacks without writing them to state.

Local media is keyed by `sampleKey` in `src/data/media.js`. The media paths are resolved from that manifest at render time.

### Default IDs

- Account workspace `Northstar Studio` uses `user-maya` as the current actor.
- Users are `user-maya`, `user-jules`, `user-amina`, `user-leo`, `user-nina`, `user-sam`, `user-iris`, and `user-eli`.
- Videos run from `video-001` through `video-048`. Folders run from `folder-001` through `folder-024`. Comments run from `comment-001` through `comment-072`.

## Minimal Inject Example

```json
{
  "account": { "workspaceName": "Audit Studio" },
  "users": [],
  "videos": [{ "id": "injected-video", "title": "Review notes", "sampleKey": "sprint-notes" }],
  "folders": [],
  "comments": []
}
```

## Observable State Changes (for LLM evaluation)

Every affected record gets the transaction's `updatedAt` and `updatedBy`. One ISO timestamp is shared across each transaction and is reused for any creation, archive, edit or deletion timestamp set by that action.

| User Action | State Field Changed |
| --- | --- |
| Create video | Append `videos[]` with a unique `id`, `title`, `description`, `ownerId`, `folderId`, `sampleKey`, `durationSeconds`, `status: active`, `createdAt`, `updatedAt`, `updatedBy`. |
| Edit video details | Set `videos[].title`, `description`, `updatedAt`, `updatedBy`. |
| Rename video | Set `videos[].title`, `updatedAt`, `updatedBy`. |
| Duplicate video | Append `videos[]` with a unique `id`, prefixed `title`, current `ownerId`, `status: active`, fresh `createdAt`, `updatedAt`, `updatedBy` and the source location and sample metadata. Other non-lifecycle source fields are retained. |
| Move one or more videos | Set `videos[].folderId`, `updatedAt`, `updatedBy` for the selected recordings whose destination changes. |
| Archive one or more videos | Set `videos[].status: archived`, `archivedAt`, `updatedAt`, `updatedBy` for the selected recordings. |
| Restore video | Set `videos[].status: active`, `archivedAt: null`, `folderId`, `updatedAt`, `updatedBy`. Use the previous folder if active, or null. |
| Delete archived video | Set `videos[].status: deleted`, `deletedAt`, `updatedAt`, `updatedBy` and the same fields on its active comments. |
| Create folder | Append `folders[]` with `id`, `name`, `ownerId`, `status: active`, `createdAt`, `updatedAt`, `updatedBy`. |
| Rename folder | Set `folders[].name`, `updatedAt`, `updatedBy`. |
| Archive folder | Set `folders[].status: archived`, `archivedAt`, `updatedAt`, `updatedBy`. Active member recordings are hidden by their folder status. |
| Restore folder | Set `folders[].status: active`, `archivedAt: null`, `updatedAt`, `updatedBy`. |
| Delete archived folder | Set `folders[].status: deleted`, `deletedAt`, `updatedAt`, `updatedBy` and the same fields on its retained videos and their active comments. Already deleted records keep their deletion metadata. |
| Post or reply | Append `comments[]` with `id`, `videoId`, `parentId`, `authorId`, `body`, `timestampSeconds`, `status: active`, `createdAt`, `updatedAt`, `updatedBy`. A reply has a linked `parentId` and null timestamp. |
| Edit comment | Set `comments[].body`, `editedAt`, `updatedAt`, `updatedBy` on an owned comment or reply. |
| Delete comment | Set `comments[].status: deleted`, `deletedAt`, `updatedAt`, `updatedBy` on an owned comment or reply. Active replies to a deleted thread remain readable. |

Search, sorting, selection, navigation, link copying, canceled forms and player controls only affect the UI. Playback and idle time write no records.
