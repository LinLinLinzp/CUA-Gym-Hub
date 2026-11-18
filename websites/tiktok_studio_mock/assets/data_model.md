# TikTok Studio data model

Use JSON-compatible values. IDs are strings. Timestamps are ISO-8601 UTC strings and analytics dates are UTC calendar dates in `YYYY-MM-DD` format. A question mark marks an optional injected field. Nullable relationships and timestamps are explicit on newly written records. Preserve unconsumed injected data on update.

## Top-level state

| Key | Shape | Example |
| --- | --- | --- |
| `account` | Account | Mara Ellis, @fieldnotes.culture |
| `posts` | Post[] | Wood type printmaking feature |
| `drafts` | Draft[] | Unfinished neighborhood cinema feature |
| `comments` | Comment[] | Viewer question with a linked creator reply |
| `analyticsSamples` | AnalyticsSample[] | Daily account and per-post metrics |
| `analyticsReports` | AnalyticsReport[] | Saved snapshot or CSV export record |

## Account and creator references

```json
{
  "id": "creator_mara_ellis",
  "displayName": "Mara Ellis",
  "handle": "fieldnotes.culture",
  "workspaceName": "Field Notes on Culture",
  "avatarUrl": "/covers/mara-ellis.webp"
}
```

`id`, `displayName`, `handle`, and `workspaceName` are strings. `avatarUrl?` is a local path string. Use initials when the avatar is absent. Handle formatting adds the @ in the UI. The account ID supplies `actorId` and `updatedById` on creator changes.

## Posts and drafts

Both collections share the following fields. An optional injected field gets a neutral display fallback.

| Fields | Type | Example |
| --- | --- | --- |
| `id`, `actorId`, `updatedById` | string each | `post_018`, `creator_mara_ellis`, `creator_mara_ellis` |
| `caption` | string | `Inside a working letterpress room. #PrintCulture #WoodType` |
| `media?` | Media or null | A local sample or a file returned by Harbor |
| `coverUrl?` | string or null | `/covers/wood-type.webp` |
| `visibility` | enum | `public`, `friends`, `private` (Everyone, Friends, Only you) |
| `allowComments`, `allowDuet`, `allowStitch` | boolean each | `true`, `false`, `false` |
| `createdAt`, `updatedAt` | timestamp each | `2026-11-10T16:20:00.000Z` |

**Media** is an object with `url` (same-origin string), `name` (string), `mimeType` (string), `sizeBytes` (nonnegative integer), `source` (`sample` or `upload`), and optional `durationSeconds` (number). Example values are `/media/wood-type.mp4`, `wood-type.mp4`, `video/mp4`, `612480`, `sample`, and `18`. Normalize uploaded file fields returned by `/upload` into this object. Keep binary media and temporary preview URLs out of state. Use an original sample library bundled with the app. Validate the file before the same-origin request, show progress/error, and leave business state untouched until an explicit Save, Post or Schedule succeeds.

| Collection | Additional fields | Type and example |
| --- | --- | --- |
| Post | `status` | `published`, `scheduled` or `deleted` |
| Post | `publishedAt`, `scheduledAt`, `deletedAt` | Timestamp or null each. A scheduled post might have `scheduledAt: "2026-11-20T17:30:00.000Z"` with null for the others. |
| Post | `sourceDraftId?` | String or null, e.g. `draft_009` |
| Post | `metrics?` | Object of nonnegative integer `views`, `likes`, `comments`, `shares`, e.g. `{ "views": 32418, "likes": 2853, "comments": 96, "shares": 241 }` |
| Draft | `status` | `draft`, `converted` or `discarded` |
| Draft | `postId` | String or null, e.g. `post_018` after conversion |
| Draft | `convertedAt`, `discardedAt` | Timestamp or null each |

Derive hashtags for search from caption text. On creation, use the same ISO timestamp for `createdAt` and `updatedAt` and the creator for both actor fields. Post and draft editing preserves the original creation fields. A blank draft may save with media and a missing-media draft may save with a caption. Convert only an active draft, recording both links in one update. No timer or reload changes a scheduled record.

## Comments

