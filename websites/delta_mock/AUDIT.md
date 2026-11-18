# Delta Mock — Audit Report

> Round 1 · November 18, 2026 · Audit agent

## Summary

| Category | Open issues |
| --- | ---: |
| Dead handlers and stubs | 0 |
| Missing business record fields | 0 |
| Data pipeline gaps | 2 |
| Schema mismatches after audit update | 0 |
| Design alignment | 1 |
| Total | 3 |

The standard Chromium workflow suite passed at `http://localhost:5323/`. Two targeted persistence checks reproduced silent loss of confirmed actions. [TEST.md](TEST.md)

## P0 — Dead or broken code

### AUDIT-001 · A stale browser context can erase a confirmed action

- **File** [src/store.jsx](src/store.jsx#L10)
- **Impact** The commit path reads the browser context's local cache and writes a complete snapshot. When two browser contexts use the same session ID, each can apply valid changes to an outdated snapshot. The last write can erase a prior action and its related records.
- **Reproduction** Open Seattle and Denver cancellation reviews in separate Chromium contexts with the same fresh `sid`. Confirm Seattle and wait for the successful response. Confirm Denver. Both contexts report success, but `/go` shows Seattle as `confirmed` again, with its cancellation action and eCredit gone. Only Denver's cancellation and refund remain.
- **Fix** Revalidate against authoritative session state and preserve earlier committed changes when writing. Test sequential stale reviews in separate contexts and out-of-order responses from overlapping saves. Keep both repository templates unchanged.

### AUDIT-002 · A failed state write still shows confirmation

- **Files** [src/store.jsx](src/store.jsx#L21), [src/utils/dataManager.js](src/utils/dataManager.js#L64)
- **Impact** `saveState` updates the local cache and posts asynchronously. The store proceeds immediately to confirmation, and its `try` block can only catch synchronous failures. The template swallows fetch rejection. A failed request can leave the browser showing a completed action after reload, while the verifier sees the original state.
- **Reproduction** Let the Denver cancellation review load and complete its baseline POST. Abort its next `/post` request in Chromium and confirm. The UI shows `Trip canceled`, and the trip still appears canceled after reload. `/go` retains `status=confirmed` with empty `tripActions` and `refunds`.
- **Fix** Gate business confirmation on acknowledged persistence. Give failed commits a recoverable error and ensure a retry cannot duplicate records. Keep the mandated template unchanged.

## P1 — Incomplete features

### AUDIT-003 · Responsive layout and control sizes diverge from the design

- **File** [src/styles.css](src/styles.css)
- **Issue** The trip detail sidebar shrinks from 300px to 260px at 1100px, and the two-column layout stacks at 680px. List rows switch to two columns at 680px as well. `DESIGN.md` calls for a 300px desktop detail column and stacked card sections and labeled rows below 600px. Metric values use 26px where the design specifies 28px. Inline action links such as the eCredit wallet link in the cancellation confirmation lack the specified 44px target height.
- **Fix** Reconcile those rules with the specified tablet and mobile layout and minimum target size. The existing 390px checks passed the overflow assertion, so include intermediate widths in verification. [DESIGN.md](DESIGN.md)

## P2 — Minor issues

None found.

## Data pipeline status

| Component | Status | Notes |
| --- | --- | --- |
| `dataManager.js` | Template verified | SHA-256 matches the repository copy. Boot is awaited and the baseline is the only non-user POST observed. |
| Store sync | Two open issues | Confirmed workflow writes are structured and visible when requests succeed in one context. Separate contexts can overwrite each other, and fetch failures still show confirmation. |
| `/post` and `/state` | Pass | Template is imported directly. An endpoint check verified injection, updating current state, reading it and resetting to the original baseline. |
| `/go` | Pass | Returns `initial_state`, `current_state` and `state_diff`. Observed fields match the workflow records when the writes reach the server. |
| Session isolation | Pass | Different `sid` values have separate server state. Shared-session behavior is covered by AUDIT-001. |
| Initial snapshot | Pass | `set_current` preserved the initial state after `set`, and `reset` restored it as the current snapshot. |
| Injected routes and offline assets | Pass | Empty, singleton and 320-record states rendered in Chromium. Deep links kept `sid`. Requests stayed on localhost. The code contains no timer-driven state writes. |
| Schema accuracy | Updated | The endpoint reference, default IDs, injection example and observable fields are documented. |

## SCHEMA.md updates

Added the API reference, fixture ID ranges, a minimal injection request and the reset behavior. Clarified that sending a full state snapshot can fail before the state API records it. [SCHEMA.md](SCHEMA.md)

## P0 audit replay, 2026-11-18

- **AUDIT-001 · Fixed and retested.** Sequential cancellations from two independent Chromium contexts sharing a SID both remained in Harbor after the second write.
- **AUDIT-002 · Fixed and retested.** An interrupted cancellation left the trip confirmed, produced no actions or refunds, and displayed no confirmation. The workflow suite passed.

Docker dynamic certification run `188924` recorded render pass, sync pass (1 startup POST), idle pass (0 idle POSTs), and hydrate pass.
