# United Airlines Mock — Test Report

> Round: 3  
> Date: 2026-11-18  
> Server: http://localhost:5322  
> Tested by: playwright agent

WORKFLOWS: PASS

## Summary

| Metric | Count |
| --- | ---: |
| Routes tested | 10 |
| Elements tested | Grouped into 14 scenarios below |
| ✅ Passed | 14 |
| ❌ Failed | 0 |
| ⚠️ Skipped (out of scope) | 0 |

Chromium from `PILOT_PLAYWRIGHT` used a fixed clock of November 18, 2026 at 8:00 AM Eastern for repeatable date-dependent checks. The production build passed.

## ✅ Passing Tests

### SEED workflows and /go state changes

Each confirmed action produced one `set_current` request. Before and after snapshots from `/go?sid=…` showed exactly the top-level changes in this table. The initial snapshot stayed fixed.

| Workflow | Observed result and state changes |
| --- | --- |
| Cash booking | Booked ORD–SFO for $267.60. `bookings[]` gained a confirmed record with a confirmation code, passenger and segment snapshots and cash payment. `bookingEvents[]` gained the linked `booked` entry. The trip opened and reloaded with its details intact. |
| Cash cancellation | The review showed $267.60 before confirmation. `bookings[].status` became `cancelled` and gained `cancelledAt`. `bookingEvents[]` gained a cancellation with `issuedCreditId`. `travelCredits[]` gained an available future flight credit with `sourceBookingId`, both amounts at $267.60 and expiry on November 18, 2027. The cancelled status was visible after reload. |
| Seat change | Changed Jordan on return segment `seg-037` of `bkg-001` from 18B to 21C for $39. The matching `bookings[].segments[].seatAssignments[pax-037]` changed, and `seatChanges[]` gained a record with that booking, segment, passenger, previous and new seat, fee, actor and timestamp. Trip details showed 21C after reload. |
| MileagePlus missing miles | Read the ticket in the Travelers section and submitted it for `bkg-013`. Only `mileageRequests[]` gained a record with booking, segment, passenger, member, ticket, actor, timestamp and `submitted` status. The request was visible after reload. Invalid and duplicate requests caused no writes. |
| MileagePlus award booking | Used 22,000 miles and paid $18.60 in taxes. `mileagePlus.awardMiles` fell from 58,420 to 36,420. `mileageActivity[]` gained a linked redemption for −22,000 miles. `bookings[]` gained a record with both payment amounts and `bookingEvents[]` gained the linked booked event. |
| Partial travel credit | Applied $267.60 from `cr-001`. `travelCredits[].remainingAmount` fell from $350.00 to $82.40 and status stayed available. `creditRedemptions[]` gained a linked row with amount and before/after balances. `bookings[]` stored the applied credit in payment and `bookingEvents[]` linked to it. Usage showed after reload. |
| Full travel credit | Applied $100.00 from `cr-002`. `travelCredits[].remainingAmount` reached zero and status became used. `creditRedemptions[]` gained the linked $100.00 application and balances. `bookings[]` stored the credit and $167.60 cash due, and `bookingEvents[]` linked the credit. Usage showed after reload. |

### Interface and Harbor checks

- **Overview and account navigation** verified the wordmark, account redirect, missing-route return link, overview shortcuts, breadcrumbs, keyboard skip link and session ID preservation.
- **Trip and seat controls** verified all three trip filters, sort order, trip search, case-insensitive lookup, rejected lookup, reservation links, occupied and current seat guards, and cleared seat and cancellation drafts. Closing cancellation restored focus to its launcher.
- **Booking controls** verified same-airport validation, outbound and return selection, traveler count and name inputs, payment modes, credit selection, primary hover feedback and returning from review with the draft intact.
- **MileagePlus and credit wallet controls** verified mileage activity search and filtering, request dialog dismissal, all three wallet tabs, expiry sorting, search empty state, detail view and source-trip navigation.
- **Session and endpoint behavior** verified isolated sessions, zero writes from an idle tab or discarded drafts, an unchanged `/go` snapshot after read-only controls, and initial snapshot preservation and reset behavior.
- **Injected worlds and offline operation** verified empty collections on eight deep links and reloads, optional ticket and payment fallbacks, and rendering 380 trips, 340 mileage entries and 310 credits. The control suite recorded zero console errors or HTTP failures. Both suites recorded zero page exceptions or external requests.
- **Visual alignment** reviewed local captures against the site's original design brief. The desktop overview, wallet, seat map and booking review retained readable controls and distinct layouts. At 768 px, trip panels stacked. At 414 px, the seat map fit all six 44 px columns. At 390 px, the overview fit without page overflow and the route art sat below the airport codes.

## ❌ Bugs for Dev Agent

No open issues found in this round.

## Round History

### Round 2 → Round 3

- Re-ran all seven confirmed actions and verified their `/go` results. Previous audit runs also passed against the built bundle in Vite preview.
- Moved the phone overview's decorative route art below the airport codes and verified the revised layout in Chromium.
- Retained the earlier checks for multi-traveler round-trip booking, duplicate confirmation, future flight credit owner validation, inclusive credit expiry and leap-day cancellation expiry in the prior run coverage.

## Harbor Docker dynamic certification

The repository certifier passed the production bundle in run `186124`. The local evidence is `factory/build/dyn_certify/186124/results.json`.

| Render | Sync | Idle | Hydrate |
| --- | --- | --- | --- |
| Pass | Pass (1 baseline POST) | Pass (0 idle POSTs) | Pass |
Injection reached `flightOptions → 0 → flightNumber`.
