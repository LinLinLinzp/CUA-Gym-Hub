# Chewy_mock Schema

**Base URL** · `http://localhost:5342/`  
**Go Endpoint** · `GET /go?sid=<sid>` returns `{initial_state, current_state, state_diff}`.  
**Inject** · `POST /post?sid=<sid>` with `{"action":"set","state":{...}}`. A fresh browser session merges injected objects with defaults and uses injected arrays as supplied.  
**Reset** · `POST /post?sid=<sid>` with `{"action":"reset"}` restores the current server state to the stored baseline or default seed. Use a fresh browser context to read it without cached state.

The default seed is fixed relative to **November 18, 2026**. IDs in workflow records are strings. Money is USD as a JSON number, calculated in integer cents. Quantities are positive whole numbers. Timestamps use ISO 8601 and calendar dates use `YYYY-MM-DD`.

## State Schema

| Top-level key | Fields |
| --- | --- |
| `account` | `id`, `firstName`, `lastName`. |
| `addresses[]` | `id`, `label`, `recipient`, `line1`, optional `line2`, `city`, `region`, `postalCode`. |
| `paymentMethods[]` | `id`, `brand`, `last4`, `label`. |
| `products[]` | `id`, `name`, `category`, `variant`, `unitPrice`, `autoshipEligible`, `returnable`, optional `imageKey`. |
| `autoships[]` | `id`, `name`, `status` (`active`, `cancelled`), `nextShipDate`, `frequencyWeeks`, `addressId`, `paymentMethodId`, `items[]` (item snapshots), `actorId`, `createdAt`, optional `updatedAt`, `updatedBy`, `cancelledAt`. |
| `autoshipEvents[]` | `id`, `autoshipId`, `action`, `actorId`, `createdAt`, `previous`, `next`, optional `orderId`. Item event snapshots contain `itemId`, `productId`, `quantity` and `unitPrice`. Creation uses a null `previous` and removal uses a null `next`. |
| `orders[]` | `id`, `orderNumber`, `status` (`processing`, `shipped`, `delivered`, `cancelled`), `items[]` (item snapshots with `lineTotal`), `subtotal`, `shipping`, `tax`, `total`, optional `address` snapshot, `paymentLabel`, `autoshipId`, `sourceOrderId`, `deliveredAt`, `updatedAt`, `updatedBy`, `cancelledAt`, `carrier`, `trackingNumber`, and `trackingEvents[]` (`label`, `location`, `createdAt`). Includes `actorId` and `createdAt`. |
| `orderEvents[]` | `id`, `orderId`, `action` (`cancelled`, `reordered`), `actorId`, `createdAt`, `newStatus`, plus `previousStatus` for cancellation or `sourceOrderId` for reorder. |
| `pets[]` | `id`, `name`, `species`, optional `breed`, `birthday`, `weightLbs`, `notes`, `imageKey`, `status` (`active`, `removed`), `actorId`, `createdAt`, optional `updatedAt`, `updatedBy`, `removedAt`. Forms save omitted text fields as empty strings and an omitted weight as null. |
| `petEvents[]` | `id`, `petId`, `action` (`created`, `updated`, `removed`), `actorId`, `createdAt`, `previous`, `next`. Create events use a null `previous` and include profile fields and status in `next`. Edit events snapshot the six editable fields. Remove events snapshot status with `removedAt` in `next`. |
| `returns[]` | `id`, `returnNumber`, `orderId`, `status` (`requested`, `in_transit`, `refunded`), `refundMethod` (`original_payment`, `account_credit`), `items[]`, `itemsAmount`, `shippingRefund`, `taxRefund`, `refundAmount`, `actorId`, `createdAt`, optional `refundedAt`, `instructions`. Item records contain `orderItemId`, `productId` when available, `name`, `quantity`, `reason`, `unitPrice`, and `amount`. |

Item snapshots in plans and orders contain `id`, `productId`, `name`, `quantity`, `unitPrice`, optional `variant`, `imageKey`, and `returnable`. Orders copy these from the source and assign fresh order-line IDs. The actor for all successful changes is `account.id`, with a fallback to `account` for a missing ID. An action uses the same timestamp and actor on each record it writes.

