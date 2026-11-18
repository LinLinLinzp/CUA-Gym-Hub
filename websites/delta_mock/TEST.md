# Delta Mock — Test Report

> Round 2 · November 18, 2026  
> Server · http://localhost:5323  
> Tested by · playwright agent

## Summary

| Metric | Count |
| --- | ---: |
| Routes tested (including fallback) | 10 |
| Test groups and findings | 17 |
| ✅ Passed | 14 |
| ❌ Failed | 3 |
| ⚠️ Skipped (out of scope) | 0 |

Every workflow listed in SEED.md passed. The two persistence failures and one design finding below remain open. The run used installed Node Playwright from `PILOT_PLAYWRIGHT` with Chromium and a browser clock fixed at `2026-11-18T15:00:00.000Z`. Functional requests stayed on localhost. `npm run build` passed, and the copied `dataManager.js` matched the repository template by SHA-256.

## ✅ Passing Tests

For each confirmed action, the suite compared `/go?sid=…` before and after submission. It checked the exact changed top-level keys, their `state_diff` entries, and the unchanged `initial_state`. New action and settlement records were checked for identifiers, related IDs, and timestamps as applicable.

| Route and workflow | Result and observed state fields |
| --- | --- |
| `/my-trips` · My Trips and trip lookup | Search found confirmation `H7K2LM` and ATL. Departure sorting, status filters, itinerary details, and case- and whitespace-normalized lookups worked. Ticket `0068000000128` and the corresponding confirmation code matched `trip-028` in separate scenarios. Add to My Trips set `trips[].accountId` and `linkedAt` and appended `tripActions[]` with `id`, `actorId`, `createdAt`, `tripId`, `type=linked`, and `status=completed`. Unmatched and already-linked lookups left state unchanged. |
| `/my-trips/:tripId/change` · Change with residual eCredit | Seattle's outbound segment changed using `offer-seattle-change-01` for December 5. The selected `trips[].segments[]` entry kept its ID, the return segment stayed intact, and `fareAmount` changed from $412.50 to $380.00. `updatedAt` matched the action timestamp. The action fields listed below recorded a $32.50 residual and `eCreditId`. The new `eCredits[]` record held that amount in `originalAmount` and `remainingAmount`, with `source=change`, `sourceTripId`, and `sourceTripActionId`. |
| `/my-trips/:tripId/change` · Change with amount due | Boston changed using `offer-bos-change-01` for December 13. The selected segment, `fareAmount`, and `updatedAt` changed, and no credit was issued. Both changes appended `tripActions[]` with `id`, `actorId`, `createdAt`, `tripId`, `type=changed`, `status=completed`, `segmentId`, `offerId`, `previousSegment`, `replacementSegment`, `oldFareAmount`, `newFareAmount`, `feeAmount`, `amountDue`, `creditAmount`, and `currency`. Boston's fare changed from $395.00 to $460.00, with a $25.00 fee and $90.00 due. Invalid dates, no inventory, an ineligible fare, reload of an unconfirmed review, and reuse of the same offer made no action writes. |
| `/my-trips/:tripId/cancel` · Cancel to eCredit | Seattle produced $362.50 after a $50.00 fee. The trip and action fields listed below changed. The action added `eCreditId`. The new `eCredits[]` record held the settlement in `originalAmount` and `remainingAmount` with `source=cancellation`, `sourceTripId`, and `sourceTripActionId`. The confirmation linked to the wallet while preserving the session ID. |
| `/my-trips/:tripId/cancel` · Cancel to original payment | Denver's action added `refundId`. The new `refunds[]` record had `id`, `actorId`, `createdAt`, `tripId`, `tripActionId`, `status=issued`, `method=original_payment`, `amount=326.75`, and one `lineItems[]` entry with quantity 1 and matching amount. |
| `/my-trips/:tripId/cancel` · Cancel with zero settlement | Los Angeles issued zero credit and refund. All three cancellation paths set `trips[].status=canceled`, `canceledAt`, and `updatedAt`. They appended `tripActions[]` with `id`, `actorId`, `createdAt`, `tripId`, `type=canceled`, `status=completed`, `oldFareAmount`, `feeAmount`, `creditAmount`, `refundAmount`, and `currency`. Canceled itineraries remained readable from My Trips. Abandoned reviews and repeat cancellation attempts made no action writes. |
| `/skymiles` and `/skymiles/request` · SkyMiles and mileage request | Type and dates filtered activity, reversed bounds gave an inline error, and the activity ticket linked to its itinerary. Invalid, unmatched, already-credited, and unflown tickets showed validation. Ticket `0068000000124` on `trip-024` appended `mileageRequests[]` with `id`, `actorId`, `createdAt`, `accountId`, `tripId`, `ticketNumber`, and `status=submitted`. Request history showed its reference. The ledger and balance stayed unchanged, and a repeat request was rejected. |
| `/ecredits` · Wallet lookup and linking | The wallet showed 9 available, 4 expired, and 5 used credits. Unmatched and already-linked lookups made no action writes. Adding `credit-019` (`0068900000029`) set `eCredits[].accountId` and `linkedAt` and appended `eCreditActions[]` with `id`, `actorId`, `createdAt`, `eCreditId`, `type=linked`, and `status=completed`. The newly linked credit was selectable in checkout. |
| `/ecredits/redeem` · Partial redemption | `credit-001` applied $140.00 to `offer-booking-001`. `eCredits[].remainingAmount` became $40.00, `status` stayed `available`, and `updatedAt` changed. The confirmed trip and redemption fields listed below were persisted. |
| `/ecredits/redeem` · Full redemption and booking | The same credit applied its final $40.00 to `offer-booking-002` with $60.00 paid. `eCredits[].remainingAmount` became $0.00, `status` became `used`, and `updatedAt` changed. Each booking appended a confirmed `trips[]` record with `id`, `accountId`, `confirmationCode`, `travelers[]` with traveler and ticket IDs, `segments[]` with a new segment ID, `fareAmount`, `currency`, `purchasedAt`, and `linkedAt`. Each also appended `eCreditActions[]` with `id`, `actorId`, `createdAt`, `eCreditId`, `tripId`, `offerId`, `type=redeemed`, `status=completed`, `fareAmount`, `appliedAmount`, `remainingAmount`, `amountPaid`, and `currency`. Both confirmations linked to the new itinerary. Expired and exhausted credits were unavailable, and empty flight searches made no action writes. |
| Read-only controls and navigation | Keyboard skip link, wordmark, active rail state, dialog close and Escape with focus restoration, list-row itinerary, date shortcuts, return from reviews, and wallet confirmation link responded. Internal navigation and hard reload preserved the session. Filters, previews, and abandoned reviews left `state_diff` empty. |
| Harbor endpoints and write cadence | `/post` verified `set`, `set_current`, and `reset`. `/state` returned the stored snapshot, and `/go` showed independent sessions and the expected diff. Fresh sessions posted one baseline, confirmed actions posted one update, and cached reload, same-context second tab, 1.5 seconds of idle time, and validation failures posted no additional writes. A stale change review in a second tab of the same context did not record a duplicate. |
| Injected worlds and deep links | Empty collections rendered all entry and action routes, and singleton records rendered with missing optional metadata. Chromium rendered 320 populated trip, credit, and mileage rows. Trip linking preserved the injected extra key and unrelated records. The standard suite reported no uncaught page or console errors. |
| Responsive route checks | Eight populated route views had no horizontal overflow at widths of 390, 620, 768, 1024, and 1440px. Desktop and mobile screenshots were reviewed against the site's original design spec. |

