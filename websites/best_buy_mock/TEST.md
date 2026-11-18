# Best Buy Mock — Test Report

> Round: 2  
> Date: November 18, 2026  
> Server: http://localhost:5311  
> Tested by: playwright agent

WORKFLOWS: PASS

## Summary

| Metric | Count |
| --- | ---: |
| Routes tested | 9, including the fallback |
| Elements tested | 11 grouped interaction and contract checks |
| ✅ Passed | 11 |
| ❌ Failed | 0 |
| ⚠️ Skipped (out of scope) | 0 |

## ✅ Passing Tests

The Chromium runs used the installed Node Playwright from `PILOT_PLAYWRIGHT`. The table records the persisted fields checked through `GET /go?sid=…` after each confirmation. The runs also compared consecutive snapshots to verify which top-level collections changed.

| Seed workflow | Browser checks | Observed changes through `/go` |
| --- | --- | --- |
| Orders | Combined status, year and fulfillment filters with SKU search. Cleared filters, searched by order number, and opened details, receipt, pickup details and shipment tracking. Rejected an invalid pickup email, updated the pickup person, dismissed the success notification, and canceled two units across separate confirmations after discarding a review. | Pickup replaced `orders[].pickupContact`, wrote `updatedAt`, and appended a confirmed `orderEvents[]` entry with the previous and new contact, order ID, actor and timestamp. Cancellation incremented `orders[].items[].canceledQuantity`, set `updatedAt`, and set `status` to `canceled` after the last unit. Each cancellation appended a confirmed `orderEvents[]` entry with order and line IDs, reason, quantity, unit price, refund estimate, actor and timestamp. |
| Price match | Opened from a completed order and separately from history. Exercised order and item selection, rejected an excessive offer and an invalid URL scheme, and checked review, back and discard. Submitted a two-unit request, found it by ID, and confirmed that the request used up the eligible quantity. | Appended one `priceMatchRequests[]` entry with order and line IDs, actor, timestamp, `submitted` status, channel, evidence URL, original and offer unit prices, quantity and a $40.00 requested amount. |
| Protection plans | Opened the protection picker from the list and added the quoted plan from an order. Reloaded its detail, submitted service for a seeded active plan, checked the open-claim guard, canceled the newly added plan, and exercised the canceled and expired filters. | Added an active `protectionPlans[]` record with order and line links, unit count, term, amount and timestamp, plus a linked `protectionPlanEvents[]` entry with type `added`, actor, amount and timestamp. Service appended a `protectionClaims[]` record with plan and purchase links, issue type, description, quantity, `submitted` status, actor and timestamp. Cancellation set `protectionPlans[].status` and `canceledAt` and appended a linked `protectionPlanEvents[]` entry with type `canceled`, reason, zero amount, actor and timestamp. |
| Returns | Started a one-unit mail return from history, opened its detail and packing slip, and rejected an over-quantity retry from the order. Canceled the request, used the restored capacity for a two-unit store return, and searched history by order. Checked the line selection toggle and the mail path in a session with no stores. | Appended `returns[]` records with order ID, actor, timestamp, `requested` status, method, mail reference or store ID, line ID, quantity, reason, original unit price, line estimate and aggregate estimate. Verified $239.99 for the mail return and $479.98 for the store return. Cancellation wrote `returns[].status`, `canceledAt`, and `canceledBy` while preserving the original lines. |

- Verified the overview shortcuts, wordmark, active navigation, order-row arrow, back links, keyboard skip link, price-match disclosure by mouse and keyboard, and fallback route. Same-session links and redirects retained `sid`.
- Clicked both print controls. Chromium produced a one-page receipt and a one-page mail packing slip.
- Opened isolated sessions with seeded, empty, single-order, partial-record, no-store and 300-order worlds. Verified deep links, hard reloads, missing records, array replacement, account merging and passthrough fields. Confirmed `/go` exposed the injected baseline and the persisted return in `state_diff`. Reset restored the baseline and cleared the diff.
- The seeded workflow session made one baseline `set` and ten `set_current` writes for ten confirmations. Browsing, validation, dismissal, printing, reloads and a six-second idle interval produced zero additional business writes.
- `npm run build` passed, and `src/utils/dataManager.js` matched the Harbor template byte for byte. Chromium recorded zero console errors, page errors or off-origin requests. The parent runner owns Docker dynamic certification.

## ❌ Bugs for Dev Agent

No open findings from this round.

## Visual Alignment Feedback

Reviewed screenshots of all eight populated account views at 1366px and 390px, plus the mobile pickup dialog, against the site's original `DESIGN.md`. Navigation wrapped on mobile, the populated routes had no horizontal overflow, and the pickup dialog fit the viewport. The dashboard used live Best Buy text, the local electronics illustration, and CSS product thumbnails. Screenshots and runners are in the gitignored `test-results/` directory.

## Round History

### Round 1 → Round 2

- Confirmed the audit fixes for return eligibility in a world with no stores and the price-match disclosure indicator.
- Reran all seed workflows and verified the exact top-level state changes for each confirmation.
- Added coverage for alternate entry points, keyboard navigation, back and discard actions, and populated mobile views.

## Harbor Docker dynamic certification

The repository certifier passed the production bundle in run `138124`. The local evidence is `factory/build/dyn_certify/138124/results.json`.

| Render | Sync | Idle | Hydrate |
| --- | --- | --- | --- |
| Pass | Pass (1 baseline POST) | Pass (0 idle POSTs) | Pass |
Injection reached `orders → 0 → orderNumber`.
