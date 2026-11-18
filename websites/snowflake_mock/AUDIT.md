# Snowflake Mock — Audit Report

> Round: 1  
> Date: November 18, 2026  
> Audited by: audit agent

## Summary

| Category | Issues |
| --- | ---: |
| Dead handlers / stubs | 0 |
| Missing state tracking | 0 |
| Unexpected state writes | 2 |
| Data pipeline gaps | 0 |
| Incomplete filters | 1 |
| Design alignment | 1 |
| Open schema mismatches | 0 |
| Total | 4 |

The production build and all seven existing Playwright groups passed on localhost. Targeted Playwright checks reproduced three additional issues. The fourth comes from comparing the stylesheet with `DESIGN.md`.

## P0 — Dead/Broken Code (must fix before testing)

### AUDIT-001 · Worksheet shortcuts bypass confirmation dialogs · Resolved on 2026-11-18

- **File**: `src/pages/Worksheets.jsx:136`, `src/pages/Worksheets.jsx:155`, `src/pages/Worksheets.jsx:196`
- **Element**: Ctrl+S and Ctrl+Enter when a worksheet confirmation is open.
- **Issue**: The shortcuts are handled by an ancestor of both dialogs. With **Discard unsaved changes?** open and **Cancel** focused, Ctrl+Enter saved the draft SQL in `worksheets[].sql`, appended a row to `queryRuns`, and wrote `worksheet.updated` and `worksheet.query_ran` to `activity`. The dialog stayed open. With **Delete worksheet** open, Ctrl+S also persisted an unsaved SQL edit.
- **Fix**: Limit shortcut handling to the editor and its controls, or ignore shortcuts while either confirmation has focus. Exercise both shortcuts in both dialogs and assert zero POSTs and unchanged `/go` current state. Confirm the shortcuts still work in the editor.

## P1 — Incomplete Features

### AUDIT-002 · An unchanged warehouse form writes a cluster count

- **File**: `src/pages/Warehouses.jsx:110`, `src/pages/Warehouses.jsx:127`
- **Element**: **Edit warehouse → Save changes** on an injected partial record.
- **Issue**: A started warehouse with complete editable settings and no `activeClusters` rendered correctly. Opening its editor and saving without changing any inputs set `activeClusters` to `1`, updated its timestamp, and appended `warehouse.updated` with `activeClusters: { from: null, to: 1 }`. Comparing prefilled fallback settings directly with an incomplete record can also count untouched inputs as changes.
- **Fix**: Compare the submitted settings with the prefilled values and skip unchanged submissions. Only derive a new active count for a started warehouse when the cluster limits change. Verify unchanged saves for full and partial records and verify that a genuine limit change still updates cluster settings and activity.

### AUDIT-003 · Query history warehouse filter conflates two valid values

- **File**: `src/pages/QueryHistory.jsx:15`, `src/pages/QueryHistory.jsx:20`, `src/pages/QueryHistory.jsx:29`
- **Element**: Query history’s **Warehouse** filter.
- **Issue**: The **No warehouse** option uses the value `none`, which is also an allowed injected warehouse ID. With one run linked to warehouse ID `none` and another run with a null warehouse ID, selecting either option returned both rows.
- **Fix**: Give the no-warehouse option its own filter value and encode warehouse IDs in a separate value space. Verify that both options show one distinct row and that filtering creates no POST.

### AUDIT-004 · Toolbar spacing and revoke control height differ from the design

- **Files**: `src/styles.css:87`, `src/styles.css:135`, `DESIGN.md`
- **Issue**: The toolbar leaves 16px before the table where the design specifies 24px between the toolbar and data. The role grant row sets 32px as the **Revoke** button’s minimum height. The design’s button minimum is 36px.
- **Fix**: Use the prescribed toolbar spacing and inherit the 36px button height for **Revoke**. Verify at desktop and mobile widths.

## P2 — Minor Issues

None found.

## Data Pipeline Status

| Component | Status | Notes |
| --- | --- | --- |
| `dataManager.js` | ✅ | SHA-256 matches the Harbor template. Loads with the template’s URL and session-storage behavior and writes through local storage and the session API. |
| Account store state sync | ⚠️ | One centralized save per committed transaction. All required actions produced structured records. AUDIT-001 and AUDIT-002 trigger transactions in situations that should leave state untouched. |
| Vite `/post` and `/state` | ✅ | Uses the unchanged shared plugin. Verified `set`, `set_current`, `reset`, and reads on port 5488. |
| Vite `/go` | ✅ | Verified the initial state, current state, and changed top-level collections against persisted records. |
| Session isolation and `sid` | ✅ | The suite verified separate sessions, preserved query parameters in SPA navigation, and hard reloads. |
| Initial state and reset | ✅ | `set_current` preserved the original baseline. Reset restored that baseline with an empty diff, following the shared Harbor template. |
| Bootstrap and idle | ✅ | Routes mount after loading. The suite saw one baseline POST and zero additional idle POSTs. Source inspection found no timer-driven writes. |
| Injected state | ⚠️ | Empty, singleton, partial, and 350-record collections rendered on localhost. AUDIT-002 and AUDIT-003 affect interactions with supported injected data. |
| Offline assets and build | ✅ | `npm run build` passed. The existing suite detected no requests outside localhost. The UI uses system fonts, CSS, and inline original icons. |
| `SCHEMA.md` accuracy | ✅ | All nine top-level keys, record shapes, and action-to-field mappings are documented. |

## SCHEMA.md Updates

Added endpoint and reset details, seed IDs, a minimal worksheet injection, and a description of the initial/current diff behavior. Verified the declared seed counts against `createInitialData()`. The existing `TEST.md` records the earlier workflow run. Docker dynamic certification remains assigned to the parent runner.

## P0 audit replay, 2026-11-18

- **AUDIT-001 · Previously fixed, retested.** The browser regression exercised Ctrl+S and Ctrl+Enter inside both confirmations and in the worksheet editor.

Docker dynamic certification run `125084` recorded render pass, sync pass (1 startup POST), idle pass (0 idle POSTs), and hydrate pass.
