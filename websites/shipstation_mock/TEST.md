# ShipStation Mock — Test Report

> Round: 2  
> Date: 2026-11-18  
> Server: http://localhost:5454  
> Tested by: playwright agent

WORKFLOWS: PASS

## Summary

| Metric | Count |
|--------|-------|
| Routes tested | 10 route patterns, including root and fallback |
| Elements tested | 106 visible-element checkpoints, plus state and interaction assertions |
| ✅ Passed | 7 scenarios, including all 4 SEED workflows |
| ❌ Failed | 0 |
| ⚠️ Skipped (out of scope) | 0 planned scenarios |

The Windows Playwright run used Chromium at 1440 × 900 and 390 × 844. It confirmed 25 successful workflow mutations, one full-state POST per mutation, and zero console warnings, page errors, or external HTTP requests. `npm run build` passed.

---

## ✅ Passing Tests

- **`/` and `/orders`**. The wordmark and sidebar navigate with the session ID. Awaiting Shipment opens by default. All status tabs, the store facet, case-insensitive number, recipient and SKU search, sorting, pagination, clearing filters, and current-page selection responded. The order-to-batch and breadcrumb links preserved the queue context. Orders in an open batch exposed the batch link and hid hold and cancel controls.
- **`/orders/:id`**. Created and edited a manual order, calculated an item total, placed and released a hold, marked an awaiting-payment order as paid, and confirmed cancellation. Required fields, duplicate order numbers in the same store, and invalid quantities blocked submission. Escape closed the form and restored focus. Save & Create Label persisted the order and opened the shipping configuration.
- **`/labels` and `/labels/:id`**. Saved shipping options from an order, increased weight during label creation, verified the new postage estimate, and checked that only confirmation created the label. Filtered by status and direction, searched by tracking, followed the linked order, opened and closed the local preview, confirmed printing, and voided the unused outbound label. Its linked order reopened and the voided label persisted after reload. Playwright intercepted `window.print()` and checked the rendered label content for single and batch prints. Native print dialogs and physical printers were outside the headless run.
- **`/batches` and `/batches/:id`**. Exercised the status tabs and name search. Created an empty batch on the Batches page and a populated batch from Orders. Edited the name and assignee, added members from both entry points, rejected a member already in another open batch, and followed the conflicting batch link. A member lacking shipping options blocked processing until removed. Confirmed processing for two ready orders, verified total postage and both linked labels, printed the batch, and archived it.
- **`/returns` and `/returns/:id`**. Authorized returns from a shipped order, an outbound label, and the Returns picker. Verified remaining quantities, selected item and reason, warehouse, postage, and linked records. Confirmed a specific receipt date and verified that the item was no longer returnable. Cancelled another return, verified that its linked inbound label voided, and reused the restored quantity in the picker. Exercised status filters, tracking search, clearing filters, and reloading a return detail.
- **Harbor runtime**. Confirmed the initial 96 orders, 68 labels, 26 batches, and 30 returns and an empty baseline diff. Separate session IDs rendered empty collections, sparse singleton records, and a 320-order collection. Sparse edits preserved an injected custom field, and the account object merged with its defaults. Verified `/post` reset, isolated session state, a direct load and reload of a record, missing-record pages for all four sections, and the unknown-route fallback. Reloads, queue controls, rejected changes, review screens, previews, and a 2.5-second idle interval produced no additional state writes.

### Observable state changes via `/go`

Checked `GET /go?sid=pw-shipstation-1795000096166` after every confirmed action and compared consecutive `current_state` snapshots. Each row below also produced an appended `activity[]` record with `id`, `action`, `createdAt`, `actorId`, `orderIds`, `labelIds`, and `details`, plus a `batchId` or `returnId` for the corresponding record. Update actions set `updatedAt` and `updatedBy`. An existing actor ID can already equal the new value.

