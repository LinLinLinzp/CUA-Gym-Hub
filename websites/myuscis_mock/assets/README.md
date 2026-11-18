# myUSCIS account research

myUSCIS gives applicants a place to follow immigration benefit cases and manage online filings. The workspace starts with a fictional applicant account. The three main use cases are an applicant looking up a receipt or checking progress, a returning applicant resuming a draft, and an applicant updating where case correspondence should go.

## Public workflow references

- **Case status.** USCIS uses a receipt number for status lookup. Its public tool describes a 13-character identifier, normally three letters followed by ten digits, and instructs users to omit dashes. Its account materials distinguish lookup from having a case associated with an account and describe status and case history. The local registry and “Track this case” action are fixture-based design choices. [Case Status Online](https://egov.uscis.gov/) · [Benefits of a USCIS Online Account](https://www.uscis.gov/sites/default/files/document/flyers/USCIS_OnlineAccount.pdf)
- **Forms.** USCIS describes saving and resuming a draft, signing before submission, immediate filing confirmation, and following a case after filing. Use those interactions for the synthetic filing flow. Catalog labels orient users within the workspace and filing steps use short practice questionnaires. [Benefits of a USCIS Online Account](https://www.uscis.gov/sites/default/files/document/flyers/USCIS_OnlineAccount.pdf)
- **Address change.** USCIS describes submitting an address change through the account and supplying a receipt number for each pending benefit request that the change should cover. Its public outreach distinguishes physical and mailing addresses. The local workflow captures both addresses and records specific case associations. [How to Change Your Address](https://egov.uscis.gov/coa/displayCOAForm.do) · [USCIS outreach on Enterprise Change of Address](https://www.uscis.gov/sites/default/files/document/outreach-engagements/CurrentIssuesSessionNAFSARegionalConferences2023QuestionsandAnswers.pdf)

## View inventory

| Priority | View | Layout and interactions |
| --- | --- | --- |
| P0 | Account overview | Account header, vertical navigation, short welcome, then a two-column summary with latest tracked cases and actionable drafts. Address summary links directly to its workflow. |
| P1 | Cases | Receipt lookup sits above the tracked list. Search and status filter operate on the tracked list. A lookup result has an explicit detail link and a tracking action where applicable. |
| P1 | Case detail | Receipt, status and date in the page header, then a timeline led by the latest event. Show a readable fallback when history is unavailable. |
| P1 | Forms | Catalog and “Your filings” views separate available forms from drafts and submissions. Search by form code or title; give draft rows a clear “Continue” action and submission rows a link to their case. |
| P1 | Filing wizard | Visible progress through applicant details, form answers, and review/signature. Provide inline validation, a save action and a receipt confirmation that links to the new case. |
| P1 | Address change | Current physical and mailing addresses sit above request history. The new request flow collects addresses, receipt associations and confirmation. Selecting an existing request opens a durable detail view. |

The data model separates the case registry from applicant tracking links. Filings separate catalog entries, editable drafts, and submitted snapshots. Address requests join the applicant profile to selected cases. [Data model](data_model.md)

Use the original layout and local CSS artwork specified in [DESIGN.md](../DESIGN.md). Sign-in, identity checks and payment capture add no practice value for this brief. The site starts inside the account and all submissions are local.
