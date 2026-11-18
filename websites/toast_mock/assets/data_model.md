# Planned state model

`createInitialData()` returns one JSON-compatible object. This model describes the dev handoff. The implementation documents its final shape in `SCHEMA.md`.

## Conventions

- IDs are strings. Seed IDs and seed timestamps are fixed. New records get unique IDs when a save succeeds.
- Money fields ending in `Cents` contain integers in USD cents. Use an integer-cent calculation and format amounts as USD in the UI. Quantity is a number; quantities selected for a refund may have up to two decimal places.
- An audited record has `id: string`, `createdAt: ISO datetime string`, and `createdBy: string` referencing the actor. Mutable audited records also have optional `updatedAt: ISO datetime string` and `updatedBy: string`. Preserve creation fields on updates. Use `new Date().toISOString()` for new actions.
- Business dates are `YYYY-MM-DD` strings. Clock times and transaction times are ISO timestamps. Use the account time zone for display and form conversion. Seed filters default to all dates so fixed example records are discoverable regardless of the runtime clock.
- Read optional values defensively and tolerate missing references in historical rows. An unavailable parent can display as a fallback label. Validate parents and references for new writes. Derive row counts and displayed totals from the current state.

## Root object

| Key | Type | Example |
| --- | --- | --- |
| `account` | Object | `{ id: "loc-01", name: "Juniper & Rye", timeZone: "America/New_York", currency: "USD", taxRateBps: 875, actor: { id: "mgr-01", name: "Maya Chen", role: "Operations manager" } }` |
| `menus` | Menu[] | `menu-01`, Dinner |
| `menuGroups` | MenuGroup[] | `grp-01`, From the Hearth |
| `menuItems` | MenuItem[] | `item-01`, Charred Broccolini |
| `menuPublications` | MenuPublication[] | `pub-01`, published catalog changes |
| `employees` | Employee[] | `emp-01`, Avery Ellis |
| `jobs` | Job[] | `job-01`, Server |
| `orders` | Order[] | `ord-01`, check #1048 |
| `payments` | Payment[] | `pay-01`, Card ending in 0142 |
| `timeEntries` | TimeEntry[] | `te-01`, closed server shift |
| `timeEntryChanges` | TimeEntryChange[] | `tec-01`, missed clock-out correction |
| `refunds` | Refund[] | `ref-01`, returned one item |

## Catalog

| Record | Fields in addition to audit fields |
| --- | --- |
| Menu | `name: string` (Dinner), `publicationStatus: "draft" or "published"`, optional `published: {name}`, optional `publishedAt: ISO datetime string` and `publishedBy: string` |
| MenuGroup | `menuId: string` (menu-01), `name: string` (From the Hearth), same publication fields, `published` snapshot contains `menuId` and `name` |
| MenuItem | `menuGroupId: string` (grp-01), `name: string` (Charred Broccolini), optional `description: string` (Lemon, chili and toasted breadcrumbs), `priceCents: integer` (950), `availability: "available" or "unavailable"`, same publication fields, `published` snapshot contains the item’s edited fields |
| MenuPublication | `menuIds: string[]`, `menuGroupIds: string[]`, `menuItemIds: string[]`, `status: "published"` |

Create and edit operations write the current configuration fields separately from its published snapshot. Publishing copies current configuration into the snapshot and creates one publication record. Ordering reads available snapshots through the published hierarchy. For injected records with `publicationStatus: "published"` and omitted snapshots, use their current fields as the published values. If such a row becomes a draft, snapshot its prior values during that user save to preserve orderability. Published menu changes affect future order line snapshots only.

## Orders and tenders

| Record | Fields in addition to audit fields |
| --- | --- |
| Order | `checkId: string` (chk-01), `checkNumber: string` (1048), `businessDate: date string`, `guestName?: string` (Devin Hart), `tableLabel?: string` (Table 12), `serviceType: "dine_in", "takeout", or "delivery"`, `status: "open", "paid", or "voided"`, `lines: OrderLine[]`, `subtotalCents: integer`, `taxCents: integer`, `tipCents: integer`, `totalCents: integer`, `refundStatus: "none", "partial", or "full"`, `refundedAmountCents: integer`, optional `voidReason: string` |
| OrderLine | `id: string`, `menuItemId: string`, `name: string`, `quantity: number`, `unitPriceCents: integer`, `lineTotalCents: integer`, `taxCents: integer` |
| Payment | `orderId: string`, `checkId: string`, `method: "card", "gift_card", or "cash"`, optional `last4: string` (0142), `status: "settled"`, `amountCents: integer` (including tax and tip), `refundStatus: "none", "partial", or "full"`, `refundedAmountCents: integer` |

Seed and order entry use the account tax rate on each line and sum the stored tax amounts. Example line: two $9.50 items gives `lineTotalCents: 1900` and `taxCents: 166` at 8.75%. An order with that line and no tip totals 2066 cents. Payment creation and status updates are a single save. Keep snapshots of the names and prices in historical checks even if menu records change or get replaced in an injected state.

## Labor

| Record | Fields |
| --- | --- |
| Employee | `id: string`, `name: string` (Avery Ellis), `jobIds: string[]` (job-01), `status: "active" or "inactive"` |
| Job | `id: string`, `name: string` (Server) |
| TimeEntry | Audit fields, `employeeId: string`, `jobId: string`, `businessDate: date string`, `clockIn: ISO datetime string`, `clockOut: ISO datetime string or null`, `breakMinutes: integer`, `workedMinutes: integer or null`, `cashTipsCents: integer`, `status: "open" or "closed"` |
| TimeEntryChange | Audit fields, `timeEntryId: string`, `changeType: "created", "corrected", or "closed"`, `reason: string or null` (Missed clock-out), `before: editable time entry snapshot or null`, `after: editable time entry snapshot` |

Snapshots contain the TimeEntry fields other than the audit fields. Open entries have no stored worked duration. Closed entries store elapsed minutes less unpaid break minutes. An overnight entry can retain the previous business date with an end timestamp on the next calendar date. Compare actual timestamps for overlaps within a single employee’s entries.

## Refunds

| Record | Fields in addition to audit fields |
| --- | --- |
| Refund | `orderId: string`, `checkId: string`, `paymentId: string`, `type: "full", "items", or "custom"`, `lines: RefundLine[]`, `subtotalCents: integer`, `taxCents: integer`, `tipCents: integer`, `amountCents: integer`, `reason: string` (Incorrect item), `status: "completed"` |
| RefundLine | `orderLineId: string`, `menuItemId: string`, `name: string`, `quantity: number`, `subtotalCents: integer`, `taxCents: integer`, `amountCents: integer` |

Refund only a settled card or gift-card tender linked to a paid check. A card tender is eligible within 90 days of settlement and can be refunded once. Use the runtime clock and treat the payment’s `createdAt` as its settlement timestamp. Apply the once-per-payment rule to gift cards in this single-tender workspace as well. If the payment or order already records a refund or has a linked completed refund, display the existing refund. Date the fixed sample records around the seed scenario and include settled gift-card checks as date-independent acceptance fixtures.

A full refund copies all original line quantities and taxes and includes the original tip. An item refund uses selected quantities and rounds each line’s proportional subtotal and tax to integer cents. For one of the two $9.50 items above, record quantity 1, subtotal 950, tax 83, and amount 1033. Custom refunds record the custom amount in both `subtotalCents` and `amountCents`, with empty lines and zero tax/tip allocation. For all types, the confirmed amount must be positive, cannot exceed the payment, and must equal the sum of the recorded components. Append the refund and update the order and payment together. The original order total and paid status remain intact.
