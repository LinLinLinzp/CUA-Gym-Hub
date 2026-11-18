# Sephora Mock — Test Report

> Round: 1  
> Date: 2026-11-18  
> Server: http://localhost:5343  
> Tested by: playwright agent

WORKFLOWS: PASS

## Summary

| Metric | Count |
| --- | ---: |
| Routes tested | 8 |
| Elements tested (grouped checks) | 18 |
| ✅ Passed | 16 |
| ❌ Failed | 2 |
| ⚠️ Skipped (out of scope) | 0 |

The eight routes comprise seven account routes and the fallback. Chromium ran against localhost with the fixture clock fixed at `2026-11-18T15:00:00.000Z`. The same-session tab issue below can erase a successful action. All seeded workflows passed when exercised in one tab.

## ✅ Passing Tests

1. **Overview and account shell** — Verified the title, wordmark, navigation, active destination, order and rewards shortcuts, button hover feedback, and browser history with the original `sid`.
2. **Orders search** — Searched by product and exact order number. Verified counts, no-match feedback, and the Show all orders action.
3. **Orders filters** — Compared status and date results and oldest-first order with the fixture records. Clear filters restored all 36 orders.
4. **Order details and shipment tracking** — Opened the split shipment for `SF-81240350`, expanded and collapsed both shipment sections, and verified the tracking number, pending tracking fallback, event counts, order summary, payment, and hard reload.
5. **Cancellation without a write** — Escape dismissed the dialog and restored focus. Advancing the clock past the deadline with the dialog open caused confirmation to reject the request without a POST.
6. **Order cancellation** — Confirmed `SF-81240360`, checked the structured event and exact changed order fields, and verified the cancelled status after reload.
7. **Beauty Insider points activity** — Verified the VIB tier and the initial 1,840 points, all five activity filters against the fixture, and links from points entries to their orders and returns.
8. **Reward eligibility and dismissal** — Verified disabled sold-out, unaffordable, and purchase-required offers. Keep my points dismissed the reward confirmation without a write.
9. **Reward redemption** — Confirmed Travel Ritual Set, verified the balance fell to 840 and stock from four to three, and checked the linked redemption and ledger records.
10. **Returns search and filtering** — Searched by order number and return number, combined search with status, verified the no-match view and clear actions, and restored the 24 fixture returns.
11. **Return tracking** — Opened a completed return and checked its refund and link to the original order. Opened a newly submitted return and verified its request details, timeline, and mail instructions after reload.
12. **Mail return from the picker** — Verified disabled Continue until selection, dismissal, exclusion of the expired order, and the remaining quantity of one for `line-0033-01`. Empty selection, an excessive quantity, and Edit items left state unchanged. Submitting appended one request.
13. **Mail return from order details** — Toggled item selection, checked required reasons, and submitted two units of Glow Balm Highlighter and one Gentle Oat Cleanser for `SF-81240320`. The refund estimate was $96.76. Reopening the form showed that those quantities had been reserved.
14. **Harbor API and session isolation** — Verified `/state`, `/post` with `set`, `set_current`, and `reset`, and `/go`. Reset restored the original injected baseline. A separately initialized `sid` kept all fixture records after the other session submitted a return. Bootstrap sent one `set`, each accepted action sent one `set_current`, and the idle observation and read-only navigation added no writes.
15. **Injected and missing records** — Rendered empty and sparse fixtures, plus a fixture with 360 orders, 301 returns, and 320 points entries. Arrays remained intact after boot. Missing order, missing return, and fallback pages offered working navigation back.
16. **Responsive and offline checks** — Checked representative routes at widths from 320 to 1,280 px, inspected desktop and mobile captures, and observed no uncaught browser errors, console errors in the supplemental run, or requests outside localhost. `npm run build` passed. The local `dataManager.js` hash matched the template.

### Observed `/go` changes by seeded workflow

Compared `current_state` before and after each action in addition to inspecting `state_diff`. On the cumulative run, `state_diff` retained earlier changes from the same session.

