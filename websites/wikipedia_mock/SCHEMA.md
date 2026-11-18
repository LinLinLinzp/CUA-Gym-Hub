# wikipedia_mock Schema

**Base URL** — `http://localhost:5367/`  
**Go endpoint** — `GET /go?sid=<sid>` returns `{initial_state, current_state, state_diff}`.  
**Inject** — `POST /post?sid=<sid>` with body `{"action":"set","state":{...}}`.  
**Reset** — `POST /post?sid=<sid>` with body `{"action":"reset"}` restores the baseline.

The seed factory returns a fresh JSON-serializable object. Keep IDs stable across reloads. Default records use fixed string IDs. New records get unique IDs generated at submission time, for example through `crypto.randomUUID()`. Relation fields contain IDs of existing records. User-driven timestamps use one `new Date().toISOString()` per action. Seed timestamps are literals.

## State Schema

| Key | Shape | Example |
| --- | --- | --- |
| `account` | Object. `id: string` resolves to the active contributor. | `{ "id": "user-mara" }` |
| `contributors` | Array. `id`, `username` are strings. `displayName` is an optional string. | `{ "id": "user-mara", "username": "MaraFieldnotes", "displayName": "Mara Ellis" }` |
| `articles` | Array. `id`, `slug`, `title`, `body` are strings. `category` is an optional string. `currentRevisionId` and `updatedAt` are strings or `null`. | `{ "id": "article-001", "slug": "cedar-bay-lantern-festival", "title": "Cedar Bay Lantern Festival", "category": "Festivals", "body": "A community lantern procession takes place in Cedar Bay.\n\n== Procession ==\nParticipants gather near the old ferry stairs.", "currentRevisionId": "revision-002", "updatedAt": "2026-11-12T16:35:00.000Z" }` |
| `revisions` | Array. `id`, `articleId`, `actorId`, `createdAt`, `body`, `summary` are strings. `parentRevisionId` and `section` are strings or `null`. `minor: boolean`, `byteDelta: integer`, `status: 'published'`. | `{ "id": "revision-002", "articleId": "article-001", "parentRevisionId": "revision-001", "actorId": "user-mara", "createdAt": "2026-11-12T16:35:00.000Z", "status": "published", "body": "A community lantern procession takes place in Cedar Bay.\n\n== Procession ==\nParticipants gather near the old ferry stairs.", "summary": "Added the gathering point", "minor": false, "section": "Procession", "byteDelta": 47 }` |
| `talkTopics` | Array. `id`, `articleId`, `subject`, `actorId`, `createdAt`, `updatedAt` are strings. `status: 'open'`. | `{ "id": "topic-001", "articleId": "article-001", "subject": "Source for the route change", "actorId": "user-iris", "createdAt": "2026-11-13T09:20:00.000Z", "updatedAt": "2026-11-13T11:40:00.000Z", "status": "open" }` |
| `talkComments` | Array. `id`, `topicId`, `articleId`, `actorId`, `body`, `createdAt` are strings. `parentCommentId` is a string or `null`. `status: 'posted'`. | `{ "id": "comment-002", "topicId": "topic-001", "articleId": "article-001", "parentCommentId": "comment-001", "actorId": "user-mara", "body": "The yearbook has a route map near the back.", "createdAt": "2026-11-13T11:40:00.000Z", "status": "posted" }` |
| `watchlist` | Array. `id`, `articleId`, `actorId`, `createdAt` are strings. `status: 'active'`. | `{ "id": "watch-001", "articleId": "article-001", "actorId": "user-mara", "createdAt": "2026-11-10T15:00:00.000Z", "status": "active" }` |
| `watchlistEvents` | Array. `id`, `watchId`, `articleId`, `actorId`, `createdAt` are strings. `action: 'watch' or 'unwatch'`. `status: 'completed'`. `watchId` may refer to a removed membership. | `{ "id": "watch-event-001", "watchId": "watch-001", "articleId": "article-001", "actorId": "user-mara", "createdAt": "2026-11-10T15:00:00.000Z", "action": "watch", "status": "completed" }` |

