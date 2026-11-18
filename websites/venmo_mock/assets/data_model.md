# Venmo state model

The app stores one JSON object per Harbor session. Arrays hold records with stable string IDs. Use integer cents for calculations and store USD amounts as numeric dollars rounded to two decimal places. New timestamps are ISO strings from `new Date().toISOString()`. The signed amounts in views and exports come from account direction. Payment, request and split amounts in state are positive.

## Top-level keys

| Key | Type | Initial contents |
| --- | --- | --- |
| `account` | Account object | Avery Morgan and their Venmo balance |
| `contacts` | Contact array | 32 searchable synthetic contacts |
| `fundingSources` | FundingSource array | Balance, bank and debit sources |
| `payments` | Payment array | 72 historical records |
| `requests` | Request array | 48 incoming, outgoing and split-linked records |
| `splits` | Split array | 24 bills with linked requests |
| `statementExports` | StatementExport array | Empty |

## Record shapes

Every example property is required unless marked optional below.

### Account

```json
{"id":"user_avery","name":"Avery Morgan","handle":"avery-morgan","balance":286.75,"currency":"USD"}
```

`balance` is a number. The opening balance is a seeded snapshot. Update it only by the incremental effect of a confirmed balance-funded action.

### Contact

```json
{"id":"user_jordan","name":"Jordan Lee","handle":"jordan-lee","email":"jordan.lee@example.test","phone":"+1 212 555 0147"}
```

`email` and `phone` are optional strings. Source names, initials, dates and notes from injected worlds may be sparse. Search should safely skip missing fields. Resolve account identity by `account.id` as well as contact identities by `contacts[].id`. Show a neutral fallback when a name cannot be resolved.

### FundingSource

```json
{"id":"funding_debit","kind":"debit","label":"Debit card","last4":"2046"}
```

`kind` is `balance`, `bank` or `debit`. `last4` is optional and stays a string. Use source array order for the default linked instrument when the balance cannot fund the entire amount. If no source can fund a payment, show a validation message and keep the state intact.

### Payment

```json
{"id":"payment_044","type":"payment","status":"completed","actorId":"user_avery","senderId":"user_avery","recipientId":"user_jordan","amount":24.75,"currency":"USD","note":"Tacos after the show","fundingSourceId":"funding_balance","createdAt":"2026-11-09T19:20:00.000Z","completedAt":"2026-11-09T19:20:00.000Z","requestId":"request_017"}
```

`type` is `payment`. `status` is `completed` or `pending`. Use `completed` for new local payments. Historical incoming payments may omit `fundingSourceId` since it belongs to the sender. `requestId` is optional and identifies the request this payment settles. `completedAt` is optional for pending records. A completed payment lacking `completedAt` uses `createdAt` for presentation and statement selection.

### Request and Reminder

```json
{"id":"request_017","status":"paid","actorId":"user_jordan","requesterId":"user_jordan","payerId":"user_avery","amount":24.75,"currency":"USD","note":"Tacos after the show","createdAt":"2026-11-08T19:20:00.000Z","updatedAt":"2026-11-09T19:20:00.000Z","updatedById":"user_avery","paymentId":"payment_044","reminders":[{"id":"reminder_003","actorId":"user_jordan","createdAt":"2026-11-09T10:00:00.000Z"}]}
```

`status` is `pending`, `paid`, `declined` or `cancelled`. `splitId`, `paymentId`, `updatedAt`, `updatedById` and `reminders` are optional. Reminder IDs are strings. The parent request supplies the reminder's request link by containment. Compute direction from requester and payer IDs. Authorize paid or declined transitions only for the current payer of a pending request. Authorize remind or cancel only for its current requester. For a split request, `requesterId` is the split owner and `payerId` is the share participant.

### Split and Share

```json
{"id":"split_012","actorId":"user_avery","ownerId":"user_avery","amount":50,"currency":"USD","note":"Hardware store run","method":"equal","sourcePaymentId":"payment_038","status":"pending","createdAt":"2026-11-02T20:00:00.000Z","shares":[{"userId":"user_avery","amount":16.67},{"userId":"user_jordan","amount":16.67,"requestId":"request_035"},{"userId":"user_noah","amount":16.66,"requestId":"request_036"}]}
```

`method` is `equal` or `custom`. `sourcePaymentId`, `updatedAt` and `updatedById` are optional. The owner share has no request ID. The sum of shares equals the total. For equal shares, order the owner first when included, followed by contacts in selection order. Require at least one non-owner and two participants overall. Resolve status from child requests after a child status mutation. Use `settled` for all paid, `closed` for no pending requests with at least one unpaid terminal outcome, `partial` for at least one pending and one terminal request, and `pending` for all pending. If any linked child is missing in an injected world, show its unavailable detail and conservatively treat it as outstanding for status derivation.

### StatementExport

```json
{"id":"export_001","actorId":"user_avery","createdAt":"2026-11-18T15:00:00.000Z","status":"generated","periodStart":"2026-11-01T00:00:00.000Z","periodEndExclusive":"2026-12-01T00:00:00.000Z","format":"csv","filename":"venmo-statement-2026-11.csv","currency":"USD","transactionIds":["payment_044"],"transactionCount":1,"totalIncoming":0,"totalOutgoing":24.75}
```

Select completed records involving the current account with posting timestamps in `[periodStart, periodEndExclusive)`. Sort newest first and use ID as a stable tie-breaker. Skip missing or invalid dates in this view. The exported file has the columns `date,payment_id,counterparty,note,amount,currency`. Use ISO dates and signed decimal amounts. The stored incoming and outgoing totals are nonnegative magnitudes. Record the IDs in the order written to the file.

## Mutation map

| User action | Writes in one state commit |
| --- | --- |
| Confirm payment | Append a completed `payments[]` record. Reduce `account.balance` for balance funding. |
| Confirm request | Append one pending `requests[]` record. |
| Pay an incoming request | Append a payment with `requestId`. Write request `status`, `paymentId`, `updatedAt`, `updatedById`. Adjust balance for balance funding. Recompute and timestamp a linked split when present. |
| Decline or cancel a pending request | Write request `status`, `updatedAt`, `updatedById`. Recompute and timestamp a linked split when present. |
| Remind a pending payer | Append `{id, actorId, createdAt}` to the request's `reminders`. |
| Send split requests | Append one split and all linked requests. Leave the source payment amount intact. |
| Download CSV | Append one generated `statementExports[]` record for the chosen period and the actual content generated. |

## Seed construction

Return fresh plain objects and arrays from `createInitialData()`. Build contacts and funding sources with fixed IDs. Use fixed transaction timestamps spanning June–November 2026, plus an earlier empty month selectable in Statements. Mix sent and received completed payments, leave a few pending, and give the monthly records a variety of amounts and descriptions. Seed standalone requests in both directions and link split requests by ID. Use consistent two-way references on paid requests and consistent terminal split statuses. Historical transactions need no balance replay.

Build split fixtures with 14 two-participant bills and 10 three-participant bills, counting the owner. Their 34 participant requests leave room for 14 standalone requests. Include equal, custom, unlinked and payment-linked splits. Reserve distinct pending incoming and outgoing requests so a browser test can exercise terminal actions without reusing a record. Leave exports empty.

At boot, use the shared template to supply defaults and preserve injected keys. When rendering, use local fallbacks for missing optional fields or relationships. Normalization and display of injected records must not trigger a write.
