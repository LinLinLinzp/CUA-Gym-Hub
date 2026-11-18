# StudentAid.gov Mock — Audit Report

> Round 1  
> Date 2026-11-18  
> Audited by the audit agent

## Summary

| Category | Found | Open |
| --- | ---: | ---: |
| Dead handlers or blocked actions | 2 | 0 |
| Incorrect saved data or missing validation | 3 | 0 |
| Data pipeline gaps | 0 | 0 |
| Schema mismatches | 1 | 0 |
| Design mismatches | 1 | 0 |
| Total | 7 | 0 |

## P0 — Dead or broken code

### AUDIT-001 · Record creation required a secure context

The five record-creation paths in `src/pages/Fafsa.jsx`, `src/pages/Loans.jsx`, and `src/pages/Repayment.jsx` called `crypto.randomUUID()`, which can be unavailable on an HTTP mock domain outside localhost. They now use the shared `createRecordId()` in `src/domain.js`. Chromium passed the full suite with `randomUUID` unavailable.

## P1 — Incomplete features

### AUDIT-002 · Apply could open an unusable servicer picker

`src/pages/Repayment.jsx` enabled Apply when any loan qualified. The picker required a whole servicer cohort to qualify. Both now use the same cohort check. An injected archived estimate with mixed eligibility within one servicer verified the button stays disabled.

### AUDIT-003 · Blank FAFSA income could become zero on save

`src/pages/Fafsa.jsx` converted an already persisted null to zero on a subsequent save. It now preserves blank numeric answers as null across saves.

### AUDIT-004 · Contributor changes retained the prior signature

`src/pages/Fafsa.jsx` now resets contributor signatures when the contributor’s name or consent changes and saves the required parent record for a dependent draft. The regression check verified pending status and removal of the old signature timestamp after a name change.

### AUDIT-005 · Missing school references passed FAFSA validation

`src/pages/Fafsa.jsx` now asks users to remove unavailable school selections before proceeding. An injected stale reference blocked progression and issued no write until the user replaced it.

### AUDIT-006 · Schema lacked an injection example and fixture IDs

`SCHEMA.md` now includes the endpoint operations, default ID ranges, an empty-world injection example and the exact FAFSA save behavior.

### AUDIT-007 · Primary button padding differed from the design specification

`src/styles.css` now uses the specified 12 by 16 px primary button padding. The dashboard uses the specified palette, system typography and original CSS artwork.

## P2 — Minor issues

None found.

## Data Pipeline Status

| Component | Status | Verification |
| --- | --- | --- |
| dataManager.js | Pass | SHA-256 matches the Harbor template. |
| Account store | Pass | Loads before rendering and calls the template save once per committed action. The default browser suite observed 18 action writes across all three workflows. |
| Vite /post and /state | Pass | Tested injection, current-state reads, baseline restoration via reset, and independent sessions. |
| Vite /go | Pass | Tested the three response fields, preserved baseline and expected changed collection after each action. |
| Read-only and idle behavior | Pass | No timer-driven writes in source. Read-only navigation, filtering, calculations and idle observation produced no `set_current`. |
| Injected states | Pass | Default, empty, minimal, missing-reference and 350-record worlds rendered. Tested direct links and reloads. |
| Offline built bundle | Pass | Local build and browser suite passed with local assets and no external browser traffic. |
| SCHEMA.md accuracy | Pass | Verified top-level collections, nested fields and user-action mappings against the seed and implementation. |

Docker dynamic certification is assigned to the parent runner. See [TEST.md](TEST.md) for the local run.

## P0 audit replay, 2026-11-18

- **AUDIT-001 · Previously fixed, retested.** The browser workflow suite disabled crypto.randomUUID and verified 18 writes with reload and receipts.

Docker dynamic certification run `125084` recorded render pass, sync pass (1 startup POST), idle pass (0 idle POSTs), and hydrate pass.
