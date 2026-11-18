# Proposed Harbor data model

Use these names consistently in the seed, UI, and eventual `SCHEMA.md`. The API stores one JSON object per session. Identifiers are strings. Use fixed sequential fixture IDs with entity-specific prefixes and collision-resistant IDs for new user-created records. User action timestamps are UTC ISO strings from one `new Date().toISOString()` call per submission. Use the same actor and timestamp for all records changed by that submission.

## Top-level keys and shapes

| Key | Shape | Example |
| --- | --- | --- |
| `workspace` | `{id: string, name: string, timeZone: string, currentUserId: string}` | `{ "id": "workspace-01", "name": "Juniper Works", "timeZone": "UTC", "currentUserId": "user-01" }` |
| `users` | `{id: string, name: string, initials: string, role: string}[]` | `{ "id": "user-01", "name": "Maya Chen", "initials": "MC", "role": "Social lead" }` |
| `profiles` | `{id: string, name: string, handle: string, network: "instagram" \| "linkedin" \| "facebook" \| "x"}[]` | `{ "id": "profile-04", "name": "Juniper Works", "handle": "@juniperworks", "network": "x" }` |
| `posts` | `Post[]` | `post-01` below |
| `approvals` | `Approval[]` | `approval-01` below |
| `streamBoards` | `StreamBoard[]` | `board-01` below |
| `streams` | `Stream[]` | `stream-01` below |
| `feedItems` | `FeedItem[]` | `feed-01` below |

The examples omit no fields. Newly created records use the full shapes. Treat missing optional values in injected data as absent. An active stream or board with a missing `status` can render as active. Missing `position` sorts after explicit positions, with original array order as the tie-breaker. Missing references render a fallback label and disable actions that require the absent record. Keep the underlying records intact. Only commit writes with a resolvable `workspace.currentUserId`.

### Post

```json
{
  "id": "post-01",
  "body": "The tool library reopens Friday. Bring a project, borrow a kit, and meet the volunteers who make it possible.",
  "profileIds": ["profile-04"],
  "status": "pending_approval",
  "scheduledAt": "2026-11-20T16:00:00.000Z",
  "createdBy": "user-02",
  "createdAt": "2026-11-12T15:15:00.000Z",
  "updatedBy": "user-02",
  "updatedAt": "2026-11-13T15:15:00.000Z"
}
```

`status` is `draft`, `scheduled`, `pending_approval`, `rejected`, `published`, or `canceled`. `scheduledAt` is an ISO string or `null`. All other scalar fields are strings and `profileIds` is an array of profile IDs. Each post can reach several profiles and retains its ID across edits and review. The planner formats schedule date and time in the workspace time zone, defaulting to UTC. Approval and scheduling do not create simulated publication events.

### Approval

```json
{
  "id": "approval-01",
  "postId": "post-01",
  "reviewerId": "user-01",
  "requestedBy": "user-02",
  "requestNote": "Please check Friday's reopening details.",
  "status": "pending",
  "previousRequestId": null,
  "createdAt": "2026-11-13T15:15:00.000Z",
  "decisionNote": null,
  "decidedBy": null,
  "decidedAt": null
}
```

`status` is `pending`, `approved`, or `rejected`. Decision fields and `previousRequestId` are nullable strings. `requestNote` is a string, empty when omitted, and other fields are strings. Requests point to a post and two workspace users. Each post can have a chain of requests but at most one pending request. Decisions remain on their own request when the post is resubmitted. Assigned to me shows pending requests for the current user. Requested by me shows requests by the current user across statuses. History shows decided requests. Sort newest first by creation time. When approval detail displays a linked post, it displays the current post content. Older requests remain readable with their original reviewer, notes, and decision. For resubmission, only the newest rejected request for a rejected post is actionable, with array order as the timestamp tie-breaker.

### StreamBoard

```json
{
  "id": "board-01",
  "name": "Brand watch",
  "position": 0,
  "status": "active",
  "createdBy": "user-01",
  "createdAt": "2026-11-09T14:00:00.000Z",
  "updatedBy": "user-01",
  "updatedAt": "2026-11-09T14:00:00.000Z",
  "removedBy": null,
  "removedAt": null
}
```

`position` is a nonnegative integer among active boards. A new board uses one greater than the greatest active position, or zero when empty. `status` is `active` or `removed`. Removal fields are nullable strings and remaining scalar fields are strings. Removing a board marks its active child streams removed in the same save. Active board positions can have gaps after removal.

### Stream

```json
{
  "id": "stream-01",
  "boardId": "board-01",
  "name": "Repair club conversations",
  "profileId": "profile-04",
  "type": "keyword_search",
  "query": "#RepairClub",
  "position": 0,
  "status": "active",
  "createdBy": "user-01",
  "createdAt": "2026-11-09T14:05:00.000Z",
  "updatedBy": "user-01",
  "updatedAt": "2026-11-09T14:05:00.000Z",
  "removedBy": null,
  "removedAt": null
}
```

