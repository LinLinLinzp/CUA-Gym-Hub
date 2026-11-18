# Venmo Mock — Audit Report

> Round: 1  
> Date: 2026-11-18  
> Audited by: audit agent

## Summary

| Category | Issues |
| --- | ---: |
| Dead handlers / stubs | 0 |
| Missing state tracking | 1 |
| Data pipeline gaps | 0 |
| Schema mismatches | 0 |
| Incomplete UI and fixture issues | 2 |
| Design alignment | 1 |
| Total | 4 |

The production build and both existing Chromium suites passed on port 5331. Normal payment, request, split and statement actions reached `/go`. Focused browser checks reproduced three issues beyond those suites. Source inspection found a design mismatch.

## P0 — Dead/Broken Code (must fix before testing)

### AUDIT-001 · Reload can lose a confirmed state write

- **Files** `src/utils/stateTransport.js:19`, `src/store.jsx:11`, `src/pages.jsx:310`
- **Issue** The store updates local state immediately. When a previous POST acknowledgement is pending, the next POST waits in a page-local promise queue while the next action can already report success. Reloading discards the queued send. The reloaded app reads the newer local snapshot without syncing it back to the server.
- **Reproduction** On Statements in Chromium, forward the first export write to the localhost server and hold its successful response. Download a second CSV and reload before releasing the response. Both CSVs download and the browser cache contains two exports after reload. `/go.current_state.statementExports` and `/go.state_diff.statementExports.modified` each contain one export. Chromium made one state POST.
- **Fix** Keep the shared data manager unchanged. Have the store wait for acknowledgement before reporting success for the corresponding snapshot. Preserve write order, surface failed writes with a retry path, and cover a rapid reload after the success message. Use the same acknowledgement path for payments, requests, splits and statements.

## P1 — Incomplete Features

### AUDIT-002 · Seeded paid request opens another request’s payment

- **File** `src/data/seed.js:75`
- **Issue** `request_013` and `request_014` both assign `payment_072`. The second assignment overwrites the first payment’s counterparty, amount and `requestId`. Chromium reproduced the round trip from `/requests/request_013` through **View payment** and **View request** to `/requests/request_014`.
- **Fix** Assign a distinct fixture payment to each of the four seeded paid requests. Check reciprocal IDs, payer and recipient direction, amounts and timestamps for every pair.

### AUDIT-003 · Splits list omits individual request statuses

- **File** `src/pages.jsx:244`
- **Issue** The list row displays participant count, date, amount and overall status. Chromium confirmed that the individual Pending and Cancelled statuses for a partially settled split appear only on its detail page. TODO P1.3 requires each linked request’s status in both views.
- **Fix** Display each linked participant and request status in the list row using the same lookup and missing-record behavior as the detail view.

### AUDIT-004 · Form labels and balance artwork differ from the design

- **Files** `src/styles.css:66`, `src/styles.css:86`, `src/styles.css:110`, `DESIGN.md`
- **Issue** The design specifies weight 600 for row titles and form labels, which use 650 in CSS. It also specifies `.22` opacity for the balance card circles, which use `.28`.
- **Fix** Apply the documented values to the affected selectors.

## P2 — Minor Issues

None found.

## Data Pipeline Status

| Component | Status | Notes |
| --- | --- | --- |
| `dataManager.js` | ✅ | SHA-256 matches the shared template. Boot waits for loaded state before mounting routes. |
| Store state sync | ⚠️ | One full snapshot per validated action. An unacknowledged queued write can be dropped on reload. |
| `/post` and `/state` | ✅ | Verified injection, current-state update and reset through the unchanged shared middleware. |
| `/go` | ✅ | Returned the expected initial snapshot, current snapshot and top-level diff. |
| Session isolation | ✅ | Fresh SIDs remained isolated. Router links and direct routes preserved `?sid=`. |
| Initial snapshot | ✅ | Later writes preserved the initial snapshot. Reset restored it, as implemented by the shared Harbor middleware. |
| Injected worlds | ✅ | Chromium rendered empty arrays, sparse records and 330 activity records. Direct links and hard refresh passed. |
| Offline and idle | ✅ | Browser requests stayed on localhost. An idle tab made no POSTs after boot. The statement timer only revokes a local Blob URL. |
| `SCHEMA.md` | ✅ | Documented seven top-level keys, record shapes and all eight mutation paths. |

## SCHEMA.md Updates

Added the local endpoint reference, fixed-ID ranges, minimal injection payload and reset behavior. The eight observable action mappings reflect the implementation. Docker dynamic certification is handled by the parent runner.
