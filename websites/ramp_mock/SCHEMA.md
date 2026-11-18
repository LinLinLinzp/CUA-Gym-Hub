# ramp_mock Schema

**Base URL** `http://localhost:5406/`  
**Go Endpoint** `GET /go?sid=<sid>` returns `{initial_state, current_state, state_diff}`.  
**Inject** `POST /post?sid=<sid>` with `{"action":"set","state":{...}}`.  
**Reset** `POST /post?sid=<sid>` with `{"action":"reset"}` restores the stored initial snapshot. If the session has no initial snapshot, the API restores the defaults.

The Harbor state is one JSON object. IDs are strings. Amounts are currency units stored as numbers, with invoice line totals rounded to cents before summing. Calendar dates use ISO `YYYY-MM-DD` strings. Timestamps are ISO date-time strings. Nullable links denote absent relationships. Injected optional values may be absent. Existing unknown fields and unrelated records are carried forward during edits.

## State Schema

| Top-level key | Record fields |
| --- | --- |
| `workspace` | Object with `id`, `name`, `currency`, `currentUserId`. |
| `people[]` | `id`, `name`, `email`, `department`, `role` (`finance_admin\|manager\|ap_specialist\|employee`), `managerId` (nullable). |
| `vendors[]` | `id`, `name`, `category`, `contactEmail`. |
| `cards[]` | `id`, `name`, `holderId`, `type` (`virtual\|physical`), `last4` (four-character string), `status` (`active\|locked\|terminated`), `limitAmount`, `limitCadence` (`one_time\|monthly\|annual`), `spentAmount`, `currency`, `createdBy`, `createdAt`, `updatedAt`. |
| `bills[]` | `id`, `vendorId`, `invoiceNumber`, `invoiceDate`, `dueDate`, `memo`, `lineItems[]` (`id`, `description`, `quantity`, `unitAmount`, `amount`), `amount`, `currency`, `status` (`draft\|pending_approval\|rejected\|approved\|scheduled\|paid`), `approvalId`, `paymentId`, `createdBy`, `createdAt`, `updatedAt`, `submittedAt`. The two links and `submittedAt` are initially null on drafts. |
| `payments[]` | `id`, `billId`, `amount`, `currency`, `method` (`ach\|check\|external`), `status` (`scheduled\|canceled\|paid`), `scheduledDate`, `paidOn`, `createdBy`, `createdAt`, `updatedBy`, `updatedAt`. Dates can be null. |
| `spendRequests[]` | `id`, `title`, `purpose`, `requesterId`, `department` (nullable), `amount`, `currency`, `status` (`pending_approval\|approved\|rejected`), `approvalId`, `createdBy`, `createdAt`, `updatedAt`. |
| `approvals[]` | `id`, `subjectType` (`bill\|spend_request`), `subjectId`, `title`, `requesterId`, `amount`, `currency`, `status` (`pending\|approved\|rejected`), `reviewerIds[]`, `stepIndex` (zero-based), `routing`, `decisions[]`, `createdBy`, `createdAt`, `updatedAt`. Routing snapshots contain `policyId`, `version`, `firstReviewerId`, `secondReviewerId`, `thresholdAmount` (each nullable). A decision has `id`, `stepIndex`, `reviewerId`, `actorId`, `decision` (`approve\|reject`), `note`, `createdAt`. |
| `policies[]` | `id`, `kind` (`expense_requirements\|spend_request_approvals\|bill_approvals\|guidance`), `name`, `version`, `rules`, `updatedBy`, `updatedAt`. Expense rules contain `receipt` and `memo` with `mode` (`always\|threshold\|never`) and `thresholdAmount` (nullable). Routing rules contain `firstReviewerId`, `secondReviewerId`, and `thresholdAmount` (secondary fields nullable). Guidance contains `description`. |
| `policyRevisions[]` | `id`, `policyId`, `version`, `rules` (full snapshot), `createdBy`, `createdAt`. |
| `activity[]` | `id`, `action`, `objectType` (`card\|bill\|spend_request\|approval\|policy`), `objectId`, `related` (ID map), `actorId`, `createdAt`, `changes` (field map with `from` and `to`). |

### Default IDs

