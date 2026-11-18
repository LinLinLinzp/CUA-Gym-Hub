# Delta account data model

Use plain JSON. Monetary values are USD numbers with two-decimal precision. Compute in integer cents, then convert back to numbers. IDs and ticket numbers are strings. Event timestamps are UTC ISO strings. Calendar fields use YYYY-MM-DD. Seed examples below are synthetic.

## Top-level state

| Key | Shape | Seed |
| --- | --- | --- |
| `account` | Account | One pre-signed-in member |
| `trips` | Trip[] | 30 trips |
| `flightOffers` | FlightOffer[] | 48 options |
| `eCredits` | ECredit[] | 24 credits |
| `mileageActivity` | MileageActivity[] | 36 events |
| `mileageRequests` | MileageRequest[] | Empty initially |
| `tripActions` | TripAction[] | Empty initially |
| `eCreditActions` | ECreditAction[] | Empty initially |
| `refunds` | Refund[] | Empty initially |

`createInitialData()` returns fresh values for all nine keys. Keep record IDs fixed across invocations. Use local finite fixture arrays and deterministic generation for repeated dates and routes. Seed around a documented November 18, 2026 fixture reference with future dates extending into 2028. Tests select a clock within the seed window or use explicit injected fixtures. Live relative dates use `new Date()`. Infer expired credits and departed trips at render time without writing state.

## Account and travel

Each row gives the required default record fields and example values. Nullable keys can be absent in injected records. Render partial records with sensible fallbacks and require valid inputs before submitting actions that depend on those fields.

| Entity | Fields and examples |
| --- | --- |
| Account | `id` string `acct-avery`, `firstName` string `Avery`, `lastName` string `Morgan`, `skyMilesNumber` string `9000000184`, `memberSince` integer `2018`, `tier` string `Silver Medallion`, `milesBalance` integer `48620`, `mqds` number `6420`, `nextTier` string `Gold Medallion`, `nextTierMqdTarget` number `10000`. |
| Trip | `id` string `trip-seattle`, `accountId` string or null, `confirmationCode` string `H7K2LM`, `status` enum `confirmed\|completed\|canceled`, `travelers` Traveler[], `segments` Segment[], `fareName` string `Delta Main Classic`, `fareAmount` number `412.50`, `currency` string `USD`, `purchasedAt` ISO timestamp, `changeAllowed` boolean, `changeFee` number `0`, `cancellationAllowed` boolean, `cancellationFee` number `0`, `refundType` enum `ecredit\|original_payment`, optional `linkedAt`, `updatedAt`, `canceledAt` ISO timestamps. Fare and fees are booking totals. |
| Traveler | `id` string `traveler-avery`, `firstName` string `Avery`, `lastName` string `Morgan`, `ticketNumber` string `0068000000101`, optional `seat` string `14A`. Mileage claims match ticket plus member name. Wallet redemption books one traveler. |
| Segment | `id` string `seg-seattle-out`, `flightNumber` string `DL 442`, `origin` string `ATL`, `originCity` string `Atlanta`, `destination` string `SEA`, `destinationCity` string `Seattle`, `departureAt` and `arrivalAt` ISO timestamps with explicit airport offsets, optional `durationMinutes` integer `338`. Render airport-local time from those offsets. |
| FlightOffer | `id` string `offer-seattle-change-01`, `type` enum `change\|booking`, `segment` Segment, `currency` string `USD`, `fareAmount` number `380.00` representing the new booking total, optional `tripId` and `segmentId` strings required for change offers. |

Account lists use `accountId` to scope displayed trips. Canceled status takes precedence over dates. Completed and fully departed trips appear in Past. Determine upcoming trips from valid future departures. Gate servicing to confirmed, linked trips before first departure, using the trip's eligibility fields. Match change offers on trip, segment, route and departure date. Maintain departure and arrival order for multi-segment trips. Keep the segment ID stable while replacing its flight details.

## Wallet and mileage

