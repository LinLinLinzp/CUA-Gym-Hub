# marriott_bonvoy_mock Schema

**Base URL**: `http://localhost:5325/`  
**Go Endpoint**: `GET /go?sid=<sid>` → `{initial_state, current_state, state_diff}`  
**Inject**: `POST /post?sid=<sid>` with body `{"action":"set","state":{...}}`  
**Reset**: `POST /post?sid=<sid>` with body `{"action":"reset"}`

The app persists plain JSON. Ids are strings unless an injected world supplies another JSON type. Calendar dates use YYYY-MM-DD, event timestamps are ISO 8601 strings, points and quantities are integers, and money uses numeric values. The member is the actor for every new event. Unknown injected keys are carried through whole-state saves.

## State Schema

| Key | Type | Description |
| --- | --- | --- |
| `member` | Object | id, firstName, lastName, email, memberNumber and tier. |
| `stays` | Array | id, memberId, propertyName, city, country, confirmationNumber, checkIn, checkOut, guests, roomType and status. Modified rows include updatedAt. Cancelled rows also include cancelledAt. Statuses are upcoming, in_progress, completed and cancelled. |
| `pointsActivity` | Array | id, memberId, date, type, description, points and optional stayId. Types are stay, bonus, redemption and adjustment. The displayed balance is the sum of points. |
| `folios` | Array | id, stayId, number, status, currency and optional issuedAt, total and lineItems. Statuses are available and unavailable. Each line item has id, date, description, quantity, unitAmount and amount. |
| `requests` | Array | id, type, stayId, status, actorId, createdAt, updatedAt, notes and history. Each history entry has status, actorId and createdAt. A cancelled case includes cancelledAt. Statuses are submitted, in_review, resolved and cancelled. Type-specific fields are below. |
| `stayActions` | Array | id, stayId, actorId, action, status, createdAt, before and after. Both snapshots contain checkIn, checkOut, guests and status. A missing snapshot date or guest count is stored as null. |
| `folioActions` | Array | id, folioId, stayId, actorId, action, status, createdAt, total, currency and filename. |

| Request type | Additional fields |
| --- | --- |
| hotel_service | service is extra_towels, extra_pillows or housekeeping. The first two include quantity. Housekeeping includes requestedDate and requestedTime in the property's local time. |
| missing_stay_credit | folioId identifies the evidence. estimatedPoints is optional. |
| folio_copy | contactEmail and an optional folioId for the unavailable bill. |

### Default IDs

- Member `member-001`
- Stays `stay-001` through `stay-040`
- Points activity `points-001` through `points-048`
- Folios `folio-001` through `folio-030`
- Requests `REQ-001` through `REQ-030`
- Stay actions `stay-action-001` through `stay-action-024`
- Folio actions `folio-action-001` through `folio-action-024`

## Minimal Inject Example

```json
{
  "stays": [],
  "pointsActivity": [],
  "folios": [],
  "requests": [],
  "stayActions": [],
  "folioActions": []
}
```

This fixture retains the default member and replaces every collection with an empty array.

## Observable State Changes (for LLM evaluation)

| User action | State written |
| --- | --- |
| Confirm a reservation update | Update the stay's checkIn, checkOut, guests and updatedAt. Append one stayActions row with action modify, status applied, before and after snapshots, actorId, stayId and createdAt. |
| Confirm a reservation cancellation | Set the stay's status to cancelled and set cancelledAt and updatedAt. Append one stayActions row with action cancel and status applied, plus the same audit fields. |
| Submit a missing stay credit case | Append one requests row of type missing_stay_credit with status submitted, the selected stayId and folioId, notes and optional estimatedPoints. |
| Start a folio PDF download | Append one folioActions row with action download, status initiated, folioId, stayId, actorId, createdAt, total, currency and filename. |
| Submit a folio copy case | Append one requests row of type folio_copy with status submitted, stayId, optional folioId, contactEmail and notes. |
| Submit a hotel service case | Append one requests row of type hotel_service with status submitted, stayId, service, quantity or requestedDate and requestedTime, and notes. |
| Confirm a case withdrawal | Set the existing request's status to cancelled and set updatedAt and cancelledAt. Append a history entry with status cancelled, actorId and createdAt. |

Each new case includes a generated id, actorId, createdAt, updatedAt, and a submitted entry in history. Lists, routing, filters, search, form input, validation failures and dismissed confirmations produce no business-state write. The template preserves the initial snapshot across saves. Reset restores the current state from that snapshot.
