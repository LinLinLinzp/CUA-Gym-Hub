# wayfair_mock Schema

**Base URL**: `http://localhost:5313/`  
**Go Endpoint**: `GET /go?sid=<sid>` → `{initial_state, current_state, state_diff}`  
**Inject**: `POST /post?sid=<sid>` with body `{"action":"set","state":{...}}`  
**Reset**: `POST /post?sid=<sid>` with body `{"action":"reset"}`

## State Schema

| Key | Type | Contents |
| --- | --- | --- |
| `account` | Object | Synthetic signed-in account and display defaults |
| `orders` | Array | Orders with original amounts, ship-to address and ordered items |
| `shipments` | Array | Fulfillment records, tracking events and freight slot offers |
| `orderCancellations` | Array | Confirmed cancellations and their affected order lines |
| `deliveryAppointments` | Array | Current and previous bookings |
| `damageClaims` | Array | Reported item issues, requested resolutions and evidence metadata |
| `returns` | Array | Requested and historical returns, item amounts and handoff details |

IDs are strings, timestamps are ISO 8601 strings, quantities are integers, and dollar values are numbers with up to two decimal places. Amount calculations use integer cents. The seed uses USD. Cancellations and returns use the referenced order's currency. Fields marked optional can be absent. See [the Harbor contract](../../HARBOR_CONTRACT.md) for injection and sync semantics.

Use a fresh `sid` for each injection before opening the app. `GET /state?sid=<sid>` returns `{stored_state, has_custom_state, sid}`. The initial snapshot is retained on subsequent writes. Reset restores the saved initial snapshot to the server's current state. An already-open browser can still hold its cached state.

## Account and address

| Field | Type | Example |
| --- | --- | --- |
| `account.id` | String | `customer-ava-morgan` |
| `account.name` | String | `Ava Morgan` |
| `account.email` | String, optional | `ava.morgan@example.test` |
| `account.timeZone` | IANA zone string, optional | `America/New_York` |
| `shipTo.name` | String | `Ava Morgan` |
| `shipTo.line1`, `shipTo.line2` | String, line 2 optional | `82 Sample Lane`, `Unit 3B` |
| `shipTo.city`, `shipTo.region` | Strings | `Providence`, `RI` |
| `shipTo.postalCode`, `shipTo.country` | Strings | `02906`, `US` |

Use an order's optional `shipTo` snapshot on its shipments. Show **Address unavailable** when absent. Display dates in `shipment.timeZone`, else `account.timeZone`, else the browser's zone. A business action's actor is `account.id`.

## Orders and order items

| Field | Type | Example |
| --- | --- | --- |
| `id` | String | `wf-1003` |
| `orderNumber` | String | `WF-8401003` |
| `placedAt` | ISO timestamp | `2026-11-08T16:00:00.000Z` |
| `currency` | Currency code | `USD` |
| `shippingAmount`, `totalAmount` | Numbers | `0`, `138.24` |
| `paymentLabel` | String, optional | `Visa ending in 0184` |
| `shipTo` | Address, optional | Account holder's delivery address snapshot |
| `items` | Array of order items | Two units of the Harbor ceramic lamp in one order item |

| Item field | Type | Example |
| --- | --- | --- |
| `id` | String, unique across orders | `wf-1003-i1` |
| `name`, `sku` | Strings | `Harbor Ceramic Table Lamp`, `HBR-LMP-SND` |
| `variant`, `imageKey` | Strings, optional | `Sand / linen shade`, `harbor-lamp-sand` |
| `quantity`, `canceledQuantity` | Integers, canceled quantity defaults to `0` | `2`, `0` |
| `unitPrice`, `unitTax` | Numbers | `64`, `5.12` |
| `returnable` | Boolean, optional, defaults to `true` | `true` |
| `shipmentId` | String, optional | `wf-1003-s1` |

Orders contain line items. Each line belongs to at most one shipment and each shipment can carry several lines. Split delivery is modeled by different `shipmentId` values on the order lines. Use original `totalAmount` for order history. The seeded total equals `shippingAmount + sum(quantity × (unitPrice + unitTax))`. Display estimated cancellation credits from linked cancellation records as a separate subtotal.

Derive order status from remaining units and shipment states. Use **Canceled** for all units canceled, **Delivered** when all remaining units are delivered, **Partially delivered** for a mix of delivered and undelivered units, **In transit** when any remaining item is in transit or out for delivery, and **Preparing** for other open orders. Add a **Partially canceled** indicator when some units are canceled. A freight line awaiting an appointment or with a future booking uses the corresponding shipment label in order detail.

## Shipments, events and offered slots

