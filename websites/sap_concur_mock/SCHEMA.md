# SAP Concur Mock Schema

**Base URL** `http://localhost:5403/`  
**Go endpoint** `GET /go?sid=<session>` → `{initial_state, current_state, state_diff}`  
**Inject** `POST /post?sid=<session>` with `{"action":"set","state":{...}}`  
**Reset** `POST /post?sid=<session>` with `{"action":"reset"}`

`GET /go?sid=<session>` returns `initial_state`, `current_state`, and a top-level `state_diff` from Harbor. The tables below describe `current_state`. An injected world can supply extra keys and replace arrays. Each accepted business action performs one whole-state save. Navigation, queries, pagination, dialog state, form typing, validation failures and viewing or previewing receipts are transient.

## State Schema

| Key | Shape |
| --- | --- |
| `account` | `{ activeUserId, organizationName, currency }`. Default `u-riley`, Alder Ridge Engineering and `USD`. |
| `users[]` | `{ id, name, roleTitle, department, costCenter, managerId? }`. |
| `expenseReports[]` | Document fields plus `reportDate`, `totalAmount` and `entries[]`. |
| `travelRequests[]` | Document fields plus `origin`, `destination`, `startDate`, `endDate`, `estimatedTotal` and `expectedExpenses[]`. |
| `approvals[]` | One review cycle per submission. Closed cycles retain their submission snapshot after document deletion. |
| `activity[]` | Append-only events linked by `subjectType` and `subjectId`, with optional `approvalId` or `lineId`. |

## Record shapes

- Document fields are `id`, `ownerId`, `title`, `businessPurpose`, `costCenter`, `currency`, `status`, `createdAt`, `updatedAt`, `approverId?` and `submittedAt?`. Status values are `draft`, `pending_approval`, `sent_back` and `approved`. Expense report history also includes `paid`.
- `expenseReports[].entries[]` contains `id`, `category`, `transactionDate`, `merchant`, `amount`, `quantity` (always 1 for UI-created expenses), `paymentType` (`out_of_pocket` or `company_card`), `description?`, `receipt?`, `createdBy`, `createdAt` and `updatedAt`. A receipt is `null` after removal or `{ fileName, url, contentType, size, attachedAt, attachedBy }`. Bundled URLs start with `/receipts/`, uploads with `/files/`. Size is in bytes, with file contents stored outside state.
- `travelRequests[].expectedExpenses[]` contains `id`, `category`, `description`, `quantity`, `unitAmount`, `lineTotal`, `createdBy`, `createdAt` and `updatedAt`. `lineTotal` is quantity times unit amount, calculated in cents. Document totals sum their line amounts.
- `approvals[]` contains `id`, `subjectType`, `subjectId`, `subjectTitle`, `submitterId`, `submitterName`, `approverId`, `amount`, `currency`, `status`, `createdAt`, `comment?`, `decidedAt?` and `decidedBy?`. The stored submission snapshot contains the title, submitter name, amount and currency. Cycle statuses are `pending`, `approved`, `sent_back` and `recalled`. Approval detail routes accept `approvalId` to identify a specific cycle.
- `activity[]` contains `id`, `action`, `actorId`, `createdAt`, `subjectType`, `subjectId`, `subjectTitle`, `status`, `amount` and `currency`. Optional event fields are `approvalId`, `comment`, `lineId`, `lineAmount`, `quantity` and `receiptFileName`. Action names are in the tables below.

Subject types are `expense_report` and `travel_request`. Owners and reviewers link to `users[].id`. Dates use `YYYY-MM-DD`. Action timestamps use ISO UTC strings from the runtime clock. Currency is USD and amounts are JSON numbers.

### Default IDs

| Records | IDs |
| --- | --- |
| Users | `u-riley`, `u-morgan`, `u-amara`, `u-luis`, `u-elena`, `u-isabel`, `u-devon`, `u-priya`, `u-mateo`, `u-noelle` |
| Expense reports | `ER-1001` through `ER-1048`. Riley can review `ER-1045` and `ER-1046`. |
| Travel requests | `TR-2001` through `TR-2042`. Riley can review `TR-2039` and `TR-2040`. |
| Approval cycles | `APR-3001` through `APR-3061` |
| Activity events | `ACT-7001` through `ACT-7196` |
| Nested lines | Expense entry IDs start with `EE-`. Travel estimate IDs start with `XE-`. |

## Minimal Inject Example

