# freshbooks_mock Schema

**Base URL** `http://localhost:5414/`  
**Go Endpoint** `GET /go?sid=<sid>` → `{initial_state, current_state, state_diff}`  
**Read stored state** `GET /state?sid=<sid>` → `{stored_state, has_custom_state, sid}`  
**Inject** `POST /post?sid=<sid>` with `{"action":"set","state":{...}}`  
**Reset** `POST /post?sid=<sid>` with `{"action":"reset"}`

A fresh client merges injected objects over the defaults, replaces arrays, and skips null overrides. Hydration posts one merged snapshot using `set`. Successful UI commands post a full snapshot using `set_current`. Once established, the initial snapshot is preserved by later `set` and `set_current` calls. Reset restores current state to the initial snapshot. Use a fresh browser context to read an injection or reset if the same `sid` is already cached in localStorage. The top-level `state_diff` reports changed values as `{"modified": value}` and added keys as `{"added": value}`. The workspace stores business dates in UTC as `YYYY-MM-DD` and event times as ISO timestamps.

All top-level records in business collections, including `activeTimer` when present, have a string `id`, ISO `createdAt/updatedAt`, and user IDs `createdBy/updatedBy`. Events have their own metadata. Dollar amounts are numeric to two decimals. Time entries use integer minutes and timers use integer seconds. Unset foreign keys and timestamps written by forms use `null`.

## State Schema

| Key | Type | Record shape |
| --- | --- | --- |
| `business` | Object | `{id, name, email, currency, netDays, address}`. Address has string `street, city, region, postalCode, country`. |
| `currentUserId` | String | ID of the user executing commands. Default `usr_maya`. |
| `users` | Array of objects | `name, email, role`. Roles include `owner`, `controller`, and `consultant`. |
| `clients` | Array of objects | `name, email, currency, billingAddress, visibility, contacts[]`. Contact shape is `{id, name, email}`. Visibility is `active/archived`. Billing address uses the business address shape. |
| `projects` | Array of objects | `clientId, name, billingType, hourlyRate, expenseMarkupPercent, retainerId, status`. Billing types are `hourly/flat/internal`. Project status is `active/completed/archived`. Rate and retainer link can be null. |
| `services` | Array of objects | `name, description, defaultRate, defaultTaxPercent, active`. |
| `expenseCategories` | Array of objects | `name, parentId, active`. Default category ID is `cat_uncategorized`. |
| `invoices` | Array of objects | `clientId, projectId, invoiceNumber, reference, kind, issueDate, dueDate, currency, lines[], notes, terms, discountPercent, subtotal, discountAmount, taxAmount, total, amountPaid, amountDue, status, visibility, sentAt, retainerId, retainerPeriodStart`. Kinds are `standard/retainer_fee/retainer_excess`. Status is `draft/sent/partial/paid`. Overdue is derived from status, due date and balance. |
| `payments` | Array of objects | `invoiceId, clientId, paymentDate, currency, amount, method, reference, notes, status`. Method is `cash/check/bank_transfer/credit_card/other` and status is `recorded`. |
| `timeEntries` | Array of objects | `userId, workDate, durationMinutes, clientId, projectId, serviceId, notes, billable, status, invoiceId, retainerId, retainerPeriodStart, timerId, visibility`. Billing status is `non_billable/unbilled/billed` and visibility is `active/deleted`. A retainer time entry uses a period link and leaves `invoiceId` null. |
| `activeTimer` | Object or null | `null` or `{id, userId, workDate, clientId, projectId, serviceId, notes, billable, applyToRetainer, status, startedAt, accumulatedSeconds, createdAt, createdBy, updatedAt, updatedBy}`. Status is `running/paused`. |
| `expenses` | Array of objects | `merchant, categoryId, expenseDate, description, source, currency, total, taxes[], clientId, projectId, billable, status, markupPercent, includeReceiptOnInvoice, invoiceId, receipt, visibility`. Source is `manual/imported`. Tax shape is `{ name, percent, amount }`. Billing status is `non_billable/unbilled/billed`. |
| `retainers` | Array of objects | `clientId, startDate, periodUnit, customPeriodDays, feePerPeriod, includedMinutes, excessHourlyRate, currency, nextIssueDate, scheduleAnchorDate, scheduleIndex, periodIndex, invoicesRemaining, deliveryMode, invoiceNotes, invoiceTerms, status, visibility`. Cadence is `weekly/monthly/yearly/custom`. Delivery mode is `send_automatically/create_draft`. Remaining invoice count is null for Infinite. Status is `active/inactive`. |
| `retainerPeriods` | Array of objects | `retainerId, startDate, endDate, includedMinutes, feePerPeriod, excessHourlyRate, currency, feeInvoiceId`. The start is inclusive and the end is exclusive. |
| `activityEvents` | Array of objects | `{ id, action, actorId, createdAt, entityType, entityId, relatedIds[], delivery? }`. Delivery is `{ invoiceId, to[], message, attachPdf }`. |

Invoices, expenses and retainers use `active/archived/deleted` visibility. Their normal lists show active records.

- `invoices[].lines[]` contains `id, kind, serviceId, name, description, quantity, rate, taxPercent, lineSubtotal, sources[]`. Line kinds are `manual/time/expense/retainer_fee/retainer_excess`. A source is `{ type, id, minutes, amount, includeReceipt }`. Source type is `time_entry` or `expense`. Source amounts are before invoice discount and tax. Expense source minutes are null. A retainer excess line records the time allocation here and preserves the entry's retainer link.
- `expenses[].receipt` is null or `{ url, originalName, storedName, size, contentType }`. New files receive a same-origin path under `/files/` through `POST /upload?sid=…`. The default receipt is served from `/receipts/`.

### Default IDs

