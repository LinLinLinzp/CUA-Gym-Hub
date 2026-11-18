# yelp_mock Schema

**Base URL** `http://localhost:5319/`  
**Go Endpoint** `GET /go?sid=<sid>` returns `{initial_state, current_state, state_diff}`.  
**Inspect** `GET /state?sid=<sid>` returns `{stored_state, has_custom_state, sid}`.  
**Inject** `POST /post?sid=<sid>` with `{"action":"set","state":{...}}`. Use a fresh `sid` and browser context for a new injected world.  
**Reset** `POST /post?sid=<sid>` with `{"action":"reset"}` restores that session's baseline on the server. Use a fresh browser context to see the reset state.

## State Schema

| Key | Type | Purpose |
| --- | --- | --- |
| `currentUserId` | string | Signed-in actor, e.g. `usr_maya` |
| `users` | User[] | Synthetic account holder and public reviewer identities |
| `businesses` | Business[] | Local discovery listings and action eligibility |
| `reviews` | Review[] | Published and removed reviews |
| `collections` | Collection[] | Owned lists of saved places |
| `bookmarks` | Bookmark[] | Saved memberships and removal history |
| `quoteRequests` | QuoteRequest[] | Submitted and archived service inquiries |
| `reservations` | Reservation[] | Dining bookings and cancellation history |

All record IDs are unique within their collection. A `userId` refers to `users[].id`; a `businessId` refers to `businesses[].id`; a `collectionId` refers to `collections[].id`. Ownership comes from `currentUserId`. At render time use array guards and look up each foreign key independently. Show fallback labels such as “Unknown business” when needed and offer writes only when the required actor and references resolve. Treat absent display metadata as absent and make the root and deep links usable after partial injection. Preserve unknown keys on writes.

Saved counts, recent bookmark activity, and saved business controls include only memberships linked to an active collection owned by the current user. Memberships with unavailable collections remain in stored state.

### Default IDs

| Entity | IDs |
| --- | --- |
| Account and reviewers | `usr_maya` and `usr_1` through `usr_11` |
| Businesses | 48 fixed IDs, including bookable `biz_juniper_hearth` and quote-capable `biz_riverbend_care` |
| Reviews | `rev_001` through `rev_056` |
| Collections | `col_want_to_go`, `col_sunday_breakfast`, `col_patio_tables`, `col_home_projects`, `col_weekend_errands`, `col_out_of_town_guests` |
| Bookmarks | `bm_001` through `bm_032` |
| Quote requests | `quote_001` through `quote_026` |
| Reservations | `rsv_001` through `rsv_028` |

## Minimal Inject Example

```json
{
  "action": "set",
  "state": {
    "currentUserId": "usr_example",
    "users": [{"id": "usr_example", "displayName": "Jordan Ellis"}],
    "businesses": [{"id": "biz_example", "name": "Maple Street Café"}],
    "reviews": [],
    "collections": [],
    "bookmarks": [],
    "quoteRequests": [],
    "reservations": []
  }
}
```

## Record shapes

Fields marked `?` are optional. Relevant mutation timestamps are emitted using `new Date().toISOString()`. IDs and codes in the seed are fixed. Generate new IDs and unique reservation codes only on a user-confirmed write. Integer ratings, party sizes and price levels are numbers. Timestamps are UTC ISO strings, while dining dates and times are local strings interpreted using the business timezone.

### User

| Field | Type | Example |
| --- | --- | --- |
| `id` | string | `usr_maya` |
| `displayName` | string | `Maya Chen` |
| `email?` | string | `maya.chen@example.test` |
| `city?` | string | `Portland, OR` |
| `joinedAt?` | ISO string | `2021-08-17T18:00:00.000Z` |

### Business

| Field | Type | Example |
| --- | --- | --- |
| `id` | string | `biz_juniper_hearth` |
| `name` | string | `Juniper Hearth` |
| `category?` | string | `Pacific Northwest` |
| `kind?` | string | `restaurant`, `service`, or `other` |
| `neighborhood?` | string | `Sellwood` |
| `city?` | string | `Portland, OR` |
| `address?` | string | `427 Willow Quay, Portland, OR` |
| `description?` | string | `Seasonal plates from a wood-fired kitchen.` |
| `rating?` | number from 1 to 5 | `4.6` |
| `reviewCount?` | nonnegative integer | `144` |
| `priceLevel?` | integer from 1 to 4 | `2` |
| `imagePath?` | local path | `/art/restaurant.webp` |
| `quoteServices?` | string[] | `["Deep cleaning", "Move-out cleaning"]` on Riverbend Home Care |
| `reservationPolicy?` | object | `{ "timeZone": "America/Los_Angeles", "openWeekdays": [0, 2, 3, 4, 5, 6], "slotTimes": ["17:00", "17:30", "18:00", "18:30", "19:00"], "maxPartySize": 6 }` |

Quote eligibility requires at least one valid offered service. Bookability requires a valid policy with at least one time, an open weekday and a positive party limit. Weekdays use Sunday as 0.

### Review

