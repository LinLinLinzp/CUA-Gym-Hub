# Airbnb state schema

The application loads `createInitialData()` through the unchanged Harbor data manager and state API. The complete JSON state is persisted after user actions only. `GET /go?sid=<session>` exposes `initial_state`, `current_state`, and top-level `state_diff` entries. Arrays injected via `/state` replace defaults; objects merge recursively.

The shapes and catalog below are the implementation contract. Listing ratings, availability, review windows, host statistics, map positions and totals are derived. Form drafts, open overlays, upload previews, map position and toasts are UI state.

## Observable State Changes


| User action | Key(s) written | Record / fields |
|---|---|---|
| Submit search / apply filters | `searchHistory` | new or updated `{query, destinationId, checkIn, checkOut, flexible, guests, filters, resultCount, createdAt}` |
| Toggle "Display total before taxes" | `preferences` | `displayTotalBeforeTaxes` |
| Open a listing from a card | `recentlyViewed` | `{listingId, viewedAt}` unshift |
| Confirm and pay / Request to book | `reservations`, `conversations`, `messages`, `notifications`, (`paymentMethods`, `currentUser.phone`) | new reservation (status `confirmed`/`pending`, priceBreakdown, amountPaid, paymentMethodId, conversationId, createdAt); new or converted conversation; system + text messages; booking notification |
| Cancel reservation | `reservations`, `messages`, `conversations`, `notifications` | `status:'cancelled'`, `cancellation{cancelledBy, reason, refundAmount, refundTier, cancelledAt}` |
| Withdraw request | `reservations`, `messages`, `conversations` | `status:'withdrawn'`, `cancellation{…}` |
| Open thread (click) / mark read | `messages`, `conversations` | `readAt`, `unreadCount:0` |
| Mark unread / star / archive | `messages`, `conversations` | `readAt:null` / `starred` / `archived` |
| Send message (with or without photo) | `messages`, `conversations` | new message `{senderId:'user_001', body, attachments, createdAt}`; `lastMessageAt` |
| React / edit / unsend / translate | `messages` | `reactions[]` / `body, editedAt` / `deletedAt` / `translated` |
| Message host (inquiry) | `conversations`, `messages` | new `type:'inquiry'` conversation + message |
| Submit review | `reviews`, `notifications` | new review `{type:'guest_to_listing', reservationId, overall, ratings{6}, publicText, privateNote, status:'published', createdAt}` |
| Edit / delete review | `reviews` | fields + `updatedAt` / `status:'removed'` |
| Save to wishlist / move / remove / undo | `wishlists` | `items[]` `{listingId, addedAt, note}`, `updatedAt` |
| Create wishlist | `wishlists` | new `{id, name, items, createdAt}` |
| Rename / delete wishlist | `wishlists` | `name`, `updatedAt` / removed |
| Wishlist dates / guests / item note | `wishlists` | `checkIn, checkOut` / `guests` / `items[j].note` |
| Remove / clear recently viewed | `recentlyViewed` | item removed / `[]` |
| Notification read / all read / delete | `notifications` | `read:true` / removed |
| Edit profile | `currentUser` | `about, work, languages, location` |
| (P2) Experience/service booking, cancel | `experienceBookings`, `experiences`/`services` | booking record; `slots[].spotsLeft` |
| (P2) Change reservation | `reservations`, `messages` | `alterations[]` + new dates/guests/price |
| (P2) Personal info / payments / preferences | `currentUser`, `paymentMethods`, `preferences` | edited fields |
| (P2) Report listing | `reports` | `{listingId, reason, details, createdAt}` |


| User action | Key(s) written | Fields / record created |
|---|---|---|
| Invite wishlist collaborator | `wishlists` | `collaboratorIds[]` receives `pending:<email>`, `updatedAt` |
| Upload profile photo | `currentUser` | `avatarUrl` receives `/files/<sid>/<name>` |
| Change language, currency, translation or time zone | `preferences` | `language`, `currency`, `translateAutomatically`, `timeZone`; conversion is display-only |
| Change notification settings | `preferences` | `notifications.<setting>` boolean |
| Add / default / remove payment method | `paymentMethods` | Safe card metadata only, `isDefault`, or removal. Full card numbers and CVV are never persisted. |
| Change account contact information | `currentUser` | `firstName`, `lastName`, `preferredName`, `phone`, `email`, `address`, `emergencyContact` |

New searches also carry `actorId:'user_001'`. New booking notifications carry `actorId:'user_001'`. New alteration records carry `actorId:'user_001'`. New messages include `attachments`, `reactions`, `readAt`, `editedAt`, `deletedAt`, and `translated` where applicable. All business timestamps are ISO strings. Cancellation stores `refundAmount`, `nonRefundedAmount`, `refundTier`, `cancelledBy`, `reason`, `reasonText`, `note`, and `cancelledAt`.

Services additionally have `slots:[{id,date,time,spotsLeft}]`. Service bookings use `{id,kind:'service',serviceId,slotId,guestId,guests,total,status,createdAt,cancelledAt?}`; experience bookings use `kind:'experience'` and `experienceId`. Cancelling either restores the matching slot’s capacity. `reports` starts as `[]`; submitted records are `{id,listingId,reporterId,reason,details,createdAt}`.

## Record shapes and seed catalog

### Data model reference

> The state is one JSON object. It is persisted by `templates/dataManager.js` (`loadState` / `saveState`) and
> served by `templates/state-api.js` (`/state`, `/post`, `/go`).
> `seed.js` is imported by **both** `vite.config.js` (Node) and the browser. Keep it pure JS: no `window`, no
> `localStorage`, no image imports. Photos are plain string paths such as `/images/listings/cabin-ext-04.jpg`.

## 0. Conventions

- **IDs are fixed strings** in the seed: `user_001`, `lst_001`, `res_001`, `conv_001`, `msg_0001`, `rev_0001`, `wl_001`, `pm_001`, `ntf_001`, `srch_001`.
- **New IDs** (created by user actions) use `genId(prefix)`, which returns `${prefix}_${Math.random().toString(36).slice(2,10)}`.
  - The runtime freezes the clock, so `Date.now()` is **not** unique. Never build IDs from time alone.
- **Dates**:
  - Calendar dates are `'YYYY-MM-DD'` strings (check-in/check-out, blocked ranges).
  - Timestamps are ISO strings (`createdAt`, `sentAt`).
  - All seed dates are **relative to `new Date()`**, via these helpers (local time):
    ```js
    const DAY = 86400000
    const pad = n => String(n).padStart(2, '0')
    export const ymd = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`
    export const daysFromNow = n => { const d = new Date(); d.setHours(12,0,0,0); return ymd(new Date(d.getTime() + n*DAY)) }
    export const isoDaysAgo = (n, hour = 10, min = 0) => { const d = new Date(); d.setDate(d.getDate() - n); d.setHours(hour, min, 0, 0); return d.toISOString() }
    ```
- **Money**:
  - Amounts are **numbers rounded to 2 decimals**: `round2 = x => Math.round(x*100)/100`.
  - Currency is `'USD'` everywhere. Format with `Intl.NumberFormat('en-US',{style:'currency',currency:'USD'})`.
  - Card prices hide cents (`$1,128`). Breakdowns show cents (`$160.18`).
- **Actor**: every business record carries the acting user id: `guestId`, `authorId`, `senderId`, `cancelledBy` or `ownerId`.
- **Robustness**:
  - Every optional field may be missing in an injected world. Guard with `?.` and `?? []`.
  - Ratings and counts are **derived from `reviews`**, never stored on the listing. This keeps injected worlds consistent.

## 1. Top-level keys

```js
export function createInitialData() {
  return {
    currentUser,          // object: the signed-in guest (Emily Carter)
    users,                // array: hosts (24) + reviewers (40) + Airbnb Support (1) = 65
    destinations,         // array: 12 searchable places (with map centre)
    categories,           // array: 16 icon-bar categories
    amenities,            // array: amenity catalog (id, label, group, icon)
    listings,             // array: 60 stays
    reviews,              // array: ~290 (guest→listing ~285, host→guest 5) + Emily's own
    reservations,         // array: 17 of Emily's trips (all statuses)
    conversations,        // array: 14 threads
    messages,             // array: ~75 messages
    wishlists,            // array: 5 lists with items
    recentlyViewed,       // array: 10 {listingId, viewedAt}
    searchHistory,        // array: 4 recent searches
    paymentMethods,       // array: 3
    notifications,        // array: 8
    experiences,          // array: 12 (P2 Experiences tab)
    services,             // array: 8 (P2 Services tab)
    experienceBookings,   // array: 1 (P2)
    reports,              // array: 0 (P2) {id, listingId, reporterId:'user_001', reason, details, createdAt}
    preferences,          // object: currency, language, displayTotalBeforeTaxes, notifications
  }
}
```

Arrays injected by a task **replace** the defaults; objects (`currentUser`, `preferences`) **merge**. This is the default `mergeWithDefaults` behaviour.

---

## 2. currentUser

```js
currentUser: {
  id: 'user_001',
  firstName: 'Emily', lastName: 'Carter', preferredName: 'Emily',
  email: 'emily.carter@example.com',
  phone: '+1 (415) 555-0142',
  avatarColor: '#A61D55',          // rendered as an SVG circle with the initial "E"
  avatarUrl: null,                 // set when the user uploads a profile photo (P2, via /upload)
  location: 'San Francisco, CA',
  joinedAt: '2019-03-14',
  about: 'Product designer who loves cabins, long hikes and slow mornings. Always travelling with a good book.',
  work: 'Product designer at Lumen Studio',
  languages: ['English', 'Spanish'],
  school: 'UC Berkeley',
  identityVerified: true,
  address: { street: '1458 Guerrero St', city: 'San Francisco', state: 'CA', zip: '94110', country: 'United States' },
  emergencyContact: { name: 'James Carter', relationship: 'Brother', phone: '+1 (510) 555-0199' },
  travelCredit: 0,
}
```

## 3. users

```js
{ id, firstName, lastName, avatarColor, role: 'host'|'guest'|'support', location, joinedAt: 'YYYY-MM-DD',
  // host-only (optional):
  isSuperhost: bool, responseRate: 0..100, responseTimeText: 'within an hour'|'within a few hours'|'within a day',
  languages: [...], about: string, work?: string, yearsHosting: number, verified: true }
