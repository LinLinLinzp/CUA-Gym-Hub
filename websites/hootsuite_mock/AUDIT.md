# Hootsuite Mock — Audit Report

> Round: 1  
> Date: 2026-11-18  
> Audited by: audit agent

## Summary

| Category | Issues found | Open |
| --- | ---: | ---: |
| Dead handlers / stubs | 0 | 0 |
| Missing state tracking | 0 | 0 |
| Data pipeline gaps | 0 | 0 |
| Schema mismatches | 1 | 0 |
| UI behavior and design | 2 | 0 |
| Total | 3 | 0 |

## P0 — Dead/Broken Code

None found.

## P1 — Incomplete Features

### AUDIT-001 · Pending approval labels spilled out of narrow Planner cards

- **File** `src/styles.css`
- **Issue** The calendar status label overflowed its card at 320px and 390px viewport widths. Ten seed cards were affected at each width.
- **Fix** Constrained the grid to the available card width and let status labels wrap. Verified the labels fit at 320px, 390px, and 1440px.

### AUDIT-002 · Stream refresh froze relative timestamps on subsequent renders

- **File** `src/pages/Streams.jsx`
- **Issue** After Refresh, later renders continued to calculate relative timestamps from the refresh time.
- **Fix** Calculate relative labels from the browser clock on each render and keep the last refresh time for the refresh notice. Advanced the Playwright clock and filtered the feed to verify the labels update without a Harbor write.

## P2 — Minor Issues

### AUDIT-003 · Verifier schema needed endpoint examples and a precise edit mapping

- **File** `SCHEMA.md`
- **Issue** The schema omitted the endpoint examples, seeded ID ranges, and minimal injection. The combined edit/reschedule row omitted `status` for composer edits and implied rescheduling writes content fields.
- **Fix** Documented the shared endpoint semantics and fixture IDs and separated edit and reschedule into distinct rows.

## Data Pipeline Status

| Component | Status | Notes |
| --- | --- | --- |
| `dataManager.js` | Pass | Matches `templates/dataManager.js` byte for byte. The store awaits loading before rendering routes. |
| Workspace state sync | Pass | Browser assertions verified one whole-state save per successful action, with structured IDs and metadata. Idle, navigation, validation, and local refresh produced zero business writes. |
| Vite `/post` and `/state` | Pass | Shared `stateApi` handles injection, current snapshots, and baseline restoration. Verified through localhost requests. |
| Vite `/go` | Pass | Returns the initial snapshot, current snapshot, and top-level diff. Verified against before-and-after workflow snapshots. |
| Session isolation | Pass | Verified explicit `sid`, navigation and reload preservation, and a separate session's unchanged state. |
| Baseline handling | Pass | Later `set` and `set_current` calls preserved the existing baseline. The shared `reset` restores that baseline as current state and clears the diff. |
| Injected state | Pass | Empty, partial, broken-reference, singleton, and 320-record scenarios rendered. A test write preserved unrelated injected rows. |
| Offline assets | Pass | Chromium observed localhost-only requests. The design uses local styles, icons, and synthetic fixtures. |
| `SCHEMA.md` accuracy | Pass | Reconciled all top-level keys, ID ranges, and observable write paths with the source. |

## SCHEMA.md Updates

Added the localhost endpoint reference, reset behavior, default ID ranges, and an empty injection example that retains the seeded actor and profiles. Documented the exact differences between composer edits and rescheduling.
