# Proposed Harbor state model

`createInitialData()` returns a plain object. The examples below specify the top-level keys and one representative record for each entity. Strings ending in `At` are ISO 8601 timestamps. Nullable fields accept `null`. Prices and totals are numbers in USD with at most two decimal places. Use deterministic IDs for seeded rows and fresh IDs for user-created rows.

## Creator and media

The account is preselected. Media metadata references original static files shipped in the app. A media option can be selected from the editor and persisted by ID.

```json
{
  "creator": {"id":"creator-mara","name":"Mara Chen","publicationName":"Lantern Room","email":"mara.chen@example.com"},
  "media": [
    {"id":"media-neon","name":"The last neon on Canal Street","type":"image","src":"/art/neon.webp","alt":"A coral shop light in a rain-darkened street","durationSeconds":null},
    {"id":"media-night-audio","name":"Night field recording","type":"audio","src":"/art/night.ogg","alt":"","durationSeconds":24}
  ]
}
```

## Posts

```json
{
  "posts": [{
    "id":"post-001","authorId":"creator-mara","title":"After the last screening","body":"The projection booth smelled faintly of warm dust.",
    "format":"image","mediaId":"media-neon","audience":"selected_tiers","tierIds":["tier-001","tier-002"],
    "status":"published","createdAt":"2026-10-02T16:30:00.000Z","updatedAt":"2026-10-04T18:00:00.000Z",
    "updatedBy":"creator-mara","scheduledAt":null,"publishedAt":"2026-10-04T18:00:00.000Z","deletedAt":null
  }]
}
```

- `format` is `text`, `image` or `audio`. `mediaId` can be null and otherwise references an item of the matching format.
- `audience` is `public`, `free_members`, `paid_members` or `selected_tiers`. `tierIds` is an array of distinct tier IDs, empty for other audiences. Existing selected-tier references can include unpublished tiers.
- `status` is `draft`, `scheduled`, `published` or `deleted`. `scheduledAt`, `publishedAt` and `deletedAt` are nullable. Soft deletion retains the previous timing fields and other metadata.

## Tiers

```json
{
  "tiers": [{
    "id":"tier-001","name":"Field Notes","description":"Monthly essays and annotated reading lists.",
    "monthlyPrice":5,"currency":"USD","benefits":["Monthly essay","Annotated reading list"],"status":"published",
    "createdAt":"2025-09-01T15:00:00.000Z","createdBy":"creator-mara","updatedAt":"2026-10-03T11:00:00.000Z",
    "updatedBy":"creator-mara","unpublishedAt":null,"retiredAt":null
  }]
}
```

`monthlyPrice` must be a positive finite value with at most two decimal places. `benefits` contains non-empty strings. `status` is `published`, `unpublished` or `retired`. New tiers default to published. Unpublishing sets `unpublishedAt`, and republishing clears it. Retiring writes `retiredAt`. Derive member counts from members with that tier and active status.

## Members

```json
{
  "members": [{
    "id":"member-001","name":"Nina Ortega","email":"nina.ortega@example.com","type":"paid",
    "status":"active","tierId":"tier-001","joinedAt":"2026-03-09T13:00:00.000Z",
    "pledgeAmount":5,"lifetimePaid":45,"currency":"USD","lastPaidAt":"2026-11-09T13:00:00.000Z"
  }]
}
```

`type` is `free`, `paid` or `former_paid`. `status` is `active`, `canceled` or `declined`. Email, tier ID and last payment time are nullable. Use a null tier for free members and allow historical tier references for former paid members. Member details are read-only. Message eligibility uses `type` of `paid` or `former_paid`.

## memberNotes

```json
{
  "memberNotes": [{
    "id":"note-001","memberId":"member-001","authorId":"creator-mara","body":"Asked for more architecture reading recommendations.",
    "createdAt":"2026-09-04T15:10:00.000Z","updatedAt":"2026-09-04T15:10:00.000Z","updatedBy":"creator-mara","deletedAt":null
  }]
}
```

Each note belongs to one member. The application hides notes with a non-null `deletedAt`.

## Threads

```json
{
  "threads": [{
    "id":"thread-001","memberId":"member-001","creatorId":"creator-mara","createdAt":"2026-09-04T15:00:00.000Z",
    "lastMessageAt":"2026-10-03T16:12:00.000Z","unreadCount":0,"readAt":"2026-10-03T16:20:00.000Z",
    "updatedAt":"2026-10-03T16:20:00.000Z","updatedBy":"creator-mara"
  }]
}
```

One thread per creator and member. Marking it read sets `unreadCount` to zero and `readAt` to the action time. Marking an already-read thread unread sets the count to one and clears `readAt`. New outgoing threads start with zero unread and null `readAt`. Sending advances `lastMessageAt`, `updatedAt` and `updatedBy` to the current action values while preserving the read fields. Order inbox rows by `lastMessageAt`, with a stable ID tie-breaker.

## Messages

```json
{
  "messages": [{
    "id":"msg-021","threadId":"thread-001","senderId":"creator-mara","recipientId":"member-001","body":"The next reading list goes out on Friday.",
    "status":"sent","createdAt":"2026-10-03T16:12:00.000Z","batchId":"batch-001"
  }],
  "messageBatches": [{
    "id":"batch-001","senderId":"creator-mara","body":"The next reading list goes out on Friday.",
    "recipientIds":["member-001","member-016"],"threadIds":["thread-001","thread-016"],"messageIds":["msg-021","msg-043"],
    "recipientCount":2,"status":"sent","createdAt":"2026-10-03T16:12:00.000Z"
  }]
}
```

Seed inbound messages with the member as sender and creator as recipient. A single send or reply uses a null `batchId`. For a bulk send, deduplicate eligible recipients and write one private message and one touched thread per recipient in the same full-state save as the batch. The three ID arrays have corresponding indices. Order a conversation by `createdAt`, with a stable ID tie-breaker.

## Seed requirements

- Use calendar dates and IDs fixed in source. Seed 36 posts (20 published, 10 draft, 6 scheduled), 24 tiers (6 published, 10 unpublished, 8 retired), and 84 members (27 free, 45 current paid, 12 former paid). Include canceled and declined examples, at least one unused tier, and selected-tier posts tied to unpublished tiers. Make the title and text of each post meaningful and variable.
- Seed 30 threads, at least 90 messages, 28 notes and three batches. Match thread dates to their actual messages and reuse members consistently across rows, notes and conversations. Include at least one member eligible for messaging who has no thread.
- Use the runtime clock to decide whether a scheduled date is still in the future when the user explicitly schedules or reschedules. Keep existing seeded or injected schedule timestamps intact on load.
- Treat missing optional strings as empty for search, missing amounts as unavailable, absent lists as empty, and unresolved references as “Unavailable” in display. Resolve selected recipients and linked dependencies at commit time. Unknown injected keys stay in state.
