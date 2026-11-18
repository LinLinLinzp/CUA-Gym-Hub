# Rider account state model

This is the planned shape for `src/data/seed.js` and the central UI store. Keep the implementation's `SCHEMA.md` authoritative for the verifier. `?` indicates an optional field. IDs and enumerated values are strings. All dates are ISO 8601 strings, money is a number rounded to cents, quantities are positive integers, and all state is plain JSON. Use `new Date().toISOString()` for each successful user action. Give new top-level records unique IDs and preserve the fixed IDs of seed records.

## Top-level keys

| Key | Type | Default size |
| --- | --- | --- |
| `rider` | `Rider` | 1 |
| `paymentMethods` | `PaymentMethod[]` | 4 |
| `trips` | `Trip[]` | 48 |
| `receipts` | `Receipt[]` | 44 |
| `expenseProfiles` | `ExpenseProfile[]` | 24 |
| `receiptActions` | `ReceiptAction[]` | 0 |
| `lostItemReports` | `LostItemReport[]` | 24 |
| `refundRequests` | `RefundRequest[]` | 24 |

## Record shapes and examples

Examples use the same San Francisco trip and linked receipt. Examples showing live writes illustrate the saved shape.

### Rider and payment methods

`Rider` has `id`, `name`, `email`, and optional `phone` and `timeZone`, all strings. `PaymentMethod` has `id`, `brand`, and `last4`, all strings. The charge UI needs the brand and final digits only.

```json
{"id":"rider_maya","name":"Maya Chen","email":"maya.chen@example.com","phone":"+1 415 555 0134","timeZone":"America/Los_Angeles"}
```

```json
{"id":"pay_01","brand":"Visa","last4":"4242"}
```

### Trips

`Trip` has `id`, `riderId`, `startedAt`, optional `endedAt`, `city`, `pickup`, `destination`, `service`, optional `driverName`, `status` (`completed` or `canceled`), `total` (number), `currency`, optional `expenseProfileId`, optional `receiptId`, and optional `expenseAssignment`. The assignment holds `previousProfileId` (string or null), `profileId`, `status` (`assigned`), `createdAt`, and `actorId`.

```json
{"id":"trip_001","riderId":"rider_maya","startedAt":"2026-11-16T17:45:00Z","endedAt":"2026-11-16T18:08:00Z","city":"San Francisco","pickup":"Duboce Park","destination":"Ferry Building","service":"UberX","driverName":"Jordan M.","status":"completed","total":22.4,"currency":"USD","expenseProfileId":"profile_002","receiptId":"receipt_001","expenseAssignment":{"previousProfileId":"profile_001","profileId":"profile_002","status":"assigned","createdAt":"2026-11-18T14:25:00Z","actorId":"rider_maya"}}
```

### Receipts and receipt actions

`Receipt` has `id`, `number`, `tripId`, `issuedAt`, `currency`, `total` (number), `lineItems` (`ReceiptLine[]`), and optional `billedProfileId`, `receiptEmail`, and `payment` (`{ brand, last4 }`). `ReceiptLine` has `id`, `label`, `quantity` (number), and `amount` (number), where amount is the extended line amount. Keep negative discounts and positive fees itemized. A receipt's bill-to, recipient and payment snapshot can survive profile edits or reassignment.

`ReceiptAction` has `id`, `receiptId`, `tripId`, `actorId`, `action` (`downloaded` or `resend_requested`), `status` (`completed` or `queued`, respectively), `createdAt`, and optional `recipientEmail` for resend. Use the receipt's stored email for confirmation and delivery routing, falling back to the rider email when needed. Disable resend with a clear reason if the injected world contains neither address.

```json
{"id":"receipt_001","number":"UB-261116-001","tripId":"trip_001","issuedAt":"2026-11-16T18:09:00Z","currency":"USD","total":22.4,"billedProfileId":"profile_001","receiptEmail":"maya.chen@example.com","payment":{"brand":"Visa","last4":"4242"},"lineItems":[{"id":"line_001_fare","label":"Trip fare","quantity":1,"amount":18.9},{"id":"line_001_fee","label":"Booking fee","quantity":1,"amount":3.5}]}
```

```json
{"id":"rcpt_action_001","receiptId":"receipt_001","tripId":"trip_001","actorId":"rider_maya","action":"resend_requested","status":"queued","createdAt":"2026-11-18T14:29:00Z","recipientEmail":"maya.chen@example.com"}
```

### Expense profiles

`ExpenseProfile` has `id`, `riderId`, `name`, `type` (`personal` or `business`), `status` (`active` or `archived`), `receiptEmail`, `paymentMethodId`, `reportFrequency` (`none`, `weekly` or `monthly`), optional `expenseProvider`, `createdAt`, `updatedAt`, and `updatedBy`. Payment and provider are recorded preferences. The archived records support history and can be viewed. The editable records are active business profiles. Trim labels and input values before validating and saving. Preserve `id`, `riderId`, and `createdAt` on edit.

