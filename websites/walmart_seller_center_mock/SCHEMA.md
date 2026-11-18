# walmart_seller_center_mock Schema

**Base URL** `http://localhost:5462/`  
**Go Endpoint** `GET /go?sid=<sid>` returns `{initial_state, current_state, state_diff}`.  
**Inject** `POST /post?sid=<sid>` with `{"action":"set","state":{...}}`. Use a fresh SID for a new world.  
**Reset** `POST /post?sid=<sid>` with `{"action":"reset"}` restores the current server snapshot to its initial snapshot. A fresh browser context reads the restored snapshot.  
**Read** `GET /state?sid=<sid>` returns `{stored_state, has_custom_state, sid}`.

All IDs, timestamps, and text fields are strings. Timestamps are ISO 8601 UTC. Quantities and USD amounts are JSON numbers. Dollar calculations use integer cents. A question mark below marks an optional field. Array entries retain their stored identifiers across edits. `/go` exposes the initial and current snapshots and a diff grouped by changed top-level key.

## State Schema

| Key | Shape |
|---|---|
| `account` | `{ id, storeName, actorId, actorName, inventoryLocation, currency }` |
| `items[]` | `{ id, sku, name, brand, category, productId?, description?, imageKey?, price, availableQuantity, status, fulfillment, createdAt, updatedAt, updatedBy }` |
| `itemActions[]` | `{ id, itemId, sku, type, status, actorId, createdAt, before, after, location? }`. `before` and `after` are JSON objects keyed by the business fields changed. A creation has an empty `before`. `location` stores the seller location for inventory changes. |
| `orders[]` | `{ id, customerOrderId, customerName, shipTo?, fulfillment, status, total, lines, createdAt, shipByAt, updatedAt, updatedBy, acknowledgedAt?, shippedAt?, canceledAt? }`. `id` is the purchase order number. `shipTo` may contain `address1`, `city`, `state` and `postalCode`. |
| `orderActions[]` | `{ id, orderId, type, status, actorId, createdAt, lines, carrier?, trackingNumber?, reason? }`. Action line shape is `{ orderLineId, sku, quantity }`. Shipment writes carrier and tracking. Cancellation writes reason. |
| `returns[]` | `{ id, orderId, customerName, reason, status, refundStatus, refundableAmount, refundedAmount, carrier?, trackingNumber?, lines, createdAt, updatedAt, updatedBy, receivedAt?, refundedAt? }`. `refundableAmount` is the original eligible total, and `refundedAmount` is cumulative. |
| `returnActions[]` | `{ id, returnId, orderId, type, status, actorId, createdAt, lines }`. Receipt line shape is `{ returnLineId, orderLineId, sku, quantity }`. |
| `refunds[]` | `{ id, returnId, orderId, actorId, createdAt, status, currency, amount, lines }`. Refund line shape is `{ returnLineId, orderLineId, sku, quantity, amount }`. |

- Order line shape is `{ id, itemId, sku, itemName, quantity, unitPrice, amount, status }`.
- Return line shape is `{ id, orderLineId, itemId, sku, itemName, quantity, refundedQuantity, unitRefundAmount }`.
- Item statuses are `draft`, `published`, `unpublished` and `retired`. Item action types are `created`, `edited`, `price_updated`, `inventory_updated`, `retired` and `published`.
- Order and order line statuses are `new`, `acknowledged`, `shipped` and `canceled`. Order action type and status match the resulting order status.
- Fulfillment is `seller` or `walmart`.
- Return statuses are `in_transit`, `received` and `refunded`. A receipt has type and status `received`. A return's refund status is `not_refunded`, `partially_refunded` or `refunded`. A refund transaction has status `issued` and currency `USD`.
- `orderId` joins to `orders[].id`. `orderLineId` joins to an order's line ID. `returnId` joins to `returns[].id` and `returnLineId` to that return's line ID. `itemId` joins to `items[].id`. SKUs and item names on order and return lines are historical snapshots.

### Default IDs

