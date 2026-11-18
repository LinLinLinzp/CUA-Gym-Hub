# Redfin account — TODO

> Status — READY FOR AUDIT AND PLAYWRIGHT  
> Last updated by the dev agent on 2026-11-18  
> [Workflow research](assets/README.md) · [State model](assets/data_model.md) · [Design](DESIGN.md)

## Status legend

- [ ] Not started
- [~] In progress
- [x] Done

## P0 — Shell and Harbor runtime

- [x] Scaffold a Vite React site in this directory with a lockfile and working `npm run build`. Use port **5335** with strict port binding for development. Keep the runtime offline and the document title `Redfin | My Redfin`.
- [x] Build the signed-in account shell from [DESIGN.md](DESIGN.md). Open `/` to My Redfin with a Saved homes preview, next tour, active offer, and recent agent conversation. Link to `/homes`, `/homes/:homeId`, `/saved-homes`, `/tours`, `/offers`, `/messages`, and `/messages/:threadId`. Place all routes inside their providers, preserve `?sid=` across navigation, and support direct entry, reload, and recoverable missing-record pages. Use `withSid()` for internal navigation outside the SPA router.
- [x] Copy `../../templates/dataManager.js` unchanged to `src/utils/dataManager.js` and wire `stateApi(createInitialData)` from `../../templates/state-api.js` in `vite.config.js`. Export `createInitialData` from `src/data/seed.js`. Await `loadState('redfin', createInitialData)` once before rendering routes. Centralize successful user mutations so each calls `saveState('redfin', nextState)` once with the current whole state. Use the middleware for `/state`, `/post`, and `/go`. Keep local UI controls out of persisted state and produce zero idle writes.
- [x] Render fully injected empty/single/large arrays, missing optional fields, and unresolved foreign keys. Provide clear empty states, safe detail fallbacks, and a recovery route. Keep new writes JSON-serializable and derive time-relative labels and tour date validation from `new Date()`.
- [x] Write `SCHEMA.md` from the implementation. List every top-level key and record shape and map all persisted actions to their exact writes in an **Observable State Changes** table. Check build and browser flows on localhost only. The Playwright phase owns `TEST.md` and the parent runner owns Docker certification and commits.

## P1 — Required workflows

- [x] **Saved homes → `savedHomes`.** Find homes in the browse view by address, city, ZIP, or neighborhood, then filter by status, price, beds, and property type. Show the same save toggle on browse cards and listing detail. Saving creates or reactivates a single `{id, homeId, actorId, status, createdAt, updatedAt, removedAt?}` record for this buyer and home. Removing sets `status: removed`, `removedAt`, and `updatedAt`. Saved homes lists only active saves, supports address search and sorting by recently saved or price, and opens the same listing detail. Confirm cross-view heart state, reload persistence, and no duplicate records after re-saving.
- [x] **Tours → `tours`.** Start from listing detail or choose a listing from Tours. Choose a future local date, time, and in-person or video format, with optional notes and a visible time zone. Review and explicitly request the tour. Append `{id, homeId, agentId?, actorId, scheduledAt, timeZone, mode, notes?, status: requested, createdAt, updatedAt}`. Upcoming and History views expose the tour, listing, and status. Reschedule a requested or confirmed future tour by updating `scheduledAt`, `timeZone`, `status: requested`, `rescheduledAt`, and `updatedAt` on the same ID. Confirm cancellation and retain the record with `status: canceled`, `canceledAt`, and `updatedAt`. Invalid, dismissed, and duplicate active requests write zero records.
- [x] **Offers → `offers`.** Start an offer from a listing or choose a listing from Offers. Collect positive USD amount, financing method, optional closing date, and optional notes. Support explicit Save draft and Submit offer request controls. Append or update `{id, homeId, agentId?, actorId, amount, currency: USD, financing, closingDate?, notes?, status, createdAt, updatedAt, submittedAt?, withdrawnAt?}`. Draft edits preserve ID and creation time. Submitting records `status: submitted` and `submittedAt` on the same draft, or creates a submitted record directly. Confirm withdrawal of a submitted request, recording `status: withdrawn`, `withdrawnAt`, and `updatedAt`. The Offers view filters by status and opens terms and request history for each property. Surface validation inline and guard against duplicate active offers for the same buyer and home.
- [x] **Agent messages → `messageThreads`, `messages`.** Open Messages to search conversations by subject, agent, or property, filter unread, and open a thread with older messages above the composer. Explicitly opening an unread thread updates its `lastReadAt` and `readById`. Replying appends `{id, threadId, senderId, recipientId, body, status: sent, createdAt}` to `messages` and updates the thread’s `lastMessageAt`, `lastReadAt`, and `readById`. Ask an agent on a listing, or use New message in the inbox, to select a recipient and optional home when available and enter a subject and body. Sending creates a linked thread and first message in one write. Require a nonblank body and a valid agent, keep focus in the composer on validation failure, and show the sent message immediately. Opening an already-read thread, typing, searching, and closing an unsent composer write nothing.

## P2 — Secondary depth

- [x] Add a listing photo gallery using the same original local asset set. Support previous and next controls, keyboard operation, and a fallback for listings without photos.

## Data seed

- [x] Seed fixed synthetic English records for one buyer, six agents, 48 homes, 32 saved-home records, 24 tours, 24 offers, 24 conversations, and 72 messages. Cover the distributions and relationships in [the data model](assets/data_model.md). Leave discoverable listings available for each create flow and existing examples available for each edit or cancellation flow.

## Out of scope

- Sign-in, identity checks, account creation, MLS feeds, maps, live availability, e-signature, financing applications, real submissions and external notifications.
- Proprietary screenshots, logos, listing imagery, fonts loaded remotely, and production account access.









