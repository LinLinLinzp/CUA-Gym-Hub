# my_social_security_mock Schema

- **Base URL** `http://127.0.0.1:5512/`
- **Go endpoint** `GET /go?sid=<sid>` returns `{initial_state, current_state, state_diff}`.
- **Inject** `POST /post?sid=<sid>` with `{"action":"set","state":{...}}`.
- **Reset** `POST /post?sid=<sid>` with `{"action":"reset"}` restores the stored baseline for that session.

The Harbor store key is `my_social_security`. `GET /state?sid=<sid>` returns `{stored_state, has_custom_state, sid}`. The `state_diff` object is keyed by changed top-level fields. Fixture arrays replace defaults and fixture objects merge over defaults through the shared Harbor template. Mutations preserve unrelated keys. Inject before opening the app in a fresh browser context or with a fresh session ID so it loads the fixture.

## State Schema

| Key | JSON value | Purpose |
| --- | --- | --- |
| `profile` | Profile | Signed-in beneficiary |
| `statements` | Statement[] | Archived Social Security and tax benefit statements |
| `earnings` | Earnings[] | Annual covered earnings |
| `directDeposit` | Destination or `{status: "not_enrolled"}` | Current payment destination |
| `directDepositChanges` | DepositChange[] | Setup and change receipts |
| `letters` | Letter[] | Account notices and verification letters |
| `payments` | Payment[] | Historical payments |
| `statementActivity` | StatementActivity[] | Explicit statement access, download and print events |
| `letterActivity` | LetterActivity[] | Explicit read, download and print events |

## Record shapes

Strings identify records and related entities. `beneficiaryId` relates records to `profile.id`. Amounts are USD numbers, years and ages are integers, calendar dates use `YYYY-MM-DD`, and action timestamps use ISO 8601 UTC. Incomplete fixtures can omit optional display fields.

- **Profile** has `id`, `firstName`, `lastName`, `benefitStatus` (`receiving`, `not_receiving`, `pending`), `benefitType` (string or null), `monthlyBenefit` (number or null) and `directDepositEligible` (boolean).
- **Statement** has `id`, `beneficiaryId`, `kind`, `title`, `year` and `issuedOn`. A `social_security_statement` adds `earningsThroughYear` and `estimates[]` with `age` and `monthlyAmount`. A `tax_benefit_statement` adds `form` (`SSA-1099` or `SSA-1042S`), `benefitsPaid`, `benefitsRepaid` and `netBenefits`.
- **Earnings** has `id`, `beneficiaryId`, `year`, `socialSecurityEarnings` and `medicareEarnings`. A statement shows only rows for its beneficiary through `earningsThroughYear`.
- **Destination** has `id`, `beneficiaryId`, `bankName`, `accountType` (`checking` or `savings`), `accountLast4` (four-digit string), `status: "active"` and `updatedAt`. A record with `status: "not_enrolled"` represents no current destination even if a fixture inherited other fields through object merging.
- **DepositChange** has `id`, `beneficiaryId`, `previousDestination` (masked Destination or null), `newDestination` (masked Destination), `changeType` (`setup` or `change`), `status: "confirmed"`, `actorId` and `createdAt`. `newDestination.updatedAt` equals `createdAt`.
- **Letter** has `id`, `beneficiaryId`, `type`, `title`, `status`, `actorId`, `createdAt` and `readAt` (timestamp or null). `benefit_verification` has `status: "ready"`, `subjectName` and `benefitSnapshot` with `benefitStatus`, `benefitType` and `monthlyBenefit`. A `benefit_notice`, `payment_notice` or `account_notice` has `status: "issued"` and `body`. An issued notice is unread when `readAt` is missing or null.
- **Payment** has `id`, `beneficiaryId`, `paidOn`, `benefitType`, `gross`, `deductions`, `net` and `destinationLast4` (four-digit string or null). Payments retain their historical destination.
- **StatementActivity** has `id`, `statementId`, `kind`, `year`, `action`, `status`, `actorId` and `createdAt`. `kind` and `year` are null when missing from the referenced statement.
- **LetterActivity** has `id`, `letterId`, `action`, `status`, `actorId` and `createdAt`.

New user actions assign unique IDs, set `actorId` to `profile.id` where available, and read the runtime clock for their timestamps.

### Default IDs

| Entity | Seed IDs |
| --- | --- |
| Beneficiary | `person-maren` |
| Social Security statements | `stmt-2002` through `stmt-2025` |
| Tax benefit statements | `tax-2020` through `tax-2025` |
| Earnings | `earn-1989` through `earn-2024` |
| Current destination | `destination-northfield` |
| Deposit changes | `ddc-001` through `ddc-024` |
| Letters and notices | `letter-2026-verification` and `notice-2003` through `notice-2026` |
| Payments | `pay-2024-11` through `pay-2026-10` |

## Minimal Inject Example

This fixture replaces the statements archive with one record. The remaining keys use the seed.

```json
{
  "statements": [
    {
      "id": "stmt-audit",
      "beneficiaryId": "person-maren",
      "kind": "social_security_statement",
      "title": "2025 Social Security Statement",
      "year": 2025,
      "issuedOn": "2025-10-14"
    }
  ],
  "statementActivity": []
}
```

## Observable State Changes

| User action | Exact business write |
| --- | --- |
| Open a statement from its archive or Overview | Append one `statementActivity` entry for the opened ID with `action: "viewed"`, `status: "completed"`. |
| Download a statement PDF | Append one `statementActivity` entry with `action: "downloaded"`, `status: "completed"`. |
| Print a statement | Append one `statementActivity` entry with `action: "print_requested"`, `status: "requested"`. |
| Confirm direct deposit | Replace `directDeposit` with the new destination and append one `directDepositChanges` receipt in the same write. Setup uses `previousDestination: null`; change snapshots the previous masked destination. The routing number, full account number and account confirmation are transient. |
| Generate Benefit Verification Letter | Append one `letters` entry with `type: "benefit_verification"`, `status: "ready"`, `subjectName`, `benefitSnapshot` and `readAt` equal to `createdAt`. |
| Open an unread notice from its archive or Overview, or click **Mark as read** | Set that notice's `letters[].readAt` and append a `letterActivity` entry for its ID with `action: "marked_read"`, `status: "completed"` and the same timestamp in the same write. |
| Download a letter PDF | Append one `letterActivity` entry with `action: "downloaded"`, `status: "completed"`. |
| Print a letter | Append one `letterActivity` entry with `action: "print_requested"`, `status: "requested"`. |
| Filter, sort, edit a draft, go back, cancel, open a read notice, use a deep link, reload or wait idle | No business write. |

