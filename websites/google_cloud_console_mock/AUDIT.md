# Google Cloud Console Mock — Audit Report

> Round 1  
> Date 2026-11-18  
> Audited by audit agent

## Summary

| Category | Issues |
|---|---:|
| Dead handlers / stubs | 0 |
| Missing state tracking | 0 |
| Data pipeline gaps | 0 |
| Schema mismatches | 0 after documentation updates |
| Incomplete billing behavior | 2 |
| Total | 2 |

`npm run build` passed. The localhost Playwright workflow suite verified 19 business snapshots and 20 activity records through `/go`. IAM grants, replacements and revocations, VM lifecycle, bucket and object management, budgets, and project billing changes all persisted. The focused audit used separate synthetic sessions on port 5484.

## P0 — Dead/Broken Code

None found.

## P1 — Incomplete Features

### AUDIT-001 · Overview adds amounts across currencies

- **File** `src/pages/Overview.jsx:52`
- **Reproduction** Inject a project currently linked to a EUR account, with USD 100 of historical monthly usage on its previous account and EUR 50 on its current account. Open Overview and follow Billed usage to Reports.
- **Observed** Overview displays €150.00. Reports for the linked EUR account displays €50.00. Overview sums all project cost rows as cents, then formats the result in the current account's currency.
- **Fix** Group project usage by its stored currency and display separate totals when multiple currencies are present. Keep historical account attribution intact and align the report link with the displayed project and account scope.

### AUDIT-002 · Budget project disappears from an unsaved edit

- **File** `src/pages/Billing.jsx:162`
- **Reproduction** Edit an existing budget that targets a project which has since moved to another billing account. Uncheck the previously selected project.
- **Observed** The checkbox immediately disappears, so the user must cancel and reopen the edit to restore the selection. The form builds the option set from linked projects and the draft selections.
- **Fix** Build the options from linked projects and the saved budget's original project IDs. Keep the option set stable while the user edits the draft.

## P2 — Minor Issues

None filed.

## Data Pipeline Status

| Component | Status | Notes |
|---|---|---|
| `src/utils/dataManager.js` | Pass | SHA-256 matches the required template. A fresh session loads injected state and publishes a baseline. |
| Workspace store | Pass | Each successful transaction saves one JSON snapshot with structured resource and activity records. The only application timer dismisses the transient notice. The workflow suite observed zero idle writes over 5.5 seconds. |
| Vite `/post` and `/state` | Pass | Vite imports the required state API. Verified first-write baseline, replacement current snapshot, and reset to baseline. |
| Vite `/go` | Pass | Verified `initial_state`, `current_state`, and `state_diff` for the API checks and business writes. |
| Session isolation and baseline | Pass | Separate `sid` values held separate state. Both repeated `set` and `set_current` preserved the initial snapshot. |
| Injected states and routes | Pass for rendering | Empty collections, sparse records, a 240-VM list, deep links, and reloads rendered successfully. Findings above cover injected billing behavior. |
| Offline assets | Pass | The UI uses bundled styles, system fonts, and local icons. Browser tests observed zero external requests. |
| `SCHEMA.md` | Pass | Documents all ten top-level keys and the exact state footprint of each mutation. |

The required Harbor template restores the initial snapshot on reset. The parent runner handles Docker dynamic certification.

## SCHEMA.md Updates

Added localhost endpoint details, all seeded ID ranges, a minimal injection body, and the session and reset semantics confirmed on localhost. Clarified budget threshold uniqueness per percentage and spend basis.
