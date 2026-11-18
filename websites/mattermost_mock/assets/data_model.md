# Mattermost state model

> Planned implementation contract, 2026-11-18. This specifies the local sandbox, not a claim that its JSON is the upstream Mattermost API. The runtime contract is authoritative. Keep this file, reducers, seed and SCHEMA.md consistent.

## 1. Storage, identity and conventions

Copy the standard client template unchanged to `src/utils/dataManager.js`; import the standard server plugin unchanged. `APP = 'mattermost'`. Await `loadState(APP, createInitialData)` before rendering. A single command dispatcher computes the entire next state atomically and calls `saveState(APP,next)` once per actual user mutation. No mount, idle, polling, auto-expiry or simulated event writes. In-memory modal/search/route state is separate.

Dates below have type `ISO = string` (UTC ISO 8601, e.g. `2026-11-17T09:30:00.000Z`). User-command timestamps use `new Date().toISOString()`; defaults use fixed literals. New ids use a collision-resistant browser UUID with entity prefix; seed ids never vary. All ids are strings. Nullable fields use JSON `null`. Optional fields are marked `?`; render sensible defaults without persisting repairs. Empty injected arrays remain empty. Counters are numbers, booleans are booleans. Do not store Date, Set, Map, DOM nodes, File/Blob, functions or object URLs.

Unless specified otherwise, `createdAt` and `updatedAt` are ISO strings on every entity record; seeded values are fixed. `activityLog` is append-only and has no updatedAt. It is the actor/timestamp record for every business mutation, including changes to records that were originally created by someone else. Only draft text edits may omit an activity entry; the draft's `userId` and `updatedAt` supply attribution. User-command actions with unchanged values are no-ops.

Current user/team are injected world context, not authentication. Switching route team is transient; do not rewrite `currentTeamId` on mount. Resolve active team from route or context; current user may be missing, yielding a neutral no-user view.

## 2. Top-level world and `createInitialData()` structure

Exactly 19 top-level keys, 16 record collections. Return a fresh JSON tree on each seed call. The following is a structural sketch, not a complete data seed:

```js
export function createInitialData() {
  return {
    schemaVersion: 1,
    currentUserId: 'usr-alex-morgan',
    currentTeamId: 'team-acme',
    teams: [/* Team */],
    users: [/* User */],
    teamMembers: [/* TeamMember */],
    channels: [/* Channel, including D/G */],
    channelMembers: [/* ChannelMember */],
    posts: [/* Post, roots + replies */],
    threads: [/* Thread, id === rootPostId */],
    threadMemberships: [/* ThreadMembership */],
    pins: [/* Pin */],
    files: [/* FileInfo */],
    drafts: [/* Draft */],
    reactions: [/* Reaction */],
    savedPosts: [/* SavedPost */],
    sidebarCategories: [/* SidebarCategory */],
    preferences: [/* Preference */],
    activityLog: []
  }
}
```

`schemaVersion:number` is `1`; `currentUserId:string|null` and `currentTeamId:string|null` identify the default context. Injected arrays replace whole default arrays; objects merge per unchanged template. Do not introduce nested per-channel caches as a second source of truth.

## 3. Identity and teams

### Team

| Field | Type | Example / meaning |
|---|---|---|
| id | string | `team-acme` |
| name | string | `acme`, route slug |
| displayName | string | `Acme` |
| description | string | `Product and engineering collaboration` |
| iconUrl? | string or null | `/fixtures/acme.svg`, local only |
| createdAt, updatedAt | ISO | `2026-11-01T08:00:00.000Z` |

### User

| Field | Type | Example / meaning |
|---|---|---|
| id | string | `usr-alex-morgan` |
| username | string | `alex.morgan`, unique |
| firstName, lastName | string | `Alex`, `Morgan` |
| email | string | `alex.morgan@acme.example` |
| position | string | `Engineering Manager` |
| avatarUrl? | string or null | `/avatars/alex.svg`; initials fallback |
| status | enum | `active` or `inactive`, account availability for selectors |
| presence | enum | `online`, `away`, `dnd`, `offline`, fixed fallback display |
| isGuest | boolean | `false` |
| createdAt, updatedAt | ISO | fixed initial dates |

### TeamMember

