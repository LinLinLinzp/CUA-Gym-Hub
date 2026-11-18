# FreshBooks state model

This is the planned contract for `createInitialData()`, the central state store and Harbor fixtures. Use camelCase keys and string IDs throughout. [Workflow checklist](../TODO.md)

## Conventions

- A business date is a string such as `"2026-11-18"`. Use the UTC calendar day of `new Date()` for date defaults and comparisons. An event timestamp uses `new Date().toISOString()`. Seed timestamps and IDs are literals or deterministic values derived from fixed fixture inputs.
- Money is a finite JSON number rounded to currency precision at a defined step. The planned picker supports USD, CAD and EUR, each with two decimals. Keep intermediate integer cents for totals. Display the currency code where ambiguity is possible. Store time as whole minutes, timer elapsed as whole seconds, discount/tax/markup as percentages such as `8.25`.
- Each persisted business row, timer and period has an `id`, `createdAt`, `createdBy`, `updatedAt` and `updatedBy`. Example metadata is `{ "id": "inv_northstar_1048", "createdAt": "2026-11-04T16:22:00.000Z", "createdBy": "usr_maya", "updatedAt": "2026-11-04T16:22:00.000Z", "updatedBy": "usr_maya" }`. Activity rows have their own shape. Invoice lines and receipts are nested records whose actor and timestamps live on the owning row. Use explicit null for unset foreign keys and timestamps written by forms. Read old injected records with missing optional fields safely.
- IDs with an `Id` suffix point to the row of that name, except `actorId`, `createdBy`, `updatedBy` and `userId`, which point to users. Project clients must match the transaction client. Business actions use the selected actor from `currentUserId`. Time can be logged for a different selected `userId`.
- Lists use `visibility` for Active/Archived/Deleted separation and a distinct `status` for workflow state. Filters, selected tabs, popovers and provisional forms live in page/component state or the route query. Derived metrics, including overdue status and retainer balances, are recomputed from the records.

## Top-level keys

| Key | Type and example | Purpose |
| --- | --- | --- |
| `business` | Object, `{ id: "biz_birch_vale", name: "Birch & Vale Advisory", email: "billing@birchvale.example", currency: "USD", netDays: 30, address: { street: "42 Beacon Street", city: "Boston", region: "MA", postalCode: "02108", country: "US" } }` | Workspace name, issuer and form defaults. Strings except integer `netDays`. |
| `currentUserId` | String, `"usr_maya"` | Preselected actor. |
| `users` | Array of User | Team and actor lookup. |
| `clients` | Array of Client | Billing customer lookup. |
| `projects` | Array of Project | Client work and optional retainer association. |
| `services` | Array of Service | Invoice and time catalog. |
| `expenseCategories` | Array of ExpenseCategory | Expense categories and optional subcategories. |
| `invoices` | Array of Invoice | Ordinary bills and retainer fee/excess invoices. |
| `payments` | Array of Payment | Manual payments linked to invoices. |
| `timeEntries` | Array of TimeEntry | Manual and timer work logs. |
| `activeTimer` | Timer or null, initially null | One running or paused timer per site state. |
| `expenses` | Array of Expense | Recorded purchases and rebill sources. |
| `retainers` | Array of Retainer | Client agreements and issue schedules. |
| `retainerPeriods` | Array of RetainerPeriod | Snapshots of opened service windows. |
| `activityEvents` | Array of ActivityEvent, initially `[]` | Explicit writes and simulated invoice deliveries. |

## User, Client, Project, Service and ExpenseCategory

All include the row metadata. The business object above is a fixed configuration record.

