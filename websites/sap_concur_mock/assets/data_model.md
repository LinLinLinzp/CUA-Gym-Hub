# SAP Concur state model

Implement the defaults in `src/data/seed.js` as `createInitialData()`. Snake-case values are stored enums. IDs and dates are strings. User-action timestamps use `new Date().toISOString()`. Date-only fields use `YYYY-MM-DD`. Monetary values are numbers, with arithmetic in integer cents and conversion back to numbers. Use USD throughout this exercise. Fields marked optional may be missing or null in an injected world.

## Top-level keys

| Key | Shape | Purpose |
| --- | --- | --- |
| `account` | `{ activeUserId: string, organizationName: string, currency: "USD" }` | Seed as `u-riley`, `Alder Ridge Engineering`, `USD`. |
| `users` | `User[]` | Synthetic employees and reviewers. |
| `expenseReports` | `ExpenseReport[]` | Actual expenses and receipts. |
| `travelRequests` | `TravelRequest[]` | Planned travel and cost estimates. |
| `approvals` | `Approval[]` | One review cycle per submission. |
| `activity` | `ActivityEvent[]` | Append-only business history. |

### User

| Field | Type and example |
| --- | --- |
| `id` | String, `u-riley`. |
| `name`, `roleTitle` | Strings, `Riley Chen`, `Operations Program Manager`. |
| `department`, `costCenter` | Strings, `Operations`, `OPS-210`. |
| `managerId` | Optional user ID, `u-morgan`. |

### Shared document fields

| Field | Type and example |
| --- | --- |
| `id`, `ownerId`, `approverId` | String IDs, `ER-1024` or `TR-2024`, `u-riley`, `u-morgan`. The approver may be missing before submission. |
| `title`, `businessPurpose`, `costCenter` | Strings, `Field readiness workshop`, `Review installation plans with the Denver team`, `OPS-210`. |
| `currency` | String, `USD`. |
| `status` | `draft`, `pending_approval`, `sent_back` or `approved`. Reports also support historical `paid`. |
| `createdAt`, `updatedAt` | ISO timestamps, for example `2026-11-10T15:20:00.000Z`. |
| `submittedAt` | Optional ISO timestamp of the latest submission. Preserve it on recall; the new cycle replaces it on resubmission. |

### ExpenseReport, ExpenseEntry and Receipt

| Field | Type and example |
| --- | --- |
| `reportDate` | Date string, `2026-11-10`. |
| `totalAmount` | Number, `268.40`, sum of entry amounts. |
| `entries` | Array of ExpenseEntry. |
| Entry `id`, `createdBy`, `createdAt`, `updatedAt` | String ID `EE-4157`, actor `u-riley` and ISO timestamps. |
| Entry `category`, `merchant`, `transactionDate` | Strings, `Lodging`, `Juniper House Hotel`, `2026-11-08`. |
| Entry `amount`, `quantity` | Number `224.40` and integer `1`. |
| Entry `paymentType`, `description` | `out_of_pocket` or `company_card`; optional text such as `One night near the workshop venue`. |
| Entry `receipt` | Optional Receipt object. |
| Receipt `fileName`, `url`, `contentType`, `size`, `attachedAt`, `attachedBy` | `juniper-house-receipt.svg`, `/receipts/juniper-house-receipt.svg`, `image/svg+xml`, byte count, ISO timestamp and `u-riley`. When uploaded, use the local URL and metadata returned by `/upload?sid=…`. |

Use recognizable categories such as Airfare, Lodging, Ground Transport, Meals, Office Supplies and Other. The exercise requires a receipt on any line of USD 75 or more at submission. Allow saving a draft line without a receipt. Clearing a receipt sets `receipt` to null. Attachments become visible in state after an accepted save, and uploaded content stays outside the state JSON.

### TravelRequest and ExpectedExpense

| Field | Type and example |
| --- | --- |
| `origin`, `destination` | Strings, `Boston, MA`, `Denver, CO`. |
| `startDate`, `endDate` | Date strings, `2026-12-03`, `2026-12-06`. |
| `estimatedTotal` | Number, `750.00`, sum of `lineTotal`. |
| `expectedExpenses` | Array of ExpectedExpense. |
| Line `id`, `createdBy`, `createdAt`, `updatedAt` | String ID `XE-3108`, actor `u-riley` and ISO timestamps. |
| Line `category`, `description` | Strings, `Lodging`, `Three nights near the distribution center`. |
| Line `quantity`, `unitAmount`, `lineTotal` | Positive integer `3`, number `250.00`, number `750.00`. |

