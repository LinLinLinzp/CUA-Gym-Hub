# KAYAK Account — Test Report

> Round: 2  
> Date: 2026-11-18  
> Server: http://localhost:5327  
> Tested by: playwright agent

WORKFLOWS: PASS

## Summary

| Metric | Count |
| --- | ---: |
| Primary routes tested | 5 |
| Additional route cases | 4 |
| Workflow and support checks | 12 |
| Passed | 12 |
| Failed | 0 |
| Skipped (out of scope) | Production accounts, live transactions and Docker certification |

Chromium ran with the installed Node Playwright from `PILOT_PLAYWRIGHT`. Each workflow used a separate synthetic session. The five primary routes were `/trip`, `/trip/:id`, `/alerts`, `/bookings` and `/bookings/:id`. The other route cases covered the root redirect, missing trip and booking details, and the unknown-route fallback.

## Passing Tests

The table records the changes observed through the session's `GET /go` response. Creation metadata is `createdAt, createdBy, updatedAt, updatedBy`. The test actor was `usr_maya_chen` unless the fixture supplied its own actor. On same-actor edits, `updatedBy` was verified even when its value stayed the same.

| Check | Browser verification | Fields observed through `/go` |
| --- | --- | --- |
| T1 · Find and open a trip | Searched Lisbon, filtered upcoming trips, changed sort, opened a trip with a linked receipt and returned with browser Back. Cleared an empty search. | No change. |
| T2 · Create, edit and delete a trip | Rejected missing fields, partial dates and reversed dates. Created Oslo by rail, changed its end date and notes, then deleted it with an attached receipt and an active manual item. The receipt remained searchable by reference. | Create appended `trips[]` with `id, title, destination, startDate, endDate, notes, status` and creation metadata. Edit changed `endDate, notes, updatedAt` and set `updatedBy`. One deletion write updated `trips[].status, deletedAt, deletedBy, updatedAt, updatedBy`, the active item's `status, removedAt, removedBy, updatedAt, updatedBy` and the receipt's `tripId, updatedAt, updatedBy`. The receipt's status stayed confirmed. |
| T3 · Manage manual itinerary | Added an activity, changed it to a note, removed it and checked the remaining itinerary after reload. Exercised printing with a Playwright stub for the system dialog. | Create appended `itineraryItems[]` with `id, tripId, type, title, startDate, startTime, endDate, location, notes, status` and creation metadata. Edit changed `type, notes, updatedAt` and set `updatedBy`. Removal set `status, removedAt, removedBy, updatedAt, updatedBy` and retained `tripId`. Print made no write. |
| A1 · Search and create alerts | Searched airport codes, used type and status filters, rejected identical endpoints and created flexible flight, fixed stay and fixed car alerts. | Each create appended `priceAlerts[]` with `id, type, origin, destination, dateMode, startDate, endDate, cadence, status, currency, latestPrice` and creation metadata. The new prices were null. Validation made no write. |
| A2 · Edit and manage alerts | Changed dates and cadence, paused, resumed and deleted a flight alert. Canceled an edit and a deletion. Filtered expired alerts and restored one by editing its travel window. Verified cadence-only edits retained the price and tracked date changes cleared it. | Edits changed `dateMode, startDate, endDate, cadence, updatedAt` as applicable and set `updatedBy`. The tracked date change set `latestPrice: null`. Pause and resume changed `status, updatedAt` and set `updatedBy`. Deletion set `status, deletedAt, deletedBy, updatedAt, updatedBy`. Viewing expiration and canceled actions made no write. |
| B1 · Find and inspect a receipt | Searched by reference, used booking type, source and travel status filters, opened a seeded receipt and copied its confirmation code and provider. | No change. |
| B2 · Save and manage bookings | Edited an account receipt's notes, rejected a negative amount and a normalized duplicate provider/reference, saved a zero-amount rental, edited its title and price and removed it. | Receipt notes wrote only `notes, updatedAt, updatedBy`. Create appended `bookings[]` with `id, type, title, provider, confirmationCode, destination, startDate, endDate, travelerName, totalAmount, currency, notes, source, status, tripId` and creation metadata. Edit changed `title, totalAmount, updatedAt` and set `updatedBy`. Removal set `status, removedAt, removedBy, updatedAt, updatedBy` and left the link null. |
| B3 · Assign, move and unlink | Assigned the rental from its receipt, excluded it from that trip's picker, moved it through a second trip's picker, verified a single itinerary link and the new assignment after reload, then unlinked it. | Only `bookings[].tripId, updatedAt, updatedBy` were written. The link went from null to `trip_001`, then `trip_002`, then null. Re-submitting the same assignment made no write. |
| Harbor · State API and fixtures | Verified `GET /state`, `POST /post`, `GET /go`, reset, separate sessions, direct routes, hard reload, session query retention and both pickers with empty, sparse and 350-record fixtures. Verified one baseline on fresh boot, no idle writes, localhost requests only and the fixed seed counts of 24 trips, 48 itinerary items, 30 alerts and 36 bookings. | Unknown injected fields survived a write and the injected actor appeared in `updatedBy`. Reset restored the initial snapshot and cleared the diff. The shared data manager matches its template byte for byte and Vite imports the shared state API directly. |
| Shell and layout | Exercised the brand link, active navigation, keyboard skip link, hover feedback, dialog dismissal and focus restoration. Inspected Trips and Bookings lists and details on desktop and Price alerts on mobile. Checked all five primary routes for horizontal overflow at 360 px. | Navigation and presentation checks made no business changes. |
| UTF-8 persistence regression | Repeated the seeded receipt note save using 7,000 multibyte characters and 7,000 ASCII characters in fresh sessions. The multibyte snapshot was 73,231 UTF-8 bytes. | Both full notes reached `current_state.bookings` and `state_diff.bookings` with the expected actor and a new update timestamp. |
| Build and preview | `npm run build` passed. Chromium loaded bundled assets from built preview on port 5327 and saved a receipt note from a direct route. | The initial snapshot kept the original note. Only `bookings` appeared in the diff. |

## Bugs for Dev Agent

No open bugs from this round. Vite reports a future config-loader compatibility warning for the shared state API template. The current build and preview pass.

## Round History

### Round 1 → Round 2

- **AUDIT-001 · P0 · Fixed.** The state transport now measures UTF-8 payload bytes before forwarding keepalive requests. Payloads above Chromium's 64 KiB keepalive limit use a regular POST. Both Harbor templates are unchanged. See [AUDIT.md](AUDIT.md).
-

## Harbor Docker dynamic certification

The repository certifier passed the production bundle in run `140796`. The local evidence is `factory/build/dyn_certify/140796/results.json`.

| Render | Sync | Idle | Hydrate |
| --- | --- | --- | --- |
| Pass | Pass (1 baseline POST) | Pass (0 idle POSTs) | Pass |
Injection reached `trips → 0 → title`.
