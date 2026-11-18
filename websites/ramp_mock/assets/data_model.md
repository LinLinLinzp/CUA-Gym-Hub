# Ramp workspace data model

Use `createInitialData()` in `src/data/seed.js` to return a fresh JSON-compatible object on each call. The examples below are the planning schema. The developer documents the implemented schema and writes in root-level `SCHEMA.md`.

## Top-level keys and example records

Each JSON object on one line is a representative record. These examples illustrate individual shapes. The full seed supplies the referenced records. IDs, names, enum values, calendar dates, and timestamps are strings. Money, quantities, versions, and step indexes are JSON numbers. The examples show nullable fields explicitly. New records use stable unique IDs created at submit time. Seed IDs and dates are fixed.

```json
{
  "workspace": {"id":"workspace-northline","name":"Northline Studio","currency":"USD","currentUserId":"person-001"},
  "people": [
    {"id":"person-001","name":"Avery Chen","email":"avery.chen@example.test","department":"Finance","role":"finance_admin","managerId":null},
    {"id":"person-002","name":"Jordan Lake","email":"jordan.lake@example.test","department":"Operations","role":"manager","managerId":"person-001"}
  ],
  "vendors": [
    {"id":"vendor-001","name":"Alder Stationery","category":"Office supplies","contactEmail":"billing@alder-stationery.example.test"}
  ],
  "cards": [
    {"id":"card-001","name":"Studio supplies","holderId":"person-002","type":"virtual","last4":"0427","status":"active","limitAmount":2500,"limitCadence":"monthly","spentAmount":685.46,"currency":"USD","createdBy":"person-001","createdAt":"2026-10-05T15:00:00.000Z","updatedAt":"2026-10-05T15:00:00.000Z"}
  ],
  "bills": [
    {"id":"bill-001","vendorId":"vendor-001","invoiceNumber":"AS-1048","invoiceDate":"2026-10-12","dueDate":"2026-11-12","memo":"Studio opening supplies","lineItems":[{"id":"line-001","description":"Drawing stock","quantity":8,"unitAmount":45.5,"amount":364}],"amount":364,"currency":"USD","status":"pending_approval","approvalId":"approval-001","paymentId":null,"createdBy":"person-001","createdAt":"2026-10-13T15:00:00.000Z","updatedAt":"2026-10-14T15:00:00.000Z","submittedAt":"2026-10-14T15:00:00.000Z"}
  ],
  "payments": [
    {"id":"payment-002","billId":"bill-002","amount":1458.5,"currency":"USD","method":"ach","status":"scheduled","scheduledDate":"2026-11-25","paidOn":null,"createdBy":"person-001","createdAt":"2026-11-16T15:00:00.000Z","updatedBy":"person-001","updatedAt":"2026-11-16T15:00:00.000Z"}
  ],
  "spendRequests": [
    {"id":"request-001","title":"Lighting equipment rental","purpose":"Rent two fixtures for the product shoot","requesterId":"person-002","department":"Operations","amount":1600,"currency":"USD","status":"pending_approval","approvalId":"approval-003","createdBy":"person-001","createdAt":"2026-11-10T14:00:00.000Z","updatedAt":"2026-11-10T14:00:00.000Z"}
  ],
  "approvals": [
    {"id":"approval-001","subjectType":"bill","subjectId":"bill-001","title":"AS-1048 · Alder Stationery","requesterId":"person-001","amount":364,"currency":"USD","status":"pending","reviewerIds":["person-002"],"stepIndex":0,"routing":{"policyId":"policy-bills","version":3,"firstReviewerId":"person-002","secondReviewerId":"person-001","thresholdAmount":1000},"decisions":[],"createdBy":"person-001","createdAt":"2026-10-14T15:00:00.000Z","updatedAt":"2026-10-14T15:00:00.000Z"}
  ],
  "policies": [
    {"id":"policy-expenses","kind":"expense_requirements","name":"Expense requirements","version":3,"rules":{"receipt":{"mode":"threshold","thresholdAmount":75},"memo":{"mode":"always","thresholdAmount":null}},"updatedBy":"person-001","updatedAt":"2026-10-01T14:00:00.000Z"},
    {"id":"policy-bills","kind":"bill_approvals","name":"Bill approvals","version":3,"rules":{"firstReviewerId":"person-002","secondReviewerId":"person-001","thresholdAmount":1000},"updatedBy":"person-001","updatedAt":"2026-10-01T14:00:00.000Z"},
    {"id":"policy-spend","kind":"spend_request_approvals","name":"Spend request approvals","version":3,"rules":{"firstReviewerId":"person-002","secondReviewerId":"person-001","thresholdAmount":1500},"updatedBy":"person-001","updatedAt":"2026-10-01T14:00:00.000Z"}
  ],
  "policyRevisions": [
    {"id":"revision-bills-003","policyId":"policy-bills","version":3,"rules":{"firstReviewerId":"person-002","secondReviewerId":"person-001","thresholdAmount":1000},"createdBy":"person-001","createdAt":"2026-10-01T14:00:00.000Z"}
  ],
  "activity": [
    {"id":"activity-001","action":"bill.submitted","objectType":"bill","objectId":"bill-001","related":{"approvalId":"approval-001"},"actorId":"person-001","createdAt":"2026-10-14T15:00:00.000Z","changes":{"status":{"from":"draft","to":"pending_approval"}}}
  ]
}
```

