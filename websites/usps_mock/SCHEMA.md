# usps_mock Schema

- **Base URL** — `http://localhost:5532/`
- **Go endpoint** — `GET /go?sid=<sid>` returns `{initial_state, current_state, state_diff}`. Changed top-level keys contain either `modified` or `added` with the full current value.
- **Read current state** — `GET /state?sid=<sid>` returns `{stored_state, has_custom_state, sid}`.
- **Inject** — `POST /post?sid=<sid>` with `{"action":"set","state":{...}}`. Use a fresh SID and browser context. The first write records the session baseline.
- **Save** — `POST /post?sid=<sid>` with `{"action":"set_current","state":{...}}`. A save preserves an existing session baseline.
- **Reset** — `POST /post?sid=<sid>` with `{"action":"reset"}` restores current server state from the session baseline or from the seed if there is no baseline. Open a fresh browser context after a server-side reset to load the restored state.

## State Schema

| Key | Type | Example or purpose |
|---|---|---|
| `account` | Account | Pre-signed-in account used as the actor and source of optional prefills |
| `changeOfAddressRequests` | ChangeOfAddress[] | 24 synthetic forwarding requests |
| `holdMailRequests` | HoldMail[] | 24 synthetic hold requests |
| `packageClaims` | PackageClaim[] | 24 synthetic claim drafts and filed records |
| `postOffices` | PostOffice[] | 24 searchable synthetic offices with size-level inventory |
| `poBoxes` | POBox[] | 24 reservations and rentals related to offices |
| `poBoxTransactions` | POBoxTransaction[] | At least 24 itemized reservation and renewal records |

`createInitialData()` returns a fresh plain JSON object with those keys. Use fixed IDs (for example `coa-001`, `hold-001`, `claim-001`, `office-001`, `box-001`, `pobox-txn-001`) and fixed, internally coherent date literals. Use decimal USD numbers in JSON. Compute amount totals in integer cents before converting to dollars. Store ZIP codes and box numbers as strings. Store time stamps as ISO strings and service dates as calendar strings in `YYYY-MM-DD`.

### Default IDs

The account is `account-001`. The six collections use `coa-001` through `coa-024`, `hold-001` through `hold-024`, `claim-001` through `claim-024`, `office-001` through `office-024`, `box-001` through `box-024`, and `pobox-txn-001` through `pobox-txn-024`. `coa-001` and `hold-001` are scheduled, `claim-001` is a draft, and `box-001` is an active rental linked to `office-001`.

## Minimal Inject Example

Post this body to a fresh SID for an empty account with a custom name.

```json
{
  "action": "set",
  "state": {
    "account": { "fullName": "Taylor Lane" },
    "changeOfAddressRequests": [],
    "holdMailRequests": [],
    "packageClaims": [],
    "postOffices": [],
    "poBoxes": [],
    "poBoxTransactions": []
  }
}
```

## Common fields and objects

- **Address** has `line1` string (`214 Alder Loop`), optional `line2` string (`Unit 4B`), `city` string (`Portland`), `state` two-letter string (`OR`), `zip` string (`97205` or `97205-1234`). For comparison trim fields, collapse whitespace, and compare case-insensitively. Count calendar days without local daylight-saving offsets.
- **Account** has `id` string (`account-001`), `fullName` string (`Jordan Rivera`), `email` string (`jordan.rivera@example.com`), and optional `mailingAddress` (Address).
- **Creation metadata** is `id` string, `createdAt` ISO timestamp (for example `2026-11-18T15:42:00.000Z`), and `createdBy` string (account ID). Generate unique IDs on user submission and use `new Date().toISOString()` for action timestamps.
- **Confirmation code** is `confirmationCode` string, unique within its collection. Example formats are `0000000000000042` for moves and `HM-10482`, `CL-10842`, or `PB-10124` for other records. A claim draft does not need a code.
- **Update metadata** is `updatedAt` ISO timestamp and `updatedBy` account ID, optional until an update. **Cancellation metadata** is `cancelledAt` ISO timestamp and `cancelledBy` account ID, present after cancellation. Reuse one timestamp for linked writes in an action.