| Entity | IDs |
| --- | --- |
| Workspace and signed-in user | `workspace-northline`, `person-001` (Avery Chen) |
| People and vendors | `person-001`–`person-024`, `vendor-001`–`vendor-018` |
| Cards, bills, and payments | `card-001`–`card-036`, `bill-001`–`bill-036`, `payment-001`–`payment-012` |
| Spend requests and approvals | `request-001`–`request-030`, `approval-001`–`approval-060` |
| Policies | `policy-expenses`, `policy-spend`, `policy-bills`, `policy-vendors`, `policy-travel`, `policy-runs` |
| Policy revisions | `revision-expenses-001`–`003`, `revision-spend-001`–`003`, `revision-bills-001`–`003` |
| Activity | `activity-001`–`activity-031` |

## Minimal Inject Example

The example replaces the card array with one card and inherits the other seed records. Load `/cards/card-injected?sid=<sid>` in a fresh browser session for this injection.

```json
{
  "action": "set",
  "state": {
    "cards": [
      {
        "id": "card-injected",
        "name": "Studio materials",
        "holderId": "person-002",
        "type": "virtual",
        "last4": "0123",
        "status": "active",
        "limitAmount": 250,
        "limitCadence": "monthly",
        "spentAmount": 0,
        "currency": "USD"
      }
    ]
  }
}
```

## Observable State Changes

Each successful action writes one full state snapshot via `POST /post` with `set_current` and appends one activity record. Activity fields are as listed above. For a create or append below, all fields of the corresponding record shape are written. `/go` exposes changed top-level keys in `state_diff`.

| User action | Exact business writes | Activity action and references |
| --- | --- | --- |
| Issue virtual card | Append card with `type=virtual`, `status=active`, `spentAmount=0`. | `card.issued`, card ID |
| Edit spending limit | Card `limitAmount`, `limitCadence`, `updatedAt`. | `card.limit_updated`, card ID, changed limit and cadence |
| Lock, unlock, terminate | Card `status`, `updatedAt`. | `card.locked`, `card.unlocked`, or `card.terminated`, card ID and status change |
| Save new bill | Append bill with `status=draft`. | `bill.created`, bill ID |
| Edit bill | Bill `vendorId`, `invoiceNumber`, `invoiceDate`, `dueDate`, `memo`, `lineItems`, `amount`, `updatedAt`. | `bill.updated`, bill ID and changed invoice fields |
| Submit or resubmit bill | Bill `status=pending_approval`, `submittedAt`, `updatedAt`, `approvalId`. Append approval with `subjectType=bill`, `status=pending`, `stepIndex=0`. | `bill.submitted`, bill ID, related `approvalId`, status and approval link changes |
| Schedule payment | Bill `status=scheduled`, `paymentId`, `updatedAt`. Append payment with `status=scheduled` and selected `scheduledDate` and `method`. | `bill.payment_scheduled`, bill ID, related `paymentId`, bill status/link plus payment status and method |
| Unschedule payment | Bill `status=approved`, `paymentId=null`, `updatedAt`. Payment `status=canceled`, `updatedBy`, `updatedAt`. | `bill.payment_unscheduled`, bill ID, related `paymentId`, bill status/link and payment status |
| Mark paid externally | Bill `status=paid`, `paymentId`, `updatedAt`. Append external payment or update linked scheduled payment `status=paid`, `method=external`, `paidOn`, `updatedBy`, `updatedAt`. | `bill.paid`, bill ID, related `paymentId`, changed bill status/link plus payment status and method |
| Submit spend request | Append request with `status=pending_approval` and `approvalId`. Append approval with `subjectType=spend_request`, `status=pending`, `stepIndex=0`. | `spend_request.submitted`, request ID, related `approvalId` |
| Approve or reject a step | Append approval decision. Approval `stepIndex`, `status`, `updatedAt`. When final, also bill or spend request `status` and `updatedAt`. | `approval.approved` or `approval.rejected`, approval ID, related `approvalId` and `billId` or `spendRequestId`, changed step and status plus final subject status |
| Publish policy | Policy `rules`, `version`, `updatedAt`, `updatedBy`. Append revision with full rule snapshot. | `policy.published`, policy ID, related `policyRevisionId`, changed rules and version |

A submit snapshots the highest current version represented by the applicable policy record. The threshold is inclusive and an unavailable first reviewer falls back to the signed-in administrator when present. Approval history retains its submitted reviewer IDs and routing snapshot after later policy edits. Navigation, search, filters, drafts, cancel, and idle time leave business state untouched.
