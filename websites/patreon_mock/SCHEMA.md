# patreon_mock Schema

**Base URL** — `http://localhost:5365/`  
**Go Endpoint** — `GET /go?sid=<sid>` returns `{initial_state, current_state, state_diff}`  
**Inject** — `POST /post?sid=<sid>` with body `{"action":"set","state":{...}}`  
**Reset** — `POST /post?sid=<sid>` with body `{"action":"reset"}` restores the server's initial snapshot for that session. Use a fresh browser context or session ID to avoid a previous localStorage snapshot.

The app key is `patreon_mock`. `GET /go?sid=<id>` returns `initial_state`, `current_state` and `state_diff` as JSON. A first load merges injected objects with defaults and replaces arrays. The state template writes a baseline, then each accepted business action sends one full-state `set_current`. Unknown state properties survive these writes.

## State Schema

Strings ending in `At` are ISO 8601 timestamps. Nullable fields are listed with `?`. All IDs are strings. Money fields are numeric USD amounts. Seeded IDs are fixed. New IDs use the prefixes `post-`, `tier-`, `note-`, `thread-`, `msg-` and `batch-` followed by a UUID.

| Top-level key | Shape |
| --- | --- |
| `creator` | Object with `id`, `name`, `publicationName`, `email` |
| `media` | Array of `{ id, name, type, src, alt, durationSeconds? }`. `type` is `image` or `audio`. Sources are local paths. Duration is in seconds. |
| `posts` | Array of `{ id, authorId, title, body, format, mediaId?, audience, tierIds, status, createdAt, updatedAt, updatedBy, scheduledAt?, publishedAt?, deletedAt? }`. Format is `text`, `image` or `audio`. Audience is `public`, `free_members`, `paid_members` or `selected_tiers`. Status is `draft`, `scheduled`, `published` or `deleted`. `tierIds` is a list of tier IDs. |
| `tiers` | Array of `{ id, name, description, monthlyPrice, currency, benefits, status, createdAt, createdBy, updatedAt, updatedBy, unpublishedAt?, retiredAt? }`. Currency is `USD`. Benefits are strings. Status is `published`, `unpublished` or `retired`. |
| `members` | Array of `{ id, name, email?, type, status, tierId?, joinedAt, pledgeAmount, lifetimePaid, currency, lastPaidAt? }`. Type is `free`, `paid` or `former_paid`. Status is `active`, `canceled` or `declined`. |
| `memberNotes` | Array of `{ id, memberId, authorId, body, createdAt, updatedAt, updatedBy, deletedAt? }`. Non-null `deletedAt` hides a note. |
| `threads` | Array of `{ id, memberId, creatorId, createdAt, lastMessageAt, unreadCount, readAt?, updatedAt, updatedBy }`. Unread count is a nonnegative integer. |
| `messages` | Array of `{ id, threadId, senderId, recipientId, body, status, createdAt, batchId? }`. Sent records have `status: 'sent'`. `batchId` is null on single messages and replies. |
| `messageBatches` | Array of `{ id, senderId, body, recipientIds, threadIds, messageIds, recipientCount, status, createdAt }`. The three ID lists have corresponding indices. `status` is `sent`. |

### Default IDs

| Key | Seed IDs |
| --- | --- |
| `creator` | `creator-mara` |
| `media` | `media-projection`, `media-neon`, `media-library`, `media-night-audio` |
| `posts` | `post-001` through `post-036` |
| `tiers` | `tier-001` through `tier-024` |
| `members` | `member-001` through `member-084` |
| `memberNotes` | `note-001` through `note-028` |
| `threads` | `thread-001` through `thread-030` |
| `messages` | `msg-001` through `msg-096` |
| `messageBatches` | `batch-001` through `batch-003` |

## Minimal Inject Example

This state keeps the default creator identity, provides one eligible recipient for a new conversation and starts the other workflows with empty lists.

