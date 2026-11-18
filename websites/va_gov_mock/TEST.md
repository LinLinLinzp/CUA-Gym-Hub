# VA.gov Mock — Test Report

> Round: 2  
> Date: 2026-11-18  
> Server: http://localhost:5534  
> Tested by: playwright agent

WORKFLOWS: PASS

## Summary

| Metric | Count |
| --- | ---: |
| Standard account routes tested | 13 |
| Additional route patterns tested | 2 |
| SEED workflows passed | 4 of 4 |
| Audit regressions passed | 3 of 3 |
| Failed checks | 0 |

`npm run build` passed. The Playwright suites passed with the installed Chromium on Vite and on the built `dist/` assets using the localhost Harbor middleware. Browser traffic stayed on localhost. The parent runner handles Docker dynamic certification.

## ✅ Passing Tests

## Observed state changes

Each confirmed action below produced one whole-state `set_current` request. Chromium verified the results through `GET /go?sid=...` using fresh browser contexts and SIDs. The main scenario produced seven mutation requests.

| Workflow | Verified behavior | Observed persisted state |
| --- | --- | --- |
| Claims | Paginated forward and back, searched by ID without case sensitivity, filtered by status, viewed an evidence request, and downloaded a decision letter. Rejected blank condition and unsigned acknowledgment. Tested adding and removing a condition and returning from review before submitting two conditions. Rejected an unsupported and an oversized file before submitting a replacement TXT file. | `claims[]` gained `id, type: disability_compensation, reason: new_condition, conditions, status: received, acknowledged: true, actorId, createdAt, updatedAt, history[]`. The initial history entry held `status, actorId, createdAt`. `claimEvidence[]` gained `id, claimId, fileName, mimeType, sizeBytes, documentType, status: submitted, actorId, createdAt`. The linked claim's `updatedAt` matched the evidence timestamp. |
| Appointments | Searched upcoming visits by facility. Verified Escape dismissal and focus restoration, then confirmed a request with a future preferred time. Located it under Requests, canceled it, and found the same visit under Past. Checked eligibility and separately canceled a scheduled visit with no reason. | `appointments[]` gained `id, facilityId, clinic, visitType, preferredDate, preferredTime, reason, status, actorId, createdAt, updatedAt`. Both confirmed cancellations updated the existing record with `status: canceled, canceledAt, canceledBy, cancelReason, updatedAt` and preserved visit details. |
| Prescriptions | Searched by Rx number, filtered by refill availability, opened shipment tracking, dismissed a review, then confirmed a refill. Reloaded to verify the pending status and unavailable refill action. | `refillRequests[]` gained `id, prescriptionId, quantity: 1, status: requested, actorId, createdAt`. The original `prescriptions[]` array, including remaining refills, was identical to the baseline. |
| Payments | Filtered payments by benefit type and year, confirmed a masked deposit destination change, and checked the historical payment still displayed its original destination. Filtered copays, dismissed a payment, then paid the full balance and reloaded the receipt. | `directDeposits[]` retained the existing ID and updated `destinationId, status, actorId, updatedAt`. `directDepositChanges[]` gained `id, directDepositId, benefitGroup, previousDestinationId, destinationId, status, actorId, createdAt`. `benefitPayments[]` was unchanged. `copayPayments[]` gained `id, billId, amount: 23.50, currency, method, status, actorId, createdAt`. The linked bill kept its charges and updated `status: paid, balance: 0, paidAt, updatedAt`. |

## Harbor and account checks

- Account boot loaded the expected fixed fixture counts. The copied client helper matched the template SHA-256 hash.
- Verified direct routes, reloads, missing pages and records, SID-preserving links, and keyboard access through the skip link and mobile navigation.
- Verified zero mutation posts during navigation, filtering, validation failures, dismissals, downloads, review steps, and a 2.2-second idle observation.
- Isolated empty and sparse injected worlds rendered without browser errors. A 215-claim world paginated and reset after search. An orphaned facility and missing history displayed readable fallbacks.
- First-time direct deposit setup generated a stable group ID, saved a null previous destination, used the injected actor, and preserved unrelated injected data.
- Verified `/post` set, set_current and reset in a separate SID through `/go`. Reset restored the baseline and cleared the diff. The other SID retained its own data.
- Captured all 13 standard views at 1280px and 390px. Checked one visible H1 and wordmark per page, no horizontal overflow, and no browser errors at either width. Reviewed representative screenshots against the original local design brief, including the overview, claims list, appointment list, prescription detail and copay detail.

## ❌ Bugs for Dev Agent

No open issues from the tested scenarios.

## Round History

### Round 1 → Round 2

- AUDIT-001 fixed. Opened the prescription and copay tabs under the same SID before confirming either action. After confirming the refill and then paying the copay, `/go` retained both records and showed `refillRequests`, `copayBills`, and `copayPayments` in `state_diff`.
- AUDIT-002 fixed. Clicked records with IDs `new`, `NEW`, `ref%2Falpha`, `ref/alpha`, `..`, and `.`. Verified each exact record and SID before and after reload. The existing `/claims/new` link still opened the application.
- AUDIT-003 fixed. Confirming a refill or appointment cancellation moved focus to the detail heading when the trigger disappeared. Dismissing the dialog restored focus to its trigger.

## Harbor Docker dynamic certification

The repository certifier passed the production bundle in run `143508`. The local evidence is `factory/build/dyn_certify/143508/results.json`.

| Render | Sync | Idle | Hydrate |
| --- | --- | --- | --- |
| Pass | Pass (1 baseline POST) | Pass (0 idle POSTs) | Pass |
Injection reached `facilities → 0 → name`.
