# va_gov_mock Schema

**Base URL** `http://localhost:5534/`  
**Go Endpoint** `GET /go?sid=<sid>` → `{initial_state, current_state, state_diff}`  
**Inject** `POST /post?sid=<sid>` with `{"action":"set","state":{...}}`  
**Reset** `POST /post?sid=<sid>` with `{"action":"reset"}` restores the stored baseline or defaults if no baseline exists.

## State Schema

`state_diff` reports added or modified top-level keys. All record IDs and references are strings. Amounts are numeric USD by default. Timestamps ending in `At` are ISO UTC timestamps. Date-only fields use `YYYY-MM-DD` and preferred times use facility-local `HH:mm`. Optional fields may be absent. Injected fields are preserved. Filters, reviews, and temporary form inputs are local UI state.

| Root key | Record fields |
| --- | --- |
| `profile` | `id`, `firstName`, `lastName`. |
| `facilities[]` | `id`, `name`, `city`, `state`, `timeZone`, `clinics[]` of strings. |
| `claims[]` | `id`, `type`, `conditions[]` of strings, `status`, `createdAt`, `updatedAt`, `actorId`. Optional `reason`, `acknowledged`, `history[]` with `status, createdAt, actorId`, `evidenceRequests[]` with `id, title, status, dueDate?`, and `decisionLetter` with `fileName, issuedAt, text`. |
| `claimEvidence[]` | `id`, `claimId`, `fileName`, `mimeType`, `sizeBytes`, `documentType`, `status`, `actorId`, `createdAt`. |
| `appointments[]` | `id`, `facilityId`, `clinic`, `visitType`, `status`, `createdAt`, `updatedAt`, `actorId`. Optional `startsAt`, `preferredDate`, `preferredTime`, `reason`, `canCancel`, `canceledAt`, `canceledBy`, `cancelReason`. |
| `prescriptions[]` | `id`, `rxNumber`, `medication`, `strength`, `status`, `refillsRemaining`, `facilityId`. Optional `lastFilledAt` and `fillHistory[]` with `id, filledAt, quantity`. |
| `refillRequests[]` | `id`, `prescriptionId`, `quantity`, `status`, `actorId`, `createdAt`. |
| `prescriptionShipments[]` | `id`, `prescriptionId`, `status`, `carrier`, `trackingNumber`, `shippedAt`. Optional `refillRequestId`, `estimatedDeliveryDate`, `deliveredAt`. |
| `benefitPayments[]` | `id`, `benefitType`, `paidOn`, `amount`, `currency`, `method`, `status`. Optional `destinationLast4`, a historical snapshot. |
| `depositDestinations[]` | `id`, `institutionName`, `accountType`, `last4`. |
| `directDeposits[]` | `id`, `benefitGroup`, `destinationId`, `status`, `actorId`, `updatedAt`. |
| `directDepositChanges[]` | `id`, `directDepositId`, `benefitGroup`, `previousDestinationId` (nullable), `destinationId`, `status`, `actorId`, `createdAt`. |
| `copayBills[]` | `id`, `facilityId`, `issuedOn`, `dueOn`, `status`, `lineItems[]` with `id, description, serviceDate, amount`, `balance`, `currency`, `updatedAt`. Optional `paidAt`. |
| `copayPayments[]` | `id`, `billId`, `amount`, `currency`, `method`, `status`, `actorId`, `createdAt`. |

[Fixture coverage and enum definitions](assets/data_model.md)

### Default IDs

| Root key | Default IDs |
| --- | --- |
| `profile` | `veteran-001` |
| `facilities` | `facility-001`–`facility-003` |
| `claims` | `claim-101`–`claim-124` |
| `claimEvidence` | `evidence-101`–`evidence-105` |
| `appointments` | `appt-101`–`appt-132` |
| `prescriptions` | `rx-101`–`rx-128` |
| `refillRequests` | `refill-101`–`refill-105` |
| `prescriptionShipments` | `shipment-101`–`shipment-104` |
| `benefitPayments` | `benefit-pay-101`–`benefit-pay-136` |
| `depositDestinations` | `deposit-destination-001`–`deposit-destination-003` |
| `directDeposits` | `deposit-benefits`, `deposit-education` |
| `directDepositChanges` | `deposit-change-101` |
| `copayBills` | `copay-101`–`copay-124` |
| `copayPayments` | `copay-pay-101`–`copay-pay-108` |

## Minimal Inject Example

Pass this object as `state` using a fresh SID and browser context. The profile merges over defaults, the empty arrays replace their seed records, and omitted keys use defaults.

```json
{
  "profile": { "firstName": "Taylor", "lastName": "Rivera" },
  "claims": [],
  "claimEvidence": []
}
```

## Observable State Changes

Each confirmed action sends one whole-state `set_current` and uses the current `profile.id` as actor. Each row below describes the fields changed by the action.

| Confirmed action | Writes in `current_state` |
| --- | --- |
| Submit a disability compensation claim | Append to `claims[]` with `id, type: disability_compensation, reason, conditions, status: received, acknowledged: true, createdAt, updatedAt, actorId` and one `history` entry with `status: received, createdAt, actorId`. |
| Submit evidence | Append to `claimEvidence[]` with `id, claimId, fileName, mimeType, sizeBytes, documentType, status: submitted, actorId, createdAt`. Update the linked `claims[].updatedAt` to the same timestamp. |
| Request an appointment | Append to `appointments[]` with `id, facilityId, clinic, visitType, preferredDate, preferredTime, reason, status: requested, actorId, createdAt, updatedAt`. |
| Cancel an appointment or request | Update the same `appointments[]` record with `status: canceled, canceledAt, canceledBy, cancelReason, updatedAt`. An omitted reason is stored as an empty string. |
| Request a prescription refill | Append to `refillRequests[]` with `id, prescriptionId, quantity: 1, status: requested, actorId, createdAt`. The pending row drives the prescription display status. |
| Save a direct deposit destination | Upsert `directDeposits[]` by `benefitGroup` with stable `id`, `destinationId, status: active, actorId, updatedAt`. Append to `directDepositChanges[]` with `id, directDepositId, benefitGroup, previousDestinationId, destinationId, status: saved, actorId, createdAt`. |
| Pay an open copay bill | Append to `copayPayments[]` with `id, billId, amount` equal to the prior balance, `currency, method, status: paid, actorId, createdAt`. Update the linked `copayBills[]` record with `status: paid, balance: 0, paidAt, updatedAt`. |

Browsing, filters, reviews, dismissals, downloads and idle time produce zero user mutation posts.
