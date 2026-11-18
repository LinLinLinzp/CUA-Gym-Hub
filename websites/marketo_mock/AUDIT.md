# Marketo Mock — Audit Report

> Round 2  
> November 18, 2026  
> Audited by the audit agent

## Summary

| Category | Found | Open |
| --- | ---: | ---: |
| Dead handlers / stubs | 1 | 0 |
| Missing state tracking | 0 | 0 |
| Data pipeline gaps | 0 | 0 |
| Schema mismatches | 0 | 0 |
| Incomplete navigation | 1 | 0 |
| Total | 2 | 0 |

## P0 — Dead/Broken Code

### AUDIT-001 · Run now rejected an otherwise valid injected campaign

- **Files** `src/data/model.js`, `src/pages/Campaigns.jsx`, `src/pages/Inventory.jsx`
- **Finding** A campaign without `mode` could show Batch and enable Run once, then reject the confirmed run. An injected campaign with triggers and no mode also lacked the correct activation controls.
- **Resolution** Use the same effective mode for inventory filtering, labels, readiness and execution. Explicit modes take precedence. If mode is missing, a configured trigger implies Trigger and the absence of triggers implies Batch.
- **Verification** Chromium ran the injected Batch against one person and activated the injected Trigger. `/go` contained the completed run, its step result, the affected program membership and the activation activity. The campaign records still omitted `mode`.

## P1 — Incomplete Features

### AUDIT-002 · Return navigation used the previous program scope

- **Files** `src/components/RecordForm.jsx`, `src/pages/Programs.jsx`, `src/pages/Inventory.jsx`
- **Finding** Choosing Database or another program in a scoped creation dialog saved the correct owner but linked the saved record's breadcrumb to the original program's inventory, where the new record was absent.
- **Resolution** Use the saved owner when generating the detail URL after scoped creation. Preserve the session and use the unscoped inventory for a Database list.
- **Verification** Chromium created a Database list from Program A's Assets and a Program B list from Program A's filtered inventory. Each breadcrumb returned to an inventory containing the new list, and `/go` showed the expected owning program or null.

## P2 — Minor Issues

No findings.

## Data Pipeline Status

| Component | Status | Notes |
| --- | --- | --- |
| `dataManager.js` | Pass | SHA-256 matched the shared template. Boot loads before rendering routes. |
| Store state sync | Pass | 23 confirmed actions in the full workflow suite produced 23 whole-state `set_current` requests. No writes on invalid inputs, canceled drafts or unchanged member status. |
| State API | Pass | Shared middleware serves `/post`, `/state` and `/go`. `/state` matched `/go.current_state`. |
| Session isolation | Pass | Independent fixtures retained independent state. Navigation and reload retained `sid`. |
| Initial snapshot | Pass | The initial injected state survived client boot and updates. Reset restored the initial snapshot and cleared the diff. |
| Idle and offline | Pass | An idle second tab sent zero state writes over 3.2 seconds. The toast timer only clears the notice. Chromium recorded zero external requests and no page exceptions. |
| Injected worlds | Pass | Checked empty and sparse records, missing references, unknown keys, and a 360-record inventory. |
| Schema | Pass | Record shapes and action paths match the tested transitions. |

The production build passed. Docker dynamic certification is assigned to the parent runner.

## SCHEMA.md Updates

Added local endpoint and reset behavior, seed ID ranges, a minimal injection fixture, and the effective campaign mode rule. The action table identifies the business records and activity fields used by the verifier.
