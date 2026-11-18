# Procore workflow research

Procore brings project records into a common workspace. The four tools in this build cover design clarification, material and document review, daily field reporting, and contract price changes. The synthetic account represents a general contractor managing two active jobs.

| Persona | Work |
| --- | --- |
| Project engineer | Routes construction questions, records design replies, and identifies the official answer. |
| Submittal coordinator and design reviewer | Collect product data or shop drawings, send them for review, and record a decision against each revision. |
| Superintendent | Records site conditions, crew time, notes, and deliveries and completes the day's report. |
| Project manager | Prices an adjustment against a prime contract and records its submission and decision. |

## Documented behavior and workspace views

| View | Priority | Behavior and local design |
| --- | --- | --- |
| Project overview | P0 | A synthetic project picker and four linked metric cards give every tool a direct entry point. The rail and project context stay visible across desktop views. |
| RFIs | P1 | The list makes question, assignment, status, and due date discoverable. The detail follows the question through replies, an official answer, and close or reopen. |
| Submittals | P1 | The list surfaces specification section, revision, and Ball in Court. Detail groups the submission, file attachments, and review decisions by revision. |
| Daily Log | P1 | Date navigation opens a day with typed entries and a completion action. Complete days stay readable and can be reopened for revisions. |
| Change Orders | P1 | An order links to a prime contract under a one-tier arrangement. Its detail pairs status and decision information with priced Schedule of Values rows. |
| Recent activity | P2 | The overview and detail can show activity already recorded with each state write. |
| List pagination | P2 | Record-heavy lists can page while retaining active filters. |

## Public workflow references

- RFIs use assignees and allow replies that can become the official response. [Create an RFI](https://support.procore.com/products/online/user-guide/project-level/rfi/tutorials/create-an-rfi) · [Respond to an RFI](https://support.procore.com/products/online/user-guide/project-level/rfi/tutorials/respond-to-an-rfi)
- Submittals carry specification and contact information and can be routed to a reviewer for a decision. This workspace uses one reviewer for each revision. [Create a Submittal](https://support.procore.com/products/online/user-guide/project-level/submittals/tutorials/create-a-submittal) · [Respond to a Submittal as an Approver](https://en-gb.support.procore.com/products/online/user-guide/project-level/submittals/tutorials/respond-to-a-submittal-as-an-approver)
- Daily logs collect entries by type and date. A completed day can be reopened to revise the record. [Create Daily Log Items](https://support.procore.com/products/online/user-guide/project-level/daily-log/tutorials/create-daily-log-items) · [Mark a Daily Log as Complete](https://en-ca.support.procore.com/products/online/user-guide/project-level/daily-log/tutorials/mark-a-daily-log-as-complete) · [Re-Open a Daily Log](https://support.procore.com/products/online/user-guide/project-level/daily-log/tutorials/re-open-a-daily-log)
- Project Change Orders consolidate order tracking. The one-tier prime contract path supports direct creation. [Change Orders](https://support.procore.com/products/online/user-guide/project-level/change-orders) · [Configure Settings for Prime Contracts](https://support.procore.com/products/online/user-guide/project-level/prime-contracts/tutorials/configure-settings-prime-contracts)

## State and scope

Project, person, company, and contract IDs link the four tool collections to the synthetic account. Responses, review decisions, entry details, cost lines, and actor-attributed activity each have their own verifiable records. The [data model](data_model.md) defines fields and fixtures. The [design guide](../DESIGN.md) defines the original layouts and local artwork. The [implementation checklist](../TODO.md) defines acceptance and excludes account onboarding and external integrations so the workflow remains offline.
