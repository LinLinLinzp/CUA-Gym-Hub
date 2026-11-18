# IMDb Mock — Audit Report

> Round: 1  
> Date: 2026-11-18  
> Audited by: audit agent

## Summary

| Category | Found | Open |
| --- | ---: | ---: |
| Dead handlers or stubs | 0 | 0 |
| Missing state tracking | 0 | 0 |
| Data pipeline gaps | 1 | 0 |
| Schema mismatches or gaps | 1 | 0 |
| Total | 2 | 0 |

## P0 — Resolved

### AUDIT-001 · Baseline could overwrite the first mutation

- **Files** `src/main.jsx`, `src/utils/persist.js`
- **Issue** The shared loader starts its initial `set` request before returning. A user could submit a `set_current` while that POST was still in flight. With the initial request delayed in Chromium, `/go` captured the Watchlist mutation as `initial_state` and the late baseline replaced it in `current_state`.
- **Fix** The centralized persistence adapter now tracks the loader’s initial POST and waits for it before rendering actionable routes. The template remains byte-identical. Business writes still run through one store dispatch and the shared `saveState` helper.
- **Verification** Delayed-baseline regression passed on dev and preview. `/go` held zero events in `initial_state` and the structured `watchlist.add` event and membership in `current_state`.

## P1 — Resolved

### AUDIT-002 · Schema handoff lacked endpoint and fixture details

- **File** `SCHEMA.md`
- **Fix** Added local endpoint and reset behavior, stable fixture IDs, and a minimal injection example. Verified the documented ID sequences and the gaps in list membership IDs against `createInitialData()`.

## P2 — Minor issues

No findings.

## Data pipeline status

| Component | Status | Evidence |
| --- | --- | --- |
| `src/utils/dataManager.js` | Pass | SHA-256 matched the shared template. |
| Account state sync | Pass | 16 normal workflow mutations and three dangling-reference removals appeared in `/go`. Rapid adds persisted in order. Idle and browse controls added no writes. |
| Vite `/post`, `/state`, and `/go` | Pass | Injection, reads, diffs, `set_current`, and reset passed through the shared middleware on the built bundle. |
| Session isolation | Pass | Four independent Playwright sessions and a separate API check retained independent state. Navigation and reload retained `sid`. |
| Initial snapshot | Pass | A second `set` and a `set_current` preserved the original baseline. Reset restored it. The delayed-baseline test confirmed boot ordering. |
| Injected worlds | Pass | Empty, missing-metadata, dangling-reference, future-release, and 380-record states rendered. Extra injected data survived a mutation. |
| Offline assets and design | Pass | Reviewed desktop and 360 px captures. The plum rail, ivory canvas, local artwork, and text-only brand were present. Chromium observed zero external requests or page errors. |
| `SCHEMA.md` | Pass | The record table and action map matched the store, seed, and observed snapshots. |

Docker dynamic certification is owned by the parent runner. Local results are recorded in [TEST.md](TEST.md).

## P0 audit replay, 2026-11-18

- **AUDIT-001 · Previously fixed, retested.** The existing Chromium regression delayed the initial POST and verified the baseline committed before the first mutation. Workflow replay verified 16 mutation snapshots.

Docker dynamic certification run `188924` recorded render pass, sync pass (1 startup POST), idle pass (0 idle POSTs), and hydrate pass.
