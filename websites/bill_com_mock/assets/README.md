# BILL Accounts Payable — Workflow research

BILL's accounts payable workflow captures bills, routes them for review, and schedules payments. The local workspace follows that sequence for a fictional design firm. Northline Studio is the organization. Maya Ortiz, the signed-in AP manager, can enter bills, decide bills assigned to her, and schedule payments. Jordan Lee and Priya Desai are additional approvers represented in the data. [BILL Accounts Payable](https://www.bill.com/product/accounts-payable) · [BILL AP workflow recipes](https://developer.bill.com/docs/bill-v3-api-recipes)

## Research and implementation choices

- **Bill entry and review.** Bill management covers entry, drafts, approvals, and denied-bill correction. The approval workflow identifies a vendor, due date, invoice and line items. Keep approval and payment statuses independently visible throughout the workspace. [BILL bill management](https://help.bill.com/direct/s/topic/0TO4x000000gbrqGAA/bill-management) · [BILL approval workflow](https://developer.bill.com/docs/recipe-bill-approvals-workflow)
- **Approval decisions.** BILL exposes pending bills and approval or denial actions. This workspace uses one named approver per submission and keeps each prior decision on resubmission. Maya provides a denial reason to make the correction actionable. [BILL operation reference](https://developer.bill.com/docs/oauth-api-scope-capabilities) · [BILL approval workflow](https://developer.bill.com/docs/recipe-bill-approvals-workflow)
- **Vendor payments.** BILL documents scheduled and historical payments with vendor, funding method, note, and process date. This workspace uses ACH and check, one eligible full bill per payment, and masked synthetic funding accounts. A scheduled payment may be cancelled and then replaced. [BILL Elements reference](https://developer.bill.com/docs/elements-reference) · [BILL Payments](https://developer.bill.com/docs/ap-payments) · [BILL core capabilities](https://developer.bill.com/docs/bill-core-capabilities)
- **Scope.** The seed centers on payables, approvals, and vendor payments. The account opens signed in. User actions only manipulate the local records described in the data model. Original colors, layout, CSS marks, and text monograms are specified in the site design. Public documentation serves as a workflow reference.

## Feature and view inventory

| Priority | View | Main controls and information |
| --- | --- | --- |
| P0 | Account shell and Overview | Text brand, top navigation, organization and user identity, metric links to approvals, payable bills and scheduled payments, recent activity. |
| P0 | Session and records | Load before render, restore deep links, preserve SID, publish structured transactions to Harbor, render custom datasets. |
| P1 | Bills | Status views, vendor and date filters, search, sortable columns, pagination, detail, and New bill. |
| P1 | Bill editor and detail | Vendor and invoice fields, line-item editor, amount summary, save draft or send for approval, edit eligible bills, and view approval/payment history. |
| P1 | Approvals | Assigned queue and decision history, bill review, approve or deny with a reason, and resubmission from denied bill detail. |
| P1 | Vendors | Search and method filter, vendor contact record, associated bills and payments, and Pay bills entry point. |
| P1 | Payments | Schedule from a bill, vendor or payment list, review and confirm, filter or search records, inspect statuses, and cancel scheduled payments. |
| P2 | Bills selection | Select visible rows to review a count and total. |

## Typical task sequences

1. Find a vendor by name. Enter a bill with two line items, save as a draft, locate it by invoice number, and correct a field.
2. Send a draft to Maya. Review it from Approvals and deny it with a reason. Correct the bill, resubmit, and approve it. Confirm that both decisions appear on the bill.
3. From the vendor record, select the approved bill, choose a delivery method and funding account, and schedule it. Find the payment from Payments, confirm its details, then cancel it and verify that the bill is ready to pay again.

The normalized data connects each bill to its vendor, its latest approval, decision history, and payment records. `activity` stores linked events with actor and time. Overview figures and filter results are derived from the arrays. The [data model](data_model.md) defines the seed and transaction contract. The [work queue](../TODO.md) supplies implementation and acceptance details.