```

### Hosts (24)

| id | name | location | Superhost | joined | resp. | notes |
|---|---|---|---|---|---|---|
| user_101 | Michael Brennan | Truckee, CA | ✔ | 2016-05-02 | 100%, within an hour | Ski patrol veteran |
| user_102 | Sarah Lindqvist | Tahoe City, CA | | 2019-08-11 | 96%, within a few hours | |
| user_103 | Daniel Ortiz | Joshua Tree, CA | ✔ | 2015-02-20 | 100%, within an hour | Architect |
| user_104 | Jenna Walsh | Yucca Valley, CA | | 2020-01-09 | 92%, within a day | |
| user_105 | Kai Nakamura | Malibu, CA | ✔ | 2014-06-30 | 100%, within an hour | Surfer |
| user_106 | Olivia Grant | Santa Monica, CA | | 2018-04-15 | 98%, within a few hours | |
| user_107 | Tom Whitaker | Asheville, NC | ✔ | 2017-09-03 | 100%, within an hour | Woodworker |
| user_108 | Rachel Greene | Black Mountain, NC | | 2021-03-22 | 95%, within a few hours | |
| user_109 | Marcus Bell | Austin, TX | ✔ | 2016-11-12 | 99%, within an hour | |
| user_110 | Priya Shah | Dripping Springs, TX | | 2019-05-27 | 97%, within a few hours | |
| user_111 | Carlos Mendez | Miami Beach, FL | | 2020-07-08 | 90%, within a day | |
| user_112 | Isabella Rossi | Miami, FL | ✔ | 2015-10-19 | 100%, within an hour | |
| user_113 | David Kim | Brooklyn, NY | ✔ | 2016-02-14 | 100%, within an hour | |
| user_114 | Hannah Cohen | New York, NY | | 2018-09-01 | 94%, within a few hours | |
| user_115 | Camille Laurent | Paris, France | ✔ | 2015-04-04 | 100%, within an hour | Speaks French and English |
| user_116 | Julien Moreau | Paris, France | | 2020-10-30 | 91%, within a day | |
| user_117 | Inês Ferreira | Lisbon, Portugal | ✔ | 2017-06-18 | 100%, within an hour | |
| user_118 | Sofia Hernández | Tulum, Mexico | ✔ | 2018-01-25 | 99%, within an hour | |
| user_119 | Liam MacKenzie | Canmore, Canada | ✔ | 2016-12-05 | 100%, within an hour | |
| user_120 | Grace Whitfield | Hudson, NY | | 2019-02-17 | 96%, within a few hours | |
| user_121 | Mateus Silva | Lisbon, Portugal | | 2021-08-09 | 93%, within a few hours | |
| user_122 | Diego Ramírez | Tulum, Mexico | | 2022-02-14 | 89%, within a day | |
| user_123 | Chloe Tremblay | Banff, Canada | ✔ | 2018-11-21 | 100%, within an hour | |
| user_124 | Ben Adler | Woodstock, NY | | 2020-05-03 | 97%, within a few hours | |

`yearsHosting` = current year − joined year, computed at render.

### Reviewers (40)
`user_201`…`user_240` are guests with `role:'guest'`, `firstName`, `location` and `joinedAt`. Use these names in order:

Ava, Noah, Mia, Ethan, Sophia, Lucas, Isabella, Mason, Harper, Logan, Amelia, Jackson, Evelyn, Aiden, Abigail, Elijah, Ella, James, Scarlett, Benjamin, Chloe, Henry, Grace, Sebastian, Lily, Owen, Zoe, Daniel, Nora, Matthew, Hannah, Leo, Aria, Samuel, Layla, Julian, Riley, Gabriel, Stella, Wyatt.

Surnames are optional. Locations cycle through: Seattle, WA · Denver, CO · Chicago, IL · Toronto, Canada · London, UK · Boston, MA · Portland, OR · Atlanta, GA · Sydney, Australia · Berlin, Germany.

### Support
`user_900` Airbnb Support (`role:'support'`, avatarColor `#FF385C`).

---

## 4. destinations (search suggestions + map centres)

```js
{ id:'dst_tahoe', name:'Lake Tahoe', region:'California', country:'United States', lat:39.0968, lng:-120.0324,
  blurb:'For nature-lovers', slug:'Lake-Tahoe--CA' }
```

| id | name | region | country | lat,lng | slug | suggestion subtitle |
|---|---|---|---|---|---|---|
| dst_tahoe | Lake Tahoe | California | United States | 39.0968,-120.0324 | Lake-Tahoe--CA | For nature-lovers |
| dst_joshua | Joshua Tree | California | United States | 34.1347,-116.3131 | Joshua-Tree--CA | For its stunning architecture |
| dst_malibu | Malibu | California | United States | 34.0259,-118.7798 | Malibu--CA | Popular beach destination |
| dst_asheville | Asheville | North Carolina | United States | 35.5951,-82.5515 | Asheville--NC | For its fall foliage |
| dst_austin | Austin | Texas | United States | 30.2672,-97.7431 | Austin--TX | For its bustling nightlife |
| dst_miami | Miami | Florida | United States | 25.7907,-80.1300 | Miami--FL | Popular beach destination |
| dst_nyc | New York | New York | United States | 40.7128,-74.0060 | New-York--NY | For sights like Central Park |
| dst_paris | Paris | Île-de-France | France | 48.8566,2.3522 | Paris--France | For sights like Eiffel Tower |
| dst_lisbon | Lisbon | Lisbon | Portugal | 38.7223,-9.1393 | Lisbon--Portugal | For its seaside allure |
| dst_tulum | Tulum | Quintana Roo | Mexico | 20.2114,-87.4654 | Tulum--Mexico | For its top-notch dining |
| dst_banff | Banff | Alberta | Canada | 51.1784,-115.5708 | Banff--Canada | For nature-lovers |
| dst_catskills | Catskills | New York | United States | 42.0400,-74.3000 | Catskills--NY | Great for a weekend getaway |

Search matching is case-insensitive on `destination.name`, `region`, `country`, `listing.city` and `listing.title`.
- "California" → 15 listings.
- "United States" → 40 listings.
- "Anywhere" → all 60.

---

## 5. categories (icon bar)

```js
{ id:'cabins', label:'Cabins', icon:'<lucide name>' }
```

Order and icons (lucide-react):

| id | label | icon |
|---|---|---|
| trending | Trending | `Flame` |
| cabins | Cabins | `TreePine` |
| beachfront | Beachfront | `Umbrella` |
| amazing_pools | Amazing pools | `Waves` |
| tiny_homes | Tiny homes | `House` |
| treehouses | Treehouses | `Trees` |
| a_frames | A-frames | `Triangle` |
| lakefront | Lakefront | `Sailboat` |
| desert | Desert | `Sun` |
| design | Design | `Gem` |
| countryside | Countryside | `Wheat` |
| farms | Farms | `Tractor` |
| iconic_cities | Iconic cities | `Building2` |
| skiing | Skiing | `Mountain` |
| omg | OMG! | `Sparkles` |
| rooms | Rooms | `BedDouble` |

---

## 6. amenities catalog

```js
{ id:'wifi', label:'Wifi', group:'essentials'|'features'|'location'|'safety', icon:'Wifi' }
```

