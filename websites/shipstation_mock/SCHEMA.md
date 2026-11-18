# shipstation_mock Schema

**Base URL** `http://localhost:5454/`

**Go endpoint** `GET /go?sid=<sid>` returns `{initial_state, current_state, state_diff}`.

**Inject** Send `{"action":"set","state":{...}}` to `POST /post?sid=<sid>`.

**Reset** Send `{"action":"reset"}` to `POST /post?sid=<sid>` to restore the stored baseline.

Start with `GET /go?sid=<session>`. The response contains `initial_state`, `current_state`, and a top-level `state_diff`. The state in both snapshots uses the shape below. Use record IDs for joins and display numbers for human-readable references. All currency fields are USD numbers rounded to cents. Times are ISO datetimes, except warehouse receipt dates, which are `YYYY-MM-DD`.

## State Schema

| Key | Authored value |
| --- | --- |
| `account` | `{ id, name, actorId, currency }`. The default actor is `usr-01`, Morgan Ellis at Northline Goods. |
| `users[]` | `{ id, name, role }`. |
| `stores[]` | `{ id, name, type }`. Types are `manual`, `shopify`, `etsy`, or `amazon`. |
| `locations[]` | `{ id, name, address: Address }`. |
| `orders[]` | Order records keyed by `id`. |
| `labels[]` | Outbound and return Label records keyed by `id`. |
| `batches[]` | Batch records keyed by `id`. |
| `returns[]` | Return records keyed by `id`. |
| `activity[]` | Activity records keyed by `id`, appended in action order. |

All IDs, names, addresses, and other descriptive fields are strings unless a different type is shown. Injected records may omit metadata and optional data. Business record edits preserve additional injected fields.

### Default IDs

| Collection | Seed IDs |
| --- | --- |
| Account | `acct-northline` |
| Users | `usr-01` through `usr-04` |
| Stores | `store-01` through `store-04` |
| Locations | `loc-01` through `loc-03` |
| Orders | `ord-1001` through `ord-1096` |
| Labels | `lbl-2001` through `lbl-2068` |
| Batches | `bat-3001` through `bat-3026` |
| Returns | `ret-4001` through `ret-4030` |
| Activity | `act-5001` through `act-5004` |

## Nested shapes

| Type | Fields |
| --- | --- |
| Metadata | `createdAt`, `createdBy`, optional `updatedAt`, `updatedBy`. Actor fields are user IDs. |
| Address | `line1`, optional `line2`, `city`, `region`, `postalCode`, `country`. |
| Recipient | `name`, optional `company`, `email`, `phone`. |
| Order item | `id`, `sku`, `name`, `quantity` (positive integer), `unitPrice` (USD). |
| Shipping options | `shipFromId` (location ID, omitted for inbound labels), `carrier`, `service`, `packageType`, `weightOz` (positive number), `dimensionsIn: { length, width, height }` (positive numbers). |
| Return item | `orderItemId`, `quantity` (positive integer), `reason`. |

## Business records

| Record | Fields beyond metadata |
| --- | --- |
| Order | `id`, `number`, `storeId`, `orderedAt`, `status`, `recipient: Recipient`, `shipTo: Address`, `items: Order item[]`, `total` (USD), optional `notes` and `shipping: Shipping options`. Statuses are `awaiting_payment`, `awaiting_shipment`, `on_hold`, `shipped`, and `cancelled`. |
| Label | `id`, `number`, `orderId`, optional `batchId` or `returnId`, `direction` (`outbound` or `return`), `status` (`active` or `voided`), `trackingStatus` (`label_created`, `in_transit`, or `delivered`), `trackingNumber`, `shipping: Shipping options`, `shipFrom: Address`, `shipTo: Address`, `cost` (USD), optional `voidedAt`. Addresses and shipping reflect the package when postage was created. |
| Batch | `id`, `number`, `name`, `status` (`open`, `processed`, or `archived`), `assigneeId` (empty string for unassigned), `orderIds: string[]`, optional `processedAt`, `archivedAt`, and `totalCost` (USD). |
| Return | `id`, `rma`, `orderId`, `labelId` (inbound label), optional `outboundLabelId`, `locationId` (warehouse), `items: Return item[]`, `cost` (USD), optional `notes`, `receivedDate`, and `voidedAt`. Status is `outstanding`, `received`, or `voided`. |

