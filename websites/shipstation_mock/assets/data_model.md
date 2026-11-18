# Proposed Harbor state model

`src/data/seed.js` exports `createInitialData()` and returns a fresh JSON-serializable object with the keys below. The types describe records authored by the application. Injected records may omit display metadata or reference an unavailable record. Read optional values defensively, avoid writing on load, and preserve extra injected fields on updates.

## Top-level keys

| Key | Type | Example or role |
| --- | --- | --- |
| `account` | Account | Synthetic signed-in Northline Goods workspace |
| `users` | User[] | Operators who create records or are assigned to batches |
| `stores` | Store[] | Channels used for order source and store filtering |
| `locations` | Location[] | Shipping origins and receiving warehouses |
| `orders` | Order[] | Imported and manually created orders |
| `labels` | Label[] | Outbound and return postage records |
| `batches` | Batch[] | Groups of orders and their processing history |
| `returns` | Return[] | Warehouse return authorizations |
| `activity` | Activity[] | Durable business actions |

## Shared types

- **Identity and money.** IDs are strings. Seed IDs follow fixed sequences, such as `ord-1001`. Use a unique ID for each new record, and a separate human-readable number for display. Generate display numbers without assuming array length or overwriting injected numbers. Store USD money as JSON numbers rounded to cents. Compute financial sums in cents.
- **Actor and metadata.** Business records contain `createdAt` (ISO datetime string), `createdBy` (User ID, falling back to the account actor ID), and `updatedAt` and `updatedBy` on edits. An explicit action and all its changes share one timestamp and actor. Use `new Date().toISOString()` for runtime action datetimes. User-entered warehouse receipt dates are date-only `YYYY-MM-DD`.
- **Address.** Object with `line1`, optional `line2`, `city`, `region`, `postalCode`, and `country`, all strings. Example `{ line1: "240 Cedar Spur", city: "Portland", region: "OR", postalCode: "97205", country: "US" }`.
- **Recipient.** Object with `name` and optional `company`, `email`, and `phone`, all strings. Example Mina Patel, Juniper Studio, `mina.patel@example.test`, `503-555-0142`.
- **Line item.** `id`, `sku`, `name` (strings), `quantity` (positive integer), and `unitPrice` (USD). Example `{ id: "item-1001-1", sku: "NLG-CANVAS-04", name: "Canvas tool roll", quantity: 2, unitPrice: 28 }`.
- **Shipping options.** `shipFromId`, `carrier`, `service`, `packageType` (strings), `weightOz` (positive number), `dimensionsIn` (object with positive numeric `length`, `width`, `height`). Example `loc-01`, USPS, Ground Advantage, Box, 21 oz, 10 × 7 × 4 in. Draft options may be incomplete. A committed label keeps the complete configuration.

## Account, user, store, and location

| Record | Fields and type | Example |
| --- | --- | --- |
| Account | `id`, `name`, `actorId`, `currency` strings | `acct-northline`, Northline Goods, `usr-01`, USD |
| User | `id`, `name`, `role` strings | `usr-01`, Morgan Ellis, Shipping Coordinator |
| Store | `id`, `name` strings; `type` string enum | `store-01`, Manual Orders, `manual`. Other types `shopify`, `etsy`, `amazon`. |
| Location | `id`, `name` strings; `address` Address | `loc-01`, Portland Warehouse, address with `country: "US"` |

## Order

| Fields | Type and example |
| --- | --- |
| `id`, `number`, `storeId` | Strings. `ord-1001`, `NG-1001`, `store-02`. |
| `orderedAt`, `status` | ISO datetime and enum `awaiting_payment`, `awaiting_shipment`, `on_hold`, `shipped`, `cancelled`. |
| `recipient`, `shipTo` | Recipient and Address. |
| `items`, `total`, `notes` | LineItem[], USD number, optional string. Example one Canvas tool roll line, `56.00`, “Leave at receiving”. Manual order total is the line sum. |
| `shipping` | Optional ShippingOptions. Batch processing uses the order’s saved options. |
| Metadata | Shared actor and datetime fields. |

Awaiting Payment becomes Awaiting Shipment on Mark as Paid. Awaiting Shipment moves to On Hold and back on Hold/Release. Awaiting Payment, Awaiting Shipment, and On Hold can be cancelled under the eligibility rules in TODO. Awaiting Shipment and On Hold can move to Shipped on eligible single-label creation. Avoid persisting reverse links. Look up labels and returns by order ID and open batch membership by `orderIds`.

## Label

| Fields | Type and example |
| --- | --- |
| `id`, `number`, `orderId` | Strings. `lbl-2001`, `LBL-2001`, `ord-1001`. |
| `batchId`, `returnId` | Optional string IDs. `bat-3011` for a grouped outbound label or `ret-4001` for an inbound label. |
| `direction`, `status`, `trackingStatus` | Enums `outbound\|return`, `active\|voided`, and `label_created\|in_transit\|delivered`. Void only eligible active labels with no known scan. Keep tracking history on void. |
| `trackingNumber`, `cost` | String with unique synthetic tracking text, e.g. `SIM-USPS-2001`, and USD number, e.g. `8.45`. |
| `shipping`, `shipFrom`, `shipTo` | ShippingOptions and Address snapshots. For inbound postage, copy the recipient address into shipFrom and the selected warehouse address into shipTo. For inbound labels, `shipping.shipFromId` may be omitted because the origin is the customer address. |
| Metadata, `voidedAt` | Shared fields and optional ISO datetime. |

