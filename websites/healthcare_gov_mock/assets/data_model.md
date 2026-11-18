# HealthCare.gov state design

The top-level state has six keys. This is the planning model. The implemented `SCHEMA.md` records the final shapes and exact observable writes.

```ts
type State = {
  account: Account
  applications: Application[]
  eligibilityResults: EligibilityResult[]
  plans: Plan[]
  planSelections: PlanSelection[]
  incomeUpdates: IncomeUpdate[]
}

type Account = {
  id: string
  fullName: string
  email: string
}

type Contact = { fullName: string; email: string; phone: string }
type HouseholdMember = {
  id: string
  fullName: string
  relationship: 'self' | 'spouse' | 'child' | 'other'
  birthDate: string
  requestsCoverage: boolean
}
type Income = { monthlyAmount: number; annualEstimate: number }
type Application = {
  id: string
  accountId: string
  coverageYear: number
  stateCode: string
  zipCode: string
  status: 'draft' | 'submitted'
  contact?: Contact
  householdMembers: HouseholdMember[]
  income?: Income
  lastCompletedStep: 'coverage' | 'contact' | 'household' | 'income' | 'review'
  latestEligibilityResultId?: string
  selectedPlanSelectionId?: string
  createdAt: string
  createdBy: string
  updatedAt: string
  updatedBy: string
  submittedAt?: string
  lastResubmittedAt?: string
}

type EligibilityResult = {
  id: string
  applicationId: string
  trigger: 'initial_application' | 'income_update'
  incomeUpdateId?: string
  status: 'eligible' | 'ineligible'
  coverageYear: number
  eligibleMemberIds: string[]
  annualIncomeEstimate: number
  monthlyTaxCredit: number
  createdAt: string
  createdBy: string
}

type Plan = {
  id: string
  name: string
  insurer: string
  coverageYear: number
  stateCode: string
  metal: 'Bronze' | 'Silver' | 'Gold' | 'Platinum'
  network: 'HMO' | 'EPO' | 'PPO' | 'POS'
  monthlyPremium: number
  deductible: number
  outOfPocketMax: number
  primaryCareCopay: number
}

type PlanSelection = {
  id: string
  applicationId: string
  planId: string
  eligibilityResultId: string
  coveredMemberIds: string[]
  status: 'pending_first_premium' | 'confirmed' | 'replaced'
  effectiveDate: string
  grossMonthlyPremium: number
  appliedMonthlyTaxCredit: number
  netMonthlyPremium: number
  createdAt: string
  createdBy: string
  replacedAt?: string
  replacedBySelectionId?: string
}

type IncomeUpdate = {
  id: string
  applicationId: string
  previousEligibilityResultId?: string
  eligibilityResultId: string
  status: 'submitted'
  previousIncome: Income
  newIncome: Income
  effectiveDate: string
  source: 'job' | 'self_employment' | 'unemployment' | 'retirement' | 'other'
  createdAt: string
  createdBy: string
}
```

## Values and relationships

| Record | Example values |
|---|---|
| Account | `acct-avery`, Avery Morgan, `avery.morgan@example.test` |
| Application | `app-2027-nc-003`, account `acct-avery`, 2027, `NC`, ZIP `27601`, `submitted`, step `review`, latest result `elig-003b`, current selection `sel-003`, created `2026-11-02T14:00:00.000Z`, submitted `2026-11-02T14:14:00.000Z`, resubmitted and updated `2026-11-12T17:31:00.000Z`, actor `acct-avery` |
| Contact and household | Avery Morgan, `avery.morgan@example.test`, `919-555-0148`; member `mem-003-01`, relationship `self`, born `1989-04-12`, requests coverage; member `mem-003-02`, Quinn Morgan, relationship `spouse`, born `1991-10-09`, requests coverage |
| Income | Prior `{ monthlyAmount: 4000, annualEstimate: 48000 }`, revised `{ monthlyAmount: 4350, annualEstimate: 52200 }` |
| Eligibility result | First `elig-003a` with `initial_application`, eligible members `mem-003-01` and `mem-003-02`, annual estimate 48000, monthly credit 220; new `elig-003b` with `income_update`, same eligible members, 52200, monthly credit 150 and `incomeUpdateId: inc-003`, both link to `app-2027-nc-003`, coverage year 2027, status `eligible` and ISO timestamps with actor `acct-avery` |
| Plan | `plan-2027-nc-014`, Cedarfield Silver Choice, Cedarfield Health, 2027, `NC`, Silver PPO, premium 482.50, deductible 2800, out-of-pocket max 8600, primary care copay 35 |
| Plan selection | `sel-003`, application `app-2027-nc-003`, plan `plan-2027-nc-014`, result `elig-003a`, both member IDs, `pending_first_premium`, `2027-01-01`, gross 482.50, credit 220, net 262.50, created `2026-11-03T15:15:00.000Z` by `acct-avery`. If replaced, set `replacedAt: "2026-11-13T16:20:00.000Z"` and `replacedBySelectionId: "sel-003b"` and preserve these captured prices. |
| Income update | `inc-003`, application `app-2027-nc-003`, results `elig-003a` and `elig-003b`, prior/revised above, effective `2026-11-10`, source `job`, `submitted`, created `2026-11-12T17:31:00.000Z` by `acct-avery` |

