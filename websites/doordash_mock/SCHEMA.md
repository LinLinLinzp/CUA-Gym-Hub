# doordash_mock Schema

**Base URL** `http://localhost:5316/`  
**Go endpoint** `GET /go?sid=<sid>` returns `{initial_state, current_state, state_diff}`.  
**Inject** `POST /post?sid=<sid>` with `{"action":"set","state":{...}}`. Open the site with the same SID in a fresh browser context to load the injected world.  
**Reset** `POST /post?sid=<sid>` with `{"action":"reset"}` restores the server’s original baseline for that SID.

## State Schema

Read records by ID in `current_state`. `state_diff` reports changes by top-level key. Prices and amounts are integer USD cents. Timestamps use ISO 8601 UTC. `?` marks an optional field. Optional membership dates and plan IDs can be null.

| Key | Type | Record fields |
| --- | --- | --- |
| `account` | Object | `id`, `name`, `paymentMethodId`, `paymentLabel`, `deliveryAddress`. |
| `merchants` | Array | `id`, `name`, `cuisine`, `menu[]` with `id`, `name`, `unitPriceCents`. |
| `orders` | Array | `id`, `merchantId`, `merchantName`, `createdBy`, `createdAt`, `status` (`placed`, `preparing`, `delivered`, `canceled`), `items[]`, `totals`, `deliveryAddress?`, `paymentLabel?`, `sourceOrderId?`, `groupOrderId?`, `updatedAt?`, `canceledAt?`, `canceledBy?`, `deliveredAt?`. |
| `groupOrders` | Array | `id`, `name`, `merchantId`, `merchantName`, `hostId`, `inviteToken`, `createdBy`, `createdAt`, `status` (`open`, `closed`, `placed`, `canceled`), `participants[]`, `deadlineAt?`, `closedAt?`, `canceledAt?`, `placedAt?`, `orderId?`, `updatedAt?`, `updatedBy?`. |
| `refunds` | Array | `id`, `orderId`, `merchantName`, `createdBy`, `createdAt`, `status` (`requested`, `issued`, `declined`), `reason` (`missing_item`, `incorrect_item`), `method` (`original_payment`, `doordash_credit`), `items[]` with `orderItemId`, `name`, `quantity`, `amountCents`. Refund-level fields also include `totalCents`, `note?`, and `resolvedAt?`. |
| `dashpass` | Object | `id`, `accountId`, `status` (`active`, `paused`, `canceled`, `inactive`), `planId` (`monthly`, `annual`, null), `paymentMethodId`, `paymentLabel`, `createdAt`, `updatedAt`, `pendingPlanId?`, `nextBillingAt?`, `accessUntil?`, `pausedAt?`, `canceledAt?`, `cancelReason?`. |
| `dashpassEvents` | Array | `id`, `membershipId`, `type` (`enrolled`, `changed_plan`, `paused`, `resumed`, `canceled`, `reactivated`), `actorId`, `createdAt`, `effectiveAt`, `previousStatus`, `nextStatus`, `previousPlanId`, `nextPlanId`, `reason?`. |
| `dashpassPayments` | Array | `id`, `membershipId`, `eventId?`, `planId`, `status` (`paid`), `amountCents`, `paymentMethodId`, `paymentLabel`, `periodStart`, `periodEnd`, `createdAt`, `actorId`. |

Receipt and cart lines carry `id`, `menuItemId?`, `name`, `quantity`, and `unitPriceCents`. A receipt line for a group can also carry `participantId`. Receipt totals contain `subtotalCents`, `deliveryFeeCents`, `serviceFeeCents`, `taxCents`, `tipCents`, and `totalCents`. Group participant records contain `id`, `name`, `role` (`host` or `guest`), `joinedAt`, and `items[]`.

### Default IDs

- Account `acct-maya`, payment method `pay-visa`, membership `DP-1`.
- Merchants `m-juniper`, `m-copper`, `m-miso`, `m-olive`, `m-luna`, `m-ember`, `m-lotus`, and `m-saffron`. Menu items use `mi-<merchant suffix>-1` through `mi-<merchant suffix>-3`.
- Orders `DD-240081` through `DD-240118`, group orders `GO-1007` through `GO-1030`, and refunds `RF-1101` through `RF-1124`.
- Membership events `DPE-100` through `DPE-124` and charge records `DPP-100` through `DPP-123`.

## Minimal Inject Example