| Field | Type | Example |
| --- | --- | --- |
| `id`, `orderId` | Strings | `wf-1001-s1`, `wf-1001` |
| `type` | `parcel` or `freight` | `freight` |
| `status` | `preparing`, `ready_to_schedule`, `in_transit`, `out_for_delivery`, `delivered`, `canceled` | `ready_to_schedule` |
| `carrier`, `trackingNumber` | Strings, optional | `Harbor Freight Delivery`, `HFD-841006` |
| `estimatedAt`, `deliveredAt` | ISO timestamps, optional | `2026-11-24T17:00:00.000Z`, absent for a pending shipment |
| `timeZone` | IANA zone string, optional | `America/New_York` |
| `trackingEvents` | Array, optional | `[{at: '2026-11-16T16:00:00.000Z', label: 'Arrived at the local delivery station', location: 'Providence, RI'}]` |
| `availableSlots` | Array, optional | `[{id: 'wf-1001-s1-slot-1', startAt: '2026-11-20T14:00:00.000Z', endAt: '2026-11-20T18:00:00.000Z'}]` |

Event `at` is an ISO timestamp, `label` is text and `location` is optional text. Slot `id` is a string and `startAt` and `endAt` are ISO timestamps. Sort milestones by `at` and time slots by `startAt`. An appointment changes the derived delivery display. Persist shipment data as received, including carrier status and tracking events.

## Order cancellations

| Field | Type | Example |
| --- | --- | --- |
| `id`, `orderId` | Strings | `cancel-<uuid>`, `wf-1005` |
| `status` | `confirmed` | `confirmed` |
| `reason` | `changed_mind`, `ordered_by_mistake`, `delivery_timing`, `other` | `changed_mind` |
| `items` | Array of `{orderItemId: string, quantity: integer, estimatedCredit: number}` | `[{orderItemId: 'wf-1005-i1', quantity: 1, estimatedCredit: 48.60}]` |
| `estimatedCredit`, `currency` | Number, currency code | `48.60`, `USD` |
| `actorId`, `createdAt` | String, ISO timestamp | `customer-ava-morgan`, `2026-11-18T16:00:00.000Z` |

Permit a positive whole-unit cancellation from the remaining quantity only when the order line's linked shipment is `preparing`. Confirm updates to `canceledQuantity` and the new cancellation record together. Amounts cover item price and unit tax for the canceled units. A voided shipment with no remaining units can display as canceled without changing the original shipment record.

## Delivery appointments

| Field | Type | Example |
| --- | --- | --- |
| `id`, `orderId`, `shipmentId` | Strings | `appt-<uuid>`, `wf-1001`, `wf-1001-s1` |
| `slotId`, `startAt`, `endAt`, `timeZone` | String, ISO timestamps and IANA zone | `wf-1001-s1-slot-1`, `2026-11-20T14:00:00.000Z`, `2026-11-20T18:00:00.000Z`, `America/New_York` |
| `status` | `confirmed`, `rescheduled`, `canceled`, `completed` | `confirmed` |
| `instructions` | String | `Please use the driveway entrance.` An empty string is valid. |
| `actorId`, `createdAt` | String, ISO timestamp | `customer-ava-morgan`, `2026-11-18T16:00:00.000Z` |
| `updatedBy`, `updatedAt`, `canceledAt` | Optional string and ISO timestamps | `customer-ava-morgan`, `2026-11-19T16:00:00.000Z`, `2026-11-19T16:00:00.000Z` |
| `previousAppointmentId`, `replacedByAppointmentId` | Optional strings | `appt-0008`, `appt-0009` |

Allow booking only for a shipment with `type: 'freight'`, `status: 'ready_to_schedule'`, at least one uncanceled line, and an available slot with future `startAt` and `endAt` later than its start. Only one `confirmed` record per shipment can be active. Allow rescheduling to a different future slot or canceling a future confirmed appointment. Rescheduling marks it `rescheduled` and adds the replacement in the same mutation. Prepopulate its current instructions and show their new value at review. Allow up to 500 characters. Canceling marks the appointment `canceled`. A confirmed window that has started appears under previous appointments and waits for shipment progression. Historical `completed` records come from fixtures or injected state.

## Damage claims

