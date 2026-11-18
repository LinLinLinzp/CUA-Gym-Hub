# SAP Concur Mock — Test Report

> Round: 1  
> Date: 2026-11-18  
> Server: http://localhost:5403  
> Tested by: playwright agent

WORKFLOWS: PASS

## Summary

| Metric | Count |
|--------|------:|
| Routes tested | 10 |
| Elements tested | 128 |
| ✅ Passed | 9 |
| ❌ Failed | 0 |
| ⚠️ Skipped (out of scope) | 0 |

Passed and failed counts refer to the nine Chromium test groups below. The browser recorded 128 distinct route and control-label combinations. Forty accepted business actions each issued one `set_current` POST and were verified in `/go`. The production build passed with `npm run build`. Chromium used the installed Node Playwright module and the existing Vite production preview on the assigned port.

---

## ✅ Passing Tests

- **`/`, `/expense`, `/requests`, `/approvals` — navigation and read-only controls.** Exercised the skip link, wordmark, rail, workspace shortcuts and count links, recent-document links, list search, status/type/date filters, sorting, filter reset, pagination, approval tabs, detail backlinks and hard reload. The fresh session posted one baseline. Subsequent read-only actions and the idle observation posted no business state.
- **`/expense/new`, `/expense/:id` — expense reports.** Created and edited a draft, added and edited lines, removed a line, attached and replaced bundled and uploaded receipts, previewed a bundled image and an uploaded PNG, and fetched an uploaded text receipt. Confirmed missing receipt and invalid form validation, a final report total of $96.25, submission, recall, a new submission cycle, and deletion of a separate draft with a nested line.
- **`/requests/new`, `/requests/:id` — travel requests.** Created and edited a draft itinerary, checked reversed-date and empty-line validation, added and edited estimates, removed an estimate, verified a final total of $376.05, submitted, recalled, submitted again, and deleted a separate draft with a nested estimate.
- **`/approvals/expense_report/:id` — expense approvals.** Approved `ER-1045` (`APR-3031`) with a note and sent `ER-1046` (`APR-3032`) back with a reason. Confirmed a whitespace-only reason leaves state unchanged, decided records move from Pending to History, and actions disappear after decision and reload.
- **`/approvals/travel_request/:id` — travel approvals.** Approved `TR-2039` (`APR-3059`) with a note and sent `TR-2040` (`APR-3060`) back with a reason. Verified the same validation, view transitions, and read-only state after decision.
- **`/expense/:id` — owner correction after send-back.** Opened `ER-1046` as its owner in a fresh injected session, read the reviewer comment, corrected the business purpose, and resubmitted. The original decision remained intact, with a single new pending cycle assigned to Riley.
- **`/requests/:id` — owner correction after send-back.** Repeated the correction and resubmission on `TR-2040` as its owner. Verified the new pending cycle and retained decision after reload.
- **Injected worlds and session isolation.** Opened empty, singleton and 220-record collections, including missing optional fields, a deleted document’s historical approval snapshot, missing document and approval links, and the unknown-route fallback. Exercised an explicit fallback reviewer selection. Verified preserved injected keys, separate `sid` states, and `/post` reset returning the session to its initial state with an empty diff.
- **Browser errors and origin.** Observed zero uncaught page errors, zero console errors and zero external browser requests.

## State changes verified via `/go`

Each accepted action appended one `activity[]` record with `id`, `action`, `actorId`, `createdAt`, `subjectType`, `subjectId`, `subjectTitle`, `status`, `amount` and `currency`. Line and receipt events also recorded `lineId`, `lineAmount`, `quantity` and the applicable `receiptFileName`. Review lifecycle events also recorded `approvalId`, and decisions recorded `comment`. The test compared successive `current_state` snapshots and confirmed the corresponding top-level `state_diff` keys.

