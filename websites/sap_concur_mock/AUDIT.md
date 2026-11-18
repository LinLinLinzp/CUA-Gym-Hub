# SAP Concur Mock — Audit Report

> Round 1  
> Date 2026-11-18  
> Audited by the audit agent

## Summary

| Category | Issues |
| --- | ---: |
| Dead handlers or stubs | 0 |
| Missing state tracking | 0 |
| Data pipeline gaps | 0 |
| Schema mismatches | 0 |
| Workflow correctness | 2 |
| Total | 2 |

The production bundle passed the core expense report, travel request and approval suites in Chromium on localhost port 5403. The two findings below concern historical detail rendering and the numeric input boundary.

## P0 — Dead or broken code

None found.

## P1 — Incomplete features

### AUDIT-001 · A closed approval shows details from a later revision

- **File** `src/pages/Documents.jsx:243`
- **Element** Approval History detail with a specific `approvalId`.
- **Evidence** In a local injected session, the first closed cycle showed its original title and a $120.00 summary beside current lines totaling $240.00. The line description came from the later submission.
- **Cause** The historical header and summary read the approval snapshot. The detail panel and lines always read the current document when it exists.
- **Fix** Store the submitted header and lines with new approval cycles and use that snapshot in History. For existing cycles with only summary fields, render the stored summary with an explicitly labeled link or section for the current revision. Cover both document types and retain the deleted-document snapshot path.

## P2 — Minor issues

### AUDIT-002 · Very large validated amounts can lose cents

- **Files** `src/model.js:24`, `src/commands.js:9`
- **Evidence** The expense line validator accepts `80000000000000.01` while the cent converter returns `8000000000000002`. The same converter is used for estimates and totals.
- **Fix** Parse decimal input before converting to numeric state. Reject values that cannot round-trip at cent precision and validate the combined document total within the same range.

## Data pipeline status

| Component | Status | Evidence |
| --- | --- | --- |
| `dataManager.js` | Pass | SHA-256 matches the repository template. The client reads the injected state, caches per session and sends state after accepted actions. |
| Boot and workspace sync | Pass | Boot emitted one baseline per uncached session. Mutations emitted one `set_current` each. Reload, idle, navigation, filtering and validation failures emitted no state writes. Source contains no scheduled writes. |
| `/post`, `/state` and `/go` | Pass | Vite imports the shared plugin unchanged. Injection rendered in the browser, and `/go` showed the expected state and changed keys. |
| Session isolation and initial state | Pass | Distinct sessions stayed isolated, including in two tabs of one browser. `set_current` preserved the baseline and the shared API's `reset` restored it. |
| Structured records | Pass | Accepted workflow actions recorded document, line and approval changes with linked IDs, actors, timestamps, amounts and status as applicable. |
| Injected renders | Pass | Chromium covered empty, singleton and large worlds with missing optional fields, creation routes, details, reloads and the missing-record route. |
| Offline assets and design | Pass | The original rail-and-ledger layout uses a text wordmark, system fonts, inline icons and local receipts. Browser runs recorded only localhost requests. The sampled layout, typography and palette follow `DESIGN.md`. |
| `SCHEMA.md` | Pass | Record shapes and mutation paths matched the source and observed state. |

The shared Harbor API restores the initial snapshot on reset. That behavior takes precedence over the generic audit checklist's reset-to-empty description. Docker certification is handled by the parent runner.

## SCHEMA.md updates

Added endpoint syntax, fixed IDs and a minimal injected world. Clarified that the approval snapshot currently contains summary fields.
