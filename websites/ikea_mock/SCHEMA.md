# ikea_mock Schema

**Base URL** `http://localhost:5314/`  
**Go Endpoint** `GET /go?sid=<sid>` → `{initial_state, current_state, state_diff}`  
**Read stored state** `GET /state?sid=<sid>` → `{stored_state, has_custom_state, sid}`  
**Inject** `POST /post?sid=<sid>` with `{"action":"set","state":{...}}`  
**Reset** `POST /post?sid=<sid>` with `{"action":"reset"}` restores current state from the saved baseline, or from defaults if there is no baseline.

Use a fresh SID and browser context to load an injection. The first page load merges objects with defaults, replaces arrays and sends a baseline `set`. An existing initial state stays intact. If the injection was partial, capture `current_state` after boot for comparison with the next action. Accepted mutations send one full-state `set_current`. The diff groups changes by top-level key as `{modified: value}` or `{added: value}`.

## State Schema

| Key | Type | Description |
| --- | --- | --- |
| `profile` | Object | `{ id, name, email, address }`. The profile ID identifies the actor on committed changes. |
| `products` | Array | `{ id, articleNumber, name, description?, category?, variant?, unitPrice, stock?, assemblyUnitPrice?, parcelEligible?, imageKey? }`. |
| `cart` | Object | `{ id, updatedAt, lines: CartLine[] }`. |
| `cartEvents` | Array | Applied cart operations, including checkout. See CartEvent below. |
| `orders` | Array | Purchase snapshots. See Order below. |
| `bookings` | Array | Delivery and assembly appointments. See Booking below. |
| `returns` | Array | Return requests and history. See ReturnRequest below. |

IDs and references are strings. The currency is USD. Prices are numbers with cent precision. Quantities are integers. Timestamps are ISO 8601 strings. A question mark denotes a field that can be omitted.

`Address` uses `{ line1, line2?, city, region, postalCode, country }`. A new order and its bookings store snapshots of the service address.

### Default IDs

| Entity | IDs |
| --- | --- |
| Profile | `acct-avery` |
| Cart | `cart-avery` |
| Cart lines | `cart-line-001` through `cart-line-003` |
| Products | `prod-001` through `prod-048` |
| Orders | `ord-2026-001` through `ord-2026-036` |
| Bookings | `svc-2026-001` through `svc-2026-028` |
| Returns | `ret-2026-001` through `ret-2026-024` |
| Cart events | Empty at seed |

`ord-2026-036` has multiple returnable lines and a prior partial return as of the seed date. `ord-2026-032` supports return testing without a fulfillment timestamp. `svc-2026-027` is the scheduled delivery linked to assembly `svc-2026-028`.

## CartLine and CartEvent

- CartLine uses `{ id, productId, quantity, unitPrice, lineAmount, createdAt, updatedAt, actor }`. The line retains its stored unit price through quantity edits.
- CartEvent uses `{ id, cartId, actor, createdAt, status, type }`. Status is `applied`. Types are `add`, `set_quantity`, `remove`, and `checkout`.
- A line event adds `{ lineId, productId, quantityBefore, quantityAfter, unitPrice, lineAmount }`. The removal event records zero for the after quantity and amount. Its unit price can be null when an injected line lacks pricing.
- A checkout event adds `{ orderId, subtotal, lines }`. Each consumed line is `{ lineId, productId, quantity, unitPrice, lineAmount }`.

## Order

- Order uses `{ id, reference, actor, createdAt, status, fulfillment, currency, address?, fulfilledAt?, lines, totals }`.
- Statuses are `preparing`, `on_the_way`, `delivered`, `collected`, and `cancelled`. Fulfillment is `delivery` or `store`. The checkout flow creates `preparing` records.
- Order lines use `{ id, productId, articleNumber?, name?, variant?, quantity, unitPrice, lineAmount, assemblyUnitPrice?, parcelEligible, returnable, returnBy? }`. `returnBy` is a date in YYYY-MM-DD.
- Totals use `{ subtotal, delivery, assembly, tax, total }`. Synthetic checkout charges $49 for delivery and 8% tax on merchandise.

