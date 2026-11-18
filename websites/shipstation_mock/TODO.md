# ShipStation — TODO

> Status: IMPLEMENTED AND VERIFIED LOCALLY  
> Last updated by: dev agent, 2026-11-18  
> References: `DESIGN.md`, `assets/README.md`, `assets/data_model.md`

## Status legend

- [ ] Not started
- [~] In progress
- [x] Done

## P0 — Shell and Harbor runtime

- [x] Scaffold a React/Vite app with a lockfile. Configure dev and preview for localhost port **5454** with strict port handling. Set the document title to ShipStation. Implement the original workspace in `DESIGN.md` with Orders, Labels, Batches, and Returns as peer destinations and “Northline Goods” as the signed-in account.
- [x] Route `/` to the Orders queue and support `/orders`, `/labels`, `/batches`, `/returns`, and `/:section/:id` for the corresponding record details. Use a shared shell and providers for all routes. Preserve `?sid=` through navigation, including from detail to related records and back. Use `withSid()` for internal links outside the router. On missing IDs show a readable state with a link back to the section.
- [x] Use the unchanged shared state API in `vite.config.js` and copy the client template unchanged into `src/utils/dataManager.js`. Implement fixed seed data in `src/data/seed.js`. Await `loadState(APP, createInitialData)` before rendering routes. Keep a single user-action commit path that calls `saveState(APP, newState)` once for the complete result. Route, filters, form drafts, selection, and previews are transient. Server middleware owns `/state`, `/post`, and `/go`.
- [x] Render empty, singleton, and large injected collections and sparse optional fields. Use safe presentation fallbacks and inline eligibility errors for actions requiring data the record lacks. Preserve unfamiliar injected fields across edits. Derive queue counts and filtered results from the active state. No background mutations. Use the runtime clock for user timestamps and relative dates. Bundle assets locally and verify `npm run build`.

## P1 — Required workflows

- [x] **Orders queue and details.** Default to Awaiting Shipment. Include All, Awaiting Payment, On Hold, Shipped, and Cancelled filters with counts. Combine status, store, and case-insensitive order number, recipient, or SKU search. Sort by order date or order number and paginate by 25. Show recipient, store, destination, date, and status. Order number opens a split detail with address, items, shipping configuration, and links to outbound labels, active batch, and returns when present. Keep filter context on Back.
- [x] **Orders actions.** New Order opens a recipient, shipping address, manual store, order number, and optional line-items form. Validate source-scoped order-number uniqueness, field lengths, whole positive quantities, and nonnegative prices. Offer Save and Save & Create Label. Edit Details updates recipient, address, and notes for unshipped orders. Place on Hold, Release Hold, Mark as Paid, and Cancel Order use eligible statuses and confirmation for cancellation. Block cancel/hold if the order belongs to an open batch and link to that batch for removal. **Writes:** append or update `orders[]`; append an `activity[]` record for each successful action.
- [x] **Labels.** From an eligible order, open Create Label with Ship From, carrier/service, package, weight and dimensions. Show a deterministic USD rate from local rules, then require explicit confirmation with the amount. Awaiting Shipment and On Hold are eligible when there is no active outbound label and no open batch membership. Order detail links to the batch when it controls label creation and offers Save Shipping Options so missing settings can be filled without creating a label. Labels list filters by Active/Voided and Outbound/Return and searches by tracking number, label number, recipient, or order number. Label details show carrier, service, tracking, package, cost, origins/destinations, and source links. Preview an original local label. An explicit Print Label confirmation opens the browser print flow and records the request. Confirm Void Label for eligible unused outbound labels. Preserve the label, and reopen the linked order if it has no other active outbound label. Return labels use the return cancellation action. **Writes:** update `orders[].shipping` on save, append `labels[]` and mark `orders[].status` Shipped on creation, update `labels[]` and eligible `orders[]` on void, and record confirmed print requests in `activity[]`.
- [x] **Batches.** Select awaiting-shipment orders and use Create Batch or Add to Batch. The Batches page also supports New Batch and filters by Open, Processed, and Archived. Show batch number, name, assignee, order count, and status. The detail view supports renaming, assigning, and adding or removing orders while open. Enforce one open batch per order; show conflicts by order number so users can remove a conflicting assignment explicitly. Show validation per order and block processing until every order is eligible and configured. Confirm Process Batch with order count and total local postage. On success link to all generated outbound labels and offer Print Labels. Archive processed batches via confirmation. **Writes:** `batches[]` membership and metadata; a single process commit sets batch status/totals, creates linked `labels[]`, and transitions member `orders[]`; `activity[]` records create, edits, membership changes, process, print, and archive.
- [x] **Returns.** Offer Create Return from a shipped order or outbound label and from the Returns page using an eligible order picker. Choose line items, positive quantities, per-item reasons, and an optional note. Show remaining returnable quantities after non-voided returns. Specify warehouse, service, and package settings, using the outbound package as a starting point when available. Review the cost, then Authorize Return. The return detail links to its original order and both labels when available. Show RMA, order, recipient, dates, tracking, quantities, reasons, and status. Filter Outstanding, Received, and Voided and search by RMA, order number, tracking, or recipient. Confirm a receipt date to receive an outstanding return. Confirm cancellation of an outstanding return with an unused inbound label to void that label. Neither action changes outbound order status. **Writes:** create linked `returns[]` and inbound `labels[]` together, update `returns[]` on receipt and both records on cancellation, and append `activity[]` for each action.
- [x] **Observable state and acceptance.** Write `SCHEMA.md` documenting every top-level key and nested record shape with an Observable State Changes table aligned with the implementation and the matrix below. On localhost verify each workflow via Playwright, including reload, session isolation, injected records, and an idle page. In `TEST.md` record the actions and changed fields observed via `GET /go?sid=…`. Use the installed Playwright from `PILOT_PLAYWRIGHT`. Start a persistent Vite process with a hidden window and absolute Vite entry path. The parent runner handles Docker certification and commits.

