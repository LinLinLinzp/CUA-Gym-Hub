# mattermost_mock Schema

> Implemented schema, version 1. The 19 top-level keys include 16 record collections.
> Full field types, example values, seed and relationship rules: [assets/data_model.md](assets/data_model.md).

**Base URL**: `http://localhost:5304/`  
**Go Endpoint**: `GET /go?sid=<sid>` → `{initial_state, current_state, state_diff}`  
**Inject**: `POST /post?sid=<sid>` with `{"action":"set","state":{...}}`  
**Reset**: `POST /post?sid=<sid>` with `{"action":"reset"}` restores the initial snapshot.

The app uses storage key `mattermost`. `GET /state?sid=<sid>` returns `{stored_state,has_custom_state,sid}`. `/go` reports changed top-level keys as `{modified: value}` or `{added: value}`. Vite isolates these endpoints by sid. Harbor assigns the task sid and isolates state by site within the task container.

A fresh browser context loads a partial injection over the defaults. Arrays replace defaults, objects merge recursively, and the client skips top-level `null` values. The server keeps the first initial snapshot, so merged defaults can appear in `/go` after a partial injection. Use a fresh browser context after injecting or resetting a sid already loaded by the browser.

The client updates its local cache immediately and saves whole snapshots one at a time. If several edits arrive during a write, the next request uses the latest snapshot, which contains those edits. The tab holds that snapshot and its unacknowledged post IDs in session storage until the endpoint confirms success. Unsaved posts are labeled in the timeline. After a failed request or a reload with changes pending, **Retry save** resends the snapshot with its original record IDs. Opening or reloading the page does not replay it. Verify persistence against `current_state` after acknowledgement.

A pending action can appear in the UI before it reaches `/go`. For example, a pin may show the pin strip and success toast while a save failure leaves `pins`, `posts.isPinned`, and `activityLog` unchanged on the server. Retry currently replaces the entire server snapshot. If another tab saved to the same sid in the meantime, its records can disappear.

## State Schema

| Key | Type / record shape |
|---|---|
| schemaVersion | number, `1` |
| currentUserId | string or null, default `usr-alex-morgan` |
| currentTeamId | string or null, default `team-acme` |
| teams | Team[]: `{id,name,displayName,description,iconUrl?,createdAt,updatedAt}` |
| users | User[]: `{id,username,firstName,lastName,email,position,avatarUrl?,status,presence,isGuest,createdAt,updatedAt}` |
| teamMembers | TeamMember[]: `{id,teamId,userId,role,status,createdAt,updatedAt}` |
| channels | Channel[]: `{id,teamId,name,displayName,type,purpose,header,status,isDefault,readOnly?,createdBy,archivedBy,archivedAt,createdAt,updatedAt,bookmarks?}` |
| channelMembers | ChannelMember[]: `{id,channelId,userId,role,status,addedBy,joinedAt,leftAt,isFavorite,muted,lastViewedAt,lastReadPostId,createdAt,updatedAt}` |
| posts | Post[]: `{id,channelId,userId,rootId,message,fileIds,mentionedUserIds,isPinned,editedAt,deletedAt,deletedBy,createdAt,updatedAt,forwardedPostId?}` |
| threads | Thread[]: `{id,rootPostId,channelId,replyCount,lastReplyAt,participantIds,createdAt,updatedAt}` |
| threadMemberships | ThreadMembership[]: `{id,threadId,userId,following,followedAt,unfollowedAt,lastReadAt,lastReadPostId,createdAt,updatedAt}` |
| pins | Pin[]: `{id,channelId,postId,status,pinnedBy,pinnedAt,unpinnedBy,unpinnedAt,createdAt,updatedAt}` |
| files | FileInfo[]: `{id,channelId,postId,uploadedBy,name,storedName,size,mimeType,extension,url,status,createdAt,updatedAt}` |
| drafts | Draft[]: `{id,userId,channelId,rootId,message,fileIds,createdAt,updatedAt}` |
| reactions | Reaction[]: `{id,postId,userId,emojiName,status,createdAt,updatedAt}` |
| savedPosts | SavedPost[]: `{id,postId,userId,status,createdAt,updatedAt}` |
| sidebarCategories | SidebarCategory[]: `{id,userId,teamId,name,type,channelIds,order,collapsed,createdAt,updatedAt}` |
| preferences | Preference[]: `{id,userId,theme,clockFormat,messageDisplay,desktopNotifications,presence,customStatus,createdAt,updatedAt}` |
| activityLog | ActivityLog[]: `{id,action,actorId,entityType,entityId,channelId,relatedIds,details,createdAt}` |