- The account owns applications. The person requesting coverage is a member of the application household, with an ID unique in that application. One application has a history of results, selections and income updates. A selected plan references both the underlying catalog record and the result used to compute its price.
- Application and selection statuses are independent. `submitted` means the application was filed. A selection with a net premium above zero uses `pending_first_premium`. A zero-net-premium selection uses `confirmed`. A `replaced` selection remains part of the record history.
- Dates entered by users and coverage effective dates use `YYYY-MM-DD`. Action timestamps use `new Date().toISOString()`. Round money to cents, store it as JSON numbers and display two decimals where appropriate. A zero amount is distinct from a missing amount.
- Use sample eligibility outcomes and credits for the exercise. For a new submission or income update, give eligible status to household members requesting coverage and calculate the sample monthly credit from the annual estimate. Use $220 up to $48,000, $150 above $48,000 through $65,000 and $0 above $65,000. Include historical and injected ineligible results. Label prices and credits as sample values in relevant views. Use a supplied result for injected applications when available. Derive the list from the application's coverage year/state and the latest result. Round the net premium after capping applied credit at gross premium.
- Default the selection's sample effective date to January 1 of the application coverage year for an upcoming cycle. For the current cycle, suggest the first day of the following month if it falls within the selected year. An archived application can display its past effective date and receipt. Use the runtime clock for current-cycle comparisons.
- A canceled income review or plan review leaves state unchanged. When confirming, validate against the current application, the latest eligibility result and existing selections. If eligibility changed during plan review, refresh the review context before confirmation. When reporting income, prevent stale forms from overwriting an already-recorded update and keep the previous result and prices tied to the original selection.
- Treat missing optional values as unknown. Skip unusable references with an explanation in context, and keep valid injected records usable. Empty catalog, no eligible members, no saved selection and empty histories render as distinct states.

## `createInitialData()`

Return a fresh object of the six keys above on every call. Use English names, fixed IDs, fixed timestamps and fictional carriers. Derive a starter coverage year/state suggestion from the seeded active cycle when available. Let a user start with a supplied or manually selected year/state when an injected catalog is empty.

| Key | Target seed and fixtures |
|---|---|
| `account` | One fictional Avery Morgan account with `@example.test` contact data. |
| `applications` | 30 applications, with 24 submitted and 6 drafts. Include active-cycle 2027 scenarios and archived Arizona, North Carolina and Texas cases. Provide at least one partially completed draft, one submitted application awaiting plan choice and one submitted application with a current selection and income available to report. Revisions and drafts across years keep each year's account history plausible. |
| `eligibilityResults` | 48 linked results, one first submission per submitted application and one resubmission per income update. Include eligible, ineligible, zero-credit and positive-credit examples. Every submitted application points to its newest result. |
| `plans` | At least 48 plans, 12 or more in each supported active shopping market. Include 2027 North Carolina, Arizona and Texas plans, multiple carriers and price points, and meaningful metal/network choices. Include prior-year plans referenced by seeded selections. Offer plan selection wherever the application's result and matching catalog support it. |
| `planSelections` | 24 current or historical selections with varied prices and statuses. At least one submitted application has a selection that will remain linked when income is updated. Ensure any current pointer refers to a selection for that application. |
| `incomeUpdates` | 24 prior changes across multiple submitted applications, including an increase, a decrease and changes that yield the same or different credits. Link the old and new eligibility results, and keep each application's latest income consistent with the most recent revision. |

Use sequential or descriptive fixed IDs for seed records. New records use runtime-generated unique IDs only on the action that saves them.
