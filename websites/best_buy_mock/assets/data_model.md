# Best Buy account data model

Use `createInitialData()` in `src/data/seed.js` to return a fresh JSON object with the keys below. Identifiers are strings and references resolve by exact `id`. Money is stored as a number in USD. Calculate with integer cents and convert at the state boundary. Quantities are positive integers on actions and nonnegative integers on counters. Timestamps use UTC ISO 8601 strings. Omit optional properties when unavailable. Create new action ids in the submit handler, using `crypto.randomUUID()` with the relevant prefix.

## State shape

| Key | Type | Example or role |
| --- | --- | --- |
| `account` | Account | Signed-in synthetic member |
| `orders` | Order[] | Purchase history and embedded order lines |
| `stores` | Store[] | Pickup and return destinations |
| `orderEvents` | OrderEvent[] | Pickup contact and order cancellation history |
| `priceMatchRequests` | PriceMatchRequest[] | Price adjustment requests |
| `protectionPlans` | ProtectionPlan[] | Purchased and historical plan coverage |
| `protectionPlanEvents` | ProtectionPlanEvent[] | Plan additions and cancellations |
| `protectionClaims` | ProtectionClaim[] | Service request history |
| `returns` | Return[] | Return requests and their item quantities |

`actorId` on every action record references `account.id`. An injected order, plan, store, or line may be absent after array replacement. Show an available identifier or neutral fallback for an unresolved relation. Keep its historical records visible. Business controls require resolvable references and the data needed to calculate and validate the action.

## Account and stores

- **Account** · `id: string` (`acct-001`), `name: string` (`Jordan Ellis`), `email?: string` (`jordan.ellis@example.test`), `membership?: string` (`My Best Buy`).
- **Store** · `id: string` (`store-001`), `name: string` (`Willow Creek`), `address?: string` (`120 Juniper Way, Lakehurst, MA`).
- **PickupContact** · `name: string`, `email: string`, `phone: string`. Use a fictional name, reserved email domain, and reserved 555-01xx number range.

## Orders

| Field | Type | Example or meaning |
| --- | --- | --- |
| `id`, `orderNumber` | string | `ord-1001`, `BBY01-800001` |
| `createdAt`, `updatedAt?`, `receivedAt?` | timestamp | Purchase, last order edit and receipt of items |
| `status` | enum | `processing`, `shipped`, `delivered`, `ready_for_pickup`, `picked_up`, `canceled` |
| `fulfillment` | enum | `shipping`, `pickup` |
| `storeId?`, `pickupContact?` | string, PickupContact | Applies to pickup |
| `shipment?` | object | `{ carrier: 'Parcel Delivery', trackingNumber: 'SYN-81001', events: [{ status: 'In transit', at: '2026-11-16T14:30:00.000Z', location: 'Lakehurst, MA' }] }`; `events` and event locations can be absent |
| `paymentLabel?` | string | `Visa ending in 0142` |
| `subtotal?`, `tax?`, `shippingAmount?`, `total?` | USD number | Original receipt amounts. Display as unavailable if missing and derive subtotal only when all original item amounts are known. |
| `items` | OrderLine[] | Order-line ids are unique within an order |

**OrderLine** · `id: string` (`line-1001-01`), `name: string` (`Studio Wireless Headphones`), `sku?: string` (`7004101`), `category?: string` (`audio`), `imageKey?: string` (`headphones`), `quantity: number` (`2`), `unitPrice: number` (`129.99`), `canceledQuantity?: number` (`0`), `eligibility?: object`, `protectionOffer?: object`.

- `eligibility` has optional boolean `returnable`, `mailReturnable`, and `priceMatchable`, plus optional `returnBy`, `priceMatchBy`, and `addProtectionBy` as UTC ISO date-time strings representing inclusive cutoffs. An explicit `false` or elapsed applicable cutoff blocks the action. When omitted, a completed line with units available permits store returns and price match. Mail requires an explicit `mailReturnable: true`. Protection requires a usable `protectionOffer`.
- `protectionOffer` includes `name: string` (`2-Year Geek Squad Protection`), `termMonths: number` (`24`), `price: number` (`29.99`), and `coverage: string[]` (e.g. `['Hardware failures', 'Power surge damage']`).
- **OrderEvent** · `id`, `orderId`, `actorId`, `createdAt`, `type`, `status: 'confirmed'`. Type `pickup_contact_changed` adds optional `previousContact` and required `pickupContact`. Type `items_canceled` adds `reason: string`, `lines: [{ orderItemId, quantity, unitPrice, refundEstimate }]`, and `refundEstimate: number`. A partial cancellation preserves the order's fulfillment status. When cumulative canceled quantities cover all lines, set `status: 'canceled'`. Keep original receipt amounts available for audit. Set the same timestamp on the event and `orders[].updatedAt`.

## Price match

**PriceMatchRequest** · `id: string` (`pm-1001`), `orderId`, `orderItemId`, `actorId`, `createdAt`, `status: 'submitted' | 'approved' | 'denied'`, `offerChannel: 'online' | 'app' | 'store'`, `offerUrl?: string`, `originalUnitPrice: number` (`129.99`), `offerUnitPrice: number` (`109.99`), `quantity: number` (`2`), and `requestedAmount: number` (`40.00`). The amount equals the pre-tax unit difference times quantity. Submitted and approved requests reserve the matched quantity for that line. Use `denied` for historical fixtures and allow its units to be requested again. Treat the evidence URL as a text value throughout the app.

