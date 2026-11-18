# KAYAK Account — TODO

> READY FOR DEV · Plan agent · 2026-11-18
>
> Read [SEED.md](SEED.md), [Harbor contract](../../HARBOR_CONTRACT.md), [design guide](DESIGN.md), [research](assets/README.md), and [data model](assets/data_model.md).

## Status legend

- [ ] Not started
- [~] In progress
- [x] Done

## P0 — Shell and Harbor runtime

- [x] Scaffold React and Vite in this directory with a package lockfile and a production build. Configure dev and preview for port 5327 with strict port binding. Serve from localhost during functional testing and run from built `dist/` with the Harbor state service. Bundle fonts and artwork locally or use system fonts. Use KAYAK rendered as text in the shell and page title.
- [x] Build the signed-in account shell from [DESIGN.md](DESIGN.md). Use a responsive masthead, an account navigation rail and the main workspace with a page title, action, toolbar and records. Routes are `/trip`, `/trip/:id`, `/alerts`, `/bookings` and `/bookings/:id`. Send `/` to `/trip` while preserving `?sid=`. Put every route inside the store and feedback providers. Support hard refresh, back navigation, unknown routes and missing detail records.
- [x] Copy `templates/dataManager.js` byte-for-byte into `src/utils/dataManager.js` and import unchanged `stateApi` from `../../templates/state-api.js` in Vite. Export `createInitialData()` from `src/data/seed.js`. Await `loadState('kayak', createInitialData)` behind a neutral loading view. Drive writes from one store entry point calling `saveState` once per successful business action with the complete next world. Preserve unknown injected keys and unrelated records. Keep the session query on navigation, including redirects and dialog links. Use `withSid()` for internal links outside the router.
- [x] Verify the standard sid-scoped `GET /state`, `POST /post` and `GET /go` endpoints in dev and preview. `/go` returns `initial_state`, `current_state` and `state_diff` through the template middleware. Lists, details and pickers handle empty, sparse and large injected worlds. Searches, sorts, navigation, opening or dismissing forms, validation errors and idle time produce no business writes. Derive relative labels from the runtime clock without persisted transitions.
- [x] Write `SCHEMA.md` from the implemented store with all top-level keys and record shapes. Include an Observable State Changes table mapping each business action to its exact fields. Maintain the link invariants and lifecycle rules in the [data model](assets/data_model.md).

## P1 — Trip planner

- [x] **T1 — Find and open a trip.** Show trip cards with title, destination, date range, itinerary count and status. Search by title or destination, filter All, Upcoming, Planning and Past, and sort by trip date or recent edits with a stable ID tie-breaker. Show a clear search reset and empty state. At `/trip/:id`, show trip dates, notes and a date-ordered itinerary with links to available booking details. These views write no records.
- [x] **T2 — Create, edit and delete a trip.** New trip asks for title, destination, optional paired start/end dates and optional notes. Validate blank required fields and reversed or partial ranges. Save into the trip detail, and offer Edit trip and a confirmed Delete trip. Create appends `trips[]` with `id,title,destination,startDate,endDate,notes,status,createdAt,createdBy,updatedAt,updatedBy`. Edit updates the input fields and `updatedAt/updatedBy`. Delete sets `status:'deleted'`, `deletedAt/deletedBy` and update metadata, marks its manual itinerary entries removed, and clears `bookings[].tripId` on its linked reservations in the same write. Verify receipts remain searchable after a trip is deleted.
- [x] **T3 — Build a manual itinerary.** Add item opens a form for kind, title, date, optional time/end date, location and notes. Support activity, flight, stay, car and note. Allow editing from the item and confirmed removal. Group items by start date and sort by time then ID within each group. Create appends `itineraryItems[]` with `id,tripId,type,title,startDate,startTime,endDate,location,notes,status` and create/update metadata. Edit changes the form fields and update metadata. Remove sets `status:'removed'`, `removedAt/removedBy` and update metadata.

## P1 — Price alerts

- [x] **A1 — Search and create a price alert.** List route or location, type, dates, cadence, latest seeded price where available and status. Search endpoint codes or locations and filter by type and status. New alert supports Flight, Stay and Car rental. Require distinct origin/destination for flights, a location for stays/cars and paired ordered travel dates for fixed alerts. Offer Flexible dates for flights and Daily or Significant changes cadence. Create appends `priceAlerts[]` with `id,type,origin,destination,dateMode,startDate,endDate,cadence,status:'active',currency,latestPrice` and create/update metadata. Set an unobserved latest price to `null` and show a pending price label.
- [x] **A2 — Edit, pause, resume and delete an alert.** Edit preloads the alert and applies A1 validation. Save updates editable fields and `updatedAt/updatedBy`. Clear `latestPrice` if the tracked search changes. Pause/resume updates `status` between `active` and `paused` and sets update metadata. Confirm deletion, set `status:'deleted'`, `deletedAt/deletedBy` and update metadata, then remove the row from ordinary views. Keep expired alerts visible under the Expired filter, derive expiration at render time, and allow deletion or editing to future dates. Canceling an edit or confirmation leaves the alert untouched.

