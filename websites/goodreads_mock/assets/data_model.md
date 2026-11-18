# Goodreads account state model

`createInitialData()` in `src/data/seed.js` returns the plain JSON-shaped object below. Use fixed string IDs in every seeded collection and `crypto.randomUUID()` for newly created records. Field values accessed from injected state may be absent, so use safe display fallbacks and guard missing relations. Preserve unknown keys when saving the next state.

## Entities

| Top-level key | Shape and example |
| --- | --- |
| `account` | Object with `userId: 'user-mara'`. Resolves the signed-in user. |
| `users` | Array of `{ id: 'user-mara', displayName: 'Mara Chen' }` records. Both fields are strings. Use initials for the avatar. |
| `books` | Array of `{ id: 'book-001', title: 'The Glass Orchard', author: 'Nell Arden', genres: ['Literary Fiction', 'Mystery'], publicationYear: 2021, pageCount: 304, synopsis: 'A botanist returns to her hometown after an early frost reveals a locked greenhouse.', coverStyle: 'orchard' }`. ID and text fields are strings, genres is a string array and year/pages are integers. `coverStyle` selects a locally authored treatment. Missing cover style uses the same layout with a neutral motif. |
| `shelves` | Array of `{ id: 'shelf-coastal', userId: 'user-mara', name: 'Coastal Fiction', kind: 'custom', createdAt: '2025-01-07T13:00:00.000Z', updatedAt: '2025-01-07T13:00:00.000Z' }`. All fields are strings. `kind` is `system` or `custom`. Default shelves have stable IDs `shelf-read`, `shelf-reading`, `shelf-want`. |
| `shelfEntries` | Array of `{ id: 'entry-001', userId: 'user-mara', bookId: 'book-001', statusShelfId: 'shelf-read', customShelfIds: ['shelf-coastal'], createdAt: '2025-01-07T13:00:00.000Z', updatedAt: '2025-02-18T19:26:00.000Z' }`. All fields are strings except `customShelfIds`, a string array. One entry per user/book; one system shelf and zero or more custom tags. |
| `reviews` | Array of `{ id: 'review-001', userId: 'user-mara', bookId: 'book-001', rating: 4, body: 'Quietly suspenseful, with an ending that rewards a second look.', containsSpoilers: false, createdAt: '2025-02-18T19:26:00.000Z', updatedAt: '2025-02-18T19:26:00.000Z' }`. IDs, text and timestamps are strings. `rating` is an integer 1–5 or `null` and `containsSpoilers` is a boolean. At least a rating or non-blank body is required. One review per user/book. |
| `readingLogs` | Array of `{ id: 'finish-001', userId: 'user-mara', bookId: 'book-001', finishedOn: '2025-02-18', createdAt: '2025-02-18T19:26:00.000Z', updatedAt: '2025-02-18T19:26:00.000Z' }`. All fields are strings. One record per finish. Distinct dates for the same reader/book represent rereads. |
| `challenges` | Array of `{ id: 'goal-mara-2025', userId: 'user-mara', year: 2025, goalBooks: 24, createdAt: '2025-01-07T13:00:00.000Z', updatedAt: '2025-01-07T13:00:00.000Z' }`. IDs and timestamps are strings; year and goal are integers. One record per user/year. |

## Seed and relationships

Return `{ account, users, books, shelves, shelfEntries, reviews, readingLogs, challenges }`. Seed timestamps are literal UTC strings. Define the three system shelf IDs centrally so controls can still interpret status IDs when an injected shelves array is empty. Supply local labels for these status choices independently of custom shelf data. New user-driven mutations use the acting account ID and `new Date().toISOString()`; `finishedOn` stores the date input literally as `YYYY-MM-DD`, without UTC conversion. Preserve the original `createdAt` on edit.

Books join to shelf entries, reviews and reading logs via `bookId`. Entries join to system and custom shelves by ID. Shelf counts, library status labels, latest date read per book, community rating summaries and challenge totals are computed from these records. Year-specific totals select logs for the acting reader where `finishedOn` starts with the selected year followed by a hyphen. A deleted review or shelf tag does not invalidate a finish. A removed library book clears dependent records for the acting reader as specified in TODO.md.

Scope library controls and challenge progress by `account.userId`. If the profile row is missing, render a generic reader label. If a book referenced by a review or log is missing, keep the record available to read or manage using “Unknown book” and an offline cover fallback. Keep controls for opening unknown book details in a safe empty state.

## Observable writes for SCHEMA.md

| User action | Written record fields |
| --- | --- |
| Create a custom shelf | Append to `shelves` with every field, including the acting reader and both timestamps. |
| Rename a custom shelf | Change `shelves[].name` and `updatedAt`. |
| Delete a custom shelf | Remove its `shelves[]` record. Remove its ID from affected `shelfEntries[].customShelfIds` and update those entries’ `updatedAt`. |
| Set reading status / update custom tags | Append a full `shelfEntries[]` record if new. Otherwise update changed `statusShelfId` or `customShelfIds` and `updatedAt`. |
| Remove a book from My Books | Remove the reader/book `shelfEntries[]`, `reviews[]` and `readingLogs[]` records. |
| Save a rating or written review | Append a full `reviews[]` record if new. Otherwise update `rating`, `body`, `containsSpoilers` and `updatedAt`. |
| Delete a review | Remove the reader/book `reviews[]` record. |
| Set or change a goal | Append a full `challenges[]` record or update `goalBooks` and `updatedAt`. |
| Add or edit a finish | Append a full `readingLogs[]` record or update `finishedOn` and `updatedAt`. If needed, append a full Read shelf entry or update its `statusShelfId` and `updatedAt` in the same save. |
| Delete a finish | Remove one `readingLogs[]` record by ID. |

Treat canceled, invalid and unchanged forms as read-only. Every successful operation persists through one whole-state save, including changes spanning several arrays.
