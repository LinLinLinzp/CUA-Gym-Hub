# Ramp Mock — Test Report

> Round: 2  
> Date: 2026-11-18  
> Server: http://localhost:5406  
> Tested by: playwright agent

WORKFLOWS: PASS

## Summary

| Metric | Count |
|--------|-------|
| Routes tested | 9, including the fallback |
| Seed workflows tested | 4 |
| ✅ Passed | 4 seed workflows, with 25 verified state writes in the main session |
| ❌ Failed | 2 injected bill edge cases |
| ⚠️ Skipped (out of scope) | Production integrations and Docker certification |

Round 2 used Windows Chromium via `PILOT_PLAYWRIGHT` on the localhost Vite dev server. `npm run build` passed with dependency-level React Router `use client` bundler warnings. Round 1 also exercised the production bundle through Vite preview on the same port.

## ✅ Passing Tests

| Surface | Observed result |
| --- | --- |
| Shell and navigation | Ramp title, Northline Studio identity, Avery Chen's Finance Admin role, live Overview counts, linked activity, deep links, missing-record views, reload, Back, and list filter restoration passed. All route patterns rendered and preserved `sid` at desktop and mobile widths. The brand link and unknown-route return link opened Overview. |
| Cards | Passed last-four search, status/type filters, and sort controls. Validated missing fields and excessive precision. Issued a card, changed limit and cadence, locked, unlocked, canceled termination, and then terminated. Confirmed visible history and that termination disables further status actions. Escape dismissed the dialog and restored focus. |
| Bill preparation and submission | Passed vendor/invoice search, vendor/status filters, amount sort, duplicate detection, chronology, positive quantities, add/remove lines, draft creation/editing, submission, rejection, rejected-bill editing, and resubmission. Observed line totals of 350.03 and 0.15 for fractional quantities, totaling 350.18. The rejected approval and its reason survived resubmission. |
| Bill payment | Passed review navigation, final approval, invalid past scheduling date, new scheduled payment, unschedule, reschedule, cancellation, and external settlement from both scheduled and approved bills. Settlement of a scheduled bill reused the payment ID and retained its scheduled date. |
| Spend and approvals | Passed completed queue/search/type/sort and new spend submission. At the exact 1,500 threshold the two reviewers appeared in the preview and snapshot. First approval left the source pending. The second approved it. A bill rejection required a reason and propagated to the bill. |
| Policy | Passed revision history display, receipt/memo mode changes, required thresholds, distinct reviewer validation, and publish for all three policy editors. New bill and spend submissions used revision 4. The earlier spend approval retained its revision 3 reviewers. A separate injected session without policies used the administrator fallback and stored null routing fields. |
| Harbor synchronization | One baseline `set` and 25 `set_current` writes for the main session, one per successful business action. Validation, navigation, filters, canceled dialogs, reload in the same context, and a 2.2 second idle interval produced zero additional writes. `/state` matched `/go.current_state`. |
| Injected state | Independent sessions passed with all arrays empty and with 311 cards plus a null entry, unknown statuses, null optional fields, and missing source records. A card mutation preserved the null entry, all other records, record-level custom data, and a top-level extra key. It did not affect the main session. Harbor reset restored `initial_state` and cleared `state_diff`. Browser errors and attempted runtime requests outside localhost were both zero. |
| Defaults | Checked deterministic generation, 36 cards, 36 bills including six drafts, 12 payments, 30 spend requests, 60 approvals, 24 people, 18 vendors, six policies, and nine editable policy revisions. Checked bill balance, linked vendors, approvals and payments, reviewer references, and pending approvals at steps zero and one. |

## Observed `/go` mutations

Every row also appended `activity[]` with `id`, `action`, `objectType`, `objectId`, `related`, `actorId`, `createdAt`, and `changes`. The table lists actual differing fields. Actor fields that were rewritten to the same value are detailed in [SCHEMA.md](SCHEMA.md).

