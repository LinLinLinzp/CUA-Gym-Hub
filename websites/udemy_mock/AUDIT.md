# Udemy Mock — Audit Report

> Round 1  
> November 18, 2026  
> Audited by the audit agent

## Summary

| Category | Open issues |
| --- | ---: |
| Dead handlers or stubs | 0 |
| Missing state tracking | 0 |
| Data pipeline gaps | 0 |
| Schema mismatches | 0 |
| Derived progress display | 1 |
| Design alignment | 1 |
| Total | 2 |

## P0 — Dead or broken code

None found. The learner and instructor workflows passed the existing browser tests. Each accepted mutation in the main suite produced one acknowledged `set_current` and the expected top-level change in `/go`.

## P1 — Incomplete features

### AUDIT-001 · An incomplete large course displays 100%

- **File** `src/data/selectors.js:26`
- **Behavior** Playwright reproduced a course with 249 of 250 lessons complete appearing in the In progress filter with a full meter and “100% · 249/250 lessons.” The saved enrollment still had `completedAt: null`.
- **Fix** Reserve 100% for a course with at least one lesson and every lesson complete. Use one percentage calculation for the meter and label across the library, resume panel, and course detail. Cover 249 of 250, 250 of 250, and zero lessons.

### AUDIT-002 · Text buttons fall below the design minimum

- **File** `src/styles.css:108`
- **Behavior** The shared `.text-button` rule lowers the minimum height to 34 px for controls such as Clear filters and Select as top answer. `DESIGN.md` specifies a 42 px minimum for buttons.
- **Fix** Restore the 42 px hit area while keeping the text treatment. Check the filtered library and reply actions at a narrow viewport.

## P2 — Minor issues

None recorded.

## Data Pipeline Status

| Component | Status | Evidence |
| --- | --- | --- |
| `src/utils/dataManager.js` | Pass | SHA-256 matched `templates/dataManager.js`. The app showed a neutral loading view while the template resolved. |
| Store state sync | Pass | The store has one save call. Learner and instructor actions write linked records with actor and timestamp metadata. The suite observed one baseline sync and zero writes from idle tabs, reloads, and read-only navigation. |
| `POST /post` | Pass | `set` injected a fixture, `set_current` changed the current record without changing the original baseline, and `reset` restored the baseline and cleared the diff. |
| `GET /state` and `GET /go` | Pass | Read stored state and verified the initial state, current state, and top-level diff through localhost. |
| Session isolation and navigation | Pass | Independent session IDs retained separate state. SPA navigation kept the session query, and direct routes and reloads rendered. |
| Injected state | Pass | Exercised empty arrays, a sparse fixture, a single course with 250 lessons, and library and inbox views with 280 records each. |
| Offline assets and build | Pass | `npm run build` passed. The UI uses a text wordmark, CSS artwork, a local icon, and system fonts. Browser tests recorded zero requests outside localhost. |
| Schema accuracy | Pass | Checked the documented record shapes and action paths against the seed, selectors, and mutations. |

## SCHEMA.md Updates

Added endpoint requests and reset behavior, the top-level diff format, verified seed counts and representative IDs, and a minimal injection example.
