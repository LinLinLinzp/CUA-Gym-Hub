# DoorDash Mock — Audit Report

> Round 1  
> Date 2026-11-18  
> Audited by audit agent

## Summary

| Category | Issues |
| --- | ---: |
| Dead handlers / stubs | 0 |
| Missing state tracking | 0 |
| Data pipeline gaps | 2 |
| Schema mismatches after documentation update | 0 |
| Total | 2 |

The standard Chromium suite passed against Vite dev and the production bundle on port 5316. It exercised orders, group orders, refunds, DashPass, reloads, deep links, SID isolation, empty and partial injected worlds, and a 340-record order list. Neither run observed external requests, uncaught page errors, or writes during the 2.2-second idle check. `npm run build` passed. The shell, local CSS artwork, typography, layout, and primary color tokens align with `DESIGN.md`.

## P0 — Dead/Broken Code

### AUDIT-001 · Out-of-order POSTs erase confirmed actions

- **Source** `src/store.jsx:39` and `src/utils/dataManager.js:64`.
- **Reproduction** Run `node tests/test_audit_write_order.mjs` from the site directory with Vite running. Delay the first cancellation’s `set_current` request, allow the second to reach the server, then release the first. After the second write, both orders are canceled in `/go`. After the first write arrives, `/go` says `DD-240117` is placed again. Local storage still reports it canceled.
- **Cause** `saveState` sends the full snapshot in a fire-and-forget fetch. The Web Lock covers the synchronous call and releases before the POST reaches the server. Navigation and subsequent confirmations proceed while the earlier snapshot is in flight.
- **Fix** Keep the Harbor templates unchanged. Coordinate persistence at the site boundary so an earlier full-state POST settles before a later one is dispatched, including the initial baseline. Add a regression that delays an earlier request and requires both confirmed actions to remain visible in `/go`.

### AUDIT-002 · A shared invite loses joined guests across browser contexts

- **Source** `src/store.jsx:27`, `src/store.jsx:41`, `src/groups.jsx:112`, and `src/utils/dataManager.js:40`.
- **Reproduction** Run `node tests/test_audit_guest_context.mjs`. Open seeded group `GO-1030` in a host browser context, then use its invite to join as Riley Audit in an independent context. `/go` returns Riley’s participant record after the successful join. Reload the host page and close the group. The host never sees Riley and its close write erases the participant from `/go`.
- **Cause** The local-storage listener can synchronize tabs in the same browser context. A warmed context loads its own cached state on reload, and `commit` builds its next full snapshot from that same cache. The peer’s server-acknowledged changes are missing from both paths.
- **Fix** Reconcile with the current server snapshot before a resumed host view and before applying a user mutation. Revalidate group status, token, and selected items against that snapshot. Preserve the required templates and keep reconciliation read-only until a user confirms an action. Add a regression with independent contexts that joins and saves a guest cart, closes from the host, and checks the guest and items remain in `/go` and checkout.

## P1 — Incomplete Features

No findings.

## P2 — Minor Issues

No findings.

## Data Pipeline Status

| Component | Status | Evidence |
| --- | --- | --- |
| `dataManager.js` | Pass | Byte-for-byte SHA-256 match with `templates/dataManager.js`. |
| Store synchronization | Fail | A delayed earlier snapshot can overwrite a later action. Independent browser contexts can overwrite already-acknowledged changes. |
| `/post` and `/state` | Pass | Live checks verified SID-scoped injection, current-state writes, readback, and reset. The unchanged template resets current state to the original baseline. |
| `/go` and initial state | Pass | Live checks verified `initial_state`, `current_state`, and `state_diff`, and confirmed that `set_current` preserves the established baseline. |
| Session isolation | Pass | Standard suite and direct endpoint checks used distinct SIDs. Internal navigation carries `sid`. |
| Idle and offline operation | Pass | No timer-driven business writes or external assets. Browser checks passed against dev and built files. |
| `SCHEMA.md` accuracy | Pass | All eight top-level keys and exact action footprints are documented. |

## SCHEMA.md Updates

Added endpoint instructions, a fixed-ID reference, a minimal injection example, and explicit top-level types. Clarified the refund line shape and its separate record-level `totalCents`. The observable action table still describes the writes made by the current code.

The two issue reproductions are in ignored `tests/`. Docker certification remains with the parent runner.
