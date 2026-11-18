# Loom State Model

Use this model in `src/data/seed.js` and document the implemented shapes in root `SCHEMA.md`. All values are JSON-serializable. Record IDs are opaque strings and relationships use explicit IDs. The examples are synthetic.

## State collections

| Key | Type | Purpose |
| --- | --- | --- |
| `account` | object | Current workspace and acting user |
| `users` | User[] | Local account directory |
| `videos` | Video[] | Recording metadata and lifecycle |
| `folders` | Folder[] | Personal folders and lifecycle |
| `comments` | Comment[] | Video discussion and replies |

### Account and users

| Field | Type | Example |
| --- | --- | --- |
| `account.workspaceName` | string | `Northstar Studio` |
| `account.currentUserId` | string | `user-maya` |
| `users[].id` | string | `user-maya` |
| `users[].name` | string | `Maya Chen` |
| `users[].initials` | optional string | `MC` |
| `users[].colorKey` | optional string | `orchid` |

Use `account.currentUserId` as the acting ID even if the user directory is empty. Fall back to neutral labels for missing directory entries. Derive initials from the name when no initials are given.

### Videos

| Field | Type | Example |
| --- | --- | --- |
| `id` | string | `video-001` |
| `title` | string | `Release readiness walkthrough` |
| `description` | optional string | `Review the rollout checklist and Tuesday handoffs.` |
| `ownerId` | string | `user-maya` |
| `folderId` | nullable string | `folder-004` or `null` for My Library |
| `sampleKey` | optional string | `release-board` |
| `durationSeconds` | number | `42` |
| `tags` | optional string[] | `["release", "operations"]` |
| `status` | string enum | `active`, `archived`, `deleted` |
| `createdAt` | ISO datetime | `2026-11-05T14:00:00.000Z` |
| `updatedAt` | ISO datetime | `2026-11-06T13:20:00.000Z` |
| `updatedBy` | string | `user-maya` |
| `archivedAt` | optional nullable ISO datetime | `2026-11-07T15:00:00.000Z` |
| `deletedAt` | optional nullable ISO datetime | `2026-11-08T16:00:00.000Z` |

Make a local media manifest keyed by `sampleKey` with a playable file, poster and duration. Keep the manifest in source, outside persisted state. An unknown or absent key uses a neutral preview and a readable “Video unavailable” state while keeping details and discussion available. Use nonnegative numeric durations and clamp finite comment timestamps to the available media interval on seek.

### Folders

| Field | Type | Example |
| --- | --- | --- |
| `id` | string | `folder-004` |
| `name` | string | `Launch Operations` |
| `ownerId` | string | `user-maya` |
| `status` | string enum | `active`, `archived`, `deleted` |
| `createdAt` | ISO datetime | `2026-10-29T09:00:00.000Z` |
| `updatedAt` | ISO datetime | `2026-11-03T16:10:00.000Z` |
| `updatedBy` | string | `user-maya` |
| `archivedAt` | optional nullable ISO datetime | `2026-11-07T15:00:00.000Z` |
| `deletedAt` | optional nullable ISO datetime | `2026-11-08T16:00:00.000Z` |

Folders are flat. Count the active videos with matching `folderId` when rendering an active folder. An active video under an archived folder is hidden from active lists, search and playback until the folder is restored. A separately archived video remains archived after its folder is restored. An active injected video pointing at an absent folder can render in the root library without a corrective state write.

### Comments

| Field | Type | Example |
| --- | --- | --- |
| `id` | string | `comment-013` |
| `videoId` | string | `video-001` |
| `parentId` | nullable string | `null` for a new thread or `comment-009` for a reply |
| `authorId` | string | `user-jules` |
| `body` | string | `Can we move the rollout check to Tuesday morning?` |
| `timestampSeconds` | nullable number | `18` |
| `status` | string enum | `active`, `deleted` |
| `createdAt` | ISO datetime | `2026-11-06T15:30:00.000Z` |
| `updatedAt` | ISO datetime | `2026-11-06T15:45:00.000Z` |
| `updatedBy` | string | `user-jules` |
| `editedAt` | optional ISO datetime | `2026-11-06T15:45:00.000Z` |
| `deletedAt` | optional ISO datetime | `2026-11-07T15:00:00.000Z` |

A reply points to a top-level comment on the same video. Show timestamps of zero as `0:00`. Render injected orphan replies as standalone discussion entries on their video. A manually deleted parent retains its ID and exposes a neutral thread marker when active replies remain.

## State Writes

Capture one ISO timestamp with `new Date().toISOString()` per successful action. Generate IDs for user-created records at submit, use the same timestamp for all records changed by that action, and use the current actor for each `updatedBy`.

Archive sets `status: "archived"` and `archivedAt`. Restore sets `status: "active"` and `archivedAt: null`. Permanent deletion sets `status: "deleted"` and `deletedAt`, retaining identifiers and relationships as verifier-visible records. Video deletion cascades to comments on the video. Folder deletion cascades to all retained videos with that folder ID and their comments. Skip already deleted records in cascades to preserve original deletion metadata. Status transitions also set `updatedAt` and `updatedBy`.

Search, sort, dialog drafts, player controls, selected rows and feedback belong to view state. Derive display counts from the hydrated records. An injected record with no status uses the active display default without changing the record. Preserve other injected fields in each store transaction.

## Seed Recipe

```js
export function createInitialData() {
  return {
    account: { workspaceName: 'Northstar Studio', currentUserId: 'user-maya' },
    users: seedUsers(),
    videos: seedVideos(),
    folders: seedFolders(),
    comments: seedComments(),
  }
}
```

Use eight fixed ID users, 48 videos (`video-001` through `video-048`), 24 folders (`folder-001` through `folder-024`) and 72 comments (`comment-001` through `comment-072`). Generate the seed arrays deterministically from authored fixtures with fixed ISO timestamps. Use several meaningful title families such as “Billing handoff,” “Sprint 14 demo,” “April onboarding checklist,” and “Launch QA walkthrough,” with distinct titles, descriptions and replies within each family. Include root videos, active folders with members, empty active folders, a few archived videos and an archived folder with member videos. Give several videos both timestamped and untimestamped comments. Seed one visible thread by Maya with a teammate reply and another by a teammate with Maya's reply.
