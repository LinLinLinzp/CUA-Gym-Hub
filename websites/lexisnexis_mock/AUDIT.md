# LexisNexis Mock — Audit Report

> Round: 1  
> Date: 2026-11-18  
> Audited by: audit agent

## Summary

| Category | Issues |
| --- | ---: |
| Dead handlers / stubs | 0 |
| Missing state tracking | 0 |
| Data pipeline gaps | 0 |
| Schema mismatches after audit update | 0 |
| Incomplete features | 2 |
| Design alignment | 1 |
| Total | 3 |

## P0 — Dead/Broken Code

None found. The production build and the Chromium acceptance suite passed on `localhost:5418` against both Vite dev and the built preview. The suite exercised research folders, citations and alerts, including structured `/go` records after each successful action.

## P1 — Incomplete Features

### AUDIT-001 · Injected jurisdictions are missing from two selectors

- **Files** `src/Research.jsx:62`, `src/Alerts.jsx:101`
- **Issue** An injected case with `jurisdiction: "nevada"` appears in research results and can be filtered through a direct URL. The Research jurisdiction selector and the standalone alert editor only offer seeded jurisdictions, so a user cannot select Nevada in either control.
- **Fix** Extend the jurisdiction choices from the loaded document corpus and retain the display labels for known codes. Verify that Research can select the injected jurisdiction and that a standalone alert writes it to `alerts[].source.filters.jurisdiction`.

### AUDIT-002 · Frequency sort orders display labels alphabetically

- **File** `src/Alerts.jsx:134`
- **Issue** Selecting **Frequency** orders the injected email alerts as As available, Business days, Daily, Monthly, Weekly. Online-only alerts also sort by their delivery label. Users cannot order monitors by cadence.
- **Fix** Define an explicit cadence order, place online-only or unspecified frequencies in a consistent group, and use title to break ties.

### AUDIT-003 · Primary button padding and stacked panel gaps differ from the design

- **Files** `DESIGN.md`, `src/styles.css:20`, `src/styles.css:118`
- **Issue** The stylesheet applies 14px horizontal padding to primary buttons and 20px gaps in stacked sections. The design specifies 16px and 24px respectively.
- **Fix** Apply the design spacing to primary buttons and stacked sections. Check that actions still wrap at the mobile breakpoint.

## P2 — Minor Issues

None recorded.

## Data Pipeline Status

| Component | Status | Notes |
| --- | --- | --- |
| `dataManager.js` | ✅ | SHA-256 matches the shared template. Boot loads defaults and injected state before route rendering. |
| Workspace state sync | ✅ | A single store commit persists whole-state changes. Browser checks confirmed one mutation post per successful action and zero idle posts after boot, including when a second tab wrote to the same SID. |
| Vite `/post` and `/state` | ✅ | Shared state API is wired for dev and preview. Injection, retrieval, update and baseline restoration passed. |
| Vite `/go` | ✅ | Returns initial and current state plus the top-level diff. Checked the exact record changes for folders, citations and alerts. |
| Session isolation and routing | ✅ | An independent SID retained default data. SPA navigation preserved the SID and deep links survived reload. |
| Initial state handling | ✅ | Partial injection retained its initial snapshot while boot merged defaults into current state. `set_current` preserved an established baseline, and `reset` restored it. These are the shared template semantics required by Harbor. |
| Injected worlds | ✅ | Empty, sparse and large worlds rendered. Mutation preserved unrelated collections and unknown injected keys. See AUDIT-001 for a control that omits an injected option. |
| Offline build | ✅ | Built assets, font and icon loaded locally. Chromium observed zero external requests and no page errors in the acceptance suite. |
| `SCHEMA.md` accuracy | ✅ | Seed counts and ID ranges checked against `createInitialData()`. The observable change table matches the store and browser results. |

## SCHEMA.md Updates

Added the localhost endpoint reference, shared API baseline and reset behavior, fixed seed ID ranges and a minimal injectable world. The record shapes and action-to-field mapping were verified against the existing implementation.

The full browser suite is documented in `TEST.md`. The targeted audit checks ran from the ignored `test-results/audit-edge-cases.cjs` runner. Docker dynamic certification is assigned to the parent runner.
