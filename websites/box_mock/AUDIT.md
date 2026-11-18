# Box Mock — Audit Report

> Round: 1  
> Date: 2026-11-18  
> Audited by: audit agent

## Summary

| Category | Issues |
| --- | ---: |
| Dead handlers or stubs | 0 |
| Missing state tracking | 0 |
| Data pipeline gaps | 0 |
| Schema mismatches | 0 |
| Incomplete workflows and design alignment | 4 |
| Total | 4 |

## P0 — Dead or broken code

No P0 findings.

## P1 — Incomplete features

### AUDIT-001 · Changing the retention duration discards the selected disposition

- **File** `src/retention.jsx:154`
- **Reproduction** In Create policy, choose Permanently delete, switch Duration to Indefinite, then switch back to 6 years. Disposition has changed to Keep.
- **Cause** The disposition control unmounts for the indefinite option. Its uncontrolled value is recreated from the default or the previous review snapshot.
- **Fix** Keep the finite disposition in the form draft across duration changes. Continue to show and save Keep for an indefinite policy.

### AUDIT-002 · Mobile tables hide workflow metadata

- **Files** `src/style.css:121` and `src/style.css:134`
- **Reproduction** At 320px, All files exposes Name and Actions. Owner and Last modified disappear. The retention list also hides Folders and Disposition.
- **Impact** The design calls for optional columns to move into row detail at narrow widths. Users lose the row metadata when the columns are hidden.
- **Fix** Display the values with labels under the item or policy name at the corresponding breakpoints.

### AUDIT-003 · Long file names push the preview beyond the viewport

- **Files** `src/tasks.jsx:171` and `src/style.css:117`
- **Reproduction** Inject a root file named with 20 consecutive copies of `Quarterly` followed by `.pdf`. At 390px, its preview renders with a 2,724px document scroll width.
- **Cause** The synthetic document heading and footer repeat the filename without a wrap rule for uninterrupted strings.
- **Fix** Allow long filenames to wrap in the locally rendered document, including the page title and footer within the preview.

## P2 — Minor issues

### AUDIT-004 · Field validation appears at the form footer

- **File** `src/ui.jsx:67`
- **Issue** The shared form places application validation errors in a single alert before the action buttons. For example, an invalid folder name displays its error after all optional invitation controls. DESIGN.md calls for field-level placement.
- **Fix** Associate field-specific errors with their controls and render them directly below the relevant field. Keep the shared alert for errors that apply to the whole form.

## Data Pipeline Status

| Component | Status | Notes |
| --- | --- | --- |
| `dataManager.js` | Pass | SHA-256 matches the repository template. |
| Workspace store | Pass | Routes wait for loading to finish. Mutations save through a single store path with structured records and runtime timestamps. |
| Vite `/post` and `/state` | Pass | Template middleware served the injected example, accepted a whole-state update, and restored the baseline on reset. |
| Vite `/go` | Pass | The existing suite exercised all four workflows and verified the six changed arrays and their exact diff entries. |
| Session isolation | Pass | Separate fresh and injected sessions retained independent state. |
| Baseline and idle writes | Pass | Business mutations preserved the initial state. Idle and read-only flows posted no business changes. |
| Injected worlds | Pass | Empty, sparse, and 520-folder worlds rendered. A sparse-world update preserved injected extension fields. AUDIT-003 covers a preview layout issue with a valid injected name. |
| Offline assets and build | Pass | Local SVGs, system fonts, and synthetic previews. Chromium reported no outbound requests during the acceptance run. `npm run build` passed. |
| `SCHEMA.md` accuracy | Pass | Verified the record shapes and observable writes against the store and workflow handlers. |

## SCHEMA.md Updates

Documented the local URL, session-scoped API calls, representative fixed IDs, and a minimal injection example. Verified the example by injecting it into a fresh session, creating a folder in Chromium, checking `/go`, and resetting the baseline. Clarified the secondary retention assignment writes on folder relocation and policy activation.
