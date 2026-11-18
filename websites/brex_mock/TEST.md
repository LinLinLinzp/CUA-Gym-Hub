# Brex Mock — Test Report

> Round: 2  
> Date: 2026-11-18  
> Server: http://localhost:5405  
> Tested by: playwright agent

WORKFLOWS: PASS

## Summary

| Metric | Count |
| --- | ---: |
| Routes tested | 10 |
| Elements tested | 26 |
| ✅ Passed | 26 |
| ❌ Failed | 0 |
| ⚠️ Skipped (out of scope) | 0 |

Routes count the five landing pages, four parameterized detail routes, and the unknown-path fallback. Test totals count 20 mutation checkpoints and six groups of additional checks. The workflow suite passed with Vite dev assets and with the built `dist/` assets served through Playwright on the same localhost origin. Both runs used the Vite state API. `npm run build` passed.

---

## ✅ Passing Tests

### Seed workflows and fields observed via `/go`

After each browser action, the suite fetched `/go?sid=<test-id>`, compared the current state with the preceding snapshot, and verified the affected collection and record ID. Each mutation produced one full-state `set_current` POST and appended one `activity[]` entry with the corresponding action code, target, actor, and ISO timestamp. Creation fields are `createdBy` and `createdAt`. Update fields are `updatedBy` and `updatedAt`.

| Workflow | Browser action and activity code | Record fields written |
| --- | --- | --- |
| Cards | Issue a virtual card · `card.issued` | Appended `cards[]` with `id`, `name`, `holderId`, `limitId`, `format`, `last4`, `status`, and creation fields. |
| Cards | Lock with a reason · `card.locked` | Set `cards[].status` to `locked` and wrote update fields. Activity recorded the status transition and trimmed reason. |
| Cards | Reload and unlock · `card.unlocked` | Set the same card's `status` to `active` and wrote update fields. |
| Cards | Change spend limit · `card.limit_changed` | Set `cards[].limitId` and wrote update fields. Activity recorded the prior and new limit IDs. |
| Cards | Confirm cancellation · `card.canceled` | Set `cards[].status` to `canceled` and wrote update fields. The assigned limit stayed visible in the canceled card detail. |
| Expenses | Submit a GBP reimbursement · `expense.submitted` | Appended `expenses[]` with `id`, `kind`, `merchant`, `employeeId`, `amount`, `currency`, `transactionDate`, `category`, `memo`, `limitId`, `cardId: null`, `status: pending_review`, and creation fields. |
| Expenses | Clear the memo · `expense.memo_updated` | Set `expenses[].memo` to an empty string and wrote update fields. Activity recorded the prior and new memo. |
| Expenses | Approve the reimbursement · `expense.approved` | Set `expenses[].status` to `approved` and wrote `reviewedBy`, `reviewedAt`, `reviewReason: null`, and update fields. Activity included the amount and currency. |
| Expenses | Deny a separate pending expense · `expense.denied` | Set `expenses[].status` to `denied` and wrote `reviewedBy`, `reviewedAt`, `reviewReason`, and update fields. |
| Receipts | Upload an unmatched PDF · `receipt.uploaded` | Appended `receipts[]` with `id`, `filename`, `fileUrl`, `mimeType`, `size`, `expenseId: null`, `status: unmatched`, and creation fields. The file retrieved from the saved URL matched the uploaded bytes. |
| Receipts | Match the receipt to the reimbursement · `receipt.matched` | Set `receipts[].expenseId`, set `status` to `attached`, and wrote update fields. The expense showed the attached file. |
| Receipts | Remove it from the expense detail · `receipt.removed` | Set `receipts[].expenseId` to null, set `status` to `removed`, and wrote update fields. Activity retained the former expense ID, and the expense showed a missing receipt. |
| Receipts | Drop a file in Attach receipt · `receipt.attached` | Appended `receipts[]` with file metadata, the reimbursement `expenseId`, `status: attached`, and creation fields. The expense displayed the new attachment. |
| Limits | Create a CAD limit · `limit.created` | Appended `limits[]` with `id`, `name`, `ownerId`, `amount`, `currency`, `recurrence`, `status: active`, and creation fields. |
| Limits | Edit the limit · `limit.updated` | Set `limits[].name`, `ownerId`, `amount`, `recurrence`, and update fields. The currency remained CAD. |
| Limits | Request two increases · `limit.increase_requested` | Appended two `limitIncreaseRequests[]` records in separate commits. Each contained `id`, `limitId`, `requestedBy`, `additionalAmount`, `currency`, `reason`, `status: pending`, and creation fields. |
| Limits | Approve the first increase · `limit.increase_approved` | Set the request's `status` to `approved` and wrote `decidedBy`, `decidedAt`, and `decisionReason: null`. The same commit increased `limits[].amount` from CAD 210.15 to CAD 232.52 and wrote limit update fields. |
| Limits | Archive the limit · `limit.archived` | Set `limits[].status` to `archived` and wrote update fields. The Archived filter showed the limit and the issue-card selector excluded it. |
| Limits | Deny the remaining increase on the archived limit · `limit.increase_denied` | Set the request's `status` to `denied` and wrote `decidedBy`, `decidedAt`, and `decisionReason`. The cap remained CAD 232.52. |

