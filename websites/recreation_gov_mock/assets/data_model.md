# Recreation.gov state model

`createInitialData()` returns a fresh plain object with these seven keys.

```js
return { account, facilities, units, reservations, lotteries, lotteryApplications, cancellations }
```

IDs and references are strings. Dates representing a day use `YYYY-MM-DD`. Timestamps use UTC ISO strings. USD amounts are JSON numbers rounded to cents. Calculate in integer cents before converting for persistence. Submitted records receive unique IDs and human-readable confirmation codes such as `R-8D3C2A1F` and `L-8D3C2A1F`. Keep seeded IDs and codes deterministic. Optional fields may be omitted.

## Account

One pre-signed-in actor. Example `{ id: "acct-morgan", firstName: "Morgan", lastName: "Rivera", email: "morgan.rivera@example.test" }`. The three display fields are optional for rendering. All mutations use the active account ID, and account views show that actor's records.

## Facilities

| Field | Type | Example |
|---|---|---|
| id, name | string | `camp-cedar-bend`, Cedar Bend Campground |
| kind | enum | `campsite` or `permit` |
| area, locality, state | string | South Fork Recreation Area, Oakridge, OR |
| timeZone | IANA string | `America/Los_Angeles` |
| description, rules | optional string, optional string array | Sheltered sites near the river; Store food in approved containers. |
| availableFrom, availableThrough | calendar dates, inclusive | 2026-10-01, 2027-12-31 |
| serviceFee | number | 8 |
| policy | policy object | `{ code: "camp-standard", cancellationFee: 10, lateDays: 1, lateForfeit: "first_night" }` |

Policy fields are `code` (string), `cancellationFee` (number), `lateDays` (integer calendar day count), and `lateForfeit` (`none`, `first_night`, or `use_fee`). For example, `{ code: "permit-standard", cancellationFee: 0, lateDays: 2, lateForfeit: "use_fee" }`. Service fees are retained under both sample policies. These are synthetic facility policies.

## Units

| Field | Type | Example |
|---|---|---|
| id, facilityId, name | string | `site-cedar-a12`, `camp-cedar-bend`, A12 |
| kind | enum | `campsite` or `permit` |
| category | string | Standard nonelectric, Trailhead |
| maxPartySize, rate | integer, number | 6, 24 |
| equipment | optional string array | `["Tent", "Small RV"]` for camping |
| dailyQuota | optional positive integer | 12 for a permit entrance |
| blockedDates | optional calendar date array | `["2026-12-15"]` |
| allocation | optional enum | `direct` (default) or `lottery` for a lottery-only entrance |

`rate` is nightly for camping and per person for permits. A facility has many units. Direct browse and booking exclude lottery-only units. A blocked night or entry date cannot be booked. Confirmed campsites overlap when the candidate arrival is before the existing departure and the candidate departure is after the existing arrival. Permit capacity is daily quota minus participants on every confirmed reservation for that entrance/date, across all actors. A cancelled reservation consumes zero capacity. For camping, the first occupied night through the last occupied night must be inside the availability window. For permits, validate the entry day.

## Reservations

| Field | Type | Example |
|---|---|---|
| id, confirmationCode, actorId | string | `res-cedar-upcoming`, `R-CEDAR124`, `acct-morgan` |
| kind, status | enums | `campsite` or `permit`; `confirmed` or `cancelled` |
| facilityId, unitId | string references | `camp-cedar-bend`, `site-cedar-a12` |
| startDate, endDate | calendar dates | 2026-12-03, 2026-12-05; omit end date for an entry-only permit |
| partySize, quantity | positive integers | 4, 2; quantity is nights for camping and people for permits |
| equipment | optional string | Tent for camping |
| currency, unitAmount, useAmount, serviceFee, totalAmount | string, numbers | USD, 24, 48, 8, 56 |
| policySnapshot | policy object | copy of the facility policy at booking |
| createdAt, updatedAt | ISO timestamps | `2026-11-18T15:00:00.000Z` |
| lotteryApplicationId | optional string reference | `app-pine-selected` |
| cancelledAt, cancellationId | optional timestamp and string reference | `2026-11-19T15:00:00.000Z`, `cancel-cedar-01` |

`useAmount = quantity × unitAmount` and `totalAmount = useAmount + serviceFee`. Past is a read-only view of confirmed records whose trip is over. For camping the past view starts on departure day and for permits after entry day. Cancelled takes precedence. Compare calendar dates in the facility's time zone, using UTC when the zone is missing or invalid. Keep incomplete historical records visible with available fields and clear placeholders. Disable the action if inputs required to calculate inventory, fees or eligibility are unavailable.

## Lotteries

