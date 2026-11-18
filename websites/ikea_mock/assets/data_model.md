# IKEA account data model

All state is JSON. IDs and display references are strings. Money uses numeric USD amounts rounded to two decimal places. Compute in integer cents and convert to decimal USD for persisted values and display. Quantities are positive integers unless a before/after count can be zero. Timestamps use ISO strings. New actions use `new Date().toISOString()`; seeded timestamps and IDs are fixed.

## Top-level state

| Key | Type and example |
| --- | --- |
| `profile` | Object. `{id:"acct-avery", name:"Avery Morgan", email:"avery.morgan@example.com", address:{line1:"18 Alder Lane", city:"Brooklyn", region:"NY", postalCode:"11215", country:"US"}}`. Address may also contain `line2`. Use the profile ID as actor on user writes. |
| `products` | Product array. `{id:"prod-001", articleNumber:"700.10.001", name:"Linden", description:"Open oak shelving", category:"Storage", variant:"Light oak", unitPrice:89.00, stock:18, assemblyUnitPrice:52.00, parcelEligible:false, imageKey:"shelving"}`. Missing `assemblyUnitPrice` means assembly is unavailable. `stock`, `variant`, `description` and `imageKey` can be omitted. |
| `cart` | Object. `{id:"cart-avery", updatedAt:"2026-11-18T12:00:00.000Z", lines:[CartLine]}`. |
| `cartEvents` | CartEvent array. Seed as empty. |
| `orders` | Order array. |
| `bookings` | Booking array. |
| `returns` | ReturnRequest array. |

### CartLine

Example `{id:"cart-line-001", productId:"prod-001", quantity:2, unitPrice:89, lineAmount:178, createdAt:"2026-11-18T12:00:00.000Z", updatedAt:"2026-11-18T12:00:00.000Z", actor:"acct-avery"}`. One active line per product. Store the unit price at the time of adding the line, so quantity changes preserve the shown price. A product removed from a custom catalog may still be removed from the cart.

### CartEvent

Base fields `id`, `cartId`, `actor`, `createdAt`, `status:"applied"` and `type` of `add`, `set_quantity`, `remove` or `checkout`. A line edit also includes `lineId`, `productId`, `quantityBefore`, `quantityAfter`, `unitPrice` and `lineAmount` after the edit. For a remove event, `quantityAfter` and `lineAmount` are zero. Checkout instead includes `orderId`, `subtotal` and `lines[]` with `lineId`, `productId`, `quantity`, `unitPrice` and `lineAmount` consumed from each cart line.

### Order

Base fields `id` (example `ord-2026-036`), `reference` (`7610041036`), `actor`, `createdAt`, `status` (`preparing`, `on_the_way`, `delivered`, `collected` or `cancelled`), `fulfillment` (`delivery` or `store`), `currency:"USD"`, `lines[]` and `totals`. Include an `address` snapshot for delivery and `fulfilledAt` for delivered or collected orders when available.

- Order line fields are `id`, `productId`, `articleNumber`, `name`, optional `variant`, `quantity`, `unitPrice`, `lineAmount`, optional `assemblyUnitPrice`, `parcelEligible`, `returnable` and optional `returnBy` (YYYY-MM-DD). These are order snapshots. A later product edit or a missing catalog item must leave the purchase readable.
- Example `totals` object `{subtotal:178, delivery:49, assembly:52, tax:14.24, total:293.24}`. For synthetic checkout, use a fixed delivery fee of $49 and tax equal to 8% of merchandise subtotal, rounded to cents. Assembly sums the selected item rates times quantities. Later service bookings carry their own amount.

### Booking

Base fields `id` (example `svc-2026-028`), `reference` (`SV-10028`), `type` (`delivery` or `assembly`), `status` (`scheduled`, `completed` or `cancelled`), `orderId`, `actor`, `createdAt`, `updatedAt`, `address`, `amount`, `currency:"USD"`, `slot`, `items[]` and `history[]`. Assembly includes `deliveryBookingId` when there is a related delivery and `consentAcceptedAt` when the customer accepts terms.

