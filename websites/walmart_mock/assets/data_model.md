# Walmart state model

Use `createInitialData()` in `src/data/seed.js`. Return one JSON-serializable object. The Harbor template merges injected objects recursively and replaces arrays. Preserve references by ID and allow sparse injected records to render. The types and values below describe the target app contract, with fictional examples.

## Root state

| Key | Type | Example or purpose |
|---|---|---|
| `profile` | Shopper | Maya Thompson, the active actor |
| `catalog` | Product[] | 72 sellable SKUs |
| `stores` | Store[] | Four pickup locations |
| `pickupSlots` | PickupSlot[] | 72 scheduled windows |
| `cart` | Cart | The active reusable cart and its mutation history |
| `pickupReservations` | PickupReservation[] | Cart holds and bookings with their lifecycle |
| `orders` | Order[] | Purchase history and new orders |
| `returns` | Return[] | Return history and newly submitted requests |
| `registries` | Registry[] | Owned and discoverable gift registries |

## Conventions

- IDs are string keys. Seed IDs are fixed, such as `order-001` and `slot-rogers-d01-0900`. Generate unique IDs for new records. Date/time fields are UTC ISO strings, with user actions timestamped by `new Date().toISOString()`. Registry `eventDate` is an ISO calendar date such as `2027-04-10`. Render pickup times in the store timezone.
- Mutable business records carry `actorId: string` for creation, `createdAt: string`, `updatedBy: string` and `updatedAt: string`. The active actor ID comes from `profile.id`. Use the metadata on CartLine, PickupReservation, Order, Registry and RegistryItem. Return requests and purchase/activity records use creation metadata.
- Store money as USD numbers with at most two decimal places. Compute in integer cents and format for display. Quantities and capacity are nonnegative integers. Checkout and order edits use the same totals calculator. Calculate tax per line from the seeded rate, sum line taxes, and add the group fee. Use order-line snapshot values for historical receipts and refunds.
- Use a $35 subtotal threshold for the app's pickup and shipping groups. Below that threshold, add a $6.99 minimum order fee. A scheduled pickup window can carry its own fee, stored as `PickupSlot.fee` and copied to the reservation. Show applicable fees before commitment and include their sum in `totals.fulfillmentFee`.
- Use typed events only on the entities that own a change. Events carry `id: string`, `type: string`, `actorId: string`, `createdAt: string` and the typed fields listed below. Append events and apply related record changes in a single user-driven store commit.

## Shopper and fulfillment catalog