This `/post` body replaces order history with one placed order and clears the group and refund lists. Omitted top-level keys use seeded defaults on client load.

```json
{
  "action": "set",
  "state": {
    "orders": [
      {
        "id": "DD-injected",
        "merchantId": "m-juniper",
        "merchantName": "Juniper Kitchen",
        "createdBy": "acct-maya",
        "createdAt": "2026-11-18T18:00:00.000Z",
        "status": "placed",
        "items": [{"id": "line-1", "menuItemId": "mi-juniper-1", "name": "Ginger Rice Bowl", "quantity": 1, "unitPriceCents": 1395}],
        "totals": {"subtotalCents": 1395, "deliveryFeeCents": 0, "serviceFeeCents": 0, "taxCents": 0, "tipCents": 0, "totalCents": 1395}
      }
    ],
    "groupOrders": [],
    "refunds": []
  }
}
```

## Observable State Changes (for LLM evaluation)

| User action | Exact writes |
| --- | --- |
| Place reorder | Append one `orders[]` record with `id`, `merchantId`, `merchantName`, `createdBy`, `createdAt`, `status: placed`, adjusted `items`, recalculated `totals`, available `deliveryAddress` and `paymentLabel`, and `sourceOrderId`. |
| Cancel placed order | Set `orders[].status: canceled`, `updatedAt`, `canceledAt`, and `canceledBy`. |
| Start group | Append one `groupOrders[]` record with `id`, `name`, `merchantId`, `merchantName`, `hostId`, `inviteToken`, `createdBy`, `createdAt`, `status: open`, optional `deadlineAt`, and `participants` containing the host with an empty cart. |
| Join group | Append a guest to `groupOrders[].participants`, then set `updatedAt` and `updatedBy` to the guest ID. |
| Save cart | Replace the editing participant’s `items` and set `groupOrders[].updatedAt` and `updatedBy` to the participant ID. Zero removes the selected menu item from the cart. |
| Close group | Set `groupOrders[].status: closed`, `closedAt`, `updatedAt`, and `updatedBy`. |
| Cancel group | Set `groupOrders[].status: canceled`, `canceledAt`, `updatedAt`, and `updatedBy`. |
| Place group order | In one write, set the group’s `status: placed`, `orderId`, `placedAt`, `updatedAt`, and `updatedBy`. Append one standard placed order with `groupOrderId` and participant IDs on its item snapshots. |
| Request refund | Append one `refunds[]` record with `id`, `orderId`, `merchantName`, `createdBy`, `createdAt`, `status: requested`, `reason`, `method`, optional `note`, `items`, and `totalCents`. Requested and issued refunds reserve receipt quantities. |
| Change plan | Set `dashpass.pendingPlanId` to the selected next plan, or null when keeping the current plan. Append a `changed_plan` event with `nextPlanId` set to the selection and `effectiveAt` set to the scheduled charge date. |
| Pause | Set `dashpass.status: paused`, `pausedAt`, `nextBillingAt: null`, and `accessUntil` to the paid period end. Append a `paused` event. |
| Cancel membership | Set `dashpass.status: canceled`, `canceledAt`, `cancelReason`, `pendingPlanId: null`, `nextBillingAt: null`, and `accessUntil` to the paid period end. Append a `canceled` event with `reason`. |
| Resume or reactivate paid access | Set `dashpass.status: active`, `pausedAt: null`, `canceledAt: null`, `cancelReason: null`, and `nextBillingAt` and `accessUntil` to the retained paid period end. Append a `resumed` or `reactivated` event. |
| Enroll or reactivate expired access | Set `dashpass.status: active`, `planId`, `pendingPlanId: null`, `paymentMethodId`, `paymentLabel`, `pausedAt: null`, `canceledAt: null`, `cancelReason: null`, and `accessUntil` and `nextBillingAt` to the purchased period end. Append an `enrolled` or `reactivated` event and one `dashpassPayments[]` record with all charge fields and its `eventId`. |
| Navigate, copy invite, search, filter, open or dismiss a review, or encounter invalid input | Zero business writes. |

Every DashPass mutation also writes `dashpass.updatedAt` and ensures `id`, `accountId`, and `createdAt` are populated. Each membership event writes the event fields above, with `effectiveAt` equal to `createdAt` except for a plan change. Active plans and access labels reflect the stored cycle and the current browser clock. Date boundaries produce zero writes.