| group | ids (label) |
|---|---|
| essentials | `wifi` (Wifi), `kitchen` (Kitchen), `washer` (Washer), `dryer` (Dryer), `air_conditioning` (Air conditioning), `heating` (Heating), `dedicated_workspace` (Dedicated workspace), `tv` (TV), `hair_dryer` (Hair dryer), `iron` (Iron) |
| features | `pool` (Pool), `hot_tub` (Hot tub), `free_parking` (Free parking on premises), `ev_charger` (EV charger), `crib` (Crib), `king_bed` (King bed), `gym` (Gym), `bbq_grill` (BBQ grill), `breakfast` (Breakfast), `indoor_fireplace` (Indoor fireplace), `smoking_allowed` (Smoking allowed), `sauna` (Sauna), `fire_pit` (Fire pit) |
| location | `beachfront` (Beachfront), `waterfront` (Waterfront), `ski_in_out` (Ski-in/ski-out), `lake_access` (Lake access) |
| safety | `smoke_alarm` (Smoke alarm), `carbon_monoxide_alarm` (Carbon monoxide alarm), `first_aid_kit` (First aid kit), `fire_extinguisher` (Fire extinguisher) |

- **Base amenities** on every listing: `wifi, heating, hair_dryer, smoke_alarm, carbon_monoxide_alarm, fire_extinguisher`.
- **Extras** are given per listing in §7.
- The listing page shows **"Not included"** items struck through. These are any of `washer, air_conditioning, smoke_alarm, carbon_monoxide_alarm, tv` that are missing.

---

## 7. listings (60)

### Shape

```js
{
  id: 'lst_001',
  hostId: 'user_101',
  destinationId: 'dst_tahoe',
  title: 'Cozy Pine Cabin w/ Hot Tub, Walk to Heavenly',   // listing name (H1 on the listing page)
  propertyType: 'cabin',            // house|cabin|apartment|condo|loft|villa|cottage|guesthouse|treehouse|tiny_home|farm_stay|room
  propertyTypeGroup: 'house',       // filter card: house|apartment|guesthouse|hotel
  roomType: 'entire_home',          // entire_home|private_room
  city: 'South Lake Tahoe', region: 'California', country: 'United States',
  neighborhood: 'Bijou',            // card subtitle on search: "Cabin in South Lake Tahoe"
  address: '1047 Ski Run Blvd, South Lake Tahoe, CA 96150',  // shown only after booking
  lat: 38.9391, lng: -119.9497,
  maxGuests: 6, bedrooms: 3, beds: 4, bathrooms: 2, sharedBath: false,
  bedArrangement: [ {room:'Bedroom 1', beds:'1 king bed'}, {room:'Bedroom 2', beds:'1 queen bed'}, {room:'Bedroom 3', beds:'2 single beds'} ],
  nightlyPrice: 289, cleaningFee: 150, taxRate: 0.10,  // decimal
  weeklyDiscountPct: 10, monthlyDiscountPct: 20,        // 0 when none
  petFee: 0,                         // flat per stay when pets > 0
  minNights: 2,
  cancellationPolicy: 'moderate',    // flexible|moderate|limited|firm|strict
  nonRefundableOption: true,         // offer the non-refundable rate (10% off nightly) at checkout
  instantBook: true, selfCheckIn: true, allowsPets: false,
  guestFavorite: true, luxe: false,
  categories: ['cabins','trending','skiing'],
  amenities: [...base, 'kitchen','washer','dryer','hot_tub','free_parking','indoor_fireplace','bbq_grill','tv','king_bed'],
  photos: ['/images/listings/cabin-ext-04.jpg', ...],  // 7 paths; see photo rule
  photoCaptions: ['Exterior','Living room','Bedroom 1','Kitchen','Full bathroom','Bedroom 2','Outdoor space'],
  description: 'Tucked among tall Jeffrey pines, ...',  // 2–3 paragraphs separated by \n\n
  highlights: [ {icon:'DoorOpen', title:'Self check-in', text:'Check yourself in with the keypad.'}, ... ], // 3 items
  houseRules: { checkInFrom:'16:00', checkOutBy:'10:00', quietHours:'22:00–07:00', smoking:false, parties:false, petsAllowed:false, additional:['No shoes inside'] },
  safetyNotes: ['Carbon monoxide alarm', 'Smoke alarm', 'Exterior security camera on driveway'],
  languages: ['English'],
  blockedRanges: [ {start: daysFromNow(9), end: daysFromNow(12)}, {start: daysFromNow(33), end: daysFromNow(37)} ], // host-blocked, end exclusive
  createdAt: '2016-07-14',
  isNew: false,                      // shows "New" instead of a rating; set on 3 listings that have 0 reviews
}
```

### Derived values (never stored)
- `rating(listing)`: the mean of `overall` over published `guest_to_listing` reviews for this listing, to 2 decimals. Show `★ 4.92` with no trailing zero. With 0 reviews, show `New`.
- `reviewCount(listing)`, `categoryAverages(listing)`, and `isSuperhost = users[hostId].isSuperhost`.
- `unavailableNights(listing)` = `blockedRanges` ∪ ranges of `reservations` on that listing with status `confirmed|pending`.

### Photo rule (seed helper)

```js
const POOL = {
  living:   ['living-01','living-02','living-03','living-05','aframe-03','aframe-04','aframe-05','aframe-06','loft-02','loft-03','loft-04','desert-06'],
  bedroom:  ['bedroom-01','bedroom-02','bedroom-03','bedroom-04','bedroom-05','bedroom-06','bedroom-07','bedroom-08','bedroom-21','bedroom-22','bedroom-23','bedroom-24','bedroom-25'],
  kitchen:  ['kitchen-01','kitchen-02','kitchen-04','kitchen-06','kitchen-07','kitchen-20','aframe-20'],
  bathroom: ['bathroom-01','bathroom-02','bathroom-04','bathroom-05'],
  outdoor:  ['patio-01','patio-02','patio-04','patio-06','patio-20','pool-01','spa-01','lake-03','treehouse-20','beach-ext-06'],
}
const p = n => `/images/listings/${n}.jpg`
function buildPhotos(i, hero) {             // i = 0-based listing index
  const picks = [hero, POOL.living[i % 12], POOL.bedroom[i % 13], POOL.kitchen[i % 7], POOL.bathroom[i % 4],
                 POOL.bedroom[(i + 6) % 13], POOL.outdoor[i % 10]]
  return [...new Set(picks)].map(p)          // de-dupe if hero equals a pool pick
}
```

### Catalog (authoritative: dev transcribes this into `seed.js`)

Column key:
- **G/BR/B/BA**: maxGuests / bedrooms / beds / bathrooms (0 bedrooms = studio).
- **Pol**: cancellation policy.
- **IB**: instant book.
- **GF**: guest favorite.
- **SC**: self check-in.
- **Pets**: allowsPets.
- **Extras**: amenities added to the base set.

