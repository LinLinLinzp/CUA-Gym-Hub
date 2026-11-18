# Chase Mock — Test Report

> Round: 2  
> Date: 2026-11-18  
> Server: http://localhost:5332  
> Tested by: playwright agent

## Summary

| Metric | Count |
| --- | ---: |
| Routes tested | 9 |
| Elements tested (grouped checks below) | 14 |
| ✅ Passed | 14 |
| ❌ Failed | 0 |
| ⚠️ Skipped (out of scope) | 0 |

Windows PowerShell, Node, and installed Chromium from `PILOT_PLAYWRIGHT`. The browser clock was fixed to November 18, 2026 in America/New_York. All functional traffic used loopback port 5332. Rerun with `node test_workflows.mjs` from this directory while Vite is serving the site. The runner and captures in `test-results/` are gitignored.

---

## ✅ Passing Tests

- **[/] Fresh session and navigation** — One baseline `set` posted. `/go` returned matching initial and current snapshots with an empty `state_diff`. The seed had one profile, 24 accounts, 121 transactions, and 24 records in each remaining collection. The skip link appeared on keyboard focus, moved focus to main content, and returned to its hidden state. The Chase link and sidebar navigated with the same SID.
- **[/accounts, /accounts/:accountId] Accounts** — Active and archived views, next and previous pages, merchant search, status/category/date filters, and nickname draft cancellation worked. Saving a padded nickname trimmed it. Clearing and reloading restored the product name.
- **[/transfers] Transfers** — Source exclusion, insufficient funds, fractional cents, and past dates were checked. Reviewed and confirmed a $12.34 same-day transfer and a $32.14 future transfer. Advancing the clock past the scheduled date did not execute it. Activity filters located the scheduled transfer and then the cancelled record. Escape restored trigger focus. Keyboard confirmation moved focus to Transfer activity.
- **[/bill-pay] Payees and payments** — Searched payees, validated an empty payee form, and created a payee with a formatted synthetic reference. Opened scheduling from the payee and page action, validated amount/date, abandoned a review, scheduled $83.19, cancelled it, and confirmed the ID and status after reload. Go back restored trigger focus. Keyboard confirmation moved focus to Payment activity.
- **[/disputes, /disputes/:disputeId, /accounts/:accountId/transactions/:transactionId] Disputes** — Entered through the eligible-transaction picker and the transaction detail link. Pending and transfer transactions offered no submit path. Rejected an amount above the charge, submitted $55.25, followed and reloaded the case link, returned to the transaction, and checked that an open case prevented duplicate submission. Case search and closed filtering responded.
- **[/alerts] Alerts** — Account selection persisted after reload. Deposit and card alert types were shown as applicable. Validated channels and a positive threshold. Inserted, edited, and disabled a rule, updated a seeded rule, and verified persisted values after reload.
- **[/accounts/:accountId] Browser session isolation** — A second SID entered directly and retained an independent default snapshot while the primary SID held its changes.
- **[/post, /go] Endpoint isolation and reset** — An isolated SID accepted `set`, returned the expected diff after `set_current`, and reset to the original baseline. The separate SID's diff remained empty.
- **[/, /accounts, /transfers, /bill-pay, /disputes, /alerts, /*] Empty world and recovery** — Empty replacement arrays and a partial profile rendered across the workspace. Missing IDs and unknown routes offered working recovery links.
- **[/accounts/:accountId/transactions/:transactionId, /disputes/:disputeId] Partial records** — A single-account world with missing optional fields and unresolved relationships rendered. Nickname changes used the injected profile actor.
- **[/accounts/:accountId] Large ledger** — A 480-row injection rendered 10 rows per page in stable order. Search located row 480 by merchant, and its deep link reloaded at 390 px without page overflow.
- **[/accounts, /transfers, /bill-pay, /disputes, /alerts] Narrow touch viewport** — At 390 px the navigation reached all five destinations and each stayed within the viewport.
- **[All browser routes] Runtime** — No browser page errors, console errors, or requests outside the local origin. Navigation, reload, filtering, validation, review, dismissed dialogs, and idle time wrote no business state. The site copy of the state manager matched the shared template byte for byte.
- **[Build] Production bundle** — `npm run build` succeeded with React Router module-directive advisories. Round 1 also ran the browser suite against Vite preview. Round 2 browser tests ran against the dev server.

### Workflow state verified via `/go`

Each confirmed action issued one `set_current` with a complete snapshot. The runner matched it to `/go.current_state`, compared each snapshot with the one from immediately before the action, and verified that `initial_state` was preserved. The primary SID issued 13 business writes and one baseline `set`.

| Workflow and user action | Observed fields |
| --- | --- |
| Accounts · Save nickname, then clear | Selected `accounts[]` record received `nickname`, `updatedAt`, `updatedBy`. The clear stored an empty string. |
| Transfers · Confirm a same-day transfer | Appended `transfers[]` with `id`, `fromAccountId`, `toAccountId`, `transferDate`, `amount`, trimmed `memo`, `status` set to `completed`, `createdAt`, `createdBy`. Updated both accounts' `currentBalance`, `availableBalance`, `updatedAt`, `updatedBy`. Appended debit and credit `transactions[]` with `id`, `accountId`, `transferId`, `description`, `category`, `type`, `status`, `transactionDate`, signed `amount`, `createdAt`, `createdBy`. |
| Transfers · Schedule, then cancel | Future confirmation appended a `transfers[]` record with the same fields and `status` set to `scheduled`. Cancellation modified only its `status`, `cancelledAt`, `cancelledBy`. |
| Bill pay · Add payee | Appended `payees[]` with `id`, trimmed `name`, `nickname`, `category`, `accountLast4`, `status` set to `active`, `createdAt`, `createdBy`. |
| Bill pay · Schedule, then cancel payment | Appended `billPayments[]` with `id`, `payeeId`, `fromAccountId`, `sendDate`, `amount`, `status` set to `scheduled`, `createdAt`, `createdBy`. Cancellation modified only its `status`, `cancelledAt`, `cancelledBy`. |
| Disputes · Submit and track | Appended `disputes[]` with `id`, `accountId`, `transactionId`, `reason`, `amount`, trimmed `description`, `status` set to `submitted`, `createdAt`, `createdBy`. Tracking issued no write. |
| Alerts · Insert, edit, disable, update seeded rule | Inserted `alertRules[]` with `id`, `accountId`, `type`, `enabled`, `channels`, `thresholdAmount`, `createdAt`, `createdBy`, `updatedAt`, `updatedBy`. Each later save wrote the rule values and update audit fields while preserving identity and creation fields. |

WORKFLOWS: PASS

---

## ❌ Bugs for Dev Agent

No open issues from this run.

---

## Visual Alignment Feedback

Reviewed locally captured desktop screens for the major views and recovery page, plus a narrow account ledger, against `DESIGN.md`. The Chase text brand, navy navigation, warm background, and locally drawn balance motif appeared consistently. Transfers and Bill pay kept side-by-side desktop panels. Disputes placed its narrower picker above tracking, and the desktop verification checked the panel bounds. The mobile ledger and workflow pages fit the 390 px viewport.

## Round History

### Round 1 → Round 2

- AUDIT-001 · Fixed and retested focus restoration after confirming a transfer or bill payment cancellation.
- AUDIT-002 · Fixed and retested the desktop arrangement of the dispute picker and case tracking.
- Fixed a skip-link visibility issue found during the desktop screenshot review. Rechecked keyboard activation and the account detail capture.

## Harbor Docker dynamic certification

The repository certifier passed the production bundle in run `109892`. The local evidence is `factory/build/dyn_certify/109892/results.json`.

| Render | Sync | Idle | Hydrate |
| --- | --- | --- | --- |
| Pass | Pass (1 baseline POST) | Pass (0 idle POSTs) | Pass |
Injection reached `accounts → 0 → productName`.
