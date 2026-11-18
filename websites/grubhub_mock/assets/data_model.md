# Grubhub account state model

Each shape below is plain JSON. Fields marked `?` are optional. IDs are strings, timestamps are UTC ISO 8601 strings, and amounts are USD numbers rounded to two decimal places. Calculate using integer cents. New user actions take `actorId` from `account.id` and sample `new Date().toISOString()` once per transaction for `createdAt`, `updatedAt` or its event timestamp. Generate new IDs only on submission or the corresponding add action. Use fixed seeded IDs such as `order-001`, `schedule-001`, and `refund-001`.

## Top-level entities

`createInitialData()` returns `{ account, restaurants, menuItems, cart, orders, scheduledDeliveries, refunds }`. Arrays may be empty, and an injected array replaces its default. Checkout timing, selected day, search, filter and open dialogs are view state. Order records contain receipt snapshots so a past receipt remains legible if catalog or account records are replaced.

| Key | Type | Purpose |
| --- | --- | --- |
| `account` | `Account` | Preselected diner, delivery addresses and masked tender choices. |
| `restaurants` | `Restaurant[]` | Searchable synthetic catalog. |
| `menuItems` | `MenuItem[]` | Menu and current price grouped by `restaurantId`. |
| `cart` | `Cart` | One restaurant's bag and optional original order. |
| `orders` | `Order[]` | Checkout confirmations, order history and receipt snapshots. |
| `scheduledDeliveries` | `ScheduledDelivery[]` | Booked windows and their history, one per scheduled order. |
| `refunds` | `Refund[]` | Diner requests and seeded outcomes, linked to order line IDs. |

### Account and catalog

| Shape | Fields and types | Example values |
| --- | --- | --- |
| `Account` | `id`, `name`, `email` strings. `addresses: Address[]`, `paymentMethods: Payment[]`. `defaultAddressId?`, `defaultPaymentId?` strings. | `diner-001`, Maya Torres, `maya.torres@example.test`, `address-home`, `payment-visa`. |
| `Address` | `id`, `label`, `street`, `city`, `state`, `postalCode` strings. `unit?`, `instructions?` strings. | `address-home`, Home, 18 Sample Lane, Brooklyn, NY, 11215, Apt 4B, Leave at apartment door. |
| `Payment` | `id`, `brand`, `last4` strings. | `payment-visa`, Visa, `4242`. |
| `Restaurant` | `id`, `name`, `cuisine`, `neighborhood`, `timeZone` strings. `tile?` (`rice`, `noodles`, `pizza`, `greens`, `tacos`, `sandwich`). `deliveryFee`, `serviceFee`, `taxRate` numbers. `deliveryHours: Hours[]`. | `restaurant-001`, Juniper Rice Kitchen, Korean, Park Slope, `America/New_York`, rice, 2.49, 1.76, 0.08875. |
| `Hours` | `days: number[]` (`0` Sunday through `6` Saturday), `opensAt`, `closesAt` strings in `HH:mm`. | `[1,2,3,4,5,6]`, `11:30`, `21:00`. Split overnight ranges by day. |
| `MenuItem` | `id`, `restaurantId`, `name`, `category` strings. `description?` string. `unitPrice: number`, `available: boolean`. | `menu-001`, `restaurant-001`, Charred Chicken Rice Bowl, Rice bowls, pickled cucumber and scallion, 12.50, `true`. |

### Bag and orders

| Shape | Fields and types | Example values |
| --- | --- | --- |
| `Cart` | `restaurantId: string or null`, `sourceOrderId: string or null`, `items: CartLine[]`, `updatedAt: string or null`, `updatedBy: string or null`. | `restaurant-001`, `order-001`, two bowls and one side, `2026-11-18T15:00:00.000Z`, `diner-001`. Initial empty bag uses null for all four nullable fields and `[]` for items. A clear after checkout sets current update metadata. |
| `CartLine` | `menuItemId`, `name` strings. `quantity: positive integer`, `unitPrice: number`. | `menu-001`, Charred Chicken Rice Bowl, 2, 12.50. |
| `Order` | `id`, `restaurantId`, `actorId`, `createdAt`, `currency` strings. `restaurantName?`, `sourceOrderId?`, `scheduledDeliveryId?`, `deliveredAt?`, `cancelledAt?` strings. `fulfillment: 'delivery'`. `status: 'placed' or 'scheduled' or 'delivered' or 'cancelled'`. `timing: 'asap' or 'scheduled'`. `items: OrderLine[]`, `totals: Totals`, `address: Address`, `payment: Payment`. | `order-001`, `restaurant-001`, `diner-001`, `2026-11-16T23:15:00.000Z`, `USD`, Juniper Rice Kitchen, `status: 'delivered'`, `timing: 'asap'`. |
| `OrderLine` | `id`, `name` strings. `menuItemId?` string. `quantity: positive integer`, `unitPrice`, `subtotal`, `chargedAmount` numbers. `chargedAmount` allocates that line's share of `totals.total`. | `order-001-line-01`, Charred Chicken Rice Bowl, `menu-001`, 2, 12.50, 25.00, 33.87. |
| `Totals` | `subtotal`, `deliveryFee`, `serviceFee`, `tax`, `tip`, `total` numbers. | 31.00, 2.49, 1.76, 2.75, 4.00, 42.00. |