## ChangeOfAddress

Creation metadata, confirmation code, optional update and cancellation metadata, and the following fields.

| Field | Type | Example |
|---|---|---|
| `status` | scheduled, completed or cancelled | scheduled |
| `moveType` | individual, family or business | family |
| `forwardingType` | permanent or temporary | temporary |
| `moverName` | string | Jordan Rivera |
| `contactEmail` | string | jordan.rivera@example.com |
| `oldAddress`, `newAddress` | Address | 214 Alder Loop and 85 Juniper Row |
| `startDate`, `endDate` | calendar string, end null for permanent | 2026-12-03, 2027-01-02 |

For temporary forwarding, `endDate - startDate` is the length in days and the end date is when delivery resumes at the original address. Only new moves and edits require valid form input. History should remain readable when older or injected records omit a field.

## HoldMail

Creation metadata, confirmation code, optional update and cancellation metadata, and the following fields.

| Field | Type | Example |
|---|---|---|
| `status` | scheduled, completed or cancelled | scheduled |
| `address` | Address | 214 Alder Loop, Unit 4B |
| `startDate`, `endDate` | inclusive calendar strings | 2026-12-05, 2026-12-09 |
| `durationDays` | integer | 5 |
| `deliveryMethod` | carrier_delivery or post_office_pickup | post_office_pickup |

Duration uses both endpoints. When comparing with another scheduled hold at the same address, allow the new hold only if the two periods have at least three full intervening days. Apply the check in both date orders.

## PackageClaim

Creation metadata, optional update metadata and confirmation code. Drafts may omit fields or use empty strings for unfinished fields. Incomplete item rows retain their form values until submission. Final submissions have all required values. An approved or denied fixture may have `resolvedAt` as an ISO timestamp and `approvedAmount` as a USD number.

| Field | Type | Example |
|---|---|---|
| `status` | draft, submitted, under_review, approved or denied | submitted |
| `trackingNumber` | normalized alphanumeric string | 9400123456789012345678 |
| `mailingDate` | calendar string | 2026-10-28 |
| `mailService` | priority_mail_express, priority_mail, ground_advantage or insured_mail | priority_mail |
| `claimantRole` | sender or recipient | recipient |
| `senderAddress`, `recipientAddress` | Address | 85 Juniper Row and 214 Alder Loop |
| `reason` | lost, damaged or missing_contents | damaged |
| `items` | ClaimItem[] | Two ceramic mugs at $18.50 each |
| `evidence` | Evidence[] | value receipt, insurance receipt and damage photo |
| `claimAmount`, `currency` | number and string | 37, USD |
| `submittedAt` | ISO timestamp, omitted until submission | 2026-11-18T15:42:00.000Z |

- **ClaimItem** has stable `id` string (`item-001`), `description` string (`Ceramic mug`), `quantity` integer (2), `unitValue` USD number (18.50). Final amounts sum quantity times unit value across rows.
- **Evidence** has stable `id` string (`evidence-001`), `kind` enum (`proof_of_value`, `proof_of_insurance`, `proof_of_damage`), `fileName` string (`mug-receipt.pdf`), `mimeType` string (`application/pdf`), and `sizeBytes` integer (14280). Persist metadata only. Resumed drafts display saved metadata and allow replacement with a new local selection.

## PostOffice

`id` string (`office-001`), `name` string (`Cedar Station Post Office`), `address` (Address), `inventory` object keyed by `xs`, `s`, `m`, `l`, `xl`. Use user-facing size labels Extra Small, Small, Medium, Large, and Extra Large. Each size carries `available` nonnegative integer (3) and `prices` object with string keys `3`, `6`, `12` and USD numeric values (for example 34, 60, 111). An absent size or price is unavailable for the applicable action. Include catalog entries with mixed availability so search branches are meaningful.

## POBox

Creation metadata, confirmation code, optional update metadata, and the following fields.

