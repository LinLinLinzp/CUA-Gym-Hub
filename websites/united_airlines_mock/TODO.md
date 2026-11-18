# United Airlines Account — TODO

> Status: READY FOR DEV  
> Last updated by: plan agent, 2026-11-18  
> [Design](DESIGN.md) · [Research](assets/README.md) · [Data model](assets/data_model.md)

## Status legend

- [ ] Not started
- [~] In progress
- [x] Done

## P0 — App and Harbor integration

- [x] **Vite and local runtime.** Build the React SPA in this directory, generate its lockfile, and set Vite to port 5322 with strict port selection. Import `stateApi(createInitialData)` from `../../templates/state-api.js` and copy `../../templates/dataManager.js` unchanged to `src/utils/dataManager.js`. The plugin owns `/state`, `/post`, and the JSON `/go` endpoint. Keep the built site self-contained and offline.
- [x] **Account shell and routes.** Implement Overview at `/`, booking search at `/book`, My trips at `/trips`, trip details at `/trips/:bookingId`, seat changes at `/trips/:bookingId/seats`, MileagePlus at `/mileageplus`, and Travel credits at `/credits`. Show the next trip, award-mile balance, eligible credit total, and a Book a flight button on Overview. Preserve `sid` through links, programmatic navigation and redirects. Keep deep links, loading, missing records and empty states inside the same provider boundary.
- [x] **Seed and store.** Implement fixed-ID English fixtures in `src/data/seed.js` using the quantities and scenarios in the data model. Resolve `loadState(APP, createInitialData)` before rendering routes and save the whole world once per accepted user mutation. Keep draft inputs, navigation, filters, sorting and derived dates out of persisted state. Preserve injected fields during updates. Render empty and large arrays, partial records and dangling optional references without errors. Revalidate each mutation against the latest in-memory state and prevent duplicate confirmation.
- [x] **Verifier documentation.** Create `SCHEMA.md` with all top-level keys and record shapes, plus an Observable State Changes table. Reconcile it with the implementation and confirm the app builds.

## P1 — Required workflows

- [x] **Bookings.** My trips presents Upcoming, Past and Cancelled views, keyword search by city, airport, flight or confirmation, and departure-date sorting. Find a trip matches confirmation code and last name case-insensitively against local records. Trip detail shows the confirmation, passenger names, segments, assigned seats, payment and a seat-map action for eligible trips. Book a flight starts with origin, destination, departure date, optional return date and one to four travelers. Show matching synthetic flights, then collect traveler names and present the total for review. Support cash, miles, or cash with one eligible travel credit. Confirming appends a `bookings[]` record with passenger and segment snapshots, confirmation code, payment, actor and timestamp, plus a `bookingEvents[]` record with `type: booked`. Award and credit writes are defined below. Cancelling a future confirmed cash booking with no prior credit applied shows the exact credit amount before confirmation. Confirming updates `bookings[].status` and `cancelledAt`, appends a `bookingEvents[]` cancellation, and issues a linked `travelCredits[]` future flight credit. Show the resulting confirmation or cancellation and verify it after reload.
- [x] **Seat changes.** From an eligible confirmed future trip, choose a segment and traveler and display their current assignment. Render a labeled seat grid with available, occupied, assigned and selected states. Show position, cabin and fee, and confirm explicitly. Keep draft selection local. Reject occupied seats, another passenger's seat, ineligible segments and the same seat. Confirming updates the matching `bookings[].segments[].seatAssignments[passengerId]` and appends a `seatChanges[]` record with booking, segment, passenger, previous/new seat, fee, cabin, status, actor and timestamp. Show the updated seat on trip detail and reopen the map to verify the selection.
- [x] **MileagePlus.** Show member number, tier, award balance, and activity sorted newest first with search and type filters. Allow a missing-miles request for a completed account trip by selecting its segment and entering the traveler's ticket number. Check the ticket and reject a duplicate request or an already-posted flight. Submitting appends `mileageRequests[]` with the booking, segment, member, ticket number, status `submitted`, actor and timestamp. Display the request under Requests without adding miles. Book with miles switches the booking quote to award miles plus USD taxes. On confirmation and sufficient balance, reduce `mileagePlus.awardMiles`, append a negative `mileageActivity[]` redemption linked to the new booking, and write booking and event records in that same commit.
- [x] **Travel credits.** Display Available, Expired and Used credits with type, identifier, owner, original amount, remaining balance and expiry. Support search by identifier or owner, an expiry sort, and credit details with usage history and an optional link to the source trip. Use credit opens the booking flow preselected for that credit. Review to apply up to the smaller of the remaining balance and the eligible booking total. Check owner, expiration and balance again at confirmation. Update `travelCredits[].remainingAmount` and its stored status when depleted, append `creditRedemptions[]` with amount and before/after balances linked to the new booking, and save the matching booking payment and event in one commit. Revisit the wallet and verify its balance and redemption after reload.
- [x] **Local browser verification.** Using Playwright from `PILOT_PLAYWRIGHT` and Chromium on `http://localhost:5322`, exercise cash booking and cancellation, seat change, missing miles, award booking, and partial and full credit use. Inspect `/go?sid=…` after each confirmed action for the records listed above. Verify that cancelled drafts, invalid or duplicate submissions, searches, filters and idle tabs generate no mutation. Exercise hard reloads, session isolation, and injected empty, minimal and large datasets. Record the observed fields and results in `TEST.md`. If launching outside an interactive terminal, use `Start-Process -WindowStyle Hidden` with the absolute Vite entry point and use a gitignored scratch directory. The parent runner handles Docker certification and commits.

## Data seed

- [x] Seed at least 36 bookings, 36 flight options, 48 mileage activities and 28 credits. Include completed, confirmed and cancelled trips, varied fare and cabin choices, a multi-passenger round trip with editable seats, a completed trip with missing mileage, and credits with available, depleted and expired balances. Include at least one pair of credit and fare amounts that leaves a residual balance and one that depletes the credit.

## Out of scope

- Sign-in, identity verification, real payment collection, check-in, third-party booking, email delivery and live flight or fare data.
- Cash refunds, rescheduling, award cancellation, and cancellation of bookings paid in part with an existing credit.
- Production accounts and production functional testing.
