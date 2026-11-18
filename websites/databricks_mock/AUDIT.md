# Databricks Mock — Audit Report

> Round 1  
> Date 2026-11-18  
> Audited by the audit agent

## Summary

| Category | Issues |
| --- | ---: |
| Dead handlers / stubs | 0 |
| Incomplete workflow behavior | 1 |
| Missing state tracking | 0 |
| Data pipeline gaps | 0 |
| Schema mismatches | 0 |
| Total | 1 |

## P0 — Dead or broken code

None found.

## P1 — Incomplete features

### AUDIT-001 · Notebook links can discard unsaved cell edits

- **Files** `src/notebooks.jsx:113`, `src/notebooks.jsx:205`, `src/notebooks.jsx:249`, `src/App.jsx:92`
- **Reproduction** Open `/workspace/notebooks/nb-001` in a fresh session. Change the first cell and confirm the “Unsaved changes” indicator appears. Follow the attached “Retail analytics shared” link to Compute and return with Back.
- **Observed** Chromium returned to the original source without a discard prompt. The only POST was the baseline `set`, and `/go` showed an empty diff. The stopped-cluster picker and the job links in the blocked delete dialog also use direct route links from the editor.
- **Fix** Preserve the draft across linked navigation or gate editor links with a Save, Discard, or Stay choice when a draft exists. Keep navigation and discard free of state writes. If the user chooses Save, reuse the existing cell save action.

## P2 — Minor issues

None found.

## Data Pipeline Status

| Component | Status | Notes |
| --- | --- | --- |
| Shared `dataManager.js` | ✅ | SHA-256 matches `templates/dataManager.js`. Initial load merges objects and replaces injected arrays. |
| Store state sync | ✅ | Each accepted workflow action exercised generated one `set_current` with structured records. Invalid and read-only actions generated no business writes. No timer-driven write paths found. Chromium observed no POST after the baseline during the 1.5-second idle check. |
| `/post` and `/state` | ✅ | Vite uses the shared adapter. Verified current snapshot reads, updates, and reset. |
| `/go` | ✅ | Verified all three response keys, workflow diffs for notebooks, jobs, and clusters, and an empty diff after reset. |
| Session isolation | ✅ | Navigation kept `sid`, and a separate session retained its own seed and run history. |
| Initial snapshot | ✅ | `set_current` preserved the initial snapshot. Reset restored it. |
| Injected state | ✅ | Empty, sparse, and large worlds rendered. Exercised direct links and reloads, sparse records, and missing referenced notebooks and task dependencies. |
| Offline build and assets | ✅ | `npm run build` passed. Browser requests stayed on localhost. The UI uses the text brand, system fonts, and original CSS artwork. |
| `SCHEMA.md` | ✅ | All top-level records and accepted business actions are documented. |

All seven existing Playwright groups passed against the Vite dev server on port 5489. The independent draft reproduction is recorded above. The parent runner handles Docker dynamic certification.

## SCHEMA.md Updates

Added the local API entry points, fixed seed ID ranges, and a minimal notebook-to-job injection example. Verified that the example renders both routes and records a successful run in `/go`. Documented the reset behavior observed through the shared API.