## Protection plans and service

- **ProtectionPlan** · `id: string` (`plan-1001`), `planNumber: string` (`GSP-41001`), `orderId`, `orderItemId`, `actorId`, `createdAt`, `name: string`, `status: 'active' | 'expired' | 'canceled'`, `coverageStartAt`, `coverageEndAt`, `coverage: string[]`, `termMonths: number`, `price: number`, `quantity: 1`, `canceledAt?: timestamp`. Coverage for a newly added plan starts at the later of the action timestamp and item receipt if supplied. Use UTC calendar months with month-end clamping to calculate coverage end. A plan covers one unit of its linked line. Permit one active plan per line. An active record whose coverage has ended displays as expired at render time. Read the injected status when coverage dates are absent and preserve the record as provided. Require dependable coverage and price data on new plans.
- **ProtectionPlanEvent** · `id`, `planId`, `orderId`, `orderItemId`, `actorId`, `createdAt`, `type: 'added' | 'canceled'`, `status: 'confirmed'`, `quantity: 1`, `amount: number`, `reason?: string`. For `added`, store the plan's quoted price. For `canceled`, store `0` and the required cancellation reason. Plan cancellation here records a coverage change.
- **ProtectionClaim** · `id: string` (`claim-1001`), `planId`, `orderId`, `orderItemId`, `actorId`, `createdAt`, `status: 'submitted' | 'in_service' | 'closed'`, `issueType: string` (`Hardware failure`), `description: string`, `quantity: 1`. Offer issue options appropriate to the coverage list. Require a trimmed description and an active plan. One open claim per plan (`submitted` or `in_service`). Claim status changes in the seeded history give context for a newly submitted service request.

## Returns

**Return** · `id: string` (`ret-1001`), `orderId`, `actorId`, `createdAt`, `status: 'requested' | 'completed' | 'canceled'`, `method: 'store' | 'mail'`, `storeId?: string`, `mailReference?: string` (`RMA-RET-1001`), `lines: ReturnLine[]`, `refundEstimate: number`, `canceledAt?: timestamp`, and `canceledBy?: string`.

**ReturnLine** · `orderItemId: string`, `quantity: number`, `reason: string` (`Changed mind`, `Ordered the wrong item`, or `Defective`), `unitPrice: number`, `refundEstimate: number`. Estimate is the original paid unit price times quantity before tax. Display as an estimate. Aggregate the line estimates in the return. Use a selected existing store for Store, or a locally derived reference for Mail. If any chosen line is store-only, offer Store for the combined request. Only `requested` records can be canceled. Keep the original item lines and method as history after cancellation.

## Shared validation

- Completed purchase means `delivered` or `picked_up`. Validate the order and line relationship, amount fields, quantities, status, and action-specific eligibility at confirmation. Status filters and search use display labels and stable ids.
- Return capacity is ordered units minus canceled units and quantities in `requested` or `completed` returns. Price match capacity also subtracts quantities in `submitted` and `approved` matches. Clamp capacities at zero. Treat missing prior quantities as zero without mutating historical records. Add protection only when at least one completed, retained unit is available and the line has a valid offer.
- Record the same `new Date().toISOString()` value across a confirmed action and all records it changes. Review screens present pending values in UI state. Append or update related persisted records in one store action.

## Seed fixtures

Use deterministic values and fixed ids, with dates across different months and years. Use a small deterministic catalog of fictional products across audio, computing, wearables, displays, and accessories. Original artwork is shared by category. Keep historical business records consistent with linked orders and lines.

| Collection | Target | Required spread |
| --- | --- | --- |
| `orders` | 42 orders, 1–4 lines each | Every order status, both fulfillment types, repeated products, multi-unit lines, a historical year, and recent order dates. Use ids `ord-1001` through `ord-1042`. |
| `stores` | 6 | Distinct fictional local locations for store selection. |
| `orderEvents` | 24 | Both types, with historical snapshots consistent with linked orders. |
| `priceMatchRequests` | 24 | Submitted, approved, and denied requests with varied amounts. |
| `protectionPlans` | 26 | Active, expired, and canceled across product categories. |
| `protectionPlanEvents` | 28+ | At least one added event per seeded plan and a cancellation event per canceled plan. |
| `protectionClaims` | 24 | Submitted, in service, and closed, spanning plans and months. |
| `returns` | 26 | Store and mail, all statuses, partial and multi-line returns, and a store-only product on a completed order. |

Reserve independent fixtures for the workflows. `BBY01-800001` has a delivered, unclaimed two-unit price-match line. `BBY01-800002` is a ready pickup with contact. `BBY01-800003` has a completed unprotected line and a standard plan offer. `BBY01-800004` has a three-unit delivered line with a completed one-unit return and both return methods available. `BBY01-800005` has a processing two-unit line for cancellation. `GSP-41001` is an active plan with a closed claim and clear capacity for a new request. Give primary action fixtures explicit capability flags where available and omit optional cutoffs on these fixtures so they can exercise the submitted branches on different Harbor clocks. Include dated eligible and expired examples on other fixtures for deadline handling. Keep each planned happy-path fixture clear of unrelated reservations.
