# California DMV data model

This is the proposed app and verifier state contract. Implement it in `src/data/seed.js` and document the shipped shape and writes in app-root `SCHEMA.md`. The state is JSON and consists of one current profile and seven collections. The examples are synthetic.

## Shared types

| Type | Fields and example |
| --- | --- |
| ID | Nonempty string, stable for a seeded record. Example `office-sacramento-broadway`. |
| LocalDate | Calendar date string in `YYYY-MM-DD`, e.g. `2026-12-03`. Calendar dates and local times are interpreted in `America/Los_Angeles`. |
| LocalTime | String in 24-hour `HH:mm`, e.g. `09:30`. Convert to 12-hour format for display. |
| Timestamp | ISO 8601 UTC string, e.g. `2026-11-18T06:40:00.000Z`. User writes use `new Date().toISOString()`. |
| Money | US dollars as a two-decimal string, e.g. `"269.15"`. Calculate in integer cents and format at the state boundary. |
| Address | Object with `line1: string`, optional `line2: string`, `city: string`, `state: string` (two-letter postal code), and `zip: string` (five digits or ZIP+4). Example `{"line1":"1818 Alder Grove Way","line2":"Unit 4","city":"Sacramento","state":"CA","zip":"95818"}`. Use `null` or absence for optional addresses. |
| Contact | Object with `firstName: string`, `lastName: string`, `phone: string` (canonical ten digits, e.g. `9165550142`) and optional `email: string` (e.g. `maya.chen@example.test`). |
| FeeLine | Object with `code: string`, `label: string`, `quantity: integer`, `unitAmount: Money`, and `amount: Money`. Example `{"code":"registration","label":"Registration fee","quantity":1,"unitAmount":"74.00","amount":"74.00"}`. |
| ServiceType | `real_id_first_time`, `dl_id_office_application`, `dl_id_office_renewal`, `automobile_drive_test`, `commercial_drive_test`, or `motorcycle_drive_test`. Map each to a consistent human-readable service label. |
| AddressTargetSnapshot | Object with `type: "credential" \| "registration"`, `id: ID` of the selected credential or registration, `residentialAddress: Address` and `mailingAddress: Address \| null`. |

Fields are required unless marked optional or nullable. For injected sparse data, fall back gracefully with labels such as “Address unavailable” and guard submit where the data needed to create a valid record is missing. Retain unknown injected top-level keys in whole-state writes.

## Profile

`profile` is a singleton object for the signed-in resident. It carries the current DL/ID record and Garage membership. Garage and history selectors use its ID and references.

| Field | Type | Example |
| --- | --- | --- |
| `id` | ID | `resident-maya-chen` |
| `contact` | Contact | Maya Chen, 9165550142, maya.chen@example.test |
| `garageVehicleIds` | ID[] | `["vehicle-maya-01","vehicle-maya-02","vehicle-maya-03","vehicle-maya-04"]` |
| `credential` | Credential or null | Default Credential below |
| `canChangeAddressOnline` | boolean | `true` |

A **Credential** contains `id: ID` (`dl-maya-01`), `number: string` (`X2468013`), `type: "DL" | "ID" | "CDL"` (`DL`), `expirationDate: LocalDate` (`2029-05-18`), `residentialAddress: Address` (1818 Alder Grove Way example above), and optional `mailingAddress: Address | null` (`null`). Mask the number in account summaries.

## Offices

`offices[]` carries field office inventory and supported services.

| Field | Type | Example |
| --- | --- | --- |
| `id` | ID | `office-sacramento-broadway` |
| `name` | string | Sacramento |
| `address` | Address | 4700 Broadway, Sacramento, CA 95820 |
| `region` | string | Sacramento Valley |
| `serviceTypes` | ServiceType[] | `["real_id_first_time","dl_id_office_renewal","automobile_drive_test"]` |
| `hours` | `{days: string, opens: LocalTime, closes: LocalTime}[]` | `[{"days":"Mon–Tue, Thu–Fri","opens":"08:00","closes":"17:00"},{"days":"Wed","opens":"09:00","closes":"17:00"}]` |
| `mapPosition` | Optional `{x: number, y: number}` in 0–100 coordinates | `{"x":44,"y":32}` |

