# Proposed Harbor state model

Use plain JSON. Field types described below are the canonical persisted shape. Use USD with numeric values rounded to two decimal places and calculate totals in integer cents. Store timestamps as ISO strings and calendar dates as `YYYY-MM-DD`. New records use unique IDs and timestamps from `new Date().toISOString()`. Use the signed-in account ID for `actorId`; seeded automated or partner activity may use a fixed actor such as `partner-activity`. Optional values may be absent. Render read-only fallbacks when missing data makes a mutation unsafe.

## Member and inventory

| Top-level key | Shape and examples |
| --- | --- |
| `account` | `{ id: string, firstName: string, lastName: string }`, for example `acct-001`, Avery, Morgan. |
| `mileagePlus` | `{ memberId: string, tier: string, awardMiles: integer, pqp: integer, pqf: integer }`, for example `AM480271`, Premier Silver, `58420`, `3520`, `14`. Use award miles as the spendable balance. |
| `flightOptions[]` | `{ id: string, flightNumber: string, origin: Airport, destination: Airport, departureLocalTime: string, arrivalLocalTime: string, arrivalDayOffset: integer, cabin: string, fareClass: string, seats: Seat[], baseFare: number, taxes: number, milesFare: integer }`. Example `flt-012`, UA 2175, ORD → SFO, `09:15` → `11:56`, day offset `0`, Economy, Standard Economy, `249.00` plus `18.60` or `22000` miles plus `18.60`. Model options as repeatable local schedules and capture the selected travel date when booked. |

- `Airport` has `code: string`, `city: string`, and `timeZone: string` (IANA), such as `ORD`, Chicago, `America/Chicago`.
- `Seat` has `label: string`, `position: window | middle | aisle`, `cabin: string`, `fee: number`, and `occupied: boolean`. Example `18A`, `window`, Economy, `0`, `false`. Occupied marks inventory unavailable apart from the reservation's own assignments. The same label in another segment is a separate seat.

## Trips and seat changes

| Top-level key | Shape and examples |
| --- | --- |
| `bookings[]` | `{ id, accountId, confirmationCode, status, passengers: Passenger[], segments: Segment[], payment: Payment, actorId, createdAt, cancelledAt? }`. IDs, confirmation, and timestamps are strings. Example `bkg-001`, `acct-001`, `G7H2QK`, `confirmed`. Allowed stored statuses are `confirmed`, `completed` and `cancelled`. |
| `bookingEvents[]` | `{ id, bookingId, type: booked | cancelled, status: confirmed | cancelled, amount: number, currency: "USD", passengerCount: integer, chargeCreditId?, issuedCreditId?, actorId, createdAt }`. Example `evt-001` for `bkg-001`, `booked`, `confirmed`, `267.60`, one passenger. Use charged USD for `booked` and credit issued for `cancelled`. |
| `seatChanges[]` | `{ id, bookingId, segmentId, passengerId, previousSeat: string | null, newSeat: string, cabin: string, fee: number, currency: "USD", status: confirmed, actorId, createdAt }`. Example `seat-001`, `bkg-001`, `seg-001`, `pax-001`, `18A` → `21C`, Economy, `0`. |

- `Passenger` has `id`, `firstName`, `lastName`, and optional `ticketNumber` strings. Example `pax-001`, Avery Morgan, `0160000000412`. Ticket numbers are synthetic strings and retain leading zeroes.
- `Segment` has `id`, optional `flightOptionId`, `flightNumber`, `origin: Airport`, `destination: Airport`, `departureAt`, `arrivalAt`, `cabin`, `fareClass`, `seats: Seat[]`, and `seatAssignments: Record<passengerId, seatLabel>`. Example `seg-001`, `flt-012`, UA 2175 with `{ "pax-001": "18A" }`. Treat segment identity and airport-local departure time as part of the booking snapshot.
- `Payment` has `method: cash | miles | cash_and_credit`, `currency: "USD"`, `baseFare: number`, `taxes: number`, `totalAmount: number`, `cashAmount: number`, `milesUsed: integer`, `creditAmount: number`, and optional `creditId: string`. Example cash and credit payment of `267.60` with `100.00` credit, `167.60` cash and zero miles. For award travel set USD base fare to zero and record the USD tax and award miles separately. Seat changes keep their fees on the seat-change record.

