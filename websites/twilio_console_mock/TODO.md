# Twilio Console — TODO

> Status: READY FOR PLAYWRIGHT  
> Last updated by: dev agent, 2026-11-18  
> Research: [assets/README.md](assets/README.md) · Data model: [assets/data_model.md](assets/data_model.md) · Design: [DESIGN.md](DESIGN.md)

## Status legend

- [ ] Not started
- [~] In progress
- [x] Done

## P0 — Shell and Harbor runtime

- [x] **Scaffold and build.** Set up Vite + React with a lockfile, `npm run build`, and strict dev port **5500**. Launch persistent dev from the site directory using `Start-Process -WindowStyle Hidden` with an absolute Vite entry point. Keep fonts, code, and artwork local. Use `Twilio Console` as the document title and `Twilio` as a text wordmark.
- [x] **Account shell and routing.** Follow DESIGN.md for the 64 px global header, 224 px workspace rail, and 32 px main padding. Provide real links to Overview (`/`), Active Numbers (`/numbers`), Buy a Number (`/numbers/buy`), Number Configuration (`/numbers/:id`), Messaging Services (`/messaging/services`), Service Details (`/messaging/services/:id`), Send an SMS (`/messaging/send`), Messaging Logs (`/logs/messaging`), and Message Details (`/logs/messaging/:id`). Put all views under their providers, preserve `?sid=` on navigation and back links, use `withSid()` for internal links leaving the router, and support direct loads and recoverable missing-record states. Overview shows account name, data-derived totals, recent message activity, and links into each workflow. Shell and navigation have no state writes.
- [x] **State and API.** Copy `templates/dataManager.js` unchanged to `src/utils/dataManager.js` and import `stateApi(createInitialData)` from `../../templates/state-api.js` into Vite unchanged. Implement the fixed defaults in `src/data/seed.js`. Await `loadState(APP, createInitialData)` before mounting routes and show a neutral loader during boot. Centralize `saveState(APP, newState)` once per successful user mutation. Apply related updates in a single whole-state save and preserve untouched and unknown data. After the template baseline, idle, routing, rendering, form edits, and rejected submissions must emit zero posts. The API owns `/state`, `/post` and JSON `/go` in dev and preview, and Harbor serves the same contract for built `dist/`.
- [x] **Injected-world support.** Respect array replacement and object merge by the standard template. Render empty, single, and hundreds-of-record datasets, missing optional fields and missing related records. Use defensive labels, pagination, and date parsing, with actionable empty states. Current-time operations use the runtime clock. Confirm reload, session isolation, and zero idle posts against localhost.
- [x] **Verifier documentation.** Create `SCHEMA.md` from the implemented state and the write map below, listing every top-level key, field shape, and exact action-specific writes. Keep it aligned with code. Playwright phase records UI checks and actual `/go` assertions in `TEST.md` on localhost:5500 using the installed Node Playwright specified by `PILOT_PLAYWRIGHT`. Keep scratch runners gitignored or remove them after testing. The parent runner handles Docker certification and commit.

## P1 — Numbers

- [x] **Find and inspect active numbers.** Query by partial phone number, friendly name, or SID. Filter by type and capability, sort by number or name, and paginate with a matching result count. Show number, friendly name, location/type, capabilities and linked service if assigned. Open a number to view identifiers and routing settings. Reads have no writes.
- [x] **Search and buy a number.** Search synthetic available inventory by country, type, area code or digits, and required capabilities. Show monthly USD price and confirm the exact number before purchase. Confirming rechecks availability, adds a `phoneNumbers[]` record, and reserves the matching `availableNumbers[]` entry in one save. Link the success state to Number Configuration. Cancel and invalid or stale selections leave state unchanged.
- [x] **Configure and release a number.** Edit friendly name and voice/SMS webhook URLs and methods with capability-aware sections. Validate name and any nonblank URL before saving; retain field errors until addressed. Save updates the existing `phoneNumbers[]` record. Release requires a confirmation naming the number, sets its status to `released`, and removes it from all service sender pools in the same save. Released numbers disappear from active inventory and sender selection while historical logs remain inspectable.

## P1 — Messaging

