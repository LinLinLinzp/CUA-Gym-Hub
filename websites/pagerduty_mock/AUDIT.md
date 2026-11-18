# PagerDuty Mock — Audit Report

> Round: 1  
> Date: 2026-11-18  
> Audited by: audit agent

## Summary

| Category | Issues |
| --- | ---: |
| Dead handlers / stubs | 0 |
| Missing state tracking | 0 |
| Data pipeline gaps | 0 |
| Schema mismatches | 0 remaining |
| Workflow edge cases | 2 |
| Design alignment | 1 |
| Total open | 3 |

## P0 — Dead/Broken Code

No P0 issues found. Save, delete, filter, navigation, and confirmation controls have handlers. The three seed workflows produced structured records in `/go`.

## P1 — Incomplete Features

### AUDIT-001 · Adjacent coverage gaps can cover short shift controls

- **File** `src/style.css:203`, `src/Schedules.jsx:68`
- **Reproduction** At a 1280px desktop viewport, inject a 90-minute override with a gap immediately after it. Open its schedule week and click the center of the short override band. Chromium reports that the following gap intercepts the pointer. Keyboard activation still opens the form.
- **Cause** The band uses a duration-based percentage width but has 14px of horizontal padding. Narrower bands overlap the next band, which paints over the control. The reproduced 90-minute band had a computed width of 14px and its center hit the gap.
- **Fix** Keep the band hit area within its calculated boundaries. Put label spacing on an inner, clipped element and provide a usable shift control when the proportional band is too narrow for a pointer target. Test an ordinary short override followed by a gap.

### AUDIT-002 · Selecting a shift in the repeated hour can save a different UTC range

- **File** `src/Schedules.jsx:81`, `src/coverage.js:32`
- **Reproduction** Inject an active `America/New_York` shift override from `2026-11-01T06:30:00.000Z` to `2026-11-01T08:00:00.000Z`. Open the shift's override form, choose a different responder, and submit the prefilled times. `/go.current_state.scheduleOverrides` records a new start of `2026-11-01T05:30:00.000Z`. The selected shift began at the second 1:30 a.m. and the form parsed it as the first.
- **Fix** Keep the selected shift's exact instant for each untouched prefilled endpoint. Apply explicit ambiguity handling when the operator edits a repeated local time. Verify both repeated-hour occurrences against `/go`.

### AUDIT-003 · Sidebar spacing and avatar color differ from the design

- **File** `src/style.css:42`, `src/style.css:55`
- **Issue** The desktop sidebar uses 16px horizontal padding and the avatar uses `#DBECE2`. `DESIGN.md` specifies 20px padding and `#BCEAC7` for the profile avatar. The shell otherwise follows the documented typography, main palette, and dialog treatment in the spot check.
- **Fix** Align the desktop gutter and avatar fill with `DESIGN.md`. Check the compact header after the desktop adjustment.

## P2 — Minor Issues

No P2 issues recorded.

## Data Pipeline Status

| Component | Status | Notes |
| --- | --- | --- |
| `dataManager.js` | Pass | Byte-identical to the template. Cold boot fetched and merged injected state before rendering. Warm reload used the session cache. |
| Store state sync | Pass | One centralized full `set_current` per tested business action. Actor and ISO timestamp verified on activity records. No timer-driven writes found in source or during the browser idle check. |
| Vite `/post` and `/state` | Pass | `set`, `set_current`, and `reset` exercised. Under the required template, `reset` restores the baseline and keeps it available in `/state`. |
| Vite `/go` | Pass | Initial state, current state, and added and modified diff entries verified. The diff reflects changes relative to the original baseline. |
| Session isolation | Pass | Separate test sessions kept their records apart. Routes and hard reloads preserved the active session. |
| Initial snapshot | Pass | First `set` established the initial snapshot. Later `set` and `set_current` preserved it. |
| Offline assets and injected worlds | Pass | Local assets only. Empty, sparse singleton, and 350-record lists rendered with no uncaught browser errors in the main suite. |
| `SCHEMA.md` accuracy | Updated | Record shapes, default IDs, endpoints, and action footprints match the implementation. |

## SCHEMA.md Updates

Added the required endpoint header, fixed ID patterns, a minimal empty injection, and the verifier table heading. Documented the template's reset behavior, browser cache, and baseline-relative diff. The app source and runtime templates were reviewed as the audit target.
