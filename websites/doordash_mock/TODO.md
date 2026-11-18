# DoorDash account — TODO

> Status: LOCAL ACCEPTANCE PASSED  
> Last verified on 2026-11-18

Read [SEED.md](SEED.md), the [Harbor contract](../../HARBOR_CONTRACT.md), [DESIGN.md](DESIGN.md), the [workflow research](assets/README.md), and the [state model](assets/data_model.md).

## P0 — Account shell and Harbor runtime

- [x] Scaffold React/Vite inside this directory. Use port **5316** with strict port selection. Build local assets into dist, keep the package lockfile in the site, and ensure npm run build passes. Use DoorDash as the text wordmark and in the document title.
- [x] Build the signed-in account shell for Maya Chen. The root opens Orders. Support `/orders`, `/orders/:orderId`, `/group-orders`, `/group-orders/:groupId`, `/group-orders/:groupId/join`, `/refunds`, `/refunds/:refundId`, and `/dashpass`. Put all routes inside the same providers. Preserve `?sid=` across links, redirects, history, and reload. Missing records show a link back to their list. Follow [DESIGN.md](DESIGN.md).
- [x] Import unchanged `stateApi(createInitialData)` from `../../templates/state-api.js` in Vite. Copy `templates/dataManager.js` unchanged into `src/utils/dataManager.js`. Seed from `src/data/seed.js`. Await one `loadState` before rendering routes and save the whole next state once at the store boundary per successful user mutation. The middleware owns `/state`, `/post`, and JSON `/go`. Use `withSid()` on internal links outside the SPA router. Idle time, previews, validation, and navigation cause no business writes.
- [x] Render empty, single-record, large, and partial injected worlds. Resolve relations by ID and use saved snapshots or neutral fallbacks for missing data. Guard actions that lack required records. Add `SCHEMA.md` from the implemented model with all top-level fields and an **Observable State Changes** table showing exact fields written per action.

## P1 — Required SEED workflows

- [x] **Orders.** Show history newest first with merchant, order ID, date, quantity, total, and status. Combine search across merchant, ID and item name with All, In progress, Delivered, and Canceled filters. Details show line items, receipt totals, fulfillment and links to associated groups and refunds. **Reorder** opens review for an eligible delivered order. Let users adjust quantities and require **Place order** confirmation. Append one `orders[]` record with status `placed`, `sourceOrderId`, actor, creation time, item snapshots, and recalculated totals. A confirmed **Cancel order** on an eligible placed order updates `orders[].status`, `updatedAt`, `canceledAt`, and `canceledBy`. Receipt and details are read-only.
- [x] **Group orders.** List groups with text search and All, Open, Closed, Placed, and Canceled filters. **Start group order** collects restaurant, name and an optional deadline. Confirm to append `groupOrders[]` with status `open`, merchant, host participant, invite token, actor, and creation time. Detail shows participants, subtotals, the host cart and a copyable same-session invite URL. The guest route lets a participant enter a name, join and save their own items. Join and cart edits update `participants`, `updatedAt`, and `updatedBy`. Copying the link only gives UI feedback. Confirmed close updates `status: closed`, `closedAt`, `updatedAt`, and `updatedBy` and prevents cart edits. Confirmed cancel of an open or closed group updates `status: canceled`, `canceledAt`, `updatedAt`, and `updatedBy`. Host checkout of a closed, nonempty group requires a final review. Atomically write `status: placed`, `orderId`, `placedAt`, `updatedAt`, and `updatedBy` and append exactly one linked `orders[]` record with `groupOrderId`. Deadlines are informational.
- [x] **Refunds.** From an eligible delivered order use **Get help** to select Missing item or Incorrect item, affected line items and quantities, an optional note, and Original payment method or DoorDash credit. Show the amount before confirmation. Append one `refunds[]` record with status `requested`, `orderId`, requester, time, reason, method, note if supplied, line IDs, quantities, per-line amounts, and total. Reserve quantities used in requested and issued refunds so requests cannot exceed the original purchase. Draw the linked refund summary from those records and preserve the original receipt. The Refunds view offers searchable All, Requested, Issued, and Declined lists, details, order links, and issue dates where available. Seed historical statuses. New requests remain requested.
- [x] **DashPass.** Show plan, membership status, next charge or access-end date, masked payment label, and billing history. Offer monthly and annual plans, confirmed plan change, pause, resume, cancellation with reason, and reactivation or enrollment. Each confirmation atomically updates `dashpass` and appends one `dashpassEvents[]` record with actor, timestamp, effective date, previous and next status and plan, and reason as appropriate. Enrollment or reactivation after expiry also appends one `dashpassPayments[]` charge using the selected synthetic plan and payment method. Cancellation preserves paid access through its recorded end date. Plan changes take effect for the next period. Resuming already-paid access does not charge again. Expose historical charge details and derive date-based labels at render time.
- [x] **Local acceptance.** Use the installed Node Playwright from `PILOT_PLAYWRIGHT` against localhost port 5316. Exercise all four workflows through their visible entry points and assert their exact records in `/go`, including confirmation, validation, reload, and duplicate prevention. Check separate SID isolation, deep links, empty and partial state, idle network writes, and the production build. Start a persistent dev server with `Start-Process -WindowStyle Hidden`, an absolute `node_modules/vite/bin/vite.js` entry point, and this site as the working directory. Keep scratch ignored or remove it. Record actual results and changed fields in `TEST.md` for the parent runner.

## P2 — Secondary depth

No additional features are planned for this phase.

## Data seed

- [x] Provide at least 36 orders, 24 group orders, 24 refunds, 24 DashPass billing records, and 24 membership events. Include at least eight merchants with distinct menus, nonempty open and closed groups, delivered orders with refundable quantities, and live orders eligible for cancellation. Use fixed IDs, consistent date and amount math, and English synthetic records. See [state model](assets/data_model.md) for examples and invariants.

## Scope limits

The account opens signed in and runs offline. Authentication, production checkout, payment processing, external notifications, and live delivery simulation are outside the account workflows.

