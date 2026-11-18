# opentable_mock Schema

**Base URL**: `http://localhost:5318/`  
**Go Endpoint**: `GET /go?sid=<sid>` → `{initial_state, current_state, state_diff}`  
**Inject**: `POST /post?sid=<sid>` with body `{"action":"set","state":{...}}`  
**Reset**: `POST /post?sid=<sid>` with body `{"action":"reset"}`

The app key is `opentable`. Read `GET /go?sid=SESSION` for `initial_state`, `current_state`, and the template’s top-level `state_diff`. `GET /state?sid=SESSION` returns `stored_state`. All records use string identifiers. Timestamps are UTC ISO strings, money is numeric, and points and party sizes are integers.

## State Schema

| Key | Type | Description |
| --- | --- | --- |
| `account` | object | `id`, `firstName`, `lastName`, `email`, `city`, `timeZone`. The signed-in diner’s `id` owns account records through `actorId`. |
| `restaurants` | array | `id`, `name`, `cuisine`, `neighborhood`, `address`, `city`, `timeZone`, `priceTier`, `description`, optional local `image`, and `slots[]`. Each slot has `time` (local HH:mm), `maxPartySize`, `seating`, and `potentialPoints`. |
| `reservations` | array | `id`, `restaurantId`, `actorId`, `confirmationCode`, `date` (restaurant-local YYYY-MM-DD), `time` (restaurant-local HH:mm), `partySize`, `seating`, `occasion`, `specialRequest`, `status` (`confirmed`, `completed`, `canceled`), `potentialPoints`, `createdAt`, `updatedAt`, and `canceledAt` on cancellation. Empty request and occasion fields are stored as empty strings on new bookings and edits. |
| `reservationEvents` | array | `id`, `reservationId`, `actorId`, `type` (`booked`, `modified`, `canceled`), `before`, `after`, `createdAt`. A snapshot contains `date`, `time`, `partySize`, `seating`, `occasion`, `specialRequest`, `status`, and `potentialPoints`. `before` is null for a booking. |
| `reviews` | array | `id`, `reservationId`, `restaurantId`, `actorId`, `overall`, optional `food`, `service`, `ambience`, `value`, `comment`, `status: submitted`, `createdAt`. Ratings are integers from 1 through 5. `comment` is trimmed, has a maximum of 1,000 characters, and defaults to an empty string. |
| `rewardOptions` | array | `id`, `name`, `pointsCost`, `amount`, `currency`. |
| `pointTransactions` | array | `id`, `actorId`, `type` (`earned` or `redeemed`), signed `points`, `reservationId` for earnings or `redemptionId` for redemptions, `status: posted`, `createdAt`. |
| `pointRedemptions` | array | `id`, `actorId`, `rewardOptionId`, `pointsSpent`, `amount`, `currency`, `status: issued`, `createdAt`. |

### Default IDs

- Account `diner-001` and restaurants `rest-001` through `rest-032`.
- Reservations `res-001` through `res-040`. `res-001` through `res-005` start confirmed, `res-006` through `res-037` completed, and `res-038` through `res-040` canceled.
- Reservation events `evt-001` through `evt-040` and `evt-078` through `evt-080`. Reviews `rev-001` through `rev-024` cover `res-014` through `res-037`.
- Rewards `reward-dining-16` and `reward-dining-40`, ledger entries `pts-001` through `pts-025`, and issued credit `redeem-001`.

## Minimal Inject Example

The following empty account view replaces each array and retains the default diner.

```json
{"restaurants": [], "reservations": [], "reservationEvents": [], "reviews": [], "rewardOptions": [], "pointTransactions": [], "pointRedemptions": []}
```

## Observable State Changes (for LLM evaluation)

| User action | Observable fields in `current_state` |
| --- | --- |
| Confirm reservation | Append a `reservations[]` record with the fields listed above, `status: confirmed`, and equal `createdAt` and `updatedAt`. Append one `reservationEvents[]` record with `type: booked`, the new `reservationId` and `actorId`, `before: null`, `after` equal to the new snapshot, and matching `createdAt`. |
| Save a changed reservation | Update the matching `reservations[]` record’s `date`, `time`, `partySize`, `seating`, `occasion`, `specialRequest`, and `potentialPoints` as applicable, and write `updatedAt`. Append one `reservationEvents[]` record with `type: modified`, the same `reservationId` and `actorId`, changed `before` and `after` snapshots, and `createdAt` matching `updatedAt`. |
| Confirm cancellation | Update the same reservation’s `status: canceled`, `potentialPoints: 0`, and equal `canceledAt` and `updatedAt`. Append one `reservationEvents[]` record with `type: canceled`, the same `reservationId` and `actorId`, both snapshots, and `createdAt` matching `canceledAt`. |
| Submit review | Append one `reviews[]` record with the fields above, linked to the actor’s completed `reservationId` and its `restaurantId`. |
| Confirm dining-credit redemption | Append one `pointRedemptions[]` record with the fields above, copying the selected option’s cost, amount and currency. In the same write, append one `pointTransactions[]` record with `type: redeemed`, `points: -pointsSpent`, matching `actorId`, new `redemptionId`, `status: posted`, and matching `createdAt`. |
| Navigate, search, filter, open or dismiss a draft, save an unchanged reservation, reject invalid input, or export a calendar file | No business fields are written. |

Spendable points sum posted transactions belonging to the signed-in diner. Pending points sum `potentialPoints` on their future confirmed reservations. The app builds date comparisons from the current clock and each restaurant’s time zone. The Harbor template handles baseline synchronization and session-scoped persistence.
