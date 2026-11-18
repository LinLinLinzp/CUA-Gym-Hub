# Chase data model

`createInitialData()` returns `{ profile, accounts, transactions, transfers, payees, billPayments, disputes, alertRules }`. All values are JSON data. IDs and historical fixture dates are fixed. Generate new IDs and audit timestamps only when the user commits an action. Use `new Date().toISOString()` for action timestamps and local calendar dates under the runtime clock for validating date fields. Monetary values are USD numbers, with decimal precision limited to cents. Do math and comparison in integer cents and convert at the state boundary. History snapshots store stable IDs, with descriptions displayed from linked records when available.

## Shapes and examples

| Key | Record and field types | Example |
| --- | --- | --- |
| `profile` | Object with string `id`, `firstName`, and `lastName` | `user-alex`, `Alex`, `Morgan` |
| `accounts[]` | String `id`, `productName`, `last4`, `currency`, `type` (`checking`, `savings`, `credit_card`), `status` (`open`, `closed`), optional string `nickname`, `updatedAt`, `updatedBy`. Numeric `currentBalance` and optional `availableBalance` for deposits or `availableCredit` for cards. | `acct-checking-01`, `Total Checking`, `4812`, `USD`, `checking`, `open`, `Household`, `4280.45` current, `4150.45` available |
| `transactions[]` | String `id`, `accountId`, `description`, `category`, `transactionDate` (`YYYY-MM-DD`), `status` (`pending`, `posted`), `type` (`purchase`, `deposit`, `refund`, `transfer`, `payment`, `fee`), optional string `merchant`, `transferId`, `createdBy`, `createdAt`. Numeric signed `amount`. | `txn-card-001`, `acct-card-01`, `Northline Market`, `Groceries`, `2026-11-09`, `posted`, `purchase`, `-68.42` |
| `transfers[]` | String `id`, `fromAccountId`, `toAccountId`, `transferDate` (`YYYY-MM-DD`), `status` (`scheduled`, `completed`, `cancelled`), `createdAt`, `createdBy`, optional string `memo`, `cancelledAt`, `cancelledBy`. Numeric `amount`. | `trf-001`, `acct-checking-01`, `acct-savings-01`, `2026-11-29`, `scheduled`, `150.00`, `Holiday savings`, `2026-11-16T15:30:00.000Z`, `user-alex` |
| `payees[]` | String `id`, `name`, `category`, `accountLast4`, `status` (`active`, `inactive`), `createdAt`, `createdBy`, optional string `nickname`. | `payee-utilities-01`, `Northline Electric`, `Utilities`, `2064`, `active`, `Home electric`, `2026-10-06T15:00:00.000Z`, `user-alex` |
| `billPayments[]` | String `id`, `payeeId`, `fromAccountId`, `sendDate` (`YYYY-MM-DD`), `status` (`scheduled`, `completed`, `cancelled`), `createdAt`, `createdBy`, optional string `cancelledAt`, `cancelledBy`. Numeric `amount`. | `bill-001`, `payee-utilities-01`, `acct-checking-01`, `2026-12-02`, `scheduled`, `86.24`, `2026-11-16T15:45:00.000Z`, `user-alex` |
| `disputes[]` | String `id`, `accountId`, `transactionId`, `reason` (`duplicate_charge`, `incorrect_amount`, `not_received`, `cancelled_service`, `unrecognized_charge`, `other`), `description`, `status` (`submitted`, `under_review`, `resolved`, `closed`), `createdAt`, `createdBy`. Numeric `amount`. | `dsp-001`, `acct-card-01`, `txn-card-008`, `duplicate_charge`, `The merchant posted a second charge for the same order.`, `under_review`, `37.50`, `2026-11-13T16:00:00.000Z`, `user-alex` |
| `alertRules[]` | String `id`, `accountId`, `type` (`low_balance`, `deposit_posted`, `payment_due`, `large_purchase`), `createdAt`, `createdBy`, `updatedAt`, `updatedBy`. Boolean `enabled`, string array `channels` (values `email`, `text`, `push`), `thresholdAmount` (number or `null`). | `alert-checking-low-01`, `acct-checking-01`, `low_balance`, `true`, `["email", "push"]`, `250.00`, `2026-10-06T15:00:00.000Z`, `user-alex` for both audit pairs |

## Relationships and lifecycle

- References use `accounts[].id`, `transactions[].id`, `transfers[].id`, and `payees[].id`. On an unresolved relation show a neutral label and disable dependent actions. Keep the surrounding record visible for injected states.
- Account balance and available credit are distinct. Signed transaction amounts use the customer's perspective. Deposits, refunds, and incoming transfers are positive. Purchases, fees, and outgoing transfers are negative. Display credit card account balance owed as a positive balance separately from deposit accounts.
- Completing an immediate internal transfer writes one transfer and two posted ledger entries linked by `transferId`. Set both ledger records’ actor and timestamp from the transfer, and update both account balance fields and the affected accounts’ audit fields. Use one store commit for the whole operation.
- Canceling an eligible transfer or bill payment preserves its amount, references, and creation fields. Set `status` to `cancelled` and record the cancellation actor/time. The scheduled status determines cancellation eligibility. Household bill payments schedule without a ledger debit.
- `submitted` and `under_review` are open cases. `resolved` and `closed` are closed cases. A new case requires an open linked account, a posted negative `purchase` transaction, and no open case for that transaction. Keep the source transaction intact.
- Enforce a single rule for each `(accountId, type)`. Support `low_balance` and `large_purchase` with `thresholdAmount`, and store `null` for `deposit_posted` and `payment_due`. Store an explicit disabled rule when saving off. An absent rule displays as disabled until explicitly saved.
- Audit actor fields use `profile.id`. `createdAt`, `updatedAt`, and `cancelledAt` use ISO UTC strings. Editing a nickname changes only `nickname`, `updatedBy`, and `updatedAt`. Clearing a nickname saves an empty string so the product label becomes the fallback.

## Fixed seed targets

| Entity | Count and coverage |
| --- | --- |
| Profile | 1 signed-in household customer |
| Accounts | 24 total across current accounts and archived history. Show primary checking `acct-checking-01`, savings `acct-savings-01`, and card `acct-card-01` first. Include additional active deposit and credit accounts for eligibility and selector testing. |
| Transactions | At least 90 across the active and historical accounts. Give the three primary accounts at least 18 each. Include pending purchases, posted purchases from repeated merchants, deposits, fees, transfers, payments, and refunds. Keep `txn-card-001` eligible and without a seeded dispute. |
| Transfers | 24 with completed, scheduled and cancelled examples, plus matching ledger rows for seeded completed transfers. Include at least one cancellable sample. |
| Payees | 24 across utilities, rent, telecom, insurance, and household services, with at least six categories or distinct search matches and some inactive history. |
| Bill payments | 24 across multiple payees and dates, with completed, scheduled and cancelled examples. Include at least one cancellable sample. |
| Disputes | 24 primarily historical closed cases, plus submitted and under-review examples, each with a valid posted purchase. |
| Alert rules | At least 24 across current accounts and archived history, with a mix of enabled and disabled rules. Include an existing low-balance rule for `acct-checking-01` and an applicable type without a rule so both update and insert are testable. |

Use example records as the start of deterministic, multi-period fixture data. Keep new actions anchored to the runtime clock. History may contain fixed past dates and status examples. Derive display labels such as today and yesterday using the current runtime date.
