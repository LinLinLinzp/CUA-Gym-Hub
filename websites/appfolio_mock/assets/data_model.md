# Implementation data model

Use plain JSON values throughout. Unless marked optional, fields are required for new saves. When injected records lack optional display data, use a safe fallback. Read unknown properties through harmless defaults and keep them intact on updates.

## State shape

`createInitialData()` in `src/data/seed.js` returns a fresh object with these keys.

| Key | Value |
| --- | --- |
| `account` | Staff identity object |
| `properties` | Property array |
| `units` | Rental unit array |
| `leases` | Lease term array |
| `assignees` | Maintenance staff and vendor array |
| `workOrders` | Work order array with nested history |
| `rentCharges` | Posted charge array |
| `rentPayments` | Recorded receipt array |

Business records use string `id` values such as `prop-001`. Use stable IDs in the seed and collision-resistant IDs for user-created records. Every created record carries string `createdAt`, `createdBy`, `updatedAt` and `updatedBy`. Example timestamps are `2026-11-18T15:00:00.000Z` and the actor example is `staff-001`. Edits preserve the creation metadata and update the two update fields. Use the current clock for new ISO timestamps. Form dates are local calendar strings in YYYY-MM-DD, with date comparisons made at calendar-day precision. In JSON, optional references and dates may be omitted or null. Store currency as positive or nonnegative USD numbers to two decimal places as dictated by the form and calculate money in integer cents.

## Record fields

| Record | Fields beyond common metadata |
| --- | --- |
| Account | `id` string `staff-001`, `name` string `Jordan Ellis`, `workspaceName` string `Cedarline Property Services`, `role` string `Property Manager` |
| Property | `name` string `Alder Court`, `address1` string `104 Alder Court`, optional `address2` string `Building B`, `city` string `Portland`, `region` string `OR`, `postalCode` string `97205`, `type` enum `multifamily / single_family / commercial`, `status` enum `active / archived`, optional `notes` string `Service access off Alder Court` |
| Unit | `propertyId` string `prop-001`, `label` string `203`, `beds` integer `2`, `baths` number `1.5`, `marketRent` number `1850`, `rentReady` boolean `true`, `status` enum `active / archived` |
| Lease | `propertyId` string `prop-001`, `unitId` string `unit-003`, `residentName` string `Maya Rivera`, optional `residentEmail` string `maya.rivera@example.com`, `startDate` date `2026-04-01`, `endDate` date `2027-03-31`, `monthlyRent` number `1850`, `deposit` number `1000`, `status` enum `recorded / ended`, optional `renewedFromLeaseId` string `lease-012`, optional `endedOn` date `2027-02-28`, optional `endReason` string `Resident moved out` |
| Assignee | `id` string `asgn-002`, `name` string `Beacon Fixture Services`, `type` enum `staff / vendor`, optional `trade` string `Plumbing` |
| Work order | `propertyId` string `prop-001`, optional `unitId` string `unit-003`, `title` string `Kitchen tap leaking`, `description` string `Drips from the base under pressure.`, `category` enum `plumbing / electrical / hvac / appliance / general`, `priority` enum `low / normal / high / urgent`, `permissionToEnter` enum `yes / no / unknown`, `status` enum `open / assigned / scheduled / in_progress / completed / canceled`, optional `assigneeId` string `asgn-002`, optional `scheduledFor` date `2026-11-20`, optional `startedAt` ISO timestamp, optional `completedAt` ISO timestamp, optional `completionNote` string `Replaced the cartridge.`, optional `canceledAt` ISO timestamp, optional `cancelReason` string `Duplicate request`, `history` array of work order events |
| Work order event | `id` string `event-023`, `action` enum `created / edited / assigned / scheduled / started / completed / canceled`, optional `fromStatus` and required `toStatus` using the order status enum, `createdAt` ISO timestamp, `createdBy` actor ID. Include `assigneeId` on assignment, `scheduledFor` on scheduling and `note` with the completion note or cancellation reason. |
| Rent charge | `leaseId` string `lease-014`, `type` enum `rent / fee`, `description` string `November rent`, `postedOn` date `2026-11-01`, `dueOn` date `2026-11-05`, `amount` number `1850`, `status` enum `posted` |
| Rent payment | `leaseId` string `lease-014`, `chargeId` string `charge-041`, `receivedOn` date `2026-11-03`, `amount` number `925`, `method` enum `check / cash / bank_transfer / other`, optional `reference` string `Receipt 1048`, `status` enum `recorded` |

## Relationships and rules

- A property owns many units. A lease references one unit and its parent property. Compare trimmed unit labels case-insensitively within a property. Block archiving when a linked lease has an effective end on or after today and still occupies or is scheduled to occupy the location. Keep historical links navigable.
- A lease is active on a day in its inclusive term. Determine the effective end as the earlier of `endDate` and any recorded `endedOn`. Display Upcoming, Active, Expired or Ended using the calendar and an explicit end when effective. Exclude overlapping inclusive terms on the same unit and ignore the edited record in the overlap check. For renewal, validate the proposed dates and terms as a new lease and allow one successor per original lease. For ending, require a reason and a date within the original term. Rent charges and historical receipts stay on their original lease when it is renewed or ended.
- A work order always references a property and may reference one of its units. Creating sets `open` and appends a created event in the same save. Editing is available on open, assigned, scheduled and in-progress orders. Changing the location clears an incompatible unit selection in the form. Assign an open or assigned order to move it to or keep it in `assigned`. Schedule or reschedule an assigned or scheduled order with an assignee and a valid date. Start an assigned or scheduled order, complete an in-progress order with a note, or cancel any nonterminal order with a reason. Use the corresponding timestamp or date field and append the action event in the same save. Terminal records remain readable.
- A charge belongs to one lease. Require a due date on or after the posting date. A payment belongs to the same lease as its selected charge. Require the receipt date on or after the posting date. Derive outstanding amounts by subtracting linked recorded payments from posted charges. Display Paid at zero, Overdue when an unpaid amount remains past its due date, Partial when a payment exists on a charge that is still due, and Open otherwise. Sort ledger entries by transaction date, charges first when dates tie, and ID as the stable final tie-breaker. Running balance adds charges and subtracts receipts. Preserve posted entries as history.
- Use relationships for display and validation. When an injected record has a missing reference, keep the row readable with a fallback such as its stored ID or an em dash. Omit unsafe actions when a required related record is absent.

## Seed inventory

| Key | Count | Coverage |
| --- | --- | --- |
| `account` | 1 | Default property manager Jordan Ellis |
| `properties` | 28 | Portland, Beaverton and Vancouver, several types and 2 archived |
| `units` | 84 | Distinct unit labels per property, occupied and available units, multiple room counts and rent-ready states |
| `leases` | 48 | Current, future, expired, ended and renewal-linked terms. Keep several active units available for new leases. |
| `assignees` | 12 | Office staff, technicians and specialty vendors |
| `workOrders` | 42 | Property and unit requests, all statuses and priorities, with history matching persisted status |
| `rentCharges` | 72 | Rent and fees, multiple months, open and overdue balances |
| `rentPayments` | 48 | Full and partial receipts tied to charges without overpayments |

Use fixed seed dates near late 2026 and early 2027, with prior and future terms and multiple billing periods. Expose the full register by default for lists even when the runtime date is outside this seed range. Derive date-sensitive subsets from `new Date()`, and inject relative scenarios in the test phase when necessary. Use fictitious resident and vendor names and reserved `example.com` addresses. Ensure all seed references resolve and that archived locations have no current or future terms in the seeded period.
