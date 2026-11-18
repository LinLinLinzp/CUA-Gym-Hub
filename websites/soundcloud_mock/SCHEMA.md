# soundcloud_mock Schema

**Base URL**: `http://localhost:5357/`  
**Go Endpoint**: `GET /go?sid=<sid>` → `{initial_state, current_state, state_diff}`  
**Inject**: `POST /post?sid=<sid>` with body `{"action":"set","state":{...}}`  
**Reset**: `POST /post?sid=<sid>` with body `{"action":"reset"}`

The Harbor API exposes the baseline, latest whole state and top-level diff at `/go?sid=…`. IDs are strings. Timestamps use UTC ISO 8601 with milliseconds. Daily reporting dates use UTC `YYYY-MM-DD`. Array order is significant for playlist track IDs.

## State Schema

| Key | Type | Description |
| --- | --- | --- |
| `account` | object | `{ userId }` identifies the current actor. |
| `users` | array | `{ id, displayName, handle, artworkKey? }`. |
| `tracks` | array | `{ id, ownerId, uploadId, title, genre?, tags?, description?, artworkKey?, durationSeconds?, visibility, status, createdAt, updatedBy?, updatedAt? }`. `uploadId` and `durationSeconds` can be null. `tags` is an array of strings. Visibility is `public` or `private` and published tracks have status `published`. |
| `uploads` | array | `{ id, trackId, actorId, status, createdAt, file? }`. Status is `published`. File is `{ originalName, storedName, url, sizeBytes, contentType }` from Harbor's multipart response, with `sizeBytes` an integer. Seed uploads omit `file`. |
| `playlists` | array | `{ id, ownerId, title, description?, visibility, trackIds, artworkKey?, createdAt, updatedBy?, updatedAt? }`. Visibility is `public` or `private`. `trackIds` stores ordered unique IDs. |
| `comments` | array | `{ id, trackId, authorId, parentId, offsetSeconds, body, status, createdAt, deletedBy?, deletedAt? }`. Parent ID can be null. Offset is an integer in seconds or null. Status is `active` or `deleted`. |
| `dailyStats` | array | `{ id, trackId, date, plays, likes, comments, reposts, downloads }`. One record per track and UTC date. Metrics are nonnegative integers. |
| `insightViews` | array | `{ id, actorId, trackId, metric, startDate, endDate, resultCount, metricTotal, createdAt }`. Track ID is null for all owned tracks. Metric is `plays`, `likes`, `comments`, `reposts` or `downloads`. Dates are inclusive. |

### Default IDs

| Entity | Representative IDs |
| --- | --- |
| Account and listener | `usr-mira-vale`, `usr-jules-park` |
| Tracks | `trk-soft-relay`, `trk-cable-drift` |
| Uploads | `upl-soft-relay`, `upl-cable-drift` |
| Playlists | `pl-night-transit`, `pl-studio-demos` |
| Comments | `cmt-relay-bridge`, `cmt-reply-1` |
| Daily stats | `stat-soft-relay-2026-09-28` |

### Minimal Inject Example

This state opens an empty creator workspace and keeps the signed-in identity available for new records.

```json
{
  "account": { "userId": "usr-audit-creator" },
  "users": [
    { "id": "usr-audit-creator", "displayName": "Avery Reed", "handle": "averyreed" }
  ],
  "tracks": [],
  "uploads": [],
  "playlists": [],
  "comments": [],
  "dailyStats": [],
  "insightViews": []
}
```

## Observable State Changes (for LLM evaluation)

| User action | Exact state write |
| --- | --- |
| Publish track | Append `uploads[]` with `id, trackId, actorId, status, createdAt, file` and `tracks[]` with `id, ownerId, uploadId, title, genre, tags, description, visibility, artworkKey, durationSeconds, status, createdAt` in one save. |
| Save track details | Update `tracks[]` by ID with `title, genre, tags, description, visibility, updatedBy, updatedAt`. |
| Create playlist | Append `playlists[]` with `id, ownerId, title, description, visibility, trackIds, artworkKey, createdAt`. Creation from track detail initializes `trackIds` with that track. |
| Save playlist track order | Update `playlists[]` by ID with `trackIds, updatedBy, updatedAt`. |
| Save playlist details | Update `playlists[]` by ID with `title, description, visibility, trackIds, updatedBy, updatedAt`. |
| Confirm Add to playlist | Update `playlists[]` by ID with appended `trackIds`, `updatedBy, updatedAt`. |
| Post comment or reply | Append `comments[]` with `id, trackId, authorId, parentId, offsetSeconds, body, status, createdAt`. A reply uses its parent's offset. |
| Confirm Remove comment | Update `comments[]` by ID with `status: "deleted", deletedBy, deletedAt`. |
| Apply Insights filters | Append `insightViews[]` with `id, actorId, trackId, metric, startDate, endDate, resultCount, metricTotal, createdAt`. The count is matching daily rows and the total is the selected metric across them. |

Filter previews, navigation, canceled edits, validation errors, chart and table display, playback and idle tabs do not write business state. Initial session load can issue the template baseline POST.
