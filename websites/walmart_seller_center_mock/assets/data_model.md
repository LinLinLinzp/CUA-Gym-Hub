# Walmart Seller Center — planned state model

## Root state

```js
{
  account: { id: "seller-hp01", storeName: "Harbor & Pine Supply",
    actorId: "usr-maya-chen", actorName: "Maya Chen",
    inventoryLocation: "Columbus Fulfillment Center", currency: "USD" },
  items: [],
  itemActions: [],
  orders: [],
  orderActions: [],
  returns: [],
  returnActions: [],
  refunds: []
}
```

`account` is an object of strings, and the remaining keys are arrays. The defaults fill the three main arrays and relevant history. Accept the empty root example as an injected world. Keep each unit of work atomic in the store and preserve unrelated records, including injected data. Forms, selections, tabs, sort and notification UI stay transient. Use number types for quantities and dollar amounts. Validate and calculate money in integer cents before serializing dollars. IDs and identifiers are strings. Dates with an `At` suffix are ISO timestamps. Every new action or transaction records a unique ID, a string `actorId`, and a `createdAt` obtained from `new Date().toISOString()`. Use the same actor and timestamp on the parent record for the update. Omitted optional values should render gracefully.

## Items and item actions

| Field | Type | Example or rule |
|---|---|---|
| `id`, `sku` | string | `itm-1001`, `HP-KT-101`. SKU is unique case-insensitively |
| `name`, `brand`, `category` | string | `Bamboo Drawer Organizer`, `Harbor & Pine`, `Kitchen & Dining` |
| `productId`, `description`, `imageKey` | optional string | `00850000100016`, `Six compartments with a natural finish.`, `kitchen` |
| `price`, `availableQuantity` | number | `24.95`, `37`. Price is positive and quantity is a nonnegative integer |
| `status` | enum | `draft`, `published`, `unpublished`, `retired` |
| `fulfillment` | enum | `seller`, `walmart` |
| `createdAt`, `updatedAt`, `updatedBy` | string | `2026-10-20T15:30:00.000Z`, `2026-11-14T10:00:00.000Z`, `usr-maya-chen` |

Each `itemActions[]` record contains `id` (e.g. `ia-1001`), `itemId`, `sku`, `type` (`created`, `edited`, `price_updated`, `inventory_updated`, `retired`, `published`), `actorId`, `createdAt`, resulting `status`, and `before` and `after` objects with the changed fields and JSON values. For an inventory update also store `location` (e.g. `Columbus Fulfillment Center`). For a new item, `before` is empty and `after` contains all initial business fields. An item created with Publish uses `type: "created"` and `status: "published"`.

## Orders and order actions

| Field | Type | Example or rule |
|---|---|---|
| `id`, `customerOrderId` | string | `6402108012010` (purchase order identifier and route key), `20001456002210` |
| `customerName`, `shipTo` | string, optional object | `Jordan Avery`; optional string fields `address1`, `city`, `state`, `postalCode`, e.g. `14 Cedar Trace`, `Columbus`, `OH`, `43215` |
| `status` | enum | `new`, `acknowledged`, `shipped`, `canceled` |
| `fulfillment` | enum | `seller`, `walmart`; mutation controls are available for seller fulfillment |
| `createdAt`, `shipByAt`, `updatedAt`, `updatedBy` | string | `2026-11-17T10:00:00.000Z`, `2026-11-19T17:00:00.000Z`, `2026-11-17T11:00:00.000Z`, `usr-maya-chen` |
| `acknowledgedAt`, `shippedAt`, `canceledAt` | optional string | `2026-11-18T14:00:00.000Z` for the relevant action |
| `total` | number | `49.90`, sum of seeded line totals |
| `lines` | array | One or more order lines |

An order line contains `id` (string, e.g. `ol-2010-1`), `itemId` (string, `itm-1001`), `sku` and `itemName` (string snapshots, `HP-KT-101`, `Bamboo Drawer Organizer`), `quantity` (integer, `2`), `unitPrice` and `amount` (numbers, `24.95`, `49.90`), and `status` (same enum as order). Preserve historical prices and quantities when catalog values change.