## Appointment slots

`appointmentSlots[]` is office and service inventory. Slot occupancy is derived from matching appointments with scheduled status. Past appointments display their saved status and date with the appropriate history placement.

| Field | Type | Example |
| --- | --- | --- |
| `id` | ID | `slot-sacramento-broadway-008` |
| `officeId` | ID | `office-sacramento-broadway` |
| `serviceTypes` | ServiceType[] | `["automobile_drive_test"]` |
| `date` | LocalDate | `2026-12-03` |
| `time` | LocalTime | `09:30` |

A slot is bookable when its office and service match, its local start is in the future and no scheduled appointment uses its ID. Each office/date/time capacity unit has one stable ID. Offices or slots with unusable scheduling data remain safe to browse.

## Appointments

`appointments[]` contains bookings and their history. `date`, `time` and `timeZone` capture the scheduled time once the booking is made.

| Field | Type | Example |
| --- | --- | --- |
| `id` | ID | `appt-001` |
| `actorId` | ID | `resident-maya-chen` |
| `serviceType` | ServiceType | `automobile_drive_test` |
| `officeId` | ID | `office-sacramento-broadway` |
| `slotId` | ID | `slot-sacramento-broadway-008` |
| `date` | LocalDate | `2026-12-03` |
| `time` | LocalTime | `09:30` |
| `timeZone` | String | `America/Los_Angeles` |
| `contact` | Contact | Maya Chen, 9165550142, maya.chen@example.test |
| `confirmationCode` | string | `APT-002481` |
| `status` | `scheduled` or `cancelled` or `completed` | `scheduled` |
| `createdAt` | Timestamp | `2026-11-18T06:40:00.000Z` |
| `cancelledAt` | Optional Timestamp | `2026-11-19T19:20:00.000Z` |

Booking IDs and confirmation codes must be unique within each session and collection. History and confirmation routes scope detail and cancellation to the signed-in actor. Lookup searches its saved contact snapshot. Keep the selected slot reference on cancellation so history shows the original appointment.

## Vehicles

`vehicles[]` is the identification and ownership catalog. The current resident's Garage comes from `profile.garageVehicleIds` intersected with vehicles owned by `profile.id`.

| Field | Type | Example |
| --- | --- | --- |
| `id` | ID | `vehicle-maya-01` |
| `ownerId` | ID | `resident-maya-chen` |
| `registeredOwnerName` | string | Maya Chen |
| `registeredOwnerLookupName` | string | Chen |
| `type` | `automobile` or `motorcycle` or `trailer` or `vessel` | `automobile` |
| `year` | Integer | `2021` |
| `make` | string | Toyota |
| `model` | string | Corolla |
| `plateNumber` | string (1–8 alphanumerics) | `8TYC214` |
| `vinHinSuffix` | string | `24680` |

Use the stored plate/CF and suffix for the service identifier match. Accept five alphanumeric suffix characters normally and a two- or three-character HIN for a vessel when the shorter identifier matches a fixture. Preserve any leading zeros. The Garage exposes the searchable synthetic suffix. Standalone status lookup uses `registeredOwnerLookupName` for an individual last name or full company/lessor name.

## Registrations

`registrations[]` carries one current registration per vehicle. Its confirmed residential and mailing addresses feed the renewal review and address change target picker. Missing insurance or smog status blocks renewal only when status is explicitly `missing`. A valid offer is the fixture's eligibility signal when optional flags are absent.

| Field | Type | Example |
| --- | --- | --- |
| `id` | ID | `reg-maya-01` |
| `vehicleId` | ID | `vehicle-maya-01` |
| `status` | `active` or `due` or `expired` | `due` |
| `expirationDate` | LocalDate | `2026-12-15` |
| `residentialAddress` | Address | 1818 Alder Grove Way, Unit 4, Sacramento, CA 95818 |
| `mailingAddress` | Optional Address or null | `null`, meaning use the confirmed residential address |
| `insuranceStatus` | Optional `on_file`, `missing` or `not_required` | `on_file` |
| `smogStatus` | Optional `on_file`, `missing` or `not_required` | `not_required` |
| `renewalOffer` | RenewalOffer or null | See below |
| `lastRenewalId` | Optional ID or null | `rnw-0008` |