| Field | Type | Example |
| --- | --- | --- |
| `id`, `orderId`, `orderItemId`, `shipmentId` | Strings | `claim-<uuid>`, `wf-1003`, `wf-1003-i1`, `wf-1003-s1` |
| `quantity` | Positive integer | `1` |
| `issueType` | `damaged`, `defective`, `missing_parts`, `wrong_item` | `damaged` |
| `description` | String | `A crack runs along the base of one lamp.` |
| `requestedResolution` | `replacement`, `replacement_parts`, `refund` | `replacement` |
| `attachments` | Array of `{name: string, size: integer, type: string}` | `[{name: 'lamp-base.jpg', size: 184021, type: 'image/jpeg'}]` |
| `status` | `submitted`, `in_review`, `approved`, `resolved`, `denied`, `withdrawn` | `submitted` |
| `actorId`, `createdAt` | String, ISO timestamp | `customer-ava-morgan`, `2026-11-18T16:00:00.000Z` |

Claims are item-level and require a delivered shipment and an available quantity. Require a trimmed description of 10–1,000 characters. Accept up to three optional JPEG or PNG files of at most 5 MiB each. Keep file selection and previews in the form and record only safe file metadata on confirmation. The request reserves units and saves the customer's preferred resolution. Existing claim statuses are read from stored fixtures. Show the requested quantity and selected resolution in the claim detail.

## Returns

| Field | Type | Example |
| --- | --- | --- |
| `id`, `orderId` | Strings | `return-<uuid>`, `wf-1004` |
| `items` | Array of `{orderItemId: string, quantity: integer, reason: code, refundAmount: number}` | `[{orderItemId: 'wf-1004-i1', quantity: 1, reason: 'did_not_match', refundAmount: 118.80}]` |
| `handoffMethod` | `drop_off`, `pickup` | `drop_off` |
| `refundMethod` | `original_payment`, `store_credit` | `original_payment` |
| `refundSubtotal`, `returnFee`, `estimatedRefund`, `currency` | Numbers and currency code | `118.80`, `8.95`, `109.85`, `USD` |
| `status` | `requested`, `in_transit`, `received`, `refunded`, `canceled` | `requested` |
| `actorId`, `createdAt` | String, ISO timestamp | `customer-ava-morgan`, `2026-11-18T16:00:00.000Z` |
| `updatedBy`, `updatedAt`, `canceledAt` | Optional string and ISO timestamps | `customer-ava-morgan`, `2026-11-19T16:00:00.000Z`, `2026-11-19T16:00:00.000Z` |

Reason codes are `changed_mind`, `did_not_fit`, `did_not_match`, `ordered_by_mistake` and `other`. Require a delivered shipment with a valid `deliveredAt`, a returnable line and an available quantity. Calculate the inclusive return deadline as the local delivery date plus 30 calendar days. Compare against the task clock's local date. A future delivery date is ineligible. If the delivery date is unavailable, keep order information accessible and explain that the deadline is unavailable.

Allow drop-off for parcel lines and pickup for freight. Require the same handoff type across all lines in one request. Show split-request guidance for mixed orders. Apply one synthetic fee per request of USD `8.95` for drop-off or `39.95` for pickup, capped at the item subtotal. Per line, `refundAmount = quantity × (unitPrice + unitTax)`. Set `refundSubtotal` to the sum of those line amounts and `estimatedRefund` to `refundSubtotal - returnFee`. Present instructions for the selected handoff after submission. Allow cancellation while `requested`. Track the original request and its amounts after cancellation.

## Shared eligibility and rendering rules

- Calculate remaining quantity per line as ordered units less canceled units. For a delivered line, subtract quantities already committed to returns in `requested`, `in_transit`, `received` or `refunded` and claims in `submitted`, `in_review`, `approved` or `resolved`. Clamp the available number at zero. A canceled return, denied claim or withdrawn claim releases its quantity. The same unit cannot be claimed and returned in separate active requests.
- Require every submitted line to resolve to its order and, when relevant, a matching shipment. Render an incomplete injected record with the information it has and an explanation near actions that depend on missing data. Missing arrays are equivalent to empty arrays for display. Preserve the injected object when saving unrelated records.
- Generate new action IDs once at confirmation with entity prefixes and a UUID. Use `new Date().toISOString()` for all action timestamps. Revalidate quantities, shipment state, chosen slot, and applicable deadline before changing any record. Reject invalid or stale submissions without a partial write. A disabled pending button or synchronous submit guard avoids repeated writes.

### Default IDs

The default actor is `customer-ava-morgan`. Orders run from `wf-1001` through `wf-1064`. Order item and shipment IDs use the order ID plus a numbered suffix such as `wf-1005-i1` or `wf-1005-s2`. Stable history IDs include `appt-wf-1002`, `claim-wf-1032` and `return-wf-1032`. The seed fixture table describes the featured scenarios.

## Minimal Inject Example

