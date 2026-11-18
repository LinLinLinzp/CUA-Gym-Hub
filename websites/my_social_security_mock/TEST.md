# my Social Security Mock — Test Report

> Round 2 · November 18, 2026  
> Server http://127.0.0.1:5512  
> Tested by the Playwright agent

WORKFLOWS: PASS

## Summary

| Metric | Count |
| --- | ---: |
| Account route patterns tested | 6 |
| Fallback route patterns tested | 1 |
| Interaction groups passed | 9 |
| Interaction groups failed | 0 |
| Desktop and mobile screenshots reviewed | 18 |
| Open bugs | 0 |

The full Chromium workflow suite passed on the Vite dev server and against the freshly built `dist/`. Playwright served the built files on the same local origin and sent Harbor requests to the live Vite state API. `npm run build` succeeded with two existing React Router module-directive warnings.

## ✅ Passing Tests

| Workflow and interaction | Fields verified through `GET /go?sid=…` |
| --- | --- |
| **Benefit statements** · Searched and filtered by year, switched statement types, reversed the sort, and opened a statement from the archive and Overview. The 2025 statement displayed nine estimates and 36 earnings rows. | Each explicit open appended one `statementActivity[]` entry with `id`, `statementId`, `kind`, `year`, `action: "viewed"`, `status: "completed"`, `actorId`, and `createdAt`. Filters and sorting made no business write. |
| **Tax benefit statements** · Searched for SSA-1099, filtered to 2023, and opened the result. Verified tax year, form, paid, repaid, and net values. An injected SSA-1042S rendered with unavailable amounts. | Each open appended the same `statementActivity[]` fields with the matching tax statement ID, kind and year. |
| **Statement PDFs and print** · Downloaded the statement and tax form and checked the filenames, PDF signature, selected content, and sample marking. The earnings PDF included the earliest year on a subsequent page. Verified print invocation and print layout. | Each action appended one `statementActivity[]` entry with the selected statement metadata. Download set `action: "downloaded"` and `status: "completed"`. Print set `action: "print_requested"` and `status: "requested"`. Rapid print clicks persisted two distinct events in order. |
| **Direct deposit change** · Exercised empty and invalid input, confirmation mismatch, masked review, Back, Cancel at both steps, Confirm, receipt Done, history sorting, and reload. | Confirm replaced `directDeposit` with `id`, `beneficiaryId`, `bankName`, `accountType`, `accountLast4`, `status: "active"`, and `updatedAt`. The same write appended one `directDepositChanges[]` receipt with `id`, `beneficiaryId`, `previousDestination`, `newDestination`, `changeType: "change"`, `status: "confirmed"`, `actorId`, and `createdAt`. The destination and receipt timestamps matched. Draft interactions and receipt dismissal left state unchanged. Full synthetic numbers were absent from POST bodies and local storage. |
| **Direct deposit setup** · Set up a checking destination in an unenrolled session and verified that a separate ineligible session explained unavailability. | Confirm changed the same two fields with `changeType: "setup"`, `previousDestination: null`, and `accountLast4: "0099"`. Cancel made no business write. |
| **Benefit Verification Letter** · Opened review from Overview and Letters, checked keyboard focus, canceled, generated, and reloaded the result. Tested receiving, pending, and not-receiving profiles. | Generation appended one `letters[]` record with `id`, `beneficiaryId`, `type: "benefit_verification"`, `title`, `status: "ready"`, `actorId`, `subjectName`, `benefitSnapshot`, `createdAt`, and `readAt`. The snapshot had `benefitStatus`, `benefitType`, and `monthlyBenefit`. The two timestamps matched. Review, Cancel, and reload made no business write. |
| **Letter PDF and print** · Downloaded the generated PDF and checked its filename, signature, subject, and sample marking. Invoked print for the selected letter. | Each action appended one `letterActivity[]` entry with `id`, `letterId`, `actorId`, and `createdAt`, plus `action: "downloaded"` / `status: "completed"` or `action: "print_requested"` / `status: "requested"`. |
| **Notices and archive** · Searched and filtered by type and read status, reset filters, reversed date sort, opened from Letters and Overview, and used Mark as read on a deep-linked notice. | Reading updated only the selected `letters[].readAt` and appended one `letterActivity[]` entry with `id`, `letterId`, `actorId`, `action: "marked_read"`, `status: "completed"`, and `createdAt` equal to `readAt`. Direct entry, reopening an already-read notice, and filtering made no business write. |
| **Payment history** · Filtered by year and reversed the sort. Verified gross, deductions, and net. | No business write. Deposit changes preserved the existing `payments[]` records. |

### Harbor and navigation

- Each committed action sent one complete `set_current` POST. The main test session retained its seed baseline, and the final diff contained exactly `statementActivity`, `directDeposit`, `directDepositChanges`, `letters`, and `letterActivity`.
- Direct endpoint requests verified `/state` readback, `/go` diff shape, isolation between session IDs, and baseline restoration after `reset`.
- The delayed-baseline regression passed in both modes. Opening a statement while the baseline POST was held left the baseline activity empty and persisted exactly one linked `viewed` event after release.
- Tested the skip link, masthead wordmark, active navigation, Overview shortcuts, deep links, reloads, unknown document IDs, and fallback links. Navigation preserved the session ID. An idle tab made no follow-up POSTs.
- Injected empty arrays, single records with omitted optional fields, and a 320-record archive. The app rendered each and preserved injected extension keys during writes.
- Browser requests stayed on the local origin. No page errors were reported, and the layout checks reported no console errors. The shared `dataManager.js` matched the template by SHA-256.

## ❌ Bugs for Dev Agent

No open bugs from this round.

## Visual Alignment Feedback

Reviewed the original design across account views at 1440px and 360px. The masthead, navigation, forms, and archive layouts fit both viewports. On mobile, payment dates initially split across lines. The corrected dates stayed on one line, and the payment table scrolled horizontally within its labeled region.

## Round History

### Round 1 → Round 2

- The startup write ordering fix passed again in development and with the built client.
- Fixed and retested the mobile payment date wrapping.
-

## Harbor Docker dynamic certification

The repository certifier passed the production bundle in run `103552`. The local evidence is `factory/build/dyn_certify/103552/results.json`.

| Render | Sync | Idle | Hydrate |
| --- | --- | --- | --- |
| Pass | Pass (1 baseline POST) | Pass (0 idle POSTs) | Pass |
Injection reached `statements → 0 → beneficiaryId`.