| Field | Type | Example / meaning |
|---|---|---|
| id | string | `tm-acme-alex` |
| teamId, userId | string | `team-acme`, `usr-alex-morgan` |
| role | enum | `team_admin` or `team_user` |
| status | enum | `active` or `left` |
| createdAt, updatedAt | ISO | fixed initial dates |

Unique `(teamId,userId)`. Alex is team_admin; no production access-control subsystem required. UI permission checks still respect membership, readOnly, channel status and current author.

## 4. Channels and memberships

### Channel

| Field | Type | Example / meaning |
|---|---|---|
| id | string | `ch-town-square` |
| teamId | string | `team-acme`; D/G are scoped locally to this team |
| name | string | `town-square`, unique URL slug within team including archives |
| displayName | string | `Town Square` |
| type | enum | `O` public, `P` private, `D` direct, `G` group |
| purpose | string | `Company-wide announcements and discussions` |
| header | string | `Share weekly updates here` |
| status | enum | `active` or `archived` |
| isDefault | boolean | `true` for Town Square |
| readOnly? | boolean | `false` fallback; seeded reference can be true |
| createdBy | string | `usr-alex-morgan` |
| archivedBy, archivedAt | string or null, ISO or null | `null` while active |
| createdAt, updatedAt | ISO | fixed seed or action time |
| bookmarks? | Bookmark[] | P2 only; default `[]` |

Bookmark fields: `id:string` (`bm-runbook`), `label:string` (`Release Runbook`), `url:string` (local or inert external reference), `createdBy:string`, `createdAt:ISO`, `updatedAt:ISO`. No unrequested external fetch on display.

Name 2–64 trimmed display characters; slug contains lowercase letters/numbers/`_`/`-` only and is nonempty. Generate slug from display name, allow editing. Archived slugs remain reserved. DM/group internal names can use stable id-based slugs; labels derive from participant names for current viewer. Never use displayName as a foreign key.

### ChannelMember

| Field | Type | Example / meaning |
|---|---|---|
| id | string | `cm-town-alex` |
| channelId, userId | string | `ch-town-square`, `usr-alex-morgan` |
| role | enum | `channel_admin` or `channel_user` |
| status | enum | `active` or `left` |
| addedBy | string | `usr-alex-morgan` or seeded adding member |
| joinedAt | ISO | join/reactivation time |
| leftAt | ISO or null | `null` when active |
| isFavorite, muted | boolean | `false`, `false` |
| lastViewedAt | ISO or null | last explicit read action |
| lastReadPostId | string or null | `post-town-018` |
| createdAt, updatedAt | ISO | creation/action time |

Unique `(channelId,userId)` including left history; rejoin reactivates existing row rather than duplicate. Channel creation appends creator admin membership. Count only active members. Removing/leave records status/leftAt; no cascading deletion. Favorites mirror current user's category placement. Membership and category rows survive archive; selectors exclude archives from active sidebar. Non-guest cannot leave default channel, channel cannot lose its final active admin by member removal. Team admin or channel admin can edit/manage; active member can pin/post unless readOnly/archived. Public nonmembers may preview but cannot post until Join; private/D/G require active membership.

## 5. Messages and threads

### Post

| Field | Type | Example / meaning |
|---|---|---|
| id | string | `post-release-plan` |
| channelId, userId | string | `ch-release-2026-11`, `usr-sarah-chen` |
| rootId | string or null | `null` for root; `post-release-plan` for every nested reply |
| message | string | `Release checklist is ready. @alex.morgan please review.` |
| fileIds | string[] | `['file-release-checklist']` |
| mentionedUserIds | string[] | `['usr-alex-morgan']` |
| isPinned | boolean | mirror of active pins for this post |
| editedAt | ISO or null | `null` before first edit |
| deletedAt, deletedBy | ISO or null, string or null | tombstone metadata |
| createdAt, updatedAt | ISO | fixed seed/action time |
| forwardedPostId? | string or null | P2 original-source link |

Timeline is roots oldest first; replies appear collapsed under root and in thread pane. `rootId` always references a root in the same channel. Sort tied dates by id for deterministic display. Markdown stored as string; sanitize at render. Only author edits/deletes in this sandbox. Delete keeps tombstone record and history; a deleted root still anchors visible replies. File cards on a deleted post are hidden. Post attachment ids and `files.postId` form reciprocal links.