## Mileage and credits

| Top-level key | Shape and examples |
| --- | --- |
| `mileageActivity[]` | `{ id, memberId, type: flight | partner | bonus | redemption, label: string, miles: integer, pqp: integer, pqf: integer, status: posted, bookingId?, segmentId?, actorId, createdAt }`. Example `mp-act-001`, `AM480271`, flight, Chicago to San Francisco, `1250` miles, `250` PQP and `1` PQF. Redemption miles are negative and qualifying counters are zero on a redemption. |
| `mileageRequests[]` | `{ id, memberId, bookingId, segmentId, passengerId, ticketNumber: string, status: submitted | approved | declined, actorId, createdAt }`. Example `mp-req-001`, `AM480271`, `bkg-015`, `seg-015`, `pax-015`, `0160000000412`, `submitted`. Use member, booking and segment to identify duplicate submissions. Only new submissions are written by the UI. |
| `travelCredits[]` | `{ id, code: string, type: future_flight_credit | electronic_travel_certificate, accountId, ownerName: string, sourceBookingId?, originalAmount: number, remainingAmount: number, currency: "USD", expiresOn, status: available | used | expired, actorId, createdAt }`. Example `cr-001`, `FFC-318207`, Avery Morgan, `350.00` original, `300.00` remaining. Derive date-based expiry for display and validation using the current clock. Preserve an explicit expired or used status from injected data. |
| `creditRedemptions[]` | `{ id, creditId, bookingId, amount: number, previousBalance: number, remainingBalance: number, currency: "USD", status: applied, actorId, createdAt }`. Example `cr-use-001`, `cr-001`, `bkg-037`, `200.00` applied, `300.00` previously available and `100.00` remaining. |

## Initial data and relationships

- `createInitialData()` returns the ten top-level keys listed above. Use fixed IDs, stable ordering and consistent USD totals. Seed 36 bookings (12 future confirmed, 20 completed, 4 cancelled), 36 options over at least eight routes with return directions, 48 activity rows across earned and redeemed types, and 28 credits with both credit types and all three display states. Seed linked event examples, historical seat changes, requests and redemptions. Give past activity a broad enough date range to make sorting meaningful.
- Use a fixed fixture timeline with future confirmed departures and credit expirations relative to the build date. Run date-bound tests with an explicit browser clock if needed and derive usability from the current clock in the app. Generate available booking dates from the local schedule and chosen date in the form. Use local airport time in the UI and chronological instants for eligibility and sorting.
- A booking contains passenger and segment snapshots. One seat change links one booking, segment and passenger. Persist the previous and new assignments and guard against seats assigned to another passenger. Round-trip and party fixtures should make these relationships testable.
- Award booking updates booking, event, mileage balance and mileage ledger together. A credit can reference the cancellation that issued it and can have several later redemptions across bookings. Each redemption links back to its target booking and changes the remaining amount exactly once.
- For the synthetic cancellation workflow, issue one future flight credit for the full confirmed cash payment. Give it the current account as owner, a unique code, the cancelled booking ID and an expiry one calendar year after the cancellation date. For redemption require the matching account and, for a future flight credit, a traveler whose name matches its owner. Treat the expiry date as inclusive through the end of that local calendar day. Write `used` at zero balance and keep `available` after partial use. Time passing by itself leaves stored records intact.
- Seed a completed trip with a valid ticket, no mileage ledger entry and no prior request, plus a similar trip with already-posted activity. Seed one multi-passenger return trip with free seats, one constrained cabin, and credits of `100.00` and `350.00` usable against a `267.60` itinerary.
