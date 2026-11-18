# Grafana Mock — Audit Report

> Round 1  
> Date 2026-11-18  
> Audited by the audit agent

## Summary

| Category | Open issues |
| --- | ---: |
| Dead handlers or stubs | 0 |
| Missing state tracking | 0 |
| Data pipeline gaps | 0 |
| Schema mismatches | 0 |
| Incomplete workflows | 3 |
| Design alignment | 1 |
| **Total** | **4** |

`npm run build` passed. The installed Chromium suite passed the dashboard, alert, and contact point workflows on the Vite dev server at `http://localhost:5491`. It exercised 18 successful mutations and observed one baseline write, one write per mutation, and zero idle writes. It also passed route reloads, session isolation, empty and sparse fixtures, 320-record lists, and the offline request check. Docker certification is assigned to the parent runner.

## P0 — Dead or broken code

None found in the seeded workflows.

## P1 — Incomplete features

### AUDIT-001 · An injected group ID collides with the alert editor's creation control

- **File** [src/pages/Alerts.jsx](src/pages/Alerts.jsx#L185)
- **Reproduction** Inject an evaluation group with ID `new-group` in a valid folder. In New alert rule, fill the required fields, select the existing group, and save.
- **Observed** The editor opens the inline group fields and demands a group name. `/go` shows no saved rule. The schema permits string IDs, and selecting an existing injected group must preserve that ID.
- **Fix** Keep inline group creation in separate draft state. Add a regression check that selecting this existing group writes the exact `alertRules[].evaluationGroupId` and leaves `evaluationGroups[]` unchanged.

### AUDIT-002 · Creating a contact point from a scoped view hides the saved point

- **File** [src/pages/ContactPoints.jsx](src/pages/ContactPoints.jsx#L47)
- **Reproduction** Follow a saved rule's contact point link, then create a different contact point from the scoped list.
- **Observed** `/go` contains the new contact point and the UI confirms the save. The previous `point` parameter still limits the list to the original record. The new point appears only after clicking Show all contact points.
- **Fix** After creation, navigate to the new contact point scope or clear the old scope. Preserve `sid` and keep edits to the currently scoped point visible.

### AUDIT-003 · A saved custom dashboard range cannot be reselected within the draft

- **File** [src/pages/Dashboards.jsx](src/pages/Dashboards.jsx#L341)
- **Reproduction** Inject a dashboard with absolute `timeRange.from` and `timeRange.to` timestamps. Open its editor and change Default time range to Last 24 hours.
- **Observed** The editor removes the original custom option. The dashboard viewer keeps that choice available. Recovering it in the editor requires canceling the draft and discarding any other edits.
- **Fix** Keep the saved custom option available throughout the edit and restore its original pair when reselected. Continue writing the range only on Save dashboard.

### AUDIT-004 · Library typography and responsive spacing differ from DESIGN.md

- **File** [src/styles.css](src/styles.css#L19)
- **Observed** The desktop heading reaches 42px with a line height of about 45px, compared with the specified 36px and 42px line height. Count chips omit tabular numerals, and the folder navigation moves above the list at 950px instead of the specified 900px.
- **Fix** Align these CSS values with [DESIGN.md](DESIGN.md), or update the design specification if the implemented values are intentional.

## P2 — Minor issues

None recorded.

## Data Pipeline Status

| Component | Status | Notes |
| --- | --- | --- |
| `dataManager.js` | Pass | File hash matches the repository template. It caches by session and posts whole-state updates. |
| Workspace hydration and sync | Pass | Hydrates before mounting routes. Business mutations use one store path. Read-only interactions, canceled or invalid forms, previews, and the idle tab produced no writes. |
| `/post` and `/state` | Pass | Template wired in Vite. Confirmed injection, current state retrieval, and reset to the baseline. |
| `/go` and baseline | Pass | Returns JSON with `initial_state`, `current_state`, and `state_diff`. User changes update current state while preserving the initial state. |
| Session isolation and routing | Pass | Checked distinct IDs, route reloads, and query preservation across SPA links. |
| Structured records | Pass | Verified IDs, actor and ISO timestamps, relationship IDs, typed values, and test and deletion records for all three workflows. |
| Offline build | Pass | Production build passed. Runtime uses local assets and generated charts. The Chromium suite observed zero external requests. |
| Schema accuracy | Updated | All top-level state keys, record shapes, and mutation paths are documented. |

## SCHEMA.md Updates

Added the state API reference, seeded ID patterns, and a minimal injected example. Preserved the field-level mapping for observable actions. Application source and existing test evidence were left in place for the next phase.
