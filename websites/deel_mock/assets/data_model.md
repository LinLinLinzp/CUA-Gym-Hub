# Proposed Harbor data model for Deel

`createInitialData()` returns a new plain object matching the keys below. All IDs are strings, all money values are finite numbers rounded to cents, and all quantities are numbers. Use calendar strings (`YYYY-MM-DD`) for contractual and leave dates and UTC ISO timestamps for authored events. Create new action timestamps using `new Date().toISOString()` and use stable unique IDs for new records. An em dash in a display can represent unavailable information. Optional references may be absent in injected worlds.

## Top-level keys

| Key | Type | Role |
| --- | --- | --- |
| `organization` | object | Workspace identity and display settings |
| `currentUser` | object | Signed-in actor used in mutations |
| `legalEntities` | array | Billing and contract entities |
| `workers` | array | Contractors and employees |
| `contracts` | array | Contractor agreements and draft records |
| `invoices` | array | Billing items and status |
| `payments` | array | Released payments and invoice allocations |
| `timeOffRequests` | array | Employee leave requests and review outcomes |
| `activity` | array | Structured action history |

## Organization and people

```js
organization = { id: 'org-northstar', name: 'Northstar Studio', defaultCurrency: 'USD' }
currentUser = { id: 'usr-jordan', name: 'Jordan Lee', role: 'Operations manager', email: 'jordan.lee@northstar.example' }
legalEntity = { id: 'ent-us', name: 'Northstar Studio LLC', country: 'United States', currency: 'USD' }
worker = {
  id: 'wrk-001', name: 'Lucia Bennett', email: 'lucia.bennett@example.test',
  type: 'contractor', country: 'Canada', role: 'Brand designer', team: 'Design',
  legalEntityId: 'ent-us', annualVacationDays: null,
  createdBy: 'usr-jordan', createdAt: '2026-01-12T15:00:00.000Z',
}
```

Names, role, country, team and email are strings. Worker `type` is `contractor` or `employee`. `annualVacationDays` is a number for employees with a known policy, otherwise null. Company objects and users are read-only in the planned workflow. A worker added during contract creation requires name and valid email, with country and role supplied in the same form and legal entity from the agreement. Trim email and resolve a case-insensitive existing contractor match before creating a duplicate.

## Contracts

```js
contract = {
  id: 'ctr-001', number: 'CTR-1001', workerId: 'wrk-001', legalEntityId: 'ent-us',
  title: 'Brand systems support', type: 'fixed_rate', status: 'active', currency: 'USD',
  rate: 4800, rateUnit: 'month', milestones: [],
  scope: 'Maintain the visual identity guidelines and review launch assets.',
  startDate: '2026-02-02', endDate: null, noticeDays: 14,
  createdBy: 'usr-jordan', createdAt: '2026-01-12T15:00:00.000Z',
  updatedAt: '2026-01-15T17:00:00.000Z', sentAt: '2026-01-13T14:00:00.000Z',
  clientSignedAt: '2026-01-13T14:00:00.000Z', contractorSignedAt: '2026-01-15T17:00:00.000Z',
  cancelledAt: null,
}
milestone = { id: 'ms-001', title: 'Deliver final design', amount: 3200, dueDate: '2026-12-10' }
```

Contract types are `fixed_rate`, `pay_as_you_go`, and `milestone`. Statuses are `draft`, `pending_signature`, `active`, and `cancelled`. `number` is a unique user-facing string. Fixed rate takes a positive rate with a `week` or `month` unit. Pay as you go takes an optional positive rate with `hour`, `day`, or `task` as the unit. Milestone takes one or more entries with positive amounts, with `rate` and `rateUnit` null. `noticeDays` is a nonnegative integer. `endDate`, milestone `dueDate` and timestamps for actions that have yet to occur may be null. Save requires worker, title, legal entity, type, currency, scope, start date and valid terms for the type. Validate any end date against the start date.

## Invoices and payments

```js
invoice = {
  id: 'inv-001', number: 'INV-2401', workerId: 'wrk-001', contractId: 'ctr-001',
  legalEntityId: 'ent-us', currency: 'USD', status: 'open',
  issueDate: '2026-11-02', dueDate: '2026-12-02',
  lineItems: [{ id: 'li-001', description: 'Design support', quantity: 2, unitPrice: 2400, amount: 4800 }],
  total: 4800, paymentId: null,
  createdBy: 'usr-jordan', createdAt: '2026-11-02T09:00:00.000Z', updatedAt: '2026-11-02T09:00:00.000Z',
}
payment = {
  id: 'pay-001', invoiceIds: ['inv-001'],
  allocations: [{ invoiceId: 'inv-001', workerId: 'wrk-001', amount: 4800 }],
  amount: 4800, currency: 'USD', method: 'studio_balance', status: 'processing',
  createdBy: 'usr-jordan', createdAt: '2026-11-18T16:05:00.000Z',
}
```

