# Walmart Seller Center Mock — Test Report

> Round: 2  
> Date: 2026-11-18  
> Server: http://localhost:5462  
> Tested by: playwright agent

WORKFLOWS: PASS

## Summary

| Metric | Count |
|---|---:|
| Routes tested | 8 app routes plus the unknown-route fallback |
| Elements tested | 22 check groups |
| ✅ Passed | 22 |
| ❌ Failed | 0 |
| ⚠️ Skipped (out of scope) | 0 |

`npm run build` passed. Chromium from `PILOT_PLAYWRIGHT` passed the workflow, audit regression and supplemental control suites against the running localhost app. All three suites also passed with Playwright serving the built `dist/` assets at the same origin and forwarding state requests to the localhost API. Scripts and screenshots are in the gitignored `test-results/` directory. The parent runner handles Docker dynamic certification.

## ✅ Passing Tests

### SEED workflows

The suite verified values with `GET /go?sid=…` after each action. Each appended record carried a fresh ID, the relevant parent ID, an ISO `createdAt` and actor `usr-maya-chen`. Each touched parent kept its ID and used the action's timestamp and actor in `updatedAt` and `updatedBy`.

| Workflow and UI steps | Observed state changes |
|---|---|
| **Items · Catalog.** Open Published items from Overview. Change status and stock filters, sort by recently updated, and page through the catalog. Search for Bamboo Drawer Organizer by name, SKU, item ID, and product ID. Open the item and reload. | No writes. Catalog showed 15 rows per page and 48 seeded items with filters cleared. |
| **Items · Add.** Use Add item, enter Harbor Test Ceramic Vase with SKU `HP-QA-VASE`, brand Fern & Flint, category Home Organization, product ID `00000000009876`, description, price `24.95`, seller fulfillment and stock `8`. Select Save as draft. Create Harbor Folding Basket separately with SKU `HP-QA-BASKET`, price `18.25`, and choose Publish. | One `items[]` insertion per submission with `id`, `name`, `sku`, `brand`, `category`, `productId`, `description`, `price`, `fulfillment`, `availableQuantity`, `imageKey`, `status`, `createdAt`, `updatedAt` and `updatedBy`. Status was `draft` or `published`. One `itemActions[]` entry per insertion with `type: created`, resulting `status`, `before: {}` and business fields in `after`. |
| **Items · Maintain.** Open the vase. Edit listing to Harbor Ceramic Vase and Kitchen & Dining, update price to `29.50`, and update available units to `12`. Publish the draft, retire it, and republish it. Reload. | Content edit changed `name`, `category` and `imageKey` from `home` to `kitchen`. Price changed `24.95 → 29.50` and `availableQuantity` changed `8 → 12`. Status moved `draft → published → retired → published`. The item ID and SKU stayed stable. Each confirmation appended one `itemActions[]` record with type `edited`, `price_updated`, `inventory_updated`, `published`, `retired`, or `published` and exact changed values in `before` and `after`. The inventory action stored `location: Columbus Fulfillment Center`. |
| **Orders · Queues.** Switch Unshipped, All, Canceled and Shipped. Filter by Ship by and Walmart fulfillment. Search by purchase order, customer order, customer name and SKU. Open purchase order `6402108012010`. | No writes. Initial counts were 22 unshipped, 60 total, 4 canceled and 34 shipped. With the browser clock set to Nov 18, Today showed eight unshipped records. The Walmart fulfillment filter showed two unshipped orders with selection disabled. |
| **Orders · Acknowledge.** Confirm Acknowledge for `6402108012010`. In Unshipped, select `6402108012011` and `6402108012012` and confirm Acknowledge selected. | Each target and its eligible lines became `acknowledged`. Each order received `acknowledgedAt`, `updatedAt` and `updatedBy`. Each appended acknowledgment linked the affected line IDs, SKUs and quantities. The single acknowledgment linked `ol-2010-1` and `ol-2010-2`, two units each. The bulk acknowledgment linked `ol-2011-1` at three units and `ol-2012-1` at four units in separate action records with one POST for the batch. |
| **Orders · Ship and cancel.** In `6402108012010`, choose Mark as shipped, select UPS, enter `1ZQA0000000123456` and confirm. Reload. In `6402108012011`, confirm Cancel order with Out of stock. | Shipping set the order and both open lines to `shipped` and wrote `shippedAt`. Cancellation set the order and its open line to `canceled` and wrote `canceledAt`. Both wrote update metadata and retained `acknowledgedAt`. `orderActions[]` received one shipment with the carrier and tracking number and one cancellation with the reason. Both actions stored affected line IDs, SKUs and quantities. |
| **Returns · Queues.** Switch All, Refunded, Received and In transit. Filter by Arrived damaged and search by return ID, purchase order ID, customer and SKU. Open `7000160003010`, follow the linked purchase order, then go back. | No writes. Initial counts were 30 total, 8 refunded, 12 received and 10 in transit. The reason filter matched two in-transit returns. |
| **Returns · Receive.** Confirm Mark received for `7000160003010`. | Return status changed to `received` and `receivedAt`, `updatedAt` and `updatedBy` were set. One `returnActions[]` receipt linked purchase order `6402108012032`, return line `rl-3010-1`, order line `ol-2032-1`, SKU `HP-HO-101` and quantity `4`. |
| **Returns · Partial refund.** Open `7000160003021`, choose Issue refund, select one unit of `HP-PT-101`, and confirm. Reload. | Line `rl-3021-1` gained `refundedQuantity: 1`. The other line stayed at zero. `refundedAmount` became `36.45` and `refundStatus` became `partially_refunded`. Return status stayed `received`. One `refunds[]` transaction linked purchase order `6402108012043` and return and order lines `rl-3021-1` and `ol-2043-1`, with quantity `1`, amount `36.45`, `currency: USD` and `status: issued`. Both refund confirmations wrote `updatedAt` and `updatedBy` on the return. |
| **Returns · Final refund.** Reopen Issue refund for the same return. Select the remaining two units of `HP-PT-101` and four units of `HP-PT-104`. Confirm. | A second refund transaction totaled `302.70`, consisting of two units for `72.90` and four units for `229.80`. Cumulative `refundedAmount` reached `339.15`. Both return statuses became `refunded`. `refundedAt` matched `updatedAt`. The Issue refund button was no longer available. No catalog inventory changed. |