| Entity | Fields and examples |
| --- | --- |
| ECredit | `id` string `credit-001`, `number` string `0068900000011`, `accountId` string or null, `holderFirstName` string `Avery`, `holderLastName` string `Morgan`, `source` enum `cancellation\|change\|travel_credit`, optional `sourceTripId` and `sourceTripActionId` strings, `originalAmount` number `180.00`, `remainingAmount` number `180.00`, `currency` string `USD`, `status` enum `available\|used\|expired`, `expiresOn` date `2027-08-15`, `createdAt` ISO timestamp, `actorId` string, optional `linkedAt` and `updatedAt` ISO timestamps. |
| MileageActivity | `id` string `miles-001`, `accountId` string, `type` enum `flight\|partner\|redemption\|adjustment`, `description` string `Atlanta to Boston`, `activityOn` date `2026-10-04`, `miles` signed integer `1240`, `mqds` signed number `248`, optional `tripId` and `ticketNumber` strings. |
| MileageRequest | `id` string `mileage-request-…`, `actorId` string, `accountId` string, `tripId` string, `ticketNumber` string, `status` `submitted`, `createdAt` ISO timestamp. |

An eCredit that reaches zero is used. An otherwise available credit with `expiresOn` before the browser's current local calendar date is displayed as expired and rejected at checkout. Match credits using number plus both holder names. Show only linked credits in the wallet. Mileage activity uses signed values. The displayed balance comes from the account snapshot, which includes activity preceding the visible ledger. A claim requires a completed Delta ticket for the member and rejects a ticket found in credited flight activity or existing requests. Use local validation and keep newly filed requests pending indefinitely.

## Action and refund records

All event records have a unique string `id`, string `actorId` referencing the account, and `createdAt` from `new Date().toISOString()`. Use client-generated IDs for new records. Synthetic ticket, confirmation and credit number generation must avoid duplicates in the current state.

| Entity | Additional fields and examples |
| --- | --- |
| TripAction | `tripId` string, `type` enum `linked\|changed\|canceled`, `status` `completed`. Changed records include `offerId`, `segmentId`, `previousSegment`, `replacementSegment`, `oldFareAmount`, `newFareAmount`, `feeAmount`, `amountDue`, `creditAmount`, `currency` and optional `eCreditId`. Canceled records include `oldFareAmount`, `feeAmount`, `creditAmount`, `refundAmount`, `currency`, and optional `eCreditId` or `refundId`. |
| ECreditAction | `eCreditId` string, `type` enum `linked\|redeemed`, `status` `completed`. Redeemed records also carry `tripId`, `offerId`, `fareAmount`, `appliedAmount`, `remainingAmount`, `amountPaid`, and `currency`. |
| Refund | `tripId` and `tripActionId` strings, `status` `issued`, `method` `original_payment`, `amount` number, `currency` string, `lineItems` array with one item per applicable ticket when amounts are available, or one booking item with `tripId`, `description` string `Unused booking value`, `quantity` integer `1`, and `amount` matching the refund total. |

## Settlement examples

- Change a $412.50 trip to $380.00 with zero fee. Record $32.50 residual as a new eCredit. A $460.00 option with a $25.00 fee instead produces $72.50 due. Use `new fare − old fare + fee` for the net. Split it into the nonnegative due and credit amounts.
- Cancellation of a $412.50 ticket with a $50.00 fee settles $362.50 using the fare's `refundType`. If the fee consumes the value, settle zero and write the trip and cancellation event only.
- A voluntary cancellation or change residual expires one year from the original ticket date in these fixtures. Store the date on issuance. Keep a source trip and action reference on each credit created. Seed paid and linked credit examples with enough remaining validity to exercise the flow.
- Applying $180.00 to a $140.00 offer leaves $40.00 available. Applying that remainder to a $100.00 offer uses $40.00, charges a synthetic $60.00 settlement and sets the balance to zero. New bookings use the specified nonrefundable fare and can be canceled to local travel credit.

## Fixtures that support acceptance

- Seed 12 upcoming linked trips, 12 completed linked trips, three canceled linked trips and three lookup-only trips. Include itinerary details for a mix of one-way and round trips. Ensure at least one upcoming trip each for residual and additional-payment changes, cash refund, cancellation credit and zero-value cancellation. Include a non-changeable trip.
- Give at least one completed linked trip an uncredited member ticket, and at least one other a ticket already in the flight ledger. Use a mix of earned, redeemed and adjusted activity over several months.
- Seed 18 linked credits across available, used and expired groups, and six unlinked lookup credits. Include a credit larger than a selectable booking fare, a smaller credit, and a cancellation-credit source with matching trip link.
- Include clear matching dates for eligible change offers and a mix of one-way booking offers with displayed routes and dates. Document exact fixture identifiers in `TEST.md` when exercised. Keep the two actions that create a trip or consume a ticket or credit atomic in the store.
