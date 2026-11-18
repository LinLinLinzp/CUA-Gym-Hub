# substack_mock Schema

**Base URL**: `http://localhost:5348/`  
**Go Endpoint**: `GET /go?sid=<sid>` → `{initial_state, current_state, state_diff}`  
**Current State**: `GET /state?sid=<sid>` → `{stored_state, has_custom_state, sid}` in Vite  
**Inject**: `POST /post?sid=<sid>` with body `{"action":"set","state":{...}}`  
**Reset**: `POST /post?sid=<sid>` with body `{"action":"reset"}`

For local verification, use a fresh SID and browser context for an injection. A first uncached load reads `GET /state?sid=<sid>`, merges the injected world over defaults, and sends one baseline `set`. Arrays replace their defaults. Objects merge recursively, skipping null object properties. Injected array records retain explicit nulls. Reloads in a context with cached state read the SID-scoped local copy. A committed transaction saves the complete state with `set_current`. Reset restores the stored server baseline. Use a fresh browser context to read the reset state.

In `state_diff`, each changed top-level key contains the full new value under `modified` or `added`. The first server write establishes `initial_state`, so fields filled from defaults can appear in the diff when the injected baseline is partial. Use `current_state` and typed events to verify user actions.

## State Schema

IDs are strings. Timestamps use ISO 8601 in UTC. The seed and reducers write money as two-decimal strings and counts as numbers. A field marked `?` may be omitted or null.

| Key | Type | Description |
| --- | --- | --- |
| `currentUserId` | string | Acting user ID, seeded as `usr_mara` |
| `publication` | Publication | Publication metadata and community settings |
| `users` | User[] | Publishers, contributors, and readers referenced by actor or author ID |
| `posts` | Post[] | Articles, including deleted tombstones |
| `subscribers` | Subscriber[] | Memberships, including removed members |
| `compSubscriptions` | Comp subscription[] | Complimentary access grants and grant history |
| `comments` | Comment[] | Discussion and moderation records |
| `events` | Event[] | Append-only history of confirmed actions |

| Record | Fields |
| --- | --- |
| Publication | `id`, `ownerId`, `name`, `slug`, `description?`, `currency`, `commentsEnabled`, `createdAt`, `updatedAt`, `updatedById`. |
| User | `id`, `name`, `handle`, `role` (`owner`, `contributor`, or `reader`). |
| Post | `id`, `publicationId`, `authorId`, `slug`, `title`, `subtitle?`, `bodyHtml`, `thumbnailPath?`, `tags` (string array), `status` (`draft`, `scheduled`, `published`, or `deleted`), `audience` (`everyone`, `free`, `paid`, or `founding`), `commentPolicy` (`everyone`, `subscribers`, `paid`, `founding`, or `disabled`), `sendByEmailAndApp`, `createdAt`, `createdById`, `updatedAt`, `updatedById`, `publishedAt?`, `scheduledAt?`, `deliveryAt?`, `deletedAt?`, `duplicatedFromId?`, `metrics?` (object with `views?`, `recipients?`, `opens?`, `newSubscribers?`). |
| Subscriber | `id`, `publicationId`, `userId?`, `name?`, `email`, `status` (`active` or `removed`), `baseType` (`free`, `paid`, `founding`, or `trial`), `source` (`manual`, `csv`, `web`, `app`, or `recommendation`), `country?`, `joinedAt`, `createdAt`, `createdById?`, `updatedAt`, `updatedById?`, `trialEndsAt?`, `welcomeEmailRequestedAt?`, `billingInterval?` (`monthly` or `annual`), `paidPeriodStartedAt?`, `paidThroughAt?`, `periodAmount?`, `totalRevenue?`, `activityScore?`, `emailOpens30d?`, `removedAt?`, `removedById?`. |
| Comp subscription | `id`, `publicationId`, `subscriberId`, `status` (`granted` or `revoked`), `tier` (`paid` or `founding`), `duration` (`7d`, `30d`, `90d`, `6mo`, `1y`, or `forever`), `startsAt`, `endsAt?` (null for forever), `amount`, `currency`, `createdAt`, `createdById`, `updatedAt`, `updatedById`, `revokedAt?`, `revokedById?`. |
| Comment | `id`, `publicationId`, `postId`, `authorId`, `parentId?` (null for a root), `body` (plain text), `status` (`visible`, `hidden`, or `removed`), `reviewStatus` (`none`, `reported`, `approved`, or `removed`), `reportReason?`, `createdAt`, `updatedAt`, `pinnedAt?`, `pinnedById?`, `moderatedAt?`, `moderatedById?`. |
| Event | `id`, `type`, `publicationId`, `actorId`, `createdAt`, `entityId`, and `details` object. The event entity is the post, grant, comment, or publication. Subscriber batch events use the publication ID and list subscribers in `details.subscriberIds`. |