Invoice statuses are `open`, `overdue`, `processing`, and `paid`. Allow a stored `open` invoice to display as Overdue after its due date without mutating the invoice. Apply the same derived status rule to filters and totals. Use the Cent-rounded sum of invoice totals and validate every invoice, currency and current payment eligibility again at confirmation. An injected invoice with an unavailable total or currency stays readable, with payment unavailable until those values exist. Payment statuses are `processing` and `paid`. Seeded payment totals equal their allocation amounts and allocations match invoice totals. `method: studio_balance` is the local settlement option displayed as Studio balance.

## Time off

```js
timeOffRequest = {
  id: 'tor-001', workerId: 'wrk-031', type: 'vacation', status: 'pending',
  startDate: '2026-12-07', endDate: '2026-12-09', duration: 'full_day', days: 3,
  note: 'Family visit.', createdBy: 'usr-jordan', createdAt: '2026-11-18T15:00:00.000Z',
  updatedAt: '2026-11-18T15:00:00.000Z', reviewedBy: null, reviewedAt: null,
  decisionNote: null, cancelledAt: null,
}
```

Types are `vacation`, `sick`, and `unpaid`. Statuses are `pending`, `approved`, `denied`, and `cancelled`. `duration` is `full_day` or `half_day`. Count inclusive Monday–Friday calendar dates across the selected range, with `0.5` for a single-weekday half day. Reject empty weekday ranges and overlaps with any pending or approved request from the same worker, excluding the edited request. Treat half days as occupying their selected date in this version. Derive available vacation days from the allowance minus the approved vacation days that fall within the runtime calendar year, prorating date ranges across year boundaries by weekday counts. Keep unknown balances unspecified.

## Activity

```js
event = {
  id: 'evt-001', action: 'payment.released', entityType: 'payment', entityId: 'pay-001',
  actorId: 'usr-jordan', createdAt: '2026-11-18T16:05:00.000Z',
  relatedIds: ['inv-001'],
}
```

`entityType` is `contract`, `payment` or `time_off_request`. `relatedIds` is an array of strings. Use invoice IDs for payment events and the worker ID for agreement and leave events. `activity` stores one event per completed business step. A compound action such as adding a worker while sending an agreement records one event for the send that references the worker ID.

## Observable State Changes

| UI action | Business records changed | `activity[].action` |
| --- | --- | --- |
| Save new draft | Append a `contracts[]` record with Draft status and complete terms. Append a `workers[]` record if a new contractor was entered. | `contract.created` |
| Save draft edit | Update selected agreement fields and `updatedAt` on `contracts[]`. Keep the original ID and creation metadata. | `contract.updated` |
| Sign and send | Create or update `contracts[]`, writing terms, `status: pending_signature`, `clientSignedAt`, `sentAt`, `updatedAt`. Append `workers[]` if a new contractor was entered. | `contract.sent` |
| Cancel pending contract | Set `contracts[].status` to `cancelled` and set `cancelledAt`, `updatedAt`. | `contract.cancelled` |
| Confirm payment | Append `payments[]` with `invoiceIds`, `allocations`, `amount`, `currency`, `method`, `status: processing`, and creation metadata. Set affected `invoices[].status` to `processing` and write `paymentId`, `updatedAt`. | `payment.released` |
| Submit leave | Append complete `timeOffRequests[]` record with `status: pending`, computed `days` and creation metadata. | `time_off.requested` |
| Edit pending leave | Update selected request details, recomputed `days` and `updatedAt`. | `time_off.edited` |
| Withdraw pending leave | Set `timeOffRequests[].status` to `cancelled` and set `cancelledAt`, `updatedAt`. | `time_off.cancelled` |
| Approve or deny | Set `timeOffRequests[].status` to `approved` or `denied`, and set `reviewedBy`, `reviewedAt`, `decisionNote`, `updatedAt`. | `time_off.approved` or `time_off.denied` |

Each row is one save. Form entry, cancelled confirmations, validation errors, list interactions and downloads produce no writes. Copy the implemented keys and exact writes into `SCHEMA.md` during development.

## Fixed seed composition

- Use two legal entities (`ent-us` and `ent-gb`) and 48 distinct workers. Include 30 contractors assigned to contracts and 18 employees with mixed vacation allowances. Use stable IDs and names across views. Put the example employee at `wrk-031`.
- Seed 36 contracts across all contractor types with 21 Active, 6 Draft, 6 Pending signature and 3 Cancelled. Give some workers two agreements and give some agreements identical titles so that person, ID and type searches matter.
- Seed 48 invoices linked to active agreements. Use 20 Open, 12 Overdue, 4 Processing and 12 Paid. Seed 12 payments covering the 16 Processing or Paid invoices with four two-invoice groups and eight single-invoice groups. Include at least two payable invoices in USD and two in another currency, plus a mix of itemized and single-line invoices.
- Seed 32 time-off requests across employees and date ranges with 10 Pending, 12 Approved, 6 Denied and 4 Cancelled. Include at least one half day, a balance that changes on approval, request notes, and reviewed and unreviewed rows. Include approval and payment events tied to actual seed records.
- Keep dates and IDs fixed. Use November and December 2026 for representative deadlines and leave while including prior records. Derive relative labels and upcoming visibility from the runtime date. Fresh states, empty arrays and partial injected worlds use the same components.
