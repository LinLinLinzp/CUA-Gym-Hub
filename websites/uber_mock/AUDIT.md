# Uber Mock — Audit Report

> Round 1  
> November 18, 2026  
> Audited by audit agent

## Summary

| Category | Issues |
| --- | ---: |
| Dead handlers / stubs | 0 |
| Missing state tracking | 0 |
| Data pipeline gaps | 1 |
| Incomplete behavior | 1 |
| Outstanding schema mismatches | 0 |
| Total | 2 |

## P0 — Dead or broken code

### AUDIT-001 · A fare review can persist a charge from a different trip · Resolved on 2026-11-18

- **Files** `src/account.jsx:71`, `src/pages/Trips.jsx`, `src/pages/Refunds.jsx`.
- **Reproduction** Inject completed `selected-trip` with `receiptId: "other-receipt"`. Set `other-receipt.tripId` to `other-trip` and add `correct-receipt` with `tripId: "selected-trip"`. Open `/trips/selected-trip`. The receipt link opens `other-receipt`. Start a fare review from the selected trip and submit a charge. `/go` records `tripId: "selected-trip"`, `receiptId: "other-receipt"` and a charge from `other-trip`.
- **Fix** In the shared resolver, reject an explicit receipt when its `tripId` is present and points at a different trip. Use a receipt whose `tripId` matches the selected trip as the fallback. With no consistent receipt, omit the fare-review action. Cover both cases while preserving the supported path for partial records.

## P1 — Incomplete features

### AUDIT-002 · List order uses timestamp text instead of chronological time

- **File** `src/account.jsx:63`, shared `newest` helper.
- **Reproduction** Inject a trip at `2026-11-16T10:00:00+02:00` and one at `2026-11-16T09:00:00Z`. The first trip appears above the second in `/trips`, even though it occurred an hour earlier. Receipts, support histories and trip pickers share the helper.
- **Fix** Sort by the parsed instant descending, with missing or invalid timestamps last and stable ordering for ties.

## P2 — Minor issues

None found in the audited scope.

## Local browser evidence

`npm run build` passed. The flows below passed in installed Chromium using Vite preview on `http://localhost:5320`, with all off-origin requests blocked. No browser page exceptions or off-origin requests were observed. The tested pages fit at viewport widths of 360, 601, 850 and 1280 pixels. The existing `TEST.md` covers standard acceptance flows. The two findings above come from additional injected-state cases.

| Flow | Evidence |
| --- | --- |
| Trips | Found Ferry Building by search and status. Changed `trip_001` to `profile_002`. `/go` recorded `expenseProfileId` and the assignment with previous profile, actor, status and timestamp. Reload showed Studio travel. Receipt snapshots matched the initial receipts. Escape restored focus to the assignment trigger. |
| Receipts | Opened `receipt_001` from the trip and found it again with destination, billed profile and date filters. Chromium downloaded a PDF whose content included the itemized fare, booking fee and $22.40 total. `/go` held both linked actions and the resend recipient. |
| Expense profiles | Opened an archived profile, checked invalid form feedback, then created and edited a business profile. `/go` retained the same ID and `createdAt`, with the final name, address, payment ID, report frequency, provider, update time and actor. |
| Lost items | Picked `trip_001` from search, rejected an invalid phone number, submitted a case and found it in filtered history. `/go` recorded the submitted category, callback, description and reporter, then `returned`, `resolvedAt`, `resolvedBy` and `updatedAt` after confirmation. |
| Refunds | Started from `trip_001`, checked the per-line and total limits, and requested $13.75 across two eligible charges. `/go` showed the receipt, trip, reason, requester, currency, charge IDs, quantities and amounts. Found the request through filtered history and confirmed withdrawal, including actor and timestamp in `/go`. |
| Harbor state | Observed one baseline `set` and nine workflow `set_current` POSTs in the primary tab. `/go` retained the same `initial_state` and reported exactly the five expected changed keys. A second tab opened a saved deep link for the same session, and the settled primary tab made no POST over 3.5 seconds. A different `sid` retained its independent state. Empty collections, single partial records and 360 records per main collection rendered. Large lists showed 12 rows and expanded to 24. |

## Data Pipeline Status

| Component | Status | Notes |
| --- | --- | --- |
| `dataManager.js` | ✅ | SHA-256 matches the shared template. The Harbor template writes to session-keyed local storage and posts immediately on business actions. |
| Account provider | ✅ | Routes mount after `loadState`. All business actions use the same full-state save path. Source review found no timer-driven mutations. |
| Vite `/post`, `/state`, `/go` | ✅ | Shared `stateApi` is installed for development and preview. Injection and full-state writes worked on built preview. |
| Session isolation | ✅ | Navigation and reload retained `sid`. A separate session did not inherit the primary session's actions. |
| Initial state handling | ✅ | The baseline stayed intact through user actions. Shared `reset` restores the baseline or seed. |
| Record relationships | ⚠️ | `AUDIT-001` reproduces a cross-trip charge link when injected IDs disagree. |
| Offline assets | ✅ | The UI uses system fonts, CSS route art, local line icons and bundled PDF code. |
| `SCHEMA.md` | ✅ | Documents the actual state shape and all nine business actions. |

## SCHEMA.md Updates

Added the local endpoint contract and reset behavior, explicit key types, seeded ID ranges, a minimal injected world and the verifier diff format. Documented receipt action status pairs, nullable action trip IDs and UI interactions that leave business state untouched.

## P0 audit replay, 2026-11-18

- **AUDIT-001 · Fixed and retested.** A corrupted receipt link could no longer save a charge from another trip. The existing edge runner still reports the separate P1 timestamp-offset ordering failure.

Docker dynamic certification run `188924` recorded render pass, sync pass (1 startup POST), idle pass (0 idle POSTs), and hydrate pass.
