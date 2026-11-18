# Evernote Mock — Audit Report

> Round: 1
> Date: 2026-11-18
> Audited by: audit agent

## Summary

| Category | Issues |
| --- | ---: |
| Dead handlers or stubs | 0 |
| Missing state tracking | 0 |
| Data pipeline gaps | 1 |
| UI behavior and design alignment | 2 |
| Schema mismatches after documentation update | 0 |
| Total | 3 |

The existing suite passed all 39 scenarios on the localhost dev server. A separate rapid-save test passed while a same-SID tab stayed idle. Supplemental browser checks found a startup write ordering defect and two collection UI issues.

## P0 — Dead or Broken Code

### AUDIT-001 · Delayed startup baseline can overwrite the first user mutation

- **Files**: `src/store.js:35`, `src/utils/dataManager.js:57`
- **Feature**: Harbor baseline and first user action.
- **Issue**: The template starts the baseline `set` request and resolves `loadState()` without waiting for the request to finish. The store enables mutations on resolution and orders only later `set_current` requests. The state API writes the current snapshot for either action.
- **Reproduction**: In a fresh SID, delay the browser's baseline POST in Playwright. Open `/`, click New note and wait for `set_current`. Verify `/go` contains 57 notes. Release the baseline POST and query `/go` again. The server returns 56 notes while the new note editor remains open. Both POSTs return HTTP 200.
- **Fix**: Track the startup baseline request at the store boundary and serialize subsequent writes behind it or keep workspace actions gated until the baseline completes. Preserve the unchanged Harbor templates and cached-load behavior. Add a regression check comparing the initial and current note sets after a delayed baseline.

## P1 — Incomplete Features

### AUDIT-002 · Opening a search result blanks the search input

- **Files**: `src/shell.jsx:13`, `src/App.jsx:44`, `src/route.js:21`
- **Issue**: Search remains the active collection and its query chip still shows `scorecard`, but the masthead input becomes empty after opening November Vendor Scorecard from `/search?q=scorecard`. The shell reads only the top-level `q` and the note route keeps the query inside `from`.
- **Fix**: Use the resolved collection query as the search field's source. Verify result selection, direct opening of a search-origin note, editor close and browser history keep the input aligned with the collection.

### AUDIT-003 · Section tabs overflow at a 320px viewport

- **File**: `src/styles.css:163`
- **Issue**: At 320 CSS pixels, Notes, Notebooks, Tasks and Trash each show a document scroll width of 327 pixels. The Trash tab extends off the right edge. The design calls for a wrapped command area below 720px.
- **Fix**: Let tabs wrap or reduce the combined tab width at the narrow breakpoint. Keep all four labels visible and verify the navigation and actions at 320px and 390px.

## P2 — Minor Issues

None recorded.

## Data Pipeline Status

| Component | Status | Notes |
| --- | --- | --- |
| `dataManager.js` | Pass | SHA-256 matches the Harbor template. |
| Store state sync | Fail | All business actions have whole-state writes. The first write can race the baseline. See AUDIT-001. |
| `POST /post` and `GET /state` | Pass | Verified SID-scoped set, set_current, reset and state reads. Reset restores the baseline as defined by the Harbor template. |
| `GET /go` | Pass | Verified initial, current and modified arrays after state updates. |
| Session isolation | Pass | Acceptance checks used distinct SIDs. The rapid-edit test used a second idle tab with the same SID and observed zero writes from that tab. |
| Baseline file | Pass | Repeated set and set_current preserved the first stored baseline in the API lifecycle check. |
| Structured state | Pass | Notes, notebooks and tasks persist IDs, links, status and actor/timestamp fields. Compound workflows commit once. |
| Injected worlds | Pass | Empty, singleton, dangling-reference and large injected states rendered. Tested direct routes and hard reload. |
| Offline runtime | Pass | Source references local assets and system fonts. Browser acceptance observed no external requests or page errors. |
| Timers and passive state | Pass | The app timer dismisses UI feedback only. Settled idle, navigation, filtering and searches issue no business writes. |
| Build | Pass | `npm run build` succeeded. The existing browser acceptance report also records 39 passing scenarios in built preview. |
| `SCHEMA.md` accuracy | Pass | Includes all top-level keys, per-action writes, seed IDs and a minimal injection example. |

## SCHEMA.md Updates

Added local API details, documented reset and merge behavior, listed fixed seed IDs, and added an empty-world injection example. Retained the observable writes for all supported actions.
