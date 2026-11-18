# Moodle Mock — Audit Report

> Round 1  
> Date 2026-11-18  
> Audited by audit agent

## Summary

| Category | Issues |
| --- | ---: |
| Dead handlers / stubs | 0 |
| Incomplete workflow wiring | 1 |
| Missing state tracking | 0 |
| Data pipeline gaps | 0 |
| Open schema mismatches | 0 |
| **Total** | **1** |

## P0 — Dead/Broken Code

No findings.

## P1 — Incomplete Features

### AUDIT-001 · Adding an activity from the unfiled panel selects the first named section

- **Files** `src/pages/Courses.jsx:70`, `src/pages/Courses.jsx:81`, and `src/pages/Assignments.jsx:113`.
- **Element** The **Add assignment** link in the **Activities** panel on a course page.
- **Reproduction** Inject a course with a named section and an assignment with no `sectionId`. Open the course, click **Add assignment** in the **Activities** panel, enter a title, and save with the preselected section. Chromium showed the named section selected and `/go.current_state.assignments` contained its ID on the new assignment. The gitignored runner `node test_audit.mjs` reproduces this behavior.
- **Fix** Use an explicit empty section query parameter for the unfiled panel and preserve the distinction between that parameter and an absent parameter in the form. The general page action can still default to the first named section. Retest all three entry points and verify that creation from **Activities** writes `sectionId: null`.

## P2 — Minor Issues

No findings.

## Data Pipeline Status

| Component | Status | Notes |
| --- | --- | --- |
| `dataManager.js` | ✅ | SHA-256 matches the repository template. |
| Workspace boot and state sync | ✅ | Routes mount after loading. Each audited mutation sent one full-state `set_current`. Read-only actions, failed validation, reload and the 2.5-second idle observation sent no mutation POSTs. No timer writes domain state. |
| Vite `/post` and `/state` | ✅ | Vite imports the shared middleware. Fresh browser boot sent one baseline `set`. Explicit injection replaced arrays, merged partial account fields and preserved unknown keys through an edit. A local API reset restored the initial snapshot and cleared the diff. |
| Vite `/go` and initial snapshot | ✅ | `current_state` reflected linked records, numeric and null scores, actor IDs and ISO timestamps. The initial snapshot stayed unchanged through workflow writes. |
| Session isolation and routing | ✅ | Navigation and submission filters kept `sid`. A fresh SID had separate state. All 15 planned routes rendered with empty injected arrays. Tested optional-field fallbacks and pagination with 250 injected students. |
| Offline assets and build | ✅ | `npm run build` passed. Chromium reported zero page errors and off-origin requests. The UI uses original local CSS artwork and system fonts. |
| `SCHEMA.md` accuracy | ✅ | Documents all 11 top-level keys and the observed action fields. |

## SCHEMA.md Updates

Added endpoint commands, fixed seed ID examples and a minimal injection example. Clarified Vite reset and fresh-SID behavior. Fixed the Observable State Changes table so the read-only export renders as its final row.
