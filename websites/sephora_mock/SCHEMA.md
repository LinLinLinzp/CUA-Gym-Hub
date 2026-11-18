# sephora_mock Schema

**Base URL**: `http://localhost:5343/`  
**Go Endpoint**: `GET /go?sid=<sid>` → `{initial_state, current_state, state_diff}`  
**Inject**: `POST /post?sid=<sid>` with body `{"action":"set","state":{...}}`  
**Reset**: `POST /post?sid=<sid>` with body `{"action":"reset"}`

The app loads the `sephora` state before displaying any account route. Read the stored world with `GET /state?sid=<sid>`. Use a fresh `sid` for each injection. Arrays supplied by the runtime replace fixture arrays, while objects merge over fixture defaults on first browser load. The shared API retains the first submitted baseline and resets current state to that baseline. The baseline for a partial injection is the injected object, so `/go` can show defaults added during bootstrap. Compare current state immediately before and after a business action when using partial injections.

## State Schema

| Key | Type | Description |
| --- | --- | --- |
| `account` | object | `id`, `firstName`, `lastName`, optional `email` |
| `orders` | array | Order records |
| `orderEvents` | array | Order event records |
| `beautyInsider` | object | `accountId`, `tier`, integer `pointsBalance`, optional `memberSince` |
| `pointsTransactions` | array | Points transaction records |
| `rewards` | array | Reward offer records |
| `redemptions` | array | Redemption records |
| `returns` | array | Return request records |

IDs, statuses, actor IDs, currency codes, and ISO UTC timestamps are strings. Prices and refunds are numeric currency amounts. Points and quantities are integers. The app accepts two-decimal strings for injected monetary values.

## Record shapes

| Record | Fields |
| --- | --- |
| Order | `id`, `orderNumber`, `accountId`, `placedAt`, `status`, `currency`, `subtotal`, `discount`, `tax`, `shipping`, `total`. Optional `fulfillmentMethod`, `payment`, `items[]`, `shipments[]`, `deliveredAt`, `cancelUntil`, `cancelledAt`. |
| Payment summary | `type`, optional `brand`, `last4`. |
| Order line | `id`, `sku`, `brand`, `name`, `quantity`, `unitPrice`, `refundableUnitAmount`, `returnable`. Optional `variant`, `category`, `returnEligibleUntil`. A refundable unit amount includes allocated discounts and tax. |
| Shipment | `id`, `status`, optional `carrier`, `trackingNumber`, `estimatedDeliveryAt`, `lineIds[]`, `events[]`. An event has `status`, `at`, optional `location`. |
| Order event | `id`, `orderId`, `type`, `status`, numeric `amount`, `currency`, `items[]` with `orderLineId` and `quantity`, `actorId`, `createdAt`. |
| Points transaction | `id`, `accountId`, `type`, signed `pointsDelta`, `balanceAfter`, `description`, `actorId`, `createdAt`. Optional `orderId`, `returnId`, `redemptionId`. Types include `opening_balance`, `earn`, `bonus`, `redeem` and `return_adjustment`. |
| Reward | `id`, `name`, `pointsCost`, `stock`, Boolean `requiresPurchase`. Optional `description`, `eligibleTiers[]`. |
| Redemption | `id`, `accountId`, `rewardId`, `rewardName`, `pointsSpent`, `quantity`, `status`, `pointsTransactionId`, `actorId`, `createdAt`. |
| Return request | `id`, `returnNumber`, `orderId`, `accountId`, `status`, `method`, `refundMethod`, `items[]`, `estimatedRefund`, `currency`, `actorId`, `createdAt`. Optional `timeline[]`, `refundedAmount`, `completedAt`, `pointsTransactionId`. A timeline entry has `status` and `at`. |
| Return line | `orderLineId`, `quantity`, `reasonCode`, numeric `estimatedRefund`, optional `refundedAmount`. Reason codes are `shade_mismatch`, `did_not_meet_expectations`, `damaged`, `wrong_item`, `changed_mind`, and `other`. |

