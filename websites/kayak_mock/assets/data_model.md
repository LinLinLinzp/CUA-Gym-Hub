# KAYAK Account Data Model

## World and field conventions

| Top-level key | Type | Purpose |
| --- | --- | --- |
| `user` | User | Seeded account and default actor |
| `trips` | Trip[] | Trip metadata and lifecycle |
| `itineraryItems` | ItineraryItem[] | Manually added items belonging to a trip |
| `priceAlerts` | PriceAlert[] | Travel criteria and tracking preferences |
| `bookings` | Booking[] | Account receipts and manually saved reservations |

Every business record has a stable string `id`. Its metadata includes string `createdAt`, `updatedAt`, `createdBy` and `updatedBy`. Actor values reference `user.id`. Use `new Date().toISOString()` for user-driven timestamps. Set both metadata pairs on create and only update the update pair on edit. Seed metadata uses fixed ISO timestamps. Date-only values are local calendar strings in `YYYY-MM-DD` format, and times are local wall times in `HH:mm`. Use `null` for omitted optional dates, times, links and amounts, and `""` for optional free text. Monetary amounts are finite nonnegative numbers. Currency is a three-letter code. Treat zero as a value.

### User

| Field | Type | Example |
| --- | --- | --- |
| `id` | string | `usr_maya_chen` |
| `name` | string | `Maya Chen` |
| `email` | string | `maya.chen@example.com` |
| `currency` | string | `USD` |

### Trip

| Field | Type | Example |
| --- | --- | --- |
| `id` | string | `trip_001` |
| `title` | string | `Lisbon long weekend` |
| `destination` | string | `Lisbon, Portugal` |
| `startDate`, `endDate` | string or null each | `2027-05-14`, `2027-05-18` |
| `notes` | string | `Keep Sunday morning open for the market.` |
| `status` | `active` or `deleted` | `active` |
| `deletedAt`, `deletedBy` | optional string each | `2026-11-18T16:40:00.000Z`, `usr_maya_chen` |

Derive Planning when dates are missing, Past when the end date precedes the runtime calendar date, and Upcoming for all other active trips including trips in progress. Hide deleted trips in lists and pickers. Editing dates can change the displayed category without a separate status write.

### ItineraryItem

| Field | Type | Example |
| --- | --- | --- |
| `id`, `tripId` | string each | `item_001`, `trip_001` |
| `type` | `activity`, `flight`, `stay`, `car` or `note` | `activity` |
| `title` | string | `Visit Feira da Ladra` |
| `startDate` | string | `2027-05-15` |
| `startTime`, `endDate` | string or null each | `10:00`, `null` |
| `location`, `notes` | string each | `Campo de Santa Clara`, `Meet near the north entrance.` |
| `status` | `active` or `removed` | `active` |
| `removedAt`, `removedBy` | optional string each | `2026-11-18T16:40:00.000Z`, `usr_maya_chen` |

Require a title and start date for new items. An end date, if given, must be on or after the start date. Keep undated injected items visible under Date to be confirmed. Show an empty itinerary when there are no active manual entries or associated bookings.

### PriceAlert

| Field | Type | Example |
| --- | --- | --- |
| `id` | string | `alert_001` |
| `type` | `flight`, `stay` or `car` | `flight` |
| `origin` | string or null | `BOS` |
| `destination` | string | `LIS` |
| `dateMode` | `fixed` or `flexible` | `fixed` |
| `startDate`, `endDate` | string or null each | `2027-05-14`, `2027-05-18` |
| `cadence` | `daily` or `significant_change` | `daily` |
| `status` | `active`, `paused` or `deleted` | `active` |
| `currency`, `latestPrice` | string, number or null respectively | `USD`, `642.00` |
| `deletedAt`, `deletedBy` | optional string each | `2026-11-18T16:40:00.000Z`, `usr_maya_chen` |

