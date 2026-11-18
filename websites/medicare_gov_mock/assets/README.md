# Medicare.gov Account Research

## Workflow references

- Medicare’s comparison tools help beneficiaries compare Medicare Advantage and prescription drug plans in their area. They surface available services and costs, including prescriptions where entered. The workspace uses ZIP, year, plan type, premium, rating and network information for the required side-by-side comparison. [Medicare helpful tools](https://www.medicare.gov/basics/get-started-with-medicare/using-medicare/helpful-tools)
- The Medicare account and Medicare Summary Notice surface Original Medicare Part A and B claims. Claim details should preserve the service, provider charges, Medicare-approved amount, Medicare payment and maximum member amount. Claims in private health and drug plans use their plan’s Explanation of Benefits. [Checking the status of a claim](https://www.medicare.gov/providers-services/claims-appeals-complaints/claims/check-status) · [Part B Medicare Summary Notice](https://www.medicare.gov/publications/sample-part-b-medicare-summary-notice-d1.pdf)
- Plan enrollment depends on the plan’s service area, the enrollment period and Part A/B coverage. The public workflow starts with **Enroll** on a selected plan. Use one seeded, explicitly labeled enrollment scenario and present the result as a submitted request. [Joining a plan](https://www.medicare.gov/basics/get-started-with-medicare/get-more-coverage/joining-a-plan)
- CMS groups claims by types such as inpatient, outpatient, professional and durable medical equipment. This workspace uses a compact data model with a claim header and service lines for readable amounts and straightforward verification. [CMS Blue Button data overview](https://bluebutton.cms.gov/data/understanding-the-data/)

## Member journeys

| Member goal | Route and layout | Priority |
| --- | --- | --- |
| Get oriented and check current coverage | Overview with greeting, workflow entry points, current coverage and recent claims | P0 |
| Find a plan that fits their coverage and budget | ZIP/year control, filters and plan cards, then a tray and side-by-side comparison with a saved comparison list | P1 |
| Reconcile a provider bill with what Medicare processed | Searchable claims table, line-item breakdown and review action with an optional note | P1 |
| Request next year’s coverage | Plan details, a guided application, review and confirmation, plus a history of submitted requests | P1 |

Plan comparison saves, claim review and request history are workspace behaviors chosen for repeatable training and Harbor verification. The browsing and review experiences are based on public workflow documentation. See `../DESIGN.md` for the original interface and local illustration specification and `data_model.md` for seed entities and write semantics.

The initial account is an English-language synthetic member with active Original Medicare Parts A and B. No account creation, identity checks, actual plan enrollment or transmission of claims is required. All routes and assets run locally.
