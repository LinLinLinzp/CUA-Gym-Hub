# grubhub_mock Schema

**Base URL**: `http://localhost:5317/`  
**Go Endpoint**: `GET /go?sid=<sid>` → `{initial_state, current_state, state_diff}`  
**Inject**: `POST /post?sid=<sid>` with body `{"action":"set","state":{...}}`  
**Reset**: `POST /post?sid=<sid>` with body `{"action":"reset"}`

The Harbor API exposes plain JSON grouped by session. IDs are strings, amounts are USD numbers, quantities are positive integers, and timestamps are UTC ISO 8601 strings. The [state model](assets/data_model.md) defines eligibility and cent allocation.

On first browser load, injected arrays replace defaults and injected objects merge with defaults. Use a fresh session ID for a new injection so the browser loads it from the API. In the local template, `reset` restores current state to the stored baseline.

## State Schema

| Key | Type | Description |
| --- | --- | --- |
| `account` | object | `{ id, name, email, addresses: Address[], paymentMethods: Payment[], defaultAddressId?, defaultPaymentId? }` |
| `restaurants` | array | `{ id, name, cuisine, neighborhood, timeZone, tile?, deliveryFee, serviceFee, taxRate, deliveryHours: Hours[] }` |
| `menuItems` | array | `{ id, restaurantId, name, category, description?, unitPrice, available }` |
| `cart` | object | `{ restaurantId, sourceOrderId, items: CartLine[], updatedAt, updatedBy }`. Restaurant and source IDs are null for a cleared cart. Update fields are null in the initial empty bag. |
| `orders` | array | `{ id, restaurantId, restaurantName?, actorId, createdAt, currency, fulfillment, status, timing, items: OrderLine[], totals: Totals, address: Address, payment: Payment, sourceOrderId?, scheduledDeliveryId?, deliveredAt?, cancelledAt? }`. Fulfillment is `delivery`, timing is `asap` or `scheduled`, and status is `placed`, `scheduled`, `delivered` or `cancelled`. |
| `scheduledDeliveries` | array | `{ id, orderId, status, timeZone, windowStartAt, windowEndAt, actorId, createdAt, confirmedAt?, updatedAt?, updatedBy?, cancelledAt?, events: ScheduleEvent[] }`. Status is `scheduled`, `fulfilled` or `cancelled`. |
| `refunds` | array | `{ id, orderId, status, scope, reason, notes?, resolvedAt?, lineItems: RefundLine[], amount, currency, payment?: Payment, actorId, createdAt }`. Status is `requested`, `approved`, `refunded` or `denied`. Scope is `items` or `full_order`. Reasons are `missing_item`, `wrong_item`, `food_quality`, `delivery_issue` and `other`. |

| Embedded type | Fields |
| --- | --- |
| Address | `id, label, street, city, state, postalCode, unit?, instructions?` |
| Payment | `id, brand, last4` |
| Hours | `days` (weekday numbers, Sunday is 0), `opensAt, closesAt` (local HH:mm) |
| CartLine | `menuItemId, name, quantity, unitPrice` |
| OrderLine | `id, name, menuItemId?, quantity, unitPrice, subtotal, chargedAmount` |
| Totals | `subtotal, deliveryFee, serviceFee, tax, tip, total` |
| ScheduleEvent | `id, actorId, createdAt, type, from?, to?`. Type is `created`, `rescheduled` or `cancelled`. Each window has `windowStartAt, windowEndAt`. |
| RefundLine | `orderItemId, quantity, amount` |

### Default IDs

- Diner `diner-001`, addresses `address-home` and `address-work`, payments `payment-visa` and `payment-mastercard`.
- Restaurants `restaurant-001`–`restaurant-024`, menu items `menu-001`–`menu-120`, orders `order-001`–`order-060`.
- Deliveries `schedule-001`–`schedule-024` link to orders `order-037`–`order-060` in sequence. Refunds `refund-001`–`refund-024` include the partial refund on `order-001`.

## Minimal Inject Example

```json
{
  "orders": [],
  "scheduledDeliveries": [],
  "refunds": []
}
```

## Observable State Changes (for LLM evaluation)

| User Action | State Field Changed |
| --- | --- |
| Add or remove a bag item, change a quantity, or confirm bag replacement | `cart.{restaurantId,sourceOrderId,items,updatedAt,updatedBy}`. New lines snapshot menu ID, name and price. Starting an unrelated bag or clearing the bag nulls the source order ID. An empty bag also clears the restaurant ID. |
| Confirm reorder | `cart.{restaurantId,sourceOrderId,items,updatedAt,updatedBy}`. Lines retain available quantities with current menu names and prices. |
| Place ASAP order | Append `orders[].{id,restaurantId,restaurantName?,actorId,createdAt,currency,fulfillment,status,timing,items,totals,address,payment,sourceOrderId?}` with `status: placed`, `timing: asap`. Clear `cart.{restaurantId,sourceOrderId,items}` and set `cart.{updatedAt,updatedBy}` in the same commit. |
| Place scheduled order | Append the same order fields as ASAP, with `status: scheduled`, `timing: scheduled` and `scheduledDeliveryId`. Append `scheduledDeliveries[].{id,orderId,status,timeZone,windowStartAt,windowEndAt,actorId,createdAt,events}` with `status: scheduled` and a `created` event with its `to` window. Clear and stamp the same cart fields in the same commit. |
| Reschedule delivery | Update `scheduledDeliveries[].{windowStartAt,windowEndAt,updatedAt,updatedBy}`. Append a `rescheduled` event with `from` and `to` windows. |
| Cancel scheduled delivery | Update `scheduledDeliveries[].{status,cancelledAt,updatedAt,updatedBy}` and append a `cancelled` event with its `from` window. Set the linked `orders[].{status,cancelledAt}` in the same commit. |
| Submit refund request | Append `refunds[].{id,orderId,status,scope,reason,notes?,lineItems,amount,currency,payment?,actorId,createdAt}` with `status: requested`. The line fields are `lineItems[].{orderItemId,quantity,amount}`. |

Read-only UI and dismissed or invalid actions produce no business-state changes. A successful transaction sends one `set_current` with the complete state.