### Rejections, isolation and rendering

- A case-insensitive duplicate SKU, fractional-cent and zero prices, negative and fractional stock, missing shipment tracking, a missing cancellation reason, and empty, zero, fractional and excessive refund quantities each displayed a validation message and produced zero writes. Re-saving an unchanged price also produced zero writes. Walmart-fulfilled inventory had no seller inventory control.
- Confirming the same partial refund form twice in one event loop produced one transaction. Acknowledged orders could no longer be selected for acknowledgment. Terminal shipping and cancellation controls, the completed receipt control, and the final refund control became unavailable. Escape closed a dialog and restored focus.
- Each run captured five browser baseline `set` requests, one per fresh SID, and 15 business `set_current` requests. Browsing, filtering, reloads with cached state and 2.4 seconds of concurrent idle tabs produced zero additional writes. The initial snapshot remained fixed and `state_diff` contained only the seven mutated business arrays after the workflow.
- Empty, singleton, and 240-item/240-order/240-return injected worlds rendered across all queues with omitted optional metadata. Empty worlds and unknown deep-link IDs showed recoverable states. Singleton and large worlds supported search, drill-down and reload with SID preserved. Custom account values merged with defaults and an injected extra root key survived. A fresh SID received the original seed and left the mutated SID unchanged.
- Catalog and Orders CSV downloads matched the active filter, including a one-item catalog export and a five-order canceled export, with no Harbor writes. The 390px layout kept the viewport within its width and scrolled the orders table within its card. No browser page errors or external HTTP requests were observed.

### Audit regressions

- Injected two return lines with the same SKU, including a line ID of `constructor`. Both lines had distinct review labels. The selected line started at its remaining quantity and confirmation recorded one `refunds[]` transaction with its return line ID, order line ID, quantity and amount. Only that line's `refundedQuantity` changed. `/go.state_diff` contained `refunds` and `returns` only.
- An injected item with omitted fulfillment displayed an empty location and no seller inventory action. At 320px, selecting eligible orders kept all bulk actions inside the viewport and the pagination button measured 40px square.
- The regression sent `{"action":"reset"}` to `/post?sid=<sid>` and verified that `/state` and a fresh browser context read the restored snapshot. `/go.initial_state` stayed fixed and `/go.state_diff` was empty.

### Supplemental control checks

- All eight app routes loaded on direct entry. Each desktop view fit its viewport, and each route fit at 390px with wide tables scrolling inside their cards.
- Workspace navigation and the wordmark preserved the SID. Overview queue links opened the matching queues, including the Received returns filter. The Add item button changed on hover, Cancel returned to Catalog, the item breadcrumb returned to the queue, and both dialog dismissal buttons restored focus.
- The Orders select-all checkbox selected the eligible orders on the current page, unchecking it cleared those selections, and Clear reset the selection. Orders and Returns paged forward and back. The fallback for an unknown route linked back to Overview. These actions left `/go` unchanged after the baseline POST.
- Mark received displayed a success message. Dismissing it removed the message and sent zero additional requests to `/post`. Only `returns` and `returnActions` appeared in `/go.state_diff`. The browser console had zero errors and the suite observed zero requests outside localhost.

## ❌ Bugs for Dev Agent

No open findings.

## Visual Alignment Feedback

Reviewed desktop screenshots of all eight app routes against the local `DESIGN.md` and checked narrow layouts at 390px and the Orders bulk toolbar at 320px. The text wordmark, local artwork, horizontal navigation, queue tables, detail panels, setup form and refund dialog matched the site's design.

## Round History

### Round 1 → Round 2

- Reverified the audit fixes for repeated-SKU refunds, missing fulfillment and narrow bulk controls. Reconfirmed isolation and reset against `/go`.
- Added route-by-route visual and responsive checks plus coverage of navigation, cancellation, pagination, selection and dismissal controls.

## Harbor Docker dynamic certification

The repository certifier passed the production bundle in run `133500`. The local evidence is `factory/build/dyn_certify/133500/results.json`.

| Render | Sync | Idle | Hydrate |
| --- | --- | --- | --- |
| Pass | Pass (1 baseline POST) | Pass (0 idle POSTs) | Pass |
Injection reached `items → 0 → sku`.
