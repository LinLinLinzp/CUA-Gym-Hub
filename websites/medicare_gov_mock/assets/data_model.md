# Medicare.gov Account Data Model

Use plain JSON throughout. IDs are opaque strings. Amounts are finite numbers in USD. Calendar dates use `YYYY-MM-DD` and activity timestamps use ISO 8601 UTC. Display missing amounts as unavailable or inapplicable and retain the distinction between zero and an absent value. Fields marked `?` may be absent. Use array and optional-field fallbacks in views, including missing references.

## `account` · Member and coverage context

| Field | Type | Synthetic example |
| --- | --- | --- |
| `id` | string | `member-001` |
| `firstName`, `lastName` | string | `Eleanor`, `Brooks` |
| `medicareNumberMasked?` | string | `•••• 4821` |
| `zipCode`, `city?`, `state?` | string | `53703`, `Madison`, `WI` |
| `email?`, `phone?` | string | `eleanor.brooks@example.test`, `608-555-0142` |
| `coverage` | object | `{ "type": "Original Medicare", "partAStartDate": "2014-04-01", "partBStartDate": "2014-04-01" }` |
| `shoppingPlanYear` | integer | `2027` |
| `enrollmentWindow?` | object | `{ "code": "open_enrollment", "label": "Open Enrollment", "opensOn": "2026-10-15", "closesOn": "2026-12-07", "effectiveDate": "2027-01-01", "status": "open" }` |

The seeded window is a fixed scenario fixture. Evaluate `status` and effective-date coverage against the fixture so workflow replay is independent of the day the container starts. A missing window, unknown status or closed scenario prevents submission with an explanation. Compare calendar dates as dates without timezone shifts. Derive any relative display using `new Date()`.

## `plans[]` · Catalog records

| Field | Type | Synthetic example |
| --- | --- | --- |
| `id`, `name`, `carrier` | string | `plan-2027-53703-ma-01`, `Cedar Valley Choice HMO`, `Cedar Valley Health` |
| `type` | enum | `advantage` or `drug` |
| `network?` | string | `HMO`, `PPO` or omitted for drug-only plans |
| `zipCodes` | string[] | `["53703"]` |
| `planYear` | integer | `2027` |
| `status` | enum | `available`, `archived` |
| `monthlyPremium`, `drugDeductible?`, `medicalOutOfPocketMax?` | number | `24`, `160`, `4900` |
| `rating?` | number | `4.5` on a 0–5 scale |
| `includesDrugCoverage?` | boolean | `true` |
| `benefits?` | string[] | `["Routine dental", "Routine vision"]` |

Seed 18 available records per ZIP (`53703`, `53704`) for 2027, each split into 12 Advantage and six drug plans. Use `plan-2027-<zip>-ma-01` through `-12` and `plan-2027-<zip>-pd-01` through `-06`. Include zero-dollar and paid premiums, varied ratings, HMO and PPO networks, and Advantage plans with and without drug coverage. Drug plans have an omitted medical maximum. Derive year choices from available catalog records and favor the account’s shopping year if present. Add two archived catalog rows per year for 2015–2026 with IDs `plan-<year>-history-01` and `plan-<year>-history-02`.

## `planComparisons[]` · Saved comparisons

| Field | Type | Synthetic example |
| --- | --- | --- |
| `id` | string | `comparison-<uuid>` |
| `planIds` | string[] | `["plan-2027-53703-ma-01", "plan-2027-53703-ma-03"]` |
| `zipCode`, `planYear` | string, integer | `53703`, `2027` |
| `status` | enum | `saved` |
| `actorId`, `createdAt` | string | `member-001`, `2026-11-18T15:30:00.000Z` |

Start empty. Each successful explicit save writes one record with two or three distinct plan IDs in selection order. A saved page uses its stored ID list and reports any missing linked plan.

## `claims[]` · Claim headers and service lines