| Field | Type | Example |
|---|---|---|
| `status` | reserved, active, expired or closed | reserved |
| `officeId` | PostOffice ID string | office-001 |
| `size` | xs, s, m, l or xl | s |
| `boxNumber` | optional string for a numbered rental | 0421 |
| `termMonths` | integer 3, 6 or 12 | 6 |
| `autoRenew` | boolean | false |
| `applicantName`, `applicantEmail` | strings | Jordan Rivera, jordan.rivera@example.com |
| `mailingAddress` | Address | 214 Alder Loop, Unit 4B |
| `termsAccepted` | boolean | true |
| `expiresOn` | calendar string, optional until activated | 2027-05-18 |

Reservation increments the account's rental record count and consumes exactly one available box. Leave physical activation to the office. Active seed rentals have a number and expiration. An injected rental missing its office can still render its record without a renewal quote.

## POBoxTransaction

Creation metadata plus `poBoxId` string (`box-001`), `officeId` string (`office-001`), `type` enum (`reservation` or `renewal`), `status` enum (`paid` for successful synthetic payments), `amount` USD number (60), `currency` string (`USD`), `quantity` integer (1), `termMonths` integer (6), and `paymentMethod` enum (`account_payment`). Renewal also has `previousExpiresOn` (calendar string or null) and `nextExpiresOn` (calendar string).

## Observable State Changes (for LLM evaluation)

| User action | State field changed |
|---|---|
| Submit move | Append to `changeOfAddressRequests` with `id`, `createdAt`, `createdBy`, `confirmationCode`, `status: scheduled`, `moveType`, `forwardingType`, `moverName`, `contactEmail`, `oldAddress`, `newAddress`, `startDate`, and `endDate`. |
| Edit move | Update `changeOfAddressRequests[].newAddress`, `startDate`, `endDate`, `updatedAt`, and `updatedBy` on the selected record. |
| Cancel move | Update `changeOfAddressRequests[].status` to `cancelled` and set `cancelledAt`, `cancelledBy`, `updatedAt`, and `updatedBy`. |
| Schedule hold | Append to `holdMailRequests` with `id`, `createdAt`, `createdBy`, `confirmationCode`, `status: scheduled`, `address`, `startDate`, `endDate`, `durationDays`, and `deliveryMethod`. |
| Edit hold | Update `holdMailRequests[].startDate`, `endDate`, `durationDays`, `deliveryMethod`, `updatedAt`, and `updatedBy` on the selected record. |
| Cancel hold | Update `holdMailRequests[].status` to `cancelled` and set `cancelledAt`, `cancelledBy`, `updatedAt`, and `updatedBy`. |
| Save claim draft | Write `packageClaims[].status: draft`, `trackingNumber`, `mailingDate`, `mailService`, `claimantRole`, `reason`, `senderAddress`, `recipientAddress`, `items`, `evidence`, `claimAmount`, and `currency`. A new draft gets `id`, `createdAt`, and `createdBy`. An existing draft gets `updatedAt` and `updatedBy`. |
| File claim | Write the same claim data fields with `status: submitted`, `confirmationCode`, and `submittedAt`. A new filing gets `id`, `createdAt`, and `createdBy`. Filing a draft keeps those fields and sets `updatedAt` and `updatedBy`. |
| Reserve PO Box | Append to `poBoxes` with `id`, `createdAt`, `createdBy`, `confirmationCode`, `status: reserved`, `officeId`, `size`, `termMonths`, `autoRenew`, `applicantName`, `applicantEmail`, `mailingAddress`, and `termsAccepted`. Decrement `postOffices[].inventory[size].available` by one for the linked office and append a linked `poBoxTransactions` entry with `type: reservation` using the fields above. |
| Renew PO Box | Set `poBoxes[].expiresOn`, `termMonths`, `autoRenew`, `updatedAt`, and `updatedBy`. Append a linked `poBoxTransactions` entry with `type: renewal`, including `previousExpiresOn` and `nextExpiresOn`. |

For injected worlds use the unchanged Harbor merge behavior. Render empty collections and safely format absent optional values. Keep unrelated keys and unknown fields on edited records. Treat selected form values, search terms, sorting, review steps, and expired badges as view data. Persist only explicit saves and confirmations.
