# cvs_pharmacy_mock Schema

**Base URL** `http://localhost:5340/`  
**Go Endpoint** `GET /go?sid=<sid>` returns `{initial_state, current_state, state_diff}`.  
**Inject** `POST /post?sid=<sid>` with `{"action":"set","state":{...}}` before opening the browser with a fresh SID.  
**Reset** `POST /post?sid=<sid>` with `{"action":"reset"}` restores the stored baseline on the server.

The Harbor state API is available at `/state`, `/post`, and `/go`, scoped by `?sid=`. The app loads its merged baseline before displaying the account. Injected arrays replace the matching defaults. Injected objects merge recursively. User actions save the full state and preserve unrelated keys.

IDs and references are strings. Dates use `YYYY-MM-DD`. Instants are ISO 8601 UTC strings. Money is stored as numeric USD and quantities are integers. Order and visit times display in the store’s time zone. The seed anchors date-sensitive fixtures to the runtime date.

## State Schema

| Key | Type | Description |
| --- | --- | --- |
| `account` | Object | `{ id, name, preferredStoreId }`. |
| `patients` | Array | `{ id, name, relationship }`. Relationship is `self`, `partner`, or `dependent`. |
| `stores` | Array | `{ id, name, storeNumber, address, timeZone, driveThru, vaccineIds, pickupWindowStarts, vaccineSlotTimes, serviceDays }`. Address has `street`, `city`, `region`, `postalCode`. The time zone is an IANA name and `driveThru` is boolean. `vaccineIds` is a string array. The schedule time arrays contain local `HH:mm` strings. `serviceDays` contains weekday numbers with Sunday as 0. |
| `prescriptions` | Array | `{ id, rxNumber, patientId, medication, strength, quantity, unit, storeId, status, hidden, refillsRemaining, lastFilledOn, nextRefillOn, expiresOn, estimatedCopay, createdAt, createdBy }` with optional `prescriber`, `updatedAt`, `updatedBy`. Status is `active` or `inactive`. |
| `prescriptionFills` | Array | `{ id, prescriptionId, patientId, storeId, filledOn, quantity, amountPaid, createdAt, createdBy }` with optional `refillOrderId`. |
| `refillOrders` | Array | `{ id, patientId, storeId, pickupOrderId, items, estimatedTotal, pickupWindow, status, createdAt, createdBy }`. Status is `submitted`, `fulfilled`, or `cancelled`. |
| `pickupOrders` | Array | `{ id, patientId, storeId, items, estimatedTotal, pickupWindow, status, createdAt, createdBy }` with optional `refillOrderId`, `pickupCode`, `checkedInAt`, `checkedInBy`, `checkInMethod`, `updatedAt`, `updatedBy`. Status is `preparing`, `ready`, `checked_in`, `picked_up`, or `cancelled`. Check-in method is `counter` or `drive_thru`. |
| `vaccines` | Array | `{ id, name }` with optional `description`. |
| `vaccineAppointments` | Array | `{ id, patientId, vaccineIds, storeId, scheduledFor, status, confirmationCode, createdAt, createdBy }` with optional `updatedAt`, `updatedBy`, `rescheduledAt`, `cancelledAt`. `vaccineIds` is a string array. Status is `scheduled`, `completed`, or `cancelled`. |

Each order's `items` is an array of line snapshots with `prescriptionId`, `rxNumber`, `medication`, `strength`, `quantity`, `unit`, and `estimatedAmount`. Its `pickupWindow` contains `startsAt` and `endsAt`, one hour apart. Actor fields for account actions take the current `account.id`.

### Default IDs

| Records | Seed IDs |
| --- | --- |
| Account | `acct-001` |
| Patients | `patient-001` through `patient-003` |
| Stores | `store-001` through `store-012` |
| Prescriptions | `rx-001` through `rx-036` |
| Prescription fills | `fill-001` through `fill-048` |
| Refill orders | `refill-001` through `refill-030` |
| Pickup orders | `pickup-001` through `pickup-036` |
| Vaccines | `vax-flu`, `vax-covid`, `vax-tdap`, `vax-shingles`, `vax-pneumococcal`, `vax-rsv`, `vax-hepa`, `vax-hepb` |
| Vaccine appointments | `appt-001` through `appt-030` |

## Minimal Inject Example

Use this state inside a `set` request body to test a partial account and empty collections.

```json
{
  "account": { "name": "Jordan Audit" },
  "patients": [],
  "stores": [],
  "prescriptions": [],
  "prescriptionFills": [],
  "refillOrders": [],
  "pickupOrders": [],
  "vaccines": [],
  "vaccineAppointments": []
}
```

## Observable State Changes (for LLM evaluation)

| Confirmed user action | Exact changes visible through `/go` |
| --- | --- |
| Hide prescription or restore hidden prescription | Changes the selected `prescriptions[]` row’s `hidden` to `true` or `false`. Sets `updatedAt` and `updatedBy`. |
| Request refill | Adds one `refillOrders[]` row with `id`, `status: "submitted"`, `patientId`, `storeId`, `pickupOrderId`, `items`, `estimatedTotal`, `pickupWindow`, `createdAt`, `createdBy`. In the same save, adds one `pickupOrders[]` row with `id`, `status: "preparing"`, `patientId`, `storeId`, `refillOrderId`, `items`, `estimatedTotal`, `pickupWindow`, `createdAt`, `createdBy`. Prescription authorizations are unchanged. |
| Check in for ready pickup | Changes the selected `pickupOrders[]` row’s `status` to `checked_in`. Sets `checkedInAt`, `checkedInBy`, `checkInMethod`, `updatedAt`, and `updatedBy`. |
| Book vaccine appointment | Adds one `vaccineAppointments[]` row with `id`, `patientId`, `vaccineIds`, `storeId`, `scheduledFor`, `status: "scheduled"`, `confirmationCode`, `createdAt`, `createdBy`. |
| Reschedule vaccine appointment | Updates the selected `vaccineAppointments[]` row’s `storeId`, `scheduledFor`, `rescheduledAt`, `updatedAt`, and `updatedBy`. Keeps the row ID and confirmation code. |
| Cancel vaccine appointment | Changes the selected `vaccineAppointments[]` row’s `status` to `cancelled`. Sets `cancelledAt`, `updatedAt`, and `updatedBy`. |
| Open, search, filter, print, enter or dismiss a draft, or fail validation | No business write. |

Refill eligibility accounts for active pickup orders and submitted refill orders whose linked pickup is missing. Appointment slots account for other scheduled visits at the store and other simultaneous appointments for the patient. The app recalculates these rules before confirmation.
