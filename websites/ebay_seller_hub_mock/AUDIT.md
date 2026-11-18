# eBay Seller Hub Mock — Audit Report

> Round 1 · November 18, 2026 · Audit agent

## Summary

| Category | Findings | Open |
| --- | ---: | ---: |
| Dead handlers or stubs | 1 | 0 |
| Missing state tracking | 0 | 0 |
| Data pipeline gaps | 0 | 0 |
| Schema mismatches | 0 | 0 |
| Validation or action availability | 2 | 0 |
| Total | 3 | 0 |

## P0 — Dead or broken code

### AUDIT-001 · Bulk selection enabled for an unaddressable listing

In `src/Listings.jsx`, an injected active record without an ID could enable the page checkbox without providing an actionable row. The page selection now uses the same ID and status requirements as the row control. Chromium verified that the checkbox is disabled for this fixture.

## P1 — Incomplete features

### AUDIT-002 · Active listing revisions rejected zero stock

In `src/Listings.jsx`, revisions inherited the publication minimum of one unit, blocking a seller from recording depleted stock. Active revisions now accept zero while retaining required item fields. Chromium verified the saved numeric zero and the `listing_revised` event in `/go`.

### AUDIT-003 · Relist controls disagreed with commit validation

In `src/Listings.jsx`, the controls enabled relisting for fractional injected stock even though the action required whole units. Both entry points and the state transition now use the same positive-integer check.

## P2 — Minor issues

No open findings.

## Data pipeline status

| Component | Status | Notes |
| --- | --- | --- |
| `src/utils/dataManager.js` | Pass | Matches the shared template byte for byte. Its first load registers a baseline, and user actions submit whole-state `set_current` requests. |
| Store state sync | Pass | Routes mount after the loader resolves. Valid mutations commit through one store function. Browse controls and derived dates or metrics leave business state untouched. |
| State API | Pass | Vite imports the shared plugin. Local checks covered `/post`, `/state` through the loader, and `/go`. |
| Session isolation | Pass | Navigation retained `sid`. Distinct sessions retained independent state, and a six-second idle check preserved a write made outside the idle page. |
| Initial state and reset | Pass | `set_current` preserved the existing baseline. The shared template's `reset` restored the baseline and cleared the diff. |
| Injected state | Pass | Empty, one-record, sparse and 300-listing fixtures rendered. A large-state write preserved the other listings and an injected top-level key. |
| Offline assets and layout | Pass | Chromium observed only localhost requests. The desktop overview and narrow listing queue use the site's original plum-and-ivory layout, plain-text brand and local illustrations. |

## Schema updates

Added the API contract, fixed seed IDs, an empty-world injection example, and the stock validation rules to `SCHEMA.md`. Reviewed each business mutation against the observable fields documented there.

## P0 audit replay, 2026-11-18

- **AUDIT-001 · Previously fixed, retested.** The audit injected an active listing without an ID and verified that the bulk-select control stayed disabled.

Docker dynamic certification run `125084` recorded render pass, sync pass (1 startup POST), idle pass (0 idle POSTs), and hydrate pass.