| Entity | Fields with types and representative values |
| --- | --- |
| User | `name` string, Maya Chen. `email` string, `maya@birchvale.example`. `role` enum `owner/controller/consultant`, owner. |
| Client | `name` string, Northstar Dental Group. `email` string, `ap@northstardental.example`. `contacts` array of `{ id: string, name: string, email: string }`, e.g. `{ id: "contact_northstar_ops", name: "Erin Patel", email: "erin@northstardental.example" }`. `currency` string, USD. `billingAddress` nullable object with the same string fields as `business.address`, e.g. `{ street: "205 Federal Street", city: "Boston", region: "MA", postalCode: "02110", country: "US" }`. `visibility` enum `active/archived`. |
| Project | `clientId` string, `"cli_northstar"`. `name` string, Practice Operations Review. `billingType` enum `hourly/flat/internal`, hourly. `hourlyRate` nullable money, `180`. `expenseMarkupPercent` number, `10`. `retainerId` nullable string, `"ret_northstar"`. `status` enum `active/completed/archived`. |
| Service | `name` and `description` strings, Operations Consulting and Process review and recommendations. `defaultRate` money, `165`. `defaultTaxPercent` number, `0`. `active` boolean, `true`. |
| ExpenseCategory | `name` string, Software Subscriptions. `parentId` nullable string, `"cat_office"`. `active` boolean, `true`. Include `cat_uncategorized` with the display name Uncategorized Expenses. |

The Project and Service rate numbers are in the related client's billing currency when used on their invoice. Use the service rate when no project rate is configured. Active catalog rows are available in pickers. Show historical catalog names where rows still exist.

## Invoice and Payment

Invoice fields with examples:

| Fields | Type and example |
| --- | --- |
| `clientId/projectId` | Required string and nullable string, `"cli_northstar"` / `"proj_northstar_ops"` |
| `invoiceNumber`, `reference` | Strings, `"INV-1048"`, `"PO-286"` |
| `kind` | `standard/retainer_fee/retainer_excess`, `standard` |
| `issueDate/dueDate`, `currency` | Date strings `"2026-11-04"` / `"2026-12-04"`, currency string `"USD"` |
| `lines` | Array of InvoiceLine below |
| `notes/terms` | Strings, `"November advisory work"` / `"Net 30"` |
| `discountPercent` | Number, `10` |
| `subtotal/discountAmount/taxAmount/total` | Money, `200` / `20` / `9` / `189` |
| `amountPaid/amountDue` | Money, `50` / `139` |
| `status` | `draft/sent/partial/paid`, `partial` |
| `visibility`, `sentAt` | `active/archived/deleted`, and nullable ISO timestamp `"2026-11-05T14:10:00.000Z"` |
| `retainerId/retainerPeriodStart` | Nullable string/date, e.g. `"ret_northstar"` / `"2026-10-01"` on a retainer invoice |

Each InvoiceLine includes `id` string, `kind` enum `manual/time/expense/retainer_fee/retainer_excess`, nullable `serviceId`, string `name/description`, number `quantity`, money `rate/lineSubtotal`, number `taxPercent`, and array `sources`. For example a manual line can have `id: "line_1048_1"`, `serviceId: "svc_advisory"`, `name: "Operations Advisory"`, `description: "Monthly review"`, `quantity: 2`, `rate: 100`, `lineSubtotal: 200`, `taxPercent: 5`, and `sources: []`. Each source is `{ type: "time_entry" | "expense", id: string, minutes: number | null, amount: number, includeReceipt: boolean }`. For example `{ type: "time_entry", id: "te_northstar_unbilled", minutes: 165, amount: 495, includeReceipt: false }` or `{ type: "expense", id: "exp_northstar_print", minutes: null, amount: 132, includeReceipt: true }`. Invoice receipts resolve from linked sources when their receipt is present. The retainer fee line uses an empty sources array and the invoice's period link.

A Payment includes the row metadata, required `invoiceId/clientId` strings (e.g. `"inv_northstar_1048"` / `"cli_northstar"`), `paymentDate` such as `"2026-11-10"`, `currency` string, `amount` money, `method` enum `cash/check/bank_transfer/credit_card/other`, `reference` and `notes` strings (e.g. `"CHK-512"` and `"First installment"`), and `status: "recorded"`.