Strings are ids/text/ISO timestamps; counts/bytes/order are numbers; flags are booleans. Nullability/enums are defined in the full model. Bookmark optional shape: `{id,label,url,createdBy,createdAt,updatedAt}`. Newly created entity rows include all required fields and timestamps even if a table below names only action-specific fields. Every business command appends activity with `actorId`, action time, affected ids and structured details. Draft text edits are attributable via draft userId/updatedAt and need no activity entry. Record timestamps only in response to actual user commands.

### Default IDs

| Entity | Example default IDs |
|---|---|
| Team and current user | `team-acme`, `usr-alex-morgan` |
| Other users | `usr-jordan-lee`, `usr-sarah-chen`, `usr-priya-patel` |
| Channels | `ch-town-square`, `ch-engineering`, `ch-release-2026-11` |
| Root posts and threads | `post-town-square-001`, `post-release-plan`, `post-engineering-runbook` (an initially unthreaded post) |
| Sidebar categories | `cat-acme-alex-favorites`, `cat-acme-alex-channels`, `cat-acme-alex-direct_messages` |
| Preference | `pref-alex` |

## Minimal Inject Example

Use this whole `state` value to render one empty writable channel. Open `/audit/channels/review?sid=<sid>` in a fresh browser context.

```json
{
  "schemaVersion": 1,
  "currentUserId": "u1",
  "currentTeamId": "t1",
  "users": [{"id":"u1","username":"auditor"}],
  "teams": [{"id":"t1","name":"audit"}],
  "teamMembers": [{"id":"tm1","teamId":"t1","userId":"u1"}],
  "channels": [{"id":"c1","teamId":"t1","name":"review","type":"O"}],
  "channelMembers": [{"id":"cm1","channelId":"c1","userId":"u1"}],
  "posts": [],
  "threads": [],
  "threadMemberships": [],
  "pins": [],
  "files": [],
  "drafts": [],
  "reactions": [],
  "savedPosts": [],
  "sidebarCategories": [],
  "preferences": [],
  "activityLog": []
}
```

## Observable State Changes (for LLM evaluation)

