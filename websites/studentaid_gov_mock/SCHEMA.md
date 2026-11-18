# studentaid_gov_mock Schema

**Base URL** `http://localhost:5518/`  
**Go Endpoint** `GET /go?sid=<sid>` returns `{initial_state, current_state, state_diff}`.  
**Inject** `POST /post?sid=<sid>` with `{"action":"set","state":{...}}`.  
**Reset** `POST /post?sid=<sid>` with `{"action":"reset"}` restores the stored baseline.

The app key is `studentaid_gov_mock`. Inspect a session with `GET /go?sid=<sid>`.
Harbor reports `initial_state`, `current_state` and a top-level `state_diff`. For
modified collections, inspect the records in `state_diff.<key>.modified`.
Unrelated injected fields pass through user changes. The app derives activity,
totals and comparisons from records and does not save UI filters or navigation.

## State Schema

Each record has a string `id`. Foreign keys refer to IDs in the corresponding
collection. `?` marks a conditional or optional field. Missing references may
occur in injected worlds. Dollar amounts and rates are numbers. Rates use
percentage points. Action timestamps are ISO date-time strings. Date-only fields
use YYYY-MM-DD. Actor IDs link to `profile.id` and are nullable if unavailable.

| Key | Stored fields in addition to id |
| --- | --- |
| `profile` (object) | `firstName?`, `lastName?`, `email?`, `state?`. |
| `schools[]` | `name`, `city?`, `state?`, `federalSchoolCode?` (string). |
| `fafsaForms[]` | `groupId`, `awardYear`, `revision`, `previousFormId?`, `status`, `actorId`, `answers`, `schoolIds[]`, `contributors[]`, `lastSavedStep`, `createdAt`, `updatedAt`, `submittedAt?`, `processedAt?`, `summary?`. Award years use YYYY-YY. Steps are `student`, `financial`, `schools`, `review`. Statuses are `draft`, `in_progress`, `action_required`, `in_review`, `processed`, `closed`. |
| `servicers[]` | `name`, `phone?`, `mailingAddress?`. Contact values are sample display data. |
| `loans[]` | `schoolId?`, `servicerId?`, `type`, `status`, `disbursedOn?`, `originalAmount?`, `principalBalance?`, `accruedInterest?`, `interestRate?`, `planId?`, `nextPaymentDueOn?`, `nextPaymentAmount?`, `recertificationDueOn?`. Loan types include `direct_subsidized`, `direct_unsubsidized`, `direct_grad_plus`, `direct_consolidation`. Statuses include `in_school`, `in_grace`, `in_repayment`, `deferment`, `forbearance`, `paid_in_full`. |
| `loanAcknowledgments[]` | `awardYear`, `status: completed`, `loanIds[]`, `loanCount`, `principalBalance`, `accruedInterest`, `totalBalance`, `actorId`, `signedAt`, `createdAt`. Balance fields are a signed snapshot. |
| `repaymentPlans[]` | `name`, `category` (`fixed` or `income_driven`), `description?`, `termMonths`, `eligibleLoanTypes[]?`, `eligibleDisbursedBefore?`, `estimator` (`amortized` or `income_share`), `incomeShare?` (decimal fraction), `incomeAllowance?`, `familySizeAllowance?`. |
| `repaymentScenarios[]` | `name`, `status: saved`, `loanIds[]`, `loanCount`, `inputs` (`annualIncome`, `familySize`), `estimates[]`, `actorId`, `createdAt`. |
| `repaymentRequests[]` | `status`, `planId`, `loanIds[]`, `servicerId`, `scenarioId?`, `requestType?`, `inputs` (`annualIncome?`, `familySize?`, `incomeConsent?`), `lastSavedStep`, `actorId`, `createdAt`, `updatedAt`, `signedAt?`, `submittedAt?`. Steps are `plan`, `income`, `review`. Request types are `enter_plan`, `change_plan`, `recertify`, `recalculate`. Statuses are `draft`, `in_review`, `action_required`, `completed`, `canceled`. |

### Nested records

- FAFSA `answers` has `studentName?`, `state?` (two letters),
  `dependencyStatus?` (`dependent` or `independent`), `householdSize?`,
  `annualIncome?`, `taxConsent?` and `signedAt?`. Cleared numeric fields can
  be null on a saved incomplete draft.