| id | host | dest | city | type / roomType | title | G/BR/B/BA | $/night | clean | tax | Pol | IB | GF | SC | Pets | hero | categories | Extras |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| lst_001 | user_101 | tahoe | South Lake Tahoe | cabin / entire | Cozy Pine Cabin w/ Hot Tub, Walk to Heavenly | 6/3/4/2 | 289 | 150 | .10 | moderate | ✔ | ✔ | ✔ | | cabin-ext-04 | cabins, trending, skiing | kitchen washer dryer hot_tub free_parking indoor_fireplace bbq_grill tv king_bed |
| lst_002 | user_101 | tahoe | Tahoe City | house / entire | Lakefront Modern Retreat with Private Dock | 10/4/5/3.5 | 845 | 300 | .10 | strict | | ✔ | | | lake-02 | lakefront, omg | kitchen washer dryer hot_tub free_parking indoor_fireplace waterfront lake_access king_bed tv dedicated_workspace ev_charger |
| lst_003 | user_102 | tahoe | Tahoma | cabin / entire | Classic A-Frame in the Pines | 4/2/2/1 | 219 | 95 | .10 | flexible | ✔ | | ✔ | ✔ | aframe-ext-01 | a_frames, cabins | kitchen free_parking indoor_fireplace fire_pit |
| lst_004 | user_102 | tahoe | Kings Beach | house / entire | Lakeview Family Home, Steps to Beach | 8/3/4/2 | 395 | 175 | .10 | moderate | ✔ | | | ✔ | lake-06 | lakefront | kitchen washer dryer free_parking crib bbq_grill tv lake_access |
| lst_005 | user_102 | tahoe | Incline Village | condo / entire | Ski-in Studio near Diamond Peak | 2/0/1/1 | 149 | 60 | .10 | flexible | ✔ | | ✔ | | bedroom-07 | skiing | kitchen ski_in_out tv gym |
| lst_006 | user_103 | joshua | Joshua Tree | house / entire | Boulder House: Desert Modern Hideaway | 4/2/2/2 | 410 | 150 | .12 | firm | ✔ | ✔ | ✔ | | desert-01 | desert, design, omg | kitchen air_conditioning hot_tub free_parking king_bed fire_pit dedicated_workspace |
| lst_007 | user_103 | joshua | Yucca Valley | house / entire | Color Block Casitas with Stargazing Deck | 6/3/3/2 | 265 | 120 | .12 | moderate | ✔ | ✔ | ✔ | ✔ | desert-02 | design, desert, trending | kitchen air_conditioning washer free_parking fire_pit bbq_grill |
| lst_008 | user_104 | joshua | Joshua Tree | house / entire | Cowboy Pool Oasis, 5 min to Park | 6/3/3/2 | 335 | 140 | .12 | moderate | | | ✔ | ✔ | desert-03 | amazing_pools, desert | kitchen air_conditioning pool hot_tub free_parking bbq_grill tv |
| lst_009 | user_104 | joshua | Pioneertown | house / entire | Rock Garden Ranch on 5 Acres | 8/4/4/3 | 480 | 200 | .12 | strict | | ✔ | | ✔ | desert-04 | desert, countryside | kitchen air_conditioning washer dryer free_parking fire_pit ev_charger king_bed |
| lst_010 | user_103 | joshua | Twentynine Palms | house / entire | Infinity Edge Desert Retreat | 4/2/2/2 | 520 | 180 | .12 | firm | ✔ | | ✔ | | desert-05 | desert, amazing_pools, design | kitchen air_conditioning pool hot_tub free_parking king_bed |
| lst_011 | user_105 | malibu | Malibu | house / entire | Oceanfront Glass House on Carbon Beach | 8/4/4/4.5 | 1450 | 400 | .14 | strict | | ✔ | | | beach-ext-02 | beachfront, omg | kitchen washer dryer air_conditioning beachfront pool hot_tub free_parking king_bed gym tv dedicated_workspace (luxe: true) |
| lst_012 | user_105 | malibu | Malibu | cottage / entire | Sunset Point Cottage with Ocean Deck | 4/2/2/1 | 395 | 150 | .14 | moderate | ✔ | ✔ | ✔ | | beach-ext-03 | beachfront | kitchen washer beachfront free_parking bbq_grill |
| lst_013 | user_106 | malibu | Malibu | house / entire | Modern Beach House, Zuma Views | 10/5/6/4 | 975 | 350 | .14 | firm | | | | | beach-ext-01 | beachfront, design | kitchen washer dryer air_conditioning beachfront hot_tub free_parking king_bed tv |
| lst_014 | user_106 | malibu | Malibu | guesthouse / entire | Canyon Guest Suite near Point Dume | 2/1/1/1 | 185 | 75 | .14 | flexible | ✔ | ✔ | ✔ | ✔ | patio-02 | countryside | kitchen free_parking dedicated_workspace breakfast |
| lst_015 | user_106 | malibu | Malibu | house / entire | Beach Cottage, Steps to the Sand | 6/3/3/2 | 560 | 200 | .14 | moderate | ✔ | | ✔ | | beach-ext-20 | beachfront | kitchen washer dryer beachfront free_parking bbq_grill crib |
| lst_016 | user_107 | asheville | Asheville | treehouse / entire | Blue Ridge Treehouse with Wraparound Deck | 2/1/1/1 | 245 | 85 | .13 | moderate | ✔ | ✔ | ✔ | | treehouse-04 | treehouses, omg | kitchen free_parking hot_tub king_bed |
| lst_017 | user_107 | asheville | Asheville | cabin / entire | Mountain Cabin w/ Hot Tub & Fire Pit | 6/3/3/2 | 279 | 125 | .13 | moderate | ✔ | ✔ | ✔ | ✔ | cabin-ext-02 | cabins, trending | kitchen washer dryer hot_tub fire_pit free_parking indoor_fireplace tv king_bed |
| lst_018 | user_108 | asheville | Weaverville | tiny_home / entire | Modern Tiny Home in the Woods | 2/1/1/1 | 139 | 50 | .13 | flexible | ✔ | ✔ | ✔ | | tiny-04 | tiny_homes | kitchen free_parking fire_pit |
| lst_019 | user_108 | asheville | Black Mountain | treehouse / entire | Hidden Forest Treehouse Castle | 4/1/2/1 | 315 | 100 | .13 | limited | | | | | treehouse-01 | treehouses, omg | kitchen free_parking |
| lst_020 | user_107 | asheville | Asheville | cabin / entire | Fall Colors Cabin near Blue Ridge Pkwy | 4/2/2/1 | 189 | 90 | .13 | flexible | ✔ | | ✔ | ✔ | cabin-ext-03 | cabins, countryside | kitchen washer free_parking indoor_fireplace |
| lst_021 | user_109 | austin | Austin | loft / entire | East Austin Industrial Loft | 4/1/2/1 | 210 | 80 | .15 | moderate | ✔ | ✔ | ✔ | ✔ | loft-02 | trending, design, iconic_cities | kitchen washer dryer air_conditioning dedicated_workspace tv free_parking |
| lst_022 | user_109 | austin | Austin | house / entire | Hill Country Pool House w/ Outdoor Kitchen | 10/4/6/3 | 640 | 250 | .15 | strict | | | | | pool-01 | amazing_pools | kitchen washer dryer air_conditioning pool hot_tub bbq_grill free_parking gym tv |
| lst_023 | user_110 | austin | Dripping Springs | farm_stay / entire | Farmhouse on 20 Acres near Wineries | 8/4/5/3 | 425 | 180 | .15 | moderate | ✔ | ✔ | | ✔ | farm-02 | farms, countryside | kitchen washer dryer air_conditioning free_parking bbq_grill fire_pit crib breakfast |
| lst_024 | user_110 | austin | Austin | loft / entire | South Congress Designer Loft | 3/1/2/1.5 | 245 | 95 | .15 | flexible | ✔ | | ✔ | | loft-04 | design, iconic_cities | kitchen washer air_conditioning dedicated_workspace tv |
| lst_025 | user_109 | austin | Austin | tiny_home / entire | Backyard Tiny House by Lady Bird Lake | 2/1/1/1 | 119 | 45 | .15 | flexible | ✔ | | ✔ | ✔ | tiny-01 | tiny_homes | kitchen air_conditioning |
| lst_026 | user_112 | miami | Miami Beach | villa / entire | Bayfront Villa with Heated Pool | 12/6/7/5 | 1250 | 450 | .13 | strict | | ✔ | | | villa-01 | amazing_pools, omg | kitchen washer dryer air_conditioning pool hot_tub waterfront free_parking gym king_bed tv (luxe: true) |
| lst_027 | user_111 | miami | Miami Beach | condo / entire | Oceanview Condo with Balcony | 4/1/2/1 | 235 | 110 | .13 | moderate | ✔ | | ✔ | | beach-ext-04 | beachfront | kitchen air_conditioning pool gym beachfront tv |
| lst_028 | user_112 | miami | Miami | house / entire | Coconut Grove Pool Bungalow | 6/3/3/2 | 389 | 160 | .13 | moderate | ✔ | ✔ | ✔ | ✔ | villa-pool-07 | amazing_pools | kitchen washer dryer air_conditioning pool bbq_grill free_parking |
| lst_029 | user_111 | miami | Miami Beach | condo / entire | South Beach Art Deco Studio | 2/0/1/1 | 159 | 70 | .13 | flexible | ✔ | | ✔ | | bedroom-03 | trending, iconic_cities | kitchen air_conditioning tv |
| lst_030 | user_112 | miami | Key Biscayne | house / entire | Beach House with Private Path to Sand | 8/4/4/3 | 690 | 250 | .13 | firm | | | | ✔ | beach-ext-07 | beachfront | kitchen washer dryer air_conditioning beachfront free_parking bbq_grill crib |
| lst_031 | user_113 | nyc | Brooklyn | loft / entire | Williamsburg Sun-Drenched Loft | 4/2/2/1 | 289 | 100 | .148 | moderate | ✔ | ✔ | ✔ | | loft-03 | trending, iconic_cities, design | kitchen washer dryer air_conditioning dedicated_workspace tv |
| lst_032 | user_114 | nyc | New York | room / private_room | Private Room in Upper West Side Brownstone | 2/1/1/1 (shared) | 129 | 35 | .148 | flexible | ✔ | ✔ | | | bedroom-01 | rooms, iconic_cities | kitchen air_conditioning breakfast |
| lst_033 | user_113 | nyc | New York | apartment / entire | Chelsea 1BR with Skyline Views | 3/1/1/1 | 265 | 95 | .148 | strict | ✔ | | ✔ | | living-05 | iconic_cities | kitchen washer dryer air_conditioning gym tv dedicated_workspace |
| lst_034 | user_114 | nyc | Brooklyn | apartment / entire | Park Slope Garden Apartment | 4/2/2/1 | 219 | 85 | .148 | moderate | | ✔ | | ✔ | patio-01 | iconic_cities | kitchen washer air_conditioning crib |
| lst_035 | user_114 | nyc | Queens | room / private_room | Cozy Room near Astoria Park | 2/1/1/1 (shared) | 89 | 25 | .148 | flexible | ✔ | | ✔ | | bedroom-23 | rooms | kitchen air_conditioning |
| lst_036 | user_115 | paris | Paris | apartment / entire | Haussmann Apartment near Le Marais | 4/2/2/1 | 310 | 90 | .05 | moderate | ✔ | ✔ | ✔ | | living-01 | iconic_cities, trending | kitchen washer dedicated_workspace tv |
| lst_037 | user_116 | paris | Paris | apartment / entire | Montmartre Studio with Balcony | 2/0/1/1 | 165 | 60 | .05 | flexible | ✔ | | ✔ | | bedroom-24 | iconic_cities | kitchen washer |
| lst_038 | user_115 | paris | Paris | loft / entire | Canal Saint-Martin Designer Loft | 4/2/2/1.5 | 285 | 85 | .05 | firm | | ✔ | | ✔ | living-02 | design, iconic_cities | kitchen washer dryer dedicated_workspace tv |
| lst_039 | user_116 | paris | Paris | room / private_room | Bright Room in Latin Quarter Flat | 1/1/1/1 (shared) | 95 | 25 | .05 | flexible | ✔ | | | | bedroom-05 | rooms | kitchen breakfast |
| lst_040 | user_115 | paris | Paris | apartment / entire | Eiffel View Penthouse Terrace | 6/3/3/2 | 720 | 200 | .05 | strict | | | | | patio-04 | omg, iconic_cities | kitchen washer dryer air_conditioning king_bed tv (luxe: true) |
| lst_041 | user_117 | lisbon | Lisbon | apartment / entire | Alfama Rooftop Apartment | 4/2/2/1 | 175 | 60 | .06 | moderate | ✔ | ✔ | ✔ | | patio-20 | iconic_cities, trending | kitchen washer air_conditioning dedicated_workspace |
| lst_042 | user_117 | lisbon | Cascais | villa / entire | Ocean Villa with Saltwater Pool | 10/5/6/5 | 890 | 300 | .06 | firm | | ✔ | | ✔ | beach-ext-06 | amazing_pools, beachfront | kitchen washer dryer air_conditioning pool free_parking bbq_grill king_bed |
| lst_043 | user_121 | lisbon | Lisbon | apartment / entire | Chiado Classic 2BR with Balcony | 5/2/3/2 | 199 | 70 | .06 | flexible | ✔ | | ✔ | | living-03 | iconic_cities | kitchen washer tv |
| lst_044 | user_121 | lisbon | Lisbon | loft / entire | LX Factory Industrial Loft | 3/1/2/1 | 145 | 55 | .06 | moderate | ✔ | | ✔ | ✔ | kitchen-07 | design | kitchen washer dedicated_workspace |
| lst_045 | user_121 | lisbon | Sintra | house / entire | Garden House near Pena Palace | 6/3/3/2 | 245 | 90 | .06 | moderate | | | | ✔ | farm-03 | countryside | kitchen washer free_parking indoor_fireplace bbq_grill |
| lst_046 | user_118 | tulum | Tulum | treehouse / entire | Jungle Treehouse with Plunge Pool | 2/1/1/1 | 265 | 70 | .16 | strict | ✔ | ✔ | ✔ | | treehouse-05 | treehouses, amazing_pools, omg | pool air_conditioning breakfast king_bed |
| lst_047 | user_118 | tulum | Tulum | villa / entire | Casa Selva: Private Cenote Villa | 8/4/4/4 | 780 | 250 | .16 | firm | | ✔ | | | spa-01 | amazing_pools, design | kitchen air_conditioning pool hot_tub free_parking breakfast king_bed (luxe: true) |
| lst_048 | user_122 | tulum | Tulum | condo / entire | Aldea Zama Rooftop Pool Condo | 4/2/2/2 | 155 | 65 | .16 | moderate | ✔ | | ✔ | | kitchen-06 | trending | kitchen air_conditioning pool gym dedicated_workspace |
| lst_049 | user_122 | tulum | Tulum | treehouse / entire | Bamboo Canopy Treehouse | 2/1/1/1 | 199 | 60 | .16 | moderate | ✔ | | ✔ | ✔ | treehouse-20 | treehouses | air_conditioning breakfast |
| lst_050 | user_122 | tulum | Tulum | house / entire | Beachfront Casa near the Ruins | 6/3/3/3 | 520 | 180 | .16 | strict | | | | | beach-ext-05 | beachfront | kitchen air_conditioning beachfront free_parking bbq_grill |
| lst_051 | user_119 | banff | Banff | cabin / entire | Mountain View Log Cabin | 6/3/3/2 | 365 | 150 | .09 | strict | ✔ | ✔ | ✔ | | cabin-ext-05 | cabins, skiing | kitchen washer dryer hot_tub indoor_fireplace free_parking tv |
| lst_052 | user_119 | banff | Canmore | cabin / entire | Modern Chalet with Hot Tub | 8/4/4/3 | 495 | 200 | .09 | firm | | ✔ | | ✔ | cabin-ext-07 | cabins, skiing, design | kitchen washer dryer hot_tub sauna indoor_fireplace free_parking ev_charger king_bed |
| lst_053 | user_123 | banff | Banff | cabin / entire | Snowy A-Frame near Lake Minnewanka | 4/2/2/1 | 275 | 110 | .09 | moderate | ✔ | | ✔ | | aframe-02 | a_frames, skiing | kitchen indoor_fireplace free_parking |
| lst_054 | user_123 | banff | Canmore | tiny_home / entire | Off-Grid Tiny Cabin with Views | 2/1/1/1 | 159 | 55 | .09 | flexible | ✔ | | ✔ | ✔ | tiny-03 | tiny_homes, countryside | kitchen fire_pit free_parking |
| lst_055 | user_119 | banff | Lake Louise | house / entire | Lakeside Lodge with Sauna | 10/5/6/4 | 820 | 300 | .09 | strict | | | | | lake-01 | lakefront, omg | kitchen washer dryer sauna hot_tub indoor_fireplace waterfront lake_access free_parking king_bed (luxe: true) |
| lst_056 | user_120 | catskills | Phoenicia | cabin / entire | Catskills A-Frame with Wood Stove | 4/2/2/1 | 235 | 95 | .08 | moderate | ✔ | ✔ | ✔ | ✔ | aframe-01 | a_frames, cabins, trending | kitchen indoor_fireplace fire_pit free_parking |
| lst_057 | user_120 | catskills | Hudson | farm_stay / entire | Restored 1880s Farmhouse | 8/4/5/2.5 | 410 | 175 | .08 | moderate | | ✔ | | ✔ | farm-01 | farms, countryside | kitchen washer dryer indoor_fireplace free_parking crib breakfast |
| lst_058 | user_124 | catskills | Woodstock | cabin / entire | Creekside Cabin with Sauna | 4/2/2/1 | 259 | 100 | .08 | firm | ✔ | | ✔ | | cabin-ext-06 | cabins | kitchen sauna fire_pit free_parking waterfront |
| lst_059 | user_124 | catskills | Saugerties | house / entire | Lakefront Modern with Kayaks | 6/3/3/2 | 375 | 140 | .08 | moderate | ✔ | | ✔ | | lake-04 | lakefront, design | kitchen washer dryer lake_access waterfront free_parking bbq_grill |
| lst_060 | user_124 | catskills | Livingston Manor | tiny_home / entire | Glass Tiny House in the Forest | 2/1/1/1 | 175 | 60 | .08 | flexible | ✔ | ✔ | ✔ | | tiny-05 | tiny_homes, design | kitchen fire_pit free_parking |

