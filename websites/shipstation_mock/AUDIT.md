# ShipStation Mock — Audit Report

> Round 1 · 2026-11-18 · Audit agent

## Summary

| Category | Issues |
| --- | ---: |
| Dead handlers or stubs | 0 |
| Incomplete UI behavior | 1 |
| Missing state tracking | 0 |
| Data pipeline gaps | 0 |
| Unresolved schema mismatches | 0 |
| Total | 1 |

The Orders, Labels, Batches, and Returns workflows in `SEED.md` passed on localhost. The Chromium run verified all 24 completed actions against `/go`, including their affected collections, related record IDs, actors, and timestamps. The four remaining activity records in the final count came from the seed.

## P0 — Dead or broken code

No findings.

## P1 — Incomplete features

### AUDIT-001 · Browser Back leaves a stale dialog open

- **File** [src/App.jsx](src/App.jsx#L111)
- **Reproduction** Open the Orders queue, open an editable order, choose **Edit Details**, and use browser Back. Chromium returns to the Orders queue while the edit dialog remains visible.
- **Impact** The modal blocks the destination queue and retains the previous order ID. The user can still submit an edit for that order after leaving its detail route. The same modal state is shared by confirmations and editors.
- **Fix** Scope the dialog to the history location at which it opened and clear it when leaving that location. Verify Back closes the dialog, preserves the queue filters, and produces no business write.

## P2 — Minor issues

No findings.

## Data Pipeline Status

| Component | Status | Notes |
| --- | --- | --- |
| Client state manager | Pass | Byte-for-byte match with the Harbor template. Boot awaits the merged world before mounting the router. |
| Workspace state sync | Pass | One commit path persists the complete business update. The idle tab issued zero further writes during a same-session update in a second tab. |
| `/state`, `/post`, and `/go` | Pass | Tested localhost injection, readback, merge updates, and the initial/current/diff response. |
| Baseline and reset | Pass | Subsequent `set` and `set_current` preserved the established baseline. The shared Harbor reset restored current state to that baseline. |
| Session isolation and injected rendering | Pass | Verified separation by `sid`, empty collections, sparse details and reloads across all four sections, and a 350-order queue. |
| Build and offline assets | Pass | `npm run build` passed. Chromium rendered a built deep link and saved an order through the state API. The supplemental run blocked external requests and observed none. |
| SCHEMA.md accuracy | Pass | Authored records and observable action fields match the reducer and `/go` results. |

## SCHEMA.md Updates

Added the base URL, endpoint operations, seed ID ranges, and a minimal injection example. Preserved the nested record definitions and action-to-state mapping.
