# Marriott Bonvoy — TODO

> Status: DEV COMPLETE  
> Last updated by: dev agent, 2026-11-18  
> References: [Research](assets/README.md) · [Data model](assets/data_model.md) · [Design](DESIGN.md)

## Status legend

- [ ] Not started
- [~] In progress
- [x] Done

## P0 — Shell and Harbor integration

- [x] Scaffold Vite, React and React Router with a lockfile. Import `stateApi(createInitialData)` from `../../templates/state-api.js` in Vite config and copy `templates/dataManager.js` verbatim to `src/utils/dataManager.js`. Use localhost port 5325 with strict port binding. Keep production routing and assets offline.
- [x] Build the account shell from [DESIGN.md](DESIGN.md). Render the member overview at `/`, with nav links to `/stays`, `/points`, `/folios` and `/requests`. Support `/stays/:id`, `/folios/:id` and `/requests/:id` on direct load and reload. Render a useful list link when a detail id is unknown. Keep `sid` in SPA navigation, including cross-workflow links and query changes. Use `withSid()` for internal links that leave the SPA router.
- [x] Await `loadState(APP, createInitialData)` before mounting routes. Show a neutral loading view, mount all providers around all routes, and guard bootstrap against duplicate invocation. Send one whole-state `saveState(APP, nextState)` through the store for each accepted business action. Keep searches, filters, details, form drafts and timers out of business state. Let the template serve the JSON `GET /go` endpoint, including `initial_state`, `current_state` and `state_diff`.
- [x] Render empty, single-record and large injected arrays, missing optional fields and missing cross-references. Preserve injected records and unknown fields in mutations. Use fixed ids and dates for defaults and the runtime clock for relative dates and action timestamps. Document every persisted key and field in implementation-owned `SCHEMA.md` with an **Observable State Changes** table.

## P1 — Seed workflows

- [x] **Stays.** Show Upcoming, Past and Cancelled views with search by hotel, destination or confirmation number, and date sorting. Include in-progress reservations in Upcoming with their own status label. Detail shows property, stay dates, guest count, room type, confirmation, and links to related folios or request forms where applicable. For upcoming reservations, let the member validate and review edited dates and guest count, or review and confirm cancellation. Persist edits to `stays[].checkIn`, `checkOut`, `guests`, `updatedAt`, or cancellation to `status`, `cancelledAt`, `updatedAt`. Append a `stayActions[]` record with actor, stay id, action, timestamp and before/after snapshots. Validate checkout after check-in and a positive integral guest count. Cancelled reservations move to the Cancelled view and lose edit and cancel actions.
- [x] **Points.** Display the derived balance, signed activity amounts and linked stays where available. Filter by type and time range, search descriptions or property, and sort by date. Offer **Request missing stay credit** from Points and eligible Past stay details. Preselect the stay when launched from a detail page and prompt for an available folio or provide a link to request one. On submit append `requests[]` with `type: "missing_stay_credit"`, `status: "submitted"`, actor, stay/folio ids, timestamp, notes and any member-estimated points. Show the case id and link to its detail. The balance is derived from the posted ledger and stays steady when a case is submitted.
- [x] **Folio.** Search hotel, confirmation or folio number, filter by availability and sort by checkout. Show hotel bill details with currency, dated line items, quantities, unit amounts and totals. Offer **Download folio** on available bills from the detail view and expose the corresponding detail link in Past stays. Generate a real local PDF from the selected record, with no network services, and append `folioActions[]` with the actor, folio and stay ids, timestamp, status, total, currency and filename when the browser download is initiated. For unavailable bills, expose **Request a copy** with stay context and append `requests[]` with `type: "folio_copy"`, actor, stay/folio ids, contact email, notes, status and timestamp. Link the confirmation to the submitted request.
- [x] **Requests.** List cases with status and type filters, search by case id or property and detail pages showing the requested items, linked stay and status history. Offer **New service request** here and on eligible stay details. Select an upcoming or in-progress stay, choose a supported service (extra towels, extra pillows or a housekeeping time), capture quantity or date/time as appropriate and accept optional notes. Persist a `requests[]` record with `type: "hotel_service"`, actor, stay id, item or appointment fields, `status: "submitted"`, timestamps and a submitted history entry. Allow withdrawal for submitted cases after confirmation. Set `status`, `updatedAt`, `cancelledAt` and append the cancellation history entry on the existing request. Repeated confirmation or an invalid submission produces no additional write.

## P2 — Secondary features

Use the overview for cross-links and a compact summary drawn from the four workflows. Market offers and destination discovery are outside this build.

## Data seed

- [x] Seed one synthetic English-speaking member, 40 stays (30 completed, six upcoming, one in progress, three cancelled), 48 points entries, 30 folios with several unavailable, 30 mixed-status requests and at least 24 records in each action log. Use deterministic ids, meaningful variety, coherent references and consistent money totals. See [the data model](assets/data_model.md) for the fixtures and identifier formats.

## Local verification and handoff

- [x] Run `npm run build`. Start Vite from the target working directory with PowerShell `Start-Process -WindowStyle Hidden` and an absolute Vite entry point for port 5325. Use the installed Playwright module from `PILOT_PLAYWRIGHT` and installed Chromium against localhost only. Keep test scratch files gitignored or remove them afterwards.
- [x] In the test phase exercise every P1 flow, including invalid submissions, sid-preserving navigation and hard reload. Use distinct sids to verify an injected empty world, single-record and large/sparse worlds, and isolation. Inspect server `/go?sid=…` and count `/post` calls to distinguish the boot baseline, explicit accepted actions, and idle/read-only browsing. Record each workflow and its observed state changes in `TEST.md`. The parent runner owns Docker certification and commits.

## Out of scope

The account opens signed in as Avery Morgan. The build scope is account management, so booking and payment checkout, authentication, partner points transfers, external messaging, and production account interactions are excluded.
