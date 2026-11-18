# ebay_seller_hub_mock Schema

**Base URL** `http://localhost:5461/`  
**Go Endpoint** `GET /go?sid=<sid>` → `{initial_state, current_state, state_diff}`  
**Inject** `POST /post?sid=<sid>` with body `{"action":"set","state":{...}}`  
**Reset** `POST /post?sid=<sid>` with body `{"action":"reset"}`

Read session state with `GET /state?sid=<sid>`. The diff groups changes by top-level key. Identifiers are strings. Dates are ISO 8601 strings. Monetary values are numeric USD, rounded to cents. Buyers, addresses, and commercial records in the seed are synthetic.

## State Schema

| Key | Type | Description |
| --- | --- | --- |
| `seller` | Object | `id`, `name`, `username`, and `currency` are strings. |
| `listings` | Array | Inventory records. |
| `orders` | Array | Orders and their purchased line snapshots. |
| `returns` | Array | Buyer return requests and seller decisions. |
| `refunds` | Array | Issued refunds and pending offers. |
| `promotions` | Array | Inventory offers and their configured schedules. |
| `activity` | Array | Seller action records. |

Listings, orders, returns, refunds, and promotions have `id`, `createdAt`, and `actorId`. The last field identifies the record creator. Listings, orders, returns, and promotions also have `updatedAt`. Seed IDs are fixed. New seller actions use the runtime clock, and the corresponding activity identifies the current seller. Unavailable optional fields can be omitted in injected data.

### Listings

- `title`, `sku`, `category`, `condition`, `description`, and `thumbnail` are strings. Thumbnails refer to local assets.
- `price` is numeric and `quantity` is an integer. Incomplete drafts can contain null amounts and empty strings. An active listing can be revised to zero stock. Publishing or relisting requires positive stock.
- `status` is `active`, `draft`, or `ended`. The lifecycle fields `publishedAt`, `endedAt`, and `relistedAt` are present after their corresponding actions.

### Orders

- `orderNumber` is the display number. `buyer` contains `id`, `name`, and `username`. Optional `shipTo` contains `name`, `line1`, `city`, `region`, `postalCode`, and `country`.
- Each `lines[]` entry has `id`, `listingId`, `title`, `sku`, integer `quantity`, `unitPrice`, and `lineTotal`. Prices and titles describe the purchased item at order time.
- `subtotal`, `shipping`, `tax`, and `total` store the original amounts. `paymentStatus` is `paid` or `refunded` and `paidAt` is a timestamp.
- `status` is `awaiting_shipment`, `shipped`, or `canceled`. Optional fulfillment fields are `shippedAt`, `tracking: { carrier, number, updatedAt }`, `canceledAt`, and `cancellationReason`.

### Returns

- `orderId` links to an order. `reason` and optional `buyerNote` describe the request.
- Each `lines[]` entry has `orderLineId`, `listingId`, integer `quantity`, and `amount`. `requestedAmount` equals the line amounts plus any optional `shippingAmount` and `taxAmount`.
- `status` is `requested`, `accepted`, `received`, `offer_sent`, or `refunded`. The Closed filter shows `refunded` records.
- Optional lifecycle fields are `acceptedAt`, `receivedAt`, `resolvedAt`, `offeredAt`, `returnShippingPayer` (`buyer` or `seller`), `authorizationNumber`, `refundId`, and `partialOfferId`.

### Refunds

- `orderId` links to the original order and `returnId` links to a return when applicable.
- `kind` is `return_full`, `return_partial`, or `cancellation`. `status` is `issued` or `offered`. `note` is optional.
- Each `lines[]` entry has `orderLineId`, `listingId`, integer `quantity`, and allocated `amount`. `shippingAmount`, `taxAmount`, and `totalAmount` are numeric. A partial refund offer allocates cents in the request's line order, then applies any remainder to eligible shipping and tax. Each allocation is capped by its corresponding requested amount.

### Promotions

- `name` is a string and `type` is `sale_event`, `order_discount`, or `coupon`.
- `discount` is `{ kind, value }`, where `kind` is `percent` or `fixed` and `value` is numeric. `listingIds` is an array of listing IDs. Optional `code` is normalized to uppercase and unique across promotions. `minimumOrderTotal` is numeric for order discount terms when supplied.
- `status` is `draft`, `scheduled`, `active`, or `ended`. Optional timestamps are `startsAt`, `endsAt`, `publishedAt`, and `endedAt`. Draft and explicitly ended records retain their status. Other published records display as scheduled before the start, active through the date window, and ended at or after the end.

