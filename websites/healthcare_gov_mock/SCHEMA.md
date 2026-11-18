# healthcare_gov_mock Schema

**Base URL** `http://localhost:5514/`  
**Go Endpoint** `GET /go?sid=<sid>` → `{initial_state, current_state, state_diff}`  
**Inject** `POST /post?sid=<sid>` with body `{"action":"set","state":{...}}`  
**Reset** `POST /post?sid=<sid>` with body `{"action":"reset"}`

`GET /state?sid=<sid>` returns `{stored_state, has_custom_state, sid}`. The first write establishes the baseline for a SID. Later writes change the current snapshot, and reset restores the baseline. The client merges supplied state over defaults on a fresh browser load. Injected arrays replace their defaults. Each successful business action sends one whole-state `set_current` request. The diff groups changes by top-level key, with each changed value under `modified` or `added`. Field names and IDs are case-sensitive.

## State Schema

| Key | Shape |
| --- | --- |
| `account` | `{ id, fullName, email }` |
| `applications` | Array of Application |
| `eligibilityResults` | Array of EligibilityResult |
| `plans` | Array of Plan |
| `planSelections` | Array of PlanSelection |
| `incomeUpdates` | Array of IncomeUpdate |

## Records

A `?` suffix denotes an optional field. IDs, names and actor IDs are strings. Monetary amounts are nonnegative JSON numbers, rounded to cents for new records. Timestamps are ISO UTC strings. Birth dates, effective dates and change dates use `YYYY-MM-DD`.

| Type | Fields |
| --- | --- |
| Application | `id`, `accountId`, `coverageYear` (number), `stateCode`, `zipCode`, `status` (`draft`, `submitted`), `contact?` (Contact), `householdMembers` (HouseholdMember array), `income?` (Income), `lastCompletedStep` (`coverage`, `contact`, `household`, `income`, `review`), `latestEligibilityResultId?`, `selectedPlanSelectionId?`, `createdAt`, `createdBy`, `updatedAt`, `updatedBy`, `submittedAt?`, `lastResubmittedAt?` |
| Contact | `fullName`, `email`, `phone` |
| HouseholdMember | `id`, `fullName`, `relationship` (`self`, `spouse`, `child`, `other`), `birthDate`, `requestsCoverage` (boolean) |
| Income | `monthlyAmount`, `annualEstimate`. Prior amounts on an income update can be null if the application had no recorded value. |
| EligibilityResult | `id`, `applicationId`, `trigger` (`initial_application`, `income_update`), `incomeUpdateId?`, `status` (`eligible`, `ineligible`), `coverageYear` (number), `eligibleMemberIds` (string array), `annualIncomeEstimate`, `monthlyTaxCredit`, `createdAt`, `createdBy` |
| Plan | `id`, `name`, `insurer`, `coverageYear` (number), `stateCode`, `metal` (`Bronze`, `Silver`, `Gold`, `Platinum`), `network` (`HMO`, `EPO`, `PPO`, `POS`), `monthlyPremium`, `deductible`, `outOfPocketMax`, `primaryCareCopay` |
| PlanSelection | `id`, `applicationId`, `planId`, `eligibilityResultId`, `coveredMemberIds` (string array), `status` (`pending_first_premium`, `confirmed`, `replaced`), `effectiveDate`, `grossMonthlyPremium`, `appliedMonthlyTaxCredit`, `netMonthlyPremium`, `createdAt`, `createdBy`, `replacedAt?`, `replacedBySelectionId?` |
| IncomeUpdate | `id`, `applicationId`, `previousEligibilityResultId?`, `eligibilityResultId`, `status` (`submitted`), `previousIncome` (Income), `newIncome` (Income), `effectiveDate`, `source` (`job`, `self_employment`, `unemployment`, `retirement`, `other`), `createdAt`, `createdBy` |

### Default IDs

| Key | Count | Fixture IDs |
| --- | ---: | --- |
| `account` | 1 | `acct-avery` |
| `applications` | 30 | `app-2027-nc-001` (draft), `app-2027-nc-002` (ready to shop), `app-2027-nc-003` (has a selection) |
| `eligibilityResults` | 48 | `elig-003a` (initial), `elig-003b` (latest for application 003) |
| `plans` | 72 | `plan-2027-nc-014` (referenced by `sel-003`), `plan-2027-az-001` |
| `planSelections` | 24 | `sel-003` (current for application 003), `sel-004` (replaced by `sel-004b`) |
| `incomeUpdates` | 24 | `inc-003` (links `elig-003a` to `elig-003b`) |

## Minimal Inject Example

Use the following as the `state` value in a `set` request with a fresh SID. The draft resumes at contact information.

```json
{
  "account": { "id": "acct-example", "fullName": "Taylor Example", "email": "taylor@example.test" },
  "applications": [
    {
      "id": "app-example",
      "accountId": "acct-example",
      "coverageYear": 2027,
      "stateCode": "NC",
      "zipCode": "27601",
      "status": "draft",
      "householdMembers": [],
      "lastCompletedStep": "coverage",
      "createdAt": "2026-11-13T14:00:00.000Z",
      "createdBy": "acct-example",
      "updatedAt": "2026-11-13T14:00:00.000Z",
      "updatedBy": "acct-example"
    }
  ],
  "eligibilityResults": [],
  "plans": [],
  "planSelections": [],
  "incomeUpdates": []
}
```

## Observable State Changes

| User action | Fields written |
| --- | --- |
| Save and continue on new application | Append an Application with generated `id`, `accountId`, `coverageYear`, `stateCode`, `zipCode`, `status: draft`, `householdMembers: []`, `lastCompletedStep: coverage`, and creation/update timestamps and actor IDs. |
| Save and continue on a draft section | Update that application's coverage fields, `contact`, `householdMembers`, or `income` according to the current section. New members receive IDs. Update `lastCompletedStep` to the furthest completed step and set `updatedAt`, `updatedBy`. |
| Submit application | Set the application's `status: submitted`, `submittedAt`, `updatedAt`, `updatedBy`, `lastCompletedStep: review` and `latestEligibilityResultId`. Append a linked EligibilityResult with `trigger: initial_application`, the household members requesting coverage, represented income, sample tax credit and creation fields. |
| Confirm plan selection | Append a PlanSelection with `applicationId`, `planId`, `eligibilityResultId` from the current result, `coveredMemberIds`, `effectiveDate`, creation fields, and captured gross, applied-credit and net monthly pricing. Set `status: pending_first_premium` for a positive net monthly premium or `confirmed` for zero. Set the application's `selectedPlanSelectionId`, `updatedAt`, `updatedBy`. If a previous selection exists, update its `status` to `replaced` and set `replacedAt` and `replacedBySelectionId`. Confirming the same plan with the same current eligibility opens the existing receipt with no write. |
| Submit income update | Append an IncomeUpdate with old and new amounts, application and eligibility IDs, status, date, source and creation fields. Append an EligibilityResult with `trigger: income_update` and `incomeUpdateId`. Update only the application's `income`, `latestEligibilityResultId`, `lastResubmittedAt`, `updatedAt`, and `updatedBy`. The plan selections and prior eligibility results retain their captured values. |
| Browse, filter, compare, edit unsaved form inputs, back out, cancel or fail validation | No business write. |

For synthetic eligibility where household members request coverage, the monthly credit is $220 through $48,000 of annual estimated income, $150 above $48,000 through $65,000, and $0 above $65,000. Applied plan credit is capped at the gross premium.
