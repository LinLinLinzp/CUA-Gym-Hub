# VA.gov state model

`createInitialData()` returns the object shown below. All keys are present by default. Arrays use the shapes in the following sections. Injected arrays replace defaults, including when empty. Missing optional values and unresolved links have readable fallbacks. Mutable lists may contain injected rows with additional fields, which are carried forward unchanged.

```js
{
  profile, facilities, claims, claimEvidence, appointments,
  prescriptions, refillRequests, prescriptionShipments,
  benefitPayments, depositDestinations, directDeposits,
  directDepositChanges, copayBills, copayPayments
}
```

## Field conventions

Record IDs and references are strings. Use fixed IDs for seeds and unique IDs for newly created rows. `actorId` and `canceledBy` refer to `profile.id`. Timestamp fields ending in `At` are UTC ISO strings, for example `2026-11-17T15:30:00.000Z`. Dates without time use `YYYY-MM-DD`. `preferredTime` uses 24-hour `HH:mm` in the facility timezone. USD amounts are numbers rounded to cents. Counts and file sizes are nonnegative integers. Fields marked optional can be omitted or null. Labels and badges map from the stored enums.

## Account and facilities

| Root key | Shape and example |
| --- | --- |
| `profile` | Object with `id` (`veteran-001`), `firstName` (Jordan), and `lastName` (Brooks), all strings. |
| `facilities[]` | `id` (`facility-001`), `name` (Cedar River VA Clinic), `city` (Cedar River), `state` (IA), `timeZone` (America/Chicago), and `clinics` (string array, e.g. Primary care and Audiology). |

## Claims

| Root key | Shape and example |
| --- | --- |
| `claims[]` | `id` (`claim-101`), `type` (`disability_compensation`, `pension`, or `decision_review`), optional `reason` (`new_condition` or `increase`), `conditions` (string array, e.g. Tinnitus), `status` (`received`, `initial_review`, `evidence_gathering`, `evidence_review`, `rating`, `preparing_decision_letter`, `final_review`, `decided`), `createdAt`, `updatedAt`, `actorId`, optional boolean `acknowledged`, optional `history`, `evidenceRequests`, and `decisionLetter`. |
| `claimEvidence[]` | `id` (`evidence-101`), `claimId` (e.g. `claim-101`), `fileName` (audiology-report.pdf), `mimeType` (application/pdf), `sizeBytes` (45621), `documentType` (`medical_record`, `service_record`, `supporting_statement`, or `other`), `status` (`submitted`), `actorId`, `createdAt`. |

Each `history[]` entry contains `status`, `createdAt`, and `actorId`. Each `evidenceRequests[]` entry contains `id` (`evidence-request-101`), `title` (Recent audiology report), `status` (`open` or `fulfilled`), and optional `dueDate` (2026-12-15). `decisionLetter` contains `fileName` (claim-101-decision.txt), `issuedAt`, and synthetic `text` for generating a local download.

## Appointments

| Root key | Shape and example |
| --- | --- |
| `appointments[]` | `id` (`appt-101`), `facilityId`, `clinic` (Audiology), `visitType` (`in_person`, `video`, or `phone`), `status` (`requested`, `scheduled`, `completed`, or `canceled`), `createdAt`, `updatedAt`, `actorId`. Optional `startsAt` (scheduled instant), `preferredDate` (2026-12-09), `preferredTime` (10:30), `reason` (Hearing check), boolean `canCancel`, `canceledAt`, `canceledBy`, and `cancelReason` (Schedule conflict, or empty string). For new requests, persist the preferred date/time and leave `startsAt` empty until there is a fixture with a confirmed time. An elapsed scheduled row displays under Past using the clock without changing its stored status. |

## Prescriptions