A **RenewalOffer** contains `id: ID` (`offer-reg-maya-01-2026`), `termEndDate: LocalDate` (`2027-12-15`), and `feeLines: FeeLine[]` (e.g. registration $74.00, vehicle license fee $120.00 and other fees $70.00). At payment, validate that the current offer matches the reviewed ID and that its term advances the existing expiration. For card, compute the fee as 1.95% of the subtotal rounded to the cent, e.g. $5.15 for a $264.00 subtotal. For bank, use `"0.00"`. The offer becomes `null` upon commit and its ID remains on the saved receipt for duplicate detection.

## Registration renewals

`registrationRenewals[]` contains one record per successful renewal. The receipt uses saved snapshots to stay stable when registration data later changes.

| Field | Type | Example |
| --- | --- | --- |
| `id` | ID | `rnw-0037` |
| `actorId` | ID | `resident-maya-chen` |
| `vehicleId` | ID | `vehicle-maya-01` |
| `registrationId` | ID | `reg-maya-01` |
| `offerId` | ID | `offer-reg-maya-01-2026` |
| `previousExpirationDate` | LocalDate | `2026-12-15` |
| `newExpirationDate` | LocalDate | `2027-12-15` |
| `feeLines` | FeeLine[] | Registration, vehicle license and other fees |
| `subtotal` | Money | `"264.00"` |
| `processingFee` | Money | `"5.15"` |
| `total` | Money | `"269.15"` |
| `paymentMethod` | `card` or `bank_account` | `card` |
| `mailingAddress` | Address | 1818 Alder Grove Way, Unit 4, Sacramento, CA 95818 |
| `confirmationCode` | string | `RNL-004782` |
| `status` | `paid` or `issued` | `paid` after an in-app payment, `issued` on selected history fixtures |
| `createdAt` | Timestamp | `2026-11-18T06:50:00.000Z` |

Show only the selected payment method. The sample payment UI requires no card number, CVV, routing number or bank account number. Receipt deep links validate the actor for its MyDMV view. The public lookup can resolve the identified vehicle's latest status and show a receipt link only when its actor is the signed-in resident.

## Address change requests

`addressChangeRequests[]` represents resident submissions and status history. Store snapshots of each selected confirmed address and the proposed addresses. Set `newMailingAddress` to `null` when mail goes to the new residential address. Compare target vehicles' confirmed residential addresses after trimming and normalizing whitespace and case. Require one valid target, cap vehicles at three, validate ownership and resolve Garage membership and credential eligibility at commit.

| Field | Type | Example |
| --- | --- | --- |
| `id` | ID | `coa-0037` |
| `actorId` | ID | `resident-maya-chen` |
| `credentialId` | ID or null | `dl-maya-01` |
| `vehicleIds` | ID[] | `["vehicle-maya-01","vehicle-maya-02"]` |
| `registrationIds` | ID[] | `["reg-maya-01","reg-maya-02"]` in corresponding order |
| `previousAddresses` | AddressTargetSnapshot[] | Snapshot entries for the DL and two registrations |
| `newResidentialAddress` | Address | 2447 Juniper Bend Drive, Davis, CA 95616 |
| `newMailingAddress` | Address or null | P.O. Box 1624, Davis, CA 95617 |
| `confirmationCode` | string | `COA-006318` |
| `status` | `submitted` or `completed` | `submitted` |
| `createdAt` | Timestamp | `2026-11-18T06:55:00.000Z` |
| `completedAt` | Optional Timestamp | `2026-11-20T20:45:00.000Z` on completed history |

Confirmed addresses are the current credential and registration values. Submitting a change creates a pending request. The MyDMV view can show the latest submitted request for a target alongside its confirmed address. Use completed fixtures for already processed requests and retain their history. Status is read from the stored record.

## Initial state

