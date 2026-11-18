# United Airlines Mock Schema

**Base URL** `http://localhost:5322/`  
**Go Endpoint** `GET /go?sid=<sid>` returns `{initial_state, current_state, state_diff}`.  
**Inject** `POST /post?sid=<sid>` with `{"action":"set","state":{...}}`.  
**Reset** `POST /post?sid=<sid>` with `{"action":"reset"}` restores the session's initial snapshot.

## State Schema

State is plain JSON. IDs, codes, names, timestamps, dates and status values are strings. Timestamps are ISO instants and credit expiry is a local calendar date in `YYYY-MM-DD` format. Money is numeric USD. Only confirmed business actions persist. Airport-local display time, current credit eligibility, list controls and forms are derived or kept in component state.

| Top-level key | Record shape |
| --- | --- |
| `account` | `{ id, firstName, lastName }` |
| `mileagePlus` | `{ memberId, tier, awardMiles, pqp, pqf }`. Balances and counters are integers. |
| `flightOptions[]` | `{ id, flightNumber, origin: Airport, destination: Airport, departureLocalTime, arrivalLocalTime, arrivalDayOffset, cabin, fareClass, seats: Seat[], baseFare, taxes, milesFare }`. Times are airport-local `HH:mm`. Offset and miles fare are integers. |
| `bookings[]` | `{ id, accountId, confirmationCode, status, passengers: Passenger[], segments: Segment[], payment: Payment, actorId, createdAt, cancelledAt? }`. Status is `confirmed`, `completed` or `cancelled`. |
| `bookingEvents[]` | `{ id, bookingId, type, status, amount, currency, passengerCount, chargeCreditId?, issuedCreditId?, actorId, createdAt }`. Type is `booked` or `cancelled`. Status is `confirmed` or `cancelled`. Amount is booked cash due or cancellation credit issued. |
| `seatChanges[]` | `{ id, bookingId, segmentId, passengerId, previousSeat, newSeat, cabin, fee, currency, status, actorId, createdAt }`. Previous seat can be null. Status is `confirmed`. |
| `mileageActivity[]` | `{ id, memberId, type, label, miles, pqp, pqf, status, bookingId?, segmentId?, actorId, createdAt }`. Type is `flight`, `partner`, `bonus` or `redemption`. Status is `posted`. Miles are signed integers. |
| `mileageRequests[]` | `{ id, memberId, bookingId, segmentId, passengerId, ticketNumber, status, actorId, createdAt }`. Status is `submitted`, `approved` or `declined`. The UI creates `submitted` requests. |
| `travelCredits[]` | `{ id, code, type, accountId, ownerName, sourceBookingId?, originalAmount, remainingAmount, currency, expiresOn, status, actorId, createdAt }`. Type is `future_flight_credit` or `electronic_travel_certificate`. Status is `available`, `used` or `expired`. |
| `creditRedemptions[]` | `{ id, creditId, bookingId, amount, previousBalance, remainingBalance, currency, status, actorId, createdAt }`. Status is `applied`. |

- `Airport` is `{ code, city, timeZone }`. The time zone is an IANA identifier.
- `Seat` is `{ label, position, cabin, fee, occupied }`. Position is `window`, `middle` or `aisle`. Occupied is boolean.
- `Passenger` is `{ id, firstName, lastName, ticketNumber? }`. Ticket numbers are strings and retain leading zeroes. Trip details display them under Travelers when present.
- `Segment` is `{ id, flightOptionId?, flightNumber, origin: Airport, destination: Airport, departureAt, arrivalAt, cabin, fareClass, seats: Seat[], seatAssignments }`. Assignments map passenger IDs to seat labels. A segment stores its own airport, inventory and assignment snapshots.
- `Payment` is `{ method, currency, baseFare, taxes, totalAmount, cashAmount, milesUsed, creditAmount, creditId? }`. Method is `cash`, `miles` or `cash_and_credit`. For miles, USD base fare is zero and cash due is the tax. Currency is `USD`.

### Default IDs

- Account `acct-001`, MileagePlus member `AM480271`.
- Flights `flt-001` through `flt-036`, bookings `bkg-001` through `bkg-036`, segments `seg-001` through `seg-037`, and travelers `pax-001` through `pax-037`.
- Booking events `evt-001` through `evt-040`, mileage activity `mp-act-001` through `mp-act-048`, and credits `cr-001` through `cr-028`.
- Historical records `seat-001`, `mp-req-001`, and `cr-use-001`.

## Minimal Inject Example

The empty arrays replace the corresponding seeded collections. Unspecified account and membership fields use their defaults.

```json
{
  "bookings": [],
  "bookingEvents": [],
  "flightOptions": [],
  "seatChanges": [],
  "mileageActivity": [],
  "mileageRequests": [],
  "travelCredits": [],
  "creditRedemptions": []
}
```

## Observable State Changes (for LLM evaluation)

The Harbor plugin serves JSON at `/go?sid=…`. Its `state_diff` groups changes by top-level key. The following fields change together for each action.

| User action | Top-level keys and changes |
| --- | --- |
| Confirm cash booking | Append a confirmed record to `bookings[]` with confirmation, passengers, segments, cash payment, actor and timestamp. Append a linked `bookingEvents[]` row with `type: booked`, `status: confirmed`, USD cash amount and passenger count. |
| Confirm cancellation | Set `bookings[].status = cancelled` and `cancelledAt`. Append a `bookingEvents[]` cancellation with the issued amount and `issuedCreditId`. Append a linked `travelCredits[]` future flight credit with the full cash amount as both original and remaining amount, available status, owner and expiry one calendar year after cancellation. |
| Confirm seat change | Set the matching segment's `seatAssignments[passengerId]`. Append `seatChanges[]` with booking, segment, passenger, previous and new labels, fee, cabin, currency, status, actor and timestamp. |
| Submit missing miles | Append `mileageRequests[]` with member, booking, segment, passenger, validated ticket number, submitted status, actor and timestamp. |
| Confirm award booking | Append booking and booked event with the cash tax amount and miles used on the payment. Decrease `mileagePlus.awardMiles` and append a linked `mileageActivity[]` posted redemption with negative miles and zero qualifying points and flights. |
| Confirm booking with credit | Append booking and booked event with credit and booking links. Set the credit's remaining amount and its status to `used` at zero or `available` after partial use. Append a `creditRedemptions[]` row with amount, previous balance, remaining balance, links, actor and timestamp. |

Trip and ticket views, searches, filters, review drafts, rejected submissions and idle views leave current state unchanged. Boot with an uncached session loads and publishes the merged baseline as specified by the shared state manager.