| Record | Fixed IDs |
|---|---|
| Account and actor | `seller-hp01`, `usr-maya-chen` |
| Items | `itm-1001` through `itm-1039` and `itm-1041` through `itm-1049` |
| Orders | `6402108012010` through `6402108012069` |
| Returns | `7000160003010` through `7000160003039` |
| Item actions | `ia-1001` through `ia-1008` |
| Order actions | `oa-2010` through `oa-2057` |
| Return actions | `ra-3010` through `ra-3029` |
| Refunds | `rf-3010` through `rf-3018` |

## Minimal Inject Example

The account object merges with defaults. The arrays replace the seed arrays.

```json
{
  "account": { "storeName": "Juniper Outpost" },
  "items": [],
  "itemActions": [],
  "orders": [],
  "orderActions": [],
  "returns": [],
  "returnActions": [],
  "refunds": []
}
```

## Observable State Changes

Every successful confirmation sends one `set_current` with the full state, including one write for a bulk acknowledgment. The action or refund entry's `createdAt` and `actorId` match the updated parent record's `updatedAt` and `updatedBy`.

| User action | Updates to business records | Appended records |
|---|---|---|
| Save as draft or Publish in Add item | Inserts one `items[]` entry with a new `id`, submitted content and offer fields, category `imageKey`, `status`, `createdAt`, `updatedAt` and `updatedBy`. | `itemActions[]` with type `created`, resulting status, empty `before` and initial business fields in `after`. |
| Edit listing → Save changes | Changes submitted differences among `name`, `brand`, `category`, `productId`, `description` and category `imageKey`, plus `updatedAt` and `updatedBy`. | `itemActions[]` with type `edited` and changed fields in `before` and `after`. |
| Update price → Save price | Changes `price`, `updatedAt` and `updatedBy`. | `itemActions[]` with type `price_updated` and price in `before` and `after`. |
| Update inventory → Save inventory | Changes seller-fulfilled `availableQuantity`, `updatedAt` and `updatedBy`. | `itemActions[]` with type `inventory_updated`, quantity in `before` and `after`, and `location`. |
| Confirm Retire item | Sets item `status` to `retired`, sets `updatedAt` and `updatedBy`. | `itemActions[]` with type `retired` and status in `before` and `after`. |
| Confirm Publish item or Republish item | Sets item `status` to `published`, sets `updatedAt` and `updatedBy`. | `itemActions[]` with type `published` and status in `before` and `after`. |
| Confirm Acknowledge for one order or a selection | Sets targeted New orders and their New lines to `acknowledged`. Sets `acknowledgedAt`, `updatedAt` and `updatedBy` on each order. | One `orderActions[]` acknowledgment per order with affected line IDs, SKUs and quantities. |
| Confirm Mark as shipped | Sets the Acknowledged order and open lines to `shipped`. Sets `shippedAt`, `updatedAt` and `updatedBy`. | `orderActions[]` shipment with affected lines, `carrier` and `trackingNumber`. |
| Confirm Cancel order | Sets a New or Acknowledged order and open lines to `canceled`. Sets `canceledAt`, `updatedAt` and `updatedBy`. | `orderActions[]` cancellation with affected lines and `reason`. |
| Confirm Mark received | Sets return `status` to `received`, sets `receivedAt`, `updatedAt` and `updatedBy`. | `returnActions[]` receipt with affected line IDs, linked order line IDs, SKUs and quantities. |
| Confirm refund | Increments selected lines' `refundedQuantity` and the return's `refundedAmount`. Retains or derives `refundableAmount`. Sets `updatedAt` and `updatedBy`. Partial refund keeps `status: received` and sets `refundStatus: partially_refunded`. Final refund sets both statuses to `refunded` and writes `refundedAt`. | One `refunds[]` transaction with return and order IDs, per-line quantities and amounts, total amount, currency, actor and timestamp. |

Search, filters, pagination, selections, navigation, CSV downloads, dialog dismissal, and rejected submissions leave all Harbor records unchanged.