### Default IDs

The active account is `user-mara`. There are 34 synthetic contributors with name-based IDs, including `user-iris` and `user-avery`. The numbered seed IDs are `article-001`–`article-036`, `revision-001`–`revision-072`, `topic-001`–`topic-036`, `comment-001`–`comment-090`, `watch-001`–`watch-026` and `watch-event-001`–`watch-event-032`. Cedar Bay Lantern Festival is `article-001`, at `/wiki/cedar-bay-lantern-festival`.

## Relationships and behavior

- `account.id` supplies `actorId` for new records and scopes the active watchlist. Resolve each by ID. If a contributor lookup fails, show readable fallback attribution. The injected account ID remains the actor even when its display record is absent.
- An article may have many revisions. Publishing replaces the article body, appends a full snapshot with the prior revision ID when available, and points the article to the new revision. Handle injected articles with no revision history. Compute `byteDelta` as the difference in UTF-8 byte lengths of the complete bodies using `TextEncoder`.
- Store article source as a string. Support plain paragraphs and `== Section ==` headings, with optional inline emphasis if implemented. Render the supported formatting safely as text nodes and elements. Section editing uses the selected heading occurrence and source offsets, so duplicate headings and lines outside the section are preserved. Persist `section` as the heading text for display. Set it to `null` for full-page edits. Escape arbitrary markup in articles, previews and comments.
- A talk topic belongs to one article and has one opening comment with a null parent. Each reply belongs to the same article and topic as its parent. Build a render-time tree from parent IDs and guard against missing parents or cycles in injected data. Use the stored topic subject and actual comment text in the thread.
- Watch membership is unique per account and article. The corresponding talk page shares that membership. An unwatch event keeps the removed membership ID for traceability. A subsequent watch creates a new membership ID.
- Derive activity from published revisions and posted comments linked to current memberships. Use stable links based on record IDs, sort by timestamp with a stable ID tie-breaker, and group by UTC calendar day. An unresolved target should be skipped or shown as unavailable. Use `new Date()` for any relative time label. Keep elapsed-time display and watchlist filters outside persisted state.
- Missing optional text, absent snapshots and empty lists should render gracefully. Treat absent revision or comment status as the standard published or posted value when displaying and previewing injected records. Preserve unknown keys and untouched records when applying each mutation.

## Minimal Inject Example

```json
{
  "account": { "id": "user-test" },
  "contributors": [{ "id": "user-test", "username": "ArchiveReader" }],
  "articles": [{
    "id": "article-test",
    "slug": "river-archive",
    "title": "River Archive",
    "body": "The archive collects local ferry records."
  }],
  "revisions": [],
  "talkTopics": [],
  "talkComments": [],
  "watchlist": [],
  "watchlistEvents": []
}
```

## Observable State Changes

| User action | Affected state |
| --- | --- |
| Publish full or section edit | Update `articles[].body`, `.currentRevisionId`, `.updatedAt`. Append a `revisions[]` record with all fields listed above. If the watch checkbox changes membership, apply the corresponding watch or unwatch fields in the same save. |
| Publish new topic | Append a `talkTopics[]` record and a `talkComments[]` record with a null parent. |
| Post a reply | Append a `talkComments[]` record with a parent and update `talkTopics[].updatedAt` for that topic. |
| Watch from article or talk | Append a `watchlist[]` membership and a `watchlistEvents[]` record with `action: 'watch'`. |
| Unwatch from article or talk | Remove the matching `watchlist[]` membership and append a `watchlistEvents[]` record with `action: 'unwatch'`. |
| Remove selected pages | Remove matching `watchlist[]` memberships and append one `watchlistEvents[]` record per removed membership with `action: 'unwatch'`. |

Reads, previews, cancellations, validation failures, filters and idle time do not modify business state. Seed and injected state load through the shared Harbor client.