| Field | Type | Example |
|---|---|---|
| id, title | string | `lottery-high-meadow-open`, High Meadow Traverse Lottery |
| facilityId, unitId | string references | `permit-high-meadow`, `entry-high-meadow-traverse` |
| opensAt, closesAt, resultsAt, claimDeadlineAt | ISO timestamps | `2026-10-01T00:00:00.000Z`, `2027-03-01T00:00:00.000Z`, `2027-03-05T17:00:00.000Z`, `2027-04-01T00:00:00.000Z` |
| eligibleDates | calendar date array | `["2027-06-12", "2027-06-19", "2027-06-26"]` |
| applicationFee, maxPartySize, maxPreferences | number, integer, integer | 6, 8, 3 |
| rules | optional string array | One application per account |

Open means `opensAt <= now < closesAt`. An eligible preference is a distinct listed future date, and a party must fit both lottery and entrance limits. Render announced results from application data. The opportunity window controls new applications and the claim deadline controls award redemption.

## Lottery applications

| Field | Type | Example |
|---|---|---|
| id, lotteryId, actorId, confirmationCode | string | `app-pine-selected`, `lottery-pine-fen`, `acct-morgan`, `L-PINE041` |
| status | enum | `submitted`, `selected`, `unsuccessful`, `claimed` |
| preferences | array of `{ rank: integer, entryDate: calendar date }` | `[{ rank: 1, entryDate: "2027-05-22" }]` |
| partySize, feeAmount, currency | integer, number, string | 2, 6, USD |
| createdAt, updatedAt | ISO timestamps | `2026-10-08T13:00:00.000Z` |
| awardedDate, claimDeadlineAt | optional calendar date and timestamp | `2027-05-22`, `2027-03-01T00:00:00.000Z` |
| claimedAt, reservationId | optional timestamp and string reference | claim timestamp and `res-pine-claim` |

An actor can have one active application per opportunity. Treat submitted, selected and claimed as active. A claim uses the selected application's awarded date and party size. Use its claim deadline when supplied, otherwise the opportunity deadline. Reject missing or expired award data, same-day/past entries, and exhausted quota. Claim charges cover the new permit and its service fee. The original application fee stays separate.

## Cancellations

| Field | Type | Example |
|---|---|---|
| id, reservationId, actorId | string | `cancel-cedar-01`, `res-cedar-upcoming`, `acct-morgan` |
| status, currency, policyCode | strings | `completed`, USD, `camp-standard` |
| paidAmount, refundAmount | numbers | 56, 38 |
| chargeLines, deductionLines | arrays of fee lines | Two nightly fees and one service fee; retained service fee and cancellation fee |
| createdAt | ISO timestamp | `2026-11-19T15:00:00.000Z` |

A fee line has `{ code, quantity, unitAmount, amount }`. Example charges are `{ code: "use", quantity: 2, unitAmount: 24, amount: 48 }` and `{ code: "service", quantity: 1, unitAmount: 8, amount: 8 }`. Codes for deductions are `service`, `cancellation`, and `late_forfeit`. Apply them in that order, cap each at the remaining paid amount, omit zero deductions, and set `refundAmount = paidAmount - sum(deductionLines.amount)`. Baseline cancellation eligibility is an actor-owned confirmed reservation before the start calendar day in the facility zone. Apply the late deduction at `1 <= daysToStart <= lateDays`, using a calendar-day calculation that handles DST. Preserve the original reservation charges and persist the cancellation and booking change together.

## Reproducible fixtures

Use a browser clock of `2026-11-18T15:00:00.000Z` for walkthrough checks. The runtime can supply another date or inject its own world.

| Test fixture | Fixed seed and relationship |
|---|---|
| Direct campsite | `camp-cedar-bend` has `site-cedar-a12` with 6-person capacity, Tent and Small RV, $24/night and $8 service fee. Leave Dec 10–12, 2026 open on that unit, and include a second occupied or equipment-incompatible unit. |
| Direct permit | `permit-silver-fork` has `entry-silver-fork-west`, capacity 6 per party and daily quota 12. Leave at least 4 places on Dec 11, 2026. Use a $5/person rate and $6 service fee. |
| Upcoming cancellation | `res-cedar-upcoming` covers Dec 3–5, 2026 at A12 for 4 people and total $56. Its standard refund is $38. Give a separate upcoming permit the ID `res-silver-fork-upcoming`. |
| Past/cancelled | Include older confirmed trips and at least one cancelled record whose `cancellationId` resolves. Include an upcoming late-cancellation fixture and a zero-refund result. |
| Lottery submit | `lottery-high-meadow-open` uses the example opportunity window and dates and has no application from Morgan Rivera. |
| Lottery claim | `app-pine-selected` is linked to `lottery-pine-fen` and a valid permit entrance with free quota, awarded May 22, 2027, claimable before March 1, 2027. The opportunity has closed and results have been released by the walkthrough clock. |
| Lottery history | Seed a submitted, unsuccessful and claimed application for different opportunities. Populate the claimed record's reservation link and include an expired selected result. |

Use fictional facilities, realistic regions and English descriptions. Supply the volumes and variety specified in TODO.md. Store static dates in the seed and use the current clock when determining status and eligibility.
