# Goodreads Mock — Audit Report

> Round 1  
> Date 2026-11-18  
> Audited by audit agent

## Summary

| Category | Issues |
| --- | ---: |
| Dead handlers / stubs | 0 |
| Missing state tracking | 0 |
| Data pipeline gaps | 2 |
| Schema mismatches | 1 |
| UI layout gaps | 1 |
| **Total** | **4** |

The audit reran the existing Playwright workflow and rapid-update suites against localhost port 5352 on installed Chromium. Both suites and `npm run build` passed. The extra audit cases reproduced two ways a successful-looking edit can disappear from Harbor's current state. The normal-path results in TEST.md do not cover either case.

## P0 — Dead/Broken Code

### AUDIT-001 · A delayed startup baseline overwrites a user save · Resolved on 2026-11-18

- **Files** · `src/main.jsx:12`, `src/utils/dataManager.js:57`, `src/utils/persist.js:3`
- **Issue** · The shared template starts the baseline POST and returns the initial snapshot without waiting for the request to finish. Routes become editable while the baseline POST is still pending. The app's queue orders user saves with each other, but the startup POST bypasses it.
- **Reproduction** · On a fresh SID, hold the browser's startup `action: "set"` request, create a custom shelf, and let `set_current` reach the server. Verify the shelf is present in `/go`, then release the startup request. In Vite's shared API, the resulting `current_state` loses the shelf while `initial_state` contains it. The UI continues showing the shelf.
- **Fix** · Coordinate the startup POST and the mutation queue at the app boundary while retaining the shared templates byte-for-byte. Hold writes until an outstanding baseline finishes, or hold route readiness until the baseline is established. Add a delayed-baseline regression that checks the original baseline and the edited current snapshot.

### AUDIT-002 · A rejected state save still announces success · Resolved on 2026-11-18

- **Files** · `src/store.jsx:14`, `src/utils/persist.js:9`, `src/utils/dataManager.js:64`
- **Issue** · `commit` treats synchronous dispatch as successful persistence. The wrapper drains response bodies without checking HTTP status, and the template catches fetch rejections. A failed POST leaves the new snapshot in local storage only. The dialog closes and the success announcement makes it look saved.
- **Reproduction** · Let the startup POST complete, return HTTP 500 for a custom shelf's `set_current`, and observe “Shelf created.” The shelf count survives reload in the same browser, while `/go` still lacks the shelf.
- **Fix** · Surface asynchronous request results to the store and expose a retry or actionable error before announcing success. Keep whole-state and ordering semantics, the shared templates, and the one-save-per-successful-action behavior. Cover both non-2xx and transport failures in regression checks.

## P1 — Incomplete Features

### AUDIT-003 · The finish picker overflows its mobile dialog

- **Files** · `src/challenge.jsx:138`, `src/styles.css:82`
- **Issue** · At 320 px with seeded books, open Reading Challenge and select “Log a finished book.” Chromium measured a 282 px dialog client width, a 368 px scroll width and a 350 px book select client width. The select's intrinsic width from the title and author options forces horizontal scrolling inside the dialog. The earlier empty-route width check did not open this populated dialog.
- **Fix** · Allow the field grid track and select to shrink within the dialog. Check the populated picker at 320 px with the seed and a long injected title.

### AUDIT-004 · A seeded community review has no rating or text

- **File** · `src/data/seed.js:139`
- **Issue** · The seed's rating and body rules both omit content for `review-036` on `book-024`. The community section displays an author and “Unrated” without a review. The record conflicts with the content rule enforced by the review editor.
- **Fix** · Give the seeded record original review text or a rating while preserving its ID and relationships. Check that every seeded review has a rating, text or both.

## P2 — Minor Issues

None found.

## Data Pipeline Status

| Component | Status | Notes |
| --- | --- | --- |
| Shared data manager | Pass | SHA-256 matches `templates/dataManager.js`. |
| Store and user mutations | Fail | Structured shelf, review, finish and goal records reached `/go` on the normal path. Startup ordering and rejection handling remain open. |
| `/post`, `/state`, `/go` | Pass | Verified `set`, `set_current`, exact diff and reset with an established baseline. The shared reset restores baseline data. |
| Session isolation and routing | Pass | The browser suite passed independent SIDs, deep links, reloads and SID-preserving navigation. |
| Initial snapshot | Fail | The delayed-baseline case captured the edited snapshot as the initial one on a fresh SID. |
| Idle behavior and offline assets | Pass | No timer-driven writes in source. The browser suite reported zero idle writes and external HTTP requests. Cover motifs are local and typography uses system fonts. |
| Injected state | Pass | Empty, sparse singleton with dangling references, and 250-record fixtures rendered. Unknown fields and an above-keepalive-limit payload survived the tested saves. |
| Schema documentation | Updated | Documented the endpoint behavior and the seeded inventory. The empty community review remains a data finding. |

The account layout uses the text wordmark, original cover motifs, synthetic books and readers, and the palette and typography defined in DESIGN.md. The build completed locally. Docker dynamic certification belongs to the parent runner.

## SCHEMA.md Updates

Added the local endpoints, reset and injection behavior, stable default IDs, and a minimal injected world. The state shapes and action footprints were checked against the mutation code.

## P0 audit replay, 2026-11-18

- **AUDIT-001 · Fixed and retested.** The initial POST was withheld and the workspace exposed no action controls until acknowledgement. Shelf and review workflows then passed.
- **AUDIT-002 · Fixed and retested.** An injected HTTP 500 left the shelf dialog open, showed no success, and created no shelf in Harbor or after reload. A retry reached Harbor.

Docker dynamic certification run `125084` recorded render pass, sync pass (1 startup POST), idle pass (0 idle POSTs), and hydrate pass.
