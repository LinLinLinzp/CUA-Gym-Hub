# The Home Depot Mock — Test Report

> Round: 2  
> Date: 2026-11-18  
> Server: http://localhost:5315  
> Tested by: playwright agent

WORKFLOWS: PASS

## Summary

| Metric | Count |
| --- | ---: |
| Routes tested | 12 views |
| Elements tested | Representative navigation, filters, row links, form controls, and dialogs across all four workflows |
| ✅ Passed | 10 check groups |
| ❌ Failed | 1 concurrency check |
| ⚠️ Skipped (out of scope) | 0 |

Ran `npm run build`, `node test_acceptance.mjs` on Vite dev, and `node test_preview.mjs` on the built preview. Used installed Chromium through `PILOT_PLAYWRIGHT` and localhost port 5315. Supplemental Playwright checks covered navigation and desktop layouts, SID reset, and simultaneous writes. The acceptance suite froze the browser clock at `2026-11-18T16:15:00.000Z` and verified `account-casey-morgan` as the actor.

## ✅ Passing Tests

### Seed workflows and state changes

Each action was driven through the UI. The paths below are in `GET /go?sid=… → current_state`. The main run observed `orders`, `rentals`, `projectLists`, and `returns` in `state_diff`.

| Workflow and action | Verified state changes |
| --- | --- |
| Orders · cancel `order-10402` | Changed `orders[].status` to `cancelled` and added `cancellation.{reason,actorId,createdAt}` on the same ID. Reason was `ordered_by_mistake`. The original receipt lines, totals, and fulfillment metadata matched the baseline. |
| Tool rental · reserve and cancel | Appended `rentals[].{id,toolId,toolName,storeId,pickupAt,durationHours,quantity,estimatedAmount,depositAmount,status,actorId,createdAt}`. Verified the Drum Floor Sander at North Ridge, a 24-hour booking for one, a $69 rental estimate, and a separate $75 deposit. Cancellation set `status = cancelled` and added `cancellation.{actorId,createdAt}` on that same reservation ID. |
| Project lists · create and rename | Appended `projectLists[].{id,name,description,status,items,actorId,createdAt,updatedAt}` with a trimmed name, `status = active`, and empty `items`. Renaming changed `name`, `description`, `updatedAt`, and `updatedBy` in place. |
| Project lists · add, edit, remove, delete | Appended `items[].{id,productId,name,sku,unitPrice,quantity,note,status,actorId,createdAt,updatedAt}`. Re-adding the SKU reused the item ID and increased quantity from 3 to 5. Editing changed it to 4 and saved the new note. Removal set `items[].status = removed`. Item changes stamped the parent with `updatedAt` and `updatedBy`. Re-add, edit, and removal also stamped the line. Deleting set `projectLists[].status = deleted` and stamped the parent. |
| Returns · submit an in-store return | Appended `returns[].{id,orderId,method,storeId,status,refundAmount,actorId,createdAt,items}` linked to `order-10401`, with `method = in_store`, `storeId = store-maple-heights`, `status = requested`, and `refundAmount = 12.98`. Verified `items[].{orderItemId,productId,quantity,reason,unitPrice,amount}` for the last available deck-screw unit. The source order matched the baseline. |
| Returns · submit a mail return and recover a stale draft | A two-line mail return used the same return and item fields, omitted the optional store ID, and recorded line amounts of $12.98 and $7.70 for $20.68 total. A stale draft submitted after this save was rejected in both a same-context tab and an isolated browser context. After editing the stale draft, a new in-store return for a remaining line appended a $5.97 item and preserved the first return's ID and full record. |

- **Orders and rentals.** Verified search, filters, sorting, receipt reload, cancel validation and dismissal, store availability, past and overlapping pickup rejection, an adjacent rental slot, separate deposit, and reservation management.
- **Project lists and returns.** Verified list-name and whole-quantity validation, material search by SKU, estimates, persistence, both return entry points, eligible quantities, method restrictions, return deadlines, return history, and next steps.
- **Navigation and accessibility.** Verified brand and workflow links, active navigation, keyboard skip and dialog actions, focus containment and restoration, filter resets, 12 desktop views, and seven representative views at 360 px without horizontal overflow. Captured the mock's own layouts and inspected the desktop and mobile overview and representative workflow screens.
- **Harbor behavior.** Verified deterministic defaults, an injected field preserved across writes, empty and sparse data, 300 injected orders, direct links, hard reloads, missing-record recovery, SID isolation, and baseline reset. The main run observed one baseline POST and 11 mutation POSTs. An idle tab issued zero POSTs while another tab changed the same SID. Rejected and dismissed actions produced no mutation POSTs. The main run reported zero page errors, console errors, or external runtime requests. The shared data manager matched its template byte for byte.

## ❌ Bugs for Dev Agent

### BUG-001 · P0 · Simultaneous confirmations can overwrite a saved return

| Field | Value |
| --- | --- |
| Route | `/returns/new/order-10401` |
| Element | Submit return |
| Action | In two isolated Chromium contexts sharing a SID, review the last eligible unit. Submit both confirmations and use Playwright routing to let both fresh `GET /state` reads complete before allowing either submission to proceed. |
| Expected | One confirmation persists. The second detects that the unit is exhausted. |
| Actual | Both POSTs return 200 with distinct return IDs. Only one ID remains in `/go.current_state.returns`. |
| Console errors | No visible error. |
| Fix hint | Atomic validation and write, or a conditional write against a state revision, requires Harbor runtime support. The required shared API accepts unconditional full-state writes. The preflight read rejects submissions made after the earlier write but cannot serialize two independent contexts. |

## Round History

### Round 1 → Round 2

- AUDIT-001: Fixed stale submissions when the first confirmation is already persisted. BUG-001 tracks the distinct case where both confirmations read before either write.
- AUDIT-002: Fixed hidden exhausted lines blocking an edited return. Verified a remaining item can be submitted without reloading.
- AUDIT-003: Fixed order search for product names and SKUs supplied by linked catalog records. Verified both search terms against the name and SKU displayed on the receipt.

Docker dynamic certification and commit remain with the parent runner.

## Harbor Docker dynamic certification

The repository certifier passed the production bundle in run `119964`. The local evidence is `factory/build/dyn_certify/119964/results.json`.

| Render | Sync | Idle | Hydrate |
| --- | --- | --- | --- |
| Pass | Pass (1 baseline POST) | Pass (0 idle POSTs) | Pass |
Injection reached `stores → 0 → name`.

## P0 audit replay, 2026-11-18

- **AUDIT-001 · Previously fixed, retested.** The built-preview suite exercised stale return rejection in tabs and isolated contexts. The separate report’s simultaneous isolated-context race remains outside that sequential fix.

Docker dynamic certification run `125084` recorded render pass, sync pass (1 startup POST), idle pass (0 idle POSTs), and hydrate pass.

- **BUG-001 · Still reproduced.** Two isolated Chromium contexts sharing a SID each read the available quantity, then submitted the last eligible unit. The browser probe held both writes until their preflight reads had completed. Both writes returned HTTP 200 with distinct return IDs. The final Harbor snapshot retained only one. Atomic validation and write must occur in the shared runtime to cover this case.