### Additional checks

- **Overview.** Verified spend totals, currency changes, pending and missing-receipt links, recent-expense detail links, shortcuts, and return via the Brex wordmark.
- **Ledgers.** Verified search, status, card and limit relationships, card format, receipt presence and tabs, recurrence, expense sorting, pagination in both directions, clear filters, and no-result feedback. Verified related-record links, a seeded receipt download, and primary-button hover feedback.
- **Validation and cancellation.** Missing required values, excess decimal precision, oversized numeric amounts, and invalid file types left `/go` unchanged. An intentional HTTP 503 preserved the upload draft and a retry succeeded. Back, Close dialog, and Escape canceled without a business write.
- **Keyboard and responsive UI.** Skip to content moved focus to the main workspace. Tab and Shift+Tab wrapped inside record details. Escape and dialog dismissal restored focus to the launching control. Mobile navigation and ledger scrolling worked at 390 px.
- **Harbor isolation and injection.** Reload preserved the detail and session. An independent session retained its 32 seeded cards. Injected empty arrays stayed empty, sparse records and absent relations rendered on all four details, a 375-record expense ledger paged and searched, and a custom top-level key survived business writes. The data manager matched the template byte for byte.
- **API lifecycle and request checks.** A separate edit produced a nonempty `state_diff`, a later `set` preserved the initial baseline, and `reset` restored it and cleared the diff. Idle observation produced zero state POSTs. Chromium reported zero uncaught page errors or external-origin requests. The unknown route offered a working return link.

---

## ❌ Bugs for Dev Agent

No open defects were observed in the tested workflows.

## Visual Alignment Feedback

Reviewed localhost Chromium captures of all five workspace areas and the mobile overview against the site's original design brief. The desktop ledgers and card overlay used the documented plum and lavender palette, text wordmark, and original CSS card art. At 390 px the overview stacked its panels and contained wide content in horizontal scroll regions.

## Round History

### Round 1 → Round 2

- Reconfirmed all 20 mutation checkpoints on the dev server and the production bundle. Added coverage for browser downloads, related navigation, the route fallback, hover feedback, mobile scroll, and direct Harbor baseline reset.

## Harbor Docker dynamic certification

The repository certifier passed the production bundle in run `121920`. The local evidence is `factory/build/dyn_certify/121920/results.json`.

| Render | Sync | Idle | Hydrate |
| --- | --- | --- | --- |
| Pass | Pass (1 baseline POST) | Pass (0 idle POSTs) | Pass |
Injection reached `members → 0 → name`.
