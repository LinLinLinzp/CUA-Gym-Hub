# Square Dashboard Mock Schema

| Operation | Request |
| --- | --- |
| Base URL | `http://localhost:5458/` |
| Go endpoint | `GET /go?sid=<sid>` returns `initial_state`, `current_state`, and `state_diff`. |
| Inspect injection | `GET /state?sid=<sid>` returns `stored_state`, `has_custom_state`, and `sid`. |
| Inject | `POST /post?sid=<sid>` with `{"action":"set","state":{...}}` |
| Reset | `POST /post?sid=<sid>` with `{"action":"reset"}` |

Harbor replaces injected arrays and merges injected objects over the default world. The first write establishes the initial snapshot. Reset restores that snapshot, or the defaults if no snapshot exists. The `state_diff` reports changed top-level keys as `modified` or `added` with their current values.

IDs and timestamps are strings. New records use ISO timestamps from the task clock. Amounts are numeric in newly written records. The UI accepts finite numeric strings in injected records. Stock and quantities are nonnegative integers. A question mark marks fields that may be absent. A missing related record leaves its stored reference available for reconciliation. New refund and payout records use the source currency, then `account.currency`, then USD. Some display paths fall back directly to USD.

## State Schema

| Key | Record fields |
| --- | --- |
| `account` | `merchantId`, `merchantName`, `actorId`, `actorName`, `currency`, `timeZone` |
| `locations[]` | `id`, `name`, `timeZone?` |
| `categories[]` | `id`, `name` |
| `items[]` | `id`, `name`, `description?`, `categoryId` (category ID or null), `status` (active or archived), `variations[]`, `actorId`, `createdAt`, `updatedAt` |
| `orders[]` | `id`, `orderNumber`, `customerName?`, `locationId`, `source` (online or point_of_sale), `fulfillmentType` (pickup or shipping), `status` (new, in_progress, ready, completed or canceled), `totalAmount`, `currency`, `lineItems[]`, `activity[]`, `actorId`, `createdAt`, `updatedAt` |
| `payments[]` | `id`, `orderId?`, `orderLineIds?` (explicit line attribution), `locationId?`, `receiptNumber`, `method` (card or cash), `cardLast4?`, `status` (paid, pending or failed), `amount`, `currency?`, `refundedAmount`, `refundStatus` (none, partial or full), `actorId`, `createdAt`, `updatedAt` |
| `refunds[]` | `id`, `orderId` (order ID or null), `paymentId`, `locationId` (location ID or null), `mode` (full, custom or itemized), `status` (completed, pending or failed), `amount`, `currency`, `reason`, `lineItems[]`, `actorId`, `createdAt` |
| `destinations[]` | `id`, `locationId`, `name`, `last4`, `type` (bank_account or debit_card) |
| `balances[]` | `locationId` (unique), `availableAmount`, `currency?`, `actorId`, `updatedAt` |
| `payouts[]` | `id`, `locationId`, `destinationId`, `method` (instant or standard), `status` (pending, completed or failed), `amount` (gross), `feeAmount`, `netAmount`, `currency`, `estimatedArrivalAt?`, `actorId`, `createdAt`, `updatedAt` |
| `payoutEntries[]` | `id`, `payoutId`, `type` (payment or refund), `paymentId`, `refundId?`, `grossAmount`, `feeAmount`, `netAmount`, `currency`, `createdAt` |

## Nested records

| Parent field | Record fields |
| --- | --- |
| `items[].variations[]` | `id`, `name`, `sku?` (empty string for a blank SKU on newly written records), `price`, `stock` |
| `orders[].lineItems[]` | `id`, `itemId?`, `variationId?`, `paymentId?` (explicit line attribution), `name`, `variationName?`, `quantity`, `unitPrice`, `totalAmount`. Name and amounts are purchase snapshots. |
| `orders[].activity[]` | `id`, `type` (created or status_changed), `fromStatus` (null for creation), `toStatus`, `actorId`, `createdAt` |
| `refunds[].lineItems[]` | `orderLineId`, `itemId?`, `variationId?`, `name`, `quantity`, `amount` |

### Default IDs

| Record | Seed IDs |
| --- | --- |
| Merchant and actor | `m_alder_finch`, `usr_maya` |
| Locations and corresponding balance keys | `loc_riverfront`, `loc_maple` |
| Categories | `cat_ceramics`, `cat_textiles`, `cat_glassware`, `cat_fragrance`, `cat_housewares` |
| Items | `itm_001` through `itm_036` |
| Orders and payments | `ord_001` through `ord_072`, `pay_001` through `pay_068` |
| Refunds | `ref_001` through `ref_026` |
| Destinations | `dst_riverfront`, `dst_maple` |
| Payouts and settlement entries | `po_001` through `po_030`; 20 entries use `pe_<three-digit payout number>_<three-digit entry number>`. |

## Minimal Inject Example

This request creates an empty account workspace for testing navigation, empty states and item creation.

```json
{
  "action": "set",
  "state": {
    "account": { "merchantName": "West Bay Home" },
    "locations": [],
    "categories": [],
    "items": [],
    "orders": [],
    "payments": [],
    "refunds": [],
    "destinations": [],
    "balances": [],
    "payouts": [],
    "payoutEntries": []
  }
}
```

## Observable State Changes

Each confirmed action below writes the full resulting state once. New IDs are unique within their entity type. Updates retain unknown fields on the changed records.

| User action | Exact business writes |
| --- | --- |
| Create item | Append `items[]` with `id`, `name`, `description`, `categoryId`, `status: active`, `variations[]` (each with `id`, `name`, `sku`, `price`, `stock`), `actorId`, `createdAt`, `updatedAt`. |
| Save item edits | Update `items[].name`, `description`, `categoryId`, `variations[]`, `actorId`, `updatedAt`. Retained variations keep their IDs. New variations get new IDs. |
| Confirm archive or restore | Update `items[].status` to archived or active, `actorId`, `updatedAt`. |
| Advance or cancel fulfillment | Update `orders[].status`, `updatedAt`, `actorId`. Append an `activity[]` entry with `id`, `type: status_changed`, `fromStatus`, `toStatus`, `actorId`, `createdAt`. Valid advancement is new → in_progress → ready → completed. Cancellation is allowed from the first three statuses. |
| Confirm full, custom or itemized refund | Append `refunds[]` with `id`, `orderId`, `paymentId`, `locationId`, `mode`, `status: completed`, `amount`, `currency`, `reason`, `lineItems[]`, `actorId`, `createdAt`. Update `payments[].refundedAmount`, `refundStatus`, `updatedAt`, `actorId` in the same write. |
| Confirm instant transfer | Append `payouts[]` with `id`, `status: pending`, `method: instant`, `amount`, `feeAmount`, `netAmount`, `currency`, `locationId`, `destinationId`, `estimatedArrivalAt` (confirmation + ten minutes), `actorId`, `createdAt`, `updatedAt`. Debit `balances[].availableAmount` by the gross amount and update that balance's `actorId` and `updatedAt` in the same write. |
| Navigate, search, filter, sort, select a location, export CSV, edit a draft, open a review, cancel, reject an action, or save an unchanged item | Zero business writes. |

Refunds use the larger of the stored refunded amount and the sum of completed linked refunds. Itemized amounts allocate any excess fractional cents to the first sold units and subtract previously refunded quantities. Full refunds include remaining lines if their attributed quantities account for the entire refundable amount. Custom refunds record an empty line array.

Instant transfers round the 1.95% fee to the nearest cent and require a net amount of at least $25. A newly requested transfer has no settlement entries. Seeded settlement entries are historical.