Keep the synthetic rate table in shared local code. A simple price formula uses service base cents plus 35 cents per started pound and a package adjustment of 0 cents for a mailer or 60 cents for a box. Example service bases are 550 (USPS Ground Advantage), 780 (USPS Priority Mail), 815 (UPS Ground), and 1730 (FedEx 2Day). Use the same rate logic from single labels, batch confirmation, and return authorization. Store the reviewed integer-cent result as a USD number on the new label.

## Batch

| Fields | Type and example |
| --- | --- |
| `id`, `number`, `name` | Strings. `bat-3001`, `B-3001`, “Portland morning pickup”. |
| `status`, `assigneeId`, `orderIds` | Enum `open\|processed\|archived`, User ID string, array of unique Order IDs. |
| `processedAt`, `archivedAt`, `totalCost` | Optional ISO datetimes and USD number, e.g. `17.35`. |
| Metadata | Shared actor and datetime fields. |

An order may appear in past batches and only one open batch. The active-batch restriction is based on current open membership. Resolve batch labels by `labels[].batchId`; keep historic order membership after processing and archiving. For a batch with missing, stale, or incomplete members, render per-order feedback and offer removal of those members before processing. Revalidate eligibility immediately before committing.

## Return

| Fields | Type and example |
| --- | --- |
| `id`, `rma`, `orderId`, `labelId` | Strings. `ret-4001`, `RMA-4001`, `ord-1001`, `lbl-2039`. |
| `outboundLabelId`, `locationId` | Optional outbound Label ID and Warehouse Location ID string. |
| `status`, `items` | Enum `outstanding\|received\|voided` and array of `{ orderItemId: string, quantity: number, reason: string }`. Example `item-1001-1`, 1, “Item arrived damaged”. |
| `cost`, `notes` | USD number matching the inbound label and optional notes string. |
| Metadata, `receivedDate`, `voidedAt` | Shared fields, optional date-only receipt, and optional ISO cancellation datetime. |

Track returnable quantity per order line as ordered quantity minus quantities on outstanding or received returns, clamped to zero for display. Require at least one eligible line and per-item reason to authorize. Voided returns release those quantities. UI reason options can include Damaged, Wrong Item, Does Not Fit, Changed Mind, and Other. Store the reason selected for each line. Return eligibility includes a shipped order with at least one returnable item, a domestic address, and a warehouse of the same country. If a shipped injected order has no outbound label, allow authorization using its order data.

## Activity

| Fields | Type and example |
| --- | --- |
| `id`, `action`, `createdAt`, `actorId` | Strings. `act-5001`, `batch_processed`, ISO datetime, `usr-01`. |
| `orderIds`, `labelIds`, `batchId`, `returnId` | Arrays of affected IDs and optional scalar links. Use empty arrays for absent order or label links. |
| `details` | JSON object with the result. Example `{ "status": "processed", "orderCount": 2, "totalCost": 17.35 }`. |

Use these action names and associated detail fields. Creation and update events reference the authored business records for their full values.

| Actions | Details |
| --- | --- |
| `order_created`, `order_updated`, `order_status_changed` | Result status and total for creation, changed field names for edit, old and new status for a transition. |
| `outbound_label_created`, `outbound_label_voided`, `labels_print_requested` | Cost and tracking number on creation, whether the order reopened on void, and label count on print request. |
| `batch_created`, `batch_updated`, `batch_orders_added`, `batch_orders_removed`, `batch_processed`, `batch_archived` | Result name and assignee on creation, changed field names for edit, affected order IDs on membership events, result status/count/cost on process, and result status on archive. |
| `return_authorized`, `return_received`, `return_voided` | Authorized items and cost, receipt date, or voided status with linked IDs. |

## Fixed seed design

Use deterministic arrays or generators with stable IDs and fixed past dates. Vary recipients, destinations, stores, item mixes, and prices. Use fictional names, street addresses, and reserved contact examples. Keep dates out of the default filters so fixed orders remain discoverable under any runtime clock.

- **Orders (96).** 40 awaiting shipment, 34 shipped, eight on hold, eight awaiting payment, and six cancelled. Use four stores and three US warehouses. Most ready orders should be configured. Keep at least two unbatched configured orders to process together and at least one unconfigured member in an open batch. Include an order with no items and several with multiple items.
- **Batches (26).** Ten open, eight processed, and eight archived. Use distinct eligible orders across open batches. Give the 16 historical batches two shipped members each. Vary assignees and batch names, such as East Coast Economy, Friday Parcel Pickup, or Portland Priority.
- **Labels (68).** 34 active outbound labels for the shipped orders, four voided outbound labels on awaiting-shipment orders, and 30 inbound labels for the returns. Assign the 32 historically batched outbound labels to their respective batches. Seed both scanned labels and at least one unused outbound label.
- **Returns (30).** 14 outstanding, 12 received, and four voided. Use the matching inbound label status and historical timestamps. Leave several shipped orders with untouched returnable items. Include a partial return that leaves a second unit available and a fully used item with no remaining quantity.
- **Supporting records.** One account, four synthetic operators, four stores, three warehouses, and a small set of matching historical activity entries. Generate no new records when opening a route or while idle.