### Default IDs

| Record | Seed IDs |
| --- | --- |
| Publication | `pub_sunday_margins` |
| Users | `usr_mara` (owner), `usr_jonah` (contributor), `usr_imani`, `usr_theo`, `usr_lucia`, and `usr_reader_004` through `usr_reader_024` |
| Posts | `post_001`–`post_029` published, `post_030`–`post_038` draft, `post_039`–`post_042` scheduled |
| Subscribers | `sub_001`–`sub_082` active, `sub_083`–`sub_084` removed |
| Comp subscriptions | `comp_001`–`comp_026` |
| Comments | `cmt_001`–`cmt_120` |
| Events | `evt_001`–`evt_008` |

### Minimal Inject Example

Send this JSON as the request body. The article opens at `/p/example-review?sid=<sid>#comments`.

```json
{
  "action": "set",
  "state": {
    "currentUserId": "usr_mara",
    "publication": { "name": "The Review Desk" },
    "users": [{ "id": "usr_mara", "name": "Mara Ellis", "handle": "maraellis", "role": "owner" }],
    "posts": [{
      "id": "post_example",
      "publicationId": "pub_sunday_margins",
      "authorId": "usr_mara",
      "slug": "example-review",
      "title": "A Night at the Cinema",
      "bodyHtml": "<p>Notes from a neighborhood screening.</p>",
      "tags": ["Film"],
      "status": "published",
      "audience": "everyone",
      "commentPolicy": "everyone",
      "sendByEmailAndApp": false,
      "createdAt": "2026-11-17T12:00:00.000Z",
      "createdById": "usr_mara",
      "updatedAt": "2026-11-18T12:00:00.000Z",
      "updatedById": "usr_mara",
      "publishedAt": "2026-11-18T12:00:00.000Z"
    }],
    "subscribers": [],
    "compSubscriptions": [],
    "comments": [],
    "events": []
  }
}
```

## Observable State Changes (for LLM evaluation)

All entries append the corresponding record to `events[]`. Each transaction shares its timestamp and actor across records. Bulk comp writes one event per changed grant in a single transaction.

