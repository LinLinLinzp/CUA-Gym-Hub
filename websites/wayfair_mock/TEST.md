# Wayfair Mock — Test Report

> Round: 3  
> Date: 2026-11-18  
> Server: http://localhost:5313  
> Tested by: playwright agent

WORKFLOWS: PASS

## Summary

| Metric | Count |
| --- | ---: |
| Routes tested, including unknown-route recovery | 10 |
| Required workflows passed | 4 |
| Targeted save and scheduling regressions passed | 3 |
| Open functional issues from this run | 0 |
| Open visual differences | 1 |

Chromium used the installed `PILOT_PLAYWRIGHT` package on the existing Vite dev listener. Each workflow used a fresh session ID and compared `/go` against that session's baseline.

## ✅ Passing Tests

### Seed workflows and `/go` evidence

| Steps and expected result | Observed state and reload result |
| --- | --- |
| **Orders** (`orders-1794990533358`). Page through orders, search by SKU, open `wf-1005`, and return to the filtered list. Verify both tracking timelines. Try to cancel three units of the two-unit side table, then review and confirm one unit. | Three units were rejected with an empty diff. Confirmation changed `orders[].items[].canceledQuantity` from 0 to 1 on `wf-1005-i1` and appended `orderCancellations[]` with `id`, `orderId`, `status: confirmed`, `reason: changed_mind`, `items[]` (`orderItemId`, `quantity: 1`, `estimatedCredit: 48.60`), `estimatedCredit: 48.60`, `currency`, `actorId` and `createdAt`. The partially canceled status survived reload. |
| **Schedule delivery** (`deliveries-1794990535565`). Open scheduling from `wf-1001`, choose the first of six windows and confirm with driveway instructions. | Appended `deliveryAppointments[]` with `id`, `orderId: wf-1001`, `shipmentId: wf-1001-s1`, `slotId: wf-1001-s1-slot-1`, `startAt`, `endAt`, `timeZone: America/New_York`, `instructions: Use the north driveway.`, `status: confirmed`, `actorId` and `createdAt`. The confirmed reference survived reload. |
| **Reschedule and cancel delivery** (same delivery session). Open `wf-1002`, verify prefilled instructions, move the appointment from slot 2 to slot 3, and cancel the replacement. | Rescheduling updated `deliveryAppointments[]` record `appt-wf-1002` with `status: rescheduled`, `updatedAt`, `updatedBy` and `replacedByAppointmentId`. The replacement carried the scheduling fields, updated instructions and `previousAppointmentId`. Cancellation set the replacement's `status: canceled`, `updatedAt`, `updatedBy` and `canceledAt`. The shipment could be booked again after reload. A past-only injected shipment offered zero slots and left the diff empty. |
| **Damage claim** (`claims-1794990538333`). Open the report from a delivered lamp on `wf-1003`. Try a short description and oversized and unsupported photo files. Keep one valid PNG and request replacement of one of two lamps. | Review and validation left the diff empty. Confirmation appended `damageClaims[]` with `id`, `orderId`, `orderItemId: wf-1003-i1`, `shipmentId: wf-1003-s1`, `quantity: 1`, `issueType: damaged`, `description`, `requestedResolution: replacement`, `status: submitted`, `actorId`, `createdAt` and `attachments[]` containing `{name: "lamp-base.png", size: 67, type: "image/png"}`. The claim and filename survived reload. The order linked to the claim, and a second claim offered one remaining unit. |
| **Return and cancel** (`returns-1794990533967`). Try two units of the one eligible rug on `wf-1004`, then confirm one with parcel drop-off and refund to the original payment method. Check the final-sale pillow and expired item on `wf-1006`. Cancel the confirmed request. | Invalid quantity left the diff empty. Final-sale and expired choices were disabled. Confirmation appended `returns[]` with `id`, `orderId`, `items[]` (`orderItemId: wf-1004-i1`, `quantity: 1`, `reason: did_not_match`, `refundAmount: 118.80`), `handoffMethod`, `refundMethod`, `refundSubtotal: 118.80`, `returnFee: 8.95`, `estimatedRefund: 109.85`, `currency`, `status: requested`, `actorId` and `createdAt`. The reference and instructions survived reload. Cancellation set `status: canceled`, `updatedAt`, `updatedBy` and `canceledAt`. The canceled request survived reload and the rug became selectable again. |
| **Mixed handoff and stale return review** (`mixed-returns-1794990535816`). Inject two eligible parcel lines and one eligible freight line. Prepare the same parcel return in two tabs and confirm the reviews in sequence. | Selecting a parcel line disabled the freight line and displayed guidance. The first confirmation saved both parcel items with one USD 8.95 fee and a net refund of 133.61. The second tab showed an availability error, made zero POSTs and left the first result intact. |