```json
{"id":"profile_002","riderId":"rider_maya","name":"Studio travel","type":"business","status":"active","receiptEmail":"maya.expenses@example.org","paymentMethodId":"pay_02","reportFrequency":"monthly","expenseProvider":"Concur","createdAt":"2026-05-02T16:00:00Z","updatedAt":"2026-11-08T16:00:00Z","updatedBy":"rider_maya"}
```

### Lost items

`LostItemReport` has `id`, `tripId`, `reporterId`, `category` (`phone`, `wallet`, `bag`, `keys`, `clothing` or `other`), `description`, `callbackPhone`, `status` (`submitted`, `in_progress`, `returned` or `closed`), `createdAt`, `updatedAt`, and optional `resolvedAt` and `resolvedBy`. A create operation requires an eligible completed trip, a category, a nonempty description, and a phone number with 7–15 digits after counting past formatting characters. Preserve the entered callback text. Submitted and in-progress cases may be marked returned.

```json
{"id":"lost_025","tripId":"trip_001","reporterId":"rider_maya","category":"bag","description":"Blue canvas tote in the rear footwell","callbackPhone":"+1 415 555 0134","status":"returned","createdAt":"2026-11-18T14:30:00Z","updatedAt":"2026-11-18T14:44:00Z","resolvedAt":"2026-11-18T14:44:00Z","resolvedBy":"rider_maya"}
```

### Refunds

`RefundRequest` has `id`, `tripId`, `receiptId`, `requesterId`, `reason` (`unexpected_fare`, `duplicate_charge`, `cancellation_fee`, `wait_time_fee` or `other`), `description`, `lineItems` (`RequestedLine[]`), `requestedAmount` (number), `currency`, `status` (`submitted`, `under_review`, `approved`, `declined` or `withdrawn`), `createdAt`, `updatedAt`, optional `withdrawnAt`, `withdrawnBy`, and optional `approvedAmount` (number) for a seeded approved request. Each `RequestedLine` holds `receiptLineId`, `label`, `quantity` (number copied from the selected receipt line), `chargedAmount` (number), and `requestedAmount` (number). Use cents for calculations and save amounts with two-decimal precision. Show a reason appropriate to charged cancellations. Require a trip with an available receipt and at least one positive charge line. Request amounts must be positive and no greater than their selected line amount or the receipt total when summed. A submitted request may be withdrawn once. A request or withdrawal does not change the fare ledger or post a payment.

```json
{"id":"refund_025","tripId":"trip_001","receiptId":"receipt_001","requesterId":"rider_maya","reason":"unexpected_fare","description":"The booking fee was higher than the price shown.","lineItems":[{"receiptLineId":"line_001_fee","label":"Booking fee","quantity":1,"chargedAmount":3.5,"requestedAmount":2.5}],"requestedAmount":2.5,"currency":"USD","status":"withdrawn","createdAt":"2026-11-18T14:35:00Z","updatedAt":"2026-11-18T14:49:00Z","withdrawnAt":"2026-11-18T14:49:00Z","withdrawnBy":"rider_maya"}
```

## Seed implementation

- Return a fresh object containing the eight keys above on every call. Build fixed arrays from curated tuples or explicit records. Dates, amounts and IDs derive from fixed inputs. Reserve `trip_001` and `receipt_001` for the Ferry Building example, with Personal as the initial reporting profile and no initial assignment. Keep this trip free of active seed cases and fare reviews.
- Seed **48 trips** spanning April–November 2026. Use distinct Bay Area stops such as the Ferry Building, SFO, Oakland Museum, Jack London Square, and Palo Alto Caltrain. Mix 42 completed rides, two cancellations with fees, and four free cancellations. Include several cities, route lengths, ride types, payment labels, both personal and business classifications, and a range of fares.
- Seed **44 receipts**, one for each charged trip. Include fare, fees, and occasional tolls, tips and discounts. Provide several distinct receipts with more than one positive line. Keep all totals consistent with the line items.
- Seed **24 expense profiles** including Personal, four active business profiles for consulting and travel, and nineteen archived project profiles. Keep historic records readable and linked. Give active profiles distinct names, work email addresses under reserved domains, payment preferences and report settings.
- Seed **24 lost item reports** across completed trips. Include all category and status options with varied, specific descriptions and reserved callback numbers. Seed **24 refund requests** with linked charge lines, distinct reasons, a mix of request statuses and exact charged/refund totals. Spread seeded open cases across trips so more than one eligible trip is available for new cases.
- Resolve references at render time with optional lookups and neutral labels for missing related records. Keep actions available only when their required data exists. Preserve unknown top-level injected keys and unrelated record fields when updating the relevant entity.
