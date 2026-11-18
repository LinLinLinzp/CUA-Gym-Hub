# Okta Mock — Audit Report

> Round 1  
> Date 2026-11-18  
> Audited by the audit agent

## Summary

| Category | Open issues |
| --- | --- |
| Dead handlers / stubs | 0 |
| Missing state tracking | 0 |
| Data pipeline gaps | 1 |
| Schema mismatches | 0 |
| Total | 1 |

The resumed workspace has an original horizontal navigation layout, the Okta text brand, local CSS monograms and synthetic records. The source audit found handlers for the exposed business actions and no runtime asset references outside the local app. The Playwright rerun exercised people, groups and application assignments and observed 20 structured activity events from 19 submits. See [TEST.md](TEST.md) for the state changes and injected-world coverage.

## P0 — Dead or broken code

### AUDIT-001 · A rapid second save can be absent from Harbor state · Resolved on 2026-11-18

- **Files** `src/state.jsx` (optimistic commit) and `src/utils/dataManager.js` (shared transport).
- **Reproduction** Inject an empty workspace with a metadata string of 58,000 ASCII characters. Add two groups in quick succession with **Save and Add Another**. Chromium attempted writes of 58,782 and 59,237 bytes. The browser cache contained both groups, while `/go.current_state.groups` contained only the first. The same result occurred with ordinary localhost timing and with emulated latency.
- **Impact** The form clears after both submits and the local snapshot includes both records, so the user can proceed while Harbor misses the second group and its activity event. This applies to any business action using the shared save function.
- **Fix** Resolve in the canonical Harbor client transport. The helper makes overlapping keepalive requests near the browser's aggregate body limit and discards fetch failures. Ensure rapid saves deliver the latest complete snapshot and add regression coverage at this payload size. The site copy remains byte-for-byte identical to the required template.

## P1 — Incomplete features

No issues found.

## P2 — Minor issues

No issues found.

## Data Pipeline Status

| Component | Status | Notes |
| --- | --- | --- |
| Shared client template | Exact match | SHA-256 matches the repository template. |
| Boot and idle | Pass | Initial state loads before routes mount. A fresh session makes one baseline POST. Idle observation and reload produced zero additional writes. The notice timer updates only UI text. |
| Store and structured records | Pass | A central commit writes the complete snapshot. Lifecycle transitions, exact relationship removals, cascades, actor IDs and ISO timestamps are visible in the normal workflow. |
| Rapid persistence near 59 KB | P0 | See AUDIT-001. |
| `/post`, `/state` and `/go` | Pass | Verified initial baseline retention, current-state replacement and merge, diff, reset to baseline and session isolation. The shared API implements reset by restoring the baseline. |
| Injected worlds and routes | Pass | Verified empty, sparse and 500-person worlds, deep links, reload and session ID propagation. |
| Offline assets and build | Pass | `npm run build` succeeded. The localhost workflow made zero off-origin HTTP requests and reported zero page errors. |
| Docker dynamic certification | Pending | Parent runner phase. |

## SCHEMA.md Updates

Added endpoint and reset semantics, default IDs, a minimal injection example and explicit record types. Clarified the optional direct-grant username and the group creation event payload. The observable changes table covers every business action exposed by the app.

## P0 audit replay, 2026-11-18

- **AUDIT-001 · Fixed and retested.** Two near-quota snapshots of 58,782 and 59,237 bytes both reached Harbor, with ordinary timing and at 2,200 ms emulated latency. No request failed.

Docker dynamic certification run `175552` recorded render pass, sync pass (1 startup POST), idle pass (0 idle POSTs), and hydrate pass.