| SEED workflow | Action | Other fields observed changing |
| --- | --- | --- |
| Expense reports | Create and edit header | Appended an `expenseReports[]` record with `id`, `ownerId`, `title`, `businessPurpose`, `costCenter`, `reportDate`, `currency`, `status`, `createdAt`, `updatedAt`, `entries` and `totalAmount`. Editing changed `title`, `businessPurpose`, `costCenter`, `reportDate` and `updatedAt`. |
| Expense reports | Add, edit and remove lines | Added and removed records in `expenseReports[].entries[]`. New entries recorded `id`, `createdBy`, `createdAt`, `updatedAt`, `category`, `description`, `merchant`, `transactionDate`, `amount`, `quantity` and `paymentType`. Editing changed category, description, merchant, date, amount, payment type and line `updatedAt`. Each action changed report `totalAmount` and `updatedAt`. |
| Expense reports | Attach, replace and remove receipt | `expenseReports[].entries[].receipt` gained `fileName`, `url`, `contentType`, `size`, `attachedAt` and `attachedBy`. Replacement changed file metadata and `attachedAt`, and removal set `receipt` to `null`. Both line and report `updatedAt` changed. The amount stayed $96.25. |
| Expense reports | Delete draft | Removed the `expenseReports[]` record and its nested `entries[]`. |
| Travel requests | Create and edit itinerary | Appended a `travelRequests[]` record with `id`, `ownerId`, `title`, `businessPurpose`, `costCenter`, `origin`, `destination`, `startDate`, `endDate`, `currency`, `status`, `createdAt`, `updatedAt`, `expectedExpenses` and `estimatedTotal`. Editing changed the entered header fields and `updatedAt`. |
| Travel requests | Add, edit and remove estimates | Added and removed records in `travelRequests[].expectedExpenses[]`. New estimates recorded `id`, `createdBy`, `createdAt`, `updatedAt`, `category`, `description`, `quantity`, `unitAmount` and `lineTotal`. Editing changed category, description, quantity, unit amount, line total and line `updatedAt`. Each action changed request `estimatedTotal` and `updatedAt`. |
| Travel requests | Delete draft | Removed the `travelRequests[]` record and its nested `expectedExpenses[]`. |
| Expense reports and travel requests | Submit or resubmit | Changed the respective document's `status` to `pending_approval` and set `submittedAt` and `updatedAt`. First submission also set `approverId`. Appended an `approvals[]` record with `id`, `status=pending`, `subjectType`, `subjectId`, `subjectTitle`, `submitterId`, `submitterName`, `approverId`, `amount`, `currency` and `createdAt`. Resubmission retained the previous cycle. |
| Expense reports and travel requests | Recall | Changed document `status` to `draft` and updated `updatedAt`. The linked `approvals[]` record changed `status` to `recalled` and recorded `decidedAt` and owner `decidedBy`. |
| Approvals | Approve both document types | Changed the respective document's `status` to `approved` and updated `updatedAt`. The existing approval changed `status` to `approved` and recorded `comment`, `decidedAt` and reviewer `decidedBy`. |
| Approvals | Send both document types back | Changed the respective document's `status` to `sent_back` and updated `updatedAt`. The existing approval changed `status` to `sent_back` and recorded the trimmed reason in `comment`, along with `decidedAt` and reviewer `decidedBy`. |
| Expense reports and travel requests | Correct a returned document | Changed the returned report or request's `businessPurpose` and `updatedAt`. Resubmission then changed the fields in the submission row and preserved the closed approval. |

---

## ❌ Bugs for Dev Agent

No reproducible bugs in the exercised controls or workflows.

## Visual Alignment Feedback

Reviewed locally captured screenshots of the workspace, both libraries, both creation forms, both owner details and the approvals list and detail against the site's original `DESIGN.md`. At 360 px, navigation and task controls wrapped within the viewport, and the scrollable table exposed its amount column. Screenshots and runner scratch files are gitignored.

---

## Round History

### Round 1

- All three SEED workflows passed.

## Harbor Docker dynamic certification

The repository certifier passed the production bundle in run `108068`. The local evidence is `factory/build/dyn_certify/108068/results.json`.

| Render | Sync | Idle | Hydrate |
| --- | --- | --- | --- |
| Pass | Pass (1 baseline POST) | Pass (0 idle POSTs) | Pass |
Injection reached `users → 0 → name`.