Set the subtotal to the sum of line subtotals and compute tax on that subtotal. Display fees, tax and any tip before confirmation. For the first version, the checkout tip defaults to zero and historical fixtures may include tips. Capture the confirmed totals, address and masked payment in the order. Allocate the final charged total to the order lines in proportion to each subtotal by rounding down to cents and assigning residual cents in descending fractional-remainder order, using line order for ties. A zero-cost order has no refundable amount.

Reorder by resolving the old `menuItemId` against the active menu and using current menu names and prices. Keep the original quantities, identify unavailable lines, and offer to continue with the available subset. Keep the previous bag if the diner backs out or if all previous items are unavailable. Use the same checkout when buying from the catalog or reordering. Require a nonempty bag with a valid restaurant, available items, a saved address and a saved payment method at confirmation.

### Scheduled deliveries and events

| Shape | Fields and types | Example values |
| --- | --- | --- |
| `ScheduledDelivery` | `id`, `orderId`, `timeZone`, `windowStartAt`, `windowEndAt`, `actorId`, `createdAt` strings. `status: 'scheduled' or 'fulfilled' or 'cancelled'`. `confirmedAt?`, `updatedAt?`, `updatedBy?`, `cancelledAt?` strings. `events: ScheduleEvent[]`. | `schedule-001`, `order-037`, `America/New_York`, `2026-11-20T17:30:00.000Z`, `2026-11-20T18:00:00.000Z`, `diner-001`, `2026-11-18T15:00:00.000Z`, `scheduled`. |
| `ScheduleEvent` | `id`, `actorId`, `createdAt` strings. `type: 'created' or 'rescheduled' or 'cancelled'`. `from?`, `to?` are `Window` records. Creation stores `to`, reschedule stores both, cancellation stores `from`. | `schedule-event-001`, `diner-001`, `2026-11-18T15:00:00.000Z`, `created`, `to: { windowStartAt, windowEndAt }`. |
| `Window` | `windowStartAt`, `windowEndAt` ISO timestamp strings. | `2026-11-20T17:30:00.000Z` to `2026-11-20T18:00:00.000Z`. |

#### Schedule rules

- Treat the restaurant's time zone as the time zone of the schedule. Show dates and 30-minute windows wholly inside its delivery hours, on local calendar days from today through four days ahead inclusive. Require the start to be at least two hours ahead. Use the browser's current `new Date()` and derive presentation in the restaurant time zone. Start/end stored in UTC must round-trip to the same displayed local window across reloads and daylight saving changes.
- An upcoming delivery has `status: 'scheduled'`, a valid window and a future start. Only a linked order with `status: 'scheduled'` can be changed. Reschedule when the current window starts at least four hours from now and no `confirmedAt` is present. Cancel before the start when no `confirmedAt` is present. Reject selecting the currently saved window on reschedule. A past or incomplete schedule remains viewable and read-only. State changes only by explicit action, even when a window passes.
- Keep the original order creation timestamp and totals on changes. The receipt reads the current window by following `scheduledDeliveryId` or looking up the delivery by `orderId` if the forward reference is absent. Display a fallback state when a linked order or schedule is absent. A known order remains viewable even if its restaurant is missing.
- New schedule checkout starts unconfirmed. No background job advances confirmation or fulfillment. The seeded `confirmedAt`, `fulfilled` and `cancelled` values illustrate those states.

### Refunds and refund lines

| Shape | Fields and types | Example values |
| --- | --- | --- |
| `Refund` | `id`, `orderId`, `actorId`, `createdAt`, `currency` strings. `status: 'requested' or 'approved' or 'refunded' or 'denied'`. `scope: 'items' or 'full_order'`. `reason: 'missing_item' or 'wrong_item' or 'food_quality' or 'delivery_issue' or 'other'`. `notes?`, `resolvedAt?` strings. `lineItems: RefundLine[]`, `amount: number`, `payment?: Payment` receipt snapshot. | `refund-001`, `order-001`, `diner-001`, `2026-11-17T15:00:00.000Z`, `USD`, `requested`, `items`, `missing_item`, `16.94`, Visa ending `4242`. |
| `RefundLine` | `orderItemId` string, `quantity: positive integer`, `amount: number`. | `order-001-line-01`, 1, 16.94. |

#### Refund rules

