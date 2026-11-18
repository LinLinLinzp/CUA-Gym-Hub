# best_buy_mock Schema

**Base URL** `http://localhost:5311/`  
**Go Endpoint** `GET /go?sid=<sid>` returns `{initial_state, current_state, state_diff}`.  
**Inject** `POST /post?sid=<sid>` with `{"action":"set","state":{...}}`.  
**Reset** `POST /post?sid=<sid>` with `{"action":"reset"}` restores the stored initial snapshot or the default data. Use a fresh browser context to load the reset state from the server.

## State Schema

Identifiers are strings. Prices and estimates are USD numbers rounded to cents. Times are ISO 8601 UTC strings. A question mark marks an optional field. Injected arrays replace defaults and objects merge on load. The app carries forward unrecognized fields. Line IDs are scoped to the parent order.

| Top-level key | Record shape |
| --- | --- |
| `account` | `{ id, name, email?, membership? }` |
| `stores[]` | `{ id, name, address? }` |
| `orders[]` | `{ id, orderNumber, createdAt, receivedAt?, updatedAt?, status, fulfillment, storeId?, pickupContact?, shipment?, paymentLabel?, subtotal?, tax?, shippingAmount?, total?, items[] }`. Status is `processing`, `shipped`, `delivered`, `ready_for_pickup`, `picked_up`, or `canceled`. Fulfillment is `shipping` or `pickup`. |
| `orderEvents[]` | `{ id, type, status: 'confirmed', orderId, actorId, createdAt }`. Type `pickup_contact_changed` adds `previousContact?` and `pickupContact`. Type `items_canceled` adds `reason`, `lines[]`, and aggregate `refundEstimate`. |
| `priceMatchRequests[]` | `{ id, orderId, orderItemId, actorId, createdAt, status, offerChannel, offerUrl?, originalUnitPrice, offerUnitPrice, quantity, requestedAmount }`. Status is `submitted`, `approved`, or `denied`. Channel is `online`, `app`, or `store`. |
| `protectionPlans[]` | `{ id, planNumber, orderId, orderItemId, actorId, createdAt, name, status, coverageStartAt, coverageEndAt, coverage[], termMonths, price, quantity: 1, canceledAt? }`. Status is `active`, `expired`, or `canceled`. |
| `protectionPlanEvents[]` | `{ id, planId, orderId, orderItemId, actorId, createdAt, type, status: 'confirmed', quantity: 1, amount, reason? }`. Type is `added` or `canceled`. |
| `protectionClaims[]` | `{ id, planId, orderId, orderItemId, actorId, createdAt, status, issueType, description, quantity: 1 }`. Status is `submitted`, `in_service`, or `closed`. |
| `returns[]` | `{ id, orderId, actorId, createdAt, status, method, storeId?, mailReference?, lines[], refundEstimate, canceledAt?, canceledBy? }`. Status is `requested`, `completed`, or `canceled`. Method is `store` or `mail`. |

- Order items use `{ id, name, sku?, category?, imageKey?, quantity, unitPrice, canceledQuantity?, eligibility?, protectionOffer? }`. Eligibility uses `{ returnable?, mailReturnable?, priceMatchable?, returnBy?, priceMatchBy?, addProtectionBy? }`. Offers use `{ name, termMonths, price, coverage[] }`.
- Pickup contacts use `{ name, email, phone }`. Shipments use `{ carrier?, trackingNumber?, events?: [{ status, at?, location? }] }`.
- Cancellation and return lines use `{ orderItemId, quantity, unitPrice, refundEstimate }`. Return lines also include `reason`. Estimates use the original pre-tax line price.
- `actorId` and `canceledBy` reference `account.id`. Store destinations reference `stores[].id`. All purchase-related records reference `orders[].id` and where applicable `orders[].items[].id`. Plans have a separate display number. Their events and claims reference `protectionPlans[].id`.
- A return requires an available destination. A matching store ID is required for store returns. Mail requires `mailReturnable: true` on each selected line.

### Default IDs

| Key | Seed IDs |
| --- | --- |
| `account` | `acct-001` |
| `stores` | `store-001` through `store-006` |
| `orders` | `ord-1001` through `ord-1042`, with display numbers `BBY01-800001` through `BBY01-800042` and line IDs such as `line-1001-01` |
| `orderEvents` | `oe-1001` through `oe-1024` |
| `priceMatchRequests` | `pm-1001` through `pm-1024` |
| `protectionPlans` | `plan-1001` through `plan-1026`, with display numbers `GSP-41001` through `GSP-41026` |
| `protectionPlanEvents` | `pe-added-<planId>` for all seeded plans and `pe-canceled-<planId>` for plans `plan-1008`, `plan-1015`, and `plan-1022` |
| `protectionClaims` | `claim-1001` through `claim-1024` |
| `returns` | `ret-1001` through `ret-1026` |

## Minimal Inject Example

```json
{
  "account": { "name": "Taylor Lane" },
  "stores": [],
  "orders": [],
  "orderEvents": [],
  "priceMatchRequests": [],
  "protectionPlans": [],
  "protectionPlanEvents": [],
  "protectionClaims": [],
  "returns": []
}
```

## Observable State Changes

| Confirmed action | Persisted paths |
| --- | --- |
| Change pickup person | Replace `orders[].pickupContact`, set `orders[].updatedAt`, and append one `orderEvents[]` entry of type `pickup_contact_changed` with contact snapshots. |
| Cancel items | Increment selected `orders[].items[].canceledQuantity`, set `orders[].updatedAt`, set `orders[].status` to `canceled` once all units are canceled, and append one `orderEvents[]` entry of type `items_canceled` with lines, reason, and estimate. |
| Submit price match | Append one `priceMatchRequests[]` entry with status `submitted`, offer evidence, quantity, and requested difference. |
| Add protection | Append one active `protectionPlans[]` entry and one linked `protectionPlanEvents[]` entry of type `added` with the quote amount. |
| Request service | Append one linked `protectionClaims[]` entry with status `submitted`. |
| Cancel plan | Set `protectionPlans[].status` and `protectionPlans[].canceledAt`, and append one linked `protectionPlanEvents[]` entry of type `canceled` with reason and amount zero. |
| Request return | Append one `returns[]` entry with status `requested`, per-line reasons and estimates, aggregate estimate, and either `storeId` or `mailReference`. |
| Cancel return | Set `returns[].status` to `canceled` and set `returns[].canceledAt` and `returns[].canceledBy`. Released quantities are derived from status. |

Views, filters, receipts, tracking, drafts, and idle time leave business state unchanged. A confirmed action uses one timestamp across its records.

