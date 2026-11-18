# Brex state model

`createInitialData()` returns a plain JSON object with the keys listed below. Seed IDs and dates are fixed. New record and activity IDs may use `crypto.randomUUID()` with entity prefixes. Every successful user mutation generates its timestamp with `new Date().toISOString()`. Use a single timestamp for all records written by that action. Store monetary values as numbers in major currency units with at most two decimal places. Round additions and sums at cent precision. Transaction dates use `YYYY-MM-DD` and are displayed as calendar dates without a UTC timezone shift.

## Top-level shape

| State key | Type | Fixed sample or role |
| --- | --- | --- |
| `workspace` | object | `{ id: 'wrk_northstar', name: 'Northstar Studio', currency: 'USD' }` |
| `currentUser` | object | `{ id: 'usr_maya', name: 'Maya Chen', role: 'finance_admin' }` |
| `members` | array of member records | Links for ownership and employee display |
| `cards` | array of card records | Current card inventory, including canceled cards |
| `expenses` | array of expense records | Card charges and reimbursement records |
| `receipts` | array of receipt records | File metadata and current expense links |
| `limits` | array of limit records | Spend caps and ownership |
| `limitIncreaseRequests` | array of request records | Limit increase decisions |
| `activity` | array of activity records | Append-only business action history |

## Records

Fields marked `?` are optional. A field typed `null` can be present without a linked record or value. `ID` and `ISO timestamp` are strings. Currency is an uppercase ISO 4217 string. Persist `createdBy` as the signed-in member ID for user actions and a fixed actor ID for seed history.

| Record | Fields | Fixed sample values |
| --- | --- | --- |
| Member | `id: ID`, `name: string`, `email?: string`, `department?: string`, `role?: string` | `usr_maya`, `Maya Chen`, `maya@example.test`, `Finance`, `finance_admin` |
| Card | `id: ID`, `name: string`, `holderId: ID`, `limitId: ID or null`, `format: virtual or physical`, `last4: string`, `status: active, locked or canceled`, `createdBy: ID`, `createdAt: ISO timestamp`, `updatedBy?: ID`, `updatedAt?: ISO timestamp` | `crd_design_ops`, `Design Operations`, `usr_maya`, `lim_design_ops`, `virtual`, `0417`, `active`, `usr_maya`, `2026-10-16T15:00:00.000Z` |
| Expense | `id: ID`, `kind: card or reimbursement`, `merchant: string`, `amount: number`, `currency: string`, `transactionDate: string`, `employeeId: ID`, `cardId: ID or null`, `limitId: ID or null`, `category: string`, `memo?: string`, `status: pending_review, approved or denied`, `createdBy: ID`, `createdAt: ISO timestamp`, `updatedBy?: ID`, `updatedAt?: ISO timestamp`, `reviewedBy?: ID`, `reviewedAt?: ISO timestamp`, `reviewReason?: string or null` | `exp_paper_field`, `card`, `Paper Field Supply`, `46.80`, `USD`, `2026-11-10`, `usr_maya`, `crd_design_ops`, `lim_design_ops`, `Office supplies`, `Workshop supplies`, `pending_review`, `usr_maya`, `2026-11-10T18:40:00.000Z` |
| Receipt | `id: ID`, `filename: string`, `fileUrl: string`, `mimeType: string`, `size: number` in bytes, `expenseId: ID or null`, `status: unmatched, attached or removed`, `createdBy: ID`, `createdAt: ISO timestamp`, `updatedBy?: ID`, `updatedAt?: ISO timestamp` | `rcp_paper_field`, `paper-field-nov10.pdf`, `/receipts-fixtures/paper-field-nov10.pdf`, `application/pdf`, actual fixture byte size, `exp_paper_field`, `attached`, `usr_maya`, `2026-11-10T19:00:00.000Z` |
| Limit | `id: ID`, `name: string`, `ownerId: ID`, `amount: number`, `currency: string`, `recurrence: monthly, quarterly or one_time`, `status: active or archived`, `createdBy: ID`, `createdAt: ISO timestamp`, `updatedBy?: ID`, `updatedAt?: ISO timestamp` | `lim_design_ops`, `Design Operations`, `usr_maya`, `3500.00`, `USD`, `monthly`, `active`, `usr_maya`, `2026-10-15T15:00:00.000Z` |
| Limit increase request | `id: ID`, `limitId: ID`, `requestedBy: ID`, `additionalAmount: number`, `currency: string`, `reason: string`, `status: pending, approved or denied`, `createdBy: ID`, `createdAt: ISO timestamp`, `decidedBy?: ID`, `decidedAt?: ISO timestamp`, `decisionReason?: string or null` | `lir_design_workshop`, `lim_design_ops`, `usr_maya`, `450.00`, `USD`, `Additional seats for the workshop`, `pending`, `usr_maya`, `2026-11-11T16:00:00.000Z` |
| Activity | `id: ID`, `action: string`, `actorId: ID`, `createdAt: ISO timestamp`, `targetType: card, expense, receipt, limit or limitIncreaseRequest`, `targetId: ID`, `relatedIds: object`, `changes: object`, `reason?: string` | `act_design_card_issue`, `card.issued`, `usr_maya`, `2026-10-16T15:00:00.000Z`, `card`, `crd_design_ops`, `{ holderId: 'usr_maya', limitId: 'lim_design_ops' }`, `{ status: { from: null, to: 'active' } }` |

