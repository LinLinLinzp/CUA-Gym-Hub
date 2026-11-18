# Yelp Mock — Audit Report

> Round 1  
> Date 2026-11-18  
> Audited by the audit agent

> Follow-up: All three findings below were resolved and retested in [TEST.md](TEST.md).

## Summary

| Category | Open issues |
| --- | ---: |
| Dead handlers or stubs | 0 |
| Missing state tracking | 0 |
| Data pipeline gaps | 0 |
| Schema mismatches | 0 |
| Injected-state display | 1 |
| Keyboard focus | 1 |
| Seed realism | 1 |
| Total | 3 |

`npm run build` and all 12 existing Chromium scenarios passed on `http://localhost:5319`. Review, bookmark, quote, and reservation actions updated the documented records and remained visible after reload. The suite also covered validation, duplicate submissions, idle write counts, session isolation, deep links, and empty, sparse, and large injected worlds. The targeted checks below exercised gaps in the existing suite.

## P0 — Dead or broken code

None found.

## P1 — Incomplete features

### AUDIT-001 · An unavailable collection still counts as a saved place

- Files `src/App.jsx:24`, `src/pages/Discover.jsx:90`, `src/pages/Bookmarks.jsx:49`.
- Inject a saved membership for an existing business with an empty `collections` array. The overview counts the membership, and its recent activity opens “Collection unavailable.” The business shows “Saved · View collections,” while its dialog offers “Save to Want to go.”
- Derive the saved label, membership count, and collection links from memberships whose active, owned collection resolves. Keep the injected records in state and use the Bookmarks index for any retained orphan activity. Cover the orphan and a valid saved membership in the same injected world.

### AUDIT-002 · Confirming removal drops keyboard focus

- Files `src/ui.jsx:108`, `src/pages/Reviews.jsx:66`.
- Keyboard-open Remove review, enter a reason, and confirm. The review and its opener disappear, and `document.activeElement` becomes `BODY`. The dialog currently restores focus only when the original opener survives.
- Give successful actions that remove their opener a stable focus destination, such as the next visible record action or the list heading. Check the same behavior for bookmark removal, quote archive, and reservation cancellation. Preserve focus restoration to the opener when a user dismisses the dialog.

## P2 — Minor issues

### AUDIT-003 · Eight seeded reservations were created after the booked date

- File `src/data/seed.js:147`.
- `rsv_001` through `rsv_008` have `createdAt` later than the booked date. For example, `rsv_001` was created November 11 for an October 20 table.
- Derive fixed creation and cancellation timestamps from the seeded slot. Preserve IDs, slot times, occupancy, and the mix of history and upcoming records.

## Data Pipeline Status

| Component | Status | Evidence |
| --- | --- | --- |
| `src/utils/dataManager.js` | Pass | SHA-256 matches `templates/dataManager.js`. |
| Store synchronization | Pass | Awaits `loadState` before routes render. A single store path saves the whole world per successful action. Idle time and read-only UI interactions produced zero writes after the baseline. |
| `vite.config.js` and `/post` | Pass | Registers unchanged `stateApi(createInitialData)`. Exercised `set`, `set_current`, and `reset`. |
| `/state` and `/go` | Pass | Stored state, JSON `initial_state`, `current_state`, and `state_diff` matched the tests. |
| Session isolation | Pass | API isolation and SPA query preservation passed. |
| Initial state handling | Pass | Existing baseline survived both `set_current` and a later `set`. Reset restored the baseline, per the Harbor template. |
| Structured records | Pass | Verified IDs, actor and foreign keys, statuses, mutation timestamps, exact changed fields, and preservation of unrelated data in all four workflows. |
| Offline assets | Pass | Artwork is local, typography uses system fonts, and Chromium observed zero requests outside localhost in the workflow suite. Reviewed the desktop and mobile layouts against `DESIGN.md`. |
| `SCHEMA.md` accuracy | Pass | Eight top-level keys and all mutation fields match the source. |

## SCHEMA.md Updates

Added endpoint and reset behavior, the seeded ID ranges and workflow entry IDs, and a minimal injection payload. Corrected the artwork path example. The observable mutation fields were already accurate.