| Workflow and action | Business fields observed through `/go` | Activity action |
| --- | --- | --- |
| Orders · Save and Save & Create Label | Appended `orders[]` records PW-ORDER-A and PW-ORDER-B with `id`, `number`, `storeId`, `recipient`, `shipTo`, `notes`, `items`, `total`, `orderedAt`, `status=awaiting_shipment`, `createdAt`, `createdBy`. The test item stored its SKU, ID, name, quantity of 2, and $13.20 unit price for a $26.40 total. | `order_created` |
| Orders · Edit details | Updated `orders[].recipient.name`, `shipTo.city`, `notes`, and update metadata on PW-ORDER-A. | `order_updated` |
| Orders · Hold, release, mark paid, cancel | Updated `orders[].status` and update metadata. PW-ORDER-A moved from `awaiting_shipment` to `on_hold` and back. NG-1083 moved from `awaiting_payment` to `awaiting_shipment` and then to `cancelled`. | `order_status_changed` for each transition |
| Labels · Save shipping options | Set `orders[].shipping` with `shipFromId`, `carrier`, `service`, `packageType`, `weightOz`, `dimensionsIn`, and updated order metadata. | `order_updated` with `details.fields=["shipping"]` |
| Labels · Confirm outbound label | Appended `labels[]` LBL-2069 with `id`, `number`, `orderId`, `direction=outbound`, `status=active`, `trackingStatus=label_created`, `trackingNumber`, `shipFrom`, `shipTo`, `shipping`, `cost=6.80`, and creation metadata. Updated `orders[].shipping.weightOz` from 12 to 20 and set the order's `status=shipped` with update metadata. | `outbound_label_created` |
| Labels · Confirm print | Appended the activity record with the label ID and `details.labelCount=1`. The activity collection was the sole changed key. | `labels_print_requested` |
| Labels · Confirm void | Updated `labels[].status=voided`, `voidedAt`, and update metadata. Updated the linked order's `status=awaiting_shipment` and update metadata. | `outbound_label_voided` with `details.reopened=true` |
| Batches · Create from queue and from selection | Appended `batches[]` B-3027 and B-3028 with `id`, `number`, `name`, `assigneeId`, `orderIds`, `status=open`, and creation metadata. The queue-created batch started empty. The selection-created batch started with NG-1040. | `batch_created` |
| Batches · Edit, add, and remove | Updated `batches[].name`, `assigneeId`, or `orderIds` with update metadata. Added and removed NG-1026 in the detail view and added NG-1039 from the Orders queue. | `batch_updated`, `batch_orders_added`, `batch_orders_removed` |
| Batches · Confirm process | Updated `batches[].status=processed`, `processedAt`, `totalCost`, and update metadata. Appended two outbound `labels[]` records with the same label fields as single creation plus `batchId`. Updated both member orders' `status=shipped` and metadata, with their configured shipping reflected in the labels. | `batch_processed` |
| Batches · Confirm print | Appended the activity record with `batchId`, both `labelIds`, and `details.labelCount=2`. The activity collection was the sole changed key. | `labels_print_requested` |
| Batches · Confirm archive | Updated `batches[].status=archived`, `archivedAt`, and update metadata. Verified membership and linked-label history. | `batch_archived` |
| Returns · Authorize from all three entry points | Appended RMA-4031 through RMA-4033 to `returns[]` with `id`, `rma`, `orderId`, `labelId`, `outboundLabelId`, `locationId`, `status=outstanding`, `items[].orderItemId`, `items[].quantity`, `items[].reason`, `notes`, `cost`, and creation metadata. Appended linked inbound `labels[]` with the same shipment fields as single creation plus `returnId` and `direction=return`. Verified customer origin and warehouse destination. | `return_authorized` |
| Returns · Confirm receipt | Set `returns[].status=received` and `receivedDate=2026-11-17` with update metadata. The business change was confined to `returns[]`. | `return_received` |
| Returns · Confirm cancellation | Set `returns[].status=voided` and inbound `labels[].status=voided` with matching `voidedAt` and update metadata. The order remained shipped and the outbound label remained active. | `return_voided` |

The separate sparse-session edit updated `orders[].recipient`, `shipTo`, `notes`, `updatedAt`, and `updatedBy` and appended `activity[]` with `action=order_updated`. The reset returned that session to its injected baseline with an empty `state_diff`.

---

## ❌ Bugs for Dev Agent

No application bugs found in the verified scenarios.

---

## Visual Alignment Feedback

Reviewed localhost captures of all four queues, the label preview, and the narrow Orders queue and New Order dialog against the original [ShipStation workspace design](DESIGN.md). The queue columns and action placement were consistent across sections. The narrow layout kept page width within the viewport, allowed navigation to Returns, and kept dialog actions visible while the form scrolled. The preview displayed the local sample-postage label, both addresses, tracking, and cost.

## Round History

### Round 1 → Round 2

- All four SEED workflows passed in both full runs. The second run corrected an ambiguous mobile test selector and confirmed that a revised label weight persists on purchase.
- Final result **PASS**.

## Harbor Docker dynamic certification

The repository certifier passed the production bundle in run `152048`. The local evidence is `factory/build/dyn_certify/152048/results.json`.

| Render | Sync | Idle | Hydrate |
| --- | --- | --- | --- |
| Pass | Pass (1 baseline POST) | Pass (0 idle POSTs) | Pass |
Injection reached `users → 0 → name`.
