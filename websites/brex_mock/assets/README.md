# Brex research and screen inventory

Brex combines corporate cards and spend controls with expense documentation and review. This workspace covers an internal finance team's daily work across a synthetic organization. The default user, Maya Chen, is a finance admin at Northstar Studio. The same session can document Maya's purchases and submit requests, and can manage team cards, review pending expenses and decide spend limit increases. A synthetic team directory supplies cardholders and limit owners. [Brex developer overview](https://developer.brex.com/), [Account roles](https://www.brex.com/support/brex-role-types-and-permissions)

## Product behavior informing the plan

- **Cards.** Brex distinguishes card format from who uses a card and how spend is funded. Admins can locate a card by user, initiate issuance, and lock or unlock it. Cancellation is terminal and card history remains available. The plan uses virtual issuance and keeps masked identifying details. [Brex card overview](https://www.brex.com/support/brex-card-overview), [Manage your card](https://www.brex.com/support/manage-your-card), [Dashboard and app filters](https://www.brex.com/support/brex-dashboard-and-app)
- **Expenses.** Merchant, category, employee, amount, memo and receipt make up the core review context. Reimbursement creates an out-of-pocket expense for review. Pending expenses can be approved or denied after inspecting details. [Managing your expenses](https://www.brex.com/support/managing-your-expenses), [Expense reimbursements](https://www.brex.com/support/expense-reimbursements), [Approval chains](https://www.brex.com/support/approval-chains)
- **Receipts.** Receipts can be uploaded directly from an expense. Brex also documents an unmatched receipt workflow with manual matching and removal. The local Receipts page brings these actions into one place. [Receipts for expenses](https://www.brex.com/support/receipts-for-expenses)
- **Spend limits.** The admin can create, edit and archive controlled spend, with currency retained after creation. A limit increase has a separate request and decision lifecycle. Active limit membership and related card/expense history are useful context for spending. [Manage budgets and spend limits](https://www.brex.com/support/manage-budgets-and-spend-limits), [Spending on different limits](https://www.brex.com/support/spending-on-spend-limits)

These references inform action names, fields and transitions. The account layout, typography, card illustration and chart treatment are original and specified in [DESIGN.md](../DESIGN.md).

## Screens and priorities

| Priority | Screen | Content and interaction |
| --- | --- | --- |
| P0 | Workspace shell | Full-width navigation and signed-in user above the page title. Every section and detail opens directly with its session ID. |
| P1 | Overview | Currency-scoped cards for recorded spend and workload, a recent expense ledger, a category bar chart and links to the relevant work queues. |
| P1 | Cards | Inventory table with name, holder, masked digits, format, limit and state. Detail puts the local card illustration above the lifecycle controls and linked expense history. Issuance uses a separate labeled form. |
| P1 | Expenses | Ledger with merchant, employee, date, category, amount, receipt and review state. Detail places the receipt and memo together, with decision controls where applicable. The reimbursement form opens from the list. |
| P1 | Receipts | A document queue with filename, upload date, attachment status and linked expense. The upload form accepts a dropped or selected file. Match opens a searchable list of eligible expenses. |
| P1 | Spend limits | Table with owner, recurrence, cap, used, available and status. Detail shows related cards, expenses and increase requests, including exact added amount and reason. Create, edit, archive, request and decide actions update the linked records. |
| P2 | Detail history | Newest-first activity list with structured filters keyed to the open record. |

## Data and scope

The main relationships are team member → cardholder or limit owner, card → assigned limit, expense → team member/card/limit, receipt → expense, and increase request → limit. The state model defines ownership, consistent amount and date formats, seed volumes, and action-level history for Harbor. [State model](data_model.md)

Keep the experience focused on internal workflow practice and deterministic state verification. Authentication, actual transactions, external integrations and notifications are outside scope. All visuals come from local system typography, CSS card artwork and charts, and any original synthetic receipt fixtures shipped with the site.
