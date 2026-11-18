# brex_mock Schema

**Base URL** `http://localhost:5405/`  
**Go Endpoint** `GET /go?sid=<sid>` → `{initial_state, current_state, state_diff}`  
**Inject** `POST /post?sid=<sid>` with body `{"action":"set","state":{...}}`  
**Reset** `POST /post?sid=<sid>` with body `{"action":"reset"}`

State is a plain JSON object. Uploads use the same session at `POST /upload?sid=<sid>`. A successful business action saves the full current state once. Filters, paging, open details, drafts and notifications are browser UI state.

## State Schema

IDs are strings. Money uses numbers in major currency units and a separate ISO currency code. Mutation timestamps are ISO 8601 strings. The shared creation fields are `createdBy` and `createdAt`. The shared update fields are `updatedBy` and `updatedAt`. Actor fields hold user IDs. An optional field may be absent in older or injected records.

| Key | Shape |
| --- | --- |
| `workspace` | `id`, `name`, `currency` |
| `currentUser` | `id`, `name`, `role` |
| `members[]` | `id`, `name`, optional `email`, `department`, `role` |
| `cards[]` | `id`, `name`, `holderId`, nullable `limitId`, `format` (virtual, physical), `last4` (string), `status` (active, locked, canceled), creation fields, optional update fields |
| `expenses[]` | `id`, `kind` (card, reimbursement), `merchant`, `amount`, `currency`, `transactionDate` (YYYY-MM-DD), `employeeId`, nullable `cardId` and `limitId`, `category`, optional `memo`, `status` (pending_review, approved, denied), creation fields, optional update fields and `reviewedBy`, `reviewedAt`, `reviewReason` |
| `receipts[]` | `id`, `filename`, relative `fileUrl`, `mimeType`, `size` in bytes, nullable `expenseId`, `status` (unmatched, attached, removed), creation fields, optional update fields |
| `limits[]` | `id`, `name`, `ownerId`, `amount`, `currency`, `recurrence` (monthly, quarterly, one_time), `status` (active, archived), creation fields, optional update fields |
| `limitIncreaseRequests[]` | `id`, `limitId`, `requestedBy`, `additionalAmount`, `currency`, `reason`, `status` (pending, approved, denied), creation fields, optional `decidedBy`, `decidedAt`, `decisionReason` |
| `activity[]` | `id`, `action`, `actorId`, `createdAt`, `targetType` (card, expense, receipt, limit, limitIncreaseRequest), `targetId`, `relatedIds`, `changes`, optional `reason` |

Additional injected keys pass through commits. `activity[].relatedIds` maps relation names to IDs. The target ID is stored separately, while increase events also link the limit and request. `changes` maps business fields to `{ from, to }` with null for a missing prior value. Approval decisions store null reason fields. Denials store trimmed reasons. A mutation shares one timestamp across its affected records and event.

The active receipt for an expense is the receipt with `status: attached` and the matching `expenseId`. Card assignments use `cards[].limitId`. Expenses retain their own historical `cardId` and `limitId`. Recorded spend sums card purchases and approved reimbursements in the selected currency. Limit remaining is cap minus recorded spend allocated to the limit in its currency.

### Default IDs

| Collection | Count | Example ID |
| --- | --- | --- |
| `workspace` | 1 | `wrk_northstar` |
| `currentUser` | 1 | `usr_maya` |
| `members[]` | 28 | `usr_maya` |
| `cards[]` | 32 | `crd_design_ops` |
| `expenses[]` | 72 | `exp_paper_field` |
| `receipts[]` | 42 | `rcp_paper_field` |
| `limits[]` | 26 | `lim_design_ops` |
| `limitIncreaseRequests[]` | 24 | `lir_design_workshop` |
| `activity[]` | 24 | `act_design_card_issue` |

## Minimal Inject Example

Send this object as `state` to test an empty ledger. The workspace and current user are filled from defaults.

```json
{
  "members": [],
  "cards": [],
  "expenses": [],
  "receipts": [],
  "limits": [],
  "limitIncreaseRequests": [],
  "activity": []
}
```

## Observable State Changes (for LLM evaluation)

Each row appends one `activity[]` record with the listed action code.

| User action | Record writes | Event context |
| --- | --- | --- |
| Issue virtual card | Append `cards[]` with name, holder, limit, synthetic last four, virtual format, active status and creation fields | `card.issued` includes card fields, holder and limit |
| Lock card | Set card `status: locked` and update fields | `card.locked` includes status transition, holder, limit and reason |
| Unlock card | Set card `status: active` and update fields | `card.unlocked` includes status transition, holder and limit |
| Cancel card | Set card `status: canceled` and update fields | `card.canceled` includes status transition, holder, limit and reason |
| Change card spend limit | Set card `limitId` and update fields | `card.limit_changed` includes prior/new assignment, holder and both limits when available |
| Submit reimbursement | Append `expenses[]` with the current employee, merchant, date, category, memo, amount, active limit and its currency, `cardId: null`, `kind: reimbursement`, `status: pending_review` and creation fields | `expense.submitted` includes initial values, employee and limit |
| Edit expense memo | Set expense `memo` to the trimmed value and write update fields | `expense.memo_updated` includes prior/new memo and available employee, card and limit |
| Approve or deny expense | Set expense `status`, `reviewedBy`, `reviewedAt`, `reviewReason` and update fields | `expense.approved` or `expense.denied` includes status transition, amount, currency, available relations and any decision reason |
| Upload receipt | Append `receipts[]` with server metadata, `expenseId: null`, `status: unmatched` and creation fields | `receipt.uploaded` includes file metadata and initial status |
| Attach receipt from expense | Append `receipts[]` with server metadata, the expense ID, `status: attached` and creation fields | `receipt.attached` includes file metadata, attachment status and expense |
| Match existing receipt | Set receipt `expenseId`, `status: attached` and update fields | `receipt.matched` includes expense and prior/new link and status |
| Remove receipt | Set receipt `expenseId: null`, `status: removed` and update fields | `receipt.removed` includes former expense when present, plus prior/new link and status |
| Create spend limit | Append `limits[]` with name, owner, amount, currency, recurrence, `status: active` and creation fields | `limit.created` includes initial fields and owner |
| Edit spend limit | Set the active limit's name, owner, amount, recurrence and update fields | `limit.updated` includes changed business values, owner and any former owner |
| Archive spend limit | Set limit `status: archived` and update fields | `limit.archived` includes status transition and owner |
| Request increase | Append `limitIncreaseRequests[]` with limit, requester, increment, currency, reason, `status: pending` and creation fields | `limit.increase_requested` includes both related IDs, initial fields and reason |
| Approve increase | Set request `status: approved`, `decidedBy`, `decidedAt`, `decisionReason: null`. In the same commit, add the increment to limit `amount` and write its update fields | `limit.increase_approved` includes both related IDs, status transition, increment, currency and prior/new cap in `changes.limitAmount` |
| Deny increase | Set request `status: denied`, `decidedBy`, `decidedAt` and `decisionReason`. The cap is retained | `limit.increase_denied` includes both related IDs, status transition, increment, currency and reason |
