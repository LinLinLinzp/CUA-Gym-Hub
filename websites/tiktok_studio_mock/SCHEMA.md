# tiktok_studio_mock Schema

**Base URL** `http://localhost:5361/`  
**Go Endpoint** `GET /go?sid=<sid>` → `{initial_state, current_state, state_diff}`  
**Inject** `POST /post?sid=<sid>` with `{"action":"set","state":{...}}`  
**Reset** `POST /post?sid=<sid>` with `{"action":"reset"}` to restore the initial state on the server

The Harbor API serves the initial state, current state, and top-level diff as JSON at `/go?sid=<session>`. Each accepted action sends the complete current state for its session. Array replacements from injected worlds take precedence at first load. Unknown state keys and unrelated record fields survive updates.

## State Schema

| Key | Type | Description |
| --- | --- | --- |
| `account` | Account | Creator identity shown in the account shell and associated with new actions. |
| `posts` | Post[] | Published, scheduled, and deleted videos. |
| `drafts` | Draft[] | Active, converted, and discarded drafts. |
| `comments` | Comment[] | Audience comments and linked creator replies. |
| `analyticsSamples` | AnalyticsSample[] | Dated account and post performance counters. |
| `analyticsReports` | AnalyticsReport[] | Saved snapshots and CSV export records. |

IDs and date strings use stable fixture values or action-time values. New record IDs start with their record type. All action timestamps are ISO 8601 UTC. Sample dates use UTC calendar days in `YYYY-MM-DD`.

### Record shapes

- **Account** has `id`, `displayName`, `handle`, and `workspaceName` strings, plus optional `avatarUrl`.
- **Content fields** shared by both Posts and Drafts are `id`, `caption`, `actorId`, `updatedById`, `createdAt`, `updatedAt`, nullable `media` and `coverUrl`, `visibility` (`public`, `friends`, `private`), and the booleans `allowComments`, `allowDuet`, and `allowStitch`.
- **Media** has `url`, `name`, `mimeType`, numeric `sizeBytes`, `source` (`sample` or `upload`), and optional numeric `durationSeconds`. URLs are same-origin. Uploads use `POST /upload?sid=<session>` and retain the returned file path in state when the creator saves.
- **Post** adds `status` (`published`, `scheduled`, `deleted`), nullable `publishedAt`, `scheduledAt`, `deletedAt`, and `sourceDraftId`, plus `metrics` with numeric `views`, `likes`, `comments`, and `shares`.
- **Draft** adds `status` (`draft`, `converted`, `discarded`) and nullable `postId`, `convertedAt`, and `discardedAt`. An active draft can have media, a caption, or both.
- **Comment** has `id`, `postId` (nullable when a reply's parent has no post reference), nullable `parentCommentId`, `actorId`, `authorName`, `authorHandle`, `body`, `status` (`visible` or `deleted`), boolean `likedByCreator`, nullable `likedAt`, `likedById`, and `deletedAt`, plus `createdAt`, `updatedAt`, and `updatedById`.
- **AnalyticsSample** has `id`, `date`, nullable `postId` (`null` for account samples), numeric `views`, `likes`, `comments`, and `shares`. Account samples also include `profileViews` and `netFollowers`. Missing counters are read as zero.
- **AnalyticsReport** has `id`, `actorId`, `createdAt`, `scope` (`account` or `post`), nullable `postId`, `startDate`, `endDate`, `metric`, `totals` (numeric keys for the report scope), numeric `sampleCount`, `format` (`snapshot` or `csv`), and `status` (`saved` or `exported`). Date endpoints are inclusive. `totals` records all metrics for the selected scope.

### Default IDs

- Account `creator_mara_ellis`
- Posts `post_001`–`post_036`, with `post_031`–`post_036` scheduled
- Drafts `draft_001`–`draft_024`
- Audience comments `comment_001`–`comment_072` and creator replies `reply_001`–`reply_012`
- Analytics samples `sample_account_<YYYY-MM-DD>` and `sample_<postId>_<YYYY-MM-DD>`
- Analytics reports start empty

## Minimal Inject Example

```json
{
  "account": { "displayName": "Archive Desk" },
  "posts": [{ "id": "archive_post", "status": "published", "caption": "Cataloguing the winter collection" }],
  "drafts": [],
  "comments": [],
  "analyticsSamples": [],
  "analyticsReports": []
}
```

## Observable State Changes (for LLM evaluation)

| Action | State changes |
| --- | --- |
| Post now | Appends `posts[]` with `id`, `caption`, `media`, `coverUrl`, `visibility`, `allowComments`, `allowDuet`, `allowStitch`, `actorId`, `updatedById`, `createdAt`, `updatedAt`, `status: 'published'`, `publishedAt`, `scheduledAt: null`, `deletedAt: null`, `sourceDraftId`, and zeroed `metrics`. |
| Schedule post | Appends the same post shape with `status: 'scheduled'`, `publishedAt: null`, and `scheduledAt` converted from the selected local datetime to UTC. |
| Save changes to a post | Updates `caption`, `coverUrl`, `visibility`, `allowComments`, `allowDuet`, `allowStitch`, `updatedAt`, and `updatedById` on the selected published post. |
| Confirm post deletion or schedule cancellation | Sets the selected post's `status: 'deleted'`, `deletedAt`, `updatedAt`, and `updatedById`. |
| Save as draft from New post | Appends `drafts[]` with all content fields, `status: 'draft'`, `postId: null`, `convertedAt: null`, and `discardedAt: null`. |
| Save as draft from Edit draft | Updates `caption`, `media`, `coverUrl`, `visibility`, `allowComments`, `allowDuet`, `allowStitch`, `updatedAt`, and `updatedById` on the existing active draft and sets its status to 'draft'. |
| Publish or schedule a draft | Appends a post with `sourceDraftId` and applies the composer fields, `status: 'converted'`, the new `postId`, `convertedAt`, `updatedAt`, and `updatedById` to the draft in one write. |
| Confirm Discard draft | Sets the draft's `status: 'discarded'`, `discardedAt`, `updatedAt`, and `updatedById`. |
| Send reply | Appends a comment with `id`, parent `postId`, `parentCommentId`, creator `actorId`, `authorName`, `authorHandle`, trimmed `body`, `status: 'visible'`, `likedByCreator: false`, `likedAt: null`, `likedById: null`, `deletedAt: null`, `createdAt`, `updatedAt`, and `updatedById`. |
| Heart or unheart | Updates `likedByCreator`, `likedAt`, `likedById`, `updatedAt`, and `updatedById`. Unheart clears both like metadata fields to null. |
| Confirm comment deletion | Sets `status: 'deleted'`, `deletedAt`, `updatedAt`, and `updatedById` on each selected audience comment in one write. Existing reply records retain their `parentCommentId`. |
| Save report | Appends an AnalyticsReport with `format: 'snapshot'` and `status: 'saved'`. |
| Export CSV | Downloads the scope's dated rows for the inclusive range and appends an AnalyticsReport with `format: 'csv'` and `status: 'exported'`. |
| Load or inspect a view, filter, select, cancel, or fail validation | No business-state change. First load may send the Harbor baseline. |