| Root key | Shape and example |
| --- | --- |
| `prescriptions[]` | `id` (`rx-101`), `rxNumber` (`RX-710101`), `medication` (Lisinopril), `strength` (10 mg), `status` (`active`, `expired`, or `discontinued`), `refillsRemaining` (2), `facilityId`, optional `lastFilledAt` and `fillHistory`. UI derives Refill requested from a linked pending request, then falls back to Available to refill, No refills left, Expired, or Discontinued as applicable. |
| `refillRequests[]` | `id` (`refill-101`), `prescriptionId` (`rx-101`), `quantity` (1), `status` (`requested` or `fulfilled`), `actorId`, `createdAt`. A request with `status: requested` is pending. |
| `prescriptionShipments[]` | `id` (`shipment-101`), `prescriptionId`, optional `refillRequestId`, `status` (`shipped`, `in_transit`, or `delivered`), `carrier` (USPS), `trackingNumber` (`VA-SAMPLE-80124`), `shippedAt`, optional `estimatedDeliveryDate` and `deliveredAt`. Tracking is shown within the app. |

Each `fillHistory[]` entry contains `id` (`fill-101`), `filledAt`, and `quantity` (30).

## Payments

| Root key | Shape and example |
| --- | --- |
| `benefitPayments[]` | `id` (`benefit-pay-101`), `benefitType` (`disability_compensation`, `pension`, or `education`), `paidOn` (2026-11-02), `amount` (1275.50), `currency` (USD), `method` (`direct_deposit` or `paper_check`), `status` (`paid` or `returned`), optional `destinationLast4` (`2047`) stored as a historical snapshot. |
| `depositDestinations[]` | `id` (`deposit-destination-001`), `institutionName` (Harbor Valley Credit Union), `accountType` (`checking` or `savings`), `last4` (`2047`), all fixture strings. |
| `directDeposits[]` | `id` (`deposit-benefits`), `benefitGroup` (`benefits` for disability/pension or `education`), `destinationId` linking to a fixture, `status` (`active`), `actorId`, `updatedAt`. Upsert one record per group. |
| `directDepositChanges[]` | `id` (`deposit-change-101`), `directDepositId`, `benefitGroup`, `previousDestinationId` (string or null on first setup), `destinationId`, `status` (`saved`), `actorId`, `createdAt`. |
| `copayBills[]` | `id` (`copay-101`), `facilityId`, `issuedOn` (2026-11-03), `dueOn` (2026-12-03), `status` (`open` or `paid`), `lineItems`, `balance` (23.50), `currency` (USD), `updatedAt`, optional `paidAt`. |
| `copayPayments[]` | `id` (`copay-pay-101`), `billId` (`copay-101`), `amount` (23.50), `currency` (USD), `method` (`sample_debit` or `sample_bank`), `status` (`paid`), `actorId`, `createdAt`. |

Each copay `lineItems[]` entry contains `id` (`charge-101`), `description` (Outpatient visit), `serviceDate` (2026-10-20), and `amount` (23.50). Seed open balances equal the sum of the line items. A payment receipt records the balance immediately before payment. Use the bill ID to look up the receipt on a paid bill.

## Seed coverage

| Entity | Fixture coverage |
| --- | --- |
| Account and facilities | Jordan Brooks with three fictional facilities, each offering several clinics. |
| Claims | 24 across active and decided states, with several distinct condition names and dates. Include a pending disability claim with an open evidence request, other claims with existing evidence, and a decided claim with a decision letter. |
| Appointments | 32 across several clinics including Primary care, Audiology, Physical therapy, and Optometry, with all three visit formats, pending requests, completed visits, canceled visits and scheduled visits. Include both cancelable and noncancelable scheduled fixtures. Use fixed dates spanning late 2026 and 2027 in addition to past records. |
| Prescriptions | 28 across active, expired and discontinued statuses. Include multiple active records eligible for refill, at least one with zero refills, one pending request, several fulfilled requests, and several tracking examples. |
| Payments | 36 benefit payments across multiple years and benefit types. Seed both direct deposit groups, at least two distinct destinations, and an example change record. Seed 24 copay bills, with open and paid bills, multiple facilities, single and multiple charges, and receipts for the paid examples. |

Create fixtures deterministically with stable IDs and fixed dates. Keep the fixture footprint compact because every user mutation sends the whole JSON state. UI filters, sort options, searches, pagination, and transient form state live outside the persisted world.