Successful writes used synthetic actor `customer-ava-morgan`. New records had entity-prefixed UUIDs and ISO `createdAt` values. The browser suites waited for the successful action POST before reading the resulting `/go` state.

## Account and Harbor checks

- Hard-loaded and reloaded the overview, all four list routes, all four valid detail routes and an unknown route at 360 px. Checked the recovery link, keyboard navigation, browser back and forward, active navigation and `sid` retention. A keyboard regression surfaced during the first pass. Tab could leave the native dialog at the end of its focus order. Explicit focus wrapping fixed it, and Chromium verified that Escape returned focus to the trigger.
- Injected empty collections, one record per relevant collection with missing optional fields and unresolved links, and a world with 320 orders. Verified empty and missing-record recovery views, sparse details, pagination, search and deep links.
- Verified separate session IDs remained isolated and `/post` reset restored the initial snapshot. In a shared browser session, an idle tab made zero POSTs and picked up another tab's confirmed cancellation. The active tab made exactly one `set_current` POST and preserved an unknown injected field.
- Blocked requests outside localhost while loading routes and confirmed the overview furniture images loaded. Captured all ten views at 1440 px in gitignored `test-results/` and inspected representative screens against `DESIGN.md`. No JavaScript page or console errors appeared in the desktop route pass.
- Verified the wordmark and account links, open-request summaries, order paging in both directions, order year/status/sort filters, delivery filters, keeping an appointment, claim photo limits and photo removal. These left `/go` unchanged.
- Verified claims and returns search by case reference or order number, oldest-first sorting, reload persistence and filter clearing. Verified keyboard clipboard actions for order, tracking, appointment, cancellation, claim and return references. Both checks left the session's `/go` diff empty.
- Verified 64 fixed-ID orders, 115 linked shipments, 25 item cancellations, 31 appointments, 24 claims and 24 returns. Checked seed IDs, date coverage, featured eligibility, relationships and amounts.
- `npm run build` passed. Chromium exercised the built `dist/` on Vite preview with the shared state API.

## Harbor Docker certification

The final production bundle passed the repository certifier. The local result is `factory/build/dyn_certify/117508/results.json`. The page returned HTTP 200 with no page errors, made one baseline POST and zero POSTs during the 70-second idle check, and hydrated the injected value at `orders[0].orderNumber`.

## Resolved regressions

### BUG-001 · P0 · Overlapping confirmations could lose a saved cancellation

| Field | Value |
| --- | --- |
| Route | `/orders/wf-1005` |
| Element | Confirm cancellation |
| Action | In two tabs sharing a `sid`, delay the first confirmation POST, complete the second, then release the first. |
| Expected | `/go` retains both cancellation records and two canceled units on `wf-1005-i1`. |
| Before the fix | Both actions showed success and both POSTs returned 200, but `/go` went back to one record and one canceled unit. |
| Retest | Held the first save response during the second confirmation. Both dialogs stayed pending and the second POST waited for the first acknowledgement. After release, `/go` held two linked records and two canceled units. A separate HTTP 503 check kept the review open, left `/go` unchanged and created exactly one record on retry. |

### BUG-002 · P1 · A concurrent delivery booking could dismiss an open review

| Field | Value |
| --- | --- |
| Route | `/deliveries/wf-1001-s1?schedule=1` |
| Element | Review delivery appointment |
| Action | Inject one available slot. Open the review from the order and enter instructions in tab A. Book the slot from tab B in the same session. |
| Expected | Tab A retains the draft and explains that the slot or booking changed. |
| Before the fix | Tab A closed the dialog, dropped the instructions and retained `schedule=1` in the URL. |
| Retest | Tab A retained the review and instructions, displayed the stale booking message at confirmation and cleared `schedule=1` when dismissed. `/go` contained exactly one booking for the shipment. |

## Visual Alignment Feedback

### VISUAL-001 · P2 · Overview artwork container exceeds its design allocation

The desktop welcome panel uses a 49% image element and scales it by 1.12. The local design allocates 40% to the artwork. The default account text and illustration remained clear in the 1440 px capture. See `AUDIT-003` in [AUDIT.md](AUDIT.md).

## Round History

### Round 1 → Round 2

- The earlier dialog focus fix remains verified. Escape returns focus to the trigger and Tab stays inside the dialog.
- BUG-001 and BUG-002 reproduced during this round. VISUAL-001 remains in the current CSS.

### Round 2 → Round 3

- The final production build passed. Chromium reran orders, delivery scheduling, damage claims, returns, stale return review, route and state contract checks, service history, clipboard and seed integrity against Vite preview. The three targeted regressions above passed on the same build.
