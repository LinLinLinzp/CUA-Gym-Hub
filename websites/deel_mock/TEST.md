# Deel Mock — Test Report

> Round: 2  
> Date: 2026-11-18  
> Server: http://127.0.0.1:5396  
> Tested by: playwright agent

WORKFLOWS: PASS

## Summary

| Metric | Count |
| --- | ---: |
| URLs tested with direct navigation and hard reload | 14 |
| Successful workflow mutations verified in `/go` | 14 |
| Passing check groups | 12 |
| Failed check groups | 0 |

Browser checks used the installed Chromium and Node Playwright from `PILOT_PLAYWRIGHT`. `npm run build` passed, and `src/utils/dataManager.js` matched the Harbor template byte for byte.

## ✅ Passing Tests

- **Overview and navigation** — Verified the seed counts and status mixes, queue shortcuts, active-agreement link, leave shortcuts, main navigation, Deel home link, keyboard skip link, and hover feedback. Links and hard reloads retained `sid`.
- **Contracts** — Verified search, status and contract-type filters, sort, pagination, related invoices, required fields, and the agreement, terms and review steps. Created a fixed-rate draft with a new contractor, edited it after reload, signed and sent it, dismissed cancellation with Escape and checked focus, then confirmed cancellation. Added and removed milestones, directly sent a two-milestone agreement that reused a contractor by email, directly sent a pay-as-you-go agreement with a new contractor, and saved a pay-as-you-go draft without a rate.
- **Invoices** — Verified search, status and currency filters, sort, selection and clearing, related agreements, and individual and filtered CSV contents. Reviewed two USD invoices across filtered views, confirmed that a EUR invoice could not join the selection, cancelled the review, then released the USD batch. Reloaded its detail and separately released a EUR invoice.
- **Time off** — Verified the Requests, Balances and Team calendar views, search, filters, pagination and month navigation. Rejected reversed dates, employee overlap and a multi-day half day. Submitted a half day, amended it to three weekdays after reload, and withdrew it. Approved a pending request from the Overview queue, checked the updated balance after reload, and denied a second request with a reason.
- **Injected worlds and isolation** — Verified empty lists and forms, missing records, sparse records with unresolved links, pagination and search with 220 injected contracts, and separate session IDs. Verified that repeated `set` and `set_current` preserved `initial_state` and `reset` restored it with an empty `state_diff`.
- **Read-only and idle behavior** — Searches, filters, pagination, opening and cancelling forms and reviews, exports, and calendar navigation added no business writes. Observed one baseline `set` and zero `set_current` requests from an idle tab while another tab in the same session approved leave. The approval persisted in `/go`.

### Observable state changes verified through `/go`

Each successful action produced exactly one `set_current`. The checks compared records immediately before and after the action and verified the corresponding `state_diff` entries. Every mutation appended an `activity[]` record with `id`, `action`, `entityType`, `entityId`, `actorId`, `createdAt` and `relatedIds`. The actor was `usr-jordan` and the timestamps were ISO strings.

| Workflow action | Appended or changed business fields | Activity action |
| --- | --- | --- |
| Save a new contract draft | Appended the contract record listed below with `status=draft`. The new-contractor case appended a linked worker. | `contract.created` |
| Edit a contract draft | Changed `contracts[].title`, `rate` and `updatedAt` on the same ID. | `contract.updated` |
| Sign and send a draft | Changed `contracts[].status=pending_signature`, `clientSignedAt`, `sentAt` and `updatedAt`. | `contract.sent` |
| Sign and send a new contract | Appended the contract record listed below with `status=pending_signature` and signature timestamps. Verified `milestones[].title/amount/dueDate` and existing `workerId` reuse. The fresh-email case appended a linked worker. | `contract.sent` |
| Cancel a pending contract | Changed `contracts[].status=cancelled`, `cancelledAt` and `updatedAt`. | `contract.cancelled` |
| Release invoices in a batch or individually | Changed each selected `invoices[].status=processing`, `paymentId` and `updatedAt`. Appended `payments[].id`, `invoiceIds[]`, `allocations[]` with `invoiceId`, `workerId` and `amount`, plus `amount`, `currency`, `method`, `status`, `createdBy` and `createdAt`. | `payment.released` |
| Submit time off | Appended `timeOffRequests[].id`, `workerId`, `type`, `status=pending`, `startDate`, `endDate`, `duration`, `days=0.5`, `note`, `createdBy`, `createdAt`, `updatedAt` and nullable `reviewedBy`, `reviewedAt`, `decisionNote` and `cancelledAt`. | `time_off.requested` |
| Amend time off | Changed `timeOffRequests[].duration`, `endDate`, `days=3`, `note` and `updatedAt` on the same ID. | `time_off.edited` |
| Withdraw time off | Changed `timeOffRequests[].status=cancelled`, `cancelledAt` and `updatedAt`. | `time_off.cancelled` |
| Approve time off | Changed `timeOffRequests[].status=approved`, `reviewedBy`, `reviewedAt` and `updatedAt`. | `time_off.approved` |
| Deny time off | Changed `timeOffRequests[].status=denied`, `reviewedBy`, `reviewedAt`, `decisionNote` and `updatedAt`. | `time_off.denied` |

New `contracts[]` records contained `id`, `number`, `workerId`, `legalEntityId`, `title`, `scope`, `type`, `status`, `currency`, `rate`, `rateUnit`, `milestones`, `startDate`, `endDate`, `noticeDays`, `createdBy`, `createdAt`, `updatedAt`, `clientSignedAt`, `contractorSignedAt`, `sentAt` and `cancelledAt`.

New `workers[]` records contained `id`, `name`, `email`, `type`, `country`, `role`, `team`, `legalEntityId`, `annualVacationDays`, `createdBy` and `createdAt`.

## ❌ Bugs for Dev Agent

No open bugs from this round.

## Visual Alignment Feedback

Reviewed locally captured screenshots of the Overview, Contracts, contract editor, Invoices, Time off requests, and Team calendar at 1440 px. The original Northstar Studio workspace uses a plain-text Deel wordmark, local CSS artwork, and system fonts. At 390 px, wide tables scrolled inside their panels without page-level horizontal overflow.

## Round History

### Round 1 → Round 2

- **AUDIT-001 (P0) — Fixed.** Held the first payment POST open while confirming the same invoice in a second tab of the same Chromium context. The second confirmation was rejected and emitted no business POST. A third, stale tab approved a time-off request, and `/go` retained the original invoice `paymentId`, payment record and activity alongside the approval.
- **AUDIT-002 (P1) — Fixed.** An injected Friday–Monday approval appeared in the monthly list and on Friday and Monday only. The calendar emitted no business POST.
- Corrected singular milestone labels in the contract terms display.

## Harbor Docker dynamic certification

The repository certifier passed the production bundle in run `144844`. The local evidence is `factory/build/dyn_certify/144844/results.json`.

| Render | Sync | Idle | Hydrate |
| --- | --- | --- | --- |
| Pass | Pass (1 baseline POST) | Pass (0 idle POSTs) | Pass |
Injection reached `legalEntities → 0 → name`.