| Action | Changed fields and appended record fields |
| --- | --- |
| `card.issued` | Appended `cards[]` with `id, name, holderId, type, last4, status, spentAmount, currency, createdAt, createdBy, limitAmount, limitCadence, updatedAt`. |
| `card.limit_updated` | `cards[].limitAmount, limitCadence, updatedAt`. Activity recorded previous and resulting values. |
| `card.locked`, `card.unlocked`, `card.terminated` | `cards[].status, updatedAt`. |
| `bill.created` | Appended `bills[]` with `id, currency, status, approvalId, paymentId, createdBy, createdAt, submittedAt, vendorId, invoiceNumber, invoiceDate, dueDate, memo, lineItems, amount, updatedAt`. Each line had `id, description, quantity, unitAmount, amount`. |
| `bill.updated` | Draft memo edit changed `bills[].memo, updatedAt`. Rejected quantity edit changed `bills[].lineItems, amount, updatedAt`. |
| `bill.submitted` | `bills[].approvalId, status, submittedAt, updatedAt`. Appended approval with `id, subjectType, subjectId, title, requesterId, amount, currency, status, reviewerIds, stepIndex, routing, decisions, createdBy, createdAt, updatedAt`. Activity had `related.approvalId`. |
| `approval.rejected` | `approvals[].decisions, status, updatedAt`. `bills[].status, updatedAt`. Decision fields were `id, stepIndex, reviewerId, actorId, decision, note, createdAt`. Activity linked both IDs. |
| `approval.approved` | Intermediate approval changed `approvals[].decisions, stepIndex, updatedAt` only. Final approval additionally changed `approvals[].status` and `status, updatedAt` on the linked bill or spend request. Activity linked both IDs. |
| `bill.payment_scheduled` | `bills[].paymentId, status, updatedAt`. Appended payment with `id, billId, amount, currency, scheduledDate, paidOn, createdBy, createdAt, status, method, updatedBy, updatedAt`. Activity had `related.paymentId`. |
| `bill.payment_unscheduled` | `bills[].paymentId, status, updatedAt`, `payments[].status, updatedAt`. Activity referenced the canceled payment. |
| `bill.paid` | Scheduled case changed `bills[].status, updatedAt` and `payments[].method, paidOn, status, updatedAt`. Approved case updated `bills[].paymentId, status, updatedAt` and appended a payment with the fields above. Both recorded `related.paymentId`. |
| `spend_request.submitted` | Appended `spendRequests[]` with `id, title, purpose, requesterId, department, amount, currency, status, createdBy, createdAt, updatedAt, approvalId` and an approval with the fields above. Activity had `related.approvalId`. |
| `policy.published` | `policies[].rules, updatedAt, version`. Appended `policyRevisions[]` with `id, policyId, version, rules, createdAt, createdBy`. Activity had `related.policyRevisionId`. |

## ❌ Bugs for Dev Agent

### AUDIT-001 · P1 · Invalid injected draft enters approval

| Field | Value |
|-------|-------|
| Route | `/bills/bad-draft` in an injected session |
| Element | Submit for approval |
| Action | Confirm submission of a $100 draft whose sole line has quantity zero and a $0 total. |
| Expected | Keep the draft editable and require valid, balanced line items before submission. |
| Actual | `/go` showed `bills[].status: pending_approval`, a linked `approvals[]` record with `amount: 100`, and the unchanged invalid line. |
| Console errors | None |
| Fix hint | Share form validation with `submissionProblem` and reconcile the amount in cents at submission. |

### AUDIT-002 · P1 · An existing paid record can be duplicated

| Field | Value |
|-------|-------|
| Route | `/bills/already-paid` in an injected session |
| Element | Mark paid externally and Schedule payment |
| Action | Confirm external settlement of an approved bill whose paid record links by `billId` and whose `paymentId` is absent. |
| Expected | Block creation of a second payment. |
| Actual | Both controls appeared. `/go` showed `bills[].status: paid`, `bills[].paymentId` pointing to the new payment, and two paid records for the same bill. |
| Console errors | None |
| Fix hint | Include live payments linked by `billId` in both the UI and mutation guards. |

## Visual Alignment Feedback

Checked 1440 px desktop and 390 px mobile captures against the local original design brief. The evergreen navigation, warm canvas, serif headings, compact tables, and CSS card illustration were visible. All nine route patterns stayed within the viewport width. [DESIGN.md](DESIGN.md)

## Round History

### Round 1 → Round 2

- AUDIT-001 and AUDIT-002 reproduced in separate injected state. Source references remain in [AUDIT.md](AUDIT.md).
- All four seed workflows passed again, with state changes confirmed through `/go`.

## Harbor Docker dynamic certification

The repository certifier passed the production bundle in run `46748`. The local evidence is `factory/build/dyn_certify/46748/results.json`.

| Render | Sync | Idle | Hydrate |
| --- | --- | --- | --- |
| Pass | Pass (1 baseline POST) | Pass (0 idle POSTs) | Pass |
Injection reached `people → 0 → name`.