### Activity

Each `activity[]` entry contains `id`, `type` (see table), `entityType` (`listing`, `order`, `return`, or `promotion`), `entityId`, `actorId`, and `createdAt`. Seller actions add `details.previousStatus` and `details.status`. Order tracking events add `details.carrier` and `details.number`. Order cancellation adds `details.cancellationReason`. Return actions add `details.orderId`. Monetary actions also add `details.refundId` and `details.amount`.

### Default IDs

| Entity | IDs |
| --- | --- |
| Seller | `seller-001` |
| Listings | `lst-001`–`lst-048` |
| Orders | `ord-001`–`ord-042` |
| Order lines | `ol-001-1`–`ol-042-1`, with a `-2` line on multi-item orders |
| Buyers | `buyer-001`–`buyer-012` |
| Returns | `ret-001`–`ret-026` |
| Refunds | `ref-cancel-039`–`ref-cancel-042` and `ref-return-021`–`ref-return-026` |
| Promotions | `promo-001`–`promo-024` |
| Activity | `evt-001`–`evt-012` |

## Minimal Inject Example

```json
{
  "seller": { "name": "Cedar Workshop" },
  "listings": [],
  "orders": [],
  "returns": [],
  "refunds": [],
  "promotions": [],
  "activity": []
}
```

Send this as the `state` value in the inject request. The loader merges the seller object with its default fields. The empty arrays replace the seeded queues.

## Observable State Changes

Each accepted action submits the entire next state in one `set_current` request. Table paths with `[]` refer to the affected record, selected records, or new records. Activity types below are written to `activity[].type`.

| Action | Fields written | Activity types |
| --- | --- | --- |
| Create listing draft | New `listings[]` with identity, item fields, timestamps, and `status=draft` | `listing_created` |
| Revise listing or draft | `listings[].{title,sku,category,condition,description,thumbnail,price,quantity,updatedAt}` | `listing_revised` |
| Publish listing | Item fields, `listings[].{status,publishedAt,updatedAt}`, and creation fields for a new listing | `listing_created` for a new listing and `listing_published` |
| End one or more listings | `listings[].{status,endedAt,updatedAt}` per listing | `listing_ended` per listing |
| Relist | `listings[].{status,publishedAt,relistedAt,updatedAt}` | `listing_relisted` |
| Mark as shipped | `orders[].{status,shippedAt,updatedAt}` | `order_shipped` |
| Add or edit tracking | `orders[].{tracking,updatedAt}` plus `status` and `shippedAt` when fulfilling an awaiting order | `order_tracking_saved` |
| Cancel order | `orders[].{status,canceledAt,cancellationReason,updatedAt}`. Paid orders also get `orders[].paymentStatus=refunded` and a line-level `refunds[]` entry of kind `cancellation` and status `issued`. | `order_canceled` |
| Accept return | `returns[].{status,acceptedAt,returnShippingPayer,authorizationNumber,updatedAt}`. Authorization is recorded when supplied. | `return_accepted` |
| Mark received | `returns[].{status,receivedAt,updatedAt}` | `return_received` |
| Issue full refund | `returns[].{status,refundId,resolvedAt,updatedAt}` and a linked `refunds[]` entry of kind `return_full` and status `issued`. When cumulative issued refunds reach the paid total, the same action sets `orders[].{paymentStatus,updatedAt}`. | `return_refunded` |
| Offer partial refund | `returns[].{status,partialOfferId,offeredAt,updatedAt}` and a linked `refunds[]` entry of kind `return_partial` and status `offered` | `return_partial_offered` |
| Save promotion draft or revise an existing promotion | `promotions[].{name,type,status,discount,listingIds,code,minimumOrderTotal,startsAt,endsAt,updatedAt}` as applicable, plus creation fields for new promotions | `promotion_created` or `promotion_revised` |
| Schedule promotion | Promotion fields above, `promotions[].status=scheduled`, and `publishedAt` on first publication | `promotion_created` or `promotion_revised`, plus `promotion_scheduled` when initially scheduled or the start date changes |
| Launch promotion | Promotion fields above, `promotions[].{status,startsAt,publishedAt}` with `status=active` and `startsAt` set to the launch time | `promotion_created` or `promotion_revised`, plus `promotion_started` |
| End promotion | `promotions[].{status,endedAt,updatedAt}` | `promotion_ended` |

Navigation, filters, paging, sorting, draft form inputs, selection, and dialog dismissal are browser UI state. Overview counts and promotion display status derive from the saved records. The Harbor template handles the baseline write on first load and serves the inspection endpoint.
