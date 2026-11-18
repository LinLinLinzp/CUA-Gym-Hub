# my Social Security — Proposed Harbor Data Model

Use JSON objects, arrays and primitives. IDs are nonempty strings. Use integer years, finite numeric USD amounts, ISO 8601 timestamps for events and YYYY-MM-DD for calendar dates. Nullable fields render as unavailable where required. Preserve unknown injected keys on save.

## Initial state

```js
{
  profile: { /* see Profile */ },
  statements: [ /* 24 statement snapshots and 6 tax forms */ ],
  earnings: [ /* at least 30 annual records */ ],
  directDeposit: { /* current destination or { status: "not_enrolled" } */ },
  directDepositChanges: [ /* 24 historical receipts */ ],
  letters: [ /* at least 24 letters and notices */ ],
  payments: [ /* 24 monthly payments */ ],
  statementActivity: [],
  letterActivity: []
}
```

Default records use fixed IDs with distinct prefixes and dates through 2026. A calendar-year archive can span 2002–2025 with one Social Security Statement per year and six tax statements for 2020–2025. Include several letter types and read/unread notices. Use roughly two decades of dated correspondence. History is seeded independently of the current destination, with the newest confirmed deposit receipt matching the active record. Keep earnings within plausible annual ranges; use zeros for a few interrupted years. Use distinct values in search results and tie-break sort by ID when dates match. Use the application clock only for new actions and relative date display.

## Entities and relationships

### Profile

`profile` is a single object with `id: string`, `firstName: string`, `lastName: string`, `benefitStatus: "receiving" | "not_receiving" | "pending"`, `benefitType: string | null`, `monthlyBenefit: number | null`, and `directDepositEligible: boolean`. Example:

```json
{"id":"person-maren","firstName":"Maren","lastName":"Ellis","benefitStatus":"receiving","benefitType":"Retirement","monthlyBenefit":2184.60,"directDepositEligible":true}
```

### Statement

`statements[]` contains `id`, `beneficiaryId`, `kind: "social_security_statement" | "tax_benefit_statement"`, `title: string`, `year: number`, `issuedOn: string`, and the kind-specific fields below. `beneficiaryId` refers to the profile.

- Social Security Statement adds `earningsThroughYear: number` and `estimates: { age: number, monthlyAmount: number }[]`. Use fixed ages 62 through 70 and locally seeded estimates. The earnings list shows profile earnings up to the snapshot year. Example: `{"id":"stmt-2025","beneficiaryId":"person-maren","kind":"social_security_statement","title":"2025 Social Security Statement","year":2025,"issuedOn":"2025-10-14","earningsThroughYear":2024,"estimates":[{"age":67,"monthlyAmount":2150.20}]}`.
- Tax Benefit Statement adds `form: "SSA-1099" | "SSA-1042S"`, `benefitsPaid: number`, `benefitsRepaid: number`, and `netBenefits: number`. Example: `{"id":"tax-2025","beneficiaryId":"person-maren","kind":"tax_benefit_statement","title":"2025 Social Security Benefit Statement","year":2025,"issuedOn":"2026-01-31","form":"SSA-1099","benefitsPaid":25284.00,"benefitsRepaid":120.00,"netBenefits":25164.00}`.

### Earnings

`earnings[]` has `id`, `beneficiaryId`, `year: number`, `socialSecurityEarnings: number` and `medicareEarnings: number`. Example: `{"id":"earn-2024","beneficiaryId":"person-maren","year":2024,"socialSecurityEarnings":36750.00,"medicareEarnings":36750.00}`.

### Statement activity

`statementActivity[]` has `id`, `statementId`, `kind`, `year: number | null`, `action: "viewed" | "downloaded" | "print_requested"`, `status: "completed" | "requested"`, `actorId`, and `createdAt`. `statementId` points to `statements[]`. Use `requested` for print and `completed` for open or generated download. Example: `{"id":"sa-example","statementId":"tax-2025","kind":"tax_benefit_statement","year":2025,"action":"downloaded","status":"completed","actorId":"person-maren","createdAt":"2026-11-18T16:00:00.000Z"}`.

### Deposit destination and change

`directDeposit` uses `{ status: "not_enrolled" }` for setup scenarios, or contains `id`, `beneficiaryId`, `bankName: string`, `accountType: "checking" | "savings"`, `accountLast4: string`, `status: "active"`, and `updatedAt: string`. Example: `{"id":"destination-northfield","beneficiaryId":"person-maren","bankName":"Northfield Community Bank","accountType":"checking","accountLast4":"4821","status":"active","updatedAt":"2026-07-14T15:00:00.000Z"}`.

