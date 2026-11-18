# Brex Mock — Audit Report

> Round 1  
> Date 2026-11-18  
> Audited by audit agent

## Summary

| Category | Issues found | Open |
| --- | --- | --- |
| Dead handlers or stubs | 0 | 0 |
| Missing state tracking | 0 | 0 |
| Data pipeline gaps | 2 | 0 |
| Schema mismatches | 0 | 0 |
| Keyboard accessibility | 1 | 0 |
| Total | 3 | 0 |

## P0 — Dead/Broken Code

### AUDIT-001 · Non-finite amounts reached state

- `src/model.js` accepted a long string of digits that converted to `Infinity`. The cent guard treated non-finite values as zero, so JSON serialized the accepted amount as `null`.
- Fixed by checking that amounts round-trip through JSON and cent arithmetic before committing. Playwright confirmed that oversized reimbursements leave the dialog open and produce no `/post` write or `/go` change.

## P1 — Incomplete Features

### AUDIT-002 · A valid receipt filename could fail after upload

- `src/model.js` rejected any relative file URL containing consecutive periods, including a server-generated filename for `sable..tram.pdf`.
- Fixed by checking whole path segments and retaining rejection of literal and encoded dot segments. Playwright uploaded the receipt, checked its structured `/go` record, retrieved the original bytes, matched it and removed it.

### AUDIT-003 · Keyboard focus could leave the record detail overlay

- `src/details.jsx` presented a backdrop and initially focused the close control, while Tab could still reach controls behind the overlay.
- Fixed by containing Tab and Shift+Tab within the detail, with the native action dialog handling focus when open. Playwright checked focus wrapping, Escape to close and focus restoration to the ledger link.

## P2 — Minor Issues

None found.

## Data Pipeline Status

| Component | Status | Notes |
| --- | --- | --- |
| `dataManager.js` | Pass | Matches the Harbor template byte for byte. Boot awaits hydration before rendering routes. |
| Workspace state sync | Pass | One full-state `set_current` per business action. The 20-action suite checked structured activity and related record changes through `/go`. Invalid actions, cancellations and idle time produced no writes. |
| `vite.config.js` `/state` and `/post` | Pass | Template APIs handle injection and restore the saved initial state on reset. |
| `vite.config.js` `/go` | Pass | Returns initial state, current state and structured differences. |
| Session isolation | Pass | A second session retained its seed data. Navigation and reload retained the session query on tested routes. |
| `.initial.json` handling | Pass | The first baseline stayed stable across subsequent `set` and `set_current` calls on the same session. |
| Injected worlds | Pass | Empty and sparse records, missing detail IDs, and 375 injected expenses rendered. An added top-level key survived subsequent writes. |
| Offline assets | Pass | Original CSS artwork, local fixtures and system fonts. No external-origin browser requests in the workflow suite. |
| Production build | Pass | `npm run build` passed. Playwright ran the same workflow suite using `dist/` assets and the localhost state API. |
| `SCHEMA.md` accuracy | Pass | All nine keys and all 19 distinct mutation codes map to their observable state. |

## SCHEMA.md Updates

Added the endpoint summary, fixed seed IDs and counts, and a minimal injected empty-world example. The record shapes and mutation footprints remain synchronized with the implementation.

Docker dynamic certification is pending in the parent runner.
