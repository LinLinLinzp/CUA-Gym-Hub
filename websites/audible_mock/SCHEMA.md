# audible_mock Schema

**Base URL**: `http://localhost:5373/`  
**Go Endpoint**: `GET /go?sid=<sid>` → `{initial_state, current_state, state_diff}`  
**Inject**: `POST /post?sid=<sid>` with body `{"action":"set","state":{...}}`  
**Reset**: `POST /post?sid=<sid>` with body `{"action":"reset"}`

## State Schema

The nine keys below form the default world. Dates are UTC ISO 8601 strings, and IDs are strings. Every successful action preserves unrelated top-level keys and existing fields on records it updates. Injected arrays replace the corresponding defaults. Optional fields may be absent.

| Key | Type | Fields and values |
| --- | --- | --- |
| `account` | Object | `id`, `displayName`, `plan`, `membershipStatus` (`active`, `paused`, `cancelled`), `canReturn` (boolean). |
| `titles` | Array | `id`, `title`, `author`, optional `narrator`, `genre`, `durationMinutes` (integer), `description`, and `coverPath` (local image URL). `included` and `creditEligible` are booleans. |
| `library` | Array | `id`, `titleId`, `actorId`, `source` (`included`, `purchased`), optional `purchaseId`, `status` (`active`, `removed`, `returned`), `listeningStatus` (`not_started`, `in_progress`, `finished`), `progressPercent` (integer 0–100), `createdAt`, `updatedAt`. |
| `libraryActivity` | Array | `id`, `libraryId`, `titleId`, `actorId`, `action` (`added_included`, `removed_included`, `marked_finished`, `marked_unfinished`, `acquired`, `returned`), resulting `status`, `listeningStatus`, `progressPercent`, `quantity` (integer 1), `createdAt`, and optional `purchaseId` and `returnId`. |
| `wishlist` | Array | `id`, `titleId`, `actorId`, `status` (`saved`, `removed`, `purchased`), `createdAt`, `updatedAt`, optional `purchaseId`. |
| `credits` | Array | `id`, `actorId`, `source` (`membership`, `return`), `quantity` (integer 1), `status` (`available`, `spent`), `createdAt`, optional `expiresAt`, `spentAt`, `purchaseId`, and `returnId`. Expiration is derived. |
| `creditTransactions` | Array | `id`, `creditId`, `actorId`, `type` (`issued`, `redeemed`, `refund`), `status` (`completed`), `quantity` (integer 1), `amount` (integer 1 for issuance and refund, −1 for redemption), `createdAt`, optional `titleId`, `purchaseId`, and `returnId`. |
| `purchases` | Array | `id`, `titleId`, `actorId`, `status` (`completed`, `returned`), `paymentMethod` (`credit`, `cash`), `quantity` (integer 1), `amountCredits` (integer 0 or 1), `amountUsd` (number), `createdAt`, optional `creditId`, `returnId`, `returnedAt`, and `selfServiceBlocked` (boolean). |
| `returns` | Array | `id`, `purchaseId`, `actorId`, `status` (`completed`), `refundCreditId`, `amountCredits` (integer 1), `amountUsd` (number 0), `quantity` (integer 1), `createdAt`, and `items[]` containing `titleId`, `purchaseId`, `quantity`, `amountCredits`, and `amountUsd`. |

### Default IDs

- Member `member-001` is Maya Chen.
- Catalog titles run from `title-001` through `title-072`. Library entries run from `lib-001` through `lib-032`, and Wish List entries run from `wish-001` through `wish-026`.
- Orders run from `order-001` through `order-026`. `order-001` is a recent credit order at the seed reference date, `order-002` is blocked, `order-004` is outside the return window, and `order-005` is a cash order.
- Seed refunds `return-012` and `return-019` refer to the matching order suffixes and issue credits `credit-031` and `credit-032`. Credit lots `credit-027` through `credit-029` are available at the seed reference date, and `credit-030` is expired.
- Library events use `lib-event-001` through `lib-event-096` with gaps. Credit transactions use `credit-txn-001` through `credit-txn-053` with gaps.

## Minimal Inject Example

Send this body to `POST /post?sid=<fresh-sid>` before opening the app with that SID. It gives Browse one included title and starts with empty account collections. The default account supplies the actor ID for an Add to Library action.