- FAFSA `contributors[]` contain `id`, `role` (`parent` or `spouse`),
  `name?`, `status` (`pending` or `signed`), `consent?`, `signedAt?`.
- FAFSA `summary` has `studentAidIndex?`, `pellGrantEstimate?`,
  `directLoanEstimate?` and `nextSteps[]?`.
- Comparison `estimates[]` contain `planId`, `planName`, `eligible` and
  either `monthlyPayment`, `totalPaid`, `termMonths` or `ineligibleReason`.
  Amounts are published to cents, and total paid uses the unrounded payment.

### Default IDs

- Profile `person-avery`. Schools use fixed name-based IDs such as `school-pine-ridge` and `school-larkspur`.
- FAFSA groups run from `fafsa-2018-19` through `fafsa-2025-26`. Editions append a two-digit revision, for example `fafsa-2025-26-03`.
- Loans `loan-001` through `loan-024`. Servicers `servicer-edfinancial`, `servicer-nelnet`, and `servicer-aidvantage`.
- Acknowledgments `ack-2023-24`, `ack-2024-25`, and `ack-2025-26`.
- Plans `standard`, `ibr`, `paye`, and `extended`. Comparisons `scenario-001` through `scenario-024`. Requests `request-001` through `request-024`.

## Minimal Inject Example

```json
{
  "profile": {"id": "sample-student", "firstName": "Sam", "lastName": "Rivera"},
  "schools": [],
  "fafsaForms": [],
  "servicers": [],
  "loans": [],
  "loanAcknowledgments": [],
  "repaymentPlans": [],
  "repaymentScenarios": [],
  "repaymentRequests": []
}
```

## Observable State Changes (for LLM evaluation)

| Action | Exact stored effect |
| --- | --- |
| Start form | Appends to `fafsaForms[]`: `id`, `groupId`, `awardYear`, `revision: 1`, `status: draft`, `actorId`, empty `answers`, `schoolIds`, `contributors`, `lastSavedStep: student`, `createdAt`, `updatedAt`. An existing year opens its current edition. |
| Save and continue or Save and exit (FAFSA) | Updates the same draft’s `answers`, `schoolIds`, `contributors`, `lastSavedStep`, `updatedAt`. A dependent draft includes a parent contributor. Editing a contributor’s name or consent clears their prior signature. Blank numeric answers stay null. |
| Submit FAFSA | Updates the same draft with the saved FAFSA fields, `answers.signedAt`, `lastSavedStep: review`, `status: in_review`, `submittedAt` and `updatedAt`. |
| Make a correction | Appends to `fafsaForms[]`: new `id`, original `groupId` and `awardYear`, incremented `revision`, `previousFormId`, `status: draft`, `actorId`, copied `answers`, `schoolIds`, `contributors`, `lastSavedStep: student`, `createdAt`, `updatedAt`. Clears student and contributor signature timestamps and resets contributors to pending. |
| Sign acknowledgment | Appends to `loanAcknowledgments[]`: `id`, `awardYear`, `status: completed`, `loanIds`, `loanCount`, `principalBalance`, `accruedInterest`, `totalBalance`, `actorId`, `signedAt`, `createdAt`. An already completed year opens its receipt. |
| Save comparison | Appends to `repaymentScenarios[]`: `id`, `name`, `status: saved`, `loanIds`, `loanCount`, numeric `inputs`, immutable `estimates`, `actorId`, `createdAt`. |
| Start request | Appends to `repaymentRequests[]`: `id`, `status: draft`, `planId`, `loanIds` from one cohort, `servicerId`, `scenarioId?`, `actorId`, comparison `inputs` when available, `lastSavedStep: plan`, `createdAt`, `updatedAt`. |
| Save and continue or Save and exit (repayment request) | Updates the draft’s `requestType` if selected, `inputs`, `lastSavedStep`, `updatedAt`. |
| Submit request | Updates the same draft with reviewed request fields, `lastSavedStep: review`, `status: in_review`, `signedAt`, `submittedAt`, `updatedAt`. The user can see the submitted request from My Activity. |