An Activity record has `id`, `action`, `createdAt`, `actorId`, `orderIds: string[]`, `labelIds: string[]`, optional `batchId` and `returnId`, and `details` (object). Each completed action writes one activity record. The event and its business changes share an actor and timestamp.

## Minimal Inject Example

This state replaces the fulfillment collections. Open `/orders/audit-order?sid=<sid>` to view the sparse order.

```json
{
  "action": "set",
  "state": {
    "orders": [
      { "id": "audit-order", "number": "NG-AUDIT", "status": "awaiting_shipment" }
    ],
    "labels": [],
    "batches": [],
    "returns": [],
    "activity": []
  }
}
```

## Observable State Changes

| User action | Business record writes | Activity action and `details` |
| --- | --- | --- |
| Save or Save & Create Label | Append `orders[]` with `status=awaiting_shipment`, submitted order fields, item IDs, total, and creation metadata. | `order_created` with `{ status, total }`. |
| Save order details | Update `recipient`, `shipTo`, `notes` and order update metadata. | `order_updated` with `{ fields: ["recipient", "shipTo", "notes"] }`. |
| Save shipping options | Update `orders[].shipping` and update metadata. | `order_updated` with `{ fields: ["shipping"] }`. |
| Place on hold, release, mark paid, or cancel | Update `orders[].status` and update metadata. Hold sets `on_hold`, release and payment set `awaiting_shipment`, and cancellation sets `cancelled`. | `order_status_changed` with `{ fromStatus, status }`. |
| Confirm and create outbound label | Append active `labels[]` with order ID, rate, tracking and address snapshots. Update `orders[].shipping`, `status=shipped`, and update metadata. | `outbound_label_created` with `{ cost, trackingNumber }`. |
| Confirm outbound void | Set `labels[].status=voided`, `voidedAt`, and update metadata. For the last active outbound label of a shipped order, set its `status=awaiting_shipment` and update metadata. | `outbound_label_voided` with `{ reopened }`. |
| Confirm single or batch print | No business record fields. Event `labelIds` contains printed labels and `batchId` is set for batch printing. | `labels_print_requested` with `{ labelCount }`. |
| Create batch | Append `batches[]` with `status=open`, `name`, `assigneeId`, `orderIds`, number, and creation metadata. | `batch_created` with `{ name, assigneeId }`. |
| Save batch details | Update `batches[].name`, `assigneeId`, and update metadata. | `batch_updated` with `{ fields }`, listing changed fields. |
| Add or remove batch members | Update `batches[].orderIds` and update metadata. | `batch_orders_added` or `batch_orders_removed` with `{ orderIds }` for affected members. |
| Confirm batch processing | Update `batches[].status=processed`, `processedAt`, `totalCost`, and update metadata. Append an active outbound label per member with `batchId`. Set member orders to `shipped` with saved `shipping` and update metadata. | `batch_processed` with `{ status, orderCount, totalCost }`. |
| Confirm batch archival | Set `batches[].status=archived`, `archivedAt`, and update metadata. | `batch_archived` with `{ status }`. |
| Authorize return | Append `returns[]` with `status=outstanding`, chosen items, reasons, warehouse, cost, notes, optional outbound label ID, and inbound `labelId`. Append active inbound `labels[]` with matching `returnId`, customer origin, and warehouse destination. | `return_authorized` with `{ items, cost }`. |
| Confirm warehouse receipt | Set `returns[].status=received`, `receivedDate`, and update metadata. | `return_received` with `{ receivedDate }`. |
| Confirm return cancellation | Set `returns[].status=voided` and linked inbound `labels[].status=voided` with the same `voidedAt` timestamp and update metadata. | `return_voided` with `{ status }`. |

The local postage calculation adds service base cents, 35 cents per started pound, and 60 cents per box. Returnable quantities deduct the quantities recorded in outstanding and received returns. Review screens, previews, filters, selections, and route changes create no activity. The unchanged Harbor manager makes one baseline request per fresh browser session key, then posts the full state after each completed action.

