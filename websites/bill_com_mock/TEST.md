# BILL Accounts Payable Mock — Test Report

> Round: 2  
> Date: 2026-11-18  
> Server: http://localhost:5443  
> Tested by: playwright agent

WORKFLOWS: PASS

## Summary

| Metric | Count |
| --- | ---: |
| Routes tested | 12, including the fallback route |
| Elements tested | 15 grouped checks |
| ✅ Passed | 13 |
| ❌ Failed | 2 |
| ⚠️ Skipped (out of scope) | 0 |

The build passed. Chromium ran with the installed Node Playwright from `PILOT_PLAYWRIGHT`. The tests used distinct SIDs and only localhost. The browser suites reported zero console errors, page errors, or external requests. The site's `src/utils/dataManager.js` matched the shared template byte for byte.

## ✅ Passing Tests

| Route and workflow | Browser result | Fields verified through `/go` |
| --- | --- | --- |
| `/` · Overview and account navigation | BILL home link and recovery links preserve the SID. Pending approvals, Ready to pay, and Scheduled payments cards lead to their corresponding views. The account shows Northline Studio and Maya Ortiz. | No changes. Baseline contained 72 bills, 32 vendors, 66 approvals, 36 payments, three users, and two funding accounts. |
| `/bills` · Find and review payables | Switched all five bill views, searched invoice and memo, filtered vendor and due date, sorted amount and due date, paginated, selected rows, cleared search and selection, and opened bill details and activity. | No changes. |
| `/bills/new` · Save a draft | Saved a two-line $160.73 bill. Rejected invalid input and a case-insensitive duplicate invoice. Add and remove line controls responded. | `bills` added `id`, `vendorId`, `invoiceNumber`, `invoiceDate`, `dueDate`, `memo`, `lineItems` (including quantities, unit prices and amounts), `amount`, `currency`, `approvalStatus=draft`, `approvalId=null`, `paymentStatus=unpaid`, `createdBy`, `createdAt`, `updatedBy`, `updatedAt`. `activity` appended `bill_created`. Rejected input wrote nothing. |
| `/bills/:id/edit` · Edit payables | Saved a memo edit and reloaded. Edited a denied bill and kept its denial until resubmission. Cancel discarded form edits. | `bills.memo` and update metadata changed for the edited bill. Original creation metadata, approval ID, and statuses were preserved until the next workflow action. `activity` appended `bill_updated`. Cancel wrote nothing. |
| `/bills/:id` · Submit and resubmit | Submitted to Maya, denied, and resubmitted to Maya. Missing approver was rejected. Close and Cancel dismissed the dialog. | `bills.approvalStatus=pending`, `approvalId`, `updatedBy`, and `updatedAt`. `approvals` added a new record with `id`, `billId`, `approverId`, `status=pending`, `createdBy` and `createdAt`, plus null decision fields. The prior denial and its reason were retained. `activity` appended `approval_submitted` with the new approval ID. |
| `/approvals` and `/bills/:id` · Decide approval | Reviewed assigned items and decision history. Denied with a reason, then approved the resubmission without a note. Blank denial reason was rejected. The decision buttons disappeared after a decision. | `bills.approvalStatus` became `denied` or `approved` and update metadata changed. The linked `approvals.status`, `decisionNote`, `decidedBy`, and `decidedAt` changed. The denial note was retained and approval without a note stored null. `activity` appended `approval_denied` and `approval_approved` with the respective approval IDs. |
| `/bills/new` · Save and send | Created and assigned a second bill to Jordan with one `set_current` POST. Maya's queue excluded it and its details showed no decision actions. | One snapshot added the pending `bills` record with its `approvalId`, the linked pending `approvals` record, and `bill_created` and `approval_submitted` activity. |
| `/vendors`, `/vendors/:id`, `/payments/new` · Choose vendor and bill | Searched by vendor email, filtered by ACH, viewed vendor details, and entered the payment form from the vendor, bill, and Payments page. The bill and vendor entry points preselected their respective values. | No changes from search, filters, links, selections, invalid dates, or reviewing without confirming. |
| `/payments/new` · Schedule vendor payment | Reviewed and confirmed ACH and Check payments in separate sessions. Verified the amount and found the ACH payment by reference, status and method. The scheduled bill left Ready to pay. | `payments` added `id`, `reference`, `billId`, `vendorId`, `fundingAccountId`, `method`, `processDate`, `amount`, `currency`, `memo`, `status=scheduled`, `createdBy`, `createdAt`, and null cancellation fields. `bills.paymentStatus=scheduled` and bill update metadata changed. `activity` appended `payment_scheduled` with the new payment ID. |
| `/payments/:id` · Track and cancel | Reloaded the payment detail, dismissed the cancellation dialog with Escape, and confirmed cancellation on the next attempt. The bill returned to Ready to pay. A processing payment had no cancellation control. | `payments.status=cancelled`, `cancelledBy` and `cancelledAt` changed. `bills.paymentStatus=unpaid` and bill update metadata changed. Bill approval stayed approved, and the payment remained in history. `activity` appended `payment_cancelled` with the payment ID. Escape wrote nothing. |
| Harbor state and SID isolation | Verified independent SIDs, full server snapshots, baseline preservation, reset semantics, reload, and same-browser SID switching. | The main suite issued one baseline `set` and ten `set_current` POSTs for ten confirmed transactions. Idle time and read-only actions issued no additional POSTs. An isolated test verified `/post`, `/state` and `/go` without changing the workflow SID. |
| Injected state | Exercised empty collections, one bill with missing optional fields and an unresolved vendor, and 520 injected bills. Empty and missing-record views rendered with recovery controls. | No business changes beyond the helper's boot baseline. |
| Routes and layout | Direct-loaded all 11 application routes and the unknown-path fallback at 1440px. Checked the 390px Overview and pagination hover feedback. | No changes. |

