# Chase workflow research

This site represents everyday personal banking for Alex Morgan, a synthetic customer managing household spending in USD. The primary tasks are checking what posted, moving money between deposit accounts, scheduling a household bill, reporting a charge, and adjusting notifications. The public sources below inform terminology and task order. `DESIGN.md` defines the visual design.

## Feature inventory

| Priority | Feature | Workflow and planned view |
| --- | --- | --- |
| P0 | Navigation and session | Five persistent destinations and a customer header. On small screens navigation sits beneath the header. The same session follows all detail routes. |
| P0 | State and rendering | Neutral load state, shared persistence, empty states and paginated histories, plus standalone Harbor endpoints. |
| P1 | Accounts | An account directory and recent activity on the landing page. Account details pair a balance summary and nickname editor with filterable transactions. Open the transaction for merchant, amount, date, and status. |
| P1 | Transfers | A compact form and transfer activity share a page. Review and confirm a transfer between two open deposit accounts. Show cancelled, scheduled, and completed entries in the activity list. |
| P1 | Bill pay | A searchable payee list, explicit add-payee form, payment scheduler, and separate payment activity view. Review payment details before submission. |
| P1 | Disputes | Open the form from a transaction or the disputes page. Confirm the charge and reason before submitting. A case list supports open and closed filters and links to case detail. |
| P1 | Alerts | Account selector followed by eligible alert controls, including independent delivery channels and thresholds where relevant. Explicitly save each rule. |

## Public workflow references

- Personal online banking supports monitoring account activity and reviewing deposits. Chase also documents account nicknames to distinguish accounts. [Online banking](https://www.chase.com/online/digital/online-banking.html) · [Accessibility and account nicknames](https://www.chase.com/digital/resources/accessibility)
- Internal transfers use source, destination, amount, date, optional memo, and confirmation. [Transfer money between accounts](https://www.chase.com/digital/customer-service/helpful-tips/online-banking/mobile/transfer-money)
- Bill pay requires a payee, funding account, amount, and date. Scheduling ends with a review and confirmation. [Online Bill Pay](https://www.chase.com/digital/online-bill-pay)
- Disputes start from a transaction with a reason and details. The case tracker presents open and closed cases. A pending purchase is ineligible for the online flow. [Submit and track disputes](https://www.chase.com/digital/customer-service/helpful-tips/credit-cards/desktop/report-transaction) · [Disputing a charge](https://www.chase.com/reportaproblem)
- Account alerts are configured per account with email, text, and push channels. Examples include deposits, low balances, large transactions, and upcoming payments. [Manage account alerts](https://www.chase.com/personal/mobile-online-banking/login-alerts) · [Account security and alert types](https://www.chase.com/personal/convenience-tools/account-security)

## Data and boundaries

`data_model.md` defines the backing records. A transaction can link to a dispute or internal transfer, a bill payment links to a payee and funding account, and each alert rule links to one account. IDs are stable across reloads. Inactive history supports search without crowding the main tasks.

The signed-in shell opens directly onto Accounts. External money movement, recurring schedules, statement document delivery, authentication, payment settlement, and real alert delivery are outside this brief. The only runtime backend is the Harbor state API.
