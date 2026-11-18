# Recreation.gov Mock Schema

**Base URL** `http://localhost:5515/`  
**Go endpoint** `GET /go?sid=<sid>` returns `initial_state`, `current_state`, and `state_diff`  
**Read** `GET /state?sid=<sid>` returns `stored_state`, `has_custom_state`, and `sid`  
**Inject** `POST /post?sid=<sid>` with `{"action":"set","state":{...}}`  
**Reset** `POST /post?sid=<sid>` with `{"action":"reset"}` restores current state from the baseline

App key `recreation_gov_mock`. The signed-in account and catalog are synthetic. On first boot the client merges injected data over defaults and sends a baseline `set`. Each successful business action sends the complete state with `set_current`. Each changed top-level key in `state_diff` contains a `modified` or `added` member with that key's current value.

## State Schema

IDs and references are strings. Calendar dates have the format `YYYY-MM-DD`. Timestamps are UTC ISO strings. Amounts are numeric USD values to two decimal places. Optional fields are indicated below. The [seed fixture guide](assets/data_model.md) lists stable IDs and relationships.

| Top-level key | Type | Record fields |
|---|---|---|
| `account` | Object | `id`. Optional `firstName`, `lastName`, `email`. |
| `facilities` | Array | `id`, `name`, `kind` (`campsite` or `permit`), `state`, `locality`, `area`, `serviceFee`, `policy`. Optional `timeZone` (IANA, UTC fallback), `availableFrom`, `availableThrough` (inclusive), `description`, `rules[]` (strings). |
| `units` | Array | `id`, `facilityId`, `name`, `kind`, `category`, `maxPartySize`, `rate` (nightly or per person). `equipment[]` for campsites, `dailyQuota` for permits. Optional `blockedDates[]`, `allocation` (`direct` by default or `lottery`). |
| `reservations` | Array | `id`, `kind`, `status` (`confirmed`, `cancelled`), `facilityId`, `unitId`, `startDate`, `partySize`, `quantity` (nights or people), `currency`, `unitAmount`, `useAmount`, `serviceFee`, `totalAmount`, `policySnapshot`, `confirmationCode`, `actorId`, `createdAt`, `updatedAt`. `endDate` and `equipment` for campsites. Optional `lotteryApplicationId`, `cancelledAt`, `cancellationId`. |
| `lotteries` | Array | `id`, `title`, `facilityId`, `unitId`, `opensAt`, `closesAt`, `resultsAt`, `claimDeadlineAt`, `eligibleDates[]`, `applicationFee`, `maxPartySize`, `maxPreferences`. Optional `rules[]` (strings). |
| `lotteryApplications` | Array | `id`, `lotteryId`, `actorId`, `confirmationCode`, `status` (`submitted`, `selected`, `unsuccessful`, `claimed`), `preferences[]` (objects with integer `rank` and `entryDate`), `partySize`, `feeAmount`, `currency`, `createdAt`, `updatedAt`. Optional `awardedDate`, `claimDeadlineAt`, `claimedAt`, `reservationId`. |
| `cancellations` | Array | `id`, `reservationId`, `status` (`completed`), `actorId`, `createdAt`, `policyCode`, `paidAmount`, `chargeLines[]`, `deductionLines[]`, `refundAmount`, `currency`. |

A policy has `code`, `cancellationFee`, `lateDays` (integer), and `lateForfeit` (`none`, `first_night`, `use_fee`). The booking saves a copy in `policySnapshot`. Fee lines have `code`, `quantity`, `unitAmount`, and `amount`. Charge codes are `use` and `service`. Deduction codes are `service`, `cancellation`, and `late_forfeit`. Deductions are capped at the remaining paid amount and zero deductions are omitted.

### Default IDs

The account is `acct-morgan`. The Cedar Bend campsite fixtures are `camp-cedar-bend`, `site-cedar-a12` and `res-cedar-upcoming`. The Silver Fork permit fixtures are `permit-silver-fork`, `entry-silver-fork-west` and `res-silver-fork-upcoming`. Use `lottery-high-meadow-open` to submit an application and `app-pine-selected` to claim an award from `lottery-pine-fen`.

## Minimal Inject Example

This empty catalog and account history can be used as the `state` value in a `set` request.

```json
{
  "account": { "id": "acct-audit", "firstName": "Taylor" },
  "facilities": [],
  "units": [],
  "reservations": [],
  "lotteries": [],
  "lotteryApplications": [],
  "cancellations": []
}
```

## Observable State Changes

| User action | Exact writes |
|---|---|
| Confirm campsite | Append one complete confirmed campsite row to `reservations`, including `endDate` and `equipment`. |
| Confirm direct permit | Append one complete confirmed permit row to `reservations`. |
| Submit lottery application | Append one submitted row with `id`, `status`, `lotteryId`, `preferences`, `partySize`, `feeAmount`, `currency`, `confirmationCode`, `actorId`, `createdAt`, `updatedAt` to `lotteryApplications`. |
| Confirm permit claim | In one write, update `lotteryApplications[id]` fields `status = claimed`, `claimedAt`, `updatedAt`, `reservationId` and append a complete confirmed permit row to `reservations` with `lotteryApplicationId`. The application fee is retained on its application. |
| Confirm cancellation | In one write, update `reservations[id]` fields `status = cancelled`, `cancelledAt`, `updatedAt`, `cancellationId` and append a complete adjustment to `cancellations`. The original booking charges remain on the reservation. |
| Browse, filter, open a receipt, prepare or dismiss a review, reject invalid input, print | No state writes. |

Only confirmed reservations count toward inventory. Campsites occupy nights in `[startDate, endDate)`. Permit quota counts confirmed participants for the same entrance and day across all actors. Lottery outcomes come from the input world. Date-based views and eligibility use the current clock and facility-local days where applicable.
