# goodreads_mock Schema

**Base URL** · `http://localhost:5352/`  
**Go Endpoint** · `GET /go?sid=<sid>` returns `{initial_state, current_state, state_diff}`.  
**Inject** · `POST /post?sid=<sid>` with body `{"action":"set","state":{...}}`. Use a fresh SID to establish a new baseline.  
**Reset** · `POST /post?sid=<sid>` with body `{"action":"reset"}` restores the baseline. Use a fresh browser context to load the restored state.

The acting reader is `account.userId`. Other readers’ records remain in the world. IDs are strings. New records use UUIDs and UTC ISO 8601 timestamps from the runtime clock. Edits retain record IDs, creation timestamps, and additional injected fields. Finish dates use calendar dates in `YYYY-MM-DD`.

## State Schema

| Key | Shape |
| --- | --- |
| `account` | Object with string `userId`. |
| `users` | Array of records with string `id` and `displayName`. |
| `books` | Array of records with string `id`, `title`, `author`, `synopsis` and `coverStyle`, string array `genres`, and integer `publicationYear` and `pageCount`. Cover styles are `orchard`, `tide`, `hills`, `stars`, `blocks` and `window`. |
| `shelves` | Array of records with string `id`, `userId`, `name`, `kind`, `createdAt` and `updatedAt`. Kinds are `system` and `custom`. System IDs are `shelf-read`, `shelf-reading` and `shelf-want`. |
| `shelfEntries` | Array of records with string `id`, `userId`, `bookId`, `statusShelfId`, `createdAt` and `updatedAt`, plus string array `customShelfIds`. One entry per reader and book. |
| `reviews` | Array of records with string `id`, `userId`, `bookId`, `body`, `createdAt` and `updatedAt`, plus `rating` (integer 1–5 or null) and boolean `containsSpoilers`. One review per reader and book. Saves require a rating, text or both. |
| `readingLogs` | Array of records with string `id`, `userId`, `bookId`, `finishedOn`, `createdAt` and `updatedAt`. Each date for a reader and book is unique. |
| `challenges` | Array of records with string `id`, `userId`, `createdAt` and `updatedAt`, plus integer `year` and `goalBooks` (1–999). One goal per reader and calendar year. |

### Default IDs

- The acting reader is `user-mara`. Community readers are `user-001` through `user-024`.
- Catalog books are `book-001` through `book-072`. The initial library includes `book-001` through `book-048`, with entries `entry-001` through `entry-048`.
- System shelves are `shelf-read`, `shelf-reading` and `shelf-want`. There are 24 custom shelf IDs, including `shelf-coastal`, `shelf-paperbacks` and the empty `shelf-summer-picks`.
- Reviews are `review-001` through `review-044`, with `review-001` through `review-016` belonging to the acting reader. Finishes are `finish-001` through `finish-038` and annual goals are `goal-mara-2023` through `goal-mara-2026`.

## Minimal Inject Example

```json
{
  "account": { "userId": "reader-1" },
  "users": [{ "id": "reader-1", "displayName": "Alex Vale" }],
  "books": [{ "id": "book-sample", "title": "Letters at Low Tide", "author": "Sam Vale" }],
  "shelves": [],
  "shelfEntries": [],
  "reviews": [],
  "readingLogs": [],
  "challenges": []
}
```

The sample catalog book uses fallback art and metadata. System shelf controls are available even with an empty `shelves` array.

## Observable State Changes (for LLM evaluation)

| User action | Changes |
| --- | --- |
| Create custom shelf | Append a full `shelves[]` record with `kind: 'custom'` and its trimmed name. |
| Rename custom shelf | Set `shelves[].name` and `updatedAt`. |
| Delete custom shelf | Remove its `shelves[]` record. Remove the ID from affected reader entries’ `shelfEntries[].customShelfIds` and set their `updatedAt`. |
| Set reading status | Append a full `shelfEntries[]` record or set the existing entry’s `statusShelfId` and `updatedAt`. |
| Add or remove custom tag | Set the existing `shelfEntries[].customShelfIds` and `updatedAt`. Tagging an unshelved book appends a full entry with `statusShelfId: 'shelf-want'`. |
| Apply bulk custom shelf action | Change `customShelfIds` and `updatedAt` for affected selected entries in one save. |
| Remove from My Books | Delete the acting reader’s `shelfEntries[]`, `reviews[]` and `readingLogs[]` records for that book in one save. |
| Save rating or review | Append a full `reviews[]` record or set `rating`, `body`, `containsSpoilers` and `updatedAt` on the existing review. |
| Delete review | Delete that `reviews[]` record. |
| Set or edit annual goal | Append a full `challenges[]` record or set the existing goal’s `goalBooks` and `updatedAt`. |
| Log or correct a finish | Append a full `readingLogs[]` record or set the existing log’s `finishedOn` and `updatedAt`. In the same save, append a full Read entry for an unshelved book or set the existing entry’s `statusShelfId` to `shelf-read` and update its `updatedAt` if needed. |
| Remove finish | Delete that `readingLogs[]` record. |
| Search, sort, change year, navigate, reveal spoilers, select rows, cancel, or submit unchanged or invalid values | Zero state writes. |

Progress counts each finish for the acting reader in the selected calendar year, including rereads. The displayed count may exceed the goal. The bar stops at 100%.

The shared template loads injected state through `GET /state` and replaces seed arrays when supplied. Successful changes post the entire state to `POST /post` with `action: 'set_current'`. `GET /go` exposes the baseline, current state and top-level diff per `sid`.

