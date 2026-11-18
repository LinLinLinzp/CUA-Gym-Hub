# Kickstarter Mock — Audit Report

> Round: 1  
> Date: 2026-11-18  
> Audited by: audit agent

## Summary

| Category | Issues |
| --- | --- |
| Dead handlers / stubs | 0 |
| Missing state tracking | 0 |
| Data pipeline gaps | 0 |
| Schema mismatches | 1 corrected |
| Incomplete UI behavior | 2 open |
| Total | 2 open, 1 corrected |

The campaign, reward, backer survey and update workflows passed on Vite dev and built preview. The localhost suite verified structured records in `/go`, SID retention and isolation, hard reloads, sparse and large injections, and zero idle writes or external requests. The catalog uses a text wordmark, system fonts and bundled local artwork.

## P0 — Dead/Broken Code

No findings.

## P1 — Incomplete Features

### AUDIT-001 · Campaign preview does not expose its current section

- **File** `src/App.jsx:28`, `src/App.jsx:38`, `src/ui.jsx:28`
- **Reproduction** Open `/projects/project-floodlights/preview`. Campaign is underlined, but no link in Project sections has `aria-current="page"`. On the equivalent URL with a trailing slash, the section also loses its underline.
- **Fix** Match the preview route using the router and give the Campaign link an explicit current state on that route. Verify both URL forms and SID retention.

## P2 — Minor Issues

### AUDIT-002 · Empty search results duplicate the filter reset action

- **Files** `src/ui.jsx:152`, `src/pages/Projects.jsx:47`, `src/pages/Rewards.jsx:56`, `src/pages/Updates.jsx:40`, `src/pages/SurveyResponses.jsx:34`
- **Reproduction** Search for a term with no matches in Projects, Rewards or Updates. Two buttons named “Clear filters” appear and perform the same reset. Survey Responses uses the same rendering pattern when a filter combination yields zero rows.
- **Fix** Keep one reset action in the zero-results state and retain the inline reset for filtered lists with matches.

## Data Pipeline Status

| Component | Status | Notes |
| --- | --- | --- |
| `dataManager.js` | Pass | SHA-256 matches the unchanged Harbor template. |
| Store state sync | Pass | Boot uses `loadState`. Explicit mutations send one full-state `set_current` through the store. |
| Vite `/state` and `/post` | Pass | Verified injection, snapshot reads, current writes and reset on dev and preview. |
| Vite `/go` | Pass | Verified baseline, current state and top-level diffs, including an added field. |
| SID isolation and navigation | Pass | Separate sessions kept separate data. Direct loads, navigation and reloads retained the SID. |
| Initial snapshot and reset | Pass | `set_current` preserved the initial snapshot. Reset restored the snapshot and produced an empty diff. |
| Harbor rendering and offline assets | Pass | Empty, sparse and large worlds rendered. No browser requests to other origins were observed. |
| `SCHEMA.md` accuracy | Corrected | Clarified that an initial snapshot can be the partial injection and documented reset behavior. |

## SCHEMA.md Updates

Added endpoint documentation, representative linked seed IDs and a minimal injected world. Retained the field-by-field mutation table and documented the difference between the stored baseline and the world merged by the browser. The parent runner owns Docker dynamic certification.
