# my Social Security Mock — Audit Report

> Round 1 · November 18, 2026  
> Audited by the audit agent

## Summary

| Category | Issues found | Open |
| --- | ---: | ---: |
| Dead handlers / stubs | 0 | 0 |
| Missing state tracking | 0 | 0 |
| Data pipeline gaps | 1 | 0 |
| Schema gaps | 1 | 0 |
| Total | 2 | 0 |

## P0 — Dead or broken code

### AUDIT-001 · Fixed a startup state write race

- **File** `src/utils/accountTransport.js` and `src/main.jsx`
- **Issue** A delayed startup `set` could reach the server after the first `set_current`. Opening a statement during startup left the event in the browser but erased it from `/go` and could record the mutated state as the baseline.
- **Fix** Pass the template's startup and user-action POSTs through one queue. The app can render and accept the first action while the baseline is in flight. Each response is consumed before dispatching the next POST.
- **Verification** Chromium held the baseline request, opened a statement, released the baseline, and checked `/go`. The baseline retained zero events and current state had exactly one linked `viewed` event. The test reproduced the loss before the fix and passed afterward in development and with the build.

## P1 — Incomplete features

No findings. Exercised statement and letter archive controls, document actions, direct deposit validation and confirmation, and the corresponding structured writes.

## P2 — Minor issues

### AUDIT-002 · Added missing verifier examples

- **File** `SCHEMA.md`
- **Issue** The schema lacked a concrete injection example, default record IDs, and reset semantics.
- **Fix** Added endpoint details, representative seed IDs, and a usable single-record fixture. The write mapping remains aligned with the store.

## Data Pipeline Status

| Component | Status | Verification |
| --- | --- | --- |
| Shared `dataManager.js` | Pass | SHA-256 matched the repository template. |
| Account state sync | Pass | Committed actions submitted full state in order. Filter, draft, reload, and idle interactions produced no business writes. |
| Vite `/post` and `/state` | Pass | Injection and update were readable by session. Reset restored the baseline, as implemented by the shared Harbor template. |
| Vite `/go` | Pass | Baseline, current state, and exact changed keys matched the tested actions. |
| Session isolation | Pass | Separate session IDs held separate state and were preserved through navigation. |
| Initial state | Pass | Baseline stayed stable after `set` and `set_current`, including with a delayed startup POST. |
| Injected data | Pass | Empty, single-record, and 320-record collections and omitted optional fields rendered locally. |
| Offline assets and design | Pass | The browser made only local requests. Desktop and 360px overview captures used the original illustration, text wordmark, and design palette. |
| Schema | Pass | Top-level state, record shapes, seed IDs, and observable writes are documented. |

## SCHEMA.md Updates

Added endpoint operations, seed ID ranges, and a minimal injected statement fixture. See [TEST.md](TEST.md) for workflow coverage and verification modes.