- Round each manual line subtotal to cents. Sum line subtotals, compute the percent discount rounded to cents, and apportion that discount to taxable and untaxed lines by subtotal using a stable line order for remainder cents. Calculate tax on each discounted line and round it to cents. Compute total from subtotal less discount plus tax. Invoice source amounts are pre-discount and pre-invoice-tax. Imported lines use their summed source amounts for line subtotal, even if a displayed decimal hour quantity is rounded. Set the default tax on a rebilled gross expense to zero.
- Sum recorded payments in the invoice currency. Refuse a new payment greater than the current balance or a new total under amounts already paid. Editing keeps paid/partial status consistent with the new balance. Send and Mark as Sent set `sentAt` the first time and advance a draft to sent. Resend retains the underlying billing status and records another delivery event. If a draft receives a payment, the balance determines partial/paid. Show overdue when a non-draft has positive balance with a due date before today.
- Import only active, billable, unbilled sources for the chosen client. Expense currency must match the invoice. Time uses the client's currency. Time on a retainer is excluded from ordinary imports. Detailed uses one line per time entry, Grouped uses compatible project/service/rate groups, and Simple may use a summary line. Every format retains each source ID, minutes and amount, sorted by date then ID. Time amount is rounded cents from minutes times hourly rate divided by 60. Expense source amount is gross total plus rounded markup. A source appears only once per invoice.
- Draft editor changes remain provisional. Validate the full import against the current state before committing. Compare links on edit, reserve only newly added sources, and release sources no longer present. If a linked normal source is edited elsewhere, keep client, currency and billing links fixed and guard deletion until the invoice releases it. Source-linked invoice lines support description changes and whole-line removal. Changing imported amounts requires detaching the source and adding a manual line.
- Duplicates copy manual lines and commercial text, clear source lines, payments, retainer links and sent time, and open under a newly suggested invoice number. Validate invoice number uniqueness among existing records on final Save. Archive leaves source links and payments intact. Delete on a standard invoice with no payments releases its sources, retains its old line list and sets visibility to deleted. Restore validates every previously linked source before committing, relinks them if available, and restores active visibility. Refuse deleting retainer fee invoices or invoices with recorded payments. Deleting an unpaid excess invoice frees its allocations for rebilling. Restoring it validates the original linked time entries and the remaining capacity for each allocation and for the period.

## TimeEntry and Timer

- TimeEntry fields are `userId` required, `clientId/projectId/serviceId` nullable strings, `workDate` date, `durationMinutes` positive integer, `notes` string, `billable` boolean, `status` enum `unbilled/billed/non_billable`, nullable `invoiceId/retainerId/retainerPeriodStart/timerId`, and `visibility` enum `active/deleted`. Example values are `"usr_nico"`, `"cli_northstar"`, `"proj_northstar_ops"`, `"svc_process"`, `"2026-11-10"`, `165`, `"Reviewed intake workflows"`, `true`, `"unbilled"`, null billing and timer links, and `"active"`.
- Timer fields are row metadata plus `userId`, `workDate`, nullable `clientId/projectId/serviceId`, `notes`, `billable`, `applyToRetainer`, `status` enum `running/paused`, nullable ISO `startedAt`, and integer `accumulatedSeconds`. A new timer can use `id: "timer_…" `, `userId: "usr_maya"`, `workDate: "2026-11-18"`, empty assignment and notes, `billable: false`, `applyToRetainer: false`, `status: "running"`, `startedAt: "2026-11-18T15:00:00.000Z"`, `accumulatedSeconds: 0`. Form edits stay provisional until a Pause, Resume or Log Time commit.
- Manual duration input accepts decimal hours, hours/minutes text or hours:minutes and normalizes once. Default hourly project time to billable and internal or flat project time to nonbillable. Billable without invoice/retainer links starts as unbilled. Mark as Billed/Unbilled applies only to eligible billable, active entries without financial links. Preserve any active financial links when editing notes. Guard delete on ordinarily invoiced time and on entries used by an active or archived excess invoice. Historical time can remain linked to a deleted retainer.
- Pause adds elapsed seconds and clears `startedAt`. Resume sets a new start timestamp. Both can save timer form fields as part of the same command. Log Time uses user-entered minutes if supplied, otherwise rounds elapsed seconds to the nearest minute (30 seconds rounds up). A zero-minute result leaves the timer open for an explicit duration entry or more elapsed time. A browser display refresh may repaint elapsed time without committing state.