## Booking

- Booking uses `{ id, reference, orderId, type, status, actor, createdAt, updatedAt, address, amount, currency, slot, items, history, deliveryBookingId?, consentAcceptedAt? }`.
- Types are `delivery` and `assembly`. Statuses are `scheduled`, `completed`, and `cancelled`. A new assembly appointment records consent and links to the delivery when one is associated with the order.
- Slots use `{ id, startsAt, endsAt, timeZone }`. New windows use the America/New_York service timezone.
- Delivery items use `{ orderLineId, productId, quantity }`. Assembly items add `unitPrice` and `lineAmount` at the service rate.
- Every history entry uses `{ id, type, actor, createdAt, statusAfter }`. Types are `scheduled`, `rescheduled`, and `cancelled`. Rescheduling adds `slotBefore` and `slotAfter`. Cancellation adds `statusBefore`.

## ReturnRequest

- ReturnRequest uses `{ id, reference, orderId, actor, createdAt, updatedAt, status, method, currency, items, merchandiseAmount, feeAmount, refundAmount }`.
- Statuses are `requested`, `received`, `refunded`, `cancelled`, and `declined`. New requests begin as `requested`. Methods are `in_store` and `parcel`.
- Items use `{ orderLineId, productId, quantity, reason, condition, unitPrice, refundAmount }`. Reasons are `changed_mind`, `wrong_item`, `damaged_on_arrival`, and `size_or_fit`. Conditions are `unopened` and `opened`.
- The item refund uses the purchase price. The request refund subtracts the fee from the merchandise amount. A parcel request with a customer-choice reason has a $5 fee capped at the merchandise amount.
- Remaining quantity is derived from the order line and linked requests with status `requested`, `received`, or `refunded`.

## Minimal Inject Example

The following state renders an account with empty collections while retaining the default profile and cart metadata.

```json
{
  "products": [],
  "cart": {"lines": []},
  "cartEvents": [],
  "orders": [],
  "bookings": [],
  "returns": []
}
```

## Observable State Changes (for LLM evaluation)

| User action | Persisted change |
| --- | --- |
| Add product to cart | Upsert one `cart.lines[]` record by `productId`. Write line `quantity`, `lineAmount`, `actor` and `updatedAt`, plus the ID, price and `createdAt` for a new line. Update `cart.updatedAt`. Append `cartEvents[]` with type `add`, linked IDs and before/after quantities and pricing. |
| Update quantity | Update the line's `quantity`, `lineAmount`, `actor`, and `updatedAt`. Update `cart.updatedAt`. Append a `set_quantity` cart event. |
| Remove cart item | Remove the line from `cart.lines[]`, update `cart.updatedAt` and append a `remove` cart event containing the removed IDs and original quantity. |
| Confirm checkout | Append one order and a linked scheduled delivery booking. If selected, append a linked scheduled assembly booking with consent and the selected order-line quantities. Clear `cart.lines[]`, update `cart.updatedAt` and append a `checkout` cart event with the order ID and consumed lines. All changes are sent together in one save. |
| Book assembly for an existing order | Append one scheduled `bookings[]` record with linked order/items, address, slot, amount and consent. |
| Confirm reschedule | Update the booking's `slot` and `updatedAt`. Append a `rescheduled` entry in `history[]` with old and new slots. |
| Confirm cancellation | Set the booking's `status` to `cancelled`, update `updatedAt` and append a `cancelled` history entry. |
| Confirm return | Append one `returns[]` record with the selected lines, estimated amounts and status `requested`. Derive the remaining returnable quantities from the new request and original purchase. |
| Search, navigate, edit drafts, dismiss a dialog, submit an invalid or unchanged draft, or leave a tab idle | No business-state write. |
