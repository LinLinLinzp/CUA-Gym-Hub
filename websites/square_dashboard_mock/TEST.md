# Square Dashboard Mock — Test Report

> Round: 2  
> Date: November 18, 2026  
> Server: http://localhost:5458  
> Tested by: playwright agent

WORKFLOWS: PASS

## Summary

| Metric | Count |
| --- | ---: |
| Routes tested (patterns, including recovery) | 10 |
| Elements tested (grouped checks) | 18 |
| ✅ Passed | 14 |
| ❌ Failed | 4 |
| ⚠️ Skipped (out of scope) | 0 |

The Playwright suites used installed Chromium and the Node package at `PILOT_PLAYWRIGHT`. The site was already serving the built Vite bundle on port 5458, so the rerun used that listener. The workflow suite fixed browser time at 15:00 UTC. For each accepted workflow action, it checked the response from the session-scoped `/post`, compared the before and after `/go?sid=…` snapshots, and verified the expected keys in `state_diff`.

## ✅ Passing Tests

- **`/` and shared navigation** — Verified the Square text brand, keyboard skip link, current route, recent order, catalog and payout shortcuts, location selection, chart and balance. Confirmed the transfer dialog inherited the selected location and Escape restored focus. Three seconds of idle time after the baseline produced zero writes.
- **`/items`, `/items/new`, `/items/:itemId`** — Verified SKU search, category and status filters, sort controls, create/edit, archived status, restore, variant removal in a draft, and cancel. Missing name, duplicate SKU with different case, invalid price or stock, unchanged save, and dismissed archive produced zero writes. Reload preserved the item and session. A catalog edit preserved historical order line snapshots.
- **`/orders`, `/orders/:orderId`** — Verified customer search and status, source, location and date filters. Advanced pickup through preparation, ready and pickup, then completed a separate shipping order via **Mark shipped**. Canceled another order via confirmation and reloaded terminal order details. Dismissed and stale cancellation produced zero writes.
- **`/refunds`, `/refunds?payment=…`, `/refunds?tab=history`, `/refunds/:refundId`** — Verified order-to-transaction navigation, card-suffix search, history tabs and persisted detail. Confirmed full, $10.23 custom and itemized refunds, including itemization on a partially refunded payment. Missing reason, excess amount or quantity, canceled review and a duplicate confirmation produced zero writes. Back to edit kept the draft. In a split payment, refunding the last two units of a $10.01 line allocated $6.67 and left the other payment unchanged.
- **`/payouts`, `/payouts/:payoutId`** — Verified location, date, status and destination filters, filtered CSV export, historical settlement links, and reloading historical and new details. A $120.35 instant transfer debited the selected balance from $1,842.65 to $1,722.30 and recorded a $2.35 fee and $118.00 net. Excess amount, below-minimum net, missing destination, stale review and canceled review produced zero writes. Back to edit kept the amount, and the close icon restored focus.
- **Harbor state and routing** — Exercised empty arrays, sparse records with missing links and dates, and datasets of 400 rows per main list. Verified recovery on unknown routes and IDs, preservation of injected extra fields, session isolation, same-session stale-action handling, hard reloads with `sid`, and ordered `set`, `set_current`, and `reset` behavior. No external requests or page exceptions were observed in the workflow suite. The control sweep also found no console errors.

### State changes verified through `/go`