## Expense

| Fields | Type and example |
| --- | --- |
| `merchant/categoryId` | String `"Morrow Print Studio"` and string `"cat_printing"` |
| `expenseDate`, `description`, `source` | Date `"2026-11-12"`, string `"Workshop packets"`, enum `manual/imported` with created records using `manual` |
| `currency/total` | String and money, USD and `120` |
| `taxes` | Array of `{ name: string, percent: number | null, amount: number }`, e.g. `[{ name: "Sales Tax", percent: null, amount: 7.5 }]`. Entered taxes are included in gross total. |
| `clientId/projectId` | Nullable strings, `"cli_northstar"` / `"proj_northstar_ops"` |
| `billable`, `status`, `invoiceId` | Boolean, `non_billable/unbilled/billed`, nullable string. E.g. `true`, `unbilled`, null. |
| `markupPercent/includeReceiptOnInvoice` | Number and boolean, `10` / `true` |
| `receipt` | Nullable `{ url: string, originalName: string, storedName: string, size: number, contentType: string }`. E.g. `{ url: "/receipts/print-studio.svg", originalName: "receipt.svg", storedName: "print-studio.svg", size: 1536, contentType: "image/svg+xml" }` for a packaged seed receipt. New uploads use `/files/…` returned by the local state API. |
| `visibility` | `active/archived/deleted`, `active` |

Validate a positive gross amount, nonnegative tax amounts with sum at most the gross, and a matching client for billable status. Project selection fills the client and may prefill markup. When billable is cleared, reset markup and Include receipt; a missing receipt simply yields no attachment. Guard archive and deletion for expenses already linked to a live invoice. The receipt API response fields `original_name/stored_name/content_type` map to their camelCase state fields. Retain local file URLs as returned. Failed upload leaves the edit open and creates no expense or audit event.

## Retainer and RetainerPeriod

| Retainer fields | Type and example |
| --- | --- |
| `clientId`, `startDate` | String `"cli_northstar"`, date `"2026-10-01"` |
| `periodUnit/customPeriodDays` | `weekly/monthly/yearly/custom` and positive integer or null. Example `monthly` / null. |
| `feePerPeriod/includedMinutes/excessHourlyRate/currency` | Money `1800`, integer `720`, money `185`, string `"USD"` |
| `nextIssueDate/scheduleAnchorDate` | Nullable date `"2026-11-01"` and date `"2026-10-01"` |
| `scheduleIndex/periodIndex` | Nonnegative integers, `1` / `1`. The first advances the invoice date from its schedule anchor. The second is the next service window from the start date. |
| `invoicesRemaining/deliveryMode` | Nonnegative integer or null for Infinite, and `send_automatically/create_draft`. Example `4` / `create_draft`. |
| `invoiceNotes/invoiceTerms` | Strings, `"November advisory retainer"` / `"Net 30"` |
| `status/visibility` | `active/inactive` and `active/archived/deleted`. Zero remaining yields inactive. |

Each RetainerPeriod includes row metadata plus `retainerId` string, `startDate/endDate` as inclusive/exclusive date boundaries, integer `includedMinutes`, money `feePerPeriod/excessHourlyRate`, string `currency` and nullable `feeInvoiceId`. Example `{ id: "rp_northstar_2026-10-01", retainerId: "ret_northstar", startDate: "2026-10-01", endDate: "2026-11-01", includedMinutes: 720, feePerPeriod: 1800, excessHourlyRate: 185, currency: "USD", feeInvoiceId: "inv_ret_northstar_oct" }` plus metadata.

