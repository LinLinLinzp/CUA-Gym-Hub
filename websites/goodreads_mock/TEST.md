# Goodreads Mock — Test Report

> Round: 2  
> Date: 2026-11-18  
> Server: http://localhost:5352  
> Tested by: playwright agent

WORKFLOWS: PASS

## Summary

| Metric | Count |
| --- | ---: |
| Route patterns tested, including the fallback | 7 |
| Test groups | 14 |
| ✅ Passed | 10 |
| ❌ Failed | 4 |
| ⚠️ Skipped (out of scope) | 0 |

Chromium ran through the installed Node Playwright at `PILOT_PLAYWRIGHT`. The workflow suite checked 23 individual writes via `GET /go?sid=…`, verified each whole-state POST against `/state` and checked that unrelated collections stayed unchanged. `npm run build` passed. The shared data manager's SHA-256 matched the template.

## ✅ Passing Tests

- **Library and catalog.** Shelf links showed the right headings and counts. The library accepted title and author filters and sorted by title, recently added and date read. Catalog search found an unshelved book and showed an empty result for a nonmatching query. Empty shelves and missing shelves, books and routes rendered inside the app shell.
- **Shelf status and tags.** A first custom tag on an unshelved book created a single Want to Read entry. Changing status, adding a second tag and removing it preserved entry identity. Selecting Read exposed Add date read, and the selection persisted after reload.
- **Custom shelf management.** Blank and case-insensitive duplicate names were rejected. Creating and renaming trimmed the input. Renaming retained membership. Deleting a selected custom shelf removed that tag and returned to All Books.
- **Reviews.** Created a rating-only review with the keyboard, edited it from My Reviews into a text-only spoiler review, revealed its text and tested cancellation and confirmed deletion. Empty reviews showed validation. Community reviews offered read-only content and spoiler reveal.
- **Annual goals.** The runtime year opened by default. Historical views showed below-goal, at-goal and above-goal progress. Goal creation and editing persisted, and zero, fractional and out-of-range goals showed validation. Progress capped visually at 100%.
- **Finish dates.** Logged an unshelved book from the challenge picker, then added a past finish and a reread from My Books. Duplicate and future dates showed validation. Moving a book to Currently Reading retained prior challenge credit. A corrected finish moved credit between years, and removing it preserved the other finishes.
- **Removal and bulk shelving.** Canceling book removal preserved all records. Confirming removed the signed-in reader's records for the selected book and preserved community data. Bulk add and remove applied once per submission and cleared selection. The individual checkbox, Select all visible and Cancel selection changed the selection as expected.
- **Navigation and controls.** Verified wordmark, navigation links, cover and finish links, Back to My Books, keyboard Skip to content, button hover feedback, close dialog and focus return. Deep links and reloads preserved the SID. No normal-path console errors, external requests or idle writes were observed.
- **Harbor session and injection.** A separate SID isolated API edits and reset restored its baseline. Empty, sparse singleton and 250-record worlds rendered and accepted edits. Unknown fields survived saves. A payload above the keepalive threshold reached `/go` and survived reload. Five empty-world routes fit at 320 px.
- **Rapid edits.** Two same-turn custom tag changes produced two ordered whole-state POSTs. Both tags persisted on the same shelf entry.

### State fields verified via `/go`

| Workflow and action | Observed changes |
| --- | --- |
| Shelves · Find, filter, sort and select | No state difference for search, sorting, tab navigation, selection or opening menus. |
| Shelves · First custom tag | Added a `shelfEntries` record with `id`, `userId`, `bookId`, `statusShelfId` (`shelf-want`), `customShelfIds`, `createdAt` and `updatedAt`. |
| Shelves · Status and tag edits | Updated `shelfEntries[].statusShelfId` or `customShelfIds`, plus `updatedAt`. Kept `id` and `createdAt`. Selecting Read left `readingLogs` unchanged. |
| Shelves · Create and rename | Added a `shelves` record with `id`, `userId`, `name`, `kind` (`custom`), `createdAt` and `updatedAt`. Rename changed only `name` and `updatedAt`. |
| Shelves · Delete custom shelf | Removed the selected `shelves` record and updated affected `shelfEntries[].customShelfIds` and `updatedAt`. |
| Shelves · Bulk shelf changes | Updated selected `shelfEntries[].customShelfIds` and `updatedAt`. |
| Shelves · Remove book | Removed the selected book's own `shelfEntries`, `reviews` and `readingLogs` records in one save. |
| Reviews · Create and edit | Added a `reviews` record with `id`, `userId`, `bookId`, `rating`, `body`, `containsSpoilers`, `createdAt` and `updatedAt`. Edit changed `rating`, `body`, `containsSpoilers` and `updatedAt` while preserving identity. |
| Reviews · Delete | Removed only the selected `reviews` record. |
| Challenge · Create and edit goal | Added a `challenges` record with `id`, `userId`, `year`, `goalBooks`, `createdAt` and `updatedAt`. Edit changed only `goalBooks` and `updatedAt`. |
| Challenge · Log finish or reread | Added a `readingLogs` record with `id`, `userId`, `bookId`, `finishedOn`, `createdAt` and `updatedAt`. The unshelved book simultaneously gained a `shelfEntries` record with `statusShelfId: shelf-read`. Rereading an already Read book left its shelf entry unchanged. |
| Challenge · Correct or remove finish | Correction changed `readingLogs[].finishedOn` and `updatedAt`. The same write returned the book to Read via `shelfEntries[].statusShelfId` and `updatedAt`. Removal deleted only the selected `readingLogs` record. |
| All workflows · Invalid, canceled or read-only actions | No whole-state POST for the tested invalid submissions, canceled dialogs, spoiler reveal, changing the challenge year or idle time. |

