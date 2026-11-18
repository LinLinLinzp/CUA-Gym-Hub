# venmo_mock Schema

**Base URL**: `http://localhost:5331/`  
**Go Endpoint**: `GET /go?sid=<sid>` → `{initial_state, current_state, state_diff}`  
**Inject**: `POST /post?sid=<sid>` with body `{"action":"set","state":{...}}`  
**Reset**: `POST /post?sid=<sid>` with body `{"action":"reset"}`

The app loads a JSON object for the active session. Read `current_state` for persisted records and `state_diff` for changed top-level keys. Use a fresh session ID for injection so the browser loads the injected state. Arrays replace defaults and objects merge with their defaults. The reset endpoint restores the session's initial snapshot on the server. Amounts are USD numbers and timestamps are ISO 8601 UTC strings. The app calculates amounts in integer cents. New IDs are generated at confirmation.

## State Schema

| Key | Shape | Seed |
| --- | --- | --- |
| `account` | Account | Avery Morgan with a balance of $286.75 |
| `contacts` | Contact array | 32 synthetic contacts |
| `fundingSources` | FundingSource array | Venmo balance, checking account, debit card |
| `payments` | Payment array | 72 payments across June–November 2026 |
| `requests` | Request array | 48 standalone and split requests |
| `splits` | Split array | 24 expenses |
| `statementExports` | StatementExport array | Empty |

### Default IDs

| Entity | IDs |
| --- | --- |
| Account | `user_avery` |
| Contacts | `user_` followed by the lowercased first and last names joined by an underscore, such as `user_jordan_lee` and `user_jordan_patel` |
| Funding sources | `funding_balance`, `funding_bank`, `funding_debit` |
| Payments | `payment_001` through `payment_072` |
| Requests | `request_001` through `request_048` |
| Splits | `split_001` through `split_024` |

### Record shapes

Fields marked `?` are optional. IDs, labels, notes, currency codes and timestamps are strings.

| Record | Fields |
| --- | --- |
| Account | `id`, `name`, `handle`, `balance` (number), `currency` |
| Contact | `id`, `name`, `handle`, `email?`, `phone?` |
| FundingSource | `id`, `kind` (`balance`, `bank`, `debit`), `label`, `last4?` |
| Payment | `id`, `type` (`payment`), `status` (`completed`, `pending`), `actorId`, `senderId`, `recipientId`, `amount` (number), `currency`, `note`, `fundingSourceId?`, `createdAt`, `completedAt?`, `requestId?` |
| Request | `id`, `status` (`pending`, `paid`, `declined`, `cancelled`), `actorId`, `requesterId`, `payerId`, `amount` (number), `currency`, `note`, `createdAt`, `splitId?`, `paymentId?`, `updatedAt?`, `updatedById?`, `reminders?` (Reminder array) |
| Reminder | `id`, `actorId`, `createdAt` |
| Split | `id`, `actorId`, `ownerId`, `amount` (number), `currency`, `note`, `method` (`equal`, `custom`), `sourcePaymentId?`, `status` (`pending`, `partial`, `settled`, `closed`), `createdAt`, `shares` (Share array), `updatedAt?`, `updatedById?` |
| Share | `userId`, `amount` (number), `requestId?` (present for each non-owner) |
| StatementExport | `id`, `actorId`, `createdAt`, `status` (`generated`), `periodStart`, `periodEndExclusive`, `format` (`csv`), `filename`, `currency`, `transactionIds` (string array), `transactionCount` (integer), `totalIncoming` (number), `totalOutgoing` (number) |

A completed payment uses its `completedAt` timestamp for statements, with `createdAt` as the fallback. Statement transaction IDs follow CSV order, newest posted transaction first with ID as the tie-breaker. Totals store positive magnitudes. One statement includes payments posted at or after `periodStart` and before `periodEndExclusive`.

Split requests link to their parent through `request.splitId` and to their share through `share.requestId`. A split is `pending` when all requests are outstanding, `partial` when at least one is outstanding and one is terminal, `settled` when all are paid, and `closed` when all are terminal and at least one was declined or cancelled. A missing child is treated as outstanding.

## Minimal Inject Example

```json
{
  "account": { "balance": 20 },
  "contacts": [],
  "fundingSources": [],
  "payments": [],
  "requests": [],
  "splits": [],
  "statementExports": []
}
```

## Observable State Changes (for LLM evaluation)

Each row describes one whole-state commit. Array additions preserve existing records.

| User action | Changed paths |
| --- | --- |
| Confirm payment | Append one completed `payments[]` record per recipient with `id`, `type`, `status`, `actorId`, `senderId`, `recipientId`, `amount`, `currency`, `note`, `fundingSourceId`, `createdAt`, `completedAt`. For Venmo balance funding, subtract the aggregate amount from `account.balance`. |
| Confirm request | Append one pending `requests[]` record per payer with `id`, `status`, `actorId`, `requesterId`, `payerId`, `amount`, `currency`, `note`, `createdAt`. |
| Pay pending incoming request | Append a completed `payments[]` record including `requestId`. Update the request's `status`, `paymentId`, `updatedAt`, `updatedById`. For Venmo balance funding, subtract the payment amount from `account.balance`. Update a linked split's `status`, `updatedAt`, `updatedById` when present. |
| Decline pending incoming request | Update the request's `status`, `updatedAt`, `updatedById` and, when present, the linked split's `status`, `updatedAt`, `updatedById`. |
| Remind pending outgoing request | Append `{ id, actorId, createdAt }` to the request's `reminders[]`. |
| Cancel pending outgoing request | Update the request's `status`, `updatedAt`, `updatedById` and, when present, the linked split's `status`, `updatedAt`, `updatedById`. |
| Send split requests | Append one pending `splits[]` record with ordered `shares[]` and optional `sourcePaymentId`. Append one pending `requests[]` record per non-owner share. Each new request includes `splitId` and matches its share's participant and amount. |
| Download CSV | Append one `statementExports[]` record with the selected period, generated filename, ordered `transactionIds`, `transactionCount`, `totalIncoming` and `totalOutgoing`, plus its ID, actor, timestamp, status, format and currency. |

Navigation, drafts, validation, filters, searches and month/year selection are transient.
