# delta_mock Schema

**Base URL** `http://localhost:5323/`  
**Go Endpoint** `GET /go?sid=<sid>` → `{initial_state, current_state, state_diff}`  
**Inject** `POST /post?sid=<sid>` with `{"action":"set","state":{...}}`  
**Reset** `POST /post?sid=<sid>` with `{"action":"reset"}`

Use a fresh session ID for each injected world. A new browser session loads injected state over the deterministic fixtures, replacing arrays and recursively merging objects. Reset restores the server's current state from its initial snapshot or the defaults. The fixtures are anchored to November 18, 2026. Departure eligibility and credit expiration use the browser clock. Searches, filters, drafts and confirmation screens live outside persisted state.

IDs and ticket or eCredit numbers are strings. Amounts use decimal USD numbers in the fixtures. USD arithmetic uses integer cents. Action timestamps use UTC ISO strings. Airport departure and arrival values preserve local offsets. Calendar dates use `YYYY-MM-DD`.

## State Schema

| Key | Default | Record fields |
| --- | --- | --- |
| `account` | Avery Morgan | `id`, `firstName`, `lastName`, `skyMilesNumber`, `memberSince`, `tier`, `milesBalance`, `mqds`, `nextTier`, `nextTierMqdTarget`. |
| `trips` | 30 trips | `id`, `accountId` (nullable), `confirmationCode`, `status` (`confirmed`, `completed`, `canceled`), `travelers`, `segments`, `fareName`, `fareAmount`, `currency`, `purchasedAt`, `changeAllowed`, `changeFee`, `cancellationAllowed`, `cancellationFee`, `refundType` (`ecredit`, `original_payment`), optional `linkedAt`, `updatedAt`, `canceledAt`. |
| `flightOffers` | 48 offers | `id`, `type` (`change`, `booking`), `segment`, `fareAmount`, `currency`. Change offers have `tripId` and `segmentId`. The fare is the new booking total. |
| `eCredits` | 24 credits | `id`, `number`, `accountId` (nullable), `holderFirstName`, `holderLastName`, `source` (`change`, `cancellation`, `travel_credit`), `originalAmount`, `remainingAmount`, `currency`, `status` (`available`, `used`, `expired`), `expiresOn`, `createdAt`, `actorId`, optional `sourceTripId`, `sourceTripActionId`, `linkedAt`, `updatedAt`. |
| `mileageActivity` | 36 ledger entries | `id`, `accountId`, `type` (`flight`, `partner`, `redemption`, `adjustment`), `description`, `activityOn`, signed `miles`, signed `mqds`, optional `tripId`, `ticketNumber`. |
| `mileageRequests` | Empty | Event fields plus `accountId`, `tripId`, `ticketNumber`, `status` (`submitted`). |
| `tripActions` | Empty | Event fields plus `tripId`, `type` (`linked`, `changed`, `canceled`), `status` (`completed`) and settlement fields listed below. |
| `eCreditActions` | Empty | Event fields plus `eCreditId`, `type` (`linked`, `redeemed`), `status` (`completed`) and redemption fields listed below. |
| `refunds` | Empty | Event fields plus `tripId`, `tripActionId`, `status` (`issued`), `method` (`original_payment`), `amount`, `currency`, `lineItems` (`tripId`, `description`, `quantity`, `amount`). |

- **Traveler** has `id`, `firstName`, `lastName`, `ticketNumber` and optional `seat`.
- **Segment** has `id`, `flightNumber`, `origin`, `originCity`, `destination`, `destinationCity`, `departureAt`, `arrivalAt` and optional `durationMinutes`.
- **Event fields** are `id`, `actorId` (the account ID) and `createdAt` from the browser clock.

### Default IDs