| Action / event type | Writes besides the event | Event details |
| --- | --- | --- |
| `post.created` | Append a draft to `posts[]` with `id, publicationId, authorId, slug, title, subtitle, bodyHtml, audience, commentPolicy, tags, sendByEmailAndApp, status, createdAt, createdById, updatedAt, updatedById`. Initialize `publishedAt, scheduledAt, deliveryAt, deletedAt, metrics, duplicatedFromId` to null. | `postId, status` |
| `post.updated` | Save changes to `posts[].title, subtitle, bodyHtml, audience, commentPolicy, tags, sendByEmailAndApp, updatedAt, updatedById`. | `postId, changedFields[]` |
| `post.published` | Set `posts[].status, audience, commentPolicy, tags, sendByEmailAndApp, scheduledAt, publishedAt, deliveryAt, updatedAt, updatedById`. The delivery timestamp is null when delivery is unchecked. | `postId, previousStatus, publishedAt, audience, deliveryAt` |
| `post.scheduled` | Set `posts[].status, audience, commentPolicy, tags, sendByEmailAndApp, scheduledAt, updatedAt, updatedById`. | `postId, previousScheduledAt, scheduledAt, audience` |
| `post.unscheduled` | Set `posts[].status=draft, scheduledAt=null, updatedAt, updatedById`. | `postId, previousScheduledAt` |
| `post.duplicated` | Append a new draft to `posts[]` with the same fields as creation, an optional copied `thumbnailPath`, and `duplicatedFromId` set to the source ID. | `postId, sourcePostId` |
| `post.deleted` | Set `posts[].status=deleted, deletedAt, updatedAt, updatedById`. | `postId, previousStatus` |
| `subscriber.added` | Append `subscribers[]` with `id, publicationId, userId=null, email, name?, status=active, baseType, source, joinedAt, trialEndsAt, welcomeEmailRequestedAt, createdAt, createdById, updatedAt, updatedById`. | `subscriberIds[], quantity, source, baseType, welcomeEmailRequested` |
| `subscriber.removed` | Set `subscribers[].status=removed, removedAt, removedById, updatedAt, updatedById`. For current/upcoming grants, set `compSubscriptions[].status=revoked, revokedAt, revokedById, updatedAt, updatedById`. | `subscriberIds[], compIds[], quantity, refunds[{subscriberId, amount, currency}]` |
| `subscriber.exported` | CSV is downloaded locally. Application records are untouched. | `subscriberIds[]` in CSV order, `quantity, scope` (`all` or `filtered`), `columns[], filename` |
| `comp.granted` | Append `compSubscriptions[]` with `id, publicationId, subscriberId, status=granted, startsAt, endsAt, duration, tier, amount="0.00", currency, createdAt, createdById, updatedAt, updatedById`. | `compId, subscriberId, startsAt, endsAt, duration, tier, amount, currency` |
| `comp.extended` | Set `compSubscriptions[].endsAt, duration, tier, updatedAt, updatedById`. | `compId, subscriberId, startsAt, endsAt, previousEndsAt, duration, tier, amount, currency` |
| `comp.revoked` | Set `compSubscriptions[].status=revoked, revokedAt, revokedById, updatedAt, updatedById`. | `compId, subscriberId` |
| `comment.created` | Append `comments[]` with `id, publicationId, postId, parentId, authorId, body, status=visible, reviewStatus=none, createdAt, updatedAt`. | `postId, commentId, parentId` |
| `comment.pinned`, `comment.unpinned` | Set or clear `comments[].pinnedAt, pinnedById` and set `updatedAt`. | `postId, commentId` |
| `comment.removed` | Set `comments[].status=removed, pinnedAt=null, pinnedById=null, reviewStatus, moderatedAt, moderatedById, updatedAt`. Reported comments get `reviewStatus=removed`. Other comments keep their existing review status or default to `none`. | `postId, commentId, previousStatus, reviewStatus` |
| `comment.approved` | Set `comments[].reviewStatus=approved, moderatedAt, moderatedById, updatedAt`. | `postId, commentId, reviewStatus` |
| `comment.unhidden` | Set `comments[].status=visible, moderatedAt, moderatedById, updatedAt`. | `postId, commentId, previousStatus` |
| `publication.commentsChanged` | Set `publication.commentsEnabled, updatedAt, updatedById`. | `commentsEnabled` |

Current access, grant lifecycle, and counts derive from the stored records and the clock. Routing, searching, filtering, previewing, selecting, and preferences generate no business-state writes. Continue saves draft edits before opening review. For scheduled posts, Save draft requires a title and a nonempty sanitized body. Continue validates the same fields and holds the edits locally during review. A successful scheduled review saves the edits and any release changes in one request. Cancelling or failing scheduled review leaves the scheduled record and events unchanged. Display-column preferences live in session storage and appearance lives in local storage.

Scheduled review currently computes `post.updated.details.changedFields` from the editor fields before applying the final review settings. If the final review restores the originally saved settings, the transaction can still append `post.updated` and `post.scheduled` with an unchanged `scheduledAt`. Use the final `posts[]` record to verify the committed settings. See [AUDIT-006](AUDIT.md#audit-006--scheduled-review-records-reverted-edits-as-changes). A published post's Save changes currently accepts an empty title and body. See [AUDIT-007](AUDIT.md#audit-007--save-changes-allows-an-empty-published-article).
