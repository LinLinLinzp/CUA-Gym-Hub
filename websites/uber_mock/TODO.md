# Uber Rider Account — TODO

> Status: IMPLEMENTED AND LOCALLY VERIFIED  
> Last updated by: dev agent, 2026-11-18  
> [Design](DESIGN.md) · [Research](assets/README.md) · [State model](assets/data_model.md)

`[ ]` Ready to implement · `[~]` In progress · `[x]` Implemented

## P0 — Shell and Harbor runtime

- [x] **Scaffold and local runtime.** Create the React/Vite app and npm lockfile in this directory. `npm run build` produces `dist/`. Configure Vite for `localhost:5320` with a strict port. Use the shared `templates/state-api.js` plugin unchanged for dev and preview and copy `templates/dataManager.js` unchanged to `src/utils/dataManager.js`. Use `src/data/seed.js` for the exported `createInitialData()`. `GET /go?sid=…` is the middleware JSON endpoint exposing `initial_state`, `current_state`, and `state_diff`.
- [x] **Boot, navigation and resilient state.** Await `loadState('uber', createInitialData)` before mounting the routed account. Keep all routes inside their providers. Follow the shell and breakpoints in [Design](DESIGN.md). Link to `/` (overview), `/trips`, `/trips/:tripId`, `/receipts`, `/receipts/:receiptId`, `/expense-profiles`, `/expense-profiles/:profileId`, `/lost-items`, `/lost-items/:caseId`, `/refunds`, and `/refunds/:refundId`. Retain `?sid=` across navigation, dialogs with deep links, and reloads. Use `withSid()` for links leaving the SPA. Handle unknown IDs, empty and large collections, missing relationships and optional fields. Use one store mutation path that saves the full state once per successful action. Keep search, filters, sorting, navigation, drafts and initial rendering free of business writes. Use local visuals and system or bundled fonts.
- [x] **Seed and verification contract.** Seed the fixed, linked English records in [State model](assets/data_model.md) and use current runtime time only when displaying relative dates or recording actions. Create `SCHEMA.md` from implemented state, with every top-level key and an Observable State Changes table. In the test phase, write `TEST.md` with local browser evidence and the changed fields for each P1 workflow. Verify `npm run build`, offline assets, route reload, isolated sessions, injected data, and a quiet settled idle tab.

## P1 — Required workflows

- [x] **Trips.** `/trips` shows newest first with searchable pickup, destination, city and driver, plus status and expense profile filters. Use clear filters and a result count, with pagination or “Show more” for larger collections. Rows show date, route, service, status, profile and amount. Trip detail shows pickup/drop-off, fare, linked receipt and support actions. On a completed trip, “Change expense profile” offers active profiles and updates reporting classification. Confirm and show the resulting label in both trip detail and list. **State** · `trips[].expenseProfileId` and `trips[].expenseAssignment` update on the selected trip. Billing and receipt charge snapshots retain their original values.
- [x] **Receipts.** `/receipts` shows date, destination, receipt number, total and original billed profile, with search and profile/date filters. Open a receipt directly or from its trip. Display itemized charges with quantities and amounts, the total and the masked payment method. “Download PDF” creates a real local PDF. “Resend receipt” confirms the registered receipt email and queues a local request with visible confirmation. **State** · append to `receiptActions[]` with action `downloaded` or `resend_requested`, status, actor, timestamp, receipt and trip IDs, and email for resend.
- [x] **Expense profiles.** `/expense-profiles` supports search and Active/Archived/All views. Cards or rows show name, type, receipt email, payment label and report frequency. Add and edit business profiles with required name, valid work email, a seeded payment method, report frequency and optional provider. Edit uses saved defaults and keeps the same ID. Archived profiles are readable so historical trips and receipts resolve. After save show the profile detail and updated values. **State** · insert or update `expenseProfiles[]` with the listed fields, status, timestamps and actor. Creation sets type `business` and status `active`.
- [x] **Lost items.** Start from a completed trip or from “Report lost item” in `/lost-items` with a searchable completed-trip picker. Collect category, description and callback phone. Validate the inputs, submit locally and show the case ID, selected trip and status on its detail route. History supports search and status filters. “Mark as returned” confirms a rider-recovered item and updates its case. **State** · append `lostItemReports[]` with trip ID, reporter, contact, category, description, status `submitted`, and timestamps. Update the selected case to `returned` with resolution actor and time.
- [x] **Refunds.** Start “Request fare review” from a charged trip or `/refunds`. Pick a charged trip and a reason, enter an explanation and choose one or more positive receipt lines with requested amounts. Default each chosen line to its charged amount and validate amounts against each line and total. Show the requested sum before submit. The request detail displays the trip, selected lines, requested total and status. History supports search and status filters. Allow withdrawal of a submitted request after confirmation. **State** · append `refundRequests[]` with trip/receipt IDs, selected line snapshots and quantities, totals, currency, reason, explanation, requester, `submitted` status and times. Withdrawal changes status to `withdrawn` and records actor and time.

## P2 — Secondary features

The five P1 workflows and the overview entry points cover this seed's scope.

## Data seed

- [x] Seed 48 trips, 44 receipts, 24 expense profiles, 24 lost item reports and 24 refund requests, with the linked fixtures and variation specified in [State model](assets/data_model.md). Keep recognizable trips eligible for each new support request.

## Local acceptance for dev and test phases

| Check | Expected evidence |
| --- | --- |
| Trips | Find a known trip by destination, filter by status, open it and change its expense profile. Reload the deep link. `/go` identifies the new profile, previous profile, actor and timestamp on that trip. |
| Receipts | Open the trip receipt, exercise PDF download and resend, and verify the downloaded file has readable itemized content. `/go` contains both new actions linked to the original receipt and trip. |
| Expense profiles | Create, then edit a new profile. `/go` exposes one ID with its final name/email/payment preference, original `createdAt`, and latest `updatedAt` and `updatedBy`. |
| Lost items | Submit against an eligible trip, find the case in history and mark it returned. `/go` shows the category, callback contact, trip, reporter and returned resolution. |
| Refunds | Submit a line-level fare review from a charged trip, check the exact total and withdraw it. `/go` shows reason, amount, quantity, line IDs, currency, trip/receipt IDs and withdrawal actor/time. |
| Harbor | Use distinct `sid`s, compare `/go` before and after changes, and observe no POSTs once an idle page has settled. Exercise empty arrays, partial single records, hundreds of records, and a deep-link reload and read path against injected state. |

Use the installed Node Playwright at `$env:PILOT_PLAYWRIGHT` and installed Chromium against port 5320. Launch persistent Vite from this directory with `Start-Process -WindowStyle Hidden` and its absolute JS entry path. Use ignored scratch paths or remove temporary scripts when finished. The parent runner owns Docker dynamic certification and commits.

## Out of scope

Pre-signed-in rider account only. Booking, sign-in, account verification, payment settlement, real email, real phone calls and external expense integrations are outside this seed. All action outcomes stay within local Harbor state.