```json
{
  "account": { "activeUserId": "u-audit" },
  "users": [{ "id": "u-audit", "name": "Avery Stone" }],
  "expenseReports": [],
  "travelRequests": [],
  "approvals": [],
  "activity": []
}
```

## Observable State Changes (for LLM evaluation)

Every row appends one `activity[]` record with the listed `action` and common fields above. `activity[].status` is the resulting document status, or `deleted` on deletion. Line and receipt events include `lineId`, `lineAmount`, `quantity` and `receiptFileName` when available. Submission, recall and decisions include `approvalId`. Decisions also record `comment`.

| User action | Changed fields | `activity[].action` |
| --- | --- | --- |
| Create report | Append `expenseReports[]` with `id`, `ownerId`, `title`, `businessPurpose`, `costCenter`, `reportDate`, `currency`, `status=draft`, `createdAt`, `updatedAt`, `entries=[]`, `totalAmount=0`. | `created` |
| Edit report details | `expenseReports[].title/businessPurpose/costCenter/reportDate/updatedAt`. | `header_updated` |
| Delete report | Remove one `expenseReports[]` item and its nested `entries[]`. | `deleted` |
| Add expense | Append `expenseReports[].entries[]` with all entry fields except an unattached receipt; write `expenseReports[].totalAmount/updatedAt`. | `line_added` |
| Edit expense | `expenseReports[].entries[].category/transactionDate/merchant/amount/quantity/paymentType/description/updatedAt` and `expenseReports[].totalAmount/updatedAt`. | `line_updated` |
| Remove expense | Remove one `expenseReports[].entries[]` item; write `expenseReports[].totalAmount/updatedAt`. | `line_removed` |
| Attach or replace receipt | `expenseReports[].entries[].receipt` gets the full receipt object; write `expenseReports[].entries[].updatedAt` and `expenseReports[].totalAmount/updatedAt`. | `receipt_attached` |
| Remove receipt | `expenseReports[].entries[].receipt=null`; write `expenseReports[].entries[].updatedAt` and `expenseReports[].totalAmount/updatedAt`. | `receipt_removed` |
| Create request | Append `travelRequests[]` with `id`, `ownerId`, `title`, `businessPurpose`, `costCenter`, `origin`, `destination`, `startDate`, `endDate`, `currency`, `status=draft`, `createdAt`, `updatedAt`, `expectedExpenses=[]`, `estimatedTotal=0`. | `created` |
| Edit request details | `travelRequests[].title/businessPurpose/costCenter/origin/destination/startDate/endDate/updatedAt`. | `header_updated` |
| Delete request | Remove one `travelRequests[]` item and its nested `expectedExpenses[]`. | `deleted` |
| Add estimate | Append `travelRequests[].expectedExpenses[]` with all estimate fields; write `travelRequests[].estimatedTotal/updatedAt`. | `line_added` |
| Edit estimate | `travelRequests[].expectedExpenses[].category/description/quantity/unitAmount/lineTotal/updatedAt` and `travelRequests[].estimatedTotal/updatedAt`. | `line_updated` |
| Remove estimate | Remove one `travelRequests[].expectedExpenses[]` item; write `travelRequests[].estimatedTotal/updatedAt`. | `line_removed` |
| Submit or resubmit report/request | `expenseReports[].status/approverId/submittedAt/updatedAt` or `travelRequests[].status/approverId/submittedAt/updatedAt`; status becomes `pending_approval`. Append a new `approvals[]` record with status `pending`, subject link, snapshot, reviewer and submitter. | `submitted` |
| Recall report/request | `expenseReports[].status/updatedAt` or `travelRequests[].status/updatedAt`; status becomes `draft`. `approvals[].status/decidedAt/decidedBy`; status becomes `recalled`, with owner as decider. | `recalled` |
| Approve report/request | `expenseReports[].status/updatedAt` or `travelRequests[].status/updatedAt`; `approvals[].status/comment/decidedAt/decidedBy`. Both statuses become `approved`. | `approved` |
| Send back report/request | Same field paths as approval with status `sent_back` and a nonblank `approvals[].comment`. | `sent_back` |

Submit requires valid details and a valid line. Expense lines of USD 75 or more require a receipt before submission. Reviewer assignment prefers an eligible configured approver, then the owner's eligible manager, and can fall back to a user-selected eligible reviewer. The owner can mutate editable documents and recall their pending cycle. A different user assigned to the pending cycle can decide it if the linked document is pending. Closing a cycle retains its record.
