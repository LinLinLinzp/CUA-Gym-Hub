# IKEA Mock — Test Report

> Round: 2  
> Date: 2026-11-18  
> Server: http://localhost:5314  
> Tested by: playwright agent

WORKFLOWS: PASS

## Summary

| Metric | Count |
| --- | ---: |
| Routes tested, including recovery | 12 |
| Elements tested, grouped by scenario | 13 |
| ✅ Passed scenario groups | 13 |
| ❌ Failed scenario groups | 0 |
| ⚠️ Skipped scenario groups | 0 |

Windows PowerShell, Chromium from the Playwright installation at `PILOT_PLAYWRIGHT`, and a fixed November 18, 2026 browser clock. `npm run build` passed. The nine workflow and runtime scenario groups passed against Vite development assets and again with Playwright serving the rebuilt `dist/` files at the same localhost origin while sending state API requests to the live Vite server. Four additional regression scenario groups passed against Vite development assets.

## ✅ Passing Tests

| Route and interaction | Result and fields observed via `/go` |
| --- | --- |
| **Products and Cart** | Searched Alder by article number and category. Added it twice, updated its quantity, reloaded and removed it. Also exercised the Linden steppers and notice dismissal. Only `cart` and `cartEvents` changed. Adds created or merged the same `cart.lines[]` ID with `productId`, `unitPrice`, `quantity`, `lineAmount`, `actor`, `createdAt` and `updatedAt`. Quantity edits updated `quantity`, `lineAmount`, `actor` and `updatedAt`. Removal deleted the line. Each accepted action updated `cart.updatedAt` and appended an event with `id`, `cartId`, `lineId`, `productId`, `actor`, `createdAt`, `status`, `type`, `quantityBefore`, `quantityAfter`, `unitPrice` and `lineAmount`. Alder moved through 0→1→2→3→0 with line amounts $149, $298, $447 and $0. A stock violation and an unchanged quantity produced zero saves. |
| **Checkout and delivery booking** | Delivery-only checkout added one scheduled delivery and one order. Checkout with assembly added an order and two linked bookings in a single save. Each checkout appended `orders[]` with `id`, `reference`, `actor`, `createdAt`, `status`, `fulfillment`, `currency`, `address`, item `lines[]` and `totals`. It appended `bookings[]` with the order and line IDs, status, slot, address, amount, actor, timestamps and history. It cleared `cart.lines[]`, updated `cart.updatedAt` and appended a `cartEvents[]` checkout event with `orderId`, `subtotal` and consumed `lines[]`. The confirmation survived reload. Invalid ZIP, missing or expired windows and missing assembly consent produced zero saves. |
| **Checkout and existing-order assembly booking** | The checkout assembly stored `deliveryBookingId`, `consentAcceptedAt`, a slot after delivery, and the selected `items[].orderLineId`, `productId`, `quantity`, `unitPrice` and `lineAmount`. Assembly booked from an eligible existing order appended only `bookings[]`, with the order ID, address, scheduled slot, service amount, item IDs and quantities, actor, timestamps, consent and history. Both tests booked one Linden unit for $52. The existing-order booking survived reload. A quantity above remaining capacity produced zero saves. |
| **Service appointment rescheduling and cancellation** | Verified the delivery dependency restricted conflicting changes and linked to its scheduled assembly. Rescheduled and cancelled both appointments after confirmation. Only the targeted `bookings[]` entry changed each time. Rescheduling updated `slot` and `updatedAt` and appended `history[]` with `type: rescheduled`, actor, timestamp, `slotBefore`, `slotAfter` and `statusAfter`. Cancellation set `status: cancelled`, updated `updatedAt`, and appended history with `type: cancelled`, actor, timestamp, `statusBefore` and `statusAfter`. Escaping or dismissing a dialog and confirming without a new window produced zero saves. |
| **Order detail and Returns** | Submitted a partial two-line parcel return from an order and an in-store return from the Returns hub. Only `returns[]` changed. Each append recorded `id`, `reference`, `orderId`, `actor`, `createdAt`, `updatedAt`, `status: requested`, `method`, `currency`, `merchandiseAmount`, `feeAmount`, `refundAmount`, and item `orderLineId`, `productId`, `quantity`, `reason`, `condition`, `unitPrice` and `refundAmount`. The parcel estimate was $69.97 after a $5 fee. The in-store estimate was $29.99 with zero fee. The reference, history and reduced returnable quantity survived reload. An over-return produced zero saves, and the order snapshot remained intact. |
| **Overview and purchase history** | Checked newest-first order history, reference search, status filtering, shortcut and account navigation, browser back, hard reload and `sid` preservation. View-only actions produced zero business writes. |

### Runtime and visual checks

- Directly loaded and reloaded empty, sparse and missing-record worlds. A large injected world rendered up to 240 products, 210 orders, 200 bookings and 200 returns and persisted a cart edit.
- Observed one baseline POST on the first load of a fresh world. Separate sessions isolated writes, a second tab sharing the active session issued no writes while idle, and `reset` restored the original baseline with an empty diff.
- Reviewed desktop captures of all main screens and the mobile overview against the original design in `DESIGN.md`. Checked the primary routes at 320, 960, 961 and 1120 px for horizontal overflow. Chromium reported zero uncaught page errors and zero non-local requests.

## ❌ Bugs for Dev Agent

No open issues in the tested scope.

## Round History

### Round 1 → Round 2

- AUDIT-001 fixed. Two same-name return lines show identifying details and distinct line numbers in visible and accessible names. Submitting one line saved its exact original `orderLineId`.
- AUDIT-002 fixed. Both an ordinary unknown injected category and `constructor` loaded and decoded the original local fallback image.
- AUDIT-003 fixed. The 224 px rail and 32 px gap stay in place until the 960 px navigation breakpoint. Secondary controls use the specified ink color and show hover feedback.

## Harbor Docker dynamic certification

The repository certifier passed the production bundle in run `120200`. The local evidence is `factory/build/dyn_certify/120200/results.json`.

| Render | Sync | Idle | Hydrate |
| --- | --- | --- | --- |
| Pass | Pass (1 baseline POST) | Pass (0 idle POSTs) | Pass |
Injection reached `products → 0 → articleNumber`.
