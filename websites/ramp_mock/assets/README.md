# Ramp workflow research

This pre-logged-in account workspace represents Northline Studio, a synthetic company. Avery Chen, the finance admin, manages employee cards, vendor invoices, review queues, and policy settings. Accounts payable staff prepare invoices and record payments. Managers review requests against policy. Employees are represented as cardholders and spend requesters in the finance workflow.

## Feature inventory

| Priority | Surface | Workflow and layout |
| --- | --- | --- |
| P0 | Overview and navigation | Horizontal navigation, account identity, and links to active queues. Counts come from the current state. |
| P1 | Cards | Search and filter the card registry. The record page shows the masked card, holder, limit, and status alongside recent activity. Issue a virtual card or change a card's limit or status. |
| P1 | Bill Pay | Find an invoice by vendor, invoice number, or lifecycle stage. A bill detail page groups line items, approval, and payment information. Create and edit a draft, submit for review, and record a scheduled or external payment. |
| P1 | Approvals | Review bills and spend requests in one queue with type, status, and amount filters or sorting. The record page shows the subject, assigned reviewers, and recorded decisions. Submit a spend request, approve a step, or reject with a reason. |
| P1 | Policy | Group expense requirements, spend approval routing, and bill approval routing as separate settings. Each editor shows the rule scope, editable thresholds, and revision history. |
| P2 | List navigation and activity | Restore list filters from the URL and show recent activity on Overview. |

## Public product behavior

- Ramp treats virtual cards as a way to spend online and supports issuing spend to employees. Card and funds management includes temporary locks and terminal actions. For this workspace, physical card records support status changes, while virtual card records carry editable spend limits. [Card issuance](https://support.ramp.com/ordering-or-requesting-physical-cards-virtual-cards-and-funds/) · [Locking and termination](https://support.ramp.com/how-to-lock-or-terminate-ramp-funds-and-cards/) · [Cards and funds API guide](https://docs.ramp.com/developer-api/v1/guides/cards-and-funds)
- Bill Pay has distinct draft, approval, payment, and history stages. Rejected bills can be corrected and submitted again. The workspace represents payment separately from the bill so rescheduling, cancellation, and externally recorded payments have a traceable history. [Bill lifecycle](https://support.ramp.com/bill-lifecycle/) · [Bill and payment management](https://support.ramp.com/managing-bills-and-payments-on-bill-pay/)
- Spend requests capture intended spend and follow review routing configured by finance. Ramp sets the approval flow at submission. The workspace uses one initial reviewer and one optional threshold reviewer, with the stamped revision retained on the pending item. [Spend requests](https://support.ramp.com/hc/en-us/articles/4409480530707-Spend-requests-and-spending-limit-increases) · [Spend request approvals](https://support.ramp.com/hc/en-us/articles/20843280013459-Setting-up-spend-request-approvals)
- Expense controls cover receipt and memo requirements. Bill approvals and spend request approvals are separate policy controls. The workspace makes approval rules affect newly submitted work and records expense requirements as their own publishable policy. [Expense policy setup](https://support.ramp.com/getting-started-with-ramps-expense-policy-setup/) · [Policy controls](https://support.ramp.com/policy-page-ai-agent/)

## Data and scope

Use the fixed English-language data and record relationships in [the data model](data_model.md). Cards reference people, bills reference vendors, approvals reference bills or spend requests, payments reference bills, and revisions capture policy rules. Audit activity links back to the relevant records. Train on the actions in [TODO.md](../TODO.md).

The UI uses an original design with local CSS graphics and text initials, as specified in [DESIGN.md](../DESIGN.md). Authentication, banking credentials, sensitive card details, third-party delivery, and live integrations are outside the synthetic workspace scope.