```json
{
  "media": [],
  "posts": [],
  "tiers": [],
  "members": [
    {
      "id": "member-example",
      "name": "Jordan Vale",
      "type": "former_paid",
      "status": "canceled",
      "joinedAt": "2026-05-04T12:00:00.000Z",
      "pledgeAmount": 0,
      "lifetimePaid": 18,
      "currency": "USD"
    }
  ],
  "memberNotes": [],
  "threads": [],
  "messages": [],
  "messageBatches": []
}
```

## Observable State Changes

Every action time comes from the runtime clock. Every update actor is the current creator ID.

| User action | Persisted fields |
| --- | --- |
| Save draft | Insert or update one `posts` record. Write `title`, `body`, `format`, `mediaId`, `audience`, `tierIds`, `status: 'draft'` and edit metadata. Set `scheduledAt` and `publishedAt` to null. New records also set `id`, `authorId`, `createdAt` and `deletedAt: null`. |
| Schedule | Write the same content, audience and metadata fields with `status: 'scheduled'`, a future `scheduledAt`, and null `publishedAt`. |
| Publish now | Write the content and metadata fields with `status: 'published'`, null `scheduledAt`, and the first publication time in `publishedAt`. |
| Save post changes | Update content, access, media and edit metadata on the same record with its existing status. Preserve the first `publishedAt` when published. When scheduled, preserve the date unless it was edited and validated. |
| Duplicate as draft | Append a distinct post with copied content and a title ending in ` (copy)`. Assign a fresh `id`, action-time creation and edit timestamps, current `updatedBy`, and `status: 'draft'`. Set `scheduledAt`, `publishedAt` and `deletedAt` to null. |
| Confirm Delete post | Write `status: 'deleted'`, `deletedAt`, `updatedAt` and `updatedBy` to the existing post. |
| Create tier | Append a complete `tiers` record with `status: 'published'`, `createdBy`, `updatedBy`, timestamps and null availability timestamps. |
| Edit tier | Update `name`, `description`, `monthlyPrice`, `currency`, `benefits`, `updatedAt` and `updatedBy`. Preserve identity, creation metadata, availability and member pledges. |
| Confirm Unpublish or Republish | Update the same tier’s `status`, `unpublishedAt`, `updatedAt` and `updatedBy`. Republish clears `unpublishedAt`. |
| Confirm Delete tier | For an unlinked tier, set `status: 'retired'`, `retiredAt`, `updatedAt` and `updatedBy`. |
| Add note | Append a complete `memberNotes` record with `memberId`, `authorId`, `body`, creation and edit metadata, and null `deletedAt`. |
| Edit note | Update `body`, `updatedAt` and `updatedBy` on the existing note. |
| Confirm Remove note | Update `deletedAt`, `updatedAt` and `updatedBy` on the existing note. |
| Send message | Deduplicate eligible recipient IDs. Insert or update one thread and append one sent message per recipient. Update `lastMessageAt`, `updatedAt` and `updatedBy` on existing threads while preserving read fields. New threads start with zero unread and null `readAt`. For multiple recipients, append one complete `messageBatches` record and put its ID on each linked message. |
| Send reply | Append one sent message with null `batchId`. Update its thread’s `lastMessageAt`, `updatedAt` and `updatedBy`, preserving its read fields. |
| Mark as read | Set `unreadCount: 0`, `readAt`, `updatedAt` and `updatedBy` on the thread. |
| Mark as unread | Set `unreadCount: 1`, `readAt: null`, `updatedAt` and `updatedBy` on the thread. |

Opening routes, viewing previews, searching, filtering, sorting, selecting rows, downloading CSVs and canceling dialogs write no business state. A scheduled post remains scheduled when its timestamp passes.

The member directory, member detail, join-date filters and CSV use UTC calendar days for `joinedAt`. Messages with identical `createdAt` timestamps appear in the order stored in `messages`.