- Slot example `{id:"delivery-2026-11-25-am", startsAt:"2026-11-25T09:00:00-05:00", endsAt:"2026-11-25T12:00:00-05:00", timeZone:"America/New_York"}`. Use ISO date-times with offsets or UTC and show the appointment in its service timezone. Generate draft slot choices from the current date in the service timezone. Offer the next seven days from tomorrow with windows at 9 am–noon and 1–4 pm. Derive availability from the current world and booking constraints. Bookings for different orders may share a window. Treat five-digit synthetic US ZIP codes from 00501 through 99950 as serviceable. Book assembly at that address only if at least one eligible unit remains.
- Item example `{orderLineId:"ord-2026-036-line-01", productId:"prod-001", quantity:1, unitPrice:52, lineAmount:52}` for assembly. Delivery items include the IDs and quantity only. Its single fee is on the booking.
- History entry fields are `id`, `type` (`scheduled`, `rescheduled`, `cancelled`), `actor`, `createdAt` and `statusAfter`. For rescheduling, add `slotBefore` and `slotAfter`. For cancellation, add `statusBefore`.
- Manage only scheduled future bookings. After delivery, an assembly window must start after the stored delivery window or `fulfilledAt` if only the fulfillment time is known. For pickups with missing timestamps, a future assembly slot on a collected order is acceptable.

### ReturnRequest

Base fields `id` (example `ret-2026-024`), `reference` (`RT-10024`), `orderId`, `actor`, `createdAt`, `updatedAt`, `status` (`requested`, `received`, `refunded`, `cancelled` or `declined`), `method` (`in_store` or `parcel`), `currency:"USD"`, `items[]`, `merchandiseAmount`, `feeAmount` and `refundAmount`. For new requests, the amounts represent an estimate.

- Item example `{orderLineId:"ord-2026-018-line-01", productId:"prod-012", quantity:1, reason:"changed_mind", condition:"unopened", unitPrice:29.99, refundAmount:29.99}`. Use stable reason keys such as `changed_mind`, `wrong_item`, `damaged_on_arrival` and `size_or_fit`. Conditions are `unopened` and `opened`.
- Check that the order is delivered or collected and that the line permits returns. If `returnBy` is set, compare it to the current date. With a valid `fulfilledAt`, apply the synthetic 365-day unopened and 180-day opened windows as well. If dates are missing, use the stored `returnable` flag. Remaining quantity is purchased quantity minus the sum in requested, received and refunded records for the same order line. Recheck the cart or order and associated records when confirming any mutation.
- Offer in-store for eligible requests and parcel when every selected line has parcel eligibility. Use a synthetic $5 parcel fee per request with a customer-choice reason, capped at the merchandise amount. In-store and parcel requests consisting only of `wrong_item` or `damaged_on_arrival` have no fee. Subtract the fee from merchandise to get the net estimate.

## Seed shape and coverage

Return `{profile, products, cart, cartEvents: [], orders, bookings, returns}` from `createInitialData()`. Use IDs such as `prod-001` and `ord-2026-001`, and fixed counters for seed references. Runtime IDs must be unique against injected and seed IDs. Generate them when committing a user action.

- **48 products** across storage, seating, lighting, textiles and home office. Include parcelable home items, assembly-eligible furniture, multiple prices and out-of-stock items.
- **Three cart lines** with different products and a quantity above one on at least one line. Include an assembly-eligible product and a non-assembly item.
- **36 orders** with realistic differences in line count, date, channel and status. Include a recent delivered order with two eligible lines, one of quantity at least three and with at least one unit still available after a prior partial return. Include an eligible existing order with assembly capacity and a fixed delivered fixture without date-based eligibility fields for clocks outside the seed timeline.
- **28 bookings** across delivery and assembly with valid item and order links. Include completed and cancelled appointments, a future delivery in the seed timeline with no dependent assembly, and a scheduled delivery with a dependent assembly.
- **24 returns** across both methods and multiple states. Include partial returns, multi-line requests, a fully consumed quantity and a cancelled request that releases quantity. Keep quantities coherent across overlapping requests.
- With injected records, leave absent optional metadata absent. Derive display fallbacks and disable actions with an explanation when required source data for that action is unavailable. Render empty arrays as empty and keep the page usable when catalog products, related records or history are missing.
