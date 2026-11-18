# Sephora account state model

`createInitialData()` in `src/data/seed.js` returns the eight top-level keys below. Use fixed IDs and ISO UTC strings in the seed. Use `new Date().toISOString()` and a unique ID for newly committed events. Store prices as numeric USD amounts rounded to two decimals and compute arithmetic in cents. Point amounts and quantities are integers. `?sid=` identifies the isolated world and belongs to navigation and the state API.

## Top-level keys

| Key | Type | Purpose |
| --- | --- | --- |
| `account` | object | Single signed-in member |
| `orders` | array of Order | Purchase history, line items, and shipments |
| `orderEvents` | array of OrderEvent | Recorded order mutations |
| `beautyInsider` | object | Current tier and balance |
| `pointsTransactions` | array of PointsTransaction | Signed Beauty Bank ledger |
| `rewards` | array of Reward | Catalog and stock |
| `redemptions` | array of Redemption | Completed reward redemptions |
| `returns` | array of Return | Return cases and refund details |

The fields below describe full records. Fields marked `?` may be omitted. Views should also tolerate sparse injected records, including missing names, arrays, payment data, and foreign references. Fall back to available IDs or explanatory empty text. For an action, validate required inputs against current state and fail closed when eligibility or calculation data is missing.

## Account and orders

| Entity | Fields and examples |
| --- | --- |
| Account | `id: string` (`member-avery`), `firstName: string` (`Avery`), `lastName: string` (`Morgan`), `email?: string` (`avery.morgan@example.com`) |
| Order | `id: string` (`ord-0036`), `orderNumber: string` (`SF-81240360`), `accountId: string`, `placedAt: ISO string`, `status: string` (`placed`, `in_progress`, `partially_shipped`, `shipped`, `delivered`, `cancelled`, `returned`), `fulfillmentMethod?: string` (`standard_shipping`), `currency: string` (`USD`), `subtotal: number` (`64`), `discount: number` (`5`), `tax: number` (`4.72`), `shipping: number` (`0`), `total: number` (`63.72`), `payment?: PaymentSummary`, `items?: OrderLine[]`, `shipments?: Shipment[]`, `deliveredAt?: ISO string`, `cancelUntil?: ISO string`, `cancelledAt?: ISO string` |
| PaymentSummary | `type: string` (`card`), `brand?: string` (`Visa`), `last4?: string` (`0426`) |
| OrderLine | `id: string` (`line-0036-01`), `sku: string` (`SK-41001`), `brand: string` (`Aster & Vale`), `name: string` (`Barrier Softening Cream`), `variant?: string` (`50 mL`), `category?: string` (`skincare`), `quantity: integer` (`2`), `unitPrice: number` (`32`), `refundableUnitAmount: number` (`31.86`, preallocated net merchandise and tax), `returnable: boolean`, `returnEligibleUntil?: ISO string` |
| Shipment | `id: string` (`shp-0036-01`), `carrier?: string` (`UPS`), `trackingNumber?: string` (`1Z0000000000812403`), `status: string` (`in_transit`), `estimatedDeliveryAt?: ISO string`, `lineIds?: string[]`, `events?: { status: string, at: ISO string, location?: string }[]` (`out_for_delivery`, `2026-11-18T14:00:00.000Z`, `Portland, OR`) |
| OrderEvent | `id: string` (`oe-0036-01`), `orderId: string`, `type: string` (`cancelled`), `status: string` (`cancelled`), `amount: number` (`63.72`, authorized total), `currency: string`, `items: { orderLineId: string, quantity: integer }[]`, `actorId: string`, `createdAt: ISO string` |

An explicit `cancelUntil` encodes an order's short cancellation window. Confirm it is still in the future, no shipment has begun, and the order has no credited points transaction. Tracking events are seeded data displayed in chronological order.

## Beauty Insider