An `orderActions[]` record contains `id` (e.g. `oa-2010`), `orderId`, `type` and resulting `status` (`acknowledged`, `shipped` or `canceled`), `actorId`, `createdAt` and `lines` containing `orderLineId`, `sku` and `quantity`. A shipment also contains `carrier` and `trackingNumber` (strings, e.g. `UPS` and `1ZTEST000000012345`), and a cancellation also contains `reason` (string, e.g. `Out of stock`). Acknowledge New only. Ship Acknowledged only. Cancel New or Acknowledged. Preserve earlier milestone timestamps. Scope selection to eligible rows and show any ineligible records before confirmation. Whole-order actions only affect open lines eligible for that transition.

## Returns, receipts and refunds

| Field | Type | Example or rule |
|---|---|---|
| `id`, `orderId` | string | `7000160003010`, `6402108012010`. `id` is the displayed return ID and route key |
| `customerName`, `reason` | string | `Jordan Avery`, `Arrived damaged` |
| `status` | enum | `in_transit`, `received`, `refunded` |
| `refundStatus` | enum | `not_refunded`, `partially_refunded`, `refunded` |
| `refundableAmount`, `refundedAmount` | number | `49.90` original eligible total, `24.95` cumulative refund |
| `carrier`, `trackingNumber` | optional string | `FedEx`, `TEST000003010` |
| `createdAt`, `updatedAt`, `updatedBy` | string | `2026-11-14T12:40:00.000Z`, `2026-11-18T16:10:00.000Z`, `usr-maya-chen` |
| `receivedAt`, `refundedAt` | optional string | ISO timestamp for receipt or completion of the final refund |
| `lines` | array | One or more return lines |

A return line contains `id` (string, e.g. `rl-3010-1`), `orderLineId`, `itemId`, `sku`, and `itemName` (strings from the original order), `quantity` (integer, `2`), `refundedQuantity` (integer, `1`), and `unitRefundAmount` (number, `24.95`). Remaining eligible quantity is `quantity - refundedQuantity`. When an injected record lacks optional history or a linked item or order, show snapshot labels if available. Require sufficient line, amount and relationship data before enabling a mutation.

A `returnActions[]` receipt contains `id` (e.g. `ra-3010`), `returnId`, `orderId`, `type: "received"`, `status: "received"`, `actorId`, `createdAt` and `lines` with `returnLineId`, `orderLineId`, `sku` and `quantity`. Mark received is available for `in_transit` only.

A `refunds[]` record contains `id` (e.g. `rf-3010`), `returnId`, `orderId`, `actorId`, `createdAt`, `status: "issued"`, `amount` (number, e.g. `24.95`), `currency: "USD"`, and `lines` with `returnLineId`, `orderLineId`, `sku`, integer `quantity` and numeric `amount`. A refund increments each selected line's `refundedQuantity` and the return's `refundedAmount`. A partially refunded return keeps status `received` and sets `refundStatus` to `partially_refunded`. Once each eligible unit has been refunded, set both status fields to `refunded` and write `refundedAt`. Update `updatedAt` and `updatedBy` for every receipt or refund. Reject a zero, fractional or excessive refund quantity and confirm current eligibility before the write. The refund record is the activity entry for that financial action.

## Seed fixture coverage

- Use 48 fixed item IDs with multiple SKUs per category across Kitchen & Dining, Home Organization, Outdoor, Office and Pet Supplies. Cover all item statuses, low and zero stock, both fulfillment types and a mix of prices.
- Use 60 purchase orders with 12 New, 10 Acknowledged, 34 Shipped and 4 Canceled. Include seller-fulfilled examples in each state and at least two eligible orders for bulk acknowledgment. Use a mix of single and multiple lines, quantities of 1–4, dates around mid-November 2026, and identifiers that are searchable as text.
- Use 30 returns linked to distinct shipped orders, with 10 in transit, 12 received and 8 fully refunded. Ensure the received set includes one previously partially refunded order and one multi-line case suitable for partial and follow-up refunds. Return quantities must fit within their linked order quantities. Seed corresponding records for prior refunds and selected historical item, order and receipt actions.
- Use fixed synthetic names and dates throughout the seed. Derive relative labels from the runtime clock. Allocate collision-resistant string IDs for new records during a confirmed action. Keep the seed function deterministic and freshly allocated each call.