| Entity | Fields and examples |
|---|---|
| Shopper | `id: string` (`user-maya`), `name: string` (Maya Thompson), `email: string` (`maya.thompson@example.test`), `preferredStoreId: string?` (`store-rogers`), `addresses: Address[]`, `paymentSummary: PaymentSummary?`. |
| Address | `id: string` (`address-home`), `recipient: string` (Maya Thompson), `line1: string` (214 Cedar Trace), `line2: string?` (Apt 3), `city: string` (Rogers), `region: string` (AR), `postalCode: string` (72756), `label: string?` (Home). Use fictional contact details. |
| PaymentSummary | `brand: string` (Visa), `last4: string` (2846). Use seeded data only. |
| Store | `id: string` (`store-rogers`), `name: string` (Rogers Supercenter), `address: Address`, `timezone: string` (`America/Chicago`), `pickupEnabled: boolean` (true). |
| Product | `id: string` (`sku-coffee-12oz`), `title: string` (Great Value Medium Roast Ground Coffee), `brand: string` (Great Value), `department: string` (Grocery), `description: string?`, `variant: string?` (12 oz), `imagePath: string?` (`/products/coffee-12oz.webp`), `galleryPaths: string[]?`, `seller: string` (Walmart), `price: number` (5.48), `previousPrice: number?` (6.28), `taxRate: number` (0.025), `maxOrderQty: integer` (6), `shippingStock: integer` (12), `pickupStockByStore: Record<storeId, integer>` (`{"store-rogers": 9}`), `registryEligible: boolean` (false), `returnPolicy: ReturnPolicy?`. |
| ReturnPolicy | `windowDays: integer` (30, zero for ineligible), `methods: ReturnMethod[]` ([`store`, `mail`]), `resolutions: Resolution[]` ([`refund`, `replacement`]). |
| PickupSlot | `id: string` (`slot-rogers-d01-0900`), `storeId: string`, `startAt: string`, `endAt: string` (for example `2026-11-19T15:00:00.000Z` to `2026-11-19T16:00:00.000Z`), `capacity: integer` (6), `filled: integer` (2, bookings outside this shopper's records), `fee: number` (0), `enabled: boolean` (true). |
| ProductSnapshot | `title: string`, `variant: string?`, `seller: string?`, `imagePath: string?`. Keep a snapshot on OrderLine and RegistryItem. |

Treat missing stock as unavailable. Shopping stock is a seeded availability and quantity limit. Cart and order writes own the shopper's quantities. Browsing, SKU selection, filters, sorting and temporary form choices are URL or component state.

## Cart

- Cart fields are `id: string` (`cart-maya`), `ownerId: string`, `pickupReservationId: string|null`, `lines: CartLine[]` and `events: CartEvent[]`.
- CartLine adds `id: string` (`cart-line-001`), `productId: string`, `quantity: integer` (2), `fulfillmentMode: 'pickup'|'shipping'`, `status: 'active'|'saved'`, and mutation metadata. Render active totals using the current product price and selected slot fee. Retain saved items even if current stock is zero.
- CartEvent types are `added`, `quantity_changed`, `fulfillment_changed`, `saved`, `restored`, `removed`, `checkout` and `reordered`. Each has `changes: CartChange[]` and optional `orderId: string` for checkout or reorder.
- CartChange fields are `lineId: string`, `productId: string`, `unitPrice: number|null` (null when a removed catalog reference has no current price), `before: CartLineState|null` and `after: CartLineState|null`. A CartLineState contains `quantity`, `status` and `fulfillmentMode`. For example, removing a two-unit active line records `before.quantity: 2` and `after: null`.
- At most one active line per product and mode. Check per-mode stock and product limits before changing an active line. Retain the destination ID on merge and record both source and destination changes. Checkout consumes only the selected group. If a cart hold is still valid, a shipping checkout leaves it attached to the cart.

## Pickup reservations

- PickupReservation adds `id: string` (`reservation-001`), `cartId: string?`, `orderId: string?`, `storeId: string`, `slotId: string`, `status: 'held'|'booked'|'released'`, `fee: number` (0), `expiresAt: string?`, `releaseReason: 'changed'|'user_released'|'rescheduled'|'order_canceled'?` and mutation metadata. A hold has `cartId` and `expiresAt`. A booking has `orderId`. Checkout retains the original hold ID and timestamp when it books the hold.
- Scheduled availability is `capacity - filled - active matching holds and bookings`, clamped at zero. Match by store and slot IDs. Count holds whose expiry is in the future and bookings whose slot is still upcoming. During checkout, exclude the cart's own valid hold from that calculation before converting it to a booking. A slot must be enabled, in the future, and at a pickup-enabled store. Use a 60-minute cart hold capped at the window start. Display a stale hold as expired and reject its use until the user replaces or releases it.
- The pickup picker can take an `orderId` for rescheduling or a cart/checkout return target. Use validated internal routes for the target. An order reschedule keeps the same store and books a different available slot. Update the old reservation, new reservation and order together. Set the mock order's edit cutoff to three hours before its slot starts and show the recorded cutoff.

## Orders

| Record | Fields and examples |
|---|---|
| Order | `id: string` (`order-001`), `orderNumber: string` (2000138-41987516), `ownerId: string`, `status: 'placed'|'preparing'|'ready_for_pickup'|'shipped'|'delivered'|'picked_up'|'canceled'`, `fulfillmentMode: 'pickup'|'shipping'|'delivery'` (delivery appears in historical fixtures), `lines: OrderLine[]`, `totals: Totals`, `paymentSummary: PaymentSummary?`, `shippingAddress: Address?`, `storeId: string?`, `slotId: string?`, `pickupReservationId: string?`, `pickupPerson: PickupPerson?`, `editCutoffAt: string?`, `rescheduleCount: integer` (0), `fulfilledAt: string?`, `trackingNumber: string?`, `events: OrderEvent[]`, and mutation metadata. |
| OrderLine | `id: string`, `productId: string`, `product: ProductSnapshot`, `quantity: integer` (3), `unitPrice: number` (5.48), `taxRate: number` (0.025), `lineSubtotal: number` (16.44), `lineTax: number` (0.41), `returnPolicy: ReturnPolicy?`. |
| Totals | `subtotal: number` (16.44), `tax: number` (0.41), `fulfillmentFee: number` (0), `total: number` (16.85), `currency: 'USD'`. |
| PickupPerson | `name: string` (Jordan Thompson), `email: string` (`jordan.thompson@example.test`). |

OrderEvent types and payloads follow.

| Type | Payload beyond event metadata |
|---|---|
| `placed` | `status`, `totals`, optional `pickupReservationId` |
| `items_edited` | `lineChanges[]` with `orderLineId`, `productId`, `beforeQuantity`, `afterQuantity` and `unitPrice`, plus `beforeTotals` and `afterTotals` |
| `pickup_person_updated` | `beforePickupPerson` and `afterPickupPerson` |
| `canceled` | `previousStatus`, `status`, optional `pickupReservationId` |
| `rescheduled` | `previousSlotId`, `slotId`, `previousReservationId`, `pickupReservationId`, `beforeTotals`, `afterTotals` |

Create new orders with `placed` status. Allow item/recipient edits and rescheduling only for a placed pickup order before its cutoff, with one reschedule per order. Allow cancellation for placed orders, with cutoff enforcement for pickup. Preserve the existing line price when changing its quantity and snapshot current price and policy for new lines. Display later statuses from injected and seeded history. Use the original order ID to link reorder events. Add eligible original quantities up to current stock and limits, using the original mode where supported and shipping for historical delivery items when eligible. Offer clear skipped-item feedback.

## Returns

- Return fields are `id: string` (`return-001`), `returnNumber: string` (RMA-730138), `orderId: string`, `actorId: string`, `createdAt: string`, `status: 'submitted'|'completed'|'canceled'`, `method: ReturnMethod`, `instructionsCode: string` (RET-730138), `lines: ReturnLine[]`, `refundEstimate: number` (5.62) and `pickupAppointment: ReturnPickupAppointment?`. Derive readable instructions by method and show the code.
- ReturnMethod values are `store`, `mail`, `scheduled_pickup` and `fedex_dropoff`. Resolution values are `refund` and `replacement`. Per-order return history comes from `returns[].orderId`.
- ReturnPickupAppointment fields are `address: Address`, `startAt: string` and `endAt: string`. Offer upcoming two-hour windows from a fixed morning and afternoon schedule. Use the original delivery address snapshot. This option requires an address and applies only when all selected lines allow it.
- ReturnLine fields are `id: string`, `orderLineId: string`, `productId: string`, `quantity: integer` (1), `reason: string` (`damaged`), `resolution: Resolution`, `comment: string?`, `unitPrice: number` (5.48), `refundSubtotal: number` (5.48), `refundTax: number` (0.14), `refundAmount: number` (5.62). Use numeric zeros for replacement estimate fields. Offer reason options such as damaged, wrong item, changed mind and item does not match description.
- Determine eligibility on delivered and picked-up orders using `fulfilledAt` plus the order-line's snapshot return window. A zero or unknown window and a missing fulfillment date cannot establish eligibility. Subtract quantities for both refund and replacement lines of submitted or completed returns. For partial refunds, prorate line tax in cents and allocate remainder cents deterministically by unit position so cumulative refunds cannot exceed the original line total. The refund estimate is the sum of line refund amounts. User submission persists a request and its estimate.

## Registries

| Record | Fields and examples |
|---|---|
| Registry | `id: string` (`registry-maya-baby`), `ownerId: string`, `name: string` (Maya's Baby Registry), `registrantName: string` (Maya Thompson), `type: 'baby'|'wedding'|'classroom'`, `eventDate: string` (2027-04-10), `addressId: string?` (`address-home`, scoped to the owner), `visibility: 'public'|'private'`, `status: 'active'|'deleted'`, `items: RegistryItem[]`, `events: RegistryEvent[]`, and mutation metadata. |
| RegistryItem | `id: string` (`registry-item-001`), `productId: string`, `product: ProductSnapshot`, `status: 'active'|'removed'`, `quantityRequested: integer` (3), `quantityPurchased: integer` (1), `purchases: RegistryPurchase[]`, and mutation metadata. |
| RegistryPurchase | `id: string`, `actorId: string`, `createdAt: string`, `quantity: integer` (1), `giverName: string` (Jordan Thompson), `retailer: string` (Walmart), `reference: string?` (an order or receipt reference), `unitPrice: number?` (18.96). |

RegistryEvent types are `created`, `updated`, `deleted`, `item_added`, `item_updated`, `item_removed` and `item_purchased`. Use `changes[]` entries with `field`, `before` and `after` for changed record fields. Include `itemId` and `productId` for item events and `purchaseId` for a purchase. The parent registry keeps its item/purchase relationships after a soft deletion.

Only show Manage to the active registry owner. Include active public records in lookup, allow both visibilities on the direct sharing route, and omit address details there. Model one active item per registry/product. Add increases requested quantity on an existing active row. For a previously removed item, use a new row so the original record retains its history. Cap purchases at remaining requested quantity. Owner and gift-giver submissions both create RegistryPurchase records.

## Seed composition

```js
export function createInitialData() {
  const now = new Date()
  return {
    profile: seedShopper(),
    catalog: seedCatalog(),
    stores: seedStores(),
    pickupSlots: seedPickupSlots(now),
    cart: seedCart(now),
    pickupReservations: seedPickupReservations(now),
    orders: seedOrders(now),
    returns: seedReturns(now),
    registries: seedRegistries(now),
  }
}
```

Return fresh objects from the seed factory. Anchor seeded timestamps to calendar days relative to the task clock in the relevant timezone. Shift timestamps by day while keeping fixture IDs and relationships stable. Provide past windows for historical orders and upcoming windows for booking. Each fixture order's pickup slot and booking must agree with the real pointers in that order. Include an editable order with a valid future cutoff and a delivered order with both an eligible line and a prior partial return. Keep defaults compact so whole-state sync stays practical as users add records.
