# BILL Accounts Payable — Audit Report

> Round 1  
> Date November 18, 2026  
> Audited by the audit agent

## Summary

| Category | Issues |
| --- | ---: |
| Dead handlers / stubs | 0 |
| Missing state tracking | 0 |
| Data pipeline gaps | 1 |
| Schema mismatches remaining | 0 |
| Design alignment | 1 |
| Total open | 2 |

The standard single-tab workflows pass for payables, approvals, and vendor payments. Playwright verified structured records through `/go`, SID-preserving links, reloads, empty and sparse injected states, and a ledger with 520 injected bills. The audit rerun observed zero external requests and zero idle POSTs. The build passed and the state helper hashes matched.

## P0 — Dead/Broken Code

### AUDIT-001 · Saves from stale tabs erase confirmed records

- **Files** `src/store.jsx:9`, `src/store.jsx:11`, `src/utils/dataManager.js:65`, shared `templates/state-api.js`.
- **Reproduction** Open `/bills/new` in two tabs with the same fresh SID before either saves. Save a different valid draft in each tab, waiting for the first POST to complete before the second save. Each returns HTTP 200 and navigates to its bill detail. `/go` contains the first bill and linked `bill_created` activity after the first save. Both disappear after the second save.
- **Cause** Each tab calculates transactions from its own in-memory snapshot. The shared API accepts the entire `set_current` snapshot without checking whether another writer has already updated that SID.
- **Fix** Coordinate the app store and shared Harbor state API so a write based on stale state is rejected or reapplied against the latest snapshot. Keep the mandated templates unchanged in this site. Add a regression that verifies both confirmed drafts and their activity remain observable, or that the UI reports a stale-write conflict before confirmation.

## P1 — Incomplete Features

### AUDIT-002 · Bill pagination buttons are shorter than the design specification

- **Files** `src/style.css:142`, `DESIGN.md` component patterns.
- **Issue** The Previous and Next buttons override the shared 40px minimum height with 34px.
- **Fix** Apply the standard 40px minimum height to both buttons.

## P2 — Minor Issues

None found.

## Data Pipeline Status

| Component | Status | Notes |
| --- | --- | --- |
| `dataManager.js` | Pass | Byte-for-byte match with the shared helper. Persists locally and posts full snapshots. |
| App store state sync | Issue | The main suite observed one fresh-session baseline and ten user-triggered snapshots. Two tabs with the same SID can overwrite each other's confirmed changes. |
| `vite.config.js` `/post` | Pass | Shared middleware accepted `set`, `set_current`, and `reset` on localhost. |
| `vite.config.js` `/state` and `/go` | Pass | Direct endpoint probes verified the JSON shape, current values, and top-level diff. |
| Session isolation (`?sid=`) | Pass | Verified separate SID data and navigation in the direct endpoint probes and browser suite. |
| `.initial.json` handling | Pass | Existing baseline survived subsequent `set` and `set_current`. The required shared template implements reset by restoring that baseline. |
| Harbor injection and offline rendering | Pass | Empty collections, missing optional fields, and 520 injected bills rendered in Chromium. No external requests or timer-driven writes were observed. |
| `SCHEMA.md` accuracy | Pass | Covers all eight keys, linked IDs, and the fields written by each confirmed transaction. |

## SCHEMA.md Updates

Added localhost endpoint details, reset semantics, seeded ID ranges, and a minimal injection payload. Retained the record shapes and the field-by-field transaction mapping.

Docker dynamic certification is assigned to the parent runner.

## P0 audit replay, 2026-11-18

- **AUDIT-001 · Fixed and retested.** The original stale-tab probe confirmed the first bill and its activity survive the second tab’s save. The full payable workflow suite passed.

Docker dynamic certification run `125084` recorded render pass, sync pass (1 startup POST), idle pass (0 idle POSTs), and hydrate pass.