### Thread

| Field | Type | Example / meaning |
|---|---|---|
| id, rootPostId | string | both `post-release-plan` |
| channelId | string | same as root |
| replyCount | number | `3`, count of nondeleted replies |
| lastReplyAt | ISO or null | latest nondeleted reply.createdAt, `null` if none |
| participantIds | string[] | unique authors of nondeleted root/replies, root first |
| createdAt, updatedAt | ISO | record creation/latest mutation |

Create lazily on first reply, explicit follow, or sending a mention that needs following; no thread rows created by rendering or opening. Thread `createdAt` is creation of tracking record, root's original time remains in posts. Update derived mirrors atomically on reply create/delete. Editing changes message timestamps, not ordering or lastReplyAt. For malformed injected mirrors, render derived counts from posts without saving repairs.

### ThreadMembership

| Field | Type | Example / meaning |
|---|---|---|
| id | string | `thm-release-alex` |
| threadId, userId | string | root/thread id, viewer id |
| following | boolean | `true` |
| followedAt, unfollowedAt | ISO or null | latest follow/unfollow time; opposite cleared on toggle |
| lastReadAt | ISO or null | last explicit thread selection/read-all or own reply |
| lastReadPostId | string or null | latest visible reply at read time, or root |
| createdAt, updatedAt | ISO | tracking record times |

Unique `(threadId,userId)`. Reply follows current author, sets own read cursor. Sending an explicit mention follows mentioned users without marking their thread read. Do not notify/send anything externally. Merely viewing a root does not auto-follow; explicit selection can update an already-followed thread's read cursor; a deep link mount cannot. Unread compares visible reply position/time against saved cursor, excluding own replies. If cursor missing/deleted, use lastReadAt as fallback. Inbox filters following/current-team/access and orders by latest reply or root.createdAt.

## 6. Pins, files and drafts

### Pin

| Field | Type | Example / meaning |
|---|---|---|
| id | string | `pin-release-plan` |
| channelId, postId | string | source channel and root/reply post |
| status | enum | `active` or `removed` |
| pinnedBy, pinnedAt | string, ISO | actor and latest pin time |
| unpinnedBy, unpinnedAt | string or null, ISO or null | actor/time when removed |
| createdAt, updatedAt | ISO | history/current mutation time |

One row per `(channelId,postId)`; repin updates same row, clears unpin metadata, updates pinnedBy/pinnedAt. Pin and `posts.isPinned` change together. Shared across channel members, unlike saves. Deleted posts cannot remain active pinned. Reply pin links to reply and original root on jump. Unpinning last post does not remove channel or close pane.

### FileInfo

| Field | Type | Example / meaning |
|---|---|---|
| id | string | `file-release-checklist` |
| channelId | string | intended/source channel |
| postId | string or null | `post-release-plan` after send; `null` while staged/cancelled |
| uploadedBy | string | actor id |
| name | string | `release-checklist.csv`, browser `File.name` |
| storedName | string | server `stored_name`, e.g. `7bc31a20_release-checklist.csv` |
| size | number | `1842`, exact bytes |
| mimeType | string | `text/csv`, server `content_type` |
| extension | string | `csv`, lowercase sans dot |
| url | string | `/files/run-123/7bc31a20_release-checklist.csv` from server; seed `/fixtures/release-checklist.csv` |
| status | enum | `staged`, `posted`, `cancelled`, `deleted` |
| createdAt, updatedAt | ISO | successful upload/send/cancel/delete times |

Upload wire response: `{success:true,files:[{url,original_name,stored_name,size,content_type}]}`. Persist the selected `File.name` for display and downloads. Take the URL, storage name, size and content type from the successful response and require the returned size to match the browser file. Multipart uses browser FormData (do not set boundary manually); route includes current sid via `withSid('/upload')`. With no sid, template uses `_default` storage. URLs already encode file namespace; keep unchanged for download and original bytes. Browser blob URL may exist temporarily for preview only. Seed fixtures must ship with `public/fixtures` and truthful MIME/size; do not seed `/files` paths without uploading bytes.