| Entity | Fields and examples |
| --- | --- |
| BeautyInsider | `accountId: string`, `tier: string` (`VIB`), `pointsBalance: integer` (`1840`), `memberSince?: ISO string` |
| PointsTransaction | `id: string` (`pt-0040`), `accountId: string`, `type: string` (`opening_balance`, `earn`, `bonus`, `redeem`, `return_adjustment`), `pointsDelta: integer` (`-750`), `balanceAfter: integer` (`1090`), `description: string` (`Travel Ritual Set`), `createdAt: ISO string`, `actorId: string` (`member-avery` or `system`), `orderId?: string`, `returnId?: string`, `redemptionId?: string` |
| Reward | `id: string` (`reward-travel-ritual`), `name: string` (`Travel Ritual Set`), `description?: string`, `pointsCost: integer` (`1000`), `stock: integer` (`4`), `requiresPurchase: boolean`, `eligibleTiers?: string[]` (`['VIB', 'Rouge']`) |
| Redemption | `id: string` (`red-0009`), `accountId: string`, `rewardId: string`, `rewardName: string`, `pointsSpent: integer` (`1000`), `quantity: integer` (`1`), `status: string` (`redeemed`), `pointsTransactionId: string`, `actorId: string`, `createdAt: ISO string` |

The seed's ledger sums to `beautyInsider.pointsBalance`, using an opening-balance entry if needed. Order points link to the original order. A return reversal links to both the return and the order. Use the stored balance when an injected world has a partial ledger. A redemption snapshots its offer name and cost, spends points, and reduces available stock in one update. Validate against the latest in-memory state immediately before committing the confirmation.

## Returns

| Entity | Fields and examples |
| --- | --- |
| Return | `id: string` (`ret-0025`), `returnNumber: string` (`RT-820025`), `orderId: string`, `accountId: string`, `status: string` (`submitted`, `in_transit`, `completed`, `cancelled`), `method: string` (`mail`), `refundMethod: string` (`original_payment`), `items: ReturnLine[]`, `estimatedRefund: number` (`31.86`), `refundedAmount?: number` (`31.86`), `currency: string` (`USD`), `createdAt: ISO string`, `actorId: string`, `timeline?: { status: string, at: ISO string }[]`, `completedAt?: ISO string`, `pointsTransactionId?: string` |
| ReturnLine | `orderLineId: string`, `quantity: integer` (`1`), `reasonCode: string` (`shade_mismatch`, `did_not_meet_expectations`, `damaged`, `wrong_item`, `changed_mind`, `other`), `estimatedRefund: number` (`31.86`), `refundedAmount?: number` (`31.86`) |

For the mail-return flow, require a delivered order, eligible line, valid order/line identity, and a positive remaining quantity. Use the line's `returnEligibleUntil` when present. Otherwise derive the 30-day deadline from `placedAt` and compare with the runtime clock. Calculate remaining quantity from the original order line minus quantities in submitted, in-transit, and completed requests on that order. A cancelled request releases its quantity. Include the per-unit net amount and allocated tax in `refundableUnitAmount`, then multiply by selected quantity. A submitted request gets its initial timeline entry at creation. Refunds and associated points reversals belong to completed fixture cases.

## Write contract for verification

| User action | Exact changes |
| --- | --- |
| Confirm order cancellation | Set matching `orders[].status` and `orders[].cancelledAt` and append one `orderEvents[]` row tied to that order and its lines. |
| Confirm an eligible reward | Decrement `beautyInsider.pointsBalance` by cost and matching `rewards[].stock` by one. Append one `redemptions[]` row and one negative `pointsTransactions[]` row with matching reciprocal IDs. |
| Submit a valid return | Append one `returns[]` row with `status: 'submitted'`, original order ID, selected line IDs with quantities and reasons, refund estimate, initial timeline entry, actor, and submission timestamp. |
| Browse, filter, review a draft, or dismiss a confirmation | No persisted fields change. |

Use the member ID as `actorId` for member actions. In `/go`, expect the changed top-level collections to appear in `state_diff` and assert the exact nested changes in `current_state`. Use integer arithmetic for cents and points, and leave related data intact when an action fails validation.

## Fixture calendar and scenarios

Use a fixed fixture reference of `2026-11-18T15:00:00.000Z` for local workflow tests. Seed recent shipped and delivered purchases in the surrounding weeks, one placed order with `cancelUntil: '2026-11-18T15:45:00.000Z'`, and multiple returnable lines with deadlines later than that reference. Include older orders and returns over the preceding year. Pass the reference into browser clock setup for default workflow tests. For injected scenarios, set deadlines around their chosen test clock. All application comparisons and mutation timestamps use the runtime clock.

For test discovery, record the actual IDs of the cancellation candidate, standalone reward, eligible order, and partial-return line in the final `SCHEMA.md` or the test fixture notes. Provide a default delivered order with two purchased units on one line and an existing one-unit request, leaving one unit available. Include separate fixtures with no active return and an expired deadline.
