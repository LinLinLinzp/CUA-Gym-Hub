# chase_mock Schema

**Base URL**: `http://localhost:5332/`  
**Go Endpoint**: `GET /go?sid=<sid>` → `{initial_state, current_state, state_diff}`  
**Inject**: `POST /post?sid=<sid>` with body `{"action":"set","state":{...}}`  
**Reset**: `POST /post?sid=<sid>` with body `{"action":"reset"}`

In the local Harbor template, reset restores the current snapshot from the saved baseline or the factory defaults. For a new injected world, use a fresh SID. The browser caches loaded state by SID.

## State Schema

The Harbor `/go?sid=…` endpoint returns `initial_state`, `current_state`, and a `state_diff` keyed by changed top-level collections. The following fields are in the initial and current snapshots. IDs are strings. Amounts and balances are USD numbers. Calendar dates are local `YYYY-MM-DD` strings. Audit timestamps are ISO UTC strings, and audit actor fields contain the signed-in profile ID.

| Top-level key | Shape |
| --- | --- |
| `profile` | Object with `id`, `firstName`, `lastName`. |
| `accounts` | Records with `id`, `productName`, `last4`, `currency`, `type` (`checking`, `savings`, `credit_card`), `status` (`open`, `closed`), and `currentBalance`. Optional `nickname`, `availableBalance` for deposits, `availableCredit` for cards, `updatedAt`, `updatedBy`. |
| `transactions` | Records with `id`, `accountId`, `description`, `category`, `transactionDate`, `status` (`posted`, `pending`), `type` (`purchase`, `deposit`, `refund`, `transfer`, `payment`, `fee`), and signed `amount`. Optional `merchant`, `transferId`, `createdAt`, `createdBy`. |
| `transfers` | Records with `id`, `fromAccountId`, `toAccountId`, `transferDate`, `amount`, `status` (`scheduled`, `completed`, `cancelled`), `createdAt`, `createdBy`. Optional `memo`, `cancelledAt`, `cancelledBy`. |
| `payees` | Records with `id`, `name`, `category`, `accountLast4`, `status` (`active`, `inactive`), `createdAt`, `createdBy`. Optional `nickname`. |
| `billPayments` | Records with `id`, `payeeId`, `fromAccountId`, `sendDate`, `amount`, `status` (`scheduled`, `completed`, `cancelled`), `createdAt`, `createdBy`. Optional `cancelledAt`, `cancelledBy`. |
| `disputes` | Records with `id`, `accountId`, `transactionId`, `reason` (`duplicate_charge`, `incorrect_amount`, `not_received`, `cancelled_service`, `unrecognized_charge`, `other`), `description`, `amount`, `status` (`submitted`, `under_review`, `resolved`, `closed`), `createdAt`, `createdBy`. |
| `alertRules` | Records with `id`, `accountId`, `type` (`low_balance`, `deposit_posted`, `payment_due`, `large_purchase`), boolean `enabled`, `channels` (array containing `email`, `text`, and/or `push`), nullable numeric `thresholdAmount`, `createdAt`, `createdBy`, `updatedAt`, `updatedBy`. |

### Default IDs

| Collection | Seed IDs and relationships |
| --- | --- |
| `profile` | `user-alex` |
| `accounts` | `acct-checking-01`, `acct-savings-01`, `acct-card-01`, and their `-02` counterparts. Archived accounts run from `acct-archive-01` through `acct-archive-18`. |
| `transactions` | `txn-card-001` is an eligible posted purchase. `txn-card-002` is pending. `txn-card-008` and `txn-checking-009` have open disputes. Completed transfers have paired `-out` and `-in` transactions, such as `trf-002-out` and `trf-002-in`. |
| `transfers` | `trf-001` through `trf-024`. `trf-001` is scheduled. |
| `payees` | `payee-utilities-01` is Northline Electric. The remaining records run from `payee-002` through `payee-024`. |
| `billPayments` | `bill-001` through `bill-024`. `bill-001` is scheduled for Northline Electric. |
| `disputes` | `dsp-001` through `dsp-024`. `dsp-001` is under review, and `dsp-002` is submitted. |
| `alertRules` | `alert-checking-low-01` is the low-balance rule for `acct-checking-01`. The remaining records run from `alert-002` through `alert-024`. |

## Minimal Inject Example

```json
{
  "profile": { "id": "user-audit", "firstName": "Jamie", "lastName": "Morgan" },
  "accounts": [
    {
      "id": "acct-audit",
      "productName": "Total Checking",
      "last4": "1234",
      "currency": "USD",
      "type": "checking",
      "status": "open",
      "currentBalance": 250
    }
  ],
  "transactions": [],
  "transfers": [],
  "payees": [],
  "billPayments": [],
  "disputes": [],
  "alertRules": []
}
```

## Observable State Changes (for LLM evaluation)

Each committed action below writes one complete `set_current` snapshot. IDs in linked fields match the corresponding record in its collection.

| User action | Fields written |
| --- | --- |
| Save or clear account nickname | On the selected account, `nickname` (trimmed or empty string), `updatedAt`, `updatedBy`. |
| Confirm a transfer dated today | Append `transfers[]` with `id`, `fromAccountId`, `toAccountId`, `transferDate`, `amount`, `status: 'completed'`, `createdAt`, `createdBy`, and optional trimmed `memo`. Adjust both accounts' `currentBalance` and `availableBalance` by the signed amount and set their `updatedAt`, `updatedBy`. Append two `transactions[]` with `id`, `accountId`, `transferId`, `description`, `category: 'Transfers'`, `type: 'transfer'`, `status: 'posted'`, `transactionDate`, `amount` (negative for source and positive for destination), `createdAt`, `createdBy`. |
| Confirm a future transfer | Append the same transfer record shape with `status: 'scheduled'`. |
| Confirm scheduled transfer cancellation | On the selected transfer, `status: 'cancelled'`, `cancelledAt`, `cancelledBy`. |
| Save a new payee | Append `payees[]` with `id`, trimmed `name`, `category`, `accountLast4`, `status: 'active'`, `createdAt`, `createdBy`, and optional trimmed `nickname`. The reference is reduced to its last four characters after formatting spaces and hyphens are removed. |
| Confirm a bill payment | Append `billPayments[]` with `id`, `payeeId`, `fromAccountId`, `sendDate`, `amount`, `status: 'scheduled'`, `createdAt`, `createdBy`. |
| Confirm scheduled payment cancellation | On the selected bill payment, `status: 'cancelled'`, `cancelledAt`, `cancelledBy`. |
| Submit a dispute | Append `disputes[]` with `id`, `accountId`, `transactionId`, `reason`, trimmed `description`, `amount`, `status: 'submitted'`, `createdAt`, `createdBy`. |
| Save a new alert rule | Append `alertRules[]` with `id`, `accountId`, `type`, `enabled`, `channels`, `thresholdAmount`, `createdAt`, `createdBy`, `updatedAt`, `updatedBy`. |
| Edit or disable an existing alert rule | On the matching account and type, `enabled`, `channels`, `thresholdAmount`, `updatedAt`, `updatedBy`. |

An uncached boot posts the merged world with `set`. The endpoint preserves an existing baseline, including the original snapshot supplied by an injection. Reload, navigation, search, filtering, review, case tracking, validation errors, canceled drafts, and idle time produce no `set_current`.