Send transaction: post.fileIds gets staged file ids, files get new postId/status posted, matching draft clears. Thread reply attachment's file channelId stays source channel and postId points to reply. Remove from draft sets cancelled and excludes from send; no physical deletion endpoint exists or is required. Failed uploads are transient errors with no successful FileInfo row. Post delete marks attached file rows deleted but keeps metadata and physical bytes; UI hides them. State does not claim to purge server bytes. Max 10 files/post and 100 MB/file local validation; no thumbnail processing dependency. Reject 0-byte files only if local implementation documents that deviation (prefer allowing valid empty text files).

### Draft

| Field | Type | Example / meaning |
|---|---|---|
| id | string | `draft-alex-release-root` |
| userId, channelId | string | current author, destination |
| rootId | string or null | thread root id, `null` for channel draft |
| message | string | `Reviewing the checklist now.` |
| fileIds | string[] | successful staged file ids |
| createdAt, updatedAt | ISO | first edit/latest user edit |

Unique `(userId,channelId,rootId)`. User input saves synchronously through command dispatcher; do not post later from idle/debounce. Sending consumes/removes only matching draft. Empty text + no staged files removes row. Navigation preserves drafts; Cancel closes dialog without discarding a composer unless an explicit discard action was used. There is no draft for another user on current composer.

## 7. Reactions, saves, navigation and preferences

### Reaction

Fields: `id:string` (`react-plan-alex-thumbsup`), `postId:string`, `userId:string`, `emojiName:string` (`thumbsup`), `status:'active'|'removed'`, `createdAt:ISO`, `updatedAt:ISO`. Unique post/user/emoji tuple; toggle status, derive counts from active records. Emoji display comes from local mapping. A removed row preserves history.

### SavedPost

Fields: `id:string` (`save-plan-alex`), `postId:string`, `userId:string`, `status:'active'|'removed'`, `createdAt:ISO`, `updatedAt:ISO`. Unique post/user; viewer-specific, active accessible nondeleted posts only. No `channelId` necessary because post resolves it. Save never mutates pins.

### SidebarCategory

Fields: `id:string` (`cat-acme-alex-favorites`), `userId:string`, `teamId:string`, `name:string` (`Favorites`), `type:'favorites'|'channels'|'direct_messages'|'custom'`, `channelIds:string[]` (`['ch-release-2026-11']`), `order:number` (`0`), `collapsed:boolean` (`false`), `createdAt:ISO`, `updatedAt:ISO`. Each visible channel appears at most once across one user's team categories. Active joined channels missing category entry render under default type without writing repairs. New channel/join/DM commands explicitly ensure relevant built-in category if absent and append its id. Favoriting keeps isFavorite/category consistent; unfavorite returns to Channels or Direct Messages based on type. Leaving removes own category ids; archive does not. Collapsing/reordering is P2 business preference, not a timer action.

### Preference

Fields: `id:string` (`pref-alex`), `userId:string` (unique), `theme:'denim'|'dark'`, `clockFormat:'12h'|'24h'`, `messageDisplay:'comfortable'|'compact'`, `desktopNotifications:'all'|'mentions'|'none'`, `presence:'online'|'away'|'dnd'|'offline'`, `customStatus:string` (`Reviewing release readiness`), `createdAt:ISO`, `updatedAt:ISO`. Defaults denim/12h/comfortable/mentions, empty customStatus; presence falls back to User.presence. This is UI preference only; no notification API or auto-expiry. Creating preference after injected absence is allowed only on explicit Save.

### ActivityLog

Fields: `id:string` (`evt-<uuid>`), `action:string` (`pin.add`), `actorId:string`, `entityType:string` (`pin`), `entityId:string`, `channelId:string|null`, `relatedIds:string[]` (`['post-release-plan']`), `details:object` of JSON scalars/arrays/objects (e.g. `{postId:'post-release-plan',status:'active'}`), `createdAt:ISO`. This internal record need not appear in product UI. Record exact affected ids, action and actor; no secrets/serialized browser File objects. A batch transaction can use one log entry with all affected ids in details. Full command mapping in SCHEMA; no synthetic activity on reads without explicit action, cancelled dialogs or unsuccessful operations.

## 8. Relationships, consistency and transaction order