| Entity | IDs |
| --- | --- |
| Account | `acct-avery` |
| Upcoming trips | `trip-seattle`, `trip-bos`, `trip-den`, `trip-lax`, `trip-jfk`, `trip-mia`, `trip-msp`, `trip-slc`, `trip-dca`, `trip-sfo`, `trip-aus`, `trip-dtw` |
| Past, canceled and lookup trips | `trip-013` through `trip-024` (past), `trip-025` through `trip-027` (canceled), `trip-028` through `trip-030` (lookup only) |
| Change inventory | `offer-<upcoming-trip-suffix>-change-01` and `offer-<upcoming-trip-suffix>-change-02` for each upcoming trip. The Seattle outbound segment is `seg-seattle-out`. |
| Booking inventory | `offer-booking-001` through `offer-booking-024` |
| eCredits | `credit-001` through `credit-024`. Credits `credit-019` through `credit-024` are lookup only. |
| Mileage activity | `miles-001` through `miles-036`. Ticket `0068000000124` on `trip-024` is eligible for a mileage request. |

## Minimal Inject Example

The default account remains available. This example supplies empty trip, flight, wallet and mileage collections.

```json
{
  "action": "set",
  "state": {
    "trips": [],
    "flightOffers": [],
    "eCredits": [],
    "mileageActivity": [],
    "mileageRequests": [],
    "tripActions": [],
    "eCreditActions": [],
    "refunds": []
  }
}
```

## Observable State Changes

Each confirmed action attempts one full `set_current` snapshot. Account totals and mileage activity are read directly from their stored records. A credit displayed as expired due to its calendar date keeps its stored status. See [AUDIT.md](AUDIT.md) for persistence failure cases.

| User action | Exact fields written |
| --- | --- |
| Add to My Trips | Sets the matching `trips[].accountId` and `linkedAt`. Appends a `tripActions[]` event with `tripId`, `type=linked`, `status=completed`. |
| Confirm flight change | Replaces the selected `trips[].segments[]` entry using its original ID. Sets the trip’s `fareAmount` and `updatedAt`. Appends a `tripActions[]` event with `tripId`, `type=changed`, `status=completed`, `offerId`, `segmentId`, `previousSegment`, `replacementSegment`, `oldFareAmount`, `newFareAmount`, `feeAmount`, `amountDue`, `creditAmount`, `currency`. A positive residual adds `eCreditId` to the action and appends an account-linked `eCredits[]` record with `source=change`, `sourceTripId`, `sourceTripActionId` and both amounts set to the credit value. |
| Confirm cancellation | Sets `trips[].status=canceled`, `canceledAt`, `updatedAt`. Appends a `tripActions[]` event with `tripId`, `type=canceled`, `status=completed`, `oldFareAmount`, `feeAmount`, `refundAmount`, `creditAmount`, `currency`. Positive credit adds `eCreditId` and appends an account-linked credit with `source=cancellation`, `sourceTripId`, `sourceTripActionId` and both amounts set to the settlement value. Positive refund adds `refundId` and appends a `refunds[]` record with one booking line of quantity 1. |
| Submit mileage request | Appends a `mileageRequests[]` event with `accountId`, `tripId`, `ticketNumber`, `status=submitted`. |
| Add to wallet | Sets the matching `eCredits[].accountId` and `linkedAt`. Appends an `eCreditActions[]` event with `eCreditId`, `type=linked`, `status=completed`. |
| Confirm eCredit booking | Appends a confirmed `trips[]` record with a new confirmation, ticket, segment and traveler IDs and an account association. Updates `eCredits[].remainingAmount`, `status` (`available` or `used`) and `updatedAt`. Appends an `eCreditActions[]` event with `eCreditId`, `tripId`, `offerId`, `type=redeemed`, `status=completed`, `fareAmount`, `appliedAmount`, `remainingAmount`, `amountPaid`, `currency`. |

Issued change and cancellation credits expire after one year from the original purchase date. When a trip lacks a valid purchase date, issuance supplies the calendar date for calculating expiry. A zero-value cancellation records only the trip and its cancellation event. Unknown injected top-level keys are retained in each snapshot.