- [x] **Create and find a Messaging Service.** Search services by name or SID, filter by use case, and page the list. Show use case, sender count, last updated date, and detail links. Create with a validated name and use case, appending one `messagingServices[]` record. Open the new service so a sender can be assigned.
- [x] **Configure service and sender pool.** Service Details includes settings, sender pool, and integration sections. Save a revised name, use case, inbound mode/URL, and optional delivery callback. Add eligible active SMS-capable numbers and remove senders on confirmation. A phone number can be assigned to one service at a time. A settings save or sender change updates the existing `messagingServices[]` record. Reject duplicate or stale membership changes and show a useful explanation.
- [x] **Send an SMS locally.** Choose an active SMS-capable number or a service with an eligible sender, enter an E.164 recipient and nonblank body, and submit. Select a service sender deterministically from its stored pool order. A successful send appends one `messages[]` record with `queued` for direct send or `accepted` for service send and an initial delivery step. Link the success state to the matching log. No actual SMS, webhook request, timer, or automatic status progression.

## P1 — Logs

- [x] **Filter and inspect Messaging Logs.** Default to all available dates and newest first. Combine Message SID, partial From and To matches, inclusive date range, direction, and status. Clear filters in one action; show result count and paginate. Message Details presents SID, sender and recipient, service, status, available delivery steps, and any error code and explanation. Open links back to the same list/filter context when available. View, search, filter, and sort have no writes.
- [x] **Export filtered Messaging Logs.** Export all current matches, in list sort order across pages, as a local CSV with timestamp, message SID, direction, from, to, service SID, status, segments, and error code. Escape CSV cells and neutralize spreadsheet formulas while preserving phone numbers as text. Disable export for zero matches. A successful download initiation appends a `logExports[]` record with the filter snapshot, exported message IDs, and row count. This is the observable Logs mutation for the SEED workflow.

## Observable state writes

| User action | State written |
| --- | --- |
| Confirm number purchase | Append `phoneNumbers[]` with `id, inventoryId, phoneNumber, friendlyName, country, locality, type, capabilities, monthlyPrice, currency, status, voiceUrl, voiceMethod, smsUrl, smsMethod, actorId, createdAt, updatedAt, updatedBy`. Set matching `availableNumbers[].status = purchased`, `purchasedNumberId`, `purchasedAt`. |
| Save number configuration | Update `phoneNumbers[].friendlyName, voiceUrl, voiceMethod, smsUrl, smsMethod, updatedAt, updatedBy`. |
| Confirm number release | Update `phoneNumbers[].status = released`, `releasedAt, releasedBy, updatedAt, updatedBy`. For each affected service remove the ID from `senderNumberIds` and set `updatedAt, updatedBy`. |
| Create Messaging Service | Append `messagingServices[]` with `id, friendlyName, useCase, senderNumberIds, inboundMode, inboundUrl, statusCallbackUrl, actorId, createdAt, updatedAt, updatedBy`. |
| Save service settings | Update `messagingServices[].friendlyName, useCase, inboundMode, inboundUrl, statusCallbackUrl, updatedAt, updatedBy`. |
| Add or remove service sender | Update `messagingServices[].senderNumberIds, updatedAt, updatedBy`. |
| Send SMS | Append `messages[]` with `id, direction, from, to, body, phoneNumberId, serviceId, status, segments, errorCode, errorMessage, deliverySteps, actorId, createdAt`. |
| Export Messaging Logs | Append `logExports[]` with `id, kind, status, filters, sort, messageIds, rowCount, fileName, actorId, createdAt`. |

## P2 — Secondary features

The required account scope is covered by P0 and P1.

## Data seed

- [x] Seed 36 owned numbers, 48 available numbers, 24 services, and 84 messages with fixed IDs and dates. Cover varied capabilities, use cases, assigned and unassigned senders, direct and service traffic, inbound and outbound messages, and delivered, failed and undelivered examples. Start `logExports` empty. Use consistent links, fictional English names, reserved fictional telephone ranges, and `.example` URLs. See [assets/data_model.md](assets/data_model.md).

## Out of scope

- Authentication, account creation or switching, billing and payments, number porting, regulatory submissions, live carriers, external webhooks, real calls and messages, and real Twilio credentials.
- Other Twilio products and log types outside the numbers and messaging scenario.
