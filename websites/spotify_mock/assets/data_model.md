# Spotify state model

Use these top-level keys in `createInitialData()` in `src/data/seed.js`. Keep the implemented equivalents and every mutation documented in `SCHEMA.md`. State consists of ordinary JSON objects and arrays. All IDs are strings, all timestamps are ISO 8601 strings, and coordinates in ordered playlists are zero-based integers. Fields marked `?` are optional. Runtime additions get unique stable IDs and use `new Date().toISOString()`. Seed IDs and timestamps are fixed.

## Records

| Top-level key | Fields and types | Example |
| --- | --- | --- |
| `account` | Object with `userId: string` referencing a user | `{ userId: "user-maya" }` |
| `users[]` | `id: string`, `name: string`, `handle?: string`, `bio?: string`, `artKey?: string` | `{ id: "user-maya", name: "Maya Chen", handle: "mayachen", bio: "Collecting late-night instrumentals.", artKey: "avatar-maya" }` |
| `artists[]` | `id: string`, `name: string`, `genre?: string`, `bio?: string`, `artKey?: string` | `{ id: "artist-lantern", name: "Lantern District", genre: "Ambient", bio: "An instrumental duo from Portland.", artKey: "lantern" }` |
| `albums[]` | `id: string`, `title: string`, `artistIds: string[]`, `year?: number`, `artKey?: string` | `{ id: "album-blue-hour", title: "Blue Hour Signals", artistIds: ["artist-lantern"], year: 2024, artKey: "blue-hour" }` |
| `tracks[]` | `id: string`, `title: string`, `artistIds: string[]`, `albumId?: string`, `durationMs: number`, `trackNumber?: number` | `{ id: "track-window", title: "Window Light", artistIds: ["artist-lantern"], albumId: "album-blue-hour", durationMs: 237000, trackNumber: 1 }` |
| `playlists[]` | `id: string`, `ownerId: string`, `name: string`, `description?: string`, `visibility: "private" or "public"`, `collaborative: boolean`, `status: "active" or "deleted"`, `artKey?: string`, `createdAt: timestamp`, `updatedAt: timestamp`, `deletedAt?: timestamp`, `deletedBy?: string` | `{ id: "playlist-sunday", ownerId: "user-maya", name: "Sunday Side A", description: "For a quiet morning.", visibility: "private", collaborative: false, status: "active", artKey: "paper-sun", createdAt: "2025-04-10T12:00:00.000Z", updatedAt: "2025-04-14T16:15:00.000Z" }`. Deletion adds `deletedAt: "2026-11-18T14:00:00.000Z"` and `deletedBy: "user-maya"`. |
| `playlistItems[]` | `id: string`, `playlistId: string`, `trackId: string`, `position: number`, `status: "active" or "removed"`, `addedBy: string`, `createdAt: timestamp`, `updatedAt: timestamp`, `updatedBy: string`, `removedAt?: timestamp` | `{ id: "item-sunday-window", playlistId: "playlist-sunday", trackId: "track-window", position: 0, status: "active", addedBy: "user-maya", createdAt: "2025-04-10T12:00:00.000Z", updatedAt: "2025-04-10T12:00:00.000Z", updatedBy: "user-maya" }`. Removal adds `removedAt: "2026-11-18T14:00:00.000Z"`. |
| `libraryEntries[]` | `id: string`, `userId: string`, `targetType: "track", "album" or "playlist"`, `targetId: string`, `status: "saved" or "removed"`, `createdAt: timestamp`, `updatedAt: timestamp`, `updatedBy: string` | `{ id: "lib-maya-window", userId: "user-maya", targetType: "track", targetId: "track-window", status: "saved", createdAt: "2025-04-12T09:00:00.000Z", updatedAt: "2025-04-12T09:00:00.000Z", updatedBy: "user-maya" }` |
| `follows[]` | `id: string`, `followerId: string`, `targetType: "artist" or "user"`, `targetId: string`, `status: "following" or "unfollowed"`, `createdAt: timestamp`, `updatedAt: timestamp` | `{ id: "follow-maya-lantern", followerId: "user-maya", targetType: "artist", targetId: "artist-lantern", status: "following", createdAt: "2025-04-12T09:00:00.000Z", updatedAt: "2025-04-12T09:00:00.000Z" }` |
| `playlistCollaborators[]` | `id: string`, `playlistId: string`, `userId: string`, `role: "editor"`, `inviteId?: string`, `status: "active" or "removed"`, `createdAt: timestamp`, `updatedAt: timestamp`, `updatedBy: string` | `{ id: "member-cabin-maya", playlistId: "playlist-cabin", userId: "user-maya", role: "editor", inviteId: "invite-cabin-maya", status: "active", createdAt: "2025-04-14T16:15:00.000Z", updatedAt: "2025-04-14T16:15:00.000Z", updatedBy: "user-maya" }`. Directly seeded memberships may omit `inviteId`. |
| `playlistInvites[]` | `id: string`, `token: string`, `playlistId: string`, `invitedBy: string`, `recipientId?: string`, `status: "pending", "accepted" or "revoked"`, `createdAt: timestamp`, `expiresAt: timestamp`, `updatedAt: timestamp`, `updatedBy: string`, `acceptedBy?: string`, `acceptedAt?: timestamp` | `{ id: "invite-kitchen-maya", token: "kitchen-maya", playlistId: "playlist-kitchen", invitedBy: "user-nora", recipientId: "user-maya", status: "pending", createdAt: "2026-11-15T12:00:00.000Z", expiresAt: "2026-11-22T12:00:00.000Z", updatedAt: "2026-11-15T12:00:00.000Z", updatedBy: "user-nora" }`. Acceptance adds `acceptedAt: "2026-11-18T14:00:00.000Z"` and `acceptedBy: "user-maya"`. |