For stays and cars, use destination for the search location, origin is null and date mode is fixed. For flexible flights both dates are null. Normalize endpoint whitespace and compare endpoints case-insensitively when validating distinct flight endpoints. Changing the type, endpoints, date mode or dates clears the previous price. A nondeleted alert with a fixed end date before today displays Expired, regardless of the underlying active or paused state. Flex-date alerts have no travel-date expiration. Editing the dates can restore the underlying status to view. Hide deleted alerts from account lists.

### Booking

| Field | Type | Example |
| --- | --- | --- |
| `id` | string | `booking_001` |
| `type` | `flight`, `stay` or `car` | `stay` |
| `title` | string | `Alfama Courtyard Guesthouse` |
| `provider` | string | `Harborleaf Travel` |
| `confirmationCode` | string | `HL-LIS-4816` |
| `destination` | string | `Lisbon, Portugal` |
| `startDate`, `endDate` | string each | `2027-05-14`, `2027-05-18` |
| `travelerName` | string | `Maya Chen` |
| `totalAmount`, `currency` | number or null, string respectively | `524.40`, `EUR` |
| `notes` | string | `Ask about storing luggage on arrival.` |
| `source` | `account_receipt` or `manual` | `account_receipt` |
| `status` | `confirmed`, `pending`, `cancelled` or `removed` | `confirmed` |
| `tripId` | string or null | `trip_001` |
| `removedAt`, `removedBy` | optional string each | `2026-11-18T16:40:00.000Z`, `usr_maya_chen` |

Travel status filters include Upcoming, Past, Pending and Cancelled. Derive Upcoming and Past from dates on confirmed bookings. Pending and Cancelled come from the stored status. Keep sparse records eligible for All. Hide removed bookings. Booking information remains visible when a trip link is cleared. Duplicate checks cover confirmed and pending records and exclude the record currently being edited.

## Relationships and mutations

- `itineraryItems[].tripId` references the parent trip. Keep the original trip ID in the item when its status becomes removed. Trip deletion marks every active manual item on that trip removed and writes their removal/update metadata.
- `bookings[].tripId` optionally references one nondeleted trip. Move or unlink by changing this field on the booking. The trip view reads matching records from `bookings` and shows each ID once. No itinerary item is created when a booking is linked. Trip deletion clears matching booking links and writes booking update metadata in the same store mutation. Missing or deleted links resolve to an unassigned display.
- Deletion/removal keeps a tombstone with actor and timestamp so a verifier can distinguish the user action from an injected world that lacks the record. Preserve original creation timestamps.
- Keep ephemeral state in the view. Search, filters, sort, open dialogs and selection are local UI state. Validate changes before storing them. Repeat confirmation clicks and unchanged link submissions should produce at most one state write.

## Seed blueprint

Export a fresh `createInitialData()` world each time, with the five keys above and deterministic records. Use static ISO dates across 2025–2027. The examples below anchor browser checks and should keep their IDs.

| Entity | Seed count | Coverage |
| --- | --- | --- |
| Users | 1 | Maya Chen, USD default |
| Trips | 24 | 12 dated across 2027, 8 dated in 2025–2026 and 4 undated. At least two titles share a city to exercise search. Use Lisbon, Vancouver, Chicago, Reykjavík, Kyoto and other recognizable destinations. |
| Itinerary items | 48 | 18 activities, 10 flights, 8 stays, 6 cars and 6 notes. Spread across dated trips, including same-day entries, untimed entries and trips without manual entries. Include `item_001` on `trip_001`. |
| Alerts | 30 | 18 flights, 8 stays and 4 cars. Six flight alerts use flexible dates. Include 6 paused alerts and at least 5 past fixed windows, with no deleted defaults. Include `alert_001` for BOS to LIS. |
| Bookings | 36 | 16 flights, 14 stays and 6 cars. Use 22 account receipts and 14 manual records. Include confirmed, pending and cancelled values with 18 linked bookings overall. Mix USD, CAD and EUR, and include both known and unknown prices. Keep `booking_001` linked to `trip_001`. |

Use varied titles, fictional provider names and non-sensitive confirmation codes. Seed lists with enough rows to exercise scrolling, filtering, sorting and detail navigation. Never infer persisted mutations from the passage of time, and use render defaults for missing fields without rewriting an injected world.