Approval decisions are nested. Example with the signed-in finance admin recording the assigned reviewer's decision in the synthetic workspace:

```json
{"id":"decision-001","stepIndex":0,"reviewerId":"person-002","actorId":"person-001","decision":"approve","note":"Matched the order","createdAt":"2026-11-16T15:15:00.000Z"}
```

## Field conventions and relationships

- `workspace.currentUserId`, `holderId`, `requesterId`, reviewer IDs, `createdBy`, `updatedBy`, and `actorId` reference `people[].id`. The signed-in administrator records decisions. The current assigned reviewer's identity is retained in each decision.
- `people[].role` uses `finance_admin`, `manager`, `ap_specialist`, or `employee`. `managerId` is optional. Use example-test addresses for all people and vendor contact data.
- Card types are `virtual` and `physical`. Card statuses are `active`, `locked`, and `terminated`. Cadences are `one_time`, `monthly`, and `annual`. Keep `last4` a four-character string.
- Bills link to `vendors` by `vendorId`, to the latest approval by `approvalId`, and to the current payment by `paymentId`. Bill status values are `draft`, `pending_approval`, `rejected`, `approved`, `scheduled`, and `paid`. Prior approvals and payments remain searchable via their subject or bill link. Draft links and `submittedAt` are initially null.
- Payment status values are `scheduled`, `canceled`, and `paid`. Scheduled methods are `ach` and `check`. A new record for an external payment uses `method: external` and a null `scheduledDate`. When an existing scheduled record is marked paid externally, change its method to `external`, retain its scheduled date for history, and capture the previous method in activity.
- Spend request statuses are `pending_approval`, `approved`, and `rejected`. Approvals use `subjectType: bill|spend_request` and link to the corresponding array via `subjectId`. Approval statuses are `pending`, `approved`, and `rejected`. Decision values are `approve` and `reject`. Omit an approval note or store an empty string when it is optional and blank.
- Policy rules are typed by kind. Receipt and memo modes are `always`, `threshold`, and `never`. Require a positive threshold in threshold mode and store null for the other modes. Approval thresholds are inclusive. Store null in both `secondReviewerId` and `thresholdAmount` when a secondary review is disabled. For the three remaining read-only seed policy records, use `kind: guidance` and `rules: {description: string}` for guidance such as Vendor onboarding, Travel spend, and Payment runs. Include a snapshot of the current rules among each editable policy's revisions.
- Activity `action` comes from the action table below. `objectType` identifies the initiating entity, and `objectId` references its ID. `related` is an object with relevant IDs such as `approvalId`, `billId`, `spendRequestId`, `paymentId`, or `policyRevisionId`. `changes` contains changed business fields as `{from, to}` pairs and can be empty for creation events with no prior state.
- Amount calculations use integer cents and serialize as numbers. Line totals are rounded to cents before summing the bill. Use ISO timestamps for mutations and `YYYY-MM-DD` for invoice, due, scheduled, and paid dates. Generate timestamps once per mutation from `new Date().toISOString()`.

