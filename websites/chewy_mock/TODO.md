# Chewy Account — TODO

> Status: VERIFIED  
> Last updated by: dev agent, 2026-11-18  
> Research: `assets/README.md` | Data model: `assets/data_model.md` | Visual direction: `DESIGN.md`

## Status Legend

- [ ] Not started
- [~] In progress
- [x] Done

## P0 — Account shell and Harbor runtime

- [x] **Scaffold.** Build a Vite React app in this directory with a lockfile, `npm run build`, title `Chewy | Your Account`, and dev port 5342 with strict port binding. Use only bundled resources and original local artwork. Apply the layout, type, and color tokens from `DESIGN.md`.
- [x] **Navigation.** Build persistent navigation for Overview, Autoship, Order History, Pet Profiles, and Returns. Support `/`, `/autoship`, `/autoship/:id`, `/orders`, `/orders/:id`, `/pets`, `/pets/:id`, `/returns`, `/returns/new/:orderId`, and `/returns/:id`. Preserve `?sid=` in internal links, redirects, and programmatic navigation. Support reload, browser back, unknown IDs, and a helpful route recovery link. Keep every route inside the providers it uses.
- [x] **State.** Copy `templates/dataManager.js` unchanged to `src/utils/dataManager.js` and import `stateApi` unchanged from `../../templates/state-api.js` in Vite config. Export `createInitialData()` from `src/data/seed.js`. Await `loadState` once before rendering routes and show a neutral loading view. Centralize `saveState` so each successful user mutation writes one full-state update through the store. Keep temporary UI selections out of persisted state. Render empty, sparse, and large injected datasets without idle writes or state repairs on mount. Use the state API for `/go` in dev and built hosting.
- [x] **Overview.** Show the signed-in account name, nearest upcoming active Autoship, recent orders, and a small selection of pet profiles. Link each summary to its own route. Derive counts, previews, and date wording from the loaded state and runtime clock. For missing data, show each section's empty state and a relevant link. State writes: none.

## P1 — Required workflows

- [x] **Autoship — find and schedule deliveries.** Search by plan name or product, filter by status, and open a plan showing its next ship date, cadence, destination, payment label, and items. Use explicit Save or Confirm for date, frequency, skip, and cancellation. A frequency edit leaves the next date scheduled. A skip advances one cadence from the later of the existing date and today, keeps the plan active, and records both dates. Cancellation keeps a historical plan and disables future edits. State writes: `autoships[]` updates `nextShipDate`, `frequencyWeeks`, or `status`/`cancelledAt` plus `updatedAt`/`updatedBy`. Append matching `autoshipEvents[]` records with `autoshipId`, action, previous/new values, actor, and timestamp.
- [x] **Autoship — manage items and place an order now.** Add a product from the local catalog, edit a positive whole-number quantity, and confirm removal. Require at least one line on an active plan. Confirm Order now with a quantity and amount summary. Write the order and next schedule in one transition. State writes: `autoships[].items` and/or `nextShipDate` plus update metadata, `autoshipEvents[]` with product/quantity or order linkage, and for Order now a linked `orders[]` record in `processing` with item snapshots, totals, actor, and timestamp.
- [x] **Orders — find, track, and manage orders.** Search by order number or product title, filter by status, and offer newest/oldest sort. Show item and price snapshots, delivery destination, totals, and static tracking events in detail. Confirm cancellation for processing orders. Offer Buy again on delivered orders, with a review showing totals and an explicit local submission. State writes: cancel updates `orders[].status`, `cancelledAt`, `updatedAt`, and `updatedBy`, and appends an `orderEvents[]` cancellation record. Buy again adds a `processing` order with fresh ID, `sourceOrderId`, items, totals, actor, and timestamp, plus a `reordered` event referencing both orders. Search, filters, tracking, and review alone write nothing.
- [x] **Pet profiles — add, edit, and remove.** Provide a searchable gallery with species filter, an add form, and a profile detail with edit and confirmed removal. Name and species are required. Breed, birthday, weight, and notes are optional. Reject future birthdays and nonpositive weights. Keep the form draft on validation errors. State writes: create appends a `pets[]` record with ID, `active` status, profile data, actor, and timestamp. Edit updates profile fields and update metadata. Remove sets `status: 'removed'`, `removedAt`, and update metadata so existing links remain valid. All three append a `petEvents[]` record with `petId`, action, actor, timestamp, and relevant profile values.
- [x] **Returns — request and track an item return.** Start from a delivered order or the Returns page. Show eligible lines and remaining returnable quantity. Collect quantity and reason for each selected line, refund destination, and review before final submission. Keep already-submitted and ineligible quantities out of the selection. The Returns history supports search by return/order number, status filter, and a detail page with linked order and refund breakdown. State writes: on confirmation append a `returns[]` record with `orderId`, per-line order item/product IDs, quantity, reason, unit price and amount, refund destination, totals, `requested` status, actor and timestamp. Derive remaining quantity and return status on the order from linked return records. No automatic refund progression.
- [x] **Workflow verification and schema.** Add `SCHEMA.md` with all persisted keys and records and an Observable State Changes table aligned to code. Run `npm run build` and Playwright with `PILOT_PLAYWRIGHT` and the installed Chromium, against localhost:5342. Exercise all four workflow groups, inspect matching `/go?sid=` changes and persisted reloads, and record commands, outcomes, and exact fields in `TEST.md`. Check deep links, distinct sessions, empty/sparse/large injected worlds, and that idle tabs and read-only interactions send no `set_current`. Persistent Vite should run through `Start-Process -WindowStyle Hidden` with an absolute Vite entry point. Keep test scratch files gitignored or remove them.

## P2 — Secondary depth

- [x] **Saved destination and payment selection.** Add a selector to change an active plan to another saved address or masked payment method. Persist the pointer on `autoships[]` and a matching before/after `autoshipEvents[]` record. Use synthetic account data for both selectors.

## Data seed

- [x] Use the fixed IDs and volumes in `assets/data_model.md`. Cover searchable product variety, mixed statuses, orders with full and partial return eligibility, multi-line Autoships, and multiple pet species. Keep current and historical data coherent with the seeded relationship IDs.

## Out of scope

- Authentication, real checkout or charges, account/contact changes, notifications sent to customers, live carrier tracking, file uploads, and production account access.
- Full storefront, pharmacy, insurance, and customer support flows.
