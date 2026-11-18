# StudentAid.gov account research

StudentAid.gov is the Federal Student Aid account portal for managing aid forms, federal loan records, and repayment actions. A returning student needs to reuse saved application work and verify which schools receive a FAFSA. A borrower needs to understand a loan balance and its servicer, acknowledge borrowing, and compare payments before submitting a repayment request. [StudentAid.gov account capabilities](https://studentaid.gov/articles/key-facts-accounts/)

| Priority | View | Account task and presentation |
| --- | --- | --- |
| P0 | Account shell | A persistent rail and page header link Dashboard, FAFSA, My Loans, Repayment, and My Activity. The overview uses three workflow cards above recent activity. Direct URLs and refresh reach the same records. |
| P1 | FAFSA index and wizard | Filter award years and statuses, resume a draft, select schools, review signatures, and submit. Put the progress list to the left of one form column, with inline errors and a review step. |
| P1 | FAFSA detail and corrections | In review shows receipt/status. A processed form surfaces eligibility, answers, schools, and next steps, plus revision history and an action to start a correction. |
| P1 | My Loans and loan detail | Review principal and accrued interest, narrow by servicer or status, and inspect individual loan terms and servicing. Place balances above the filterable loan ledger. |
| P1 | Annual Student Loan Acknowledgment | Review a current balance snapshot, select an award year, confirm and sign. Link the completed receipt from My Activity. |
| P1 | Repayment comparison | Use selected federal loans and household inputs to compare estimated monthly payments, total paid and term. Save a named comparison and reopen its snapshot. Use a narrow input panel and a comparable plan grid. |
| P1 | IDR request and status | Choose an eligible plan, confirm a servicer cohort, save and resume, provide sample income information and consent, then sign and submit. A receipt and My Activity show the current request status. |
| P1 | My Activity | Filter and sort forms, acknowledgments, and requests. Show title, status and latest update, with each row linking to the record. |

## Public workflow references

- FAFSA detail uses a status timeline and lets applicants confirm schools and contributor progress. Processed summary sections inform the detail layout and the correction entry point. [After submitting a FAFSA form](https://studentaid.gov/articles/things-after-fafsa/) · [FAFSA Submission Summary](https://studentaid.gov/articles/fafsa-submission-summary/)
- Borrower records include term and balance breakdowns for individual loans. The loan acknowledgment gives a borrower a chance to review how much they have borrowed. [Federal Student Aid account records](https://studentaid.gov/articles/key-facts-accounts/) · [Managing federal student aid](https://studentaid.gov/articles/4-ways-manage-federal-student-aid/)
- The current calculator compares monthly payments, total repayment, and payoff timelines. The plan request uses income and household information and has an independently tracked processing status. [Repayment Calculator](https://studentaid.gov/articles/repayment-calculator/) · [Income-driven repayment requests](https://studentaid.gov/articles/faqs-idr-plan/)

## Data and local scope

The account stores synthetic FAFSA editions, school references, a loan portfolio with servicing references, signed loan acknowledgment snapshots, calculator snapshots, repayment plan references and application records. My Activity combines those records into display rows. The [data model](data_model.md) defines their links and persisted mutations; the [design guide](../DESIGN.md) defines the original local visual treatment.

The signed-in training experience uses local sign-off controls and sample eligibility. Identity, tax retrieval, billing, and outbound messages require production integrations and fall outside the local workflow scope.
