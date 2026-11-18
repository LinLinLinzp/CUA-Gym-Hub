# Chewy Mock — Test Report

> Round: 2
> Date: 2026-11-18
> Server: http://localhost:5342
> Tested by: playwright agent

WORKFLOWS: PASS

## Summary

| Metric | Count |
| --- | ---: |
| Routes tested (including fallback) | 12 |
| Elements tested (grouped by runner checkpoint) | 13 |
| ✅ Passed | 13 |
| ❌ Failed | 0 |
| ⚠️ Skipped (out of scope) | 0 |

## ✅ Passing Tests

- **Overview and account navigation** · Opened delivery, order and pet previews and used the Chewy wordmark to return home. Verified section changes, deep links, reloads, browser back and forward, recovery links, and session query preservation.
- **Autoship** · Searched by product and filtered by status. Changed the date and cadence independently, skipped regular and overdue shipments, added a product, edited quantity, removed a product, changed saved address and payment, placed two immediate orders with distinct IDs, and canceled a plan. The canceled state survived reload. The UI protected the last product and disabled skip if the next date fell outside the supported calendar range.
- **Order History** · Searched, filtered, sorted, viewed tracking, canceled a processing order and placed a reorder. The cancellation and new order survived reload, and the reorder preserved the original price with new item IDs.
- **Pet Profiles** · Searched and filtered profiles, created a rabbit profile, edited its notes and removed it. Future birthdays and zero weight triggered validation and preserved the draft. The removed profile left the gallery while remaining readable by direct link.
- **Returns** · Started requests from Order History and Returns. Checked item eligibility, selected quantities and reasons, chose a refund destination, reviewed and submitted, searched and filtered history, followed the link back to the order, and verified the submitted request survived reload. Excess quantities and ineligible items were excluded. The final request refunded shipping once. Four split requests on a separate partially eligible order refunded exactly $0.02 in proportional tax.
- **Harbor** · Verified seed counts, a single fresh baseline save, session isolation, no writes from idle or read-only interactions, and one `set_current` per successful mutation. Empty, sparse and 400-record injected collections rendered. Editing one pet in the large world preserved the unrelated collections.
- **Build and browser** · `npm run build` passed. Installed Chromium from `PILOT_PLAYWRIGHT` exercised the workflows on the existing Vite development listener. The expanded suite also passed with local `dist/` HTML and assets supplied by Playwright at the same localhost origin and the state API served by the listener. Chromium reported zero page errors, console errors or off-origin requests. The test clock was fixed at `2026-11-18T17:00:00Z`.

## Observable State Changes via /go

For each successful mutation, Playwright waited for the successful `set_current` response and read `GET /go?sid=<sid>` to verify the resulting records. Field paths below show the persisted changes for each exercised action.

| User action | Changed fields and records |
| --- | --- |
| Save Autoship date | `autoships[].nextShipDate`, `updatedAt`, `updatedBy`. Added `autoshipEvents[]` with `action: date_changed` and before/after `nextShipDate`. |
| Save Autoship frequency | `autoships[].frequencyWeeks`, `updatedAt`, `updatedBy`. Added `frequency_changed` event with before/after frequency. |
| Skip Autoship shipment | `autoships[].nextShipDate`, `updatedAt`, `updatedBy`. Added `shipment_skipped` event with before/after dates. |
| Add, edit or remove Autoship product | `autoships[].items[]`, `updatedAt`, `updatedBy`. Added `item_added`, `item_quantity_changed` or `item_removed` event with applicable before/after `itemId`, `productId`, `quantity` and `unitPrice`. |
| Change Autoship address or payment | `autoships[].addressId` or `paymentMethodId`, plus `updatedAt` and `updatedBy`. Added `address_changed` or `payment_changed` event with before/after IDs. |
| Place Autoship order now | `autoships[].nextShipDate`, `updatedAt`, `updatedBy`. Added `ordered_now` event with before/after dates and `orderId`. Inserted a processing `orders[]` record with `id`, `orderNumber`, `autoshipId`, `items`, `address`, `paymentLabel`, `subtotal`, `shipping`, `tax`, `total`, `actorId` and `createdAt`. |
| Cancel Autoship | `autoships[].status`, `cancelledAt`, `updatedAt`, `updatedBy`. Added `cancelled` event with before/after status and cancellation time. Each Autoship event carried `id`, `autoshipId`, `action`, `actorId` and `createdAt`. |
| Cancel an order | `orders[].status`, `cancelledAt`, `updatedAt`, `updatedBy`. Added `orderEvents[]` with `id`, `orderId`, `action`, `previousStatus`, `newStatus`, `actorId` and `createdAt`. |
| Place reorder | Inserted a processing `orders[]` record with fresh order and line IDs, `sourceOrderId`, item and delivery snapshots, totals, `actorId` and `createdAt`. Added an `orderEvents[]` entry with `action: reordered`, `orderId`, `sourceOrderId`, `newStatus`, `actorId` and `createdAt`. |
| Add, edit or remove pet | Added an active `pets[]` record with `id`, `name`, `species`, `breed`, `birthday`, `weightLbs`, `notes`, `actorId` and `createdAt`. Editing saved the profile fields with `updatedAt` and `updatedBy`. Removal set `status: removed` and `removedAt`, with update metadata. Each action added a `petEvents[]` record with `id`, `petId`, `action`, `previous`, `next`, `actorId` and `createdAt`. |
| Submit return request | Added one `returns[]` record with `id`, `returnNumber`, `orderId`, `status: requested`, `refundMethod`, `itemsAmount`, `taxRefund`, `shippingRefund`, `refundAmount`, `actorId`, `createdAt` and `instructions`. Each line contained `orderItemId`, `productId` when present, `name`, `quantity`, `reason`, `unitPrice` and `amount`. Order detail derived availability and return status from the linked requests. |

## ❌ Bugs for Dev Agent

No open findings.

## Visual Alignment Feedback

Reviewed local Chromium captures of Overview, Autoship detail, Order detail, Pet detail and Returns at 1440 pixels against DESIGN.md. The cream workspace, blue controls, text wordmark and original pet artwork rendered consistently. The mobile overview, return form and Autoship detail fit the 390-pixel viewport. Autoship product actions measured at least 44 pixels tall.

## Round History

### Round 1 → Round 2

- The existing app passed all four workflows again. The expanded coverage added overview preview links, wordmark navigation, and visual review of all four account sections.
- The previous round also checked direct API reset behavior and ran the suite against Vite preview. Round 2 used the active port 5342 listener for state API requests and exercised the freshly built bundle through Playwright.
-

## Harbor Docker dynamic certification

The repository certifier passed the production bundle in run `189168`. The local evidence is `factory/build/dyn_certify/189168/results.json`.

| Render | Sync | Idle | Hydrate |
| --- | --- | --- | --- |
| Pass | Pass (1 baseline POST) | Pass (0 idle POSTs) | Pass |
Injection reached `addresses → 0 → label`.