- A delivered order with refundable units and a positive refundable amount is eligible. Refund requests do not alter its delivery status. The UI labels each reason for diners, such as “Missing item” for `missing_item`. Require a reason and a valid positive quantity for at least one line, or choose all remaining lines for a full-order request. Cap optional notes at 500 characters.
- Use the stored `chargedAmount` or derive allocations from receipt totals if an injected line omits it. Divide that line's charged cents evenly across its units, assigning any residual cents to the first units. `requested`, `approved`, and `refunded` requests consume quantity and reserve amount. Count previous reserved units as consumed from the beginning of each line. A `denied` case consumes neither. An item refund requests the sum for the units selected. A full-order request uses all remaining units and amounts. For the example $42.00 order, the two bowl units allocate $16.94 and $16.93, and the side allocates $8.13. After the first bowl is reserved, the remaining full-order request is $25.06.
- Validate quantities and amounts against the latest state at submit. The result must fit both the line allocations and the order's remaining paid amount. If a supplied receipt lacks enough pricing or line identity information for a reliable calculation, show its details with an unavailable refund action. Guard the confirmation once per form submission, disable it while submitting, then navigate to the case. The case keeps the tender snapshot when available, or displays the order's masked tender if the snapshot is absent. The diner can submit and view requests. Approval and settlement are seeded states.

## Seed matrix

| Entity | Count | Coverage |
| --- | --- | --- |
| Account | 1 | Maya Torres with Home and Work addresses and two masked cards. |
| Restaurants | 24 | Fictional Brooklyn venues with multiple matches for each cuisine family and a mix of delivery hours, including one closed weekday. |
| Menu items | 120 | Five per restaurant across mains and sides, several choices with similar keywords and several unavailable items to demonstrate reorder fallback. |
| Orders | 60 | 36 independently linked to the catalog (29 delivered, 5 placed, 2 cancelled) plus 24 linked to schedules. Include at least three delivered orders with all quantities still refundable and one delivered order with a partially refunded two-unit line. |
| Scheduled deliveries | 24 | Four upcoming, including an editable unconfirmed window and a confirmed window, plus 16 fulfilled and four cancelled. The linked order statuses are `scheduled`, `delivered` and `cancelled`, respectively. Include one seeded reschedule event on a historical delivery. |
| Refunds | 24 | Eight requested, five approved, eight refunded and three denied. Mix item and full-order scopes, linked to delivered receipts with quantities and amounts that satisfy the refund rules. |

Make IDs, names, quantities, prices and seed offsets deterministic. Resolve historical and upcoming seed timestamps from one clock sample in `createInitialData(now = new Date())`, using the Eastern calendar for slot fixtures so the first boot is useful under a frozen Harbor clock. A seeded editable schedule should start one or two days ahead, well outside its edit cutoff. Stored and injected timestamps remain absolute after seed creation. A reload uses persisted state.

## Observable state changes

| User action | Persisted changes in `/go` |
| --- | --- |
| Add a menu item, change quantity, remove a line or confirm replacing another restaurant's bag | Set `cart.restaurantId`, mutate `cart.items[]` and set `cart.updatedAt` and `cart.updatedBy`. Set `cart.sourceOrderId` to `null` when beginning an unrelated bag. Emptying the bag resets its `restaurantId` and `sourceOrderId` to `null`. |
| Confirm reorder | Set `cart.restaurantId`, `cart.sourceOrderId`, `cart.items[]`, `cart.updatedAt`, `cart.updatedBy`. |
| Place an ASAP order | Append an `orders[]` record with the selected receipt snapshots, item amounts, totals, `actorId`, `createdAt`, `status: 'placed'` and `timing: 'asap'`. Clear `cart.items`, `cart.restaurantId` and `cart.sourceOrderId` and set the cart update metadata as one commit. |
| Place a scheduled order | Append `orders[]` with `status: 'scheduled'`, `timing: 'scheduled'` and `scheduledDeliveryId`. Append the linked `scheduledDeliveries[]` record and its first `created` event. Clear and stamp `cart` in the same commit. |
| Confirm reschedule | Set `scheduledDeliveries[].windowStartAt`, `.windowEndAt`, `.updatedAt`, `.updatedBy`. Append a `rescheduled` event with the previous and confirmed windows. |
| Confirm scheduled cancellation | Set `scheduledDeliveries[].status` to `cancelled` and write `.cancelledAt`, `.updatedAt`, `.updatedBy`. Append a `cancelled` event with the cancelled window. Set the matching `orders[].status` to `cancelled` and write `.cancelledAt` in the same commit. |
| Submit a refund request | Append `refunds[]` with its `orderId`, item references and quantities, amounts, status, reason, masked tender, actor and timestamp. |

Keep this map aligned with `SCHEMA.md` after implementation. Read-only UI and invalid or dismissed actions produce no business-state change.
