# SharePoint Mock — Audit Report

> Round: 1  
> Date: 2026-11-18  
> Audited by: audit agent

## Summary

| Category | Issues |
| --- | ---: |
| Dead handlers / stubs | 0 |
| Missing state tracking | 0 |
| Data pipeline gaps | 0 |
| Schema mismatches | 0 |
| Workflow and accessibility defects | 3 |
| Responsive design deviations | 1 |
| Total | 4 |

`npm run build` passed. The existing Chromium acceptance suite passed again on the SharePoint Vite dev server at `http://localhost:5394`. It exercised the sites, lists and document-library workflows and observed 20 `set_current` requests. Empty, sparse and 300-record fixtures rendered. Deep links, local previews, downloads, same-browser session isolation and idle state passed. The source scan found working handlers for the planned actions and local runtime assets. Docker certification is assigned to the parent runner.

## P0 — Dead/Broken Code

None found.

## P1 — Incomplete Features

### AUDIT-001 · The Status filter fails for numeric columns

- **File**: `src/list.jsx:33`
- **Reproduce** by opening a list with a number column named `Status` and rows containing `0` and `2`. The filter offers `2` and omits `0`. Selecting `2` yields zero rows.
- **Cause**. The status option builder drops zero and the filter compares the string from the select with the typed value from the record.
- **Fix**. Use the same string representation for option construction and matching. Keep zero as a valid value and reserve the empty string for All statuses. Add coverage for `0` and `2` while preserving the choice-column behavior.

### AUDIT-002 · The Sites view and URL disagree

- **File**: `src/sites.jsx:69`
- **Reproduce** by opening Home → View following, choosing All sites, and reloading. The URL still has `view=following` and the reload returns to Following. A direct `/sites` visit has the reverse problem after switching to Following.
- **Cause**. The component reads `view` during initialization and changes only its local state when switching views.
- **Fix**. Read and update the current router query when switching views. Preserve `sid` and make the rendered view follow browser history and reloads.

### AUDIT-003 · Canceling a creation dialog loses keyboard focus

- **Files**: `src/sites.jsx:221`, `src/ui.jsx:34`
- **Reproduce** by opening Site contents → New → New list and canceling. Focus falls to `BODY`.
- **Cause**. The action closes the disclosure before the modal captures focus. The action inside the disclosure is then hidden.
- **Fix**. Restore focus to the visible New summary when a creation dialog is dismissed on the same route. Verify Cancel and Escape for both creation dialogs.

### AUDIT-004 · Responsive navigation and panels diverge from the design

- **Files**: `src/styles.css:80`, `src/styles.css:92`, `src/styles.css:100`
- **Issue**. `DESIGN.md` specifies a labeled collapsed navigation control below 900 px and full-width panels below 600 px. The rail becomes an always-visible horizontal navigation row. At a 550 px viewport, Chromium measured a 440 px New item panel.
- **Fix**. Implement the labeled navigation control at the specified breakpoint and let item and preview panels use the full viewport width below 600 px. Verify the visible navigation and panel layout at the breakpoint and on narrow mobile.

## P2 — Minor Issues

None found.

## Data Pipeline Status

| Component | Status | Notes |
| --- | --- | --- |
| `dataManager.js` | Pass | Byte-for-byte matches the shared template. Loads with session-scoped storage and sends whole-state saves. |
| Workspace state sync | Pass | Business writes run through `commit`. Timers dismiss toasts or release download URLs and leave Harbor state alone. The idle tab posted no writes during the 11-second check. |
| Vite `/post`, `/state` and `/go` | Pass | Uses the shared middleware. Separate endpoint checks verified response shape, current snapshot updates and an empty diff after reset. |
| Uploads and local assets | Pass | Uses same-origin upload, file and seed paths. The browser verified bytes through rename and move, and observed no off-origin HTTP requests. |
| Session isolation | Pass | The same browser context loaded independent fixtures under separate `sid` values. The original session state stayed stable. |
| Initial snapshot handling | Pass | Further writes preserve the first snapshot. Harbor reset restores the initial snapshot. |
| Structured records | Pass | Sites, lists, items, libraries, entries, follows and removals carry the identifiers and metadata needed to verify mutations. |
| `SCHEMA.md` accuracy | Pass | All nine state keys and the mutation table match the implementation. |

## SCHEMA.md Updates

Added endpoint examples, reset and diff semantics, default IDs, sparse fixture notes and a minimal injection. Confirmed each workflow's exact state footprint against the handlers and `/go`.