### Default IDs

- Account and Beauty Insider membership use `member-avery`.
- Orders run from `ord-0001` through `ord-0036`. A line ID uses the order suffix and a two-digit line number, for example `line-0033-01`. `orderEvents` starts empty.
- Points transactions run from `pt-0001` through `pt-0040`. Historical redemptions run from `red-0001` through `red-0008`.
- Rewards are `reward-travel-ritual`, `reward-rose-lip`, `reward-night-repair`, `reward-fragrance-library`, `reward-cloud-cleanse`, `reward-silk-hair`, `reward-rouge-edit`, and `reward-mist-veil`.
- Returns run from `ret-0001` through `ret-0024`.

## Minimal Inject Example

Use this `state` value to open a synthetic account with no order history, point activity, offers, or returns.

```json
{
  "account": { "firstName": "Jules" },
  "beautyInsider": { "pointsBalance": 0 },
  "orders": [],
  "orderEvents": [],
  "pointsTransactions": [],
  "rewards": [],
  "redemptions": [],
  "returns": []
}
```

## Observable State Changes (for LLM evaluation)

| User action | Fields written |
| --- | --- |
| Confirm eligible order cancellation | Set matching `orders[].status = 'cancelled'` and `orders[].cancelledAt`. Append one `orderEvents[]` record with `id`, `orderId`, `type = 'cancelled'`, `status = 'cancelled'`, `amount`, `currency`, `items[].orderLineId`, `items[].quantity`, `actorId`, and `createdAt`. |
| Confirm eligible reward redemption | Subtract `pointsCost` from `beautyInsider.pointsBalance` and one from matching `rewards[].stock`. Append one `redemptions[]` record with `id`, `accountId`, `rewardId`, `rewardName`, `pointsSpent`, `quantity = 1`, `status = 'redeemed'`, `pointsTransactionId`, `actorId`, and `createdAt`. Append one `pointsTransactions[]` record with `id`, `accountId`, `type = 'redeem'`, `pointsDelta = -pointsSpent`, `balanceAfter`, `description`, `redemptionId`, `actorId`, and `createdAt`. |
| Submit valid mail return | Append one `returns[]` record with `id`, `returnNumber`, `orderId`, `accountId`, `status = 'submitted'`, `method = 'mail'`, `refundMethod = 'original_payment'`, `estimatedRefund`, `currency`, `actorId`, `createdAt`, and an initial `timeline[]` entry with `status = 'submitted'` and `at`. Each selected `items[]` entry writes `orderLineId`, `quantity`, `reasonCode`, and `estimatedRefund`. This reserves the selected units. |
| View, filter, track, edit a draft, open or dismiss confirmation, or reject an invalid action | No persisted fields change. |

Each successful action writes the full next state once with `set_current`. New records have unique IDs, use the current account ID as `actorId`, and share the same runtime ISO timestamp within the action. Return estimates include only selected units. Refunds and point reversals appear on completed fixture records.

## Default workflow fixtures

Use browser clock `2026-11-18T15:00:00.000Z` for time-sensitive fixture checks.

| Scenario | Fixture |
| --- | --- |
| Cancellable order | `ord-0036` / `SF-81240360`, placed at 14:50 UTC with a 15:45 UTC deadline |
| Split shipment | `ord-0035` / `SF-81240350`, one in transit and one preparing |
| Standalone reward | `reward-travel-ritual`, 1,000 points, four in stock, initial balance 1,840 |
| Returnable order | `ord-0032` / `SF-81240320`, with no existing requests |
| Partial return | `ord-0033`, `line-0033-01`, two purchased, one already requested in `ret-0024`, and one currently available |
| Expired delivery | `ord-0029` / `SF-81240290`, delivered with returnable items past their deadline |
| Completed return | `ret-0003`, linked by `pointsTransactionId` to a `return_adjustment` ledger record |
