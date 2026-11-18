# Vimeo workspace state model

This is the implementation handoff. Use the exact keys in the app and document any implementation decisions in the final SCHEMA.md.

## Top-level state

| Key | Shape | Contents |
| --- | --- | --- |
| `account` | Object | `id` string, `name` string, `currentUserId` string. Example `{ "id": "account_northline", "name": "Northline Documentary Studio", "currentUserId": "person_01" }`. |
| `people` | Array | Person records indexed by ID. |
| `videos` | Array | Media and metadata managed in the Library. |
| `showcases` | Array | Curated collections with ordered video IDs. |
| `reviewComments` | Array | Video feedback and replies as flat records. |
| `activity` | Array | Append-only records of explicit account changes. |

### People

`{ "id": "person_01", "name": "Morgan Reyes", "role": "Owner", "initials": "MR" }`.

All fields are strings. Seed editors, producers and reviewers such as Anika Shaw, Felix Okafor and Rowan Ellis. Derive a fallback name and avatar for missing references. The account's `currentUserId` is the actor of new changes.

### Videos

```json
{
  "id": "video_001",
  "title": "Low Tide, Early Light",
  "description": "A field study of the salt marsh before the first ferry.",
  "tags": ["coast", "documentary"],
  "thumbnailKey": "marsh-dawn",
  "durationSeconds": 84,
  "source": { "kind": "local", "url": "/media/marsh.webm" },
  "privacy": { "mode": "unlisted", "password": null, "allowDownloads": false },
  "createdAt": "2026-07-06T09:30:00.000Z",
  "createdBy": "person_02",
  "updatedAt": "2026-07-08T13:10:00.000Z",
  "updatedBy": "person_01"
}
```

IDs, labels, and ISO datetimes are strings. `tags` is a string array and duration is a nonnegative number or null. `source` is null, a local media reference, or an upload reference shaped as `{ kind: 'upload', url, originalName, storedName, size, contentType }`; those fields are strings except byte `size`, which is a number. Persist only the returned path and metadata. Match seeded duration to playable sources where provided. For still-only records with meaningful durations, expose a seekable review timeline. Passwords are synthetic strings or null and only present as strings in Password mode. Accept `public`, `unlisted`, `password`, `embed_only`, and `private` for video privacy `mode`. `allowDownloads` is boolean. New video defaults are Unlisted and downloads off.

### Showcases

```json
{
  "id": "showcase_001",
  "title": "Waterlines",
  "description": "Short films following rivers, shorelines, and the people beside them.",
  "videoIds": ["video_001", "video_008", "video_013"],
  "privacy": { "mode": "private", "password": null },
  "createdAt": "2026-07-10T14:00:00.000Z",
  "createdBy": "person_01",
  "updatedAt": "2026-07-11T11:15:00.000Z",
  "updatedBy": "person_01"
}
```

`videoIds` is a unique, ordered array of video ID strings. Derive the cover from the first resolvable video or use a local default. Allow the same video in multiple showcases. Privacy uses `public`, `password`, `embed_only`, and `private`. New showcase privacy defaults to Private. Dates and person IDs use the video conventions.

### Review comments

```json
{
  "id": "comment_001",
  "videoId": "video_001",
  "parentId": null,
  "body": "Hold this wide shot through the end of the ferry horn.",
  "timeSeconds": 18,
  "authorId": "person_03",
  "status": "open",
  "createdAt": "2026-07-08T15:30:00.000Z",
  "updatedAt": "2026-07-08T15:30:00.000Z",
  "updatedBy": "person_03",
  "resolvedAt": null,
  "resolvedBy": null
}
```

IDs, body, and dates are strings. Root `parentId` is null. Replies reference a root comment on the same video and use `timeSeconds: null`; the timestamp of the root anchors the thread. Root time is null or a finite number between zero and the video duration when known. `status` is `open` or `resolved`. When resolved, all thread records have an ISO `resolvedAt` and a person ID `resolvedBy`. Reopening sets both back to null. Handle an injected missing author, video, or parent with display fallbacks or skip orphan threads in scoped UI.

### Activity

```json
{
  "id": "activity_b2a1",
  "type": "comment.resolved",
  "targetType": "comment",
  "targetId": "comment_001",
  "actorId": "person_01",
  "createdAt": "2026-07-09T11:22:00.000Z",
  "details": {
    "videoId": "video_001",
    "commentIds": ["comment_001", "comment_002"],
    "status": "resolved"
  }
}
```

Typed strings identify action, target and actor. `targetType` is `video`, `showcase`, or `comment`. Use JSON-only details. Append to `activity` in the same commit as the primary update.

| Type | Details |
| --- | --- |
| `video.created` | `originalName`, `mode` |
| `video.updated`, `showcase.updated` | `changedFields` string array |
| `video.deleted` | `commentIds`, `showcaseIds` string arrays |
| `showcase.created` | `mode` |
| `showcase.deleted` | `videoIds` string array |
| `showcase.videos_added`, `showcase.video_removed`, `showcase.videos_reordered` | `affectedVideoIds`, `videoIds` in final order |
| `video.privacy_changed`, `showcase.privacy_changed` | `previousMode`, `mode`, `changedFields` with paths relative to `privacy`; omit password values |
| `comment.created`, `comment.replied` | `videoId`, `parentId`, `timeSeconds` |
| `comment.resolved`, `comment.reopened` | `videoId`, `commentIds`, `status` |

## Seed design

Have `createInitialData()` return a fresh object on every call. Use explicit IDs, ISO dates, and deterministic arrays. Use collision-resistant IDs for user-created records.

- 36 videos with distinct English titles and subjects spanning coastlines, neighborhood cinemas, oral histories, environmental field recordings, and craft workshops. Include `The Letterpress Room`, `After the Last Screening`, and `A Map of Small Rivers`. Spread privacy across all five modes, include repeatable tags, and vary dates and durations for sorting and filtering.
- 24 showcases with distinct titles, including `Waterlines`, `Festival Shortlist`, and `The Working Archive`. Give most showcases three to six ordered videos with meaningful overlap. Keep at least one empty showcase. Include all four modes.
- 72 review comments across roughly half the videos, with direct replies, untimed notes, timestamped notes, and resolved threads. Keep several videos comment-free and seed open and resolved feedback on at least one playable video.
- 8 people with names and roles and an empty activity array. All seeded relations point to valid IDs. Use concise descriptions and comments so normal state requests stay comfortably sized.
