# Yelp account state model

The proposed state below is the full JSON object returned by `createInitialData()`. Publish the implemented equivalent in `SCHEMA.md`, including all mutation fields from [TODO.md](../TODO.md).

## Top-level keys

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
| `imagePath?` | local path | `/art/restaurant-hearth.webp` |
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

## Suggested fixed seed

- **12 users**, including Maya Chen as `usr_maya` and 11 other reviewer identities. Give only synthetic contact details with `example.test` email and reserved 555-01xx phone numbers.
- **48 businesses** across Portland neighborhoods such as Sellwood, Alberta, Hawthorne and St. Johns. Include at least 16 bookable restaurants, 16 quote-enabled services, and 16 other or action-ineligible listings. Vary hours, party sizes, categories, prices and ratings. Harbor QA can use Juniper Hearth for a new booking and Riverbend Home Care for a new quote.
- **56 reviews**, 26 owned by Maya, including at least two removed. Include positive, mixed and critical reviews and several businesses with no published reviews. Leave some businesses without a Maya review for the posting flow.
- **6 collections** owned by Maya, including Want to go, Sunday breakfast, Patio tables, Home projects, plus two more. Keep one empty. **32 bookmarks** cover popular categories and neighborhoods, with three removals and some businesses present across more than one collection.
- **26 quote requests** split between submitted and archived, with several amounts, different service types, ZIPs and missing preferred dates. Do not derive any state changes from scheduled events.
- **28 reservations** with a mixture of cancellations and confirmations spread across past and future fixed dates relative to 2026-11-18. Include at least one known open venue/slot and no overlapping confirmed bookings for the same business/date/time. Tests should select newly booked dates relative to the browser's clock so they work outside the seed's date range.
