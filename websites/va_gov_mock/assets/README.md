# VA.gov account research and view inventory

This offline account workspace lets a fictional signed-in Veteran manage benefits and care. The default profile is Jordan Brooks. Public VA documentation establishes the workflow terminology. DESIGN.md specifies an original account layout, local CSS artwork and text branding.

## Users and tasks

- A Veteran following a disability claim checks current progress, sees evidence requests, submits a document, or files for a new condition or increase.
- A VA healthcare patient requests or cancels a visit, reviews a medication shipment, or submits a refill.
- A benefit recipient verifies a recent deposit or switches a synthetic destination. A patient with a VA healthcare bill reviews the charges and pays with a fixture method.

## Workflow findings

- **Claims.** The status tool shows progress, the issues claimed, evidence and eligible decision letters. Pending initial disability claims support evidence submissions. A separate application starts a disability compensation claim. [Claim status FAQ](https://www.va.gov/resources/claim-status-tool-faqs/) · [File for disability compensation](https://www.va.gov/disability/file-disability-claim-form-21-526ez/) · [Disability claim steps](https://www.va.gov/disability/after-you-file-claim/)
- **Appointments.** VA supports scheduling, appointments requests, reviewing visits and canceling some visits. A submitted request is routed for scheduling. In the exercise it remains under Requests until the fixture specifies a scheduled visit. [Manage health appointments](https://www.va.gov/health-care/manage-appointments/) · [VA Online Scheduling FAQ](https://mobile.va.gov/app/va-online-scheduling-old)
- **Prescriptions.** VA describes refill requests, medication history and delivery tracking as related pharmacy tasks. The exercise places all three on the prescription list and detail. [Manage prescriptions and medications](https://www.va.gov/health-care/manage-prescriptions-medications/) · [Refills and delivery](https://www.myhealth.va.gov/mhv-portal-web/managing-your-prescription-refills)
- **Payments.** VA benefit deposits have their own history by benefit category. Direct deposit settings apply to disability/pension and education. Copay balances belong to healthcare bills. This exercise keeps the two ledgers distinct and completes the copay flow with local fixture methods. [Benefit payment history](https://www.va.gov/va-payment-history/) · [Direct deposit](https://www.va.gov/resources/how-to-change-direct-deposit-information-for-va-benefits/) · [Copay bills](https://www.va.gov/health-care/pay-copay-bill/)

## View inventory

| Priority | View | Layout and behavior |
| --- | --- | --- |
| P0 | Shell and Overview | Navy rail, white account header, blue welcome panel with local artwork, four service links with summary counts, and recent activity links. Mobile uses a collapsed menu and stacked cards. |
| P0 | Shared routes and data | Boot loading state, empty and missing-record views, visible focus, sid-preserving links, fixture-injection support and session state API. |
| P1 | Claims | Search and status filter above the list. Detail shows progress, conditions, evidence requests and submitted files. Active disability claims have an evidence form. Filing has a dedicated form and review. |
| P1 | Appointments | Upcoming, Requests and Past views. Detail shows clinic, format, facility and confirmed or preferred time. The request form has a review step. A confirmation dialog handles eligible cancellations. |
| P1 | Prescriptions | Search and status controls above medication rows. Detail shows refill eligibility, history and shipment details. Refill uses a confirmation dialog. |
| P1 | Payments | Benefit history and copay sections with distinct filters and linked details. Direct deposit has a two-group selection and confirmation. Open bills have a review screen and receipt. |

## Data and scope

The [data model](data_model.md) defines seeded account, facility and service records. Each submitted business action persists its relevant record and linkage. The workspace opens as a signed-in profile. All evidence metadata, tracking details, destinations and payments are synthetic, and the runtime uses local resources.