`directDepositChanges[]` has `id`, `beneficiaryId`, `previousDestination: destination | null`, `newDestination: destination`, `changeType: "setup" | "change"`, `status: "confirmed"`, `actorId`, and `createdAt`. Embed the masked destination snapshots so a receipt remains readable after later updates. Example: `{"id":"ddc-001","beneficiaryId":"person-maren","previousDestination":null,"newDestination":{"id":"destination-example","beneficiaryId":"person-maren","bankName":"Orchard Point Bank","accountType":"savings","accountLast4":"0074","status":"active","updatedAt":"2016-08-15T14:00:00.000Z"},"changeType":"setup","status":"confirmed","actorId":"person-maren","createdAt":"2016-08-15T14:00:00.000Z"}`.

To inject an unenrolled profile, set `directDeposit.status` to `not_enrolled`. Ignore any inherited destination fields in that branch because the template merges objects and skips null overrides. Record `previousDestination: null` for setup.

On confirm, use a new destination ID and reference it in the new receipt. Set the destination’s `updatedAt` to the receipt timestamp. Copy only the masked data the model exposes. Keep routing and full account inputs in transient form state. Retain leading zeros in the last four digits.

### Letter and notice

`letters[]` has `id`, `beneficiaryId`, `type: "benefit_verification" | "benefit_notice" | "payment_notice" | "account_notice"`, `title: string`, `status: "ready" | "issued"`, `actorId: string`, `createdAt` and `readAt: string | null`. A verification letter adds `subjectName: string` and `benefitSnapshot: { benefitStatus, benefitType, monthlyBenefit }` from the profile at generation. Notices carry `body: string`. Example verification letter:

```json
{"id":"letter-verification-example","beneficiaryId":"person-maren","type":"benefit_verification","title":"Benefit Verification Letter","status":"ready","actorId":"person-maren","createdAt":"2026-11-18T16:07:00.000Z","readAt":"2026-11-18T16:07:00.000Z","subjectName":"Maren Ellis","benefitSnapshot":{"benefitStatus":"receiving","benefitType":"Retirement","monthlyBenefit":2184.60}}
```

A notice example uses `id: "notice-2025-benefit-update"`, `type: "benefit_notice"`, `title: "Your 2026 benefit amount"`, `status: "issued"`, `actorId: "issuer-ssa"`, `createdAt: "2025-12-04T14:00:00.000Z"`, `readAt: null` and `body: "Your retirement benefit amount for 2026 is available."`. Newly generated verification letters are read on creation. Unread notice counts consider issued notices with a missing or null read timestamp.

### Letter activity

`letterActivity[]` has `id`, `letterId`, `action: "marked_read" | "downloaded" | "print_requested"`, `status: "completed" | "requested"`, `actorId`, and `createdAt`. Example: `{"id":"la-example","letterId":"notice-2025-benefit-update","action":"marked_read","status":"completed","actorId":"person-maren","createdAt":"2026-11-18T16:09:00.000Z"}`. Use `requested` for print and `completed` for successful download creation or notice marking.

### Payment

`payments[]` has `id`, `beneficiaryId`, `paidOn: string`, `benefitType: string`, `gross: number`, `deductions: number`, `net: number` and `destinationLast4: string | null`. Example: `{"id":"pay-2026-10","beneficiaryId":"person-maren","paidOn":"2026-10-21","benefitType":"Retirement","gross":2184.60,"deductions":202.90,"net":1981.70,"destinationLast4":"4821"}`. Historical payments retain their original destination after an account change.

## Observable State Changes

| User action | Exact write |
| --- | --- |
| Open a statement through an app link | Append one completed `statementActivity` record, action `viewed`. |
| Download a statement PDF | Append one completed `statementActivity` record, action `downloaded`. |
| Print a statement | Append one requested `statementActivity` record, action `print_requested`. |
| Confirm direct deposit setup/change | Replace `directDeposit`; append one confirmed `directDepositChanges` record linked to old and new snapshots. |
| Generate Benefit Verification Letter | Append one ready `letters` record, with `readAt` equal to `createdAt` and a snapshot of profile benefit fields. |
| Open an unread notice through an app link or explicitly mark it read | Set the notice’s `letters[].readAt`; append one completed `letterActivity` record with action `marked_read` and the same timestamp. |
| Download a letter PDF | Append one completed `letterActivity` record, action `downloaded`. |
| Print a letter | Append one requested `letterActivity` record, action `print_requested`. |
| Filter, sort, edit drafts, cancel, revisit a read notice, or directly load/reload a route | No business state writes. |

Use `new Date().toISOString()` when committing an event. Generate unique IDs for new records and link to existing IDs. Derive document counts and latest dates from existing data. Persist each table row’s action as a single store update. Reflect the implemented keys and actions in root `SCHEMA.md`. The injected collection replaces the corresponding defaults, including when empty. The store should support browsing and graceful missing-record states without mutating the injected fixtures.
