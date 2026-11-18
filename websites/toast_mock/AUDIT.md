# Toast Mock — Audit Report

> Round 1  
> Date November 18, 2026  
> Audited by audit agent

## Summary

| Category | Issues |
| --- | ---: |
| Dead handlers or stubs | 0 |
| Missing state tracking | 0 |
| Data pipeline gaps | 0 |
| Schema documentation gaps, corrected in this audit | 1 |
| Workflow edge cases | 2 |
| Total open | 2 |

## P0 — Dead or broken code

None found. Menu publication, check creation and settlement, time entry history, and item refunds produced structured records in `/go` during the local browser audit. The existing [TEST.md](TEST.md) covers the remaining workflow variants, including voids, time entry corrections and closures, and full and custom refunds.

## P1 — Incomplete features

### AUDIT-001 · Orders retains the refund lookup filter

- **File** `src/pages/Orders.jsx`, `Orders`
- **Reproduction** Open Refunds, choose **Find a check**, then select **Orders** in the navigation rail. The page title becomes Orders, while **Order status** remains **Paid**. Open and voided checks stay hidden until the manager clears the filter. The reverse transition can likewise retain a list filter instead of applying the paid lookup default.
- **Cause** Both views use the same mounted component on `/orders`. The `useState` initializer reads the `status` search parameter only on mount.
- **Fix** Initialize the status filter when switching between standard Orders and refund lookup. Verify the default in both directions, and verify that navigation preserves `sid`.

### AUDIT-002 · Labor cannot represent both occurrences of a repeated clock time

- **Files** `src/data/model.js`, `fromLocal`, and `src/pages/Labor.jsx`, `EntryEditor`
- **Reproduction** For an employee with no overlapping shifts in `America/New_York`, add a shift on November 1, 2026, from `01:45` EDT to `01:15` EST. These are `05:45Z` and `06:15Z`, so the shift lasts 30 minutes. The form reports that clock-out must be later than clock-in, and both labor arrays remain empty.
- **Cause** The local datetime input and conversion represent only one instant for each wall time in the repeated hour. The form offers no way to specify the offset for new or changed timestamps.
- **Fix** When a time maps to two instants, offer the two offsets and let the manager choose the intended occurrence. Use the resulting instants for overlap and elapsed-time checks. Verify that the example saves `workedMinutes: 30` and stores matching ISO timestamps in the time entry and its history snapshot.

## P2 — Minor issues

None found.

## Data Pipeline Status

| Component | Status | Evidence |
| --- | --- | --- |
| `dataManager.js` | Pass | SHA-256 matches `templates/dataManager.js`. A fresh browser loaded its session, posted one baseline, and made zero idle writes during observation. |
| Boot, routing, and app state sync | Pass | Routes render after `loadState`. One central commit saves each successful transaction. A hard reload reopened the new check, and links retained the session ID. Refund review issued no write. |
| `/post`, `/state`, and `/go` | Pass | Vite imports the standard Harbor API. The audit exercised a fresh baseline, injection, `set_current`, and reset on port 5459. `/go` exposed the expected seven changed collections for the audited transactions. |
| Session isolation and initial state | Pass | A second session was untouched. Writes preserved the first session's initial snapshot. Reset restored that snapshot and cleared its diff. |
| Injected worlds | Pass | Empty ledgers and an injected account with sparse employee and job records rendered. An invalid order ID showed a recoverable empty view. The prior browser run in [TEST.md](TEST.md) covered an injection with 420 checks. |
| Structured records | Pass | Audited writes included IDs, links, actors, and ISO timestamps. Payment and refund summaries updated alongside their respective records. Labor saved a time entry and linked history together. |
| Offline assets and production build | Pass | `npm run build` passed. Playwright observed zero off-origin page requests. The UI uses a text wordmark, system fonts, bundled icons, and the local service pattern. |
| `SCHEMA.md` | Updated | The documented fields and seed IDs match the implementation. |

Docker dynamic certification is assigned to the parent runner.

## SCHEMA.md Updates

Added localhost endpoint instructions, baseline and reset semantics, seed ID ranges, and a valid minimal injection. Marked guest and table names as optional and retained the action-to-field mappings.