```json
{
  "action": "set",
  "state": {
    "titles": [{"id": "injected-title-001", "title": "A Winter Atlas", "included": true}],
    "library": [],
    "libraryActivity": [],
    "wishlist": [],
    "credits": [],
    "creditTransactions": [],
    "purchases": [],
    "returns": []
  }
}
```

## Observable State Changes (for LLM evaluation)

Every successful row below sends a single `set_current` POST with a complete snapshot. New records get unique IDs, the signed-in account's ID as `actorId`, and the same action timestamp as `createdAt`. All other timestamps written by the same action use that timestamp unless an expiration is explicitly computed.

| User action | Exact writes |
| --- | --- |
| Mark finished | Update the active `library[]` row's `listeningStatus` to `finished`, `progressPercent` to 100, and `updatedAt`. Append `libraryActivity[]` with the Library and title IDs, resulting values, quantity 1, and `action: marked_finished`. |
| Mark unfinished | Update the active `library[]` row to `listeningStatus: not_started`, `progressPercent: 0`, and set `updatedAt`. Append `libraryActivity[]` with the Library and title IDs, resulting values, quantity 1, and `action: marked_unfinished`. |
| Add an included title | Append an active `library[]` row with `source: included`, the title ID, zero progress, `listeningStatus: not_started`, and `updatedAt`, or reactivate the most recently removed included row and set `updatedAt` while preserving progress. Append `libraryActivity[]` with `action: added_included`, the row and title IDs, quantity 1 and the resulting values. |
| Confirm removal of an included title | Set the active included `library[]` row's `status` to `removed` and stamp `updatedAt`. Append `libraryActivity[]` with `action: removed_included`, the row and title IDs, quantity 1 and the resulting values. |
| Save to Wish List | Append a fresh `wishlist[]` row with the title ID, `status: saved`, and `updatedAt`. |
| Remove from Wish List | Set the active `wishlist[]` row's `status` to `removed` and stamp `updatedAt`. |
| Confirm purchase with one credit | Set the selected `credits[]` row's `status` to `spent`, link the order through `purchaseId`, and stamp `spentAt`. Append a `creditTransactions[]` redemption with amount −1 and the credit, title, and purchase IDs. Append a completed `purchases[]` order with amount 1 credit and USD 0. Append an active purchased `library[]` row linked to the order with zero progress, `listeningStatus: not_started`, and `updatedAt`. Append `libraryActivity[]` with `action: acquired` and those Library, title and order IDs. If saved, convert the active `wishlist[]` row to `purchased`, set its `purchaseId`, and stamp `updatedAt`. Each new record that holds a quantity uses 1. |
| Confirm return of a credit order | Set the `purchases[]` row's `status` to `returned`, link `returnId`, and stamp `returnedAt`. Append a completed `returns[]` refund with the order ID and new `refundCreditId`, amount 1 credit and USD 0, and an item with those amounts and the order and title IDs. Append a new available `credits[]` row with `source: return`, `returnId`, and `expiresAt` one UTC calendar year later, clamped to the final day of February for leap-day issuance. Append a `creditTransactions[]` refund with amount +1 and the credit, title, order and return IDs. If an active purchased entitlement matches the order, set its `library[]` status to `returned`, stamp `updatedAt`, and append `libraryActivity[]` with `action: returned` and the Library, title, order and return IDs. Refund and item quantities, the new credit, the ledger row, and the activity each use 1. |

Credit selection uses the earliest expiration, then oldest issuance, then ID. A credit with no expiration sorts after dated credits. Issuance at or before the current instant qualifies, and expiration at or before the instant does not. A completed credit order can be returned through 365 elapsed days, inclusive, subject to membership eligibility, per-order restrictions and existing returns. Existing spent credits remain on the ledger.

The unchanged Harbor client and middleware implement baseline loading, `?sid=` isolation, and JSON inspection at `/go`. Use a fresh SID for fixture injection because the browser caches loaded state by SID. `set` preserves an existing initial snapshot. `set_current` changes the current snapshot and initializes a missing baseline. `reset` restores the current snapshot from the stored baseline or defaults. Controls that only change the view, denied actions, and canceled confirmations do not save.
