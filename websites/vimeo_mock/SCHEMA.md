# vimeo_mock Schema

- **Base URL** `http://localhost:5360/`
- **Go endpoint** `GET /go?sid=<sid>` returns `initial_state`, `current_state`, and `state_diff`.
- **Inject** `POST /post?sid=<sid>` with `{"action":"set","state":{...}}`.
- **Reset** `POST /post?sid=<sid>` with `{"action":"reset"}` restores the baseline for that sid.

`GET /state?sid=<sid>` returns `stored_state`, `has_custom_state`, and `sid`. URL session IDs follow workspace links and local upload requests. The workspace uses the shared Harbor middleware and unchanged state manager.

## State Schema

| Key | Shape |
| --- | --- |
| `account` | `{ id, name, currentUserId }` |
| `people[]` | `{ id, name, role, initials }` |
| `videos[]` | `{ id, title, description, tags, thumbnailKey, durationSeconds, source, privacy, createdAt, createdBy, updatedAt, updatedBy }` |
| `showcases[]` | `{ id, title, description, videoIds, privacy, createdAt, createdBy, updatedAt, updatedBy }` |
| `reviewComments[]` | `{ id, videoId, parentId, body, timeSeconds, authorId, status, createdAt, updatedAt, updatedBy, resolvedAt, resolvedBy }` |
| `activity[]` | `{ id, type, targetType, targetId, actorId, createdAt, details }` |

Top-level keys supplied by an injected world are preserved. The standard seed contains 36 videos, 24 showcases, 72 comments, eight people, and an empty activity list.

- IDs and labels are strings. Timestamps are ISO 8601 strings. Editorial actor IDs refer to `people[].id` through `account.currentUserId`. New record IDs combine an entity prefix and UUID.
- Video `tags` is a string array. `thumbnailKey` refers to an original WebP under `/media`. `durationSeconds` is a number or null. `source` is null, `{ kind: 'local', url }`, or `{ kind: 'upload', url, originalName, storedName, size, contentType }`. Upload `size` is the byte count as a number. The uploaded URL comes from the session-scoped `/upload` response and points into `/files`.
- Video privacy is `{ mode, password, allowDownloads }` with a boolean downloads flag. Showcase privacy is `{ mode, password }`. Modes are `public`, `unlisted` (videos), `password`, `embed_only`, and `private`. `password` is a synthetic string in Password mode and null otherwise.
- Showcase `videoIds` is an ordered string array. Covers and displayed membership counts are derived from resolvable videos. Showcases can share member videos.
- Comment `status` is `open` or `resolved`. Root `parentId` is null. A reply points to the root ID and has null `timeSeconds`. Root `timeSeconds` is a nonnegative number or null. `resolvedAt` and `resolvedBy` are null for open comments and populated for resolved comments.
- Activity `targetType` is `video`, `showcase`, or `comment`. Activity `type` and `details` are listed below.

### Default IDs

The account is `account_northline` and the active actor is `person_01`. The seed uses `person_01` through `person_08`, `video_001` through `video_036`, `showcase_001` through `showcase_024`, and `comment_001` through `comment_072`. Activity starts empty.

## Minimal Inject Example

Send this body to the inject endpoint with a fresh sid, then open `/videos/field-cut/review?sid=<sid>`.

```json
{
  "action": "set",
  "state": {
    "videos": [{ "id": "field-cut", "title": "Field cut", "durationSeconds": 120 }],
    "showcases": [],
    "reviewComments": [],
    "activity": []
  }
}
```

Arrays replace defaults. Omitted keys in the example use the seeded account and people.

## Observable State Changes

Each committed action passes one full state snapshot to `saveState`. Activity records use the same timestamp and actor as the entity changes. Updated records receive `updatedAt` and `updatedBy`.

| UI action | State changes | Appended activity `type` and `details` |
| --- | --- | --- |
| Upload video | Append a video with the title, initial privacy, source metadata, nullable duration, local fallback thumbnail, empty details, creator, and editor fields. | `video.created` with `{ originalName, mode }` |
| Save details on a video | Update `title`, `description`, `tags`, and editor fields. | `video.updated` with `{ changedFields }` |
| Confirm Delete video | Remove the video and all scoped comments. Remove its ID from every showcase and stamp affected showcases. | `video.deleted` with `{ commentIds, showcaseIds }` |
| Create showcase | Append a showcase with title, description, selected privacy, empty `videoIds`, creator, and editor fields. | `showcase.created` with `{ mode }` |
| Save details on a showcase | Update `title`, `description`, and editor fields. | `showcase.updated` with `{ changedFields }` |
| Confirm Delete showcase | Remove the showcase record. | `showcase.deleted` with `{ videoIds }` |
| Add selected videos / Add to showcase | Append valid new IDs to each selected showcase in selection order and stamp affected showcases. Bulk addition commits the batch once. | `showcase.videos_added` per affected showcase with `{ affectedVideoIds, videoIds }` |
| Remove from showcase | Remove the member ID and stamp the showcase. | `showcase.video_removed` with `{ affectedVideoIds, videoIds }` |
| Move up / Move down | Swap the member with the adjacent displayed member and stamp the showcase. | `showcase.videos_reordered` with `{ affectedVideoIds, videoIds }` |
| Save privacy | Patch the selected video or showcase `privacy` and editor fields. Clear the password outside Password mode. | `video.privacy_changed` / `showcase.privacy_changed` with `{ previousMode, mode, changedFields }`, where fields are relative to `privacy` |
| Post comment | Append an open root with trimmed text, a nullable time anchor, and author and editor fields. | `comment.created` with `{ videoId, parentId, timeSeconds }` |
| Post reply | Append an open child scoped to the root and its video, with null time anchor. | `comment.replied` with `{ videoId, parentId, timeSeconds }` |
| Resolve thread / Reopen thread | Update `status` across its root and replies. Stamp editor fields and set or clear `resolvedAt` and `resolvedBy`. | `comment.resolved` / `comment.reopened` with `{ videoId, commentIds, status }` |

The initial Harbor load sends one baseline `set` for a new browser session. Drafts, navigation, playback, search, sorting, mode filters, selection, and dialogs are transient. Invalid, canceled, and unchanged actions produce zero state writes. The workspace confirms a change after Harbor acknowledges the snapshot. If a reload interrupts that acknowledgment, the workspace checks server state through `/state` before rendering. Verify server persistence through `/go`.
