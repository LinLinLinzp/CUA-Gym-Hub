# my Social Security — Product Research

## Account purpose

A signed-in account lets people review Social Security records and manage ongoing benefits. SSA documents earnings and future benefit estimates under the Social Security Statement. It lists changing direct deposit, retrieving tax forms and printing a Benefit Verification Letter as separate services for beneficiaries. [Using Your Account](https://www.ssa.gov/myaccount/using-your-account.html)

The default persona is fictional retiree Maren Ellis. She needs a past tax statement, wants her next scheduled benefits to use a new bank account, and needs a letter documenting her benefit status. Injected scenarios can represent someone without current benefits or with an application pending. The product’s public guidance describes letters for each of those statuses. [Get benefit verification letter](https://www.ssa.gov/manage-benefits/get-benefit-letter)

## Feature inventory

| Priority | Feature | View and behavior |
| --- | --- | --- |
| P0 | Overview, navigation and boot | Brand masthead, section navigation, account summary and links to the three workflows. Load the Harbor session before rendering account details. |
| P0 | State and deep links | Shared store, route fallback, empty states, session isolation and the template JSON endpoints. |
| P1 | Social Security Statements | Searchable snapshot archive. Details prioritize estimated monthly benefits and dated earnings. The public statement describes nine claiming ages and an earnings history. The archive of snapshots is a synthetic fixture choice. [Social Security Statement](https://www.ssa.gov/myaccount/statement.html) |
| P1 | Tax benefit statements | A separate tab in the same statement view. Open a tax year, review amounts, and download or print a replacement form. SSA describes replacement forms for up to six prior years in which benefits were paid. [Replacement SSA-1099 or SSA-1042S](https://www.ssa.gov/faqs/en/questions/KA-01723.html) |
| P1 | Direct deposit | Current masked destination, setup/change form, review, receipt and dated history. SSA describes online changes with availability depending on benefit type. Confirmation in this workspace is a simulated account update. [Update direct deposit](https://www.ssa.gov/manage-benefits/update-direct-deposit) |
| P1 | Benefit Verification Letter | Generate a letter for the signed-in beneficiary, then view, download or print it. The letter’s content reflects the beneficiary’s status. [Benefit verification letter FAQ](https://www.ssa.gov/faqs/en/questions/KA-01717.html) |
| P1 | Letters and notices archive | Filter correspondence by type or unread status, open notice details and download or print a local copy. SSA delivers eligible notices in its Message Center. [Online notices](https://www.ssa.gov/myaccount/opt-out.html) |
| P2 | Payment history | Optional account context with itemized payments and date filtering. |

## Layout and data

The [design system](../DESIGN.md) defines an original visual layout and locally authored artwork. Use a shared account shell. Statements and letters place retrieval tools above a structured archive and link to a single-document view. Direct deposit gives the current destination and form priority over its history. Overview links to all three primary sections.

The [data model](data_model.md) connects beneficiaries, statements, letters, deposit destinations and payments by fixed IDs. Access events, generated letters, confirmed deposit changes and notice read status are app-observable. Search, filters and form drafts are presentation state.

The scope begins with an authenticated account surface using synthetic records. Identity verification, live agency or bank integrations, account creation, outgoing mail, benefit applications and representative payee management fall outside this phase. Research used publicly available SSA descriptions.