## P1 — Bookings

- [x] **B1 — Find a receipt and read its details.** Search title, confirmation code, traveler or provider. Filter by type, travel status and source. Rows show title, provider, dates, confirmation and status. Detail at `/bookings/:id` shows traveler, reference, dates, amount and currency when known, provider and trip association. Present provider-handled changes as information inside the receipt. Opening a receipt and using filters write no records.
- [x] **B2 — Save and manage a reservation record.** Add booking lets the traveler record a flight, stay or rental with title, provider, confirmation code, destination, paired dates, lead traveler, optional amount, currency, notes and optional trip. Require title, provider, confirmation, destination and traveler. Validate dates, nonnegative amounts and duplicate active provider/reference pairs, ignoring case and surrounding whitespace. Append `bookings[]` with `id,type,title,provider,confirmationCode,destination,startDate,endDate,travelerName,totalAmount,currency,notes,source:'manual',status:'confirmed',tripId` and create/update metadata. Manual records can edit those details and be removed after confirmation. Removal writes `status:'removed'`, `removedAt/removedBy`, clears `tripId` and sets update metadata. The local action is **Remove saved booking**. Account receipts expose notes and trip assignment edits while provider-issued fields stay read-only.
- [x] **B3 — Add, move or remove a booking from a trip.** Provide a trip picker on booking details and an Add existing booking picker in trip details. Support reassignment and unlinking with feedback. Set `bookings[].tripId` to the target ID or `null` and update `updatedAt/updatedBy`. Use that relationship to show the booking once in the trip itinerary. Prevent duplicate additions and keep both views in sync after reload. Keep booking status, provider fields and manual itinerary entries intact.

## P2 — Optional depth

- [x] Add a print-friendly trip itinerary with dates, locations and event names. Printing uses the current itinerary and makes no state changes.
- [x] Add copy actions for the booking reference and visible provider name with accessible feedback. Copying makes no state changes.

## Data seed

- [x] Create 24 trips, 48 manual itinerary entries, 30 price alerts and 36 bookings with fixed IDs and English synthetic content. Include past travel, upcoming travel, undated plans, mixed alert/booking types and statuses, and linked and unlinked reservations. Use the [data model](assets/data_model.md) for exact distributions and stable examples. Use reserved email domains for fictional accounts.

## Local QA handoff

Use Chromium with the installed Node Playwright at `PILOT_PLAYWRIGHT` on `http://localhost:5327`. Start the persistent Vite server with PowerShell `Start-Process -WindowStyle Hidden`, the app as working directory and the absolute `node_modules/vite/bin/vite.js` path as the entry point. Store scratch tests under a gitignored path such as `tests/`. Use separate sids for scenarios and poll `/go` for expected persisted values after writes.

| Case | Browser actions and state checks |
| --- | --- |
| Trip planner | Create a trip, edit its dates and notes, add/edit/remove a manual entry and delete the trip. Assert matching record IDs, lifecycle fields, actor metadata and the changed `trips` and `itineraryItems` keys. |
| Price alerts | Reject an invalid route, create a flight alert, edit dates and cadence, pause, resume and delete it. Assert the alert values and lifecycle in `priceAlerts`, plus no write on validation or dismissed dialogs. Create both a stay and a car alert with location fields, and verify a past fixed alert is displayed as expired without a state change. |
| Bookings | Find a seeded receipt by reference, save a note and verify that supplier fields remain intact. Create and edit a manual reservation, reject a duplicate reference, assign and move it across trips, unlink it and remove it. Verify `tripId` on each transition and the removal metadata. Verify deletion of a trip preserves its linked receipt and clears the association. |
| Harbor | Verify a second sid sees its own state. Inject empty, sparse and large arrays, exercise detail hard refresh and verify sid retention. Observe one baseline on fresh boot and no idle writes. Check `npm run build` and same-origin requests only. Report actual workflow results and changed fields in `TEST.md` for the parent runner. |

## Out of scope

Authentication, production accounts, live search/prices, provider transactions and messaging. The app opens as the seeded signed-in traveler. The parent runner owns dynamic Docker certification and commits.