- User→team through teamMembers; user→channel through channelMembers. Posts.channelId and all pins/files/threads must resolve the same channel; posts.userId resolves an author.
- Thread.id=rootPostId=Post.id; replies.rootId targets that id; threadMembership.threadId targets Thread.id. Posts don't need an eagerly created Thread until reply/follow/mention.
- Pin points to post/channel; `post.isPinned === any active pin for post`. Files.postId ↔ post.fileIds; staged files belong to draft.fileIds. A file cannot be attached to two posts.
- `draft.rootId` is null or a valid root in its channel. Reaction/savedPost point to post and user. Category belongs to current viewer/team, not the channel globally.
- Every command checks current world and permissions, validates input, computes all entity changes and audit entry, then saves one complete next tree. Failed validation and repeated no-ops save nothing. Upload byte request precedes the successful metadata transaction; state API failure cannot be represented as a guaranteed transactional file-store rollback.
- If multiple files succeed partly, retain successful staged chips/records and show errors for failed files. Block send while selected pending/error chips remain, allowing Remove or Retry. Store failures visibly; do not label them posted. After reload only successful staged ids survive.
- Render missing optional data with `?? []`, `?? ''`, initials, `Unknown user`, `Original message unavailable`. If a foreign entity is absent/inaccessible, omit action/placeholder instead of crashing or inventing a linked row. Mutation target must exist and be permitted; no normalization save on boot.
- All counts are derived in selectors except explicit thread mirrors. Thread mirrors must be maintained by commands; when injected mismatched, derive display from posts without mutating input. Navigation/cursors write only through explicit click/key commands, not location effects.
- `/go` diffs show modified whole top-level arrays. Verifiers locate records by ids/relations, never array positions or exact generated UUIDs. Read baseline before actions; note other legitimate keys such as drafts/activityLog change along with primary entities.

## 9. Seed volume and named training targets

Use the counts specified in TODO S-01–08. Smaller configuration collections (one team, three categories per current viewer) need not contain dozens; main users/channels/posts/threads/files collections do. Seed times span fixed dates ending 2026-11-17; relative UI dates use runtime clock, never a hard-coded today.

| Fixed id | Human-facing fixture | Scenario |
|---|---|---|
| `usr-alex-morgan` | Alex Morgan / alex.morgan | default actor, team admin |
| `usr-sarah-chen` | Sarah Chen / sarah.chen | release coordinator, other-author posts |
| `usr-jordan-lee` | Jordan Lee / jordan.lee | new channel member selection |
| `team-acme` | Acme | route `acme` |
| `ch-town-square` | Town Square | default, joined, cannot leave/archive |
| `ch-engineering` | Engineering | dense discussion and upload target |
| `ch-design` | Design | public, initially not joined, browse/join target |
| `ch-release-2026-11` | November Release | followed threads and pins |
| `ch-security-review` | Security Review | private joined channel |
| `ch-leadership-private` | Leadership | inaccessible private channel, no discovery |
| `ch-q3-retro` | Q3 Retrospective | archived history, restore target |
| `post-release-plan` | Sarah's release checklist message | thread root, active pinned, attachment |
| `post-engineering-runbook` | Alex's rollout runbook message | own edit/delete, initially unpinned |
| `post-release-reply-01` | Jordan's QA reply | reply link/attachment/pin handling |
| `file-release-checklist` | release-checklist.csv | posted local fixture |

New channel training example: `Release Readiness`, slug `release-readiness`, private, purpose `Coordinate the November release sign-off.` It must not already exist in defaults. Populate everyday discussions with coherent authors/replies, not repeated lorem ipsum. A dozen channel purposes should share searchable business concepts (release, customer, incident) without being identical. Files have realistic English names and local bytes; avatars and logos are local SVG/PNG. Record the exact seed counts once implemented in SCHEMA/TEST.

## 10. Upstream references and local adaptations

Official resource groups distinguish [channels](https://docs.mattermost.com/api/reference/channels), [posts](https://docs.mattermost.com/api/reference/posts), [files](https://docs.mattermost.com/api/reference/files), reactions and threads. This model deliberately uses readable camelCase, ISO times, normalized pin/file/draft lifecycle and an audit collection for deterministic verifier access. It does not emulate production API endpoints or numeric millisecond timestamp fields. Operational APIs are exclusively the supplied Harbor templates.
