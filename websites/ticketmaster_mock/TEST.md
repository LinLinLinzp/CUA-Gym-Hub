# Ticketmaster Mock — Test Report

> Round: 2  
> Date: November 18, 2026  
> Server: http://127.0.0.1:5337  
> Tested by: playwright agent  
> Browser Chromium via Node Playwright resolved from `PILOT_PLAYWRIGHT`  
> Browser clock fixed to 2026-11-18T15:00:00.000Z

WORKFLOWS: PASS

## Summary

| Metric | Count |
| --- | --- |
| Routes tested | 6 |
| Confirmed workflow actions tested | 9 |
| ✅ Passed workflow actions | 9 |
| ❌ Failed workflow actions | 0 |
| ⚠️ Skipped workflow actions | 0 |

## ✅ Passing Tests

### Workflow evidence

Each confirmation used a browser interaction and returned one successful `POST /post?sid=…` with `action: set_current`. The submitted snapshot matched `GET /go?sid=…` and the checks compared affected records with their previous versions. Workflows used fresh SIDs.

| Action | Browser and `/go` result |
| --- | --- |
| Save, remove and reactivate an order | Searched by event, venue, city and order number, switched order views, paged results, opened a deep link and toggled the receipt. Saved `ord-001` and verified a new `orderSaves` id, `orderId`, `actorId`, `createdAt`, `quantity: 3` and `status: saved`. The saved view and control survived reload. Removing wrote `status: removed` and audit fields on the same record. Reactivating reused its id and restored `quantity: 3` and `status: saved`. |
| Send a transfer | Selected `tkt-001` and `tkt-002`, corrected invalid recipient details, and dismissed one review with Escape. The confirmed transfer appended a pending outgoing record with recipient name and email, order and ticket ids, quantity 2, actor and creation time. The two seats became `transfer_pending` with the transfer id as `holdId` and updated audit fields. The remaining seat was unchanged. The resale picker disabled both held seats. |
| Cancel an outgoing transfer | Opened the pending activity and confirmed cancellation. The same transfer retained its id, recipient and seat references with `status: canceled`, `updatedAt` and `updatedBy`. Its selected seats became `available` with no `holdId`. An injected seat held by a different record stayed unchanged in a separate cancellation case. |
| Accept an incoming transfer | The linked order initially showed zero usable seats. Acceptance changed `xfer-001` to `accepted`, retaining its sender actor and creation timestamp. Each of the three reserved seats became available with no hold and the current account as `updatedBy`. The order then showed three usable seats. A transfer addressed to a different recipient offered no accept action. |
| Create a listing | Rejected zero, negative, overprecision, overflow and missing-payout inputs. Listed `tkt-002` and `tkt-003` using `out-002`. Review and persisted record agreed on 12,865 cents per ticket, quantity 2 and 25,730 cents total. The row stored status, currency, order and seat ids, actor and timestamp. Selected tickets became `listed` with the new listing id as hold and updated audit fields. Transfer selection disabled a listed seat. |
| Edit and remove a listing | Rejected an unchanged price, then saved 11,950 cents per ticket and a 23,900-cent total on the same active row. Only listing price, total and audit fields changed. Dismissing removal left the state intact. Confirming removal retained the row as `removed` and released its seats with audited status changes. An injected foreign hold survived removal in a separate case. Sold activity remained visible without edit controls. |
| Request a refund | Rejected a missing reason and dismissed one review. Confirmed all four tickets from `ord-003` with `event_changed` and the order's original `paymentMethodId`. Verified the new refund's order, ticket ids, quantity, status, currency, actor, timestamp, four exact line items and summed subtotal, fees, tax and total. The order and all four seats became `refund_requested`. Seats held the refund id and all changed rows recorded audit fields. Receipt totals stayed the same. A second browser tab with a stale review rejected the duplicate and made zero writes. Requested, processing and completed history and automatic, expired and unavailable explanations rendered. |

### Runtime and layout

- The seed is deterministic and contains 84 orders, 84 events, 211 seats, 24 transfers, 24 listings and 25 refunds. Verified unique ids, order-to-event links, itemized totals for every order and coherent hold ownership.
- Opened and reloaded every account route in an empty session, including an unavailable order. Verified a single partial order with a dangling event, incomplete seat and dangling activity records. Saving the partial order preserved the injected extension. Searched and opened an order in a 424-order world.
- Verified SID retention on navigation and reload, isolated state across nine SIDs, exactly one baseline write for each, and no business writes for validation, dismissal, read-only navigation, receipts or idle tabs. Confirmed unchanged client state adapter by comparing the file hash with the Harbor template.
- Verified two independent Chromium contexts on the same SID preserve sequential changes to separate saved orders. Two tabs in one context also preserved both changes when they confirmed concurrently and one POST was delayed. Both tests verified the final snapshot through `/go`.
- Verified a missing original payment record prevents a refund without changing the order or refund records. An owned active listing with no quantity has no price-edit action, and confirmed removal still changes its status to `removed`.
- Verified the shared endpoints retain their initial snapshot after `set_current` and restore it with `reset`.
- Verified secondary controls and read-only state through `/go`. Used both pagination directions, remaining filters, the wordmark, Go to Orders, View refunds, activity disclosures and listing order links. Toggled seat checkboxes, returned to edit from all four review forms, and verified input retention, hover feedback and focus restoration.
- Inspected Orders at 1440px and 390px, the order detail and three activity views at 1440px, and the transfer dialog at 390px. Mobile views fit the viewport without horizontal scrolling. Escape dismissed the review and returned focus to the trigger. Chromium captured zero uncaught page errors and zero off-origin requests.
- Measured all four activity action buttons at least 44px tall and verified the partial listing layout at 390px. The account uses original CSS artwork, synthetic events and the Ticketmaster name as text. Visual QA used the local design brief.
- `npm run build` passed. The parent runner handles Docker dynamic certification.

## ❌ Bugs for Dev Agent

No open findings from the local test suite. Simultaneous writes from independent browser contexts on the same SID remain subject to the shared API's whole-snapshot write semantics. The concurrency test used tabs in one browser context.

## Round History

### Round 1 → Round 2

- AUDIT-001 ✅ Fixed for sequential confirmations from independent contexts. Verified both saved order changes in the final snapshot.
- AUDIT-002 ✅ Fixed. The refund action is unavailable when the linked payment method is missing.
- AUDIT-003 ✅ Fixed. The price-edit action is unavailable when the listing has no quantity, and removal still works.
- AUDIT-004 ✅ Fixed. All activity action buttons met the 44px target.

## Harbor Docker dynamic certification

The repository certifier passed the production bundle in run `189324`. The local evidence is `factory/build/dyn_certify/189324/results.json`.

| Render | Sync | Idle | Hydrate |
| --- | --- | --- | --- |
| Pass | Pass (1 baseline POST) | Pass (0 idle POSTs) | Pass |
Injection reached `events → 0 → name`.

## P0 audit replay, 2026-11-18

- **AUDIT-001 · Previously fixed, retested.** The browser suite retained both sequential actions across independent contexts and delayed concurrent actions from same-context tabs.

Docker dynamic certification run `154644` recorded render pass, sync pass (1 startup POST), idle pass (0 idle POSTs), and hydrate pass.