| Key | Count | Representative fixed IDs |
| --- | --- | --- |
| `business` | 1 | `biz_birch_vale` |
| `currentUserId` | 1 | `usr_maya` |
| `users` | 5 | `usr_maya`, `usr_imani`, `usr_nico`, `usr_avery`, `usr_elena` |
| `clients` | 30 | `cli_northstar`, `cli_harbor_street`, `cli_greenway` |
| `projects` | 32 | `proj_northstar_ops`, `proj_studio_onboarding` |
| `services` | 24 | `svc_process`, `svc_advisory` |
| `expenseCategories` | 16 | `cat_uncategorized`, `cat_printing` |
| `invoices` | 52 | `inv_northstar_1048`, `inv_ret_northstar_oct`, `inv_excess_alder_sep` |
| `payments` | 36 | `pay_northstar_1048` |
| `timeEntries` | 144 | `te_northstar_unbilled` |
| `expenses` | 80 | `exp_northstar_print` |
| `retainers` | 28 | `ret_northstar`, `ret_greenway` |
| `retainerPeriods` | 29 | `rp_northstar_2026-10-01` |
| `activeTimer` | 0 | `null` |
| `activityEvents` | 0 | `[]` |

## Minimal Inject Example

Send the following `state` object in a `set` request to start with an empty workspace.

```json
{
  "users": [],
  "clients": [],
  "projects": [],
  "services": [],
  "expenseCategories": [],
  "invoices": [],
  "payments": [],
  "timeEntries": [],
  "expenses": [],
  "retainers": [],
  "retainerPeriods": [],
  "activityEvents": []
}
```

## Observable State Changes (for LLM evaluation)

Each successful command below also appends one `activityEvents[]` row. Its `action` and affected IDs identify the transaction. Updated rows receive `updatedAt/updatedBy`. New rows receive all four actor and timestamp fields.

| Action | Paths changed in `current_state` |
| --- | --- |
| `invoice.created`, `invoice.updated`, `invoice.duplicated` | Upsert `invoices[]` with the editor fields and computed `subtotal/discountAmount/taxAmount/total/amountPaid/amountDue/status`. Imported lines store `invoices[].lines[].sources[]`. Reserved sources write `timeEntries[].invoiceId/status` and `expenses[].invoiceId/status` with `status=billed`. Removing sources clears `invoiceId` and restores `status=unbilled`. |
| `invoice.sent`, `invoice.marked_sent` | Write `invoices[].status/sentAt`. Sending from the editor also saves the invoice and any ordinary source links. Send creates `activityEvents[].delivery.invoiceId/to/message/attachPdf`. |
| `payment.recorded` | Append `payments[]` with `invoiceId/clientId/paymentDate/currency/amount/method/reference/notes/status`. Recompute `invoices[].amountPaid/amountDue/status`. |
| `invoice.archived`, `invoice.deleted`, `invoice.restored` | Write `invoices[].visibility`. Deleting or restoring an ordinary invoice releases or relinks its reserved sources through `timeEntries[].invoiceId/status` and `expenses[].invoiceId/status`. Retainer excess availability derives from the visibility and retained line sources. |
| `time.created`, `time.updated`, `time.week_saved` | Upsert `timeEntries[]` with `userId/workDate/durationMinutes/clientId/projectId/serviceId/notes/billable/status/invoiceId/retainerId/retainerPeriodStart/timerId/visibility`. An association can append `retainerPeriods[]`. Week Save can affect multiple entries. |
| `time.billing_changed`, `time.deleted` | Write eligible `timeEntries[].status/invoiceId` or `timeEntries[].visibility`. |
| `timer.started`, `timer.paused`, `timer.resumed` | Set `activeTimer` on Start, and update `activeTimer.status/startedAt/accumulatedSeconds` and assignment fields on Pause or Resume. |
| `timer.discarded`, `timer.logged` | Clear `activeTimer`. Log Time appends `timeEntries[]` with `timerId` and any eligible retainer association, which can open a `retainerPeriods[]` snapshot. |
| `expense.created`, `expense.updated`, `expense.duplicated` | Upsert `expenses[]` with purchase fields, `taxes[]`, assignment, billability and `receipt`. The receipt is null after a confirmed removal. |
| `expense.category_changed`, `expense.archived`, `expense.deleted`, `expense.restored` | Update `expenses[].categoryId` or `expenses[].visibility` for affected expenses. |
| `retainer.created`, `retainer.updated` | Upsert `retainers[]` with terms and schedule. Create or update eligible `retainerPeriods[]` snapshots. Changing the service window before work or invoices are linked replaces unused snapshots. If creation also issues a due fee, include the issuance changes below and link the fee invoice ID in the event. |
| `project.retainer_changed` | Write `projects[].retainerId`. |
| `retainer.fee_issued` | Append `invoices[]` with `kind=retainer_fee`, `retainerId/retainerPeriodStart`, fee line and delivery status. Upsert `retainerPeriods[]` with `feeInvoiceId` and update `retainers[].scheduleAnchorDate/scheduleIndex/periodIndex/nextIssueDate/invoicesRemaining/status`. Automatic delivery preference produces `activityEvents[].delivery` as part of this command. |
| `retainer.excess_billed` | Append `invoices[]` with `kind=retainer_excess`, `retainerId/retainerPeriodStart`, and allocation entries in `invoices[].lines[].sources[]`. Sending from the editor records `activityEvents[].delivery`. |
| `retainer.archived`, `retainer.deleted`, `retainer.restored` | Write `retainers[].visibility` and maintain `retainers[].status` consistent with the remaining invoice count. |

Filtering, sorting, selecting, previewing, canceling, checking closed periods, and updating the displayed timer are read-only. A new browser session has one automatic baseline write during hydration.