- Calculate service windows from `startDate` and `periodIndex`. Add 7 or custom-size days for weekly/custom. For month/year, use the original anchor's day and clamp to the end of short months, preserving the anchor for the next step. Compute next issue dates independently using `scheduleAnchorDate` and `scheduleIndex`. An edited next issue date resets the schedule anchor and index without resetting service-window progress. Disable issuance when none is due or a retainer is inactive/deleted.
- Create the first period snapshot with its retainer. Open additional snapshots on a qualifying time save or fee issue, once per retainer/start date. Reading a period without a snapshot can show projected terms. A terms edit updates existing current and future snapshots that have no fee invoice, and applies to newly opened windows. Preserve closed and issued windows. Before any linked work or invoice, changing start or cadence replaces unused snapshots and creates the revised first window. Once a period has linked work or an invoice, lock the service anchor and cadence in this sandbox to preserve the dated links. Client and currency are fixed after the first linked record. New start dates and newly selected issue dates cannot precede today. Preserve an unchanged overdue issue date when editing other terms. A searched client with an active non-deleted retainer is ineligible for a second active retainer, even if the existing one is archived.
- Retainer time requires an active non-deleted retainer for the same client and a work date within an eligible service window. Use project linkage to preselect Apply to Retainer when eligible, and allow entry-level opt-out. Without explicit project linkage, preselect for the matching eligible client. Save sets `billable: true`, `status: "billed"`, `invoiceId: null`, the retainer ID and the period start. Detaching reverses the link and retains the user's chosen billable flag for ordinary billing. Never change preexisting entries merely by assigning a project or editing terms.
- Fee issuance creates a single period fee line with quantity 1, using the snapshot fee and currency. Use the due schedule date as `issueDate`. `create_draft` produces a draft. `send_automatically` records a simulated sent invoice with `sentAt` and the client's primary recipient in the transaction activity event. Advance both indices by one, decrement a finite remaining count once and clear the next date at zero. Guard duplicates with `feeInvoiceId`. A due date crossing during idle never issues an invoice.
- Sum active time for the selected service window. Included and excess minutes are derived independently for each window. Calculate gross excess as `max(0, totalMinutes - includedMinutes)`. Deduct allocations from retained excess invoices whose visibility is active or archived. To build a new draft, allocate at most the remaining gross excess from active entries in reverse work-date/ID order, excluding minutes already allocated on each entry. Save verifies the period is closed, the rate positive and the requested allocations available. Persist per-source minutes and rounded amounts using the snapshot rate. If edited or deleted records reduce the work total, show the recorded invoices and floor the remaining excess at zero. Preserve issued allocations.
- Archiving hides the agreement from the default list and retains its billing eligibility and history. Deleting stops future fee issuance and new associations while retaining terms, payments, invoices and time links. Restore blocks an active duplicate and revives the agreement's previous status subject to its remaining count.

## ActivityEvent and observable commands

An event is `{ id: string, action: string, actorId: string, createdAt: ISO string, entityType: string, entityId: string, relatedIds: string[], delivery?: { invoiceId: string, to: string[], message: string, attachPdf: boolean } }`. Example `action: "invoice.sent"`, `actorId: "usr_maya"`, `entityType: "invoice"`, `entityId: "inv_northstar_1048"`, `relatedIds: ["cli_northstar"]`, and `delivery: { invoiceId: "inv_northstar_1048", to: ["ap@northstardental.example"], message: "Thank you for your business.", attachPdf: true }`. Use the primary affected record as subject. For a bulk action include all selected IDs in `relatedIds` and use the first affected row as subject. A displayed list/metric is derived state.