## Relationships and derived views

- Library entries are unique by account, target type and target ID. Follow entries are unique by follower, target type and target ID. Resaving and refollowing reuse the existing record and preserve its ID and creation timestamp. Recent sorting uses the relationship's update timestamp when present.
- Playlist items link to a playlist, a track and the user who added it. Order active items by position, with ID as a deterministic tie-breaker. Use item ID for selection and mutation. Retain removed items for verification and exclude them from displayed order.
- Owned playlists derive from `ownerId`. Shared with you derives from active membership in an active collaborative playlist. Liked Songs derives from saved track entries, while saved albums and followed artists use their separate relations. A user already in an active playlist membership should appear once in the account's collection.
- Owners edit their own playlist details and membership. Active editors may change tracks in an active collaborative playlist. An external private playlist requires active membership or a valid invite landing page to show invite context. Public active playlists are readable and saveable by other users. Revalidate these conditions from current state before any write.
- An invitation can be open or targeted to one synthetic user. Only a non-owner matching the target, if set, can join through a pending, unused, unexpired link to an active collaborative playlist. Each token is single-use in this offline account. Treat expiration as a read-time condition and preserve the persisted status until an explicit action. Never persist on link viewing.
- When Harbor injects partial records, resolve references defensively and provide sensible labels for absent optional fields. Avoid filling in missing records or rewriting injected data on load.

## Observable mutations

Record paths below are relative to `current_state` returned by `GET /go?sid=…`. Timestamps and actor fields for each action come from one user action. Each multi-record action is a single state update.

| Action | State writes |
| --- | --- |
| Create playlist | Append `playlists[]` with ID, owner, name, description, visibility, `collaborative=false`, `status=active`, `createdAt`, `updatedAt`. |
| Edit details | Update `playlists[].name/description/visibility` as selected and `updatedAt`. Collaborative playlists stay private. The owner is the acting user. |
| Delete playlist | Set `playlists[].status=deleted`, `collaborative=false`, `deletedAt`, `deletedBy`, `updatedAt`. Mark saved playlist library entries removed, active memberships removed and pending invites revoked, setting `updatedAt/updatedBy` on affected records. Preserve historical track items. |
| Add track | Append `playlistItems[]` with linkage, next active position, `status=active`, `addedBy`, `createdAt/updatedAt/updatedBy`. Touch `playlists[].updatedAt`. A normal add prevents an accidental duplicate active item. |
| Remove track | Update the identified item's `status=removed`, `removedAt`, `updatedAt/updatedBy`. Reindex active positions, stamping changed rows, and touch `playlists[].updatedAt`. |
| Reorder tracks | Update and stamp changed active `playlistItems[].position/updatedAt/updatedBy`, and touch `playlists[].updatedAt`. |
| Save or remove from library | Insert the relationship on first save or update its `status`, `updatedAt` and `updatedBy`. |
| Follow or unfollow | Insert the relationship on first follow or update its `status` and `updatedAt`. |
| Enable collaboration | Set `playlists[].collaborative=true`, `visibility=private`, and `updatedAt`. |
| Generate or revoke invitation | Append a `playlistInvites[]` record with the playlist, inviter, token, optional recipient, `status=pending` and timestamps, or update the existing invite to `status=revoked` with `updatedAt/updatedBy`. |
| Join playlist | Set the invite to `status=accepted`, set `acceptedBy/acceptedAt/updatedAt/updatedBy`, create or reactivate the corresponding editor membership with invite linkage and actor/timestamps, and touch `playlists[].updatedAt`. |
| Remove collaborator | Set that membership's `status=removed`, stamp `updatedAt/updatedBy` and touch `playlists[].updatedAt`. Preserve their past track attribution. |
| Disable collaboration | Set `playlists[].collaborative=false` and `updatedAt`, preserving private visibility. Mark active memberships removed and pending invites revoked, stamping `updatedAt/updatedBy`. |

## Default fixtures

Seed the account, 30 people, 32 artists, 36 albums, 144 tracks, 30 playlists, roughly 120 visible playlist items, at least 30 saved entries and at least 20 active follows. Use stable IDs with meaningful shared prefixes, fixed catalog attributes and fixed ordering. Seed English-language titles and genres across ambient, soul, indie, instrumental hip-hop and jazz. Ensure every track's album and every credited artist exist. Put at least two tracks by the same artist in distinct albums and include a mix of saved and unsaved catalog entries.

- Maya Chen owns Sunday Side A with multiple tracks and one editor-free empty private playlist. She owns a separate collaborative playlist with multiple contributors and a working remove-member target. Include a public owned playlist that can be converted to private collaboration.
- Nora Ellis owns a private collaborative playlist with an active membership for Maya, a separate one with a pending invite for Maya, and a public playlist Maya can save. Include a read-only external playlist and targets in both follow states.
- Seed pending, expired and revoked invite examples. For the seeded incoming invite use a fixed test clock within its seven-day interval, or inject a test-specific invite relative to the browser's clock. Never extend or regenerate the default invite on startup.
