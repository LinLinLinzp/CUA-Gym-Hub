# Toast — TODO

> **Status** READY FOR HARBOR CERTIFICATION  
> **Updated** 2026-11-18 by the dev agent  
> **Handoff** [Design](DESIGN.md) · [Research](assets/README.md) · [Data model](assets/data_model.md) · [Harbor contract](../../HARBOR_CONTRACT.md)

## Status legend

- [ ] Pending
- [~] In progress
- [x] Done

## P0 — Shell and Harbor integration

- [x] **Scaffold and offline runtime.** Build a Vite React application with a lockfile and a strict dev port of 5459. Import `stateApi(createInitialData)` from `../../templates/state-api.js` in `vite.config.js`. Use system fonts or bundled fonts and original local visuals. Set the document title to Toast.
- [x] **Account shell and routes.** Create the original Toast operations workspace in [DESIGN.md](DESIGN.md). Show the text wordmark, Juniper & Rye location, and manager initials. Wire Overview (`/`), Menus (`/menus`), Orders (`/orders`), Labor (`/labor`), and Refunds (`/refunds`). Support order and refund detail links (`/orders/:orderId`, `/refunds/:refundId`), back navigation, and direct entry and reload on every route. Preserve `?sid=` on router navigation and use `withSid()` on internal links outside the router. Invalid record IDs show a recoverable empty view.
- [x] **State lifecycle.** Copy `templates/dataManager.js` unchanged to `src/utils/dataManager.js`. Export deterministic `createInitialData()` from `src/data/seed.js`. Await `loadState` before rendering routes. Call `saveState` centrally once per successful user-driven transaction with the complete next state. Keep filters, drafts in open forms, navigation, and derived metrics out of persisted state. Support empty and replaced arrays, missing optional fields, and hundreds of records. Derive relative dates from the runtime clock. Leave `GET /go` to the state API.
- [x] **Verifier handoff.** Maintain `SCHEMA.md` with every actual top-level key and an Observable State Changes table using the exact implementation fields. Build with `npm run build`. In the test phase, run installed Node Playwright with Chromium on localhost:5459 and produce `TEST.md` with each seed workflow, its actual state changes, and verification results. Cover injected and empty worlds, deep-link reload, sid isolation, and zero idle posts after boot. Leave Docker certification and commits to the parent runner.

## P1 — Seed workflows

- [x] **Menus — add and edit a menu, group, or item.** Default to a searchable item table. Filter by menu, group, and availability, and provide a hierarchy view or parent selection in the add form. Show name, menu/group, price, availability, and draft status. Forms support the name, parent where applicable, and item description, price, and availability. Require names and valid parents and accept only nonnegative prices with up to two decimal places. Saving creates or replaces the row in `menus[]`, `menuGroups[]`, or `menuItems[]` with its parent ID, edited fields, `publicationStatus: "draft"` and audit fields. Existing `published` snapshots remain available to ordering until the next publication. Cancel leaves state unchanged.
- [x] **Menus — publish saved changes.** Show the count of changed records and list the changes in a confirmation dialog. On confirmation, update the affected menu, group, and item records with their published snapshots, `publicationStatus: "published"`, and publication audit fields. Append `menuPublications[]` with `menuIds`, `menuGroupIds`, `menuItemIds`, `status`, and audit fields. Disallow publication when a referenced parent will be absent from the published hierarchy. Confirm that a new available item can now be selected on a new order.
- [x] **Orders — find, enter, pay, or void a check.** Search by check number, guest, or item and filter by business date, service type, and order status. Show check, time, guest, service type, order status, and total. The detail view shows line quantities, tender, and linked refunds. New orders collect service type, guest or table reference, selectable published items, and quantities. Saving appends an `orders[]` record with a `checkId`, line snapshots, totals, `status: "open"`, and audit fields. Editing an open check replaces the relevant `orders[].lines` and totals. Mark paid with a synthetic tender to append `payments[]` and set `orders[].status` to `paid` in one transaction. Confirming a void on an open check writes `status: "voided"`, `voidReason`, and update audit fields to the order. Require at least one line for an open or paid check and keep closed sale amounts and item snapshots intact.
- [x] **Labor — add, correct, or close a time entry.** Search by employee and filter by job, business date, and open/closed status. Show clock-in, clock-out, break duration, hours worked, and cash tips. The form accepts employee, job, business date, clock-in, optional clock-out, unpaid break minutes, and declared cash tips. Require a reason when correcting or closing an existing entry. Check time order, non-overlap for the employee, break length, and nonnegative tips on submit. Save writes or updates `timeEntries[]` with linked employee/job, timestamps, status, minutes, tips, and audit fields, and appends a `timeEntryChanges[]` record containing the change type, reason, and before/after snapshots in the same transaction.
- [x] **Refunds — find a paid order and issue a full, item, or custom refund.** Provide an Issue refund action from eligible order details and a Find a check action from Refunds. Show the original check, tender, amount, and eligibility. For an item refund, select lines and quantities and show amount with proportional tax. For a custom refund, enter the amount to return. A full refund shows the complete payment total. Collect the reason, review the exact amount, and confirm. Validate payment status, positive amount, quantities, and bounds against the linked check and payment. Append `refunds[]` with order/check/payment IDs, refund type, lines and amounts when applicable, tax, tip, total, reason, status and audit fields. Update `payments[].refundedAmountCents`, `payments[].refundStatus`, `orders[].refundedAmountCents` and `orders[].refundStatus` together. Refund history lists the date, check, reason, type, and amount and links to the original check. Follow the tender rules in the data model.

## P2 — Overview

- [x] **Operations overview.** Compose four linked summaries from saved state, such as open checks, menu changes, staff clocked in, and refunds. Show recent checks with links to their details and an empty view when no orders exist. The overview and its links write no business state.

## Data seed

- [x] **Catalog.** Four menus, at least 12 menu groups, and at least 64 named menu items. Include distinct service periods, realistic prices, unavailable items, and saved draft changes alongside published records.
- [x] **Orders and payments.** At least 72 orders with linked synthetic lines and at least 48 payments. Populate dine-in, takeout, and delivery across business dates with open, paid, and voided checks. Include eligible card/gift-card checks with multi-quantity lines and settled cash checks that cannot be refunded from the web workspace.
- [x] **Labor.** At least 28 employees and 64 time entries across multiple jobs and dates. Include open entries, overnight entries, entries with breaks, and corrections with history.
- [x] **Refund history.** At least 26 linked refunds across full, items, and custom types. Seed corresponding refund status and amount on every linked order and payment.

## Local implementation and testing

- Launch a persistent server in the Toast directory with `Start-Process -WindowStyle Hidden`, passing Node the absolute `node_modules/vite/bin/vite.js` entry point and port 5459. Use `PILOT_PLAYWRIGHT` for the installed browser runner and keep browser requests on localhost. Store scratch runners in an ignored location in this site or remove them after the test.
- Start pre-signed-in as Maya Chen. The scope covers one synthetic restaurant and one check and tender per paid order. Authentication, production accounts, payment processing, receipt delivery, payroll transfers, and automatic publishing are outside this workspace.
