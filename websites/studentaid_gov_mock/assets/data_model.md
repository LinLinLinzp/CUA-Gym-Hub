# Proposed Harbor state model

`createInitialData()` returns the nine keys below. Treat IDs as opaque strings. Dates that represent an event are ISO timestamps. Calendar dates without times use `YYYY-MM-DD`. Currency is stored as numeric USD rounded to cents, with formatting at render time. Rates are percentages (`5.5` means 5.5%). A question mark indicates an optional field. Seed IDs and timestamps are fixed. New records use stable IDs and carry the current `profile.id` as `actorId`.

## Keys and record shapes

| Top-level key | Type | Fields and examples |
| --- | --- | --- |
| `profile` | Object | `id: "person-avery"`, `firstName: "Avery"`, `lastName: "Morgan"`, `email: "avery.morgan@example.test"`, `state: "MD"`. Use a neutral account label for an omitted display name. |
| `schools` | Array | `id: "school-pine-ridge"`, `name: "Pine Ridge State University"`, `city: "Cedar Falls"`, `state: "IA"`, `federalSchoolCode?: "009901"`. Keep codes as strings. |
| `fafsaForms` | Array | `id: "fafsa-2025-26-03"`, `groupId: "fafsa-2025-26"`, `awardYear: "2025-26"`, `revision: 3`, `previousFormId?: "fafsa-2025-26-02"`, `status: "processed"`, `actorId: "person-avery"`, `answers`, `schoolIds: ["school-pine-ridge"]`, `contributors: []`, `lastSavedStep: "review"`, `createdAt`, `updatedAt`, `submittedAt?`, `processedAt?`, `summary?`. Statuses are `draft`, `in_progress`, `action_required`, `in_review`, `processed`, `closed`. Steps are `student`, `financial`, `schools`, `review`. |
| `servicers` | Array | `id: "servicer-edfinancial"`, `name: "Edfinancial"`, `phone?: "800-555-0104"`, `mailingAddress?: "PO Box 410, Sample City, MD 20000"`. Sample contact details are display text only. |
| `loans` | Array | `id: "loan-024"`, `schoolId?: "school-pine-ridge"`, `servicerId?: "servicer-edfinancial"`, `type: "direct_unsubsidized"`, `status: "in_repayment"`, `disbursedOn: "2023-08-24"`, `originalAmount: 7250`, `principalBalance: 6120.50`, `accruedInterest: 74.10`, `interestRate: 5.5`, `planId?: "standard"`, `nextPaymentDueOn?: "2026-12-07"`, `nextPaymentAmount?: 67.45`, `recertificationDueOn?`. Representative loan types are `direct_subsidized`, `direct_unsubsidized`, `direct_grad_plus`, and `direct_consolidation`; representative statuses are `in_school`, `in_grace`, `in_repayment`, `deferment`, `forbearance`, `paid_in_full`. |
| `loanAcknowledgments` | Array | `id: "ack-2025-26"`, `awardYear: "2025-26"`, `status: "completed"`, `loanIds: ["loan-024"]`, `loanCount: 1`, `principalBalance: 6120.50`, `accruedInterest: 74.10`, `totalBalance: 6194.60`, `actorId: "person-avery"`, `signedAt`, `createdAt`. Snapshot values describe the signed record even if loan data later changes. |
| `repaymentPlans` | Array | `id: "ibr"`, `name: "Income-Based Repayment"`, `category: "income_driven"`, `description`, `termMonths: 240`, `eligibleLoanTypes: ["direct_subsidized", "direct_unsubsidized"]`, `eligibleDisbursedBefore?: "2026-07-01"`, `estimator: "income_share"`, `incomeShare?: 0.1`, `incomeAllowance?: 15000`, `familySizeAllowance?: 4500`. Categories are `fixed`, `income_driven`. Estimators are `amortized` and `income_share`. Eligibility and estimator inputs are fixture values for the exercises. |
| `repaymentScenarios` | Array | `id: "scenario-024"`, `name: "Lower monthly payment"`, `status: "saved"`, `loanIds: ["loan-024"]`, `loanCount: 1`, `inputs: { annualIncome: 52000, familySize: 2 }`, `estimates`, `actorId: "person-avery"`, `createdAt`. |
| `repaymentRequests` | Array | `id: "request-024"`, `status: "in_review"`, `planId: "ibr"`, `loanIds: ["loan-024"]`, `servicerId: "servicer-edfinancial"`, `scenarioId?: "scenario-024"`, `requestType?: "enter_plan"`, `inputs`, `lastSavedStep: "review"`, `actorId: "person-avery"`, `createdAt`, `updatedAt`, `signedAt?`, `submittedAt?`. Request types are `enter_plan`, `change_plan`, `recertify`, `recalculate`. Statuses are `draft`, `in_review`, `action_required`, `completed`, `canceled`. Steps are `plan`, `income`, `review`. |

### Nested objects