`type` is `my_posts`, `mentions`, or `keyword_search`. X supports all three. Instagram, Facebook, and LinkedIn support My Posts in this account. `query` is a trimmed nonblank string for Keyword search and `null` for other types. `position` is a nonnegative integer within the board. Append to the end when adding or moving a stream. On move, reorder, or stream removal, number active siblings in the affected board or boards from zero while preserving their intended order. Retain the removed row's last position. `status` is `active` or `removed`. Removal fields are nullable strings and other scalar fields are strings. A stream belongs to one board and reads one social profile.

### FeedItem

```json
{
  "id": "feed-01",
  "profileId": "profile-04",
  "kind": "mention",
  "authorName": "Jordan Silva",
  "authorHandle": "@jordansilva",
  "body": "Thanks @juniperworks for bringing a second workbench to #RepairClub this Saturday.",
  "createdAt": "2026-11-16T17:45:00.000Z"
}
```

All fields are strings. `kind` is `owned`, `mention`, or `discovery`. Match `profileId` first. My Posts selects `owned`, Mentions selects `mention`, and Keyword search selects a case-insensitive literal match on `body` or `authorHandle` regardless of kind. Let `#` and `@` appear in the literal query. Sort matches by `createdAt` descending. A single feed item can appear in more than one stream. Feed cards show author, handle, relative time, and caption with optional initials derived from author name. Feed items are fixed fixtures.

## Seed implementation

`createInitialData()` returns a fresh object holding all eight keys. Keep seed content and timestamps deterministic. Use shared constants and small fixture builders to avoid repeating metadata. Include these records and conditions.

| Entity | Count | Fixture coverage |
| --- | --- | --- |
| Workspace and users | 1 and 6 | Juniper Works, Maya Chen as `user-01`, Rowan Park as `user-02`, and four teammates with distinct roles. |
| Profiles | 6 | LinkedIn, Facebook, X, and Instagram, including two channels on one network to make per-profile filters meaningful. |
| Posts | 48 | 12 scheduled, 8 drafts, 10 published, 10 pending approval, 6 rejected, 2 canceled. Use short and long English captions about neighborhood repair workshops, equipment reuse, tool lending, and volunteer training. Include single and multiple profiles, timed and untimed drafts, and at least eight posts in the campaign week of November 16–22, 2026. |
| Approvals | 30 | 10 pending, 10 approved, 10 rejected, with earlier decided requests for resubmitted posts as needed. At least two pending requests assigned to Maya, two requested by Maya, and a rejected Maya-authored post with a decision reason. Ensure every pending request links to a pending post. |
| Boards | 6 | Brand watch, Community programs, Events, Publishing, Partnerships, and Industry watch. Make Brand watch first and give it My Posts, Mentions, and Keyword search columns with matching items. |
| Streams | 24 | Four streams per board. Seed valid profiles and positions with type and query variety. Include a zero-match stream. |
| Feed items | 72 | Give each profile several distinct authors, timestamps, and posts. Include owned posts, X mentions, and X discoveries with matching and nonmatching phrases and hashtags. |

Default Planner Week uses the browser's current Monday if it contains seeded or injected timed posts. Otherwise, open the week containing the nearest dated post and use the current week for an empty world. The Today button always switches to the current week. For date-dependent tests, choose a future value from the browser clock and reschedule fixture requests through seed injection when needed.

## Observable State Changes

Every update also records `updatedBy` and `updatedAt` on each changed post, board, or stream. New records receive all fields above, including unique IDs and creation metadata. Untouched records retain their values.

| User action | Record writes |
| --- | --- |
| Save draft / Schedule new post | Append `posts` record with the submitted `body`, `profileIds`, `scheduledAt`, and `status` of `draft` or `scheduled`. |
| Edit or reschedule post | Update `posts` record at the same `id` with changed `body`, `profileIds`, and/or `scheduledAt`. |
| Move post to Drafts | Set `posts[].status` to `draft` and `scheduledAt` to `null`. |
| Cancel scheduled post | Set `posts[].status` to `canceled`, retaining the last `scheduledAt`. |
| Request approval | Append or update a `posts` record with `status: "pending_approval"` and submitted fields. Append `approvals` with `status: "pending"`, selected `reviewerId`, actor `requestedBy`, linked `postId`, request note, and null predecessor and decision fields. |
| Approve / Reject | Update matched `approvals[]` with `status: "approved"` or `"rejected"`, `decidedBy`, `decidedAt`, and `decisionNote` (nullable on approval). Update linked `posts[].status` to `scheduled` or `rejected` respectively. |
| Revise and resubmit | Update linked `posts` record with edited fields and `status: "pending_approval"`. Append a new `approvals` record as above with `previousRequestId` set to the rejected request ID. |
| Create / Rename board | Append active `streamBoards` with `name` and `position`, or update `name` on the matching active board. |
| Remove board | Set `status: "removed"`, `removedBy`, and `removedAt` on the board and all active child streams. |
| Add / Edit stream | Append active `streams` record with `boardId`, `name`, `profileId`, `type`, `query`, and `position`, or update that stream's editable fields `name`, `profileId`, `type`, and `query`. |
| Reorder / Move stream | Update affected `streams[].position` and update the moved stream's `boardId` when changing boards. |
| Remove stream | Set matched `streams[].status` to `removed`, add `removedBy` and `removedAt`, and update surviving sibling positions where they change. |
| Browse, filter, cancel a dialog, refresh local feed, or idle | No business state writes. |