| User action | Exact state writes beyond record initialization | Activity action / validation |
|---|---|---|
| Create public/private channel | append `channels` with type O/P, name, displayName, purpose, header, status active, createdBy; append creator `channelMembers` role channel_admin/status active/joinedAt; append channel id to own default `sidebarCategories.channelIds`, update category.updatedAt (create default category only if absent) | `channel.create`; unique team slug including archives |
| Join public channel | upsert own `channelMembers.status='active',addedBy,joinedAt,leftAt=null,updatedAt`; own category channelIds/updatedAt | `channel.join`; no duplicate membership |
| Rename/edit header/purpose | target `channels.name,displayName` or `header` or `purpose`, plus updatedAt | `channel.update`; details.changedFields; no unrelated fields reset |
| Add selected channel members | upsert each selected `channelMembers.status,addedBy,joinedAt,leftAt,updatedAt`; assign `role='channel_user'` on creation and retain an existing role on reactivation | `channel.member_add`; details.userIds |
| Make another member a channel admin | existing target `channelMembers.role='channel_admin',updatedAt` | `channel.member_role_update`; entityId is the membership ID, relatedIds contains the target user ID, details include userId and role |
| Remove member / Leave | target `channelMembers.status='left',leftAt,updatedAt`; if current user leaves, remove id from own category channelIds/updatedAt | `channel.member_remove` / `channel.leave`; default/final-admin guard |
| Archive / Unarchive | `channels.status='archived'|'active',archivedBy,archivedAt,updatedAt`; clear archive actor/time when restoring | `channel.archive` / `channel.restore`; preserve all content/membership |
| Write composer text / emoji | upsert matching `drafts.message,fileIds,updatedAt`; remove when empty with no files | no activity required; userId identifies author |
| Send root post | append `posts` with rootId null, message,fileIds,mentionedUserIds,userId,channelId; remove matching draft; attached `files.postId,status='posted',updatedAt`; own `channelMembers.lastViewedAt,lastReadPostId,updatedAt`; create thread/memberships if mentions require following | `post.create`; details.fileIds/mentionedUserIds |
| Edit own post | `posts.message,mentionedUserIds,editedAt,updatedAt`; parse text mentions for display/search, do not retroactively follow edit recipients | `post.edit`; author-only |
| Delete own post | `posts.deletedAt,deletedBy,updatedAt,isPinned=false`; matching active `pins.status='removed',unpinnedBy,unpinnedAt,updatedAt`; attached `files.status='deleted',updatedAt`; if reply or tracked root, refresh the thread's `replyCount,lastReplyAt,participantIds,updatedAt` | `post.delete`; retain tombstone/replies/physical files |
| Reply in thread | append reply `posts.rootId=originalRootId,channelId,message,fileIds,mentionedUserIds`; upsert `threads.replyCount,lastReplyAt,participantIds,updatedAt`; own `threadMemberships.following=true,followedAt,unfollowedAt=null,lastReadAt,lastReadPostId,updatedAt`; consume thread draft; attached files posted/postId/updatedAt; channel read cursor if source channel explicitly viewed; mentioned recipients' memberships following | `thread.reply`; every reply resolves one original root |
| Follow / Unfollow root or thread | create `threads` from the root and existing replies if absent; upsert own `threadMemberships.following,followedAt,unfollowedAt,updatedAt` (opposite follow/unfollow timestamp cleared) | `thread.follow` / `thread.unfollow`; no new posts |
| Explicitly select followed thread / Mark all read | affected `threadMemberships.lastReadAt,lastReadPostId,updatedAt` | `thread.read` / `thread.read_all`; no writes on route mount |
| **Pin post** | upsert `(channelId,postId)` `pins.status='active',pinnedBy,pinnedAt,unpinnedBy=null,unpinnedAt=null,updatedAt`; `posts.isPinned=true,updatedAt` | **`pin.add`**; active member; roots and replies |
| **Unpin post** | `pins.status='removed',unpinnedBy,unpinnedAt,updatedAt`; `posts.isPinned=false,updatedAt` | **`pin.remove`**; row retained for history |
| Open pins pane / Jump to source | none | no log; jumping is navigation, not implicit read |
| **Successful local upload** | append `files` with channelId, postId null, uploadedBy, name,storedName,size,mimeType,extension,url,status staged; upsert matching draft.fileIds/updatedAt | **`file.upload`**; name comes from the selected browser file, storage name and URL come from the endpoint, and returned size must match the selected file |
| Failed upload / Retry pending | no business writes until success, including if the returned size differs from the selected file | no failed file row; successful retry creates one staged row |
| **Send attachment(s)** | append root/reply post.fileIds; `files.postId,status='posted',updatedAt`; matching draft consumed; thread fields if reply | **`post.create` / `thread.reply`** with related file ids |
| Remove staged attachment | `files.status='cancelled',updatedAt`; matching `drafts.fileIds,updatedAt` or remove empty draft | `file.cancel`; postId stays null |
| Preview/search/download file | none | no download history invented; local stored URL/bytes persist |
| Toggle reaction | upsert `(postId,userId,emojiName)` `reactions.status='active'|'removed',updatedAt` | `reaction.add` / `reaction.remove` |
| Save / Unsave message | upsert `(postId,userId)` `savedPosts.status='active'|'removed',updatedAt` | `saved.add` / `saved.remove`; never changes pin |
| Start new direct/group conversation | append channel type D/G; append participant channelMembers; own DM category.channelIds/updatedAt | `conversation.create`; existing participant set reuses channel without write |
| Favorite / Unfavorite | own `channelMembers.isFavorite,updatedAt`; source/destination `sidebarCategories.channelIds,updatedAt` | `channel.favorite` / `channel.unfavorite` |
| Mute / Unmute | own `channelMembers.muted,updatedAt` | `channel.mute` / `channel.unmute` |
| Explicit click channel read / Mark unread | own `channelMembers.lastViewedAt,lastReadPostId,updatedAt`; unread cursor is post immediately preceding chosen unread post, lastViewedAt is that cursor's createdAt (both null if first) | `channel.read` / `channel.unread`; no mount writes |
| Settings/status Save | upsert own `preferences` changed theme/clockFormat/messageDisplay/desktopNotifications/presence/customStatus fields, updatedAt | `preferences.update`; Cancel writes nothing |
| P2 create/rename/move/reorder/collapse/delete category | own `sidebarCategories` fields/records, updatedAt; move/delete custom reassigns ids; favorites move updates member.isFavorite/updatedAt | `category.update`; details include removedId if deleted |
| P2 forward | append destination `posts.forwardedPostId` and ordinary root-post fields; own destination `channelMembers.lastViewedAt,lastReadPostId,updatedAt`; create `threads` and recipients' `threadMemberships` when the comment mentions eligible users; preserve the destination draft | `post.forward`; details.forwardedPostId |
| P2 header bookmark add/edit/delete | `channels.bookmarks` nested records and channel.updatedAt | `bookmark.update`; details operation/id |
| Retry save | submits the pending whole snapshot as `set_current` using the original entity and activity IDs | no retry activity row; the server may already hold those IDs if the acknowledgement failed |
| Search/filter/sort, pane open/close, modal Cancel, responsive layout, permalink copy, app boot/deep-link reload | none (boot loadState makes the template's one baseline `set` only) | no timers/normalization/auto-read; clipboard action is transient |

## Seed inventory

The fixed world has 1 team, 32 users and team memberships, 56 channels, 345 channel memberships, 240 root posts,
120 replies, 44 threads, 90 thread memberships, 32 pins, 27 saves, 39 files, 3 drafts, 90 reactions, 3 categories,
32 preferences, and an empty activity log. The 39 files include 36 posted, 2 staged, and 1 cancelled record. All ten
fixture URLs serve bundled bytes. The reference photograph is NASA image C-2006-1850, in the public domain in the
United States. [Photo record](https://commons.wikimedia.org/wiki/File:A_NASA_computer_server_farm_-a.jpg)

Search uses exclusive whole-day UTC bounds. `before:2026-11-17` ends at the start of November 17 and
`after:2026-11-17` starts at the beginning of November 18.

## Verifier invariants

- All four SEED workflows map to P1 commands in TODO. Actual channel/post/pin/file records are required; activity entries or toasts alone cannot pass.
- Ids fixed in seed; generated action ids are found by relations/attributes. Follow keys are root ids; a reply to a reply never creates a separate root. `threads.replyCount` counts nondeleted replies. Active pins and post.isPinned agree.
- Actual upload bytes use local multipart `/upload`; FileInfo.url is returned `/files/...` path; file.size must match downloadable bytes. Draft file ids become exactly the sent post's ids; cancelled file cannot be attached. Seed fixture URLs are bundled and downloadable offline.
- Honor injected empty/replacement arrays and missing optional fields without auto-repair saves. Unknown/inaccessible deep links render neutral states. No foreign world identity/records are silently created at startup.
- Own preferences/saves/favorites are keyed by user; channel pins are shared. All business mutations carry actor/time via record fields and activityLog. All state remains serializable.
- The Playwright workflow report records browser results in TEST.md.
