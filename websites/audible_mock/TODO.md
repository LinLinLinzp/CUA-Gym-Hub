# Audible Account — TODO

> Status: IMPLEMENTED AND LOCALLY VERIFIED  
> Last updated by: dev agent, 2026-11-18  
> References: `DESIGN.md`, `assets/README.md`, `assets/data_model.md`

## Status Legend

- `[ ]` Not started
- `[~]` In progress
- `[x]` Done

## P0 — Core Shell and Harbor Integration

- [x] **Scaffold and runtime.** Build a React/Vite SPA with a lockfile, document title `Audible`, and an exclusive localhost port of 5373 (`strictPort`). Import `stateApi(createInitialData)` from `../../templates/state-api.js` in `vite.config.js`. Copy `templates/dataManager.js` unchanged to `src/utils/dataManager.js`. Define fixed English defaults in `src/data/seed.js`. `npm run build` must produce an offline `dist/`. Run any persistent Windows test server with `Start-Process -WindowStyle Hidden` and the absolute Vite entry point, using the site directory as its working directory.
- [x] **Routes and layout.** Implement `/` and `/library` for Library, `/browse` for catalog discovery, `/title/:titleId` for title details, `/wishlist` for Wish List, `/account/credits` for Credit summary, `/account/purchases` for Purchase history, and `/account/purchases/:purchaseId` for Order details. Keep `?sid=` on all navigation, including back links, search, redirects, and external-to-router internal links via `withSid()`. Direct loads and reloads use the same providers and shell. Handle unknown paths, missing titles, and missing orders with navigable recovery states. `/state`, `/post`, and JSON `/go` belong to the supplied middleware and Harbor runtime.
- [x] **State boot and mutation.** Show a neutral loading view until `loadState('audible', createInitialData)` resolves. Wire `saveState` once, in the store's user-action path, with one complete state snapshot per successful business action. Validate against the latest state before committing. Keep empty, partial, and large injected worlds renderable, preserve unknown fields on writes, and avoid seed assumptions when linked records are missing. Boot produces the template baseline `set`. Idle time, rendering, searches, sorting, filtering, opening or cancelling dialogs, validation failures, and no-op actions never emit `set_current`.
- [x] **Original account shell.** Follow `DESIGN.md` for the rail, content header, credits entry point, type, spacing, responsive behavior, and accessible dialogs. Use the text brand `Audible` and original local artwork for the catalog. Keep all visible controls functional, with meaningful focus, loading, empty, and no-results states.
- [x] **Publish the runtime schema.** Write `SCHEMA.md` from the shipped implementation. List every top-level key, all record fields and enums, and an **Observable State Changes** table that maps each successful action to exact writes, including `actorId`, ISO `createdAt`, numeric amounts and quantities, and related IDs.

## P1 — Seed Workflows

- [x] **Library — find and organize audiobooks.** Show cover, title, author/narrator, runtime, source, and progress. Search by title, author, or narrator. Filter All, Unfinished, and Finished, and sort by Recently added, Title, or Author. A row links to title detail and offers `Mark as finished` or `Mark as unfinished`. The former sets `library[].listeningStatus` to `finished`, sets `progressPercent` to 100, and stamps `updatedAt`. The latter sets `listeningStatus` to `not_started`, resets `progressPercent` to 0, and stamps `updatedAt`. Both append a linked `libraryActivity[]` record. The title moves between filters immediately and persists on reload. Search, filter, detail opens, and sort do not write state.
- [x] **Library — add and remove included titles.** Offer `Add to Library` for an available included title on the catalog, details, and Wish List. Create a new `library[]` record with `source: 'included'`, or reactivate the same removed included record, and append `libraryActivity[]` with `action: 'added_included'`. From Library, confirm `Remove from Library` for an included title. Set its `library[].status` to `removed`, stamp `updatedAt`, and append `libraryActivity[]` with `action: 'removed_included'`. Addition and removal leave purchases, credits, and Wish List unchanged. A duplicate add and a cancelled removal produce zero writes. Purchased titles leave the active Library through the return flow below.
- [x] **Credits — review balance and use one credit.** Expose the balance in the shell and Credit summary. Show available credit issue/expiration dates, expired and used credits, and activity with signed amounts. Browse and title detail expose `Buy with 1 credit` for eligible, unowned titles. The same action is available from Wish List. In confirmation show the selected title, quantity of one, and projected balance. On confirm, spend one valid `credits[]` row, append a linked `creditTransactions[]` debit, create `purchases[]` and a new purchased `library[]` entry, append `libraryActivity[]`, and convert any active `wishlist[]` entry for that title to `purchased`. The balance drops by one. Provide clear results and links to Library or Order details. Block unavailable titles, duplicate ownership, and insufficient or expired credits without writes. See `assets/data_model.md` for field names and credit selection rules.
- [x] **Returns — refund a credit purchase.** Purchase history shows cover, title, date, payment method, status, and Order details. Provide order/refund views and a date range filter. Show `Return this title` for eligible purchases and show the reason when unavailable. Confirm the named title and one-credit refund. On confirm, mark the linked `purchases[]` row `returned`, append `returns[]` with the order and itemized numeric refund, mark the corresponding purchased `library[]` row `returned` if present, append `libraryActivity[]` when the library row changes, issue a new `credits[]` row, and append a linked `creditTransactions[]` refund. The refunded title leaves the active Library and appears in Refund history. A repeated return, cancellation, cash order, old order, or blocked order never writes state.
- [x] **Wish List — save, remove, and purchase.** Add from Browse results and title detail. Show cover, title, author, date saved, and available actions. Search by title or author and sort by Recently added or Title. `Add to Wish List` creates a `wishlist[]` row with `status: 'saved'`. `Remove from Wish List` sets the active row to `removed` and stamps `updatedAt`. A new save after removal creates a fresh row. Credit purchase through any entry point sets the active row to `purchased`, stamps `updatedAt`, and links `purchaseId`, as part of the same credit purchase snapshot. Active list reads `status: 'saved'` only. Repeated actions and view controls produce zero writes.
- [x] **Local workflow verification.** Use Chromium through the installed Node Playwright at `$env:PILOT_PLAYWRIGHT` with `http://localhost:5373`. Exercise all four seed workflows as UI actions. Check `/go?sid=...` against the precise state fields above and document results in `TEST.md`. Include cancelled and blocked actions, baseline/idle POST counts, reload, two isolated session IDs, an injected empty world, a single partial record, and hundreds of records. Validate the 365-day return boundary and credit expiration with an injected fixture and a known clock. Store test scratch files in an ignored path or remove them after testing. The parent runner handles Docker certification and commits.

## P2 — After P1

All planned interaction work is covered by P0 and P1.

## Data Seed

- [x] Use 72 catalog titles, 32 library entries, 26 purchases, 26 Wish List entries, and a matching credit inventory and ledger. Include at least three usable credits at the seed reference date, expired and spent lots, refundable and blocked recent orders, an old order, cash orders, historical refunds, and visible Library and Wish List status variations. Use the fixed-ID examples and count relationships in `assets/data_model.md`.

## Out of Scope

- Authentication and identity management. Start as synthetic member Maya Chen.
- Streaming full audiobooks, production payments, cart checkout, extra-credit purchases, subscription changes, and service integrations.
- Public storefront marketing, real cover art, proprietary interface references, and production account access.