## ❌ Bugs for Dev Agent

### BUG-001 · P0 · A stale browser context overwrites a confirmed action

| Field | Value |
| --- | --- |
| Route | `/my-trips/:tripId/cancel` |
| Element | Confirm cancellation |
| Action | Open Seattle and Denver cancellation reviews in separate Chromium contexts sharing one fresh `sid`. Confirm Seattle and wait for its POST acknowledgment. Confirm Denver. |
| Expected | Both successful actions are retained in `/go`, with their respective credit and refund. |
| Actual | Both contexts displayed success. `/go` retained only Denver's cancellation and refund. Seattle had reverted to `confirmed`, and its cancellation credit was gone. |
| Console errors | No uncaught browser error in the standard workflow suite. |
| Fix hint | Revalidate and apply each change against authoritative session state before persisting it. Verify concurrent writes as well as sequential stale reviews. |

### BUG-002 · P0 · An interrupted write displays a successful cancellation

| Field | Value |
| --- | --- |
| Route | `/my-trips/trip-den/cancel` |
| Element | Confirm cancellation |
| Action | Let the baseline POST succeed, abort the next `/post` request, confirm, and reload. |
| Expected | A recoverable save error keeps the business action retryable. |
| Actual | The UI displayed Trip canceled. The cancellation route showed Cancellation unavailable after reload from the browser cache. `/go` retained Denver as `confirmed` with zero cancellation actions and refunds. |
| Console errors | Chromium recorded the intentionally aborted request. |
| Fix hint | Gate confirmation on acknowledged persistence and reconcile the cached state after an unsuccessful write. Keep the required template files unchanged. |

## Visual Alignment Feedback

### VISUAL-001 · P2 · Intermediate layouts and inline link size differ from the design

| Field | Value |
| --- | --- |
| Views | Trip detail, SkyMiles, and cancellation confirmation |
| Reference | [Original site design spec](DESIGN.md) |
| Observed | The detail sidebar was 260px at 768 and 1024px. Detail cards stacked at 620px. The metrics measured 26px, and the wallet link measured 20px in height. |
| Expected | The design specifies a 300px detail sidebar, stacks below 600px, 28px metrics, and 44px minimum control height. |

## Round History

### Round 1 → Round 2

- All standard workflows passed again with exact top-level diff checks and additional coverage of links, date controls, and intermediate widths.
- AUDIT-001 and AUDIT-002 were reproduced as BUG-001 and BUG-002. AUDIT-003 remains open as VISUAL-001.
- The parent runner owns Docker certification and commits.

WORKFLOWS: PASS

## Harbor Docker dynamic certification

The repository certifier passed the production bundle in run `123512`. The local evidence is `factory/build/dyn_certify/123512/results.json`.

| Render | Sync | Idle | Hydrate |
| --- | --- | --- | --- |
| Pass | Pass (1 baseline POST) | Pass (0 idle POSTs) | Pass |
Injection reached `trips → 0 → accountId`.
