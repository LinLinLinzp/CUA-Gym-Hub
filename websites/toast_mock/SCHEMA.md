# toast_mock Schema

- **Base URL** `http://localhost:5459/`
- **Go endpoint** `GET /go?sid=<sid>` returns `{initial_state, current_state, state_diff}`.
- **Inject** `POST /post?sid=<sid>` with `{"action":"set","state":{...}}`, then launch `/?sid=<sid>` in a fresh browser context. The app merges objects and replaces arrays with the supplied values.
- **Reset** `POST /post?sid=<sid>` with `{"action":"reset"}` restores the server's stored initial snapshot, or the default seed when the session has no initial snapshot. Use a fresh browser context to read the reset state because the client template caches loaded sessions.

The tables below refer to keys inside `current_state`. IDs are strings, timestamps are ISO strings, business dates use `YYYY-MM-DD`, and money is stored in integer USD cents. New records use the account actor and the runtime clock. When an injection supplies a partial baseline, the first browser load sends the complete merged state while the API retains the original baseline. In that case, `/go` can show defaults added by the merge before any user action.

## State Schema

An **audit** consists of `id`, `createdAt`, and `createdBy`. Mutable records can also have `updatedAt` and `updatedBy`. Actor IDs reference `account.actor.id`.

| Root key | Record fields |
| --- | --- |
| `account` | Object with `id`, `name`, `timeZone`, `currency`, `taxRateBps`, and `actor: {id, name, role}`. Tax is assessed per order line. |
| `menus[]` | Audit, `name`, `publicationStatus` (`draft`, `published`), optional `published: {name}`, `publishedAt`, `publishedBy`. |
| `menuGroups[]` | Audit, `menuId`, `name`, `publicationStatus`, optional `published: {menuId, name}`, `publishedAt`, `publishedBy`. |
| `menuItems[]` | Audit, `menuGroupId`, `name`, `description`, `priceCents`, `availability` (`available`, `unavailable`), `publicationStatus`, optional `published` snapshot of those five configuration fields, `publishedAt`, `publishedBy`. |
| `menuPublications[]` | Audit, `menuIds[]`, `menuGroupIds[]`, `menuItemIds[]`, `status: "published"`. |
| `employees[]` | `id`, `name`, `jobIds[]`, `status` (`active`, `inactive`). |
| `jobs[]` | `id`, `name`. |
| `orders[]` | Audit, `checkId`, `checkNumber`, `businessDate`, optional `guestName` and `tableLabel`, `serviceType` (`dine_in`, `takeout`, `delivery`), `status` (`open`, `paid`, `voided`), `lines[]`, `subtotalCents`, `taxCents`, `tipCents`, `totalCents`, `refundStatus` (`none`, `partial`, `full`), `refundedAmountCents`, optional `voidReason`. |
| `payments[]` | Audit, `orderId`, `checkId`, `method` (`card`, `gift_card`, `cash`), optional `last4`, `status: "settled"`, `amountCents`, `refundStatus`, `refundedAmountCents`. |
| `timeEntries[]` | Audit, `employeeId`, `jobId`, `businessDate`, `clockIn`, `clockOut` (nullable), `breakMinutes`, `workedMinutes` (nullable), `cashTipsCents`, `status` (`open`, `closed`). |
| `timeEntryChanges[]` | Audit, `timeEntryId`, `changeType` (`created`, `corrected`, `closed`), `reason` (nullable), `before` (nullable), and `after`. Both snapshots use the TimeEntry fields excluding audit fields. |
| `refunds[]` | Audit, `orderId`, `checkId`, `paymentId`, `type` (`full`, `items`, `custom`), `lines[]`, `subtotalCents`, `taxCents`, `tipCents`, `amountCents`, `reason`, `status: "completed"`. |

**Order line** fields are `id`, `menuItemId`, `name`, `quantity`, `unitPriceCents`, `lineTotalCents`, and `taxCents`.

**Refund line** fields are `orderLineId`, `menuItemId`, `name`, `quantity`, `subtotalCents`, `taxCents`, and `amountCents`. Item refund quantities support two decimal places. Custom refunds have an empty `lines` array and zero tax and tip. Full refunds include the original tip.

### Default IDs

| Entity | Seed IDs |
| --- | --- |
| Account and actor | `loc-01`, `mgr-01` |
| Catalog | `menu-01` through `menu-04`, `grp-01` through `grp-12`, `item-01` through `item-72`, `pub-01` |
| Orders, checks, and order lines | `ord-01` through `ord-78`, `chk-01` through `chk-78`, `line-01` through `line-156` |
| Payments and refunds | `pay-01` through `pay-58`, `ref-01` through `ref-27` |
| Staff and jobs | `emp-01` through `emp-28`, `job-01` through `job-06` |
| Time entries and their history | `te-01` through `te-70`, `tec-01` through `tec-07` |

## Minimal Inject Example

Send this object as `state` in a `set` request for a workspace with a custom location name and empty ledgers.

```json
{
  "account": { "name": "Lantern Kitchen" },
  "menus": [],
  "menuGroups": [],
  "menuItems": [],
  "menuPublications": [],
  "employees": [],
  "jobs": [],
  "orders": [],
  "payments": [],
  "timeEntries": [],
  "timeEntryChanges": [],
  "refunds": []
}
```

## Observable State Changes (for LLM evaluation)

| Action | Fields written |
| --- | --- |
| Save a new menu, group, or item draft | Inserts the record into `menus[]`, `menuGroups[]`, or `menuItems[]` with its configuration fields, creation audit, and `publicationStatus: "draft"`. |
| Edit a menu, group, or item | Replaces that record's configuration fields, sets `publicationStatus: "draft"` and update audit, and retains its live `published` snapshot. An injected published record without a snapshot is snapshotted before edits are saved. |
| Confirm publication | Sets `published`, `publicationStatus: "published"`, `publishedAt`, `publishedBy`, and update audit on each affected catalog record. Inserts one `menuPublications[]` record with all three affected ID arrays and creation audit. |
| Save a new order | Inserts an `orders[]` record with a distinct `id` and `checkId`, `checkNumber`, `businessDate`, service and guest/table fields, line snapshots, the four amount fields, `status: "open"`, `refundStatus: "none"`, `refundedAmountCents: 0`, and creation audit. |
| Save an open check edit | Writes `orders[].guestName`, `tableLabel`, `serviceType`, `lines`, `subtotalCents`, `taxCents`, `tipCents`, `totalCents`, and update audit. |
| Record a payment | Inserts a settled `payments[]` record. Writes `orders[].status: "paid"`, the four amount fields, and update audit in the same transaction. |
| Confirm a void | Writes `orders[].status: "voided"`, `voidReason`, and update audit. |
| Add, correct, or close a time entry | Inserts or replaces a `timeEntries[]` record and inserts a `timeEntryChanges[]` record with its ID, change type, reason, before/after values, and creation audit. |
| Confirm a full, item, or custom refund | Inserts `refunds[]` with the linked order, check, and payment IDs, type, original line references and quantities where applicable, subtotal, tax, tip, amount, reason, status, and creation audit. Updates `refundedAmountCents`, `refundStatus`, and update audit on both the linked order and payment in the same transaction. |
| Navigate, search, filter, paginate, open or cancel a form, review a refund | No business state fields are written. The first boot sends the template baseline. |

Settled card and gift card payments allow one refund per payment. Card eligibility uses the runtime clock and the payment's `createdAt` timestamp, with a 90-day window.