| SEED workflow | Browser action | Observed fields |
| --- | --- | --- |
| Items | Create | Only `items` changed. Appended a record with `id`, `name`, `description`, `categoryId`, `status`, `actorId`, `createdAt`, `updatedAt` and `variations[]` with `id`, `name`, `sku`, `price`, `stock`. |
| Items | Edit, archive, restore | Only `items` changed. Editing changed the requested catalog fields and `variations[]`, retained existing IDs and `createdAt`, and recorded actor and update time. Archive and restore set `status` and recorded `actorId` and `updatedAt`. |
| Orders | Prepare, mark ready, pick up, ship, cancel | Only `orders` changed. The selected order received `status`, `updatedAt` and `actorId`, plus an `activity[]` entry with `id`, `type`, `fromStatus`, `toStatus`, `actorId` and `createdAt`. Line snapshots were retained. |
| Refunds | Confirm full, custom or itemized refund | Only `refunds` and `payments` changed in one write. The added refund recorded `id`, `orderId`, `paymentId`, `locationId`, `mode`, `status`, `amount`, `currency`, `reason`, `actorId`, `createdAt` and `lineItems[]`. Applicable lines recorded `orderLineId`, `itemId`, `variationId`, `name`, `quantity` and `amount`; the custom refund used an empty array. The linked payment received `refundedAmount`, `refundStatus`, `actorId` and `updatedAt`. |
| Payouts | Confirm instant transfer | Only `payouts` and `balances` changed in one write. The new pending payout recorded `id`, `status`, `method`, `amount`, `feeAmount`, `netAmount`, `currency`, `locationId`, `destinationId`, `estimatedArrivalAt`, `actorId`, `createdAt` and `updatedAt`. The selected balance received `availableAmount`, `actorId` and `updatedAt`. |

## ❌ Bugs for Dev Agent

### AUDIT-001 · P0 · Delayed state writes overwrite accepted order transitions

| Field | Value |
| --- | --- |
| Route | `/orders/ord_001` |
| Element | **Start preparing**, **Mark ready**, and the first-load baseline |
| Action | On a fresh session, hold the first `set_current` request, click **Mark ready**, and release the held request after the second finishes. On another fresh session, hold the baseline `set`, click **Start preparing**, and release the baseline after the action finishes. |
| Expected | `/go` retains the original snapshot and the latest accepted action with its activity history. |
| Actual | The delayed save regressed `current_state` from `ready` to `in_progress` while the UI still offered **Mark picked up**. The delayed baseline regressed `current_state` from `in_progress` to `new` and left `initial_state` at `in_progress`. All POSTs returned HTTP 200. |
| Console errors | None observed. |
| Fix hint | Ensure the baseline completes before business writes and sequence subsequent snapshots in the central store path. Preserve both unmodified Harbor templates. |

### AUDIT-002 · P1 · Injected CAD amounts use inconsistent currency formatting

| Field | Value |
| --- | --- |
| Route | `/refunds?payment=pay_cad`, `/payouts` |
| Element | Transaction amounts, transfer editor **Available** amount, and confirmation reviews |
| Action | In separate CAD sessions, inject a payment without record currency or a balance without record currency. Open the corresponding refund or transfer review. |
| Expected | The draft, summary and review use the same account-currency fallback. |
| Actual | The refund summary showed `$80.00` and review showed `CA$80.00`. The payout editor showed `Available $120.00`, while the $40 debit in review was `CA$40.00`. |
| Console errors | None observed. |
| Fix hint | Use record currency, account currency and then USD consistently in the editor, summary and quote. |

## Visual Alignment Feedback

Reviewed local captures of the five workspaces, the item editor, refund review and mobile Overview against the site's original `DESIGN.md`. The plum account bar, warm canvas, serif headings, local swatches and sales chart matched that design. At 390 px the shell fit the viewport and the Orders table scrolled inside its own container. No visual defects were recorded during this review. Captures are in the gitignored `test-results/` directory.

## Round History

### Round 1 → Round 2

- All four SEED workflows passed again. `npm run build` passed, and the copied state client matched the Harbor template byte for byte.
- AUDIT-001 still failed in both delayed request cases.
- AUDIT-002 still failed in the refund flow and was reproduced in the payout editor.
-

## Harbor Docker dynamic certification

The repository certifier passed the production bundle in run `185328`. The local evidence is `factory/build/dyn_certify/185328/results.json`.

| Render | Sync | Idle | Hydrate |
| --- | --- | --- | --- |
| Pass | Pass (1 baseline POST) | Pass (0 idle POSTs) | Pass |
Injection reached `locations → 0 → name`.
