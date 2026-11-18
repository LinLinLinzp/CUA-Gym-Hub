# Goodreads — TODO

> Status: VERIFIED LOCALLY  
> Last updated by: dev agent, 2026-11-18  
> [Workflow research](assets/README.md) · [State model](assets/data_model.md) · [Visual design](DESIGN.md)

## Status legend

- [ ] Pending
- [~] In progress
- [x] Complete

## P0 — App shell and Harbor

- [x] **Scaffold and local execution.** Set up Vite, React and React Router in this directory. Include the lockfile and a working build script. Set dev and preview to `localhost:5352` with strict port enforcement. Resolve the absolute Vite entry point under this app and start it with PowerShell `Start-Process -WindowStyle Hidden`, the app as working directory, and arguments for port 5352. Keep runner scratch files and Vite state in gitignored locations or clean up scratch files. The parent runner handles Docker certification and commits.
- [x] **Account shell and routes.** Use a 72 px header with the Goodreads wordmark as text, My Books, My Reviews, Reading Challenge, a labeled catalog search and the signed-in reader. Use the centered content rail and original cover art in [DESIGN.md](DESIGN.md). Route `/` and `/my-books` to the library, `/my-books?shelf=<id>` to a filtered library, `/search?q=<term>` to catalog results, `/books/:bookId` to the book, `/my-reviews` to the review index, and `/reading-challenge?year=<year>` to the challenge. Preserve `sid` in links, query edits and navigation. Render an in-shell not-found state for unknown routes/books and a clear fallback for missing shelves. Each route must support direct visits and hard reloads.
- [x] **State and verification endpoints.** Import `stateApi(createInitialData)` from the shared template in Vite config and copy `templates/dataManager.js` unchanged to `src/utils/dataManager.js`. Use `goodreads_mock` as the app key. Await `loadState(APP, createInitialData)` once before mounting routes and show neutral loading UI. All committing controls run through one store mutation path that sends the whole new state via `saveState`; use the latest state for each mutation. No startup save beyond the template baseline, no effect-driven save on navigation and no idle writes. Leave `/state`, `/post` and JSON `/go` to the API middleware and Harbor runtime; keep `/go` free of SPA routes. Providers wrap every route. Retain unknown keys from injected data and keep all state JSON-serializable.
- [x] **Injectable seed and resilience.** Implement deterministic `createInitialData()` in `src/data/seed.js` using the volumes and fields below. Handle zero, one and hundreds of records for each array, blank optional fields and dangling references without repairing or writing state on view. Read-only filtering, dialog cancellation, focus, sorting and year selection generate zero writes. Use the runtime clock for date-relative display and new writes.
- [x] **Offline build.** Use system fonts and locally authored cover art. Keep all UI assets within the app, with only same-origin Harbor state calls at runtime. Confirm the build works with the built `dist/` and same-origin state API. Use Goodreads in the HTML title and branded header.

## P1 — SEED workflows