### Default IDs

- Account · `acct-maya`
- Addresses · `addr-home`, `addr-cabin`, `addr-foster`
- Payment methods · `pay-visa`, `pay-mastercard`, `pay-discover`
- Products · `prod-001` through `prod-048`
- Autoships, pets, and returns · `as-001` through `as-024`, `pet-001` through `pet-024`, and `ret-001` through `ret-024`
- Orders · `ord-001` through `ord-048`

## Minimal Inject Example

Send this state in the `state` field of the injection request to open an account with empty collections.

```json
{
  "account": { "id": "acct-test", "firstName": "Avery", "lastName": "Reed" },
  "addresses": [],
  "paymentMethods": [],
  "products": [],
  "autoships": [],
  "autoshipEvents": [],
  "orders": [],
  "orderEvents": [],
  "pets": [],
  "petEvents": [],
  "returns": []
}
```

## Observable State Changes (for LLM evaluation)

| User action | Exact writes |
| --- | --- |
| Save ship date | `autoships[].nextShipDate`, `updatedAt`, `updatedBy`. Adds `autoshipEvents[]` with `action: date_changed` and before/after `nextShipDate`. |
| Save frequency | `autoships[].frequencyWeeks`, `updatedAt`, `updatedBy`. Adds `frequency_changed` with before/after `frequencyWeeks`. |
| Confirm skip | `autoships[].nextShipDate`, `updatedAt`, `updatedBy`. Adds `shipment_skipped` with before/after `nextShipDate`. The new date is one cadence after the later of today and the scheduled date. Skip is available when that date fits `YYYY-MM-DD`. |
| Cancel Autoship | `autoships[].status: cancelled`, `cancelledAt`, `updatedAt`, `updatedBy`. Adds `cancelled` with before/after status and new cancellation timestamp. |
| Add product / save quantity / confirm removal | `autoships[].items[]` plus `updatedAt`, `updatedBy`. Adds `item_added`, `item_quantity_changed`, or `item_removed` with the applicable before/after item snapshots. |
| Place order now | Inserts a `processing` order in `orders[]` with `autoshipId`, item, address and payment snapshots, totals, actor and timestamp. Updates `autoships[].nextShipDate` to today plus one cadence with `updatedAt`, `updatedBy`. Adds `ordered_now` with `orderId` and before/after dates, in the same save. |
| Save address / payment | `autoships[].addressId` or `paymentMethodId` plus `updatedAt`, `updatedBy`. Adds `address_changed` or `payment_changed` with before/after IDs. |
| Confirm order cancellation | `orders[].status: cancelled`, `cancelledAt`, `updatedAt`, `updatedBy`. Adds `orderEvents[]` with the order ID, `action: cancelled`, `previousStatus: processing`, and `newStatus: cancelled`. |
| Place reorder | Inserts a `processing` order in `orders[]` with `sourceOrderId`, fresh line IDs, purchase snapshots, totals, actor and timestamp. Adds `orderEvents[]` with `action: reordered`, new order ID, source order ID, and `newStatus: processing`. |
| Add a pet | Inserts an active record in `pets[]` with profile fields, actor and timestamp. Adds a `created` event to `petEvents[]`. |
| Save profile | Writes `pets[].name`, `species`, `breed`, `birthday`, `weightLbs`, `notes`, `updatedAt`, `updatedBy`. Adds an `updated` event with profile values before and after. |
| Confirm profile removal | `pets[].status: removed`, `removedAt`, `updatedAt`, `updatedBy`. Adds a `removed` event with before/after status and removal timestamp. |
| Submit return request | Inserts one `requested` record in `returns[]` with the linked order and lines, quantities, reasons, refund destination, totals, actor and timestamp. The order uses these entries to calculate remaining quantity and display request statuses. |
| Search, filter, sort, tracking, review, or idle | No persisted business writes. Forms with validation errors and saves with identical values also write nothing. |

Returns use a 365-day purchase window for delivered orders, per-line returnability, and quantities from existing linked requests. Each request refunds the difference between the rounded cumulative tax on returned merchandise and tax already refunded, with a minimum of zero. Shipping is refunded only when submissions cover the entire order. Return status changes only through state injection or a new request.