| Field | Type | Synthetic example |
| --- | --- | --- |
| `id`, `memberId` | string | `claim-001`, `member-001` |
| `claimNumber`, `providerName` | string | `CLM-26001`, `Prairie Grove Family Clinic` |
| `part` | enum | `A`, `B` |
| `status` | enum | `processed`, `pending`, `denied` |
| `serviceDate`, `processedDate?` | date string | `2026-10-27`, `2026-11-03` |
| `billedAmount`, `approvedAmount?`, `medicarePaid?`, `memberResponsibility?` | number | `160`, `110`, `88`, `22` |
| `serviceLines?` | service line[] | Sample below |
| `notes?` | string | `Two services were included in this claim.` |

A service line contains `id: string` (`claim-001-line-01`), `description: string` (`Established patient office visit`), `quantity: integer` (`1`), `billedAmount: number` (`140`), `approvedAmount?: number` (`95`), `medicarePaid?: number` (`76`), and `memberResponsibility?: number` (`19`). A second line with amounts `20`, `15`, `12`, `3` reconciles to the sample totals. Seed `claim-001` through `claim-042` with multiple synthetic providers, visit types, months, processing statuses and zero or nonzero member amounts. Omit unsettled amounts for pending claims.

## `claimReviews[]` · Member review records

| Field | Type | Synthetic example |
| --- | --- | --- |
| `id`, `claimId` | string | `review-<uuid>`, `claim-001` |
| `status` | enum | `reviewed` |
| `note?` | string | `Matched the clinic statement.` |
| `actorId`, `createdAt` | string | `member-001`, `2026-11-18T15:32:00.000Z` |

Start empty. Marking a claim reviewed appends one record for the actor and claim pair. Display that record on repeat visits. Trim the optional note and omit it when blank.

## `enrollments[]` · Plan enrollment requests

| Field | Type | Synthetic example |
| --- | --- | --- |
| `id`, `planId`, `memberId` | string | `enrollment-<uuid>`, `plan-2027-53703-ma-01`, `member-001` |
| `planName`, `planYear`, `zipCode` | string, integer, string | `Cedar Valley Choice HMO`, `2027`, `53703` |
| `enrollmentPeriodCode`, `reason` | string | `open_enrollment`, `change_coverage` |
| `effectiveDate` | date string | `2027-01-01` |
| `contact` | object | `{ "email": "eleanor.brooks@example.test", "phone": "608-555-0142" }` |
| `attestationAccepted` | boolean | `true` |
| `status` | enum | `submitted`, `closed`, `withdrawn` |
| `confirmationNumber`, `actorId`, `createdAt` | string | `ENR-7H2JX9M3`, `member-001`, `2026-11-18T15:34:00.000Z` |

Prefill synthetic member/contact values and require a valid email, an enrollment reason and acknowledgment. The phone is optional. Offer `join_plan` and `change_coverage` reason values. Require the plan to be available, the member ZIP to be in its service area and the shopping year to match the window’s effective year. For the seeded scenario check both Part A and Part B for Advantage, and either for drug plans, by the effective date. Snapshot the plan name so history remains readable if the catalog changes. Future submissions remain `submitted` until an explicit workflow changes them. Seed `enrollment-history-<year>-01` and `-02` for 2015–2026, referencing matching archived plans. Give each year one closed request and one withdrawn request with unique confirmations and coherent dates. These are past requests associated with the member, while `account.coverage` is the authority for what is active now.

## Seed and observable changes

Return `{ account, plans, planComparisons: [], claims, claimReviews: [], enrollments }` from `createInitialData()` with stable ordering, IDs, dates and example amounts. Use `new Date().toISOString()` and generate an ID only when the user successfully commits an action. Keep the business record append atomic with its actor, status and related IDs.

| User action | Top-level key | Write |
| --- | --- | --- |
| Save comparison | `planComparisons` | Append one `saved` comparison with ordered plan IDs, ZIP, year, actor and timestamp. |
| Mark claim as reviewed | `claimReviews` | Append one `reviewed` record with claim ID, actor, timestamp and optional note. |
| Submit enrollment request | `enrollments` | Append one `submitted` request with plan/member links, plan snapshot, area, reason and period, effective date, contact, acknowledgment, confirmation, actor and timestamp. |

Document the implemented top-level keys and exact field names in root `SCHEMA.md` during development. Verifier tests should assert each changed collection and its related IDs plus the expected absence of unrelated state changes.
