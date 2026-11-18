# VA.gov Mock — Audit Report

> Round 1  
> Date 2026-11-18  
> Audited by the audit agent

The three Round 1 findings below were fixed and retested in Round 2. See [TEST.md](TEST.md) for the verification results.

## Summary

| Category | Issues |
| --- | ---: |
| Dead handlers / stubs | 0 |
| Missing state tracking | 0 |
| Data pipeline gaps | 1 |
| Schema mismatches | 0 |
| Injected record routing | 1 |
| Keyboard focus | 1 |
| Total open | 3 |

The standard Playwright suites passed on Vite and against `dist/` with the localhost Harbor middleware. All four SEED workflows persisted structured records through `/go`. The app uses the VA.gov text wordmark, local icons, and original CSS artwork. The build passed and Chromium made no off-origin requests in either suite.

## P0 — Dead/Broken Code

### AUDIT-001 · A stale tab can erase a confirmed action

- **Files** [`src/state.jsx:10`](src/state.jsx#L10), [`src/utils/dataManager.js:64`](src/utils/dataManager.js#L64)
- **Reproduction** Open `/prescriptions/rx-101` and `/payments/copays/copay-101` in two tabs under the same SID before making any changes. Confirm a refill in the first tab and verify the pending request in `/go`. Confirm the copay payment in the already-open second tab. Both mutation responses succeed. The copay becomes paid and the pending refill disappears from `current_state.refillRequests`.
- **Cause** `Store.apply` uses a tab-local snapshot. The second action sends the whole snapshot through the shared client helper, overwriting the earlier refill.
- **Fix** Reconcile same-SID state in the central store before applying an action. Refresh or reject a stale review when its relevant fields changed. Keep the template helper intact and preserve zero mutation posts from passive tabs. Verify that two confirmed actions from already-open tabs both survive in `/go`.

### AUDIT-002 · Some injected IDs open the wrong record or workflow

- **Files** [`src/records.js:1`](src/records.js#L1), [`src/App.jsx:25`](src/App.jsx#L25), [`src/pages/Claims.jsx:96`](src/pages/Claims.jsx#L96)
- **Reproduction** Inject claim IDs `new`, `ref%2Falpha`, `ref/alpha`, and `..`. From the list, `new` opens the claim application. The link for `ref%2Falpha` opens the `ref/alpha` detail. The link for `..` opens the overview. The same destinations appeared after hard reload. A claim with a normal ID opened its own detail.
- **Cause** The string ID occupies the same path segment as static actions such as `new`. Router decoding also conflates the literal `%2F` token with a slash, and the browser normalizes dot segments.
- **Fix** Give record lookup an unambiguous route or a reversible URL representation, while preserving existing deep links for ordinary IDs and keeping the SID. Add coverage for all four injected IDs and for identical lookup after reload.

## P1 — Incomplete Features

### AUDIT-003 · Focus is lost when confirmation removes the dialog trigger

- **Files** [`src/components/ui.jsx:52`](src/components/ui.jsx#L52), [`src/pages/Prescriptions.jsx:57`](src/pages/Prescriptions.jsx#L57), [`src/pages/Appointments.jsx:59`](src/pages/Appointments.jsx#L59)
- **Reproduction** Open the refill review for `rx-101` and confirm. The persisted request removes the initiating button and Chromium has no focused control. Escape dismissal restores focus correctly while the trigger remains mounted. Appointment cancellation uses the same dialog cleanup and removes its trigger after confirmation.
- **Fix** When the trigger disappears, move focus to the resulting confirmation or a stable detail heading. Retest confirmation and Escape with the keyboard.

## P2 — Minor Issues

None found.

## Data Pipeline Status

| Component | Status | Notes |
| --- | --- | --- |
| `dataManager.js` | Pass | SHA-256 matched the supplied template. |
| Store state sync | Open | All seven standard actions persisted. An already-open same-SID tab can overwrite an earlier action. |
| Vite `/post` and `/state` | Pass | Fresh SID lookup, set, merged update and reset behaved as expected. |
| Vite `/go` | Pass | Verified initial, current, and top-level diff for all four workflows. |
| Session isolation | Pass | Separate SIDs preserved separate state. Router links retained the active SID. |
| Initial snapshot | Pass | `set_current` preserved an existing baseline. `reset` restored it and cleared the diff. |
| Timer and asset checks | Pass | No idle mutation posts or remote assets. The download timer only revokes a local Blob URL. |
| Injected state | Open | Empty arrays, missing optional fields, orphaned relationships and 215 claims rendered. Some string identifiers route incorrectly. |
| `SCHEMA.md` | Updated | All 14 root keys and all seven mutation paths match the implementation. |

## SCHEMA.md Updates

Added the localhost API reference, reset behavior, fixed seed IDs, and a minimal injected-state example. The existing record shapes and state-write mappings matched the code.
