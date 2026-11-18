# OpenTable account state model

`createInitialData()` returns `account`, `restaurants`, `reservations`, `reservationEvents`, `reviews`, `rewardOptions`, `pointTransactions` and `pointRedemptions`. Keep the structure JSON-serializable. IDs and actor references are strings. Optional fields may be missing or `null`. Amounts are numbers, points and guest counts are integers, and audit timestamps are UTC ISO strings. The sample values below are synthetic.

## Account

| Field | Type | Example |
| --- | --- | --- |
| `id` | string | `diner-001` |
| `firstName`, `lastName` | string | `Jamie`, `Morgan` |
| `email` | string | `jamie.morgan@example.test` |
| `city`, `timeZone` | string | `New York`, `America/New_York` |

Display initials derived from the name. All account lists and point sums use the current account ID. The default account is already enrolled for points.

## Restaurants

| Field | Type | Example |
| --- | --- | --- |
| `id`, `name` | string | `rest-001`, `Juniper & Rye` |
| `cuisine`, `neighborhood` | string | `American`, `West Village` |
| `address`, `city`, `timeZone` | string | `18 Holloway Lane`, `New York`, `America/New_York` |
| `priceTier` | integer 1–4 | `3` |
| `description` | string | `Wood-fired vegetables and seasonal plates in a small corner dining room.` |
| `image` | optional local path | `/images/wood-fired.webp` |
| `slots` | array of objects | `[{ "time": "18:30", "maxPartySize": 6, "seating": "Dining room", "potentialPoints": 100 }]` |

`slots` is a recurring local schedule. For the selected date, intersect it with party size, future start time and booking conflicts. Offer multiple times on a typical visit date. Filter by preferred time using a small window and give the user a way to broaden the query. Use `date` and `time` as restaurant-local values. For default NYC venues, use `Intl.DateTimeFormat` with `America/New_York` to get the current local day and time, including daylight saving. Missing schedules show an unavailable state. Never use an injected image path to make an external request.

## Reservations

| Field | Type | Example |
| --- | --- | --- |
| `id`, `restaurantId`, `actorId` | string | `res-001`, `rest-001`, `diner-001` |
| `confirmationCode` | string | `OT-6F3A9D` |
| `date`, `time` | `YYYY-MM-DD`, `HH:mm` | `2026-11-21`, `18:30` |
| `partySize`, `seating` | integer, string | `4`, `Dining room` |
| `occasion`, `specialRequest` | optional strings | `Birthday`, `Window seat if available.` |
| `status` | `confirmed`, `completed`, or `canceled` | `confirmed` |
| `potentialPoints` | integer | `100` |
| `createdAt`, `updatedAt` | ISO UTC string | `2026-11-18T18:40:00.000Z` |
| `canceledAt` | optional ISO UTC string | `2026-11-20T17:15:00.000Z` |

Generate a fresh stable ID and a separate readable confirmation code on booking. Reject conflicts within 150 minutes for the same diner when creating or modifying a booking. A current reservation can reuse its own slot on edit. A confirmed booking in the past is displayed under Past and stays confirmed until an injected or seeded record supplies a completed status. Pending points sum future confirmed reservations only. Posted earning rows identify completed visits separately.

## Reservation events

| Field | Type | Example |
| --- | --- | --- |
| `id`, `reservationId`, `actorId` | string | `evt-001`, `res-001`, `diner-001` |
| `type` | `booked`, `modified`, or `canceled` | `modified` |
| `before`, `after` | snapshot or `null` for `before` on booking | `before.partySize: 2`, `after.partySize: 4` |
| `createdAt` | ISO UTC string | `2026-11-19T16:00:00.000Z` |

Snapshots contain `date`, `time`, `partySize`, `seating`, `occasion`, `specialRequest`, `status` and `potentialPoints`. Complete both the event and reservation update in one store commit. Event `createdAt` and the reservation's mutation timestamp refer to the same instant.

## Reviews

| Field | Type | Example |
| --- | --- | --- |
| `id`, `reservationId`, `restaurantId`, `actorId` | string | `rev-001`, `res-010`, `rest-010`, `diner-001` |
| `overall` | integer 1–5 | `5` |
| `food`, `service`, `ambience`, `value` | optional integer 1–5 | `5`, `4`, `5`, `4` |
| `comment` | string, at most 1,000 characters | `The squash and brown butter were wonderful.` |
| `status` | `submitted` | `submitted` |
| `createdAt` | ISO UTC string | `2026-11-16T23:30:00.000Z` |

One review per reservation and actor. Only completed visits for the active diner are eligible. An omitted comment becomes an empty string. Reopening or dismissing the draft does not persist it.

## Reward options

| Field | Type | Example |
| --- | --- | --- |
| `id`, `name` | string | `reward-dining-16`, `$16 dining credit` |
| `pointsCost` | positive integer | `2000` |
| `amount`, `currency` | number, ISO currency code | `16`, `USD` |

Include `reward-dining-40` at 5,000 points. Derive display amounts and availability from these records and the posted ledger. Confirm against the latest state before issuing a credit.

## Point transactions

| Field | Type | Example |
| --- | --- | --- |
| `id`, `actorId` | string | `pts-001`, `diner-001` |
| `type` | `earned` or `redeemed` | `earned` |
| `points` | signed integer | `100` or `-2000` |
| `reservationId` | optional string for an earning | `res-010` |
| `redemptionId` | optional string for a redemption | `redeem-001` |
| `status` | `posted` | `posted` |
| `createdAt` | ISO UTC string | `2026-11-17T17:30:00.000Z` |

Balance is the sum of the current diner's posted transactions. Show activity newest first with a stable tie-breaker. An earning links to a completed reservation. A redemption links to the issued record. No balance field or timer-driven ledger mutation.

## Point redemptions

| Field | Type | Example |
| --- | --- | --- |
| `id`, `actorId`, `rewardOptionId` | string | `redeem-001`, `diner-001`, `reward-dining-16` |
| `pointsSpent`, `amount`, `currency` | integer, number, ISO currency code | `2000`, `16`, `USD` |
| `status` | `issued` | `issued` |
| `createdAt` | ISO UTC string | `2026-11-18T16:00:00.000Z` |

Snapshot the reward's price and value at issue time. Update both redemption and debit in the same commit with a shared timestamp. An issued credit appears in the account alongside its confirmation and debit.

## Seed recipe

- `restaurants` has 32 venues with fixed IDs, varied synthetic addresses and cuisine-appropriate original imagery. Include several matches per common cuisine and neighborhood. Give some slots 0, 100, 500 or 1,000 potential points.
- `reservations` has 5 future confirmed, 32 completed and 3 canceled records, all with fixed IDs, stable confirmation codes and realistic requests. Generate booking dates by applying deterministic calendar-day offsets to the current local date at seed construction, measured against `new Date()` so time-frozen scenarios keep useful upcoming and past views. Generate fixed per-row audit times relative to those dates. Include one `booked` event per seeded reservation plus corresponding `canceled` events.
- `reviews` has 24 of the completed visits reviewed and eight eligible visits. Seed concise, varied ratings and copy.
- `pointTransactions` has 24 earned rows linked to completed reservations, for example 21 × 100, two × 500 and one × 1,000, plus one linked 2,000-point debit. This leaves a starting balance of 2,100 points. Seed the debit after the ledger first reached 2,000 points. `pointRedemptions` has the one matching issued credit.
- For injected sparse worlds, show descriptive fallbacks for absent optional values and unresolved IDs, and offer a recovery action on unknown details. Array replacement via the template is authoritative, including empty arrays. Tests should verify that renders and passive fallbacks never rewrite injected state.
