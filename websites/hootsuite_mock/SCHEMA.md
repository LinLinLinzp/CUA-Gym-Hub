# hootsuite_mock Schema

**Base URL**: `http://localhost:5472/`  
**Go Endpoint**: `GET /go?sid=<sid>` → `{initial_state, current_state, state_diff}`  
**Inject**: `POST /post?sid=<sid>` with body `{"action":"set","state":{...}}`  
**Reset**: `POST /post?sid=<sid>` with body `{"action":"reset"}` restores the stored initial state, falling back to defaults when there is no baseline.

## State Schema

The state is one JSON object per session. Each row ID is a string, and dates and timestamps in the state are ISO UTC strings unless nullable. A successful business submission calls the shared store once with the entire snapshot. The current actor resolves from `workspace.currentUserId` into `users`.

| Top-level key | Record shape |
| --- | --- |
| `workspace` | `{id, name, timeZone, currentUserId}`. The time zone is an IANA identifier, UTC by default. |
| `users` | `[{id, name, initials, role}]`. |
| `profiles` | `[{id, name, handle, network}]`. Network is `instagram`, `linkedin`, `facebook`, or `x`. |
| `posts` | `[{id, body, profileIds, status, scheduledAt, createdBy, createdAt, updatedBy, updatedAt}]`. `profileIds` is an array of profile IDs. `scheduledAt` is nullable. Status is `draft`, `scheduled`, `pending_approval`, `rejected`, `published`, or `canceled`. |
| `approvals` | `[{id, postId, reviewerId, requestedBy, requestNote, status, previousRequestId, createdAt, decisionNote, decidedBy, decidedAt}]`. Empty request notes use an empty string. The predecessor and decision fields are nullable. Status is `pending`, `approved`, or `rejected`. |
| `streamBoards` | `[{id, name, position, status, createdBy, createdAt, updatedBy, updatedAt, removedBy, removedAt}]`. Positions are integers. Status is `active` or `removed`. Removal fields are nullable. |
| `streams` | `[{id, boardId, name, profileId, type, query, position, status, createdBy, createdAt, updatedBy, updatedAt, removedBy, removedAt}]`. Type is `my_posts`, `mentions`, or `keyword_search`. Query is nullable outside keyword search. Position is an integer. Status is `active` or `removed`. Removal fields are nullable. |
| `feedItems` | `[{id, profileId, kind, authorName, authorHandle, body, createdAt}]`. Kind is `owned`, `mention`, or `discovery`. These rows supply the local feeds. |

Actor fields reference `users[].id`. The other relationship IDs refer to their named collections. Harbor returns `initial_state`, `current_state`, and a top-level `state_diff` at `/go`.

### Default IDs

| Collection | IDs |
| --- | --- |
| Workspace | `workspace-01` (Juniper Works) |
| Users | `user-01` through `user-06`. Maya Chen is `user-01`, the default signed-in user. |
| Profiles | `profile-01` through `profile-06`. `profile-01` is Juniper Works on Instagram and `profile-04` is Juniper Works on X. |
| Posts | `post-01` through `post-48` |
| Approvals | `approval-01` through `approval-30` |
| Stream boards | `board-01` through `board-06` |
| Streams | `stream-01` through `stream-24` |
| Feed items | `feed-01` through `feed-72` |

## Minimal Inject Example

Use the following `state` to open an empty workspace with the seeded account and connected profiles available. Arrays in an injection replace the seeded collections. The `workspace` object merges with the default workspace fields. Use a fresh browser context for a newly injected session so the client loads the injected state before caching it.

```json
{
  "workspace": { "name": "Juniper Works Test", "timeZone": "UTC" },
  "posts": [],
  "approvals": [],
  "streamBoards": [],
  "streams": [],
  "feedItems": []
}
```

## Observable State Changes (for LLM evaluation)

New posts, boards, and streams receive `createdBy`, `createdAt`, `updatedBy`, and `updatedAt`. Updates to those collections set `updatedBy` and `updatedAt` on each changed record. All metadata for a single action shares its actor and timestamp.

| User action | Record writes |
| --- | --- |
| Save draft / Schedule new post | Append a `posts` record with the submitted `body`, `profileIds`, `scheduledAt`, and `status` of `draft` or `scheduled`. |
| Edit post | Update the same `posts` record with the submitted `body`, `profileIds`, `scheduledAt`, and `status` of `scheduled` or `draft`. |
| Reschedule post | Update the same scheduled `posts` record's `scheduledAt` and update metadata. |
| Move post to Drafts | Set `posts[].status` to `draft` and `scheduledAt` to `null`. |
| Cancel scheduled post | Set `posts[].status` to `canceled`, retaining `scheduledAt`. |
| Request approval | Append or update the post with submitted fields and `status: "pending_approval"`. Append a pending approval with `postId`, `reviewerId`, `requestedBy`, `requestNote`, `createdAt`, and null predecessor and decision fields. |
| Approve / Reject | Update the matched approval's `status`, `decisionNote`, `decidedBy`, and `decidedAt`. Set its linked post's status to `scheduled` or `rejected`, respectively. Approval without a note uses null. |
| Revise and resubmit | Update the linked post with the submitted fields and `status: "pending_approval"`. Append a pending approval with `previousRequestId` pointing to the rejected request. |
| Create / Rename board | Append an active board with `name` and `position`, or update the existing board's `name`. |
| Remove board | Set `status: "removed"`, `removedBy`, and `removedAt` on the board and all active child streams. |
| Add / Edit stream | Append an active stream with `boardId`, `name`, `profileId`, `type`, `query`, and `position`, or update `name`, `profileId`, `type`, and `query` on the current stream. |
| Reorder / Move stream | Update positions that change on the affected boards and update the moved stream's `boardId` when changing boards. |
| Remove stream | Set the selected stream's `status` to `removed` and add `removedBy` and `removedAt`. Renumber surviving sibling positions where needed. |
| Browse, filter, cancel a dialog, refresh a local feed, or idle | No business state writes. |

