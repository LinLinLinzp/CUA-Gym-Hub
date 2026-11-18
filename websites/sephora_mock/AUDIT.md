# Sephora Mock — Audit Report

> Round: 1  
> Date: 2026-11-18  
> Audited by: audit agent

## Summary

| Category | Issues |
| --- | ---: |
| Dead handlers / stubs | 0 |
| Missing state tracking | 0 |
| Data pipeline gaps | 1 |
| Schema mismatches | 0 open |
| Design alignment | 1 |
| Total | 2 |

## P0 — Dead/Broken Code (must fix before testing)

### AUDIT-001 · A write from a second tab erases a confirmed action · Resolved on 2026-11-18

- **File**: `src/account.jsx:26` and `src/utils/dataManager.js:64`
- **Feature**: Order cancellation, reward redemption, and mail return submission in a shared `sid`.
- **Reproduction**: In one Chromium context, freeze the clock at `2026-11-18T15:00:00.000Z`. Open `/account/orders/ord-0036?sid=<sid>` in the first tab and `/account/beauty-insider?sid=<sid>` in the second. Confirm cancellation in the first tab and wait for `/post` to return 200. Then confirm Travel Ritual Set redemption in the second tab.
- **Observed**: After cancellation, `/go` showed `ord-0036.status = 'cancelled'` and a new `orderEvents[]` entry. After redemption, the order reverted to `placed` and the event disappeared. `/go` retained only the four reward-related diff keys. Both actions reported success.
- **Cause**: `commit` validates against a snapshot held by the current tab and submits that snapshot as the entire next world. A tab opened earlier can overwrite a newer world on its next confirmation.
- **Fix**: Coordinate commits for tabs sharing a browser and `sid` in the account store. Serialize confirmation, load the latest shared state inside that critical section, and revalidate before saving. Keep the templates unchanged and preserve one full-state save per accepted action. Verify that both unrelated actions survive, and that a second confirmation for the same order cancellation or already-reserved return quantity produces zero writes.

## P1 — Incomplete Features

### AUDIT-002 · Desktop overview spacing and ledger rows are tighter than specified

- **File**: `src/styles.css:60` and `src/styles.css:177`
- **Issue**: The overview places the lower section 28 px below the hero. `DESIGN.md` calls for 32–40 px between sections. The points ledger allows 64 px rows, below the 72 px desktop minimum.
- **Fix**: Align the overview section gap and desktop ledger row minimum with `DESIGN.md`. Keep the responsive list layout.

## P2 — Minor Issues

None found.

## Data Pipeline Status

| Component | Status | Notes |
| --- | --- | --- |
| `dataManager.js` | ✅ | Byte-for-byte match with the required template. |
| Account store | ❌ | All three mutations persist in one tab. A second tab can overwrite an accepted mutation under the same `sid`. |
| Vite `/post` and `/state` | ✅ | Verified `set`, `set_current`, reads, and reset to the first baseline on localhost. |
| Vite `/go` | ✅ | Observed `initial_state`, `current_state`, and `state_diff` for every required mutation. |
| Session isolation | ✅ | A separate `sid` kept its baseline. Navigation and reloads retained the active `sid`. |
| `.initial.json` handling | ✅ | A second `set` and `set_current` preserved the initial baseline. `reset` restored current state to that baseline, as implemented by the shared template. |
| Injected state and idle writes | ✅ | Empty, sparse, and large injected collections rendered with no post-bootstrap writes during read-only navigation. No timer-driven mutations in source. |
| Offline build | ✅ | `npm run build` passed. Chromium ran the built `dist/` through local Vite preview with no requests outside localhost. The art is authored in local CSS. |
| `SCHEMA.md` accuracy | ✅ | All eight keys and the exact three state changes match the implementation and the observed single-tab writes. |

## Local Chromium checks

| Workflow | Result |
| --- | --- |
| Orders | Searched by product and order number, used status and date filters, sorted, cleared filters, and opened both legs of a split shipment. Browsing and dismissing cancellation sent no writes. Confirming cancellation wrote only `orders` and `orderEvents`. The updated status survived reload. |
| Beauty Insider | Filtered the ledger to return adjustments and checked related links. Sold-out, unaffordable, and purchase-required offers were disabled. Dismissing redemption sent no write. Confirmation reduced the balance from 1,840 to 840 and stock from four to three. The redemption and negative ledger record linked to each other. |
| Returns | Found and opened a completed return. Started a partial return through the eligible-order picker and verified empty-selection and over-quantity rejection. Dismissing review sent no write. Submitting appended one structured request to `returns` only. The return detail and mail instructions survived reload. |
| Harbor rendering | Ran all required routes across the default and injected checks. Tested empty collections, one sparse record per collection, and up to 360 orders, 301 returns, and 320 ledger entries. No browser exceptions or runtime requests outside localhost. |

## SCHEMA.md Updates

Added the local endpoint contract, baseline and reset semantics, types for all top-level keys, fixed fixture IDs, a minimal injection example, and exact paths and values for verifier assertions.

## P0 audit replay, 2026-11-18

- **AUDIT-001 · Fixed and retested.** The original cross-tab workflow preserved the prior cancellation and both operation records after the stale tab wrote. Orders, Beauty Insider and returns passed.

Docker dynamic certification run `154644` recorded render pass, sync pass (1 startup POST), idle pass (0 idle POSTs), and hydrate pass.
