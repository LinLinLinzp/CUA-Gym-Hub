# Medicare.gov Mock — Audit Report

> Round 1  
> Date November 18, 2026  
> Audited by audit agent

## Summary

| Category | Open | Resolved during audit |
| --- | ---: | ---: |
| Dead handlers or stubs | 0 | 0 |
| Missing state tracking | 0 | 0 |
| Data pipeline gaps | 0 | 0 |
| Schema documentation gaps | 0 | 1 |
| Workflow and design gaps | 3 | 0 |
| Total | 3 | 1 |

## P0 — Dead or broken code

None found. All three seed workflows passed through their normal browser entry points and produced the expected structured records in `/go`.

## P1 — Incomplete features

### AUDIT-001 · Mobile comparison controls are below the entire catalog

- **Files** `src/pages/Plans.jsx:145`, `src/styles.css:132`
- **Evidence** At a 360 × 780 viewport, selecting the first two plans in the default 18-plan list left the **Compare 2 plans** link at viewport coordinate y=6008. The tray follows the results and its mobile rule sets it to static positioning. Larger injected catalogs increase the distance.
- **Fix** Put a comparison action near the results or keep it in view on narrow screens as selections change. Keep selected names, removal and the limit feedback accessible without traversing the catalog. Verify with the default and 240-plan worlds.

### AUDIT-002 · Keyboard focus drops when enrollment changes steps

- **File** `src/pages/Enrollment.jsx:95–167`
- **Evidence** Pressing Enter on **Review enrollment request** or **Back to edit** removes the focused control. Chromium reported `document.body` as the active element after both transitions.
- **Fix** Focus the newly displayed step heading or the first relevant control after each transition. Preserve the current behavior that focuses the first invalid field during validation.

### AUDIT-003 · Wordmark, secondary text and tray elevation diverge from the design

- **File** `src/styles.css` (`.wordmark`, `small,.small`, `.tray`)
- **Evidence** The core palette, typefaces, card border and layout breakpoints match `DESIGN.md`. The wordmark and secondary text inherit 1.5 line height where the design specifies 1.2 and 1.45 respectively. The tray uses `#102c422b` for its shadow where the design specifies `#102c4217`.
- **Fix** Apply the specified line heights and tray shadow color.

## P2 — Minor issues

None found.

## Data Pipeline Status

| Component | Status | Notes |
| --- | --- | --- |
| `dataManager.js` | Healthy | SHA-256 matches the root template. Boot waits for `loadState` behind a neutral loading screen. |
| Store state sync | Healthy | One store append path calls `saveState` once per successful action. The main browser session sent one baseline `set` and one `set_current` for each seed workflow. Idle windows posted zero requests after baseline. |
| Vite `/post`, `/state` and `/go` | Healthy | The shared state API is registered for development and preview. The audit verified `set_current`, stable initial state, the state diff and reset. The shared template restores current state from the initial snapshot on reset. |
| Session isolation | Healthy | Distinct session IDs stayed isolated. SPA links preserved `?sid=` across navigation, and reloads reopened saved records. |
| Injected worlds | Healthy | Empty collections, single partial records, missing plan references and 240-record collections rendered without page errors. |
| Offline runtime | Healthy | The browser suite observed localhost traffic only. The wordmark is text, fonts use system stacks, and the overview illustration is a local SVG. |
| `SCHEMA.md` | Updated | All six top-level keys, nested shapes and exact observable writes agree with the implementation. |

`npm run build` passed with non-fatal React Router module-directive warnings. The installed Node Playwright workflow suite passed on Vite dev and production preview on port 5513. Workflow evidence remains in `TEST.md`. The parent runner handles Docker dynamic certification.

## SCHEMA.md Updates

Added the runtime endpoint examples, typed record shapes, default ID ranges and a minimal injection. Documented the exact append fields, duplicate handling and the first-snapshot behavior for sparse injections.
