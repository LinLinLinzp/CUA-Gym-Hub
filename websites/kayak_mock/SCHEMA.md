# KAYAK Account Schema

**Base URL** `http://localhost:5327/`  
**Go endpoint** `GET /go?sid=<sid>` returns `initial_state`, `current_state` and `state_diff`. A changed top-level key appears under `modified` or `added`.  
**Inject** `POST /post?sid=<sid>` with `{"action":"set","state":{...}}`.  
**Reset** `POST /post?sid=<sid>` with `{"action":"reset"}` restores the server's initial snapshot, or the seed for a fresh session. Use a fresh session ID when opening a new fixture in a browser that already has cached state.

## State Schema

Every business record has a string `id`, `createdAt`, `createdBy`, `updatedAt` and `updatedBy`. Timestamps are ISO strings and actor fields reference `user.id`. Dates use the local calendar format `YYYY-MM-DD`. Times use `HH:mm`. Optional dates, times, prices and links use `null`. Optional free text uses an empty string. Monetary values are finite nonnegative numbers and currencies are three-letter codes.

| Key | Type | Fields in addition to shared metadata |
| --- | --- | --- |
| `user` | Object | `id`, `name`, `email`, `currency` are strings. This object has no edit workflow or timestamp fields. |
| `trips` | Trip array | `title`, `destination`, `startDate`, `endDate`, `notes`, `status` (`active` or `deleted`), optional `deletedAt` and `deletedBy`. |
| `itineraryItems` | Itinerary item array | `tripId`, `type` (`activity`, `flight`, `stay`, `car` or `note`), `title`, `startDate`, `startTime`, `endDate`, `location`, `notes`, `status` (`active` or `removed`), optional `removedAt` and `removedBy`. |
| `priceAlerts` | Price alert array | `type` (`flight`, `stay` or `car`), `origin` (null for stays and cars), `destination`, `dateMode` (`fixed` or `flexible`), `startDate`, `endDate`, `cadence` (`daily` or `significant_change`), `status` (`active`, `paused` or `deleted`), `currency`, `latestPrice`, optional `deletedAt` and `deletedBy`. Flexible flights have null dates. |
| `bookings` | Booking array | `type` (`flight`, `stay` or `car`), `title`, `provider`, `confirmationCode`, `destination`, `startDate`, `endDate`, `travelerName`, `totalAmount`, `currency`, `notes`, `source` (`account_receipt` or `manual`), `status` (`confirmed`, `pending`, `cancelled` or `removed`), `tripId`, optional `removedAt` and `removedBy`. |

`itineraryItems[].tripId` retains the parent trip ID when the item is removed. A booking can reference one trip via `bookings[].tripId`. The trip itinerary reads the booking through that link. Clearing the link leaves the receipt accessible. A missing or deleted trip reference is displayed as unassigned.

### Default IDs

- User `usr_maya_chen`
- Trips `trip_001` through `trip_024`
- Itinerary items `item_001` through `item_048`
- Price alerts `alert_001` through `alert_030`
- Bookings `booking_001` through `booking_036`

## Minimal Inject Example

```json
{
  "user": { "id": "usr_injected", "name": "Lena Santos" },
  "trips": [{ "id": "trip_injected", "title": "Weekend in Lisbon" }],
  "itineraryItems": [],
  "priceAlerts": [],
  "bookings": []
}
```

Injected arrays replace seed arrays. Injected objects merge with seed objects. The store preserves additional top-level keys supplied by a task.

## Observable State Changes (for LLM evaluation)

| Action | Exact writes |
| --- | --- |
| Create trip | Append to `trips` with every trip field except deletion metadata. Set `status: 'active'` and both metadata pairs. |
| Edit trip | Write `title`, `destination`, `startDate`, `endDate`, `notes`, `updatedAt`, `updatedBy`. |
| Delete trip | Set `trips[].status: 'deleted'`, `deletedAt`, `deletedBy`, `updatedAt`, `updatedBy`. On matching manual items that have not been removed, set `status: 'removed'`, `removedAt`, `removedBy`, `updatedAt` and `updatedBy`. On matching bookings, set `tripId: null` and update `updatedAt` and `updatedBy`. All affected records receive the same timestamp and actor in one write. |
| Add manual item | Append to `itineraryItems` with every item field except removal metadata. Set `status: 'active'` and both metadata pairs. |
| Edit manual item | Write `type`, `title`, `startDate`, `startTime`, `endDate`, `location`, `notes`, `updatedAt`, `updatedBy`. |
| Remove manual item | Set `status: 'removed'`, `removedAt`, `removedBy`, `updatedAt`, `updatedBy`. |
| Create price alert | Append to `priceAlerts` with every alert field except deletion metadata. Set `status: 'active'`, `latestPrice: null` and both metadata pairs. |
| Edit price alert | Write `type`, `origin`, `destination`, `dateMode`, `startDate`, `endDate`, `cadence`, `updatedAt`, `updatedBy`. Set `latestPrice: null` when the tracked search changes. |
| Pause or resume price alert | Set `status: 'paused'` or `'active'` and write `updatedAt`, `updatedBy`. |
| Delete price alert | Set `status: 'deleted'`, `deletedAt`, `deletedBy`, `updatedAt`, `updatedBy`. |
| Add a saved booking | Append to `bookings` with every booking field except removal metadata. Set `source: 'manual'`, `status: 'confirmed'` and both metadata pairs. |
| Edit a saved booking | Write `type`, `title`, `provider`, `confirmationCode`, `destination`, `startDate`, `endDate`, `travelerName`, `totalAmount`, `currency`, `notes`, `tripId`, `updatedAt`, `updatedBy`. |
| Save booking notes | Write `notes`, `updatedAt`, `updatedBy` on an account receipt or saved booking. Submitting the current notes makes no write. |
| Attach, move or unlink booking | Write `tripId` and `updatedAt`, `updatedBy` on the booking. Unlinking sets `tripId: null`. Submitting the current assignment makes no write. |
| Remove saved booking | Set `status: 'removed'`, `tripId: null`, `removedAt`, `removedBy`, `updatedAt`, `updatedBy`. |

Trip and booking travel categories and alert expiration are derived from the runtime calendar date. Search, filters, sort, navigation, dialog cancellation, invalid submissions, copying and printing make no business writes.