For activity entries, `/go` verified the event type, bill and vendor IDs, optional approval and payment IDs, actor, ISO timestamp, amount, and currency. The field-level contract is documented in [SCHEMA.md](SCHEMA.md).

## ❌ Bugs for Dev Agent

### BUG-001 · P0 · A later save from a stale tab erases a confirmed draft

| Field | Value |
| --- | --- |
| Route | `/bills/new` with the same SID in two tabs |
| Element | Save draft |
| Action | Open both forms before saving. Save a different valid draft in each tab, waiting for the first POST to return HTTP 200 before the second save. |
| Expected | Both drafts and their linked creation events remain in `/go`. |
| Actual | Both saves return HTTP 200 and display the respective detail page. The second snapshot drops the first bill and its `bill_created` event. |
| Console errors | None |
| Fix hint | See `AUDIT-001` in [AUDIT.md](AUDIT.md). Reconcile the latest snapshot before confirming, or reject a stale write with visible feedback. |

### BUG-002 · P2 · Pagination controls are shorter than the design minimum

| Field | Value |
| --- | --- |
| Route | `/bills` |
| Element | Previous and Next |
| Action | Navigate to page two and measure both enabled buttons. |
| Expected | Each button is at least 40px high, per [DESIGN.md](DESIGN.md). |
| Actual | Both measured 34px. Pagination and hover feedback worked. |
| Console errors | None |
| Fix hint | See `AUDIT-002` in [AUDIT.md](AUDIT.md). Remove the pagination-specific height override in `src/style.css`. |

## Visual Alignment Feedback

Reviewed local desktop and mobile screenshots against the site's original [design](DESIGN.md). The text brand, plum header, warm canvas, ledger status markers, and payment review dialog match the documented visual direction. Screenshots and test scratch files are in the ignored `test-results/` directory.

## Round History

### Round 1 → Round 2

- AUDIT-001 → BUG-001. Still failing. Reproduced the lost draft and linked activity in Chromium.
- AUDIT-002 → BUG-002. Still failing. Measured 34px and classified the issue as cosmetic because both buttons work.
- Added browser evidence for Check payment confirmation, direct-route recovery, and additional read-only controls.

Docker dynamic certification and commits are assigned to the parent runner.

## Harbor Docker dynamic certification

The repository certifier passed the production bundle in run `132856`. The local evidence is `factory/build/dyn_certify/132856/results.json`.

| Render | Sync | Idle | Hydrate |
| --- | --- | --- | --- |
| Pass | Pass (1 baseline POST) | Pass (0 idle POSTs) | Pass |
Injection reached `users → 0 → name`.