`relatedIds` maps names such as `holderId`, `employeeId`, `cardId`, `receiptId`, `expenseId`, `ownerId`, `limitId`, and `requestId` to relevant IDs. Omit a link when no entity exists. `changes` maps each changed business field to `{ from, to }`, with `null` for a previous value missing from the record. Expense review events include `amount` and `currency` alongside the status transition in `changes`, using identical `from` and `to` for context. Likewise, increase decisions can include `additionalAmount` and `currency` and approvals include the prior and new cap under `changes.limitAmount`. Record the optional event `reason` for lock, cancel and decision actions when supplied. Creation events include status and important input fields for that action, including money and its currency when applicable.

## Relationships and behavior

- `members.id` resolves the signed-in user and IDs for cardholders, owners and employees. If a relation is missing in an injected world, render a neutral display label and keep the underlying ID. Candidate selectors use the currently loaded records.
- `cards.limitId` is the current assignment. `expenses.limitId` is the historical spend allocation, even after the card assignment changes or its old limit is archived. Preserve past expenses on canceled cards. Hide unavailable relations as actions while retaining their recorded metadata.
- `receipts.expenseId` is the sole attachment link. A non-removed receipt in `attached` status with the matching `expenseId` satisfies the receipt requirement. Allow at most one active receipt per expense for user-created links. The expense's attachment state is derived, so receipt mutations need no write to `expenses[]`. Store file metadata and relative URLs, and serve file bytes from the template upload endpoint or local fixtures.
- `limitIncreaseRequests.limitId` links the request to its cap. Store the requested incremental amount and use the limit's currency. An approval updates the request, the cap and the event in the same state commit. A denial updates the request and its event.
- Overview totals use the selected currency, card expenses recorded in that currency and approved reimbursements. Workload counts apply the same currency filter. Limit detail uses recorded spend for that limit and currency, with the same inclusion rules. Show `amount − recorded spend` as remaining and label the spend as recorded so recurrence describes the cap and the ledger total describes the data currently in the workspace. Missing currency or amount must never generate `NaN` or mix currencies.
- Failure, cancel and read-only actions leave the state as it was. Successful mutations preserve unrelated records and append one structured activity entry. Use the exact action codes in [TODO.md](../TODO.md). Use link guards and fallbacks for legacy or injected data with nulls, absent optional fields, and empty arrays. Do not rewrite sparse records simply to render them.

## Seed requirements

Initialize all top-level keys in one return value. Use fixed synthetic roster, merchants, record IDs, creation times and transaction dates. Fixed arrays of inputs may be mapped into records if they produce the same IDs and values on every call.

| Key | Volume | Coverage |
| --- | --- | --- |
| `members` | 28 | Finance, Design, Engineering, Operations and Sales. Include people without an assigned card as issuance candidates. Use `.test` email domains. |
| `cards` | 32 | 24 active, 5 locked, 3 canceled. Mix virtual and physical, with leading-zero last-four examples and repeat holders for useful searches. |
| `expenses` | 72 | 56 card and 16 reimbursement. Include all review states, several reviewable expenses without receipts, and a mix of dates, departments, merchants and spend categories. Include historical expenses on canceled cards. |
| `receipts` | 42 | 32 attached to distinct expenses, 8 unmatched and 2 removed. Include original local files for visible seeded download links and use actual file byte sizes. |
| `limits` | 26 | 22 active, 4 archived. Cover all recurrence options with a mix of currencies. Active limits include some with recorded spend and some unused. |
| `limitIncreaseRequests` | 24 | 10 pending, 9 approved and 5 denied. Include at least one active limit with two pending requests. Seed caps already include any approved increases recorded in the baseline. |
| `activity` | 24 or more | Seed plausible actions with actor, timestamp, valid target and related IDs. Ensure initial history is consistent with current states. |

Use the single-workspace preference as the default currency. Keep all seeded card and expense links valid and linked expense and limit currencies consistent. Include GBP or EUR examples so currency filtering and formatting can be checked. A seed where `exp_paper_field` is linked to `rcp_paper_field` supplies an attached example. Also supply supported upload fixtures and a distinct pending expense without a receipt, so the tester can exercise both manual matching and direct attachment.