Accept same-day trips and validate that end date is on or after start date. Expense and estimate amounts must be finite, positive and at most two decimal places. Allow historical date data. Require at least one line on submission.

### Approval

| Field | Type and example |
| --- | --- |
| `id`, `subjectType`, `subjectId` | `APR-3068`, `expense_report` or `travel_request`, `ER-1024`. Use the same subject type values on approval detail URLs. |
| `submitterId`, `approverId` | `u-amara`, `u-riley`. |
| `status` | `pending`, `approved`, `sent_back`, or `recalled`. |
| `createdAt`, `decidedAt`, `decidedBy` | Submission timestamp, optional resolution timestamp and optional actor ID. Recall is closed by the owner. |
| `comment` | Optional decision note, required when sent back, e.g. `Please attach the hotel folio.` |
| `subjectTitle`, `submitterName`, `amount`, `currency` | Submission snapshot, e.g. `Denver field workshop`, `Amara Okafor`, `326.54`, `USD`. |

Assign the document's configured approver if valid, otherwise the owner's manager. If neither resolves to an eligible user, allow a reviewer selection during submission and save `approverId`; when nobody is eligible, explain the condition and keep the document editable. Only the active owner can edit, submit or recall their own document. Only an assigned reviewer who is distinct from the owner may decide a pending approval with a matching pending document. Filter by approval ID when applying a decision. If multiple historical cycles share the detail URL, use optional `approvalId` in the query to select a cycle, preserving `sid`; otherwise show the current pending cycle or the latest history entry. An approval created by a resubmission receives a fresh ID and never replaces a previous cycle.

### ActivityEvent

| Field | Type and example |
| --- | --- |
| `id`, `action`, `actorId`, `createdAt` | `ACT-9089`, `sent_back`, `u-riley`, ISO timestamp. |
| `subjectType`, `subjectId`, `subjectTitle` | `expense_report`, `ER-1024`, `Denver field workshop`. |
| `status`, `amount`, `currency` | Resulting document status or `deleted`, total at event time, `USD`. |
| `approvalId`, `comment` | Optional linked cycle and reason on workflow events. |
| `lineId`, `lineAmount`, `quantity` | Optional line snapshot for line and receipt mutations. For removal retain values from the deleted line. |
| `receiptFileName` | Optional filename snapshot on receipt attach/remove. |

Use actions `created`, `header_updated`, `deleted`, `line_added`, `line_updated`, `line_removed`, `receipt_attached`, `receipt_removed`, `submitted`, `recalled`, `approved` and `sent_back`. Each committed command appends one event. A form that adds a line with a receipt in one save uses `line_added` with the receipt filename. Use the active user's ID as the event actor. A confirmed deletion removes only editable documents and their nested data. Keep closed approval snapshots and activity resolvable by ID.

## Fixture requirements

- Use fixed IDs such as `ER-1001` through `ER-1048` and `TR-2001` through `TR-2042`. Use fixed date offsets from a fixed reference date. Generate unique runtime IDs only in commands. Seed at least 24 documents of each type under Riley Chen and distribute the remainder among coworkers.
- Seed Morgan Bell as Riley's manager. Add Amara Okafor and Luis Romero as employees reporting to Riley, and at least five more coworkers across Operations, Finance and Client Services.
- Include draft, pending, sent-back and approved records in both libraries and paid expense reports in history. Seed at least 24 review cycles in total, including pending, approved, returned and recalled examples with matching document status. Each owner's pending document has one linked open review.
- Reserve deterministic pending records that Riley can approve or return independently. For example, `ER-1045` and `ER-1046` from Amara, `TR-2039` and `TR-2040` from Luis. Seed two different pending Riley-owned documents for recall. Seed submissions and decisions as activity events wherever those events appear in the visible timeline.
- Use null-safe accessors for independently injected arrays and optional nested values. Keep a missing reference visible through the record ID or approval snapshot. Treat a pending approval without a matching document as unavailable for action. Absent optional data must never trigger a migration or a save on load.
