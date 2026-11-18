# Grubhub Mock — Audit Report

> Round: 1  
> Date: 2026-11-18  
> Audited by: audit agent

## Summary

The table records the first audit. Both findings were resolved in the final Chromium retest, and the production bundle passed Harbor Docker certification. See [TEST.md](TEST.md).

| Category | Issues |
| --- | ---: |
| Dead handlers / stubs | 0 |
| Missing state tracking | 0 |
| Data pipeline gaps | 0 |
| Schema mismatches | 0 |
| Incomplete workflow behavior | 1 |
| Design alignment | 1 |
| Total | 2 |

## P0 — Dead/Broken Code (must fix before testing)

None found.

## P1 — Incomplete Features

### AUDIT-001 · Checkout loses a scheduling choice through the header (resolved)

- **Files** · [`src/pages/purchase.jsx:189`](src/pages/purchase.jsx#L189), [`src/pages/purchase.jsx:223`](src/pages/purchase.jsx#L223), [`src/App.jsx:18`](src/App.jsx#L18)
- **Element** · Schedule for later in Checkout, plus the header Bag and Browse restaurants links.
- **Reproduction** · Starting from Browse restaurants, add an item and open checkout in ASAP mode. Select **Schedule for later**, click the header **Bag** link, then click **Checkout**. Chromium showed ASAP selected on return. The session ID and `/go` state were preserved.
- **Cause** · The checkout radio changes component state. The header uses the `timing` query parameter, which is unchanged when the diner switches modes from checkout.
- **Fix** · Make checkout and the header share the timing mode. Use the existing `timing` query parameter or shared view state and preserve `sid`. Cover both mode switches and both ordering header links. Timing selection should remain free of business-state writes.
- **Retest** · Both modes survived navigation through the header Bag and Browse restaurants links. Chromium verified radio focus, session preservation and the absence of business-state writes. See [TEST.md](TEST.md).

### AUDIT-002 · Order filters and status badges diverge from design tokens (resolved)

- **File** · [`src/workflows.css:16`](src/workflows.css#L16), [`src/workflows.css:27`](src/workflows.css#L27)
- **Elements** · Orders status filter buttons and order, delivery and refund badges.
- **Issue** · The filter buttons have a 36px minimum height, below the 44px control height in `DESIGN.md`. Badge text uses 12px and weight 650 where the design calls for 13px and weight 500.
- **Fix** · Apply the documented dimensions and typography and check the Orders controls and badge wrapping at 390px.
- **Retest** · Chromium measured 44 px order filters and status badges at 13 px and weight 500. The orders page had no horizontal overflow at 390 px.

## P2 — Minor Issues

None found.

## Data Pipeline Status

| Component | Status | Notes |
| --- | --- | --- |
| `dataManager.js` | ✅ | Byte-for-byte match with the template. Browser loads the baseline before rendering routes and saves complete state on successful actions. |
| Account store state sync | ✅ | One `set_current` per successful tested mutation. Chromium observed zero further POSTs during a 70-second idle check after baseline. |
| Vite `/post` and `/state` | ✅ | Verified injection, reads after mutation and baseline restoration on `reset`, as implemented by the required template. |
| Vite `/go` | ✅ | Verified `initial_state`, `current_state` and `state_diff`. Orders and cart, scheduled order and delivery changes, and refunds are observable through linked structured records. |
| Session isolation and routes | ✅ | Verified independent sessions in one browser, deep links and reloads with `sid`, plus empty, partial, orphaned and 410-order injected worlds. |
| `.initial.json` handling | ✅ | Baseline survived `set_current`; `reset` restored it and cleared the diff. |
| Offline assets and build | ✅ | Local CSS artwork, text wordmark and system fonts. The Chromium suite blocked non-local requests and observed none. `npm run build` passed. |
| `SCHEMA.md` accuracy | ✅ | Updated the endpoint and injection examples, default IDs and exact mutation fields. |

## SCHEMA.md Updates

Added the required API header, types for all seven root keys, fixed seed ID ranges and an empty-history injection. Expanded the checkout, scheduling and refund write paths to match the current store. The audit used Vite on port 5317.
