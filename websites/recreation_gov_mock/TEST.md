# Recreation.gov Mock — Test Report

> Round: 2  
> Date: 2026-11-18  
> Server: http://localhost:5515  
> Tested by: playwright agent  
> Browser: Installed Node Playwright and Chromium  
> Workflow clock: 2026-11-18T15:00:00.000Z

WORKFLOWS: PASS

## Summary

| Metric | Count |
|---|---:|
| Route patterns tested, including the fallback | 11 |
| Test groups | 14 |
| ✅ Passed | 14 |
| ❌ Failed | 0 |
| ⚠️ Skipped (out of scope) | 0 |

## ✅ Passing Tests

### Seed workflows and fields observed via `/go`

| Workflow | Browser result | State fields changed |
|---|---|---|
| Reserve a campsite | Searched by unit and state, selected Cedar Bend A12, and booked two nights for four campers with a tent. The $56 receipt survived a reload. | Appended one confirmed `reservations` row with every core reservation field below, plus `endDate` and `equipment`. Quantity was 2 nights at $24 with an $8 service fee. |
| Reserve a permit | Found Silver Fork and reserved four places at West Trailhead. The receipt totaled $26. | Appended one confirmed `reservations` row with every core reservation field. Quantity was 4 people at $5 with a $6 service fee. |
| Submit a lottery application | Filtered to open Washington opportunities and submitted two ordered dates for High Meadow. My lotteries showed a confirmation number and pending results. A duplicate date was rejected before submission, and reopening the opportunity blocked a duplicate application. | Appended one `lotteryApplications` row with `id`, `confirmationCode`, `status` = `submitted`, `lotteryId`, `preferences[].rank`, `preferences[].entryDate`, `partySize`, `feeAmount`, `currency`, `actorId`, `createdAt`, and `updatedAt`. Party size was 3 and the application fee was $6. |
| Review a lottery result and claim the selected permit | Found selected application `L-PINE041`, reviewed the claim, and confirmed a $28 permit. The application linked to the receipt and offered no second claim. | In one write, updated the existing `lotteryApplications` row's `status` to `claimed` and set `claimedAt`, `updatedAt`, and `reservationId`. Appended one confirmed `reservations` row with every core reservation field and `lotteryApplicationId`. The application retained its $6 fee. |
| Cancel a campsite | Dismissed the confirmation with Escape, then reopened and confirmed. The $38 refund retained an $8 service fee and $10 cancellation fee. Cedar Bend A12 became available again for the same nights. | In one write, set the reservation's `status` to `cancelled` and set `cancelledAt`, `cancellationId`, and `updatedAt`. Appended one `cancellations` adjustment with the fields below. |
| Cancel a permit | Cancelled the Silver Fork permit. The refund was $20 after retaining the $6 service fee. Quota returned to 12 places. | In one write, set the reservation's `status` to `cancelled` and set `cancelledAt`, `cancellationId`, and `updatedAt`. Appended one `cancellations` adjustment with the fields below. |

Core reservation fields verified in `/go` were `id`, `confirmationCode`, `kind`, `status`, `facilityId`, `unitId`, `startDate`, `partySize`, `quantity`, `currency`, `unitAmount`, `useAmount`, `serviceFee`, `totalAmount`, `policySnapshot`, `actorId`, `createdAt`, and `updatedAt`.

Each cancellation adjustment recorded `id`, `status` = `completed`, `reservationId`, `actorId`, `createdAt`, `policyCode`, `paidAmount`, `chargeLines`, `deductionLines`, `refundAmount`, and `currency`. Charge and deduction lines recorded `code`, `quantity`, `unitAmount`, and `amount`.

### Account controls and Harbor contract

- **Overview and navigation** — Keyboard skip link focused the main content. The wordmark returned to Overview, and next-trip, reservations, Explore, and lottery links opened the expected views.
- **My reservations** — Upcoming, Past, and Cancelled switched views. Reservation type, date order, and confirmation-code search updated the results and showed the empty state when appropriate.
- **Explore and booking review** — Arrival, departure, party size, and equipment narrowed results and carried through to the facility. Edit trip restored the selection. Confirming without accepting terms showed an error and made zero writes.
- **Lottery controls** — Open, Upcoming, and Closed narrowed opportunities. The Unsuccessful filter opened a result with a working opportunity link. Edit application retained its first preference, and Back to result returned from the claim review. Unaccepted terms blocked both submission and claim with zero writes.
- **Receipt controls** — Keep reservation and Escape dismissed the confirmation. Escape restored focus. Print invoked the browser print action, and print styling hid navigation and receipt controls.
- **Routes and injected state** — Direct routes and hard reloads rendered. A 360 px viewport fit seeded and empty worlds without horizontal overflow. Partial records rendered unavailable messages for a missing lottery destination and an existing claim backlink. A catalog of 320 injected facilities loaded and filtered correctly.
- **State API** — Each full workflow run sent one boot baseline and six mutation POSTs. `/go` and `/state` agreed. Only `reservations`, `lotteryApplications`, and `cancellations` appeared in the final diff. The independent controls run left the baseline untouched. Session isolation, reset, preserved `sid`, and a three-hour idle clock jump passed.
- **Build and offline operation** — `npm run build` passed. The full workflow suite passed with both the Vite dev app and compiled assets served through a Playwright fixture that passed only state API requests to localhost. Chromium reported no page errors or external requests.

## ❌ Bugs for Dev Agent

No open bugs found in this round.

## Visual Alignment Feedback

Reviewed screenshots against the site's [design brief](DESIGN.md). The desktop overview and booking review used the expected account rail, cream and evergreen palette, serif headings, and original landscape artwork. The 360 px screenshots showed wrapped navigation, stacked forms, and both cancellation actions inside the dialog. Screenshots and the supplemental runner are gitignored.

## Round History

- **Round 1** — Local acceptance also verified a late permit cancellation with a $0 refund and a `late_forfeit` deduction. The audit fixed incomplete lottery preflight and duplicate claim guards. [Audit report](AUDIT.md)
- **Round 2** — Reran both workflow suites and independently verified the three changed `/go` arrays and the linked records. Added account control and populated mobile coverage. The parent runner owns Docker dynamic certification.

## Harbor Docker dynamic certification

The repository certifier passed the production bundle in run `80464`. The local evidence is `factory/build/dyn_certify/80464/results.json`.

| Render | Sync | Idle | Hydrate |
| --- | --- | --- | --- |
| Pass | Pass (1 baseline POST) | Pass (0 idle POSTs) | Pass |
Injection reached `facilities → 0 → kind`.