- [x] **Shelves — find and organize books.** My Books opens on All Books and shows counts for Read, Currently Reading, Want to Read and custom shelves. Provide title/author search, an empty shelf state and sorting by title, recently added and date read. Catalog search finds unshelved books. A labeled Shelf control on each result or book detail offers mutually exclusive reading statuses and multiple custom shelves. Choosing a first status, changing status, or adding/removing a custom tag upserts one `shelfEntries` record with `id`, `userId`, `bookId`, `statusShelfId`, `customShelfIds`, `createdAt` and `updatedAt`. A first custom tag on an unshelved book assigns Want to Read as its status in the same save. Preserve entry ID, creation time and other tags on edits. “Remove from My Books” requires confirmation and deletes the entry, own review and own reading logs for that book in one save. Show the effects in the confirmation.
- [x] **Shelves — manage custom shelves.** “New shelf” opens a name form. Each custom shelf offers Rename and Delete; defaults are protected. Trim names and reject blanks and case-insensitive duplicates inline. Creation appends `shelves` with `id`, `userId`, `name`, `kind: 'custom'`, `createdAt` and `updatedAt`. Rename writes `name` and `updatedAt` on the same record and preserves membership. Confirmed deletion removes the shelf and removes its ID from affected `shelfEntries.customShelfIds`, advancing their `updatedAt`. Return to All Books after deleting the selected shelf.
- [x] **Reviews — rate, write, edit and delete.** Book detail shows “Your review” and links to a shared editor from the book and My Reviews. Provide a keyboard-operable 1–5 star picker, review text, optional spoiler checkbox, Save and Cancel. Allow rating-only or text-only reviews and reject an empty submission. Upsert `reviews` by `userId + bookId` with `id`, `userId`, `bookId`, `rating`, `body`, `containsSpoilers`, `createdAt` and `updatedAt`; edits preserve ID and creation time. Spoiler text stays collapsed until revealed. Deleting a review requires confirmation and removes the single review record, keeping shelf membership and dates intact. List the reader’s saved reviews with book title, stars, excerpt and Edit. Community reviews are read-only.
- [x] **Reading challenge — join and edit annual goal.** Open on the runtime year, allow selection of seeded historical years, and show a clear zero-progress or “Set goal” state. The form accepts whole numbers from 1–999. Upsert `challenges` by `userId + year` with `id`, `userId`, `year`, `goalBooks`, `createdAt` and `updatedAt`; keep the ID and creation time when editing. Derive books read, books remaining, progress bar and recent finishes from `readingLogs` for the selected year. Cap the progress bar visually at 100% while retaining counts over goal.
- [x] **Reading challenge — log and correct a finish.** From the challenge’s “Log a finished book” choose a catalog book, or open the same date editor from book detail / a library row. Default a new date to today using the runtime clock and allow any valid past date. Add, edit and delete individual read dates, including rereads. On add or edit, save `readingLogs` with `id`, `userId`, `bookId`, `finishedOn` (calendar date), `createdAt` and `updatedAt`; add or move the shelf entry to Read in the same write if needed. Preserve log identity on edits; confirmed date removal deletes only that log. A repeated date for the same reader/book is invalid. Derive progress as one book per finish record in the selected calendar year, even after moving the book to a reading status for a reread. Merely selecting Read does not assign a date; expose “Add date read” beside the resulting status.

## P2 — Library convenience

- [x] **Bulk custom shelving.** Allow selection of visible library rows and applying or removing one custom shelf. Reuse the single-book update rules, issue one store save for the affected `shelfEntries.customShelfIds` and `updatedAt`, and clear selection after success.

## Data seed

- [x] Create 72 fictional English-language books with fixed IDs, several genres, page counts, synopsis and original cover variations. Use one signed-in reader (Mara Chen) and 24 synthetic community readers.
- [x] Include the three default shelves, 24 custom shelves and 48 distinct shelf entries. Include a busy Read shelf, at least four current reads, a substantial Want to Read queue, overlapping tags and at least one empty shelf. Keep searchable unshelved books in the catalog.
- [x] Include 36 or more reviews split between Mara and community readers, including rated-only, spoiler-marked and unrated titles. Seed read books with and without reviews.
- [x] Include at least 36 finish records across four calendar years, with past and current-year finishes, rereads, and progress below, at and above goal across the seeded years. Seed four annual goal records with fixed IDs. The runtime year may differ from the newest seed year; show that runtime year and allow selecting known historical years.

## Test phase and scope

- [x] Use installed Node Playwright from `PILOT_PLAYWRIGHT` with Chromium on `localhost:5352`. Exercise each P1 workflow through the browser, poll `/go?sid=` for the exact expected records, and verify reload persistence, same-session deep links, separate sessions, injected empty/single/large worlds and zero idle or canceled-action saves. Include effects and pass/fail evidence in `TEST.md`.
- [x] Ship `SCHEMA.md` with every implemented key and field plus an **Observable State Changes** table. Use [the proposed state model](assets/data_model.md) as the reference and keep the schema aligned with code.

Authentication, account creation, external integrations, social posting, purchasing and production-account activity are outside this phase.