```json
{
  "id": "comment_042",
  "postId": "post_018",
  "parentCommentId": null,
  "actorId": "viewer_vera_cho",
  "authorName": "Vera Cho",
  "authorHandle": "vera_types",
  "body": "Is that a hand-carved ampersand in the second drawer?",
  "status": "visible",
  "likedByCreator": true,
  "likedAt": "2026-11-12T12:04:00.000Z",
  "likedById": "creator_mara_ellis",
  "createdAt": "2026-11-11T19:45:00.000Z",
  "updatedAt": "2026-11-12T12:04:00.000Z",
  "updatedById": "creator_mara_ellis",
  "deletedAt": null
}
```

`id`, `postId`, `actorId`, `authorName`, `authorHandle`, `body`, and `updatedById` are strings. `parentCommentId` and `likedById` are strings or null. `status` is `visible` or `deleted`. `likedByCreator` is boolean. `createdAt` and `updatedAt` are timestamps. `likedAt` and `deletedAt` are timestamps or null. A creator reply uses the account's actor ID, name and handle and its parent's post ID. Its initial like and deletion fields are false/null. Unheart resets `likedAt` and `likedById` to null and updates the normal edit metadata. Replied status derives from visible direct replies by the account. The aggregate post metrics are historical observations and separate from the inbox.

## Analytics samples

```json
{
  "id": "sample_account_2026-11-10",
  "date": "2026-11-10",
  "postId": null,
  "views": 6801,
  "profileViews": 344,
  "likes": 756,
  "comments": 27,
  "shares": 62,
  "netFollowers": 34
}
```

`id` and `date` are strings. `postId` is null for an account sample or a linked post ID string. Metric fields are integers, with `netFollowers` allowed to be negative. Use account rows for account totals and post rows for rankings and drill-downs, ensuring no double counting. Post detail supports `views`, `likes`, `comments`, and `shares`, with its post's `metrics` shown separately as lifetime data. Default to Latest available, a 28-day inclusive range ending on the newest relevant sample. With no available samples use the runtime date as the endpoint. Last 7 or Last 28 end on today's UTC date from `new Date()`. Use the same date boundary and row selection for the chart, totals, and CSV. Sort daily rows chronologically and accept absent optional numeric values as zero.

## Analytics reports

```json
{
  "id": "report_ba5a14",
  "actorId": "creator_mara_ellis",
  "createdAt": "2026-11-18T15:30:00.000Z",
  "scope": "post",
  "postId": "post_018",
  "startDate": "2026-11-10",
  "endDate": "2026-11-16",
  "metric": "views",
  "totals": { "views": 14388, "likes": 1144, "comments": 38, "shares": 107 },
  "sampleCount": 7,
  "format": "csv",
  "status": "exported"
}
```

`id`, `actorId`, `createdAt`, `startDate`, and `endDate` are strings with the date formats described above. `scope` is `account` or `post`. `postId` is null for account scope. `metric` is the selected key available in the scope. `totals` maps all metric keys in that scope to numeric sums. `sampleCount` is the count of matching daily rows. Save uses `format: "snapshot"` and `status: "saved"`; CSV uses `format: "csv"` and `status: "exported"`. A CSV download contains a header and sorted period rows. Reopening displays the persisted range, metric, scope, and snapshot totals and can link to the current chart for that selection.

## Seed implementation

Return a fresh object for each `createInitialData()` call. Build explicit English title/caption and comment lists, assign fixed IDs by index, and calculate timestamps and metrics deterministically with literal date anchors. Seed October–November 2026 history, 30 published and six scheduled posts, 24 drafts, 72 viewer comments and 12 creator replies. Include at least 20 commented-on posts. Spread records across topic clusters such as community archives, handmade signs, ceramics, textiles and independent film. Seed different audiences, unanswered threads, hearted comments, media-ready drafts, caption-only drafts and a media-only draft. Include 56 account days and multiple post-level days for all published posts. Keep deleted/discarded rows available only when a user writes them or an injected world provides them. Start analytics reports empty.

Use null or missing optional fields and absent relations as ordinary render-time cases. When an injected world replaces arrays, render the new arrays and derive labels locally. Any helper that reads or formats state must remain free of writes.
