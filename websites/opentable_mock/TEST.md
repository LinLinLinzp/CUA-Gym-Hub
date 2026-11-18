# OpenTable Mock — Test Report

> Round: 3  
> Date: 2026-11-18  
> Server: http://localhost:5318  
> Tested by: playwright agent

WORKFLOWS: PASS

## Summary

| Metric | Count |
| --- | ---: |
| Routes tested, including redirect and recovery paths | 10 |
| Interaction groups tested | 12 |
| ✅ Passed | 12 |
| ❌ Failed | 0 |
| ⚠️ Skipped (out of scope) | 0 |

The current Vite development build passed in installed Node Playwright Chromium on Windows. `npm run build` passed. The earlier round also exercised the built app through Vite preview. The parent runner handles Docker certification.

## Workflow evidence via /go

`GET /go?sid=audit-1795006322524` exposes the final state from the current run. The suite also read intermediate state after each mutation and verified that `GET /state` returned the same final records.

| SEED workflow | Browser result | Fields observed through `/go` |
| --- | --- | --- |
| View and search reservations | Upcoming featured Juniper & Rye. Confirmation-code search found Paper Crane. Past showed 32 visits and Canceled showed three records. Clearing a search retained the active tab. | No fields changed. The baseline `state_diff` was empty. |
| Book a table | Filtered by neighborhood, date, preferred time and cuisine, then followed a time link. Reload preserved the selected time. Past and conflicting dates were rejected. Switching seating changed the available time choices. Confirmation opened a reservation detail that survived reload. | `reservations[]` appended `res-cbcc5062622cc28d3c02` for `rest-001` and `diner-001`, with code `OT-D8E34F818C`, date `2026-12-25`, time `19:00`, party size 2, Dining room seating, trimmed occasion and request, `status: confirmed`, `potentialPoints: 0`, and matching `createdAt` and `updatedAt`. `reservationEvents[]` appended `evt-01cdcae7fa800d3c7f78` with `type: booked`, the matching actor and reservation IDs, `before: null`, the resulting `after` snapshot and `createdAt`. |
| Modify a reservation | Saw the prefilled editor, verified unchanged save and Escape dismissal, then updated the booking and reloaded its detail. | The same `reservations[]` record kept its ID and code. Its `date` became `2026-12-26`, `time` became `17:30`, `partySize` became 3, `specialRequest` became “Patio if available”, `potentialPoints` became 500, and `updatedAt` advanced. `reservationEvents[]` appended `evt-7c1077f7a7bb38507515` with `type: modified`, the linked IDs, before/after snapshots and matching `createdAt`. |
| Cancel a reservation | Kept the booking once and confirmed cancellation on the second attempt. Reload kept the canceled detail and removed the cancellation control. | The same `reservations[]` record changed to `status: canceled`, `potentialPoints: 0`, and matching `canceledAt` and `updatedAt`. `reservationEvents[]` appended `evt-63c055e2a3158a2ec294` with `type: canceled`, the linked IDs, before/after snapshots and the same timestamp. `pointTransactions[]` still matched the baseline. |
| Submit and read reviews | Required the overall rating and dismissed a draft. Submitted a review from a completed reservation and a star-only review from To review. Reload showed the first visit as reviewed and hid its review action. | `reviews[]` appended `rev-6643e358f3cb437f647c` for `res-006`, `rest-006` and `diner-001` with `overall: 5`, `food: 4`, `service: 5`, `ambience: 3`, `value: 4`, trimmed `comment`, `status: submitted` and `createdAt`. `rev-8c93554e63bc82111d01` linked `res-007` and `rest-007` to the same actor, with `overall: 4`, an empty comment, submitted status and creation time. Its optional ratings were absent. |
| View points and activity | Available balance started at 2,100 and pending points returned to 1,300 after cancellation. Earned showed 24 entries and Redeemed showed the prior debit. Activity links opened the associated visit or credit. | No fields changed by opening Points, filtering or following activity links. |
| Redeem points | The $40 option showed insufficient balance. Dismissing the $16 redemption left the balance intact. Confirming issued the credit, reduced the available balance to 100 after reload and disabled the $16 option. | `pointRedemptions[]` appended `redeem-0e3450421f55b8139ba2` with `rewardOptionId: reward-dining-16`, `actorId: diner-001`, `pointsSpent: 2000`, `amount: 16`, `currency: USD`, `status: issued` and `createdAt`. `pointTransactions[]` appended `pts-1bf9de2f4b4471e6b27c` in the same write with `type: redeemed`, `points: -2000`, `status: posted`, the matching actor and timestamp, and the new `redemptionId`. |

## ✅ Passing Tests

- **Reservations · navigation, search and tabs.** The initial redirect, featured link, status tabs and search behaved as expected.
- **Find a table · discovery filters and links.** Applied neighborhood, cuisine, date and time filters. Show all available times cleared the time field, Clear filters recovered from zero results, and returning from restaurant detail recovered the search.
- **Restaurant detail · booking.** Confirmed an available future reservation and rejected invalid selections without writing state.
- **Reservation detail · modify.** Changed a reservation, verified its snapshots and used both dialog close and discard controls.
- **Reservation detail · cancel.** Verified both responses to the confirmation dialog and the cancellation on reload.
- **Reservation detail · calendar.** Downloaded the local `.ics` file and verified the restaurant and confirmation code. This action added no state write.
- **Reviews · eligibility, submission and navigation.** Exercised both submission entry points, required rating, optional ratings, tab changes and View visit links.
- **Points · activity.** Verified All, Earned and Redeemed, including linked credits and visits.
- **Points · redemption.** Checked affordability, dismissal, issuance, debit and balance persistence.
- **Account shell · navigation and recovery.** Verified the wordmark, sidebar, page action, breadcrumbs, missing-record recovery and unknown-route recovery. Navigation retained `sid`.
- **Harbor · isolation, injection and idle behavior.** Verified `set`, `set_current` and `reset` in a separate test session. An empty world, sparse records, a 12-guest slot and a 300-reservation list rendered. The workflow tab and same-session idle tab produced one baseline post and six action posts, with no further writes during the five-second idle check.
- **Rendering · desktop and mobile.** All six main screens reloaded directly. The 360 px layout had no horizontal overflow. The browser checks logged zero runtime errors, console errors, HTTP errors or external requests.

## ❌ Bugs for Dev Agent

None observed in this round.

## Visual Alignment Feedback

Reviewed six desktop viewport captures and the 360 px review dialog against the original design in `DESIGN.md`. The navigation rail, typography, local food imagery, reservation ticket and points layout rendered as designed. The mobile review dialog fit within the viewport. The primary reservation action showed a hover response.

## Round History

- Round 1 passed the workflow suite in Vite dev and built preview.
- Round 2 passed the audit regressions for orphaned reservations, future review eligibility, larger injected party sizes and the accessible featured date.
- Round 3 reran the workflows and verified additional controls, responsive rendering and the final `/go` state above.

## Harbor Docker dynamic certification

The repository certifier passed the production bundle in run `151296`. The local evidence is `factory/build/dyn_certify/151296/results.json`.

| Render | Sync | Idle | Hydrate |
| --- | --- | --- | --- |
| Pass | Pass (1 baseline POST) | Pass (0 idle POSTs) | Pass |
Injection reached `restaurants → 0 → name`.
