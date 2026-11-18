# Semrush Mock — Audit Report

> Round 1  
> Date 2026-11-18  
> Audited by the audit agent

## Summary

| Category | Open issues |
| --- | ---: |
| Dead handlers / stubs | 0 |
| Missing state tracking | 1 |
| Data pipeline gaps | 0 |
| Schema mismatches | 0 |
| Incomplete controls | 1 |
| Design alignment | 1 |
| Total | 3 |

The production build and existing localhost Playwright suite passed. The suite verified 17 business actions across Projects, Position Tracking and Site Audit through `/go`. Two additional Playwright scenarios reproduced the findings below with injected state. The application uses text branding, synthetic fixtures and locally drawn visuals.

## P0 — Dead/Broken Code (must fix before testing)

### AUDIT-001 · First crawl leaves confirmed defaults out of an injected configuration

- **File** `src/Audit.jsx:187`
- **Feature** Start Audit with an existing sparse `auditConfigs` row and no runs.
- **Issue** `crawlFields` supplies fallback settings in the form. The save compares against those same fallbacks, so the accepted defaults never reach the canonical `auditConfigs` record. Playwright confirmed that a submitted page limit of 100 reached `auditRuns[0].settingsSnapshot.pageLimit`, while `/go.current_state.auditConfigs[0].pageLimit` was absent. The same comparison affects the other omitted settings.
- **Fix** On the first crawl, write the full validated settings into the existing configuration while preserving its ID, excluded checks and unrelated injected fields. Preserve the diff-based behavior for ordinary settings edits. Verify both the configuration and run snapshot through `/go`.

## P1 — Incomplete Features

### AUDIT-002 · Target selector cannot distinguish language variants

- **File** `src/Tracking.jsx:54`
- **Element** Tracking target selector.
- **Issue** Each option includes target, engine, device and location. Campaigns that differ only by language have identical labels. Playwright confirmed that English and French campaigns appeared as the same option text and that switching between them did load different campaign IDs. Scope can also distinguish otherwise matching variants.
- **Fix** Include the saved language and human-readable scope in each option label, with a fallback for partial records.

### AUDIT-003 · Related controls use a different gap from the design specification

- **File** `src/styles.css:62` and `src/styles.css:83`
- **Issue** `DESIGN.md` specifies a 12px gap between related controls. Action groups and toolbars use 10px on desktop.
- **Fix** Use the specified gap for desktop action groups and filters, then verify the existing mobile wrapping at 375px.

## P2 — Minor Issues

None found.

## Data Pipeline Status

| Component | Status | Notes |
| --- | --- | --- |
| `dataManager.js` | ✅ | Matches the repository template. Fresh loads merge injected state and mutations save the complete state to local storage and the API. |
| Workspace state sync | ⚠️ | The centralized `commit` records actor, timestamp and linked IDs. First-run persistence of an injected sparse audit configuration is covered by AUDIT-001. |
| Vite `/post` and `/state` | ✅ | Verified injection, user-driven saves and reset to the initial baseline using the shared template. |
| Vite `/go` | ✅ | Returned JSON with `initial_state`, `current_state` and `state_diff`. All 17 suite mutations were observable. |
| Session isolation (`?sid=`) | ✅ | Verified independent sessions and retained IDs on report routes and reload. |
| `.initial.json` handling | ✅ | User mutations preserved the baseline. Reset restored that baseline and cleared the diff, as implemented by the mandated shared template. |
| Idle behavior | ✅ | The suite observed zero mutation POSTs from an idle tab while another tab mutated the session. The CSV timer only releases a local blob URL. |
| Injected state | ⚠️ | Empty collections, sparse linked records and 241 injected projects rendered. AUDIT-001 covers persistence after interacting with one sparse world. |
| Offline assets | ✅ | Playwright observed no external requests. Styling, illustrations and charts are local. |
| `SCHEMA.md` accuracy | ✅ | Verified and updated against the current runtime and seed. |

## SCHEMA.md Updates

Added the endpoint reference, reset semantics, fixed fixture IDs and a minimal injection example. Kept all ten root keys and the action-to-state mapping. Clarified where the start action stores effective crawl settings.

## P0 audit replay, 2026-11-18

- **AUDIT-001 · Previously fixed, retested.** The audit edge script verified all confirmed crawl settings were present in both the injected configuration and its first-run snapshot.

Docker dynamic certification run `154644` recorded render pass, sync pass (1 startup POST), idle pass (0 idle POSTs), and hydrate pass.