**Fields not shown in the table:**
- `luxe`: true only where marked.
- `isNew: true` on `lst_005`, `lst_025` and `lst_048`. These have zero reviews and show "New" in place of a rating.
- `selfCheckIn`: per the **SC** column.
- `minNights`: 2 by default; 3 for houses at $500 or more; 1 for rooms and tiny homes.
- `weeklyDiscountPct`: 10 for odd ids, 0 for even. `monthlyDiscountPct` is 20 where the weekly discount is 10.
- `petFee`: 75 where `allowsPets`.
- `nonRefundableOption`: true for every policy except `flexible`.
- `propertyTypeGroup`:
  - `apartment|condo|loft|room` → `apartment`
  - `guesthouse` → `guesthouse`
  - everything else → `house`
- Coordinates: jitter around the destination centre, e.g. `lat + ((i*37)%11-5)*0.012, lng + ((i*53)%13-6)*0.015`.
- `blockedRanges`: for listing index `i`:
  - `{start: daysFromNow(3 + (i*7)%18), end: daysFromNow(3 + (i*7)%18 + 2 + i%3)}`
  - `{start: daysFromNow(28 + (i*5)%20), end: daysFromNow(28 + (i*5)%20 + 4)}`
- **Description**: write a unique 2–3 paragraph English description per listing (60–120 words). Mention the view, the neighbourhood, and one distinctive feature from the title.
- **Highlights**: pick 3 from:
  - "Self check-in" (if SC)
  - "Dive right in — This is one of the few places in the area with a pool." (pool)
  - "Great for remote work — Fast wifi and a dedicated workspace." (workspace)
  - "{Host} is a Superhost — Superhosts are experienced, highly rated hosts." (superhost)
  - "Free cancellation before {date}" (computed)
  - "Beautiful area — Guests love this home's scenic location."
  - "Furry friends welcome — Bring your pets along for the stay." (pets)

---

## 8. reviews

