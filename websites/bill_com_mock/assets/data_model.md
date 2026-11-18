# BILL Accounts Payable — Proposed Harbor data model

`createInitialData()` returns a fresh JSON-serializable object. Array entries have string IDs. Relationships use IDs so Harbor can inject its own state. Business records use numeric USD amounts rounded to cents, date-only strings for bill and process dates, and ISO timestamps from `new Date().toISOString()` for user actions. Use integer cents when summing prices and totals. Sample values are fictional.

## Top-level keys and shapes

| Key | Shape and sample values |
| --- | --- |
| `account` | Object. `id: "org_northline"`, `name: "Northline Studio"`, `currency: "USD"`, `activeUserId: "user_maya"` (strings). |
| `users` | Array. `id: "user_maya"`, `name: "Maya Ortiz"`, `email: "maya@northline.example"`, `role: "AP Manager"`. All fields are strings. |
| `vendors` | Array. `id: "ven_001"`, `name: "Cedarline Paper Co."`, `email: "invoices@cedarline.example"`, `contactName: "Irene Park"`, `category: "Studio supplies"` (strings), `paymentMethods: ["ach", "check"]`, `defaultPaymentMethod: "ach"`. Contact fields and default method are optional. |
| `fundingAccounts` | Array. `id: "fund_operating"`, `name: "Operating Checking"`, `last4: "0418"`, `type: "checking"`. All fields are strings. `last4` is a fictional display label. |
| `bills` | Array. `id: "bill_001"`, `vendorId: "ven_001"`, `invoiceNumber: "CLP-1047"`, `invoiceDate: "2026-11-09"`, `dueDate: "2026-12-09"`, `memo: "Stock for the winter materials library"`, `lineItems: [LineItem]`, `amount: 232.5`, `currency: "USD"`, `approvalStatus: "draft"`, `approvalId: null`, `paymentStatus: "unpaid"`. Include `createdBy`, `createdAt`, `updatedBy`, and `updatedAt`. `memo` is optional. `approvalId` links to the latest submission or is null. |
| `approvals` | Array. `id: "apr_011"`, `billId: "bill_011"`, `approverId: "user_maya"`, `status: "pending"`, `createdBy: "user_maya"`, `createdAt: "2026-11-12T15:02:00.000Z"`, `decisionNote: null`, `decidedBy: null`, and `decidedAt: null`. Decisions set the final status and fill decision fields. An approval without a note records null. |
| `payments` | Array. `id: "pmt_001"`, `reference: "PAY-1045"`, `billId: "bill_045"`, `vendorId: "ven_009"`, `fundingAccountId: "fund_operating"`, `method: "ach"`, `processDate: "2026-11-23"`, `amount: 1860`, `currency: "USD"`, `status: "scheduled"`, `memo: "November production run"`, `createdBy: "user_maya"`, `createdAt: "2026-11-13T17:00:00.000Z"`, `cancelledBy: null`, and `cancelledAt: null`. `memo` is optional. |
| `activity` | Array. `id: "evt_001"`, `type: "bill_created"`, `billId: "bill_001"`, `vendorId: "ven_001"`, `approvalId: null`, `paymentId: null`, `actorId: "user_maya"`, `createdAt: "2026-11-09T13:30:00.000Z"`, `amount: 232.5`, `currency: "USD"`. Use `null` for relationships irrelevant to the event. |

`LineItem` is an embedded record with `id: "line_001"`, `description: "Recycled matte stock, 100-sheet pack"`, `quantity: 3`, `unitPrice: 77.5`, and `amount: 232.5`. Validate finite positive quantity and a nonnegative currency price with at most two decimals. Round each computed line total before summing. Each bill has at least one line item and a positive total. Group items by their containing bill.

## Eligibility and relationships