- `fafsaForms[].answers` includes `studentName?: "Avery Morgan"`, `state?: "MD"`, `dependencyStatus?: "independent"`, `householdSize?: 2`, `annualIncome?: 52000`, `taxConsent?: true` and `signedAt?`. Dependency values are `dependent` and `independent`. The current student signature is saved on submit.
- `fafsaForms[].contributors[]` includes `id: "contributor-01"`, `role: "parent"` or `"spouse"`, `name?: "Jordan Morgan"`, `status: "pending"` or `"signed"`, `consent?: true` and `signedAt?`. In the dependent exercise, a local form control records one required parent’s sample consent and signature. There is no email invitation or contributor account session.
- `fafsaForms[].summary?` includes `studentAidIndex?: 1740`, `pellGrantEstimate?: 3645`, `directLoanEstimate?: 5500` and `nextSteps?: ["Review any requests from your school."]`. It belongs to the processed edition. A correction copies answers, contributors and schools, clears signatures, and starts without a processed summary.
- `repaymentScenarios[].estimates[]` includes `planId: "ibr"`, `planName: "Income-Based Repayment"`, `eligible: true`, `monthlyPayment?: 270.83`, `totalPaid?: 64999.20`, `termMonths?: 240` and `ineligibleReason?`. Store the display name with each estimate so saved results can be reopened if the plan reference is absent.
- `repaymentRequests[].inputs` includes `annualIncome?: 52000`, `familySize?: 2`, `incomeConsent?: true`. Exclude personal identifiers, credentials, tax documents and bank details from all forms and fixtures.

## Relationships and seed scenarios

- Seed 24 FAFSA editions across eight award years, 2018–19 through 2025–26. A `groupId` identifies one application history and `previousFormId` links editions. Vary the number of editions per year. The 2025–26 edition supports a correction. Offer 2026–27 as a fresh year and use 2024–25 for a resumable correction draft. Link each edition’s school IDs to a directory of 30 fictional institutions across regions.
- Seed 24 federal loan entries across a longer undergraduate and graduate history, with different balances, rates, loan types and at least two servicer groups. Include in-repayment, deferment and paid-in-full entries. Seed several completed acknowledgment receipts by award year, leaving the newest award year open. The signed receipt links the included loans and preserves their aggregate snapshot.
- Seed a small plan catalog including a Standard fixed baseline and an eligible sample Income-Based Repayment plan. Add plan entries for other fixture cohorts as needed to show ineligible explanations. Seed 24 saved comparisons across different loan selections and household inputs, plus 24 requests spanning plan changes, recalculations, recertifications, and superseded or canceled exercises. Keep only a small number of requests active and link request and scenario records where applicable. Reference data stays compact so the account history remains the primary data volume.
- Protect optional joins. Present the record's stored label or use a term such as `School unavailable` if a catalog reference is missing. Treat missing balances as unavailable in detail and sum only finite numeric values in aggregates. Use empty states for unavailable records, and never restore a replaced array from seed after load.

## Calculation and action semantics

Use the selected cohort’s positive principal and accrued interest for the illustrative starting balance. For a fixed schedule, use term months and the balance-weighted annual rate divided by 1200. Compute the payment as `balance * monthlyRate / (1 - (1 + monthlyRate) ** -termMonths)` or `balance / termMonths` when the rate is zero. For a sample income-share plan, apply the fixture share to income above the fixture allowance (base plus per additional family member), divide by 12, and floor at zero. Estimate fixed and income-share total payments as monthly payment times the sample term, rounding each published amount to cents. Treat this calculator as a fixture-based estimate and label it accordingly. Determine per-plan eligibility from selected loan types and supplied cohort cutoffs, and keep estimates independent of the current committed loan plan.

| Action | Stored effect |
| --- | --- |
| Start FAFSA | Append a `fafsaForms[]` edition with new `id` and `groupId`, award year, revision 1, actor and timestamps, `status: draft`, empty answer and school fields, and `lastSavedStep: student`. |
| Save or resume FAFSA | Save commits `answers`, `schoolIds`, `contributors`, `lastSavedStep`, `updatedAt` on the active record. Resume reads it. |
| Submit FAFSA | Commit the final answers, school IDs, contributors and student signature, then `status: in_review`, `submittedAt`, and `updatedAt` on the active record. |
| Start FAFSA correction | Append a `fafsaForms[]` draft with `groupId` from the original, `previousFormId`, incremented `revision`, the copied editable fields, cleared signatures, actor and timestamps. |
| Sign loan acknowledgment | Append `loanAcknowledgments[]` with award year, loan IDs and count, balance snapshot, actor, `status: completed`, `signedAt`, and `createdAt`. |
| Save repayment comparison | Append `repaymentScenarios[]` with name, loan IDs and count, numeric `inputs`, `estimates`, actor, `status: saved`, and `createdAt`. |
| Start repayment request | Append `repaymentRequests[]` with chosen `planId`, `loanIds`, `servicerId`, optional `scenarioId`, actor, draft status, step, and timestamps. |
| Save repayment request | Update `requestType`, `inputs`, `lastSavedStep`, and `updatedAt` on the active request. |
| Submit repayment request | Commit request fields and set `status: in_review`, `signedAt`, `submittedAt`, and `updatedAt` on the active request. |

The implemented `SCHEMA.md` records these same actions against the released field names and status values. Record creation and editing preserve related history. Read-only UI controls send no `set_current` mutations.