```js
{
  id: 'rev_0001',
  type: 'guest_to_listing',           // guest_to_listing | host_to_guest
  listingId: 'lst_001',
  reservationId: null,                // set for reviews tied to Emily's reservations / new reviews
  authorId: 'user_201',               // guest (or host for host_to_guest)
  subjectUserId: 'user_101',          // host being reviewed (or the guest, for host_to_guest)
  overall: 5,                         // 1..5 integer
  ratings: { cleanliness:5, accuracy:5, checkIn:5, communication:5, location:4, value:5 }, // 1..5 integers
  publicText: 'Michael\'s cabin was exactly as pictured ...',
  privateNote: '',                    // visible only to the host; never shown publicly
  stayedWith: 'Stayed with kids'|'Stayed with a pet'|'Group trip'|null,   // shown as "· Stayed with kids"
  stayLengthText: 'Stayed a few nights'|'Stayed about a week'|'Stayed one night',
  status: 'published',                // draft | published | removed
  hostResponse: null | { text, createdAt },
  createdAt: '2026-…T…Z',             // isoDaysAgo(n)
  updatedAt: null,
}
```

### Seed generation
Use a deterministic PRNG so the output is identical on every call:

```js
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const rnd = mulberry32(20261118)
```

- **Count per listing**: `3 + (i % 6)` reviews (3–8), but 0 for the three `isNew` listings. That gives about **285 reviews**.
- **Ratings**:
  - Guest-favorite listings: each category is 5 with p=.9, otherwise 4.
  - Other listings: 5 with p=.65, 4 with p=.28, 3 with p=.07.
  - `overall = Math.round(mean of categories)`.
  - Expected averages: guest-favorite listings ~4.9, others ~4.6.
- `authorId`: cycles `user_201…user_240`.
- `createdAt`: `isoDaysAgo(7 + k*23 + i%9)` (newest first per listing).
- `publicText`: 1–3 sentences joined from a bank of ~40 templates with `{host}`, `{city}`, `{feature}` placeholders. Examples:
  - "{host} was incredibly responsive and the check-in was seamless."
  - "The {feature} was the highlight of our trip — we used it every night."
  - "Spotless, cozy and exactly as described. We'd stay again in a heartbeat."
  - "Great location for exploring {city}; quiet at night and easy parking."
  - "The beds were so comfortable and the kitchen had everything we needed."
  - "A couple of small things needed attention, but {host} fixed them right away."
- Lower-rated reviews (overall ≤ 3) use a "mixed" bank, e.g.:
  - "Photos make it look bigger than it is."
  - "Wifi was spotty during our stay."
- `hostResponse`: about 1 in 5 reviews, e.g. "Thank you so much, {first}! You're welcome back anytime."

### Emily's own reviews (authorId `user_001`)
One for each reviewed past reservation: `res_009`, `res_010`, `res_011`, `res_013`, `res_014` (§9).
- ids: `rev_9001`–`rev_9005`, linked via `reservationId`, `status:'published'`.
- `createdAt`: 3–6 days after that reservation's checkout.
- `rev_9003` has a `hostResponse`.

### Host reviews about Emily (`type:'host_to_guest'`)
`rev_8001`–`rev_8005`, with `subjectUserId:'user_001'`. Authors: `user_110`, `user_105`, `user_117`, `user_108`, `user_111`. Sample text:
- "Emily was a wonderful guest — clear communication and left the place spotless. Welcome back anytime!"
- "Respectful of house rules and very easy to host."

Ratings: `{cleanliness, communication, houseRules}` with values 5/5/5.

---

## 9. reservations

```js
{
  id: 'res_001',
  confirmationCode: 'HMXY4K2P9Q',     // 10 chars, "HM" + 8 [A-Z0-9]
  listingId: 'lst_017', hostId: 'user_107', guestId: 'user_001',
  checkIn: '2026-11-30', checkOut: '2026-12-03',   // YYYY-MM-DD, checkout exclusive
  nights: 3,
  guests: { adults: 2, children: 0, infants: 0, pets: 0 },
  status: 'confirmed',                // pending | confirmed | cancelled | withdrawn | declined
  bookingType: 'instant',             // instant | request
  rateType: 'refundable',             // refundable | non_refundable
  cancellationPolicy: 'moderate',     // copied from the listing at booking time
  priceBreakdown: {
    nightlyRate: 279, nights: 3,
    nightsSubtotal: 837,              // nightlyRate*nights
    discount: 0,                      // weekly/monthly/non-refundable discount (positive number)
    cleaningFee: 125, petFee: 0,
    serviceFee: 136.6,                // round2((nightsSubtotal - discount + cleaningFee + petFee) * 0.142)
    taxes: 125.06,                    // round2((nightsSubtotal - discount + cleaningFee + petFee) * listing.taxRate)
    total: 1223.66,                   // round2(sum)
    currency: 'USD',
  },
  paymentPlan: 'full',                // full | split  ("Pay part now, part later": 50% now / 50% 14 days before check-in)
  amountPaid: 1223.66,                // total for full; round2(total/2) for split
  paymentMethodId: 'pm_001',
  messageToHost: 'Hi Tom! My partner and I are celebrating our anniversary ...',
  tripReason: null,                   // optional
  conversationId: 'conv_001',
  createdAt: isoDaysAgo(20),          // the booking timestamp (strict-policy 48h rule uses this)
  confirmedAt: isoDaysAgo(20),
  cancellation: null | {
    cancelledBy: 'user_001',          // or hostId for a host cancellation
    reason: 'my_plans_changed',       // see reason ids below
    reasonText: 'My travel plans changed',
    note: '',                         // optional free text
    refundAmount: 1223.66,
    nonRefundedAmount: 0,
    refundTier: 'full',               // full | partial | none
    cancelledAt: '2026-…Z',
  },
  alterations: [],                    // P2: [{id, from:{checkIn,checkOut,guests}, to:{...}, priceDiff, status:'accepted', createdAt}]
}
```

### Status display (derived)

| Condition | Trips tab | Label |
|---|---|---|
| `pending` with checkIn ≥ today | Upcoming | "Request pending" — host has 24 hours to respond |
| `confirmed` with checkOut ≥ today | Upcoming | "Confirmed" (or "Currently hosted" / "Checking out today" when today is in range) |
| `confirmed` with checkOut < today | Past | "Completed" |
| `cancelled` / `withdrawn` / `declined` | Cancelled | "Cancelled by you", "Cancelled by host", "Request withdrawn" or "Request declined" |

### Cancellation reasons (radio list, in this order)

| id | label |
|---|---|
| `my_plans_changed` | My travel plans changed |
| `found_another_place` | I found a different place to stay |
| `need_change_dates` | I need to change dates or the number of guests |
| `host_asked_cancel` | The host asked me to cancel |
| `extenuating` | I have an emergency or unavoidable event |
| `other` | Other |

### Refund rule (single function; display and persist the same numbers)

```js
export function computeRefund(r, now = new Date()) {
  const checkIn = new Date(r.checkIn + 'T15:00:00')            // listing check-in time default 3pm
  const daysBefore = (checkIn - now) / 86400000
  const hoursSinceBooking = (now - new Date(r.createdAt)) / 3600000
  const p = r.priceBreakdown
  const base = p.nightsSubtotal - p.discount
  let tier
  if (r.status === 'pending') tier = 'full'                     // withdrawing a request = full release
  else if (r.rateType === 'non_refundable') tier = 'none'
  else switch (r.cancellationPolicy) {
    case 'flexible': tier = daysBefore >= 1 ? 'full' : 'none'; break
    case 'moderate': tier = daysBefore >= 5 ? 'full' : 'partial'; break
    case 'limited':  tier = daysBefore >= 14 ? 'full' : daysBefore >= 7 ? 'partial' : 'none'; break
    case 'firm':     tier = daysBefore >= 30 ? 'full' : daysBefore >= 7 ? 'partial' : 'none'; break
    case 'strict':   tier = (hoursSinceBooking <= 48 && daysBefore >= 14) ? 'full' : daysBefore >= 7 ? 'partial' : 'none'; break
    default: tier = 'none'
  }
  if (daysBefore < 0) tier = 'none'                             // stay already started
  const refund = tier === 'full' ? p.total
    : tier === 'partial' ? round2(base * 0.5 + p.cleaningFee + p.petFee + p.taxes * 0.5)
    : (daysBefore >= 0 ? round2(p.cleaningFee + p.petFee) : 0)  // cleaning fee always refunded before check-in
  const refundAmount = Math.min(refund, r.amountPaid ?? p.total)
  return { tier, refundAmount: round2(refundAmount), nonRefundedAmount: round2((r.amountPaid ?? p.total) - refundAmount) }
}
```

### Policy summary text (shown on listing, checkout and trip)

| Policy | Text |
|---|---|
| flexible | "Free cancellation before {checkIn−1 day, e.g. Nov 29}. Cancel before check-in for a partial refund." |
| moderate | "Free cancellation before {checkIn−5d}. Cancel before check-in for a partial refund." |
| limited | "Free cancellation before {checkIn−14d}. Cancel before {checkIn−7d} for a partial refund." |
| firm | "Free cancellation before {checkIn−30d}. Cancel before {checkIn−7d} for a partial refund." |
| strict | "Free cancellation for 48 hours (if booked 14+ days before check-in). Cancel before {checkIn−7d} for a partial refund." |
| non-refundable rate | "This reservation is non-refundable." |

