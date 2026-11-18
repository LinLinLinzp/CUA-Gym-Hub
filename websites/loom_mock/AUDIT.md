# Loom Mock — Audit Report

> Round 1  
> Date 2026-11-18  
> Audited by the audit agent

## Summary

| Category | Issues |
| --- | --- |
| Dead handlers / stubs | 0 |
| Missing state tracking | 0 |
| Data pipeline gaps | 0 |
| Schema mismatches remaining | 0 |
| Incomplete behavior and design alignment | 3 |
| Total open | 3 |

## P0 — Dead/Broken Code

None found. Video, folder and comment actions reached the centralized store and wrote structured records visible through `/go`.

## P1 — Incomplete Features

### AUDIT-001 · Longest first disagrees with the displayed duration

- **File** `src/Library.jsx:61` and `src/Library.jsx:96`
- **Issue** Inject two root videos. Give the first `sampleKey: "support-queue"` and `durationSeconds: 35`. Give the second `sampleKey: "insights-report"` and omit `durationSeconds`. The cards display `0:35` and `1:13`, but Longest first puts `0:35` first. The thumbnail reads the local sample duration when the stored duration is missing and the comparator uses zero.
- **Fix** Use the same effective duration for the thumbnail and the comparator. Keep that fallback at render time and verify that sorting leaves `/go` unchanged.

### AUDIT-002 · Library controls overflow at narrow widths

- **File** `src/styles.css:38`, `src/styles.css:66`, and `src/styles.css:200`
- **Issue** The default library with selection enabled had a document scroll width of 656px at both 621px and 650px viewports. The masthead search and account group exceeded the available width above the mobile breakpoint. At 300px, the selection and sort controls pushed the document to 306px.
- **Fix** Let the search group shrink or wrap the masthead before its contents exceed the viewport. Allow the recording controls to wrap within the content width. Check the library with and without selection at 300px, 390px and across the 620px breakpoint.

### AUDIT-003 · Icon action targets are smaller than the design minimum

- **File** `src/styles.css:50` and `src/styles.css:166`
- **Issue** `DESIGN.md` specifies a 36px minimum for icon controls. Chromium measured Clear search at 32 × 32px. The comment overflow trigger also has a 32px height override.
- **Fix** Apply the 36px minimum in both contexts and retain keyboard focus visibility within the search field and comment rows.

## P2 — Minor Issues

None found.

## Data Pipeline Status

| Component | Status | Notes |
| --- | --- | --- |
| `dataManager.js` | Pass | Byte-identical to `templates/dataManager.js`. Loads session-scoped defaults and injected state, caches the merged state locally, and publishes it through the state API. |
| Store state sync | Pass | All business mutations use the same `commit` path. The Chromium suite observed one baseline `set` and 25 `set_current` requests in its main session. The notice timer clears transient UI feedback. The idle-tab and playback checks observed zero state writes. |
| Vite `/state` and `/post` | Pass | Shared middleware is registered for dev and preview. Local checks exercised `set`, `set_current` and `reset`. Reset restores current state from the preserved baseline as implemented by the shared template. |
| Vite `/go` | Pass | Returned `initial_state`, `current_state` and `state_diff`. The workflow suite checked mutation fields and preserved baseline data. The API check confirmed an empty diff after reset. |
| Session isolation and initial state | Pass | The suite exercised five isolated sessions. Navigation and copied links carried `sid`. Injected folder and video IDs containing spaces, slashes and percent escapes resolved on navigation and hard reload. |
| Injected render | Pass | Empty collections, sparse records, an orphan reply, and a 350-video library rendered without uncaught errors. The sparse duration sort discrepancy is tracked in AUDIT-001. |
| Offline assets and build | Pass | `npm run build` passed. Browser requests stayed on localhost. The account uses the text Loom wordmark, system fonts and six bundled pairs of recording thumbnails and MP4 samples. |
| `SCHEMA.md` accuracy | Updated | Documents the seed, API and exact mutation fields. |

The existing Chromium workflow suite passed again on port 5407. Additional checks covered the API reset, encoded IDs, keyboard dialog focus and the reported edge cases. The existing `TEST.md` records dev and built preview runs. Docker certification is handled by the parent runner.

## SCHEMA.md Updates

Added API call shapes, reset and hydration behavior, fixed seed IDs, and a minimal injection example. Kept the field-level mapping for every persisted mutation.
