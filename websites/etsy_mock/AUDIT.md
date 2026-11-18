# Etsy Mock — Audit Report

> Round: 1  
> Date: 2026-11-18  
> Audited by: audit agent

## Summary

| Category | Issues |
|---|---:|
| Dead handlers / stubs | 0 |
| Missing state tracking | 0 |
| Data pipeline gaps | 0 |
| Schema mismatches | 0 open, 1 documentation update completed |
| Design alignment | 1 |
| Other UI defects | 1 |
| Total open | 2 |

## P0 — Dead/Broken Code

No findings. Purchase, seller messaging, order help, partial returns, case management, and favorites produced the expected structured writes on localhost.

## P1 — Incomplete Features

### AUDIT-001 · Typography differs from the design spec

- **File** `src/styles.css:21`, `src/styles.css:87`, and `src/styles.css:111`.
- **Issue** Route and section headings inherit a `1.16` line height. `DESIGN.md` specifies `1.13` and `1.2`, respectively. The hero title uses `-.035em` tracking instead of `-.03em`, and main buttons use weight `650` where the UI label spec uses `600`.
- **Fix** Apply the specified values to route `h1`, section `h2`, the hero title, and primary and secondary button labels. Check heading wrapping and control alignment at desktop and 360 px.

## P2 — Minor Issues

### AUDIT-002 · A collection checkbox disappears during editing

- **File** `src/favorites.jsx:20`.
- **Issue** An unfavorited listing can remain a saved member of a collection. If the buyer unchecks that member while editing, it immediately disappears from the picker. Cancel preserves the membership, but the buyer has to leave and restart the edit to undo the draft change.
- **Fix** Build picker options from current favorites and persisted collection memberships. Use the draft selection only to control the checked state and the save payload.
- **Repro** Unfavorite Oat Glaze Stoneware Mug, edit Slow Mornings, and uncheck the mug. The checkbox disappears before Save and `/go` shows no membership change. Cancel returns to a collection that still contains the mug.

## Data Pipeline Status

| Component | Status | Notes |
|---|---|---|
| `dataManager.js` | Pass | Byte-for-byte match with the Harbor template. |
| Store state sync | Pass | Boot waits for `loadState`. A single commit path saves each user-driven change. Idle, browsing, and hard reload checks produced no extra posts. |
| `/post` and `/state` | Pass | Verified injection, mutation, and reset with synthetic session IDs. |
| `/go` | Pass | Reported the initial state, current state, and top-level diffs for verified workflows. |
| Session isolation | Pass | A second session retained its own state. SPA navigation kept `sid`. |
| Baseline handling | Pass | First `set` established the baseline. Later `set` and `set_current` preserved it. `reset` restored the baseline as required by the shared template. |
| Injected state | Pass | Empty arrays, partial records, and 300 listings rendered. A frozen browser clock exercised the case eligibility boundary. |
| Offline assets | Pass | Chromium recorded zero requests outside the local origin. The artwork is served from local files with a local fallback. |
| `SCHEMA.md` accuracy | Pass | Verified all 15 top-level keys and the write map. |

## SCHEMA.md Updates

Added the local endpoint reference, reset semantics, default fixture IDs, and a minimal injection body. Corrected the seeded shop rating, open case example, and collection membership ID.