### Seed reservations for Emily (17)

| id | listing | checkIn → checkOut | nights | guests | status | type | policy | createdAt | notes |
|---|---|---|---|---|---|---|---|---|---|
| res_001 | lst_017 Asheville cabin | +12 → +15 | 3 | 2A | confirmed | instant | moderate | −20d | full refund available; conv_001 |
| res_002 | lst_036 Paris | +45 → +51 | 6 | 2A | confirmed | instant | moderate | −35d | split payment (50% paid) |
| res_003 | lst_006 Joshua Tree | +4 → +6 | 2 | 2A | confirmed | instant | firm | −60d | inside 7 days, so refund is cleaning fee only |
| res_004 | lst_051 Banff | +21 → +25 | 4 | 2A 2C | confirmed | instant | strict | −40d | partial refund tier |
| res_005 | lst_011 Malibu | +30 → +33 | 3 | 4A | **pending** | request | strict | −1d | can "Withdraw request"; conv_005 |
| res_006 | lst_046 Tulum | +60 → +65 | 5 | 2A | confirmed | instant | strict | −10d | rateType `non_refundable` (10% discount) |
| res_007 | lst_002 Tahoe | −6 → −3 | 3 | 4A | confirmed | request | strict | −70d | **review due** (11 days left) |
| res_008 | lst_031 Brooklyn | −12 → −9 | 3 | 2A | confirmed | instant | moderate | −50d | **review due** (5 days left) |
| res_009 | lst_023 Dripping Springs | −44 → −40 | 4 | 6A | confirmed | instant | moderate | −90d | reviewed (rev_9001) |
| res_010 | lst_012 Malibu cottage | −79 → −75 | 4 | 2A | confirmed | instant | moderate | −120d | reviewed (rev_9002) |
| res_011 | lst_041 Lisbon | −127 → −120 | 7 | 2A | confirmed | instant | moderate | −160d | reviewed (rev_9003); weekly discount 10% (odd id) |
| res_012 | lst_056 Catskills | −163 → −160 | 3 | 2A 1 pet | confirmed | instant | moderate | −190d | review window **expired**, not reviewed |
| res_013 | lst_018 Weaverville | −203 → −200 | 3 | 2A | confirmed | instant | flexible | −230d | reviewed (rev_9004) |
| res_014 | lst_027 Miami | −264 → −260 | 4 | 3A | confirmed | instant | moderate | −300d | reviewed (rev_9005) |
| res_015 | lst_008 Joshua Tree | +18 → +21 | 3 | 2A | **cancelled** by guest | instant | moderate | −30d | cancelledAt −12d; reason `my_plans_changed`; full refund |
| res_016 | lst_033 Chelsea | −30 → −27 | 3 | 1A | **cancelled** by host | instant | strict | −80d | cancelledBy user_113; full refund; support thread conv_012 |
| res_017 | lst_026 Miami villa | +90 → +97 | 7 | 8A | **declined** | request | strict | −5d | host declined; conv_013 |

- **Price breakdowns**: compute in the seed with the same `computePrice()` used at checkout (§12). Do not hard-code totals.
- **Review window**: open while `today ≤ checkOut + 14 days` and Emily has no `guest_to_listing` review with this `reservationId`.

---

## 10. conversations & messages

```js
conversation: {
  id: 'conv_001',
  type: 'reservation',                // reservation | inquiry | support
  listingId: 'lst_017', reservationId: 'res_001',  // null for support/inquiry-before-booking
  participantIds: ['user_001','user_107'],
  hostId: 'user_107',
  lastMessageAt: isoDaysAgo(1, 18, 22),
  unreadCount: 1,                     // messages not sent by me with readAt === null
  starred: false, archived: false,
  createdAt: isoDaysAgo(20),
}
message: {
  id: 'msg_0001', conversationId: 'conv_001',
  senderId: 'user_107',               // or 'system' for automated events
  kind: 'text',                       // text | system | image
  body: 'Hi Emily! Thanks for booking ...',
  attachments: [],                    // [{url:'/files/<sid>/x.jpg', name, size, contentType}] from POST /upload
  reactions: [],                      // [{emoji:'👍', userId:'user_001'}]
  createdAt: isoDaysAgo(20, 9, 14),
  readAt: null | ISO,                 // for messages received by Emily
  editedAt: null, deletedAt: null,    // unsend sets deletedAt and the body renders "This message was unsent"
  translated: false,
}
```

System messages (kind `system`, senderId `system`) render as centered event rows. Examples:
- "Reservation confirmed · Dec 1 – 4 · 2 guests"
- "Request sent · Host has 24 hours to respond"
- "Reservation cancelled · Refund of $1,223.66 on its way"
- "Request declined"

### Seed threads (≈75 messages total)

| id | type | with | listing / res | last activity | unread | messages (summary) |
|---|---|---|---|---|---|---|
| conv_001 | reservation | Tom Whitaker | lst_017 / res_001 | −1d 18:22 | 1 | system confirmed; Emily intro (anniversary); Tom welcome + hot tub tips; Emily asks about early check-in; Tom: "Early check-in at 1pm works — I'll send the door code the day before." (unread) |
| conv_002 | reservation | Camille Laurent | lst_036 / res_002 | −3d | 0 | system; Emily asks for bakery tips; Camille lists 3 spots; Emily thanks |
| conv_003 | reservation | Daniel Ortiz | lst_006 / res_003 | −2h | 2 | system; Daniel: check-in instructions (gate code 4821, park left of boulder); Daniel: "Heads up: bring layers, it drops to 40°F at night." (2 unread) |
| conv_004 | reservation | Liam MacKenzie | lst_051 / res_004 | −6d | 0 | system; Emily asks about car seats; Liam: has 1 booster seat, crib available |
| conv_005 | reservation | Kai Nakamura | lst_011 / res_005 | −1d | 0 | system "Request sent"; Emily's request message (girls' trip, 4 adults, celebrating) |
| conv_006 | reservation | Sofia Hernández | lst_046 / res_006 | −9d | 0 | system; Sofia: welcome + cenote recommendations |
| conv_007 | reservation | Michael Brennan | lst_002 / res_007 | −3d | 1 | system; checkout reminder; Michael: "Thanks for being amazing guests! Hope to see you again." (unread) |
| conv_008 | reservation | David Kim | lst_031 / res_008 | −9d | 0 | system; wifi password Q&A; checkout thanks |
| conv_009 | reservation | Priya Shah | lst_023 / res_009 | −39d | 0 | system; farm egg pickup; thanks |
| conv_010 | reservation | Jenna Walsh | lst_008 / res_015 | −12d | 0 | system confirmed; system cancelled (refund amount); Jenna: "Sorry to see you go — hope to host you another time!" |
| conv_011 | inquiry | Grace Whitfield | lst_057 / null | −4d | 0 | Emily: "Is the farmhouse OK for a 60-lb dog?"; Grace: "Absolutely — dogs welcome, there's a fenced yard. $75 pet fee." |
| conv_012 | support | Airbnb Support | res_016 | −27d | 0 | Support: "We're sorry your host cancelled…" full refund + offered rebooking help; Emily: thanks |
| conv_013 | reservation | Isabella Rossi | lst_026 / res_017 | −4d | 0 | system request sent; Emily's message; Isabella: "Unfortunately the villa isn't available for groups of 8 those dates."; system "Request declined" |
| conv_014 | reservation | Inês Ferreira | lst_041 / res_011 | −119d | 0 | archived: true; thanks thread |

---

## 11. wishlists, recentlyViewed, searchHistory

```js
wishlist: {
  id: 'wl_001', ownerId: 'user_001', name: 'Beach getaways',   // name 1..50 chars
  checkIn: null, checkOut: null,                               // optional trip dates for the list
  guests: { adults: 0, children: 0, infants: 0, pets: 0 },     // 0 adults = unset
  items: [ { listingId: 'lst_011', addedAt: isoDaysAgo(30), note: '' } ],   // newest first; max 100
  collaboratorIds: [],                                         // P2 invite (local only)
  createdAt: isoDaysAgo(40), updatedAt: isoDaysAgo(3),
}
```

| id | name | items | notes |
|---|---|---|---|
| wl_001 | Beach getaways | lst_011, lst_012, lst_015, lst_027, lst_030, lst_050 | |
| wl_002 | Mountain cabins | lst_001, lst_003, lst_017, lst_020, lst_051, lst_052, lst_056, lst_058 | note on lst_052: "Ski trip with the Hendersons?"; note on lst_001: "Hot tub!!" |
| wl_003 | Paris with Mom | lst_036, lst_038, lst_040 | checkIn daysFromNow(45), checkOut daysFromNow(51), 2 adults |
| wl_004 | Dream stays | lst_026, lst_047, lst_055, lst_019, lst_009 | |
| wl_005 | Weekend in Austin | lst_021, lst_024 | |