---

## ❌ Bugs for Dev Agent

### BUG-001 · P0 · A delayed startup POST overwrites a successful edit

| Field | Value |
| --- | --- |
| Route | `/` on a fresh SID |
| Element | New shelf |
| Action | Hold the startup `set` request, create a shelf, confirm it in `/go`, then release the startup request. |
| Expected | The baseline stays pristine and the new shelf stays in current state. |
| Actual | `initial_state.shelves` contained the new shelf and `current_state.shelves` lost it. |
| Console errors | None required. Both requests returned HTTP 200. |
| Fix hint | Order the startup baseline ahead of user writes while preserving the shared templates. See AUDIT-001. |

### BUG-002 · P0 · A rejected save appears successful

| Field | Value |
| --- | --- |
| Route | `/my-books` |
| Element | Create shelf |
| Action | Complete startup, return HTTP 500 for the next `set_current` request, and submit a new shelf. |
| Expected | The UI reports the failed save and keeps the input available for recovery. |
| Actual | “Shelf created.” appeared and the dialog closed. The shelf survived browser reload through local cache, while `/go` lacked it. |
| Console errors | The intentionally rejected POST returned HTTP 500. |
| Fix hint | Check the asynchronous save outcome before announcing success. See AUDIT-002. |

### BUG-003 · P1 · The populated mobile finish picker overflows

| Field | Value |
| --- | --- |
| Route | `/reading-challenge` |
| Element | Book select in Log a finished book |
| Action | Open the populated dialog at a 320 px viewport. |
| Expected | The select fits inside the dialog. |
| Actual | The dialog client width was 282 px and scroll width was 368 px. The select was 350 px wide and its right edge was clipped. |
| Console errors | None. |
| Fix hint | Allow the field grid track and the select to shrink. See AUDIT-003. |

### BUG-004 · P1 · One seeded community review has no content

| Field | Value |
| --- | --- |
| Route | `/books/book-024` |
| Element | Community reviews |
| Action | Inspect seeded `reviews` through `/go`. |
| Expected | Every seeded review has a rating, review text or both. |
| Actual | `review-036` has neither, so the community section shows a reader and “Unrated.” |
| Console errors | None. |
| Fix hint | Supply an original review body or a valid rating on the existing seeded record. See AUDIT-004. |

---

## Visual Alignment Feedback

Captured and inspected My Books, catalog search, book detail, My Reviews and Reading Challenge at 1440 px, and the populated finish dialog at 320 px. Used the site's original [design brief](DESIGN.md) as the reference. The desktop views implemented the blue masthead, text wordmark, cover grid and local illustrations. The mobile issue is documented as BUG-003.

## Round History

### Round 1 → Round 2

- Reran the existing workflow and rapid-edit suites. All seed workflows passed.
- Reproduced AUDIT-001 through AUDIT-004 and documented them above as open defects.

## Harbor Docker dynamic certification

The repository certifier passed the production bundle in run `150816`. The local evidence is `factory/build/dyn_certify/150816/results.json`.

| Render | Sync | Idle | Hydrate |
| --- | --- | --- | --- |
| Pass | Pass (1 baseline POST) | Pass (0 idle POSTs) | Pass |
Injection reached `users → 0 → displayName`.

## P0 audit replay, 2026-11-18

- **AUDIT-001 · Fixed and retested.** The initial POST was withheld and the workspace exposed no action controls until acknowledgement. Shelf and review workflows then passed.
- **AUDIT-002 · Fixed and retested.** An injected HTTP 500 left the shelf dialog open, showed no success, and created no shelf in Harbor or after reload. A retry reached Harbor.

Docker dynamic certification run `125084` recorded render pass, sync pass (1 startup POST), idle pass (0 idle POSTs), and hydrate pass.