```json
{
  "account": {"id": "customer-test", "name": "Morgan Example"},
  "orders": [{"id": "test-order", "orderNumber": "WF-TEST-1001", "items": []}],
  "shipments": [],
  "orderCancellations": [],
  "deliveryAppointments": [],
  "damageClaims": [],
  "returns": []
}
```

This state renders the order at `/orders/test-order?sid=<sid>`. The boot snapshot fills omitted account fields from the defaults. Consequently, the initial `state_diff` can already include a change to `account` when a session is injected with this example. Capture the post-bootstrap state before checking the effect of an action.

## Observable State Changes (for LLM evaluation)

| Confirmed action | Exact state writes |
| --- | --- |
| Cancel order items | Append to `orderCancellations` with `id`, `orderId`, `status: 'confirmed'`, `reason`, `items[]` (`orderItemId`, `quantity`, `estimatedCredit`), `estimatedCredit`, `currency`, `actorId`, `createdAt`. Increment `orders[].items[].canceledQuantity` for each affected line. |
| Schedule delivery | Append to `deliveryAppointments` with `id`, `orderId`, `shipmentId`, `slotId`, `startAt`, `endAt`, `timeZone`, `instructions`, `status: 'confirmed'`, `actorId`, `createdAt`. |
| Reschedule delivery | Append a confirmed appointment with the scheduling fields and `previousAppointmentId`. Set the previous record's `status: 'rescheduled'`, `updatedAt`, `updatedBy`, `replacedByAppointmentId`. |
| Cancel appointment | Set its `status: 'canceled'`, `updatedAt`, `updatedBy`, `canceledAt`. |
| Submit damage claim | Append to `damageClaims` with `id`, `orderId`, `orderItemId`, `shipmentId`, `quantity`, `issueType`, `description`, `requestedResolution`, `attachments[]` (`name`, `size`, `type`), `status: 'submitted'`, `actorId`, `createdAt`. |
| Request return | Append to `returns` with `id`, `orderId`, `items[]` (`orderItemId`, `quantity`, `reason`, `refundAmount`), `handoffMethod`, `refundMethod`, `refundSubtotal`, `returnFee`, `estimatedRefund`, `currency`, `status: 'requested'`, `actorId`, `createdAt`. |
| Cancel return | Set its `status: 'canceled'`, `updatedAt`, `updatedBy`, `canceledAt`. |
| Browse, search, filter, sort, track, copy a reference, open or dismiss a draft | No business state write. |

Each accepted confirmation passes the complete next state to the store-level save. Read-only activity and rejected submissions leave `/go` unchanged after bootstrap. The account store waits for the `set_current` acknowledgement before confirming success or letting another tab in the same browser storage context write the same session. An explicitly rejected save restores the prior local snapshot and leaves the review open for retry.

## Seed fixtures

Build `createInitialData()` from fixed synthetic fixture descriptors and return a fresh plain object holding all seven keys. Generate IDs, products, statuses, links, quantities and amounts deterministically. For actionable fixtures, materialize dates from fixed offsets relative to one `new Date()` read at initialization so a fresh local session can schedule or return items on the current clock. Keep those dates in the baseline. Use a fixed test clock or explicitly injected dates in Playwright for reproducible date assertions. Use explicit timestamps for historical fixtures or deterministic offsets extending over two years.

| Stable order and shipment IDs | Scenario and initial eligibility |
| --- | --- |
| `wf-1001`, `wf-1001-s1` | Sectional awaiting freight booking, with at least six future slots across three dates and no active appointment |
| `wf-1002`, `wf-1002-s1` | Sideboard with a confirmed future booking and at least four available alternative windows |
| `wf-1003`, `wf-1003-s1` | Two `Harbor Ceramic Table Lamp` units on an eligible delivered line with no existing claim or return |
| `wf-1004`, `wf-1004-s1` | Recent parcel delivery with an eligible rug and a separate final-sale line |
| `wf-1005`, `wf-1005-s1`, `wf-1005-s2` | A two-unit side-table line preparing and an individual parcel item in transit, with partial cancellation possible |
| `wf-1006`, `wf-1006-s1` | Delivered parcel more than 30 days ago for the expired-return test |
| `wf-1007`, `wf-1007-s1` | Recently delivered freight item eligible for a pickup return |
| `wf-1008`, `wf-1008-s1`, `wf-1008-s2` | One delivered parcel and one preparing parcel on the same order |

Include at least 64 orders and 72 shipments, plus at least 24 records each for appointments, claims, returns and order cancellations. Give each historical case an existing order and line or shipment where appropriate. Include history for each terminal state and recent open records for overview summaries. Keep the named clean fixtures free of unrelated historical reservations. Use fictitious SKUs, vendors, carrier references and personal details, English copy, and original image keys for local assets.