```js
export function createInitialData() {
  return {
    profile: /* one current resident and optional credential */,
    offices: /* 36 fixed-ID offices */,
    appointmentSlots: /* 144 or more fixed-ID slots */,
    appointments: /* 36 fixed-ID bookings and history */,
    vehicles: /* 48 fixed-ID vehicles */,
    registrations: /* 48 linked registrations */,
    registrationRenewals: /* 36 fixed-ID transactions */,
    addressChangeRequests: /* 36 fixed-ID requests */,
  }
}
```

Use literal tables or deterministic fixture generation with English names and descriptions, stable ordinals and no random IDs at boot. Take one `new Date()` anchor in `createInitialData()` for default relative dates so seeded future slots and current offers work with Harbor's frozen clock. Generate civil dates in Pacific time. Store concrete dates on the initialized world. Injected arrays carry their own dates and replace the corresponding defaults. Use the runtime clock when determining which persisted slots are still in the future.

### Fixture requirements

- **Appointments.** Maya Chen has an upcoming Sacramento-area appointment using `Maya`, `Chen`, `916-555-0142`. Give the office a second future slot compatible with the same service. Include a neighbouring office with a different set of services, multiple dates with morning and afternoon times, and a past or cancelled booking for ordering and display. Seed overlapping time choices with distinct office IDs.
- **Renewals.** `vehicle-maya-01` has plate `8TYC214` and suffix `24680`. Expose them in the Garage, with an eligible offer that yields $264.00 before processing. Give a second default Garage vehicle a seeded issued receipt and set its registration's `lastRenewalId` correctly. Give one owned vehicle an online renewal blocker or no offer and populate other customer fixtures for additional negatives.
- **Address changes.** Assign `vehicle-maya-01`, `vehicle-maya-02` and `vehicle-maya-03` the same confirmed residential address. Give `vehicle-maya-04` a different address to exercise co-selection validation. Include a combined completed request, a credential-only request and a registration-only request across the history fixtures. Include both submitted and completed requests under the current actor.
- **Relationships.** Every seeded slot resolves to an office and every seeded appointment resolves to its slot. Each registration resolves to a vehicle. Each renewal resolves to both a registration and vehicle. Each address request references the credential it changed or the corresponding registration/vehicle pairs. Synthetic historical actors can appear as IDs without separate account objects. Keep their MyDMV activity out of the signed-in resident's history.

## Observable State Changes

| User action | Exact fields written | Verifier check |
| --- | --- | --- |
| Confirm new booking | Append one `appointments[]` record containing `id`, `actorId`, `serviceType`, `officeId`, `slotId`, `date`, `time`, `timeZone`, `contact`, `confirmationCode`, `status` and `createdAt`. | Status is `scheduled`, selection and confirmation match UI, and the slot is excluded from availability. |
| Confirm cancellation | Set `appointments[id].status` to `cancelled` and `appointments[id].cancelledAt` to the action timestamp. | Same appointment ID and confirmation code. An eligible future slot can be booked again. |
| Confirm renewal payment | Append one `registrationRenewals[]` record containing `id`, `actorId`, `vehicleId`, `registrationId`, `offerId`, `previousExpirationDate`, `newExpirationDate`, `feeLines`, `subtotal`, `processingFee`, `total`, `paymentMethod`, `mailingAddress`, `confirmationCode`, `status`, `createdAt`. Set `registrations[id].expirationDate`, `.status`, `.renewalOffer`, and `.lastRenewalId` together. | Receipt is `paid`. Registration is `active`, expiry equals receipt's new expiration, offer is `null`, and last renewal ID points to that receipt. |
| Submit change of address | Append one `addressChangeRequests[]` record containing `id`, `actorId`, `credentialId`, `vehicleIds`, `registrationIds`, `previousAddresses`, `newResidentialAddress`, `newMailingAddress`, `confirmationCode`, `status`, `createdAt`. | Status is `submitted`, target IDs and full addresses match review and the status view renders the same confirmation. |
| Lookup, browse, filter, edit draft, review, print or dismiss a dialog | No domain writes. | Domain diff remains unchanged from the previous successful action. |

All successful writes use one immutable whole-state store update and one `saveState()` call. Revalidate the selected IDs and guard repeat submission at the commit boundary. Keep forms, draft carts, filters, transient notices and loading state out of verifier data.
