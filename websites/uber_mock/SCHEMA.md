# uber_mock Schema

**Base URL** `http://localhost:5320/`  
**Go Endpoint** `GET /go?sid=<sid>` → `{initial_state, current_state, state_diff}`  
**Inject** `POST /post?sid=<sid>` with `{"action":"set","state":{...}}`  
**Reset** `POST /post?sid=<sid>` with `{"action":"reset"}` restores the stored baseline, or the seed if a baseline is absent.

Use a fresh `sid` to load an injected world in a browser that has already opened the app. Objects merge with defaults at first load, arrays replace the seed, and additional injected keys and fields are retained. `/go` reports top-level changes as `{ "modified": value }` or `{ "added": value }` for each changed key.

## State Schema

IDs are strings. Timestamps are ISO 8601 strings. Money fields are numeric decimal amounts in the record currency. `?` marks optional fields.

| Key | Type | Records and fields | Seed count |
| --- | --- | --- | --- |
| `rider` | object | `id, name, email, phone?, timeZone?` | 1 |
| `paymentMethods` | array | `id, brand, last4` | 4 |
| `trips` | array | `id, riderId, startedAt, endedAt?, city, pickup, destination, service, driverName?, status, total, currency, expenseProfileId?, receiptId?, expenseAssignment?`. Status is `completed` or `canceled`. The assignment contains `previousProfileId` (nullable), `profileId, status, createdAt, actorId`. | 48 |
| `receipts` | array | `id, number, tripId, issuedAt, currency, total, lineItems, billedProfileId?, receiptEmail?, payment?`. Each line contains `id, label, quantity, amount`. The payment snapshot contains `brand, last4`. | 44 |
| `expenseProfiles` | array | `id, riderId, name, type, status, receiptEmail, paymentMethodId, reportFrequency, expenseProvider?, createdAt, updatedAt, updatedBy`. Type is `personal` or `business`. Status is `active` or `archived`. Frequency is `none`, `weekly` or `monthly`. | 24 |
| `receiptActions` | array | `id, receiptId, tripId` (nullable), `actorId, action, status, createdAt, recipientEmail?`. Action and status are `downloaded`/`completed` or `resend_requested`/`queued`. | 0 |
| `lostItemReports` | array | `id, tripId, reporterId, category, description, callbackPhone, status, createdAt, updatedAt, resolvedAt?, resolvedBy?`. Category is `phone`, `wallet`, `bag`, `keys`, `clothing` or `other`. Status is `submitted`, `in_progress`, `returned` or `closed`. | 24 |
| `refundRequests` | array | `id, tripId, receiptId, requesterId, reason, description, lineItems, requestedAmount, currency, status, createdAt, updatedAt, approvedAmount?, withdrawnAt?, withdrawnBy?`. Each line contains `receiptLineId, label, quantity, chargedAmount, requestedAmount`. Reason is `unexpected_fare`, `duplicate_charge`, `cancellation_fee`, `wait_time_fee` or `other`. Status is `submitted`, `under_review`, `approved`, `declined` or `withdrawn`. | 24 |

### Default IDs

- Rider `rider_maya` and payment methods `pay_01` through `pay_04`.
- Profiles `profile_001` through `profile_024`. The first two are Personal and Studio travel.
- Trips `trip_001` through `trip_048`. Receipts use the corresponding `receipt_` number, omitting `014`, `020`, `036` and `045`.
- Lost item cases `lost_001` through `lost_024` and fare reviews `refund_001` through `refund_024`.
- `trip_001` is the completed Duboce Park → Ferry Building ride. Its `receipt_001` has a $22.40 total, $18.90 fare and $3.50 booking fee. The trip starts under Personal and has no seeded support cases.

## Minimal Inject Example

```json
{
  "rider": { "name": "Injected Rider" },
  "paymentMethods": [],
  "trips": [{ "id": "trip_injected", "status": "completed" }],
  "receipts": [],
  "expenseProfiles": [],
  "receiptActions": [],
  "lostItemReports": [],
  "refundRequests": []
}
```

## Observable State Changes (for LLM evaluation)

| User action | Persisted fields |
| --- | --- |
| Change expense profile on a completed trip | Update `trips[].expenseProfileId` and replace `expenseAssignment` with `previousProfileId, profileId, status: "assigned", createdAt, actorId` on that trip. |
| Download PDF | Append to `receiptActions` with `id, receiptId, tripId, actorId, action: "downloaded", status: "completed", createdAt`. |
| Confirm receipt resend | Append to `receiptActions` with `id, receiptId, tripId, actorId, action: "resend_requested", status: "queued", createdAt, recipientEmail`. The email comes from the receipt snapshot or the rider's registered address. |
| Add a business profile | Append to `expenseProfiles` with `id, riderId, name, type: "business", status: "active", receiptEmail, paymentMethodId, reportFrequency, expenseProvider, createdAt, updatedAt, updatedBy`. |
| Save an edited business profile | Update `name, receiptEmail, paymentMethodId, reportFrequency, expenseProvider, updatedAt, updatedBy` on the existing profile. |
| Report a lost item | Append to `lostItemReports` with `id, tripId, reporterId, category, description, callbackPhone, status: "submitted", createdAt, updatedAt`. |
| Mark a lost item returned | Update the case's `status: "returned", updatedAt, resolvedAt, resolvedBy`. |
| Submit a fare review | Append to `refundRequests` with `id, tripId, receiptId, requesterId, reason, description, lineItems, requestedAmount, currency, status: "submitted", createdAt, updatedAt`. Line snapshots preserve the charge ID, label, quantity and charged amount alongside the requested amount. |
| Withdraw a submitted fare review | Update the request's `status: "withdrawn", updatedAt, withdrawnAt, withdrawnBy`. |

Receipt snapshots preserve the original charge, billed profile, payment and email through trip reassignment. Navigation, filtering, sorting, drafts, canceled confirmations and validation errors leave business records unchanged.