| Confirmed command | Record writes beyond the event |
| --- | --- |
| `invoice.created/updated/duplicated` | `invoices[]` commercial fields, money, status and metadata. Import additionally writes `invoices[].lines[].sources[]` and each affected `timeEntries[].invoiceId/status` and `expenses[].invoiceId/status`. |
| `invoice.sent/marked_sent` | `invoices[].status/sentAt`, plus new invoice fields/source links on Send directly from editor. Send event includes `delivery`. |
| `payment.recorded` | Append `payments[]`. Recompute `invoices[].amountPaid/amountDue/status`. |
| `invoice.archived/deleted/restored` | `invoices[].visibility`. Delete/relink ordinary sources changes `timeEntries[].invoiceId/status` and `expenses[].invoiceId/status`. |
| `time.created/updated`, `time.week_saved` | Upsert `timeEntries[]`. Retainer assignment also sets `timeEntries[].retainerId/retainerPeriodStart/status` and can append `retainerPeriods[]`. |
| `time.billing_changed/deleted` | Write each selected `timeEntries[].status` or `visibility`. |
| `timer.started/paused/resumed/discarded/logged` | Set `activeTimer`, update `status/startedAt/accumulatedSeconds` and form values, or clear it. Log appends `timeEntries[]` and optionally a new `retainerPeriods[]`. |
| `expense.created/updated/duplicated` | Insert or update `expenses[]`, including `receipt` and assignment/billing fields whenever changed. |
| `expense.category_changed/archived/deleted/restored` | `expenses[].categoryId` or `visibility` on each affected row. |
| `retainer.created/updated` | `retainers[]` terms/schedule and applicable `retainerPeriods[]`. If creation also issues a due fee, include the complete issuance writes and invoice in `relatedIds`, with `delivery` if applicable. |
| `project.retainer_changed` | `projects[].retainerId`. |
| `retainer.fee_issued` | Append `invoices[]` with `kind: "retainer_fee"`. Set `retainerPeriods[].feeInvoiceId`, `retainers[].scheduleIndex/periodIndex/nextIssueDate/invoicesRemaining/status`. |
| `retainer.excess_billed` | Append `invoices[]` with `kind: "retainer_excess"` and per-entry `lines[].sources[]` allocations. Include `delivery` if initially sent. |
| `retainer.archived/deleted/restored` | `retainers[].visibility`. |

## Seed data and fixtures

Define the state as a pure `createInitialData()` in `src/data/seed.js`. Return a fresh object with all 15 top-level keys. Use fixed named fixtures first, then deterministic fillers with ID prefixes such as `cli_…`, `inv_…` and `te_…`. Use fixed fall 2026 dates plus some February and March 2026 records so the March certification clock also displays useful dashboard and time data. Keep one primary currency and a coherent CAD subset so currency-specific dashboard views and invoice-import exclusion are testable.

- **Organization and catalogs.** Birch & Vale Advisory, an operations consulting studio. 5 team members including owner Maya Chen, 30 clients, 32 projects, 24 services and 16 expense categories. Use advisory, design, IT and support engagements. Use distinct but overlapping merchant and client text for case-insensitive searches.
- **Invoices and payments.** 52 invoices covering drafts, sent, partial, paid, overdue, archived and deleted. Include 36 manual payments distributed across paid and partial invoices with reconciled balances, and a set of linked fee/excess invoices.
- **Time and expenses.** 144 time entries with durations from 15 minutes to several hours, including billable, nonbillable, invoiced and retainer-tracked examples. 80 expenses across subscriptions, travel, office purchases, contractor services and meals. Include records with and without receipts, expense markup, linked projects and billing statuses.
- **Retainers.** 28 retainers distributed over distinct clients with active, inactive, archived and deleted examples and sufficient period snapshots. Mix weekly, monthly, yearly and custom agreements. Cover finite and infinite schedules, sent and draft delivery, and retainer windows under, at and over budget.
- **Cross-workflow fixtures.** Northstar Dental Group (`cli_northstar`) has a partial invoice (`inv_northstar_1048`), an unbilled 165-minute entry (`te_northstar_unbilled`) and an unbilled expense with 10% markup (`exp_northstar_print`). The entry is opted out of the retainer. Harbor Street Design (`cli_harbor_street`) is eligible for a new retainer. A current active retainer (`ret_greenway`) has a due unissued fee when the task clock is 2026-11-18. Northstar's closed October period (`rp_northstar_2026-10-01`) includes an issued fee invoice, a 720-minute budget and 840 minutes of active linked work, leaving 120 minutes eligible for excess billing. Keep enough other rows and projects to validate filters without depending on a single fixture.
