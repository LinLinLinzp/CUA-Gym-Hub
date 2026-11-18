# SoundCloud state model

Use plain JSON values. IDs, titles, free text and timestamps are strings unless stated otherwise. `createdAt`, `updatedAt` and `deletedAt` use UTC ISO 8601, for example `2026-11-18T15:24:00.000Z`. For new actions use the runtime clock. Use fixed seed IDs by entity, and generate unique IDs for new writes. Omit optional fields or use the nullable values specified below. Keep unknown injected keys when writing the whole state.

## Entities

| Root | Fields and examples |
| --- | --- |
| `account` | Object with `userId: "usr-mira-vale"`, referencing the acting user. |
| `users[]` | `id: "usr-mira-vale"`, `displayName: "Mira Vale"`, `handle: "miravale"`, optional `artworkKey: "moss-fold"`. |
| `tracks[]` | `id: "trk-soft-relay"`, `ownerId: "usr-mira-vale"`, `uploadId: "upl-soft-relay"` or null, `title: "Soft Relay"`, optional `genre: "Ambient"`, `tags: ["field recording", "downtempo"]`, `description: "Tape loops from a late train ride."`, `artworkKey: "glass-relay"`, `durationSeconds: 212` (number or null), `visibility: "public"` or `"private"`, `status: "published"`, `createdAt` and optional `updatedAt`, `updatedBy: "usr-mira-vale"`. |
| `uploads[]` | `id: "upl-soft-relay"`, `trackId: "trk-soft-relay"`, `actorId: "usr-mira-vale"`, `status: "published"`, `createdAt`, optional `file` object with `originalName: "soft-relay.wav"`, `storedName: "87a643c1_soft-relay.wav"`, `url: "/files/example-session/87a643c1_soft-relay.wav"`, `sizeBytes: 418092` (integer) and `contentType: "audio/wav"`. Map those from the state API's returned metadata. Seed audio metadata may point to an actual bundled local fixture or omit `file`. |
| `playlists[]` | `id: "pl-night-transit"`, `ownerId: "usr-mira-vale"`, `title: "Night Transit"`, optional `description: "Slow and spacious cuts for the ride home."`, optional `artworkKey: "night-transit"`, `visibility: "private"` or `"public"`, `trackIds: ["trk-soft-relay", "trk-cable-drift"]` (ordered unique IDs), `createdAt` and optional `updatedAt`, `updatedBy`. |
| `comments[]` | `id: "cmt-relay-bridge"`, `trackId: "trk-soft-relay"`, `authorId: "usr-jules-park"`, `parentId: null` or a comment on the same track, `offsetSeconds: 48` (nonnegative integer or null), `body: "Love the space around the drums here."`, `status: "active"` or `"deleted"`, `createdAt` and, on removal, `deletedAt` and `deletedBy: "usr-mira-vale"`. |
| `dailyStats[]` | `id: "stat-soft-relay-2026-11-13"`, `trackId: "trk-soft-relay"`, `date: "2026-11-13"` (UTC date), `plays: 215`, `likes: 18`, `comments: 4`, `reposts: 3`, `downloads: 2` (all nonnegative integers). One record per track/date. |
| `insightViews[]` | `id: "iv-example"`, `actorId: "usr-mira-vale"`, `trackId: null` or an owned track, `metric: "plays"` (or `likes`, `comments`, `reposts`, `downloads`), `startDate: "2026-11-07"`, `endDate: "2026-11-13"` (inclusive UTC dates), `resultCount: 21`, `metricTotal: 1574` (nonnegative integers), `createdAt`. The default seed array is empty. |

## Relationships and seed

Return `{ account, users, tracks, uploads, playlists, comments, dailyStats, insightViews: [] }` from `createInitialData()`. Track ownership, playlist ownership, actors and comment authors use user IDs. Each seeded upload references its corresponding track, and the track links back to the upload. Playlists can include tracks from multiple artists. Comments and historical stats reference tracks. Cover at least two of the 30-day reporting periods with overlapping dates across tracks and gaps within individual time series.

Use the active user ID in writes and for ownership checks. Offer readable fallbacks when an injected record lacks a display name, duration or artwork. Ignore unavailable playlist entries when displaying details, while preserving untouched IDs on metadata edits. Render replies to an unavailable parent at the top level. If a track exists without a recorded duration, allow untimed comments. The applied Insights selection is valid only for a known metric, valid date bounds and a track owned by the current account or null.

Count matching daily rows for `resultCount` and sum the selected metric across those rows for `metricTotal`. Treat missing metric values as zero. Derive date buckets and ranked tracks from the same applied filters. Keep all filter drafts, playlist drafts, search terms, selected audio positions and file picker objects in UI state until the action succeeds.
