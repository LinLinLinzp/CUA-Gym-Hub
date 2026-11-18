# Audible Mock — Audit Report

> Round 1 · November 18, 2026 · Audit agent

## Summary

| Category | Issues |
| --- | ---: |
| Dead handlers, stubs, and incomplete UI wiring | 1 |
| Missing state tracking | 0 |
| Data pipeline gaps | 1 |
| Schema mismatches remaining after update | 0 |
| Total | 2 |

All four seed workflows passed in Chromium on localhost port 5373 when each write completed before the next action. The audit verified linked records in `/go`, exercised empty account collections and a partial title, and observed no off-origin browser requests or page errors. `npm run build` passed. The existing `TEST.md` documents the broader dev and preview acceptance runs. Docker certification is handled by the parent runner.

## P0 — Dead or Broken Code

### AUDIT-001 · An older save can overwrite a newer action in Harbor · Resolved on 2026-11-18

- **Files** — `src/state/AccountProvider.jsx` calls `saveState` for each successful action. The unchanged `src/utils/dataManager.js` sends independent POSTs, and the supplied state middleware stores them in arrival order.
- **Reproduction** — In one SID, delay the first `set_current` request from **Add to Wish List**. Click **Remove from Wish List**, let that request complete, and verify that `/go` shows `wishlist[].status = removed`. Release the delayed request. `/go` now shows `saved` while the UI still offers **Add to Wish List**.
- **Fix** — Coordinate ordering at the persistence boundary so older snapshots cannot replace newer ones. The seed contract requires the shared templates unchanged, so a shared fix needs to be coordinated with the template and Harbor runtime owners. Recheck the case with the newer request completing first and verify that `/go` agrees with the UI. The sequential path already emits one snapshot per successful action.

## P1 — Incomplete Features

### AUDIT-002 · Resubmitting the header search can leave unrelated Browse results visible

- **Files** — `src/components/Shell.jsx` submits the header input through the router. `src/pages/Browse.jsx` copies the query into its filter only when the URL’s `q` value changes.
- **Reproduction** — Open `/browse?q=Cartographer&sid=<sid>`. Set **Search audiobooks** to “A field guide to dusk.” Focus **Search catalog**, which still displays “Cartographer,” and press Enter. The URL shows `q=Cartographer` while the Browse field and results still show “A Field Guide to Dusk.”
- **Fix** — Give Browse one source of truth for search, or synchronize the Browse filter on each header submission. Test repeated submissions after a local edit and after clearing the filter. Retain the SID and keep search out of persisted account state.

## P2 — Minor Issues

None found in the scoped audit.

## Data Pipeline Status

| Component | Status | Notes |
| --- | --- | --- |
| State client and middleware | Pass | Client matches the shared template byte for byte. Vite imports the supplied API for dev and preview. |
| Account state sync | Issue | Successful Library, Wish List, redemption, and return actions each sent a structured snapshot. Forced arrival reordering reproduced AUDIT-001. |
| Boot and idle writes | Pass | Fresh seed boot sent one baseline `set`. Reloads, navigation, canceled confirmations, and the idle observation added no writes. Source review found no timer-driven business mutations. |
| `/post`, `/state`, and `/go` | Pass | Verified JSON, initial snapshot preservation on subsequent writes, and reset to the initial snapshot for an injected SID. |
| Session isolation | Pass | Navigation kept the SID. A separate SID retained the original seed. |
| Injected worlds | Pass | Direct navigation rendered empty account collections and a single partial title. The existing acceptance run also reports a 430-title fixture. |
| Offline assets and design | Pass | Runtime requests stayed on localhost. Verified 72 local covers and the distinct text-brand, aubergine navigation, warm canvas, and serif heading treatment against `DESIGN.md`. |
| `SCHEMA.md` | Updated | Endpoint details, stable seed IDs, a minimal injection body, and the exact user-action write table are present. |

## SCHEMA.md Updates

Added the audit-format endpoint header, explicit top-level types, seed IDs and an injection example. Documented the supplied reset behavior and the use of a fresh SID for new fixtures. Reviewed the action table against the current reducer and retained its field mappings.

## P0 audit replay, 2026-11-18

- **AUDIT-001 · Fixed and retested.** The delayed add did not expose Remove before acknowledgement. After adding and removing, both writes reached Harbor and the latest Wish List status was removed.

Docker dynamic certification run `175552` recorded render pass, sync pass (1 startup POST), idle pass (0 idle POSTs), and hydrate pass.