- Bill approval status is `draft`, `pending`, `approved`, or `denied`. Approval row status is `pending`, `approved`, or `denied`. Bill payment status is `unpaid`, `scheduled`, `processing`, or `paid`. Payment row status is `scheduled`, `processing`, `paid`, or `cancelled`.
- A vendor can have multiple bills. A bill can have multiple approval decisions across submissions and multiple payment records across cancellations. Use the bill's `approvalId` to select the current approval. A pending decision requires its `approverId` to match `account.activeUserId` and its bill to reference the pending approval.
- A bill is payable when approved and unpaid, its vendor and funding options resolve, and the bill has no scheduled, processing, or paid payment. Cancellation requires a linked scheduled bill and its scheduled payment. Keep exactly one non-cancelled payment per scheduled, processing, or paid seed bill. Exclude cancelled payments from active balances and retain them in history.
- Render injected records with missing optional fields using neutral labels, omit optional blank values, and disable actions that require unresolved links. Use safe arrays, stable record IDs, and valid-date guards in selectors and formatting. Derive relative dates at render time using the runtime clock. Show a scheduled record according to its stored status even if its date is in the past.
- Overview counts and amounts follow the linked list views. Pending approvals reflect the active user's actionable assignments. Ready to pay reflects current payment eligibility. Scheduled payments reflect `payments.status === 'scheduled'`. Payment activity in Bills includes scheduled, processing, and paid bills. Drafts, pending, and ready-to-pay views read the states documented above.

## Seed inventory

- `account` and `users` contain Northline Studio and three users with stable IDs such as `user_maya`, `user_jordan`, and `user_priya`. Set `fund_operating` and `fund_reserve` as the two funding accounts.
- `vendors` contains 32 named fictional domestic suppliers using IDs `ven_001` through `ven_032`. Include studio materials, printing, IT, facilities, freight, professional services, and software. Mix ACH-only, check-only, and vendors that accept both.
- `bills` contains 72 rows with fixed IDs, varied amounts and due dates, and one to four line items. Seed 10 drafts, 16 pending, 6 denied, and 40 approved. Of the approved bills, 12 are unpaid, 8 scheduled, 4 processing, and 16 paid. Spread related bills across the directory and include multiple bills for the same vendor.
- `approvals` contains 62 rows linked as current approvals to the non-draft bills, plus four past denials for bills submitted again. At least eight current pending approvals belong to Maya. Ensure prior decisions precede resubmissions and that denied records include reasons.
- `payments` contains 36 rows. Seed the 28 non-cancelled payments from the matching bills and eight cancelled payments on bills that are now unpaid or have a newer payment. Include a clearly identifiable scheduled payment Maya can cancel and a ready-to-pay bill for each delivery method.
- `activity` contains linked events for seeded bill creation, submission, decisions, scheduling and cancellation as applicable. Use fixed dates covering several months and keep dates and actors consistent across linked row histories. Give at least one draft, denied bill assigned to Maya on resubmission, and ready-to-pay bill distinct searchable invoice numbers.

## Observable transactions

| Confirmed action | State writes |
| --- | --- |
| Create draft | Insert `bills` with entered fields, computed totals, `approvalStatus: 'draft'`, `approvalId: null`, `paymentStatus: 'unpaid'`, both actor fields and timestamps. Append `activity` type `bill_created`. |
| Edit a draft or denied bill | Update permitted invoice fields, vendor, totals and line items, `updatedBy`, and `updatedAt`. Append `activity` type `bill_updated`. Preserve statuses and the linked denied decision until a new submission. |
| Submit or resubmit | Append `approvals` row with `billId`, `approverId`, pending status, actor and timestamp. Set `bills.approvalStatus` to pending and `bills.approvalId` to the new row ID. Update `bills.updatedBy` and `bills.updatedAt`, and append `approval_submitted` activity with `approvalId`. Save and send also creates the bill and `bill_created` activity in the same transaction. |
| Approve or deny | Update `approvals.status`, `decisionNote`, `decidedBy`, and `decidedAt`. Mirror status in `bills.approvalStatus`, set bill update fields, and append linked `approval_approved` or `approval_denied` activity. |
| Schedule payment | Append `payments` with the selected bill, its vendor, date, funding source, method, amount, reference, memo, scheduled status, and creation metadata. Set `bills.paymentStatus` to scheduled with update metadata. Append `payment_scheduled` with `paymentId`. |
| Cancel payment | Mark `payments.status` cancelled and write `cancelledBy` and `cancelledAt`. Set `bills.paymentStatus` to unpaid with update metadata. Append `payment_cancelled` with `paymentId`. |

Events capture the actor, timestamp, vendor, bill, and amount as they stood when the action happened. For linked approval or payment history, use the related record ID on the event. The linked bill ID remains stable if a denied bill is corrected. Update rows immutably and commit each confirmed transaction once, with no timer-driven writes or server calls beyond the shared local Harbor API. `SCHEMA.md` must reflect the implemented shapes and exact writes for the verifier.
