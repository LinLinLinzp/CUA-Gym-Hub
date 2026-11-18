# CVS Pharmacy state model

Publish the implemented contract in `../SCHEMA.md`. IDs and references are strings. Store money as numeric US dollars rounded to cents and counts as integers. Date-only fields use `YYYY-MM-DD`. Other timestamps are ISO 8601 instants. Render pickup and appointment times in the pharmacy’s time zone. All examples are synthetic.

## Top-level shape

| Key | Type | Example contents |
| --- | --- | --- |
| `account` | Object | `{ id: "acct-001", name: "Morgan Ellis", preferredStoreId: "store-001" }` |
| `patients` | Patient[] | Morgan Ellis and two linked profiles |
| `stores` | Pharmacy[] | Nearby and alternate synthetic pharmacies |
| `prescriptions` | Prescription[] | Medication records with varied refill eligibility |
| `prescriptionFills` | PrescriptionFill[] | Historical dispensing events |
| `refillOrders` | RefillOrder[] | Requested, historical, and cancelled orders |
| `pickupOrders` | PickupOrder[] | Preparing, ready, checked-in, and past pickups |
| `vaccines` | Vaccine[] | Named booking options |
| `vaccineAppointments` | VaccineAppointment[] | Scheduled, completed, and cancelled visits |

## Reference records

| Entity | Fields with example values |
| --- | --- |
| Patient | `id: "patient-001"`, `name: "Morgan Ellis"`, `relationship: "self"` (also `"partner"` or `"dependent"`) |
| Pharmacy | `id: "store-001"`, `name: "CVS Pharmacy · Maple Square"`, `storeNumber: "01001"`, `address: { street: "184 Maple Square", city: "Brookline", region: "MA", postalCode: "02446" }`, `timeZone: "America/New_York"`, `driveThru: true`, `vaccineIds: ["vax-flu", "vax-tdap"]`, `pickupWindowStarts: ["09:00", "11:00", "14:00"]`, `vaccineSlotTimes: ["09:30", "10:00", "14:30"]`, `serviceDays: [1, 2, 3, 4, 5, 6]` (Sunday is 0) |
| Vaccine | `id: "vax-flu"`, `name: "Flu (influenza)"`; optional `description: "Seasonal flu vaccine"` |

Pharmacy schedule fields repeat weekly in store-local time. Offer 60-minute pickup windows over seven local dates and vaccine slots over 14 local dates, starting today and excluding elapsed times. Respect `serviceDays` and convert selections to ISO instants. Display an empty availability message if the selected store lacks usable schedule fields. Slot lists are derived at render time.

## Prescriptions and orders

Each top-level business record below includes `id`, `createdAt` (for example `"2026-11-18T16:40:00.000Z"`), and `createdBy` (for example `"acct-001"` or `"pharmacy-staff"`). For user actions derive actor IDs from `account.id` and timestamps from `new Date().toISOString()`. Optional lifecycle fields can be absent until the associated action.

| Entity | Additional fields with example values |
| --- | --- |
| Prescription | `id: "rx-001"`, `rxNumber: "6528014"`, `patientId: "patient-001"`, `medication: "Atorvastatin"`, `strength: "20 mg"`, `quantity: 30`, `unit: "tablets"`, `storeId: "store-001"`, `status: "active"` or `"inactive"`, `hidden: false`, `refillsRemaining: 2`, `lastFilledOn: "2026-10-30"`, `nextRefillOn: "2026-11-14"`, `expiresOn: "2027-10-30"`, `estimatedCopay: 8.50`. Optional `prescriber: "Jordan Rivera"`, `updatedAt`, `updatedBy`. |
| PrescriptionFill | `id: "fill-001"`, `prescriptionId: "rx-001"`, `patientId: "patient-001"`, `storeId: "store-001"`, `filledOn: "2026-10-30"`, `quantity: 30`, `amountPaid: 8.50`. Optional `refillOrderId: "refill-001"`. |
| OrderLine | `prescriptionId: "rx-001"`, `rxNumber: "6528014"`, `medication: "Atorvastatin"`, `strength: "20 mg"`, `quantity: 30`, `unit: "tablets"`, `estimatedAmount: 8.50`. |
| PickupWindow | `{ startsAt: "2026-11-19T19:00:00.000Z", endsAt: "2026-11-19T20:00:00.000Z" }`. |
| RefillOrder | `id: "refill-031"`, `patientId: "patient-001"`, `storeId: "store-001"`, `pickupOrderId: "pickup-037"`, `items: [OrderLine]`, `estimatedTotal: 8.50`, `pickupWindow: PickupWindow`, `status: "submitted"` or `"fulfilled"` or `"cancelled"`. |
| PickupOrder | `id: "pickup-037"`, `patientId: "patient-001"`, `storeId: "store-001"`, `items: [OrderLine]`, `estimatedTotal: 8.50`, `pickupWindow: PickupWindow`, `status: "preparing"` or `"ready"`, `"checked_in"`, `"picked_up"`, `"cancelled"`. Optional `refillOrderId: "refill-031"`, `pickupCode: "P41826"`, `checkedInAt`, `checkedInBy`, `checkInMethod: "counter"` or `"drive_thru"`, `updatedAt`, `updatedBy`. |

Prescriptions and fills link to one patient and pharmacy. A refill order contains one or more prescriptions from one patient. A pickup can originate at the pharmacy without a refill order. Store line snapshots so history remains legible if an injected world omits a linked prescription. Block refills when core ordering data is missing, a matching pickup is preparing, ready, or checked in, or a submitted refill has no linked pickup. A linked pickup marked picked up or cancelled releases that block.

## Vaccine appointment record

| Field | Type and example |
| --- | --- |
| `id` | string, `"appt-031"` |
| `patientId` | string, `"patient-001"` |
| `vaccineIds` | string[], `["vax-flu", "vax-tdap"]` |
| `storeId` | string, `"store-001"` |
| `scheduledFor` | ISO instant, `"2026-11-19T14:30:00.000Z"` |
| `status` | `"scheduled"`, `"completed"`, or `"cancelled"` |
| `confirmationCode` | string, `"V48261"` |
| `createdAt`, `createdBy` | ISO instant and actor ID, `"2026-11-18T16:40:00.000Z"`, `"acct-001"` |
| `updatedAt`, `updatedBy` | Optional ISO instant and actor ID |
| `rescheduledAt`, `cancelledAt` | Optional ISO instant set on the corresponding action |

Every selected vaccine ID must exist in `vaccines[]` and in the selected store’s `vaccineIds`. A scheduled visit reserves the exact store/instant slot and prevents the same patient from booking that instant at another store. Ignore cancelled visits and exclude the appointment being edited during availability checks. Keep the original confirmation code and creation metadata on edits.

## Seed construction

Return fresh JSON-serialisable objects and arrays for all nine keys on each `createInitialData()` call. Give seed records fixed IDs and newly created records unique IDs. Anchor date-sensitive fixtures to stable day offsets from the runtime clock so a fresh session always has some immediately actionable and historic records. Keep historical timestamps internally consistent and derive availability without persisting it. Include at least two eligible prescriptions with different quantities for one patient, at least one of each blocked state, a ready drive-thru pickup, and a future scheduled visit with at least two valid alternatives. Honor empty injected collections and preserve unrelated injected keys on write.
