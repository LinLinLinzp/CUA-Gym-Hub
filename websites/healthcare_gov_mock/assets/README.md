# HealthCare.gov account research

The Marketplace account connects an application to eligibility results and a subsequent plan choice. It also gives a household a path to update the application as income changes. The site uses a fictional signed-in account and sample results and prices. Public HealthCare.gov guides establish the workflow sequence and terminology. [Apply for coverage](https://www.healthcare.gov/apply-and-enroll/how-to-apply/) · [View eligibility results and next steps](https://www.healthcare.gov/applied-by-phone-or-mail/) · [Report changes](https://www.healthcare.gov/reporting-changes/how-to-report-changes/)

## Who uses the account

- A first-time applicant enters household and income information, saves a draft, then submits and checks the eligibility result.
- A household shopping for coverage compares the estimated premium, deductible and other costs and confirms which plan it wants.
- An enrolled household reports a change in current monthly or expected annual income, reviews the updated eligibility result, and can review plan choices if the result offers them.

## Prioritized feature inventory

| Priority | View or feature | Screen behavior |
|---|---|---|
| P0 | Account shell and overview | Masthead with the brand name and account name, horizontal navigation, next-step hero, recent applications and coverage summary. The dashboard routes to tasks on the appropriate record. |
| P0 | Routing and state | Deep links retain SID. Loading, missing and empty states render inside the common shell. The Harbor API exposes baseline and current state to the verifier. |
| P1 | Application list and detail | List shows reference, year, location and status, with search and year/status filters. Detail presents summary, current eligibility, current selection, resume or next-step action, and the income-change entry point where applicable. |
| P1 | Application editor and eligibility | A progress indicator tracks coverage location, contact, household, income, and review. The review supports correction before submission. The result page shows the application reference, decision and estimated monthly savings. |
| P1 | Plan browse and comparison | A contextual catalog shows plan name, insurer, metal, network and key costs. Search, filters, sorting, detail view and side-by-side comparison narrow the decision. |
| P1 | Plan selection and confirmation | A review presents covered members, plan, pricing and effective date. A durable receipt can be reopened from application detail and distinguishes plan selection from the insurer's first premium. |
| P1 | Report income change | The life-change entry leads to prior and proposed amounts, a change date and source, then review and resubmission. The result links to the revised eligibility and available next steps. |
| P1 | Acceptance coverage | Test the actual routes and persistent writes with Playwright and `/go`, including the no-write behavior of comparison and cancellation. |
| P2 | Historical detail | Read-only access to older eligibility results and replaced selections when present. |

## Product details that shape the mock

- **Applications.** The Marketplace application asks for current monthly income and expected household income for the coverage year. The mock keeps both amounts and supports household members who are included in the application and do not seek coverage. [Income and household information](https://www.healthcare.gov/income-and-household-information/income/) · [Application and eligibility sequence](https://www.healthcare.gov/apply-and-enroll/how-to-apply/)
- **Shopping.** Metal categories describe how costs are shared. Network type affects provider access. The compare view aligns monthly premium, deductible, out-of-pocket maximum and primary care copay. The first premium goes to the insurer, so the mock's receipt records the selection and any pending first premium. [Choose a plan](https://www.healthcare.gov/choose-a-plan/) · [Compare total costs](https://www.healthcare.gov/choose-a-plan/your-total-costs/) · [Complete enrollment](https://www.healthcare.gov/apply-and-enroll/complete-your-enrollment/)
- **Income updates.** The Marketplace starts the change from an existing application and asks the member to resubmit before providing new eligibility results. The mock keeps both results and the prior income values so a verifier can follow what changed. [Report a life change](https://www.healthcare.gov/reporting-changes/how-to-report-changes/)

## Data and visual references

The proposed data links account, applications, eligibility results, plans, selections and income updates through stable IDs. The data model defines the write boundaries and seed examples. [Data model](data_model.md)

The account layout and local decorative art follow the original design specification. Public eligibility guides are research references outside the offline application. The training scope covers three signed-in workflows. Account registration, identity checks, non-income life changes and insurer transactions are outside that scope. [Design specification](../DESIGN.md)