| Field | Type | Example |
| --- | --- | --- |
| `id`, `userId`, `businessId` | string each | `rev_001`, `usr_maya`, `biz_juniper_hearth` |
| `rating` | integer from 1 to 5 | `4` |
| `text` | string | `The cornbread arrived warm, and our server helped us pick two seasonal plates to share.` |
| `status` | enum | `published` or `removed` |
| `createdAt`, `updatedAt?`, `removedAt?` | ISO string each | `2026-10-08T02:00:00.000Z` |
| `removalReason?` | string | `Posted to the wrong location` |

### Collection and bookmark

| Record | Field | Type | Example |
| --- | --- | --- | --- |
| Collection | `id`, `userId`, `name` | string each | `col_want_to_go`, `usr_maya`, `Want to go` |
| Collection | `status` | enum | `active` |
| Collection | `createdAt` | ISO string | `2026-08-05T19:00:00.000Z` |
| Bookmark | `id`, `userId`, `businessId`, `collectionId` | string each | `bm_009`, `usr_maya`, `biz_juniper_hearth`, `col_want_to_go` |
| Bookmark | `status` | enum | `saved` or `removed` |
| Bookmark | `createdAt`, `updatedAt?`, `removedAt?` | ISO string each | `2026-10-12T20:00:00.000Z` |

### QuoteRequest

| Field | Type | Example |
| --- | --- | --- |
| `id`, `userId`, `businessId` | string each | `quote_012`, `usr_maya`, `biz_riverbend_care` |
| `serviceType` | string | `Move-out cleaning` |
| `details` | string | `Two-bedroom apartment, including the oven and inside the kitchen cabinets.` |
| `zipCode` | five-digit string | `97202` |
| `preferredDate` | YYYY-MM-DD string or null | `2026-11-27` |
| `status` | enum | `submitted` or `archived` |
| `quotedAmount?`, `currency?` | numeric amount and ISO currency string | `245.5`, `USD` |
| `createdAt`, `updatedAt?`, `archivedAt?` | ISO string each | `2026-11-06T17:00:00.000Z` |

### Reservation

| Field | Type | Example |
| --- | --- | --- |
| `id`, `userId`, `businessId` | string each | `rsv_004`, `usr_maya`, `biz_juniper_hearth` |
| `date`, `time` | YYYY-MM-DD and HH:mm strings | `2026-11-28`, `18:30` |
| `partySize` | positive integer | `3` |
| `guestName`, `email` | string each | `Maya Chen`, `maya.chen@example.test` |
| `phone`, `notes` | string or null each | `503-555-0142`, `Window table if available` |
| `confirmationCode` | string | `YLP-H7J4Q2` |
| `status` | enum | `confirmed` or `cancelled` |
| `createdAt`, `updatedAt?`, `cancelledAt?` | ISO string each | `2026-11-06T19:00:00.000Z` |

Derive future/past and slot availability against `new Date()` in the restaurant's timezone, using an explicit timezone with `Intl.DateTimeFormat`. Compare business-local calendar date and time as a pair. Show matching hours on open weekdays for a party size within the policy. Use the requested time to order valid slots by proximity and use the actual selected slot when storing the reservation. For the sandbox, any confirmed reservation at that business, date and time occupies the slot. Exclude the reservation being modified when checking its own availability and release cancelled slots. Revalidate against current store state on confirmation and guard repeat clicks. A fixed date/input can cross the runtime clock without changing its stored status.
## Observable State Changes

New records below include exactly the listed fields. Updates preserve each ID, all other fields on the record, and any unrelated or injected keys in the world. All actions use the signed-in actor. When an action writes two timestamps, both have the same value.

| User action | State target | Created or updated fields |
| --- | --- | --- |
| Post review | Append to `reviews[]` | `id, userId, businessId, rating, text, status: 'published', createdAt` |
| Edit review | Same `reviews[]` ID | `rating, text, updatedAt` |
| Remove review | Same `reviews[]` ID | `status: 'removed', removalReason, removedAt, updatedAt` |
| Create collection | Append to `collections[]` | `id, userId, name, status: 'active', createdAt` |
| Save place | Append to `bookmarks[]` | `id, userId, businessId, collectionId, status: 'saved', createdAt` |
| Save to Want to go with no active collections | Append to both `collections[]` and `bookmarks[]` in one write | Fields from Create collection and Save place above, linked by the new collection ID |
| Remove bookmark | Same `bookmarks[]` ID | `status: 'removed', removedAt, updatedAt` |
| Re-save a removed place | Append to `bookmarks[]` | Same fields as Save place with a new ID |
| Submit quote request | Append to `quoteRequests[]` | `id, userId, businessId, serviceType, details, zipCode, preferredDate, status: 'submitted', createdAt` |
| Archive quote request | Same `quoteRequests[]` ID | `status: 'archived', archivedAt, updatedAt` |
| Confirm reservation | Append to `reservations[]` | `id, userId, businessId, date, time, partySize, guestName, email, phone, notes, confirmationCode, status: 'confirmed', createdAt` |
| Modify reservation | Same `reservations[]` ID | `date, time, partySize, updatedAt` |
| Cancel reservation | Same `reservations[]` ID | `status: 'cancelled', cancelledAt, updatedAt` |

Drafts, validation, filter state, navigation and derived status labels do not write to the stored world.