## Observable writes for implementation and test

Every completed business action adds an `activity[]` entry with action, linked IDs, actor, and ISO timestamp. Creation fields and event details are defined in `assets/data_model.md`.

| User action | Additional writes in the same commit |
| --- | --- |
| Save new order | Append `orders[]` with store, address, items, calculated total, and `status=awaiting_shipment`. Save & Create Label opens configuration after this commit. |
| Save order edit | Set `orders[].recipient`, `shipTo`, or `notes` to submitted values. |
| Save shipping options | Set `orders[].shipping` and update mutation metadata. |
| Mark paid, place on hold, release hold, or cancel | Change `orders[].status` to the eligible destination and update mutation metadata. |
| Create outbound label | Append `labels[]` with order ID, package and address snapshots, service, tracking, and cost. Save confirmed options to `orders[].shipping`; set `orders[].status=shipped`. |
| Void outbound label | Set `labels[].status=voided` and `voidedAt`; reset the eligible order to `awaiting_shipment` when the last active outbound label is voided. |
| Confirm Print Label or Print Labels | Event only, with all selected active label IDs and a batch ID for batch printing. |
| Create, rename, assign, add to, or remove from batch | Append or update `batches[]` with `name`, `assigneeId`, and/or `orderIds`. |
| Process batch | Set `batches[].status=processed`, `processedAt`, and `totalCost`; append one outbound `labels[]` record per member with that batch ID; set each member order status to `shipped`. |
| Archive batch | Set `batches[].status=archived` and `archivedAt`. Preserve member and label history. |
| Authorize return | Append `returns[]` with picked quantities and reasons, warehouse, fee, outbound label if known, and `status=outstanding`. Append active inbound `labels[]` with `returnId` and matching `returns[].labelId`. |
| Confirm receipt | Set `returns[].status=received` and `receivedDate` to the selected warehouse date. |
| Cancel return | Set `returns[].status=voided` and `voidedAt`; also set the linked active inbound label to voided with the same timestamp. |

## Seed coverage

- [x] 96 orders, 68 labels, 26 batches, and 30 returns, plus supporting fixed account, users, stores, warehouse locations, and starter activity. Follow the distributions and cross-link rules in the data model so every workflow has eligible and ineligible fixtures and the default queue has multiple pages.

## Out of scope

Authentication, billing, live carrier/marketplace connections, email, returns portal, international customs, multi-package and split shipments, external tracking, account administration, and optional extensions outside the four seed workflows.