| Seed workflow | State fields observed through `/go` |
| --- | --- |
| Orders · browse, search, filter, sort, view and track | None. `current_state` stayed equal and the clean-session `state_diff` was empty. |
| Orders · confirm cancellation | On `orders[id=ord-0036]`, set `status = cancelled` and `cancelledAt`. Appended one `orderEvents[]` record with `id`, `orderId`, `type = cancelled`, `status = cancelled`, `amount = 47.81`, `currency = USD`, `items[].orderLineId`, `items[].quantity`, `actorId`, and `createdAt`. |
| Beauty Insider · view balance, filter activity, follow links | None. Browsing, dismissing the dialog, and unavailable offers left persisted state unchanged. |
| Beauty Insider · confirm redemption | Changed `beautyInsider.pointsBalance` from `1840` to `840` and `rewards[id=reward-travel-ritual].stock` from `4` to `3`. Appended `redemptions[]` with `id`, `accountId`, `rewardId`, `rewardName`, `pointsSpent = 1000`, `quantity = 1`, `status = redeemed`, `pointsTransactionId`, `actorId`, and `createdAt`. Appended `pointsTransactions[]` with `id`, `accountId`, `type = redeem`, `pointsDelta = -1000`, `balanceAfter = 840`, `description`, `redemptionId`, `actorId`, and `createdAt`. Both record links matched. |
| Returns · draft, review, submit and reserve items | Draft, review, and rejected paths changed no persisted fields. Each valid submit appended exactly one `returns[]` record with `id`, `returnNumber`, `orderId`, `accountId`, `status = submitted`, `method = mail`, `refundMethod = original_payment`, `items[].orderLineId`, `items[].quantity`, `items[].reasonCode`, `items[].estimatedRefund`, `estimatedRefund`, `currency`, `actorId`, `createdAt`, and `timeline[]` with `status = submitted` and `at`. The partial-line request reserved one unit of `line-0033-01`. No refund or points adjustment was written. |
| Returns · search, filter and view submitted or completed requests | None. Browsing, links, and viewing the timeline, refund, and instructions were read-only. |

## ❌ Bugs for Dev Agent

### BUG-001 · P0 · A stale tab can erase a confirmed action in the same session

| Field | Value |
| --- | --- |
| Route | `/account/orders/ord-0036` and `/account/beauty-insider` with the same `sid` |
| Element | Confirm cancellation and Confirm redemption |
| Action | Open both tabs before mutating. Confirm cancellation in the order tab and wait for HTTP 200. Then confirm Travel Ritual Set redemption in the already-open rewards tab. |
| Expected | `/go` retains the cancelled order, its event, and the new redemption and points changes. |
| Actual | Both POSTs returned 200. After the second POST, `/go` showed `ord-0036.status = placed`, the cancellation event was gone, and `state_diff` retained only `beautyInsider`, `pointsTransactions`, `redemptions`, and `rewards`. |
| Console errors | None observed. |
| Fix hint | Read the latest shared state and revalidate inside a session-scoped serialized commit. Check that two accepted actions survive and that a stale confirmation for an exhausted item or cancelled order produces zero writes. Keep the shared templates intact. |

## Visual Alignment Feedback

Reviewed captures of all seven account routes and the return review dialog against the original `DESIGN.md`. The desktop split layout, mobile stacking, text wordmark, local CSS artwork, and visible control states matched the intended direction.

### VISUAL-001 · P2 · Desktop overview and points ledger spacing

| Field | Value |
| --- | --- |
| View | `/` and `/account/beauty-insider` |
| Reference | `DESIGN.md` |
| Mock | `.dev-checks/playwright-overview.png` and `.dev-checks/playwright-beauty.png` |
| Issue | The gap below the overview hero is 28 px versus the specified 32–40 px. The points ledger CSS permits 64 px rows versus the specified 72 px desktop minimum. |
| Suggestion | Use the specified spacing for those two components. |

## Round History

### Round 1

- All three `SEED.md` workflows passed, with structured persistence verified via `/go`.
- Reproduced the audit finding for same-session tabs in BUG-001 and confirmed the spacing mismatch in VISUAL-001.
-

## Harbor Docker dynamic certification

The repository certifier passed the production bundle in run `150244`. The local evidence is `factory/build/dyn_certify/150244/results.json`.

| Render | Sync | Idle | Hydrate |
| --- | --- | --- | --- |
| Pass | Pass (1 baseline POST) | Pass (0 idle POSTs) | Pass |
Injection reached `orders → 0 → orderNumber`.