- **Cover image** (derived): first photo of the first item, rendered as a 2×2 mosaic when the list has ≥3 items.
- **Saved** (heart filled) means the listing appears in any wishlist.

```js
recentlyViewed: [ { listingId:'lst_016', viewedAt: isoDaysAgo(0, 9) }, ... ]  // newest first; dedupe; max 50
```
Seed 10 entries: `lst_016, lst_036, lst_006, lst_022, lst_043, lst_059, lst_031, lst_002, lst_047, lst_054`, viewed 0–6 days ago.

```js
searchHistory: [ {
  id:'srch_001', query:'Lake Tahoe', destinationId:'dst_tahoe',
  checkIn: daysFromNow(12), checkOut: daysFromNow(15), flexible: null,    // or {length:'weekend'|'week'|'month', months:['2026-12']}
  guests:{adults:2,children:0,infants:0,pets:0},
  filters:{ /* see §13 */ }, resultCount: 5, createdAt: isoDaysAgo(2) } ]
```
Seed 4 searches:

| query | dates | guests | createdAt |
|---|---|---|---|
| Lake Tahoe | +12 → +15 | 2 adults | −2d |
| Paris | +45 → +51 | 2 adults | −36d |
| Joshua Tree | flexible weekend | 2 adults | −61d |
| Asheville | +12 → +15 | 2 adults | −21d |

Dedupe by `query + checkIn + checkOut + guests`, newest first, max 10.

---

## 12. Pricing function (shared by listing reserve card, checkout, seed)

```js
export const SERVICE_FEE_RATE = 0.142
export function computePrice(listing, checkIn, checkOut, guests, rateType = 'refundable') {
  const nights = Math.round((new Date(checkOut+'T12:00') - new Date(checkIn+'T12:00')) / 86400000)
  const nightsSubtotal = round2(listing.nightlyPrice * nights)
  let discountPct = nights >= 28 ? (listing.monthlyDiscountPct || 0) : nights >= 7 ? (listing.weeklyDiscountPct || 0) : 0
  let discount = round2(nightsSubtotal * discountPct / 100)
  if (rateType === 'non_refundable') discount = round2(discount + (nightsSubtotal - discount) * 0.10)
  const cleaningFee = listing.cleaningFee || 0
  const petFee = guests?.pets > 0 ? (listing.petFee || 0) : 0
  const taxable = nightsSubtotal - discount + cleaningFee + petFee
  const serviceFee = round2(taxable * SERVICE_FEE_RATE)
  const taxes = round2(taxable * (listing.taxRate || 0))
  return { nightlyRate: listing.nightlyPrice, nights, nightsSubtotal, discount, discountPct, cleaningFee, petFee,
           serviceFee, taxes, total: round2(taxable + serviceFee + taxes), currency: 'USD' }
}
```

**Card price display** (search, home, wishlist), with preference `displayTotalBeforeTaxes` (default `false`):

| Dates | Toggle off | Toggle on |
|---|---|---|
| none | "**$289** night" | "**$289** night" |
| set | "**$867** for 3 nights" (`nightsSubtotal - discount`) | "**$1,128** total before taxes" (`total - taxes`) |

---

## 13. Search filter object (URL ↔ state)

The URL is the source of truth for the current search. A snapshot is persisted into `searchHistory[].filters` when the user submits a search or clicks "Show N places".

```js
filters: {
  category: 'cabins'|null,
  roomType: 'any'|'entire_home'|'private_room',
  priceMin: number|null, priceMax: number|null,      // nightly
  bedrooms: 0, beds: 0, bathrooms: 0,                  // 0 = Any
  amenities: ['wifi','hot_tub'],                       // AND
  instantBook: false, selfCheckIn: false, freeCancellation: false, allowsPets: false,
  guestFavorite: false, luxe: false, superhost: false,
  propertyTypes: ['house','apartment'],                // OR over propertyTypeGroup
  hostLanguages: ['French'],
}
```

- `freeCancellation` matches policy `flexible|moderate`, or any policy that is still in its free window for the searched dates.
- `bedrooms`, `beds` and `bathrooms` are minimums (`>=`).
- Guests matching: `adults + children <= maxGuests`; `pets > 0` requires `allowsPets`.
- Dates matching: no overlap with `unavailableNights`, and `nights >= minNights`.

Search query params (keep `sid` on every navigation):

```
/s/:slug/homes?checkin=YYYY-MM-DD&checkout=YYYY-MM-DD&adults=2&children=0&infants=0&pets=0
  &category=cabins&room_type=entire_home&price_min=100&price_max=400&min_bedrooms=2&min_beds=0&min_bathrooms=0
  &amenities=wifi,hot_tub&ib=1&sci=1&fc=1&pets_ok=1&gf=1&luxe=1&superhost=1&ptypes=house,apartment
  &flex=weekend&months=2026-12,2027-01&sort=recommended&page=1
```

---

## 14. paymentMethods, notifications, preferences

```js
paymentMethods: [
  { id:'pm_001', type:'card', brand:'Visa', last4:'4242', expMonth:8, expYear:2028, holderName:'Emily Carter', billingZip:'94110', isDefault:true, createdAt: isoDaysAgo(700) },
  { id:'pm_002', type:'card', brand:'Mastercard', last4:'5454', expMonth:3, expYear:2027, holderName:'Emily Carter', billingZip:'94110', isDefault:false, createdAt: isoDaysAgo(400) },
  { id:'pm_003', type:'paypal', email:'emily.carter@example.com', isDefault:false, createdAt: isoDaysAgo(200) },
]
```
A new card added at checkout:
- Store only `brand` (detected from the first digit: 4 → Visa, 5 → Mastercard, 3 → Amex), `last4`, `expMonth`, `expYear` and `billingZip`.
- **Never store the full number or the CVV.**

```js
notifications: [ { id:'ntf_001', type:'review_reminder'|'message'|'booking'|'wishlist'|'account',
  title:'Leave a review for Michael\'s place', body:'You have 11 days left to review your stay at Lakefront Modern Retreat.',
  link:'/reviews/write/res_007', read:false, createdAt: isoDaysAgo(3) } ]
```
Seed 8 notifications:
1. Review reminder for res_007 (unread)
2. Review reminder for res_008 (unread)
3. New message from Daniel (unread)
4. Booking confirmed res_001 (read)
5. Request sent res_005 (read)
6. Request declined res_017 (read)
7. "Prices dropped for 2 homes in Paris with Mom" (read)
8. "Your account is verified" (read)

```js
preferences: {
  currency: 'USD', language: 'en-US', timeZone: 'America/Los_Angeles',
  displayTotalBeforeTaxes: false,
  translateAutomatically: true,
  notifications: { messagesEmail:true, messagesPush:true, remindersEmail:true, remindersSms:false, promotionsEmail:false, travelTipsEmail:true },
  wishlistDefaultId: null,
}
```

---

## 15. experiences & services (P2, browse + reserve)

```js
experience: { id:'exp_001', title:'Sunrise Kayak on Lake Tahoe', hostId:'user_101', destinationId:'dst_tahoe', city:'Tahoe City',
  pricePerGuest: 95, durationHours: 2.5, maxGroup: 8,
  rating: 4.97, reviewCount: 212,     // stored directly — experience reviews are not modelled as records
  photo:'/images/listings/lake-03.jpg', languages:['English'], includes:['Kayak & paddle','Life jacket','Coffee and pastries'],
  description:'...', slots:[ {id:'slot_001', date: daysFromNow(3), time:'06:30', spotsLeft:5}, ... ] }   // 4 slots each
experienceBooking: { id, kind:'experience'|'service', experienceId, slotId, guestId:'user_001', guests: 2, total: 190, status:'confirmed'|'cancelled', createdAt }
```

**12 experiences:**
- Sunrise Kayak on Lake Tahoe (lake-03)
- Desert Stargazing with an Astronomer (desert-05)
- Malibu Surf Lesson (beach-ext-02)
- Blue Ridge Waterfall Hike (treehouse-02)
- Austin BBQ & Food Truck Crawl (kitchen-20)
- Wynwood Street Art Walk (loft-02)
- Brooklyn Rooftop Photo Walk (loft-03)
- Paris Pastry Class (kitchen-02)
- Lisbon Tile Painting Workshop (patio-06)
- Cenote Swim & Snorkel Tulum (spa-01)
- Banff Snowshoe Adventure (cabin-ext-04)
- Catskills Forest Bathing (tiny-02)

Seed one `experienceBooking` for exp_008 (Paris), dated during res_002.

**8 services:**
- Private chef dinner (kitchen-01)
- In-home massage (spa-01)
- Vacation photo shoot (beach-ext-03)
- Personal training (living-03)
- Hair & makeup (bathroom-02)
- Prepared meals (kitchen-04)
- Catering (patio-20)
- Nails (bathroom-01)

Each service has `{id, title, providerName, city, priceFrom, unit:'per guest'|'per session', photo, description}` and is booked the same way as an experience (slot list). Reuse `experienceBookings` with `kind:'service'`.