## Routing and transitions

At submission, resolve the applicable policy by `kind`. Copy its revision number and rules to the new approval's `routing` snapshot. Start `reviewerIds` with the first reviewer. Add the second reviewer when enabled and the submitted amount is at or above the threshold. If an injected world lacks the applicable route or valid first reviewer, use the signed-in admin if present and display that fallback. Store null for the policy ID, version, and rule fields if there is no applicable policy to snapshot. If neither the configured reviewer nor the signed-in admin exists, disable submission with actionable feedback. A missing secondary reviewer or one already in the chain is omitted from the effective chain. Preview the effective chain when collecting the request or confirming the bill submission.

`stepIndex` starts at zero and points to the pending reviewer. Approve appends one decision and increments the index. If another step remains, the approval and subject stay pending. When the index reaches the number of reviewers, both records become approved. Reject appends a decision, keeps the rejected step index, and sets both records to rejected. Guard the action against completed approval records and obsolete links from a newer submission. Preserve queued routing and history when a policy is edited.

An approved bill has no current scheduled payment. Scheduling creates one and sets the bill to scheduled. Unschedule cancels that payment, clears the active pointer, and restores the approved bill. Mark paid externally creates a paid payment for an approved bill or updates the linked scheduled payment. Store the current paid payment ID on the bill. Completed bills remain visible and cannot enter payment twice.

## Planned state changes

Every row is one store mutation and one save. Updated records keep their original IDs and creation fields. Activity entries record the action, actor, timestamp, and relevant IDs.

| User action | Record changes | Activity action |
| --- | --- | --- |
| Issue virtual card | Append `cards[]` with active status and zero spend | `card.issued` |
| Edit card limit | Update `cards[].limitAmount`, `.limitCadence`, `.updatedAt` | `card.limit_updated` |
| Lock, unlock, or terminate card | Update `cards[].status`, `.updatedAt` | `card.locked`, `card.unlocked`, `card.terminated` |
| Save new or edited invoice | Append draft or update draft or rejected bill's form fields, computed line amounts, total, and `updatedAt` | `bill.created` or `bill.updated` |
| Submit draft or rejected bill | Update `bills[].status`, `.approvalId`, `.submittedAt`, `.updatedAt`. Append linked `approvals[]` record | `bill.submitted` |
| Schedule payment | Append `payments[]` record. Update `bills[].status`, `.paymentId`, `.updatedAt` | `bill.payment_scheduled` |
| Unschedule payment | Set `payments[].status` to canceled and update its `updatedBy` and `updatedAt`. Reset bill to approved, clear `paymentId`, and update `updatedAt` | `bill.payment_unscheduled` |
| Mark paid externally | Create or update payment to paid with `paidOn`, `method`, `updatedBy`, and `updatedAt`. Update `bills[].status`, `.paymentId`, `.updatedAt` | `bill.paid` |
| Submit spend request | Append `spendRequests[]` and linked `approvals[]` records | `spend_request.submitted` |
| Approve or reject | Append `approvals[].decisions[]` and update approval `stepIndex`, `status`, and `updatedAt` as applicable. Update subject `status` and `updatedAt` when final | `approval.approved` or `approval.rejected` |
| Publish policy | Update `policies[].rules`, `.version`, `.updatedAt`, `.updatedBy`. Append `policyRevisions[]` snapshot with new version | `policy.published` |

## Seed coverage and injection

Vary card types, names, statuses, and cadences. Seed invoice line items with realistic amounts, several overdue and upcoming due dates, and contextual memo text. Include bill and spend approval records with both pending and completed outcomes, a two-step pending item, and a rejected item with a saved reason. Each submitted bill and spend request requires a linked approval, so increase the approval count as needed. Scheduled and paid bills each require a linked payment.

Use referentially valid defaults. Under injected state, use clear fallbacks for omitted optional names, dates, line items, decisions, and histories. List records whose linked lookups are absent. Enable actions only when their required data is present, and present a reason when blocked. Render injected arrays as supplied and carry their unknown fields forward through user changes.
