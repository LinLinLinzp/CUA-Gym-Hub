# SAP Concur workflow research

The workspace combines employee expense reporting, pre-trip request preparation and manager approvals. The default employee, Riley Chen, creates and tracks their own documents and handles approvals from assigned colleagues. Morgan Bell reviews Riley's submissions. A fresh Harbor state can set a different active employee to exercise that person's side of a return and resubmission.

## Evidence and scope

- **Expense reports.** SAP describes a report library, a report header, out-of-pocket and company-card expenses, receipts, and submission for review. The exercise captures these as a searchable library, editable document, line-item receipt handling and a submit action. [Expenses and Reports overview](https://help.sap.com/docs/concur-expense/concur-expense-standard-edition-end-user-help/expenses-and-reports-overview)
- **Travel requests.** SAP describes creating a request, adding expected expenses or segments and submitting to an assigned approver. The exercise uses a trip header with an origin, destination and date range, plus editable expense estimates. SAP documents that returned or recalled requests can be revised and resubmitted. [Create a Request](https://help.sap.com/docs/CONCUR_REQUEST/fb896189509b449ca55f47eafb730daa/21940e5f8c394835bb5e00a8512bd683.html) · [Edit or update a request](https://help.sap.com/docs/CONCUR_REQUEST/88ac808e42ec415685d1239d927b512d/425629346dac45b8995b1a46fff5abcd.html)
- **Approvals.** SAP describes reviewing line details, approving, or sending an item back; a return includes a reason and supports correction. The exercise uses a single assigned reviewer per cycle. [Expense Report Approval overview](https://help.sap.com/docs/concur-expense/concur-expense-standard-edition-end-user-help/expense-report-approval-overview) · [Send a Report Back](https://help.sap.com/docs/CONCUR_EXPENSE/cd24ad794821491e8f65f76f61dffcc6/c40ad00d51c310159a5c99e049e13696.html) · [Approver Actions for Requests](https://help.sap.com/docs/concur-request/concur-request-professional-edition-end-user-help/approver-actions-for-requests?version=2026_03)
- **Data structures.** SAP's developer documentation distinguishes reports, report expenses, requests and expected expense resources. A linked review-cycle record and append-only activity are exercise-specific choices that make decisions inspectable in Harbor. [Expense Report v4 expense resources](https://github.com/concur/developer.concur.com/blob/preview/src/api-reference/expense/expense-report/v4.expenses.markdown) · [Travel Request v4 overview](https://github.com/SAP-docs/preview.developer.concur.com/blob/main/src/api-reference/request/v4.get-started.markdown)

## Views and feature inventory

| Priority | View | Planned content and interactions |
| --- | --- | --- |
| P0 | Workspace frame | Left rail, account header, loading state, deep-link routing, sid propagation, and Harbor state boot/save. |
| P1 | Home | Three direct task actions, derived counts, recent document table and linked details. |
| P1 | Expense library | Search, filter, sort, open or create reports, and see USD totals and status. |
| P1 | Expense detail | Header editing, line item and receipt management, submit, recall, returned reason and resubmit. |
| P1 | Request library | Search, filter, sort, open or create requests, and see destination, dates and expected total. |
| P1 | Request detail | Trip header, estimated line management, totals, submit, recall, returned reason and resubmit. |
| P1 | Approvals | Pending and History; type filter, search and sort; detail review, approve or send back with reason. |
| P2 | Additional list controls | Date-range and expense-type filtering with Reset. |
| P2 | Receipt preview | Inline preview for original or supported user-provided receipt images. |

See [DESIGN.md](../DESIGN.md) for the original layout and asset direction. The app opens signed in and is self-contained. Booking, reimbursement disbursement, card feeds and account administration are outside the workplace exercise.

## Data overview

The state holds an account, users, expense reports with nested entries and receipt metadata, travel requests with nested estimates, review cycles and activity. A submission creates a linked approval. A decision changes the approval cycle and its subject in one write. The reviewer queue and document timeline read those records on demand. See [data_model.md](data_model.md) for all field definitions, lifecycle rules and seed coverage.
