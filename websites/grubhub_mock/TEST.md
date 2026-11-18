# Grubhub Mock — Test Report

> Round: 2
> Date: 2026-11-18
> Server: http://localhost:5317
> Tested by: playwright agent

WORKFLOWS: PASS

## Summary

| Metric | Count |
| --- | ---: |
| Routes tested, including fallback | 10 |
| Seed workflows passed | 3 |
| Audit regressions verified | 2 |
| Open bugs from this run | 0 |

## ✅ Passing Tests

### SEED workflows and observed Harbor writes

| Workflow | Browser verification | Fields changed via `/go` |
| --- | --- | --- |
| Orders | Searched, filtered, sorted and paginated history. Opened and printed a receipt. Added a dish, edited quantities, selected an address and payment method, placed an ASAP order and reloaded its receipt. Reordered a delivered meal, exercised both bag replacement paths and placed the reordered meal with an edited quantity. | Bag edits saved `cart.{restaurantId,sourceOrderId,items,updatedAt,updatedBy}`, including each line's `menuItemId`, `name`, `unitPrice` and `quantity`. Each confirmation appended one `orders[]` record with `id`, restaurant and actor IDs, `createdAt`, `currency`, `status: placed`, `fulfillment: delivery`, `timing: asap`, `items`, `totals`, `address` and masked `payment`. Checkout cleared and stamped `cart` in the same commit. The reorder stored the original order ID in the bag and then in the new order's `sourceOrderId`. |
| Scheduled delivery | Entered from Scheduled deliveries with an empty bag and an existing bag. Booked a 30-minute window, reloaded its receipt, opened delivery management, rescheduled and cancelled. Confirmed delivery restrictions and checked dismissed and incomplete confirmations. | Booking appended an `orders[]` record with `status: scheduled`, `timing: scheduled` and `scheduledDeliveryId`, and a linked `scheduledDeliveries[]` record with `id`, `orderId`, `status`, `windowStartAt`, `windowEndAt`, `timeZone`, `actorId`, `createdAt` and a `created` event. It cleared and stamped `cart` in the same commit. Rescheduling changed `scheduledDeliveries[].{windowStartAt,windowEndAt,updatedAt,updatedBy}` and appended a `rescheduled` event with old and new windows. Cancellation changed `scheduledDeliveries[].{status,cancelledAt,updatedAt,updatedBy}`, appended a `cancelled` event and set the linked `orders[].{status,cancelledAt}` in the same commit. |
| Refunds | Requested $16.94 for one unit of a two-unit line. Reloaded the case and requested the remaining $25.06 from the Refunds view. Exercised search, status filtering, invalid quantities and exhausted eligibility. | Each submission appended one `refunds[]` record with `id`, `orderId`, `status: requested`, `scope`, `reason`, optional `notes`, `lineItems[].{orderItemId,quantity,amount}`, `amount`, `currency`, masked original `payment`, `actorId` and `createdAt`. The source order stayed delivered and an injected top-level key survived both writes. |

### Navigation, runtime and layout

- Covered `/`, `/orders`, `/orders/:orderId`, `/scheduled`, `/refunds`, `/refunds/:refundId`, `/restaurants`, `/restaurants/:restaurantId`, `/bag`, `/checkout` and the unknown-route fallback. The summary counts the two Orders entry points together.
- Confirmed one baseline POST, one full-state `set_current` for each successful tested mutation and zero further POSTs in a 70-second idle check. Browsing, filtering, print, timing selection and invalid or dismissed interactions produced no business writes. Verified `/state` after mutation and `/post` reset against the original `/go` baseline.
- Verified separate session IDs in one browser, receipt and case reloads, empty injected arrays, and 410 injected orders with partial or orphaned records. Chromium reported no JavaScript errors or non-local requests.
- Captured the main views and recovery route at 390px and Orders at 1024px and 1440px. Verified no horizontal overflow, 44px order filters and 13px status badges at weight 500. Reviewed the responsive layout against the original local design.
- `npm run build` passed. The client state template matched the repository copy byte for byte.

## ❌ Bugs for Dev Agent

None reproduced in this run.

## Harbor Docker certification

The final production bundle passed the repository certifier. The local result is `factory/build/dyn_certify/161148/results.json`. The page returned HTTP 200 with no page errors, made one baseline POST and zero POSTs during the 70-second idle check, and hydrated the injected value at `restaurants[0].name`.

## Round History

### Round 1 → Round 2

- **AUDIT-001 · Fixed.** Both checkout timing choices survived round trips through the header Bag and Browse restaurants links. Chromium verified radio focus, the session ID and unchanged `/go` state.
- **AUDIT-002 · Fixed.** Chromium verified the documented filter height and badge typography, with no overflow at 390px.
