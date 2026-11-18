# Square Dashboard Mock — Audit Report

> Round 1 · November 18, 2026 · Audit agent

## Summary

| Category | Issues |
| --- | ---: |
| Dead handlers or stubs | 0 |
| Missing state tracking | 0 |
| Data pipeline gaps | 1 |
| UI correctness | 1 |
| Open schema mismatches | 0 |
| Total | 2 |

The build and the existing Playwright suite passed on the built site at `http://localhost:5458`. Additional audit probes reproduced the two issues below in Chromium. Application source was reviewed and the findings are open for the dev round.

## P0 — Dead or Broken Code

### AUDIT-001 · Delayed full-state POSTs overwrite newer actions

- **Files** `src/store.jsx:24` and `src/store.jsx:28`. The unchanged state client starts the baseline POST at `src/utils/dataManager.js:57` and each current-state POST at `src/utils/dataManager.js:68`.
- **Back-to-back save reproduction** Open `/orders/ord_001?sid=<fresh-id>` and let the baseline finish. In Playwright, hold the first `set_current` request after clicking **Start preparing**. Click **Mark ready**, let that second request finish and verify `/go` says `ready`. Release the held request. Both POSTs return HTTP 200, but `/go` now says `in_progress` and lacks the latest activity event. The open UI still offers **Mark picked up**.
- **First-load reproduction** With another fresh session, hold the initial `set` POST. Click **Start preparing** and let `set_current` finish. Release the baseline request. `/go.current_state` reverts to `new`, while `/go.initial_state` incorrectly contains `in_progress` because the mutation was the first request received by the server.
- **Impact** Items, orders, refunds and payouts all use this full-state save path. Reordered requests can erase verifier-visible changes and leave the browser ahead of the server. The existing suite waits for each POST before proceeding and exercises sequential stale review rejection across tabs.
- **Fix** Gate mutations until the baseline is acknowledged, and order subsequent user-driven snapshots per session so an older snapshot cannot arrive after a newer one. Keep the two Harbor templates unchanged and retain the single central save path. Repeat both probes and assert the original baseline, final status and both structured transitions in `/go`.

## P1 — Incomplete Features

### AUDIT-002 · Injected account currency changes between transaction and refund review

- **Files** `src/pages/Refunds.jsx:49`, `src/pages/Refunds.jsx:95`, `src/pages/Refunds.jsx:129` and `src/refundModel.js:71`.
- **Reproduction** Inject `account.currency: "CAD"` and a paid card transaction with `amount: 80` and no `currency`. The paid and refundable amounts show `$80.00` in the transaction. Open **Issue refund**, enter a reason and select **Review refund**. The total displays `CA$80.00`. The quote and persisted refund use the account currency, while the transaction text falls through directly to USD. The payout editor has the same fallback discrepancy in its **Available** label compared with the quote at `src/pages/Payouts.jsx:87` and `src/pages/Payouts.jsx:141`.
- **Fix** Apply the transaction or balance currency, then the account currency, then USD consistently in the corresponding views and quotes. Verify that injected non-USD values match across transaction details, transfer and refund reviews, and persisted records.

## P2 — Minor Issues

None recorded.

## Data Pipeline Status

| Component | Status | Notes |
| --- | --- | --- |
| `dataManager.js` | Template exact | SHA-256 matches `templates/dataManager.js`. |
| Store state sync | P0 | The UI waits for `loadState` to return and successful mutations save centrally. Overlapping requests can arrive out of order. |
| `/post`, `/state`, `/go` | Pass | Vite imports the standard API. Explicit `set`, repeated `set`, `set_current`, and `reset` behaved as documented when ordered. |
| Session isolation | Pass | Separate `sid` values and browser contexts were isolated. In-app routes, recovery links and hard reloads retained `sid`. |
| Initial snapshot | P0 | Ordered calls preserve the first snapshot and reset restores it. First-load request reordering can establish the wrong snapshot. |
| Structured records | Pass | With ordered writes, `/go` showed the catalog records, fulfillment activity, refund and payment updates, and payout and balance updates. |
| Idle behavior | Pass | Zero saves after baseline in the idle check. The site's timer only revokes a CSV blob URL. |
| Injected state | Pass with P1 | Empty, sparse and 400-record datasets rendered, including deep links. Account currency fallback needs correction. |
| Offline assets and design | Pass | The suite intercepted all requests and observed no external origin. The plum top bar, warm surfaces, serif titles and CSS and inline chart artwork use local code. |
| Schema | Updated | All eleven top-level keys and user-driven writes are documented. |

## SCHEMA.md Updates

Added endpoint and reset semantics, seed IDs and an empty-world injection example. Documented the currency behavior and kept the exact field-level write mappings. Workflow results and audit failures are listed in `TEST.md`.

## P0 audit replay, 2026-11-18

- **AUDIT-001 · Fixed and retested.** The browser verified that a held baseline withheld action controls and that a held order preparation could not be overtaken by Mark ready. Harbor retained both ordered transitions and the original new order.

Docker dynamic certification run `135192` recorded render pass, sync pass (1 startup POST), idle pass (0 idle POSTs), and hydrate pass.
