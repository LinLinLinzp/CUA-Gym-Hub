# Airbnb Mock — TODO

> Status: IMPLEMENTED — Round 5 review fixes complete; dev verification and production build pass
> Last updated by: dev agent, 2026-11-18
> Research: `assets/README.md` | Data model: `assets/data_model.md` | Styles: `DESIGN.md` | Contract: `../../HARBOR_CONTRACT.md` + `SEED.md`
> Dev server port: **5300** (`strictPort: true`). Other apps run in parallel, so never use another port.
> Default user: **Emily Carter** (`user_001`), pre-signed-in.

## Status Legend
- [ ] Not started
- [~] In progress
- [x] Done

**SEED workflows → sections:**

| SEED workflow | Section |
|---|---|
| Search stays | W1 |
| Book | W2 |
| Cancel | W3 |
| Guest–host messages | W4 |
| Reviews | W5 |
| Wishlists | W6 |

Each item lists the **state records it writes**. These must match the Observable State Changes table in SCHEMA.md.

### Global rules (apply to every item)
1. **Persist only through user actions.**
   - Use a single `update(mutator)` in the store. It computes the new state, calls `setState`, then calls `saveState('airbnb', next)`.
   - **No** autosave `useEffect`, no `setInterval`, no writes on mount or route change, and no timers that change state.
   - Toasts may auto-hide with a timeout, because that is UI-only state.
2. **UI-only state never enters the persisted store.** This covers open modals, hover, carousel index, map selection, form drafts and toasts.
3. **Every business record carries:**
   - an `id`, created with `genId(prefix)`;
   - a `status` where applicable;
   - an actor id;
   - `createdAt: new Date().toISOString()`;
   - related ids.
   - Money is stored as numbers rounded to 2 decimals.
4. **Dates relative to today always come from `new Date()`.** Never hard-code "today".
5. **Handle odd data.** Every list renders an empty state, a single item, and hundreds of items. Guard optional fields (`?.`, `?? []`). An unknown id in a route renders a friendly "We can't seem to find the page you're looking for" page with a "Go home" link, not a crash.
6. **Keep `?sid=` on every navigation.**
   - Use a `useSidNavigate()` / `<SidLink>` wrapper that appends the current `sid`.
   - Use `withSid()` for anything leaving the SPA (`<a href>`, `window.open`, `/upload`, `/files`).
7. **No remote resources** of any kind: no CDN, Google Fonts, remote images or map tiles.
   - Brand name "Airbnb" is used everywhere.
   - Never write "Mock" or "Clone" in the UI or the title.
8. **No dead controls.** Every visible button does something real, locally. See `../../SANDBOX_COMPLETENESS_GUIDE.md`.

---

## P0 — Core Shell
<!-- Without these, the app cannot render. Dev implements these first. -->

- [x] **Scaffold in the existing dir** `websites/airbnb_mock/`. Do not delete SEED.md, DESIGN.md, TODO.md or assets/.
  - Vite + React (JS).
  - Dependencies: `react-router-dom`, `lucide-react`, `@fontsource-variable/dm-sans`. Nothing else is needed.
  - `index.html` `<title>`: **"Airbnb | Vacation rentals, cabins, beach houses, & more"**.
  - Favicon: inline SVG Bélo in `#FF385C`, saved to `public/favicon.svg`.
  - `npm install` must produce a **`package-lock.json`, which is committed**.
  - Scripts: `dev` (`vite --port 5300`), `build`, `preview` (`vite preview --port 5300`).

- [x] **vite.config.js** uses the template plugin unchanged:
  ```js
  import { defineConfig } from 'vite'
  import react from '@vitejs/plugin-react'
  import { stateApi } from '../../templates/state-api.js'
  import { createInitialData } from './src/data/seed.js'
  export default defineConfig({ plugins: [react(), stateApi(createInitialData)],
    server: { port: 5300, strictPort: true }, preview: { port: 5300, strictPort: true } })
  ```
  - Do **not** add a React `/go` route. The plugin serves `GET /go`, `/state`, `/post`, `/upload` and `/files/*`.
  - `.mock-states/` goes in `.gitignore`.

- [x] **Copy `../../templates/dataManager.js` unchanged** to `src/utils/dataManager.js`. Never edit it.

- [x] **Photos**: `cp assets/listing_photos/*.jpg public/images/listings/` (88 files). Every listing, experience and service photo is a `/images/listings/<name>.jpg` string.

- [x] **`src/data/seed.js`**: `export function createInitialData()`, implemented exactly per `assets/data_model.md`.
  - Must be pure JS, because it is imported by Node and the browser.
  - Ids are fixed; dates are relative via `daysFromNow` / `isoDaysAgo`.
  - Generated reviews use the `mulberry32(20261118)` PRNG, so output is identical on every call.
  - Volume:
    - 60 listings, 64 users plus support, ~290 reviews;
    - 17 reservations, 14 conversations, ~75 messages;
    - 5 wishlists, 10 recently viewed, 4 searches, 3 payment methods, 8 notifications;
    - 12 experiences, 8 services.
  - Also export shared helpers from `src/utils/pricing.js`: `round2`, `computePrice`, `computeRefund`, `SERVICE_FEE_RATE`, `daysFromNow`, `ymd`, `genId`, `genConfirmationCode`.
    - `seed.js` may import from `pricing.js`, so it too must be pure.

- [x] **Store** `src/store/AppContext.jsx`.
  - On mount: `const s = await loadState('airbnb', createInitialData)`.
  - Until it resolves, render a neutral full-page loader: a white page with a centred 3-dot Rausch pulse. The loader must not mention "mock".
  - Expose `state`, `update(fn)` (which does `saveState('airbnb', next)`) and typed action functions (see W1–W6).
  - Selectors, all derived and memoised:
    - `listingRating(id)`, `listingReviewCount(id)`, `categoryAverages(id)`;
    - `isSaved(listingId)`, `wishlistOf(listingId)`;
    - `unavailableNights(listingId)`;
    - `unreadMessageCount`, `unreadNotificationCount`;
    - `reviewsDue` (reservations that are confirmed, have `checkOut < today ≤ checkOut+14d`, and have no review by `user_001`).
  - `<AppProvider>` wraps `<BrowserRouter>` and every route, so deep links and hard reloads work on every route.

- [x] **Routing** (`src/App.jsx`). All routes are inside `AppProvider` and render inside `<Layout>` unless marked full-page:

  | Route | Page |
  |---|---|
  | `/` | Home (Homes tab) |
  | `/s/:slug/homes` | Search results (`slug` = destination slug or `Anywhere` or free text) |
  | `/rooms/:id` | Listing detail. `/rooms/:id/photos` = photo tour (full-page) |
  | `/book/stays/:id` | Checkout (full-page header variant: logo only) |
  | `/trips` | Trips |
  | `/trips/:id` | Trip detail |
  | `/trips/:id/confirmation` | Confirmation |
  | `/trips/:id/cancel` | Cancel flow |
  | `/trips/:id/receipt` | Receipt (printable) |
  | `/wishlists` | Wishlists index |
  | `/wishlists/recently-viewed` | Recently viewed |
  | `/wishlists/:id` | Wishlist detail |
  | `/messages` | Inbox. `/messages/:conversationId` opens a thread |
  | `/reviews` | Your reviews |
  | `/reviews/write/:reservationId` | Write review (full-page) |
  | `/reviews/edit/:reviewId` | Edit review (full-page) |
  | `/users/show/:id` | Profile |
  | `/notifications` | Notifications |
  | `/account-settings` | Account index, plus `/personal-info`, `/payments`, `/notifications`, `/preferences` (P2) |
  | `/experiences` | Experiences (P2), plus `/experiences/:id` |
  | `/services` | Services (P2), plus `/services/:id` |
  | `/host/homes` | Become a host (static) |
  | `/help` | Help Center (P2) |
  | `*` | NotFound |

  - Routing is via `<SidLink>` / `useSidNavigate`.
  - Scroll to top on pathname change.

- [x] **Header** (DESIGN.md §4, §5):
  - **Left:** Airbnb logo (inline SVG Bélo + "airbnb" wordmark, Rausch), linking to `/`.
  - **Centre:**
    - On `/`: 3 tabs "Homes", "Experiences", "Services" with 48px illustrated SVG icons. The active one has a black underline.
    - Elsewhere: the compact search pill.
  - **Right:**
    - "Become a host" text button → `/host/homes`.
    - Globe icon button → Language & currency modal (P2; until then the modal shows the selections read-only).
    - **Account menu pill** (☰ + avatar with initials E). It shows a Rausch dot badge when `unreadMessageCount + unreadNotificationCount > 0`.
      - Dropdown (240px), first group bold: Wishlists, Trips, Messages (with count), Notifications (with count), Profile.
      - Second group: Account, Help Center.
      - Third group: "Become a host", "Refer a host", "Find a co-host". Each of these goes to `/host/homes`.
      - No "Log out".
  - Bottom border `1px #EBEBEB`.
  - Height:
    - `/`: 80px tabs row plus the expanded search area. Collapses into a sticky compact header after scrolling 80px, with the compact pill centred.
    - Other pages: 80px.

- [x] **Search bar component** `SearchBar` with `variant='expanded'|'compact'`, used by Home, Search and the compact header. (Behaviour, and what it writes, is in W1.)
  - **Expanded layout:**
    - Pill 850×66 with segments Where / Check in / Check out / Who, and a 48px Rausch search button.
    - The search button grows to "🔍 Search" while any segment is active.
    - Panels open beneath it: white, radius 32px, shadow `0 6px 20px rgba(0,0,0,.2)`.
    - Clicking outside or pressing Esc closes the panel. Hovering a segment gives it a `#EBEBEB` bg.
    - "×" clear buttons appear inside a segment that has a value.
  - **Compact:** clicking any part of the compact pill opens the expanded bar in an overlay header with a dimmed page backdrop. The relevant segment is focused.

- [x] **Category bar** `CategoryBar` (sticky under the header on Home-grid and Search; 78px tall):
  - Icon (24px) plus label (12px) per category from `state.categories`.
  - The active category has an opacity 1 label, 600 weight, and a 2px #222 underline. Inactive categories are at 0.64 opacity and turn to 1 on hover.
  - Left and right 28px circle scroll arrows appear when it overflows.
  - Right side:
    - a "Filters" bordered button (sliders icon + "Filters"), with a black count badge when filters are active;
    - a "Display total before taxes" bordered box with a switch (writes `preferences.displayTotalBeforeTaxes`, see W1).

- [x] **Footer**:
  - **"Inspiration for future getaways"** with tabs:
    - Popular | Arts & culture | Outdoors | Mountains | Beach | Unique stays | Categories | Things to do.
    - Each tab shows a 6-column grid of "Destination / type" links that navigate to searches. Example: "Asheville · Cabin rentals" → `/s/Asheville--NC/homes?category=cabins`.
  - **Three columns:**
    - Support: Help Center, Get help with a safety issue, AirCover, Anti-discrimination, Disability support, Cancellation options, Report neighborhood concern.
    - Hosting: Airbnb your home, AirCover for Hosts, Hosting resources, Community forum, Hosting responsibly, Join a free Hosting class.
    - Airbnb: Newsroom, New features, Careers, Investors, Gift cards, Airbnb.org emergency stays.
    - Each of these links goes to `/help?topic=<slug>`. P2 builds the article page; until then `/help` shows a static list.
  - **Bottom row:** "© 2026 Airbnb, Inc. · Terms · Sitemap · Privacy · Your Privacy Choices" (year = `new Date().getFullYear()`). At right: 🌐 "English (US)", "$ USD", and social icons (non-link spans).

- [x] **Shared UI kit** (`src/components/ui/`):
  - Button (brand gradient / dark / outline / text);
  - Modal (overlay, Esc, focus trap, header ✕ + title, footer slot);
  - Toast host (bottom-left, max 1 at a time, optional action);
  - Stepper, Switch, Chip, Segmented, StarRating, Avatar (initials SVG), Menu/Popover;
  - Calendar (2-month range picker; past days disabled; unavailable days struck through; min-nights hint);
  - ListingCard (§W1);
  - OfflineMap (§W1).
  - Each must follow DESIGN.md exactly: colours, radius, shadows.

- [x] **SCHEMA.md** (app root). It lists:
  - every top-level key and record shape, copied from data_model.md;
  - an **Observable State Changes** table with one row per action listed in W1–W6, P1 extras and P2. Columns: User action | Key(s) written | Fields / record created.
  - The rows are the "State writes" bullets in this file.

- [x] **Robustness pass**:
  - Load `/`, `/s/Anywhere/homes`, `/rooms/lst_001`, `/trips`, `/wishlists`, `/messages`, `/reviews` with:
    - (a) the default seed;
    - (b) a state where every array is `[]`;
    - (c) 300 synthetic listings.
  - Nothing may crash, and each page must show its empty state.
  - Verify with `curl -X POST "localhost:5300/post?sid=t1" -d '{"action":"set_current","state":{...}}'`, then open `?sid=t1`.

---

## P1 — Primary Features (SEED workflows)

### W1 · Search stays  _(SEED: search stays)_

- [x] **Home page `/`** (Homes tab):
  - Expanded SearchBar, centred.
  - 6 carousels built from `listings` grouped by destination. Titles in order:
    1. "Popular homes in Asheville"
    2. "Available next month in Paris" (only listings with no blocked nights in the next-month window)
    3. "Stay in Joshua Tree"
    4. "Homes in Lisbon"
    5. "Guests also checked out Lake Tahoe"
    6. "Places to stay in Miami"
  - Then a row "Explore more destinations" with all 12 destinations as chips.
  - Each title has "›" and links to `/s/<slug>/homes`.
  - Carousel behaviour: 32px circle prev/next buttons scroll by one page. Prev is disabled at the start. Smooth scroll.
  - Card (home variant):
    - image (aspect 1:1, radius 16px), heart, "Guest favorite" badge;
    - "Cabin in Asheville";
    - grey "$558 for 2 nights · ★ 4.92". The 2 nights are the default weekend: the next Fri→Sun from `new Date()`. "New" replaces the rating when there are no reviews.
  - Clicking a card navigates to `/rooms/:id` with those default dates. The click handler also records recently viewed (see below).
  - Below the carousels, a "Continue searching" row of `searchHistory` chips (each re-runs that search) and the footer.

- [x] **Where panel**:
  - Input placeholder "Search destinations". The panel is 425px wide.
  - **Empty input:** "Recent searches" (top 3 of `searchHistory`; clock icon; "Lake Tahoe · Nov 30 – Dec 3 · 2 guests"), then "Suggested destinations" (all 12 `destinations`; 48px rounded icon tile; name + blurb).
  - **While typing:** matching destinations, listing cities and regions (case-insensitive substring). Up to 8 rows with a map-pin icon.
  - Enter or clicking a row fills Where and auto-advances to Check in.
  - Free text that matches nothing is still allowed. The search then shows 0 results with an empty state.
  - "I'm flexible" chip → `Anywhere`.

- [x] **Dates panel** (2 months side by side; ‹ › month nav; past days disabled):
  - Tabs: "Dates" | "Months" | "Flexible".
  - **Dates:**
    - Click check-in, then check-out; the range is shaded `#F7F7F7` with black end circles.
    - Below the calendar, chips "Exact dates", "± 1 day", "± 2 days", "± 3 days", "± 7 days". The selected chip is saved as `dateFlex`.
  - **Months:** a circular dial is optional; implement as a 1–12 stepper "Stay for N months", starting on the 1st of the next month. The panel reads "Starting {date}, Ending {date}". This sets checkIn and checkOut.
  - **Flexible:**
    - "How long would you like to stay?" chips: Weekend | Week | Month.
    - "Go anytime" / "When do you want to go?" cards for the next 6 months (calendar icon + month + year). Multi-select.
    - Results then ignore exact dates. Price is shown for 2/7/28 nights and each card's subtitle reads e.g. "Dec 5 – 7".
  - Selecting dates auto-advances to Who.

- [x] **Who panel**:
  - Rows with steppers:
    - Adults "Ages 13 or above";
    - Children "Ages 2–12";
    - Infants "Under 2";
    - Pets, with an underlined "Bringing a service animal?" link that opens a small info modal.
  - Rules:
    - Adding a child, infant or pet auto-sets adults to 1 if it was 0.
    - The minus button is disabled at 0. Adults can't go below 1 while others are > 0.
    - Max 16 adults+children, 5 infants, 5 pets.
  - Segment text: "2 guests, 1 infant, 1 pet".

- [x] **Submit search** (Search button or Enter):
  - Navigates to `/s/<slug>/homes?...` with all params (data_model §13). The slug is the destination slug, or the URL-encoded free text, or `Anywhere`.
  - **State writes:** unshift into `searchHistory`:
    ```js
    { id: genId('srch'), query, destinationId|null, checkIn|null, checkOut|null, flexible|null, guests, filters: {...current}, resultCount, createdAt }
    ```
    - Dedupe on `query + dates + guests` by moving the existing entry to the top with a new `createdAt` and `resultCount`.
    - Cap at 10.

- [x] **Search results page `/s/:slug/homes`**:
  - Compact header pill shows "Lake Tahoe | Nov 30 – Dec 3 | 2 guests". Placeholders when empty: "Anywhere | Any week | Add guests".
  - CategoryBar is below the header.
  - **Results list (left ~58%):**
    - Heading 14px/600 "5 homes in Lake Tahoe", "Over 60 homes" or "1 home". With dates it adds "· Prices include all fees" when the toggle is on.
    - Sort dropdown (P1, simple): Recommended (default: guest favorite first, then rating desc, then id), Price: low to high, Price: high to low, Top rated.
    - Grid: 3 columns ≥1440px, 2 columns otherwise. 18 per page.
    - Pager: "‹ 1 2 3 ›" with circles, current page black-filled, and "1 – 18 of 60 homes" below.
    - The page number lives in the URL `page`. It does not write state.
  - **Filtering:** applies destination match, guests, dates (availability + minNights), category, and all filters from the Filters modal (data_model §13).
  - **Empty state:** "No exact matches", "Try changing or removing some of your filters or adjusting your search area.", and a "Remove all filters" outline button that clears the filter params and keeps location, dates and guests.

- [x] **ListingCard** (search variant):
  - Carousel of `photos` (max 5 dots). Prev/next 32px white chevrons appear on hover; they don't navigate the page and they stop propagation.
  - Heart top-right: hollow when unsaved, Rausch-filled when saved (see W6).
  - "Guest favorite" pill top-left if `guestFavorite`; "Luxe" if `luxe`.
  - Line 1: "{PropertyType} in {city}" (600) and "★ 4.92 (7)" right-aligned (or "New").
  - Line 2 (grey): `title`, 1 line with ellipsis.
  - Line 3 (grey): "3 bedrooms · 4 beds", or "Studio · 1 bed", or "Private room · 1 bed". With dates and no free text, show the date range.
  - Line 4: "Free cancellation" (grey) when the policy is flexible or moderate.
  - Line 5: price per DESIGN / data_model §12.
    - If there is a weekly or monthly discount and dates are ≥7 nights, show the struck original price first.
    - The amount is underlined and opens a "Price details" popover with the breakdown.
  - Click (not on heart or chevrons) → `/rooms/:id?check_in&check_out&adults…`, carrying the search params.
  - **State writes (on click):** `recentlyViewed` unshift `{listingId, viewedAt: ISO}`, deduped, max 50.

- [x] **OfflineMap** (search right column ~42%, sticky full height). Implement as an SVG; no tiles.
  - Project results' `lat/lng` into the viewport with 10% padding. When there is a single result, use a fixed zoom around it.
  - Background: land `#F3F1EC`. Draw a few decorative water/park polygons and roads seeded from the destination id, so they look the same every time. Show the destination name label in grey.
  - **Pins:** white price pills "$289" (nightly, or the total when the toggle is on and dates are set).
    - On search results, pins follow the current page's cards. Projection and map-bound filtering still use all matching homes.
    - Hovering a list card highlights its pin (black).
    - Hovering a pin raises it.
    - Clicking a pin opens a 327px mini card above it: carousel, ✕, heart, line 1–4. Clicking the card body goes to the listing.
    - Visited pins (in `recentlyViewed`) are `#EBEBEB`. Saved listings show a small heart in the pin.
  - Zoom +/− buttons scale the SVG viewBox. This is UI-only.
  - "Show map" / "Show list" floating black pill below 1128px.

- [x] **Filters modal** (opened from CategoryBar "Filters"):
  - Sections exactly as in assets/README.md §4.3:
    1. Recommended for you
    2. Type of place
    3. Price range: histogram of nightly prices across the current location's listings, 40 buckets from $10 to $1,500+; dual-thumb slider; min/max inputs that sync both ways
    4. Rooms and beds
    5. Amenities (Essentials visible; "Show more" reveals Features / Location / Safety)
    6. Booking options
    7. Standout stays
    8. Property type
    9. Accessibility features and Host language accordions (P2 content; the accordion itself must open)
  - Live result count on the footer button: "Show 23 places" / "Show 1 place" / "Show 0 places". At 0 the button stays enabled.
  - "Clear all" resets the modal's draft only.
  - "Show N places" applies: it updates the URL params and closes the modal.
    - **State writes:** `searchHistory` entry updated (the current search's `filters` and `resultCount`, `createdAt` refreshed), or created if none matches.
  - The Filters button badge shows the number of active filter groups.
  - Closing with ✕ or Esc discards the draft.

- [x] **Category click**: toggles `category` in the URL. Clicking the active category again clears it. This is URL-only; no state write.

- [x] **"Display total before taxes" switch**: flips the price display everywhere (cards, pins).
  - **State writes:** `preferences.displayTotalBeforeTaxes` (bool).

### W2 · Book a stay  _(SEED: book)_

- [x] **Listing page `/rooms/:id`** (layout per assets/README.md §4.4; max-width 1120px):
  - **Title row:**
    - "Share" opens the Share modal: listing thumbnail, title, and "Copy link" (writes `withSid(location)` to the clipboard, then the button reads "Link copied"). Email / Messages / WhatsApp / Facebook / X rows each show "Copied link for <app>" locally. UI-only.
    - "Save" / "Saved" behaves like the heart (W6).
  - **Photo grid:** clicking any image opens the photo tour at that image.
  - **Photo tour `/rooms/:id/photos`:** full-screen white page with "‹" back.
    - Top: a thumbnail strip grouped by caption ("Living room", "Bedroom 1"…).
    - Below: all photos stacked in a 1–2 column layout.
    - Clicking a photo opens a black lightbox with ‹ › arrows and an "n / 7" counter. Esc closes it.
  - **Body sections**, in order:
    1. Overview line
    2. Guest favorite box or rating line (clicking it scrolls to Reviews)
    3. Host row
    4. Highlights
    5. Description (clamped; "Show more" opens a modal)
    6. Where you'll sleep
    7. What this place offers (+ "Show all N amenities" modal, grouped, with "Not included" struck through)
    8. Calendar section: shares state with the reserve card. Unavailable days come from `unavailableNights` and are struck through. "Clear dates".
    9. Reviews (W5 display)
    10. Where you'll be (OfflineMap with a 1-listing circle)
    11. Meet your host ("Message host" → W4 inquiry)
    12. Things to know (3 columns, each with a "Show more" modal; cancellation text from data_model §9 using the selected dates)
  - **Sticky sub-nav** after scrolling past the photos: Photos · Amenities · Reviews · Location as anchors. When the reserve card is offscreen, the right side shows "$289 night ★4.92" and a Reserve button.
  - **Reserve card:**
    - Price line.
    - Date boxes, which open a popover calendar anchored to the card with "Clear dates" and "Close".
    - Guests dropdown: steppers. Max guests is `maxGuests` (adults+children); the footer note reads "This place has a maximum of 6 guests, not including infants." Pets are disabled with the note "This place doesn't allow pets" when `!allowsPets`.
    - Button:
      - "Check availability" when there are no dates (opens the date popover);
      - "Reserve" when the dates are valid;
      - "Those dates are not available" error text when the range overlaps unavailable nights or is shorter than `minNights` ("Minimum stay is 2 nights").
    - "You won't be charged yet".
    - Breakdown from `computePrice(listing, checkIn, checkOut, guests)`.
      - Underlined labels open explanatory popovers: "Cleaning fee — One-time fee charged by host to cover the cost of cleaning their space." and "Airbnb service fee — This helps us run our platform…".
    - Total.
    - Instant-book listings show "Reserve". Request listings also show "Reserve", but the sub-text reads "You won't be charged yet — this is a request to book".
  - Clicking Reserve → `/book/stays/:id?checkin&checkout&adults&children&infants&pets`.
  - The selected dates and guests are reflected in the URL query so that a reload keeps them. UI-only; no state write.

- [x] **Checkout `/book/stays/:id`** (layout per assets/README.md §4.5). The header is reduced to the logo only, plus "‹" back.
  - Invalid or missing dates or guests in the URL → redirect back to the listing with the date popover open.
  - **H1:** "Confirm and pay" if `instantBook`, else "Request to book".
  - **Your trip:**
    - Dates "Edit" opens a modal calendar with Save / Cancel. Validation is the same as the reserve card.
    - Guests "Edit" opens a modal stepper with Save / Cancel.
    - Edits update the URL (UI-only).
  - **Choose a rate** (radio cards), only if `nonRefundableOption`:
    - "Non-refundable" with its total;
    - "Refundable" with its total and its free-cancellation date.
    - Default: Refundable.
  - **Choose how to pay** (radio cards):
    - "Pay $X now";
    - "Pay part now, part later" with the split amounts. Shown only when checkIn is ≥ 14 days away; otherwise the option is hidden.
  - **Pay with:**
    - Dropdown of `paymentMethods` showing brand + "•••• 4242". The default is preselected.
    - Last option: "Add credit or debit card", which shows the new-card form:
      - Card number: Luhn check, spaced in 4s;
      - Expiration MM/YY: must not be in the past relative to `new Date()`;
      - CVV: 3–4 digits;
      - ZIP code;
      - Country/region select (United States default).
      - Inline errors are red per DESIGN, e.g. "Check your card number", "Check the expiration date", "Required".
    - PayPal shows "You'll log in to PayPal to complete payment" plain text. Choosing it is still allowed and confirms instantly; no redirect.
  - **Required for your trip:**
    - "Message the host" row with "Add". It expands a textarea with the host avatar, "Hosted by Tom", "Joined in 2017", and the prompt "Let the host know why you're traveling and when you'll check in."
      - **Required for request-to-book.** Showing "Required" in red on submit when empty.
    - "Phone number" row shows `currentUser.phone`, with "Edit" (inline input, saved with the booking).
  - **Cancellation policy:** summary text and a "Learn more" modal with the policy table from data_model §9.
  - **Ground rules:** "We ask every guest to remember a few simple things… Follow the house rules · Treat your Host's home like your own".
  - Legal line, then the gradient button "Confirm and pay" or "Request to book". It shows a 1.2s loading-dots state, set by `setTimeout` inside the click handler before navigation. This is OK because it is user-triggered.
  - **Right card:** thumbnail, `title`, "{PropertyType} · ★ 4.92 (7) · Superhost", "Price details" lines, "Total (USD)". When non-refundable, add a "Non-refundable discount −$X" line.
  - **On confirm — state writes:**
    1. `reservations` unshift:
       ```js
       { id: genId('res'), confirmationCode: genConfirmationCode(), listingId, hostId, guestId:'user_001',
         checkIn, checkOut, nights, guests:{adults,children,infants,pets},
         status: instantBook ? 'confirmed' : 'pending', bookingType: instantBook ? 'instant' : 'request',
         rateType, cancellationPolicy: listing.cancellationPolicy, priceBreakdown: computePrice(...),
         paymentPlan: 'full'|'split', amountPaid, paymentMethodId,
         messageToHost: text|'', conversationId, createdAt: now, confirmedAt: instantBook ? now : null,
         cancellation: null, alterations: [] }
       ```
    2. If "Add card" was used: `paymentMethods` push `{id: genId('pm'), type:'card', brand, last4, expMonth, expYear, holderName:'Emily Carter', billingZip, isDefault:false, createdAt}`.
       - Never store the full number or the CVV.
    3. If the phone was edited: `currentUser.phone`.
    4. `conversations`: reuse the existing inquiry conversation for this listing+host if one exists; set its `type:'reservation'` and `reservationId`. Otherwise create `{id: genId('conv'), type:'reservation', listingId, reservationId, participantIds:['user_001',hostId], hostId, lastMessageAt: now, unreadCount:0, starred:false, archived:false, createdAt: now}`.
    5. `messages`:
       - a system message: "Reservation confirmed · Nov 30 – Dec 3 · 2 guests", or "Request sent · {Host} has 24 hours to respond";
       - plus Emily's `messageToHost` as a text message (`senderId:'user_001'`) if non-empty.
    6. `notifications` unshift `{id, type:'booking', title:'Your reservation is confirmed' | 'Your request was sent', body, link:'/trips/<id>', read:false, createdAt}`.
  - Then navigate to `/trips/<id>/confirmation`.

- [x] **Confirmation `/trips/:id/confirmation`**:
  - **Confirmed:**
    - Top banner with a green check: "Your reservation is confirmed". "You're going to South Lake Tahoe!"
    - Big hero photo.
    - Two blocks: "Check-in Sun, Nov 30 · 4:00 PM" | "Checkout Wed, Dec 3 · 10:00 AM".
    - "Reservation code HMXY4K2P9Q" with a copy icon.
    - Address with "Get directions", which opens a modal containing the offline map.
    - "Message host" → the thread.
    - "View trip" → `/trips/:id`.
    - "Add to calendar" builds a `.ics` Blob in the browser and downloads it.
  - **Pending:** "Request sent", "Your reservation won't be confirmed until the Host accepts your request (within 24 hours). You won't be charged until then.", and "Withdraw request" (→ W3).

### W3 · Manage & cancel trips  _(SEED: book/cancel)_

- [x] **Trips page `/trips`**:
  - H1 "Trips". Tabs: Upcoming | Past | Cancelled, each with a count. Grouping uses data_model §9 "Status display" (derived from dates + status).
  - **Upcoming:** large cards sorted by checkIn ascending.
    - Photo (240×160 radius 12px).
    - Status pill: "Confirmed" (grey bg), "Request pending" (amber `#E07912` text), "Currently hosted", "Checking out today".
    - "{city}", "Hosted by {first}", "Nov 30 – Dec 3, 2026".
    - "In 12 days" (computed).
    - Click → `/trips/:id`.
  - **Past ("Where you've been"):** grid of small cards (thumbnail 64px, city, "Hosted by", dates).
    - If a review is due: a Rausch underlined "Write a review" link → `/reviews/write/:id`.
    - If reviewed: grey "Reviewed ★5".
  - **Cancelled:** list rows with "Cancelled by you · Refunded $1,223.66", "Cancelled by host", "Request withdrawn" or "Request declined". A "Book again" link goes to the listing.
  - **Empty states:**
    - "No trips booked…yet!", "Time to dust off your bags and start planning your next adventure.", and a "Start searching" dark button → `/`.
    - "You don't have any cancelled trips".

- [x] **Trip detail `/trips/:id`**:
  - **Left column (~480px):**
    - Photo.
    - Status banner.
    - "Check-in / Checkout" with times from `houseRules`.
    - Sections:
      - "Reservation details": Who's coming ("2 adults, 1 infant"); Confirmation code; Cancellation policy text using the reservation's dates and policy; "Get receipt" → `/trips/:id/receipt`.
      - "Getting there": address and an "Get directions" modal.
      - "Where you're staying": "Show listing".
      - "Hosted by Tom": "Message host" → `/messages/<conversationId>`; "Call host" shows the number in a modal (UI-only).
      - "Payment info": total, amount paid, payment method "Visa •••• 4242"; for a split plan, "Remaining $X due {checkIn−14d}".
      - "Reservation actions":
        - "Change reservation" (P2);
        - **"Cancel reservation"** for confirmed reservations with checkOut ≥ today;
        - **"Withdraw request"** for pending.
  - **Right side:** OfflineMap with a single pin.
  - Cancelled, withdrawn and declined trips show their cancellation summary and hide the actions.

- [x] **Receipt `/trips/:id/receipt`**:
  - Printable page: "Receipt ID: RC…" (derived from confirmationCode), "Booked by Emily Carter", listing, dates, guests.
  - Price breakdown, Payment (method, amount, date).
  - Refunds section if cancelled.
  - "Print" button calls `window.print()`.

- [x] **Cancel flow `/trips/:id/cancel`** (full-width content, max 640px, progress steps):
  1. **"Why do you need to cancel?"**
     - Radio list of the 6 reasons (data_model §9). "Other" reveals a required textarea.
     - "Next" is disabled until a reason is chosen.
  2. **"Confirm cancellation"**
     - Trip summary card.
     - "Refund details" table computed **now** via `computeRefund(reservation, new Date())`:
       - "You paid $1,263.12";
       - "Your total refund $1,263.12".
       - Tier explanation:
         - "Full refund: you're cancelling before Nov 25."
         - "Partial refund: 50% of nightly rate plus cleaning fee."
         - "Non-refundable: only the cleaning fee will be refunded."
       - "Refunds go back to Visa •••• 4242 within 5–7 business days".
     - Optional "Message for {Host}" textarea.
     - Buttons: "Back" and dark "Cancel reservation".
  3. **Done:** "Your reservation is cancelled" with the refund amount and a "Back to trips" button.
  - **State writes on confirm:**
    - `reservations[i].status = 'cancelled'`;
    - `reservations[i].cancellation = { cancelledBy:'user_001', reason, reasonText, note, refundAmount, nonRefundedAmount, refundTier, cancelledAt: now }`;
    - `messages` push a system message "Reservation cancelled · Refund of $X", plus the optional note as an Emily text message;
    - `conversations[c].lastMessageAt = now`;
    - `notifications` unshift `{type:'booking', title:'Reservation cancelled', body:'Your refund of $X is on its way.', link:'/trips/<id>'}`.
  - The listing's nights become available again automatically, because availability is derived.

- [x] **Withdraw request** (pending reservation; from trip detail or confirmation):
  - Confirm modal: "Withdraw your request?", "The host won't be able to accept it, and you won't be charged." Buttons: "Keep request" | dark "Withdraw".
  - **State writes:**
    - `status = 'withdrawn'`;
    - `cancellation = { cancelledBy:'user_001', reason:'withdrawn', reasonText:'Request withdrawn', refundAmount: 0, nonRefundedAmount: 0, refundTier:'full', cancelledAt: now }`;
    - system message "Request withdrawn";
    - `lastMessageAt`.

### W4 · Guest–host messages  _(SEED: guest-host messages)_

- [x] **Inbox `/messages`**:
  - Three-pane layout under the 80px header, full height (DESIGN §4).
  - **Left pane (375px):**
    - H1 "Messages" with a 🔍 icon (toggles a search input that filters by host name, listing title or message text) and a ⚙ icon (opens a small settings menu, below).
    - Filter chips: "All", "Traveling" (`type reservation|inquiry`), "Support".
    - "…" menu: "Unread", "Starred", "Archived".
    - Archived threads appear only under the Archived filter.
    - Rows are sorted by `lastMessageAt` desc; content per assets/README.md §4.9.
    - Unread rows: bold name, a Rausch dot, and the preview in #222 (not grey).
    - Row hover reveals a "…" menu: Star / Unstar, Archive / Unarchive, Mark as unread / Mark as read.
  - Without a selection, the centre shows "Select a conversation".
  - **Empty states:**
    - "You don't have any messages", "When you receive a new message, it will appear here."
    - Per filter: "No unread messages".
  - **State writes:**
    - Star → `conversations[i].starred`.
    - Archive → `conversations[i].archived`.
    - Mark unread → the last received message's `readAt = null` and `unreadCount` recomputed.
    - Mark read → all received `readAt = now`, `unreadCount = 0`.

- [x] **Open thread** (click a row → `/messages/:id`):
  - **State writes (in the row click handler, not on mount):** every received message with `readAt === null` gets `readAt = now`; `conversations[i].unreadCount = 0`.
  - A deep link or reload of `/messages/:id` displays the thread without writing. The thread is marked read on the first user interaction in it: focusing the composer or clicking "Mark as read" in the header.

- [x] **Thread pane**:
  - **Header:** avatar, host name, "Response time: within an hour".
  - **Buttons:**
    - "Details" toggles the right panel (UI-only).
    - ☆ star.
    - "…" menu: Archive, Mark as unread, Report (P2).
  - **Body:**
    - Day separators.
    - Message bubbles per DESIGN §5.
    - System events centred.
    - Image messages show a 240px thumbnail; clicking opens a lightbox.
    - Unsent messages render italic grey "This message was unsent".
    - Auto-scroll to the bottom on open and after sending.
  - **Composer:**
    - Auto-growing textarea "Write a message…" (max 5 rows). Enter sends; Shift+Enter adds a newline.
    - The send button is a black circle with an arrow, disabled when empty.
    - "+" (image icon) opens the file input (accept images).
      - It uploads via `fetch(withSid('/upload'), {method:'POST', body: FormData})`.
      - Show a thumbnail preview with ✕ before sending, then send.
  - **State writes — send:**
    - `messages` push `{id: genId('msg'), conversationId, senderId:'user_001', kind: attachments.length && !body ? 'image' : 'text', body, attachments:[{url, name, size, contentType}], reactions:[], createdAt: now, readAt: now, editedAt:null, deletedAt:null}`;
    - `conversations[i].lastMessageAt = now`.
    - **No automatic host reply.** There are no timers. (The idle-tab rule forbids non-user state changes.)
  - **Message hover actions:**
    - Reaction picker (👍 ❤️ 😂 😮 😢 🙏) → toggles `{emoji, userId:'user_001'}` in `messages[j].reactions`. Shown as small pills under the bubble with counts. Clicking a pill toggles your reaction.
    - "…" menu on own messages: "Edit" (within 15 min of `createdAt` vs `new Date()`; inline edit) → `body`, `editedAt = now`, shows "Edited".
    - "Unsend" → confirm modal → `deletedAt = now`.
    - "Copy" (clipboard; UI-only).
    - "Translate" on received messages: toggles the "Translated from Spanish · Show original" line. Uses `messages[j].translated` → write the bool.

- [x] **Details panel (right, 375px)**:
  - Reservation card:
    - Photo, title, "Confirmed" / "Request pending" status.
    - Check-in / Checkout, Guests, Confirmation code, "Total cost".
    - Buttons: "Show listing", "View trip" (→ `/trips/:id`), "Get receipt".
    - If pending: "Withdraw request" (W3).
  - Inquiry threads show the listing card and a "Book" button → the listing.
  - Support threads show "Airbnb Support" and a link to the related trip.

- [x] **Message host / inquiry** (listing page "Message host" and the host card):
  - Opens the `/messages/new?listing=lst_057` compose page: listing summary at left; at right, "Message {Host}" with a textarea, optional dates and guests chips ("Add dates"), and a "Send message" dark button.
  - If a conversation with this host about this listing already exists, it navigates to it instead.
  - **State writes:**
    - `conversations` unshift `{id: genId('conv'), type:'inquiry', listingId, reservationId:null, participantIds:['user_001',hostId], hostId, lastMessageAt: now, unreadCount:0, starred:false, archived:false, createdAt: now, inquiry:{checkIn,checkOut,guests}|null}`;
    - `messages` push Emily's text.
  - Then navigate to `/messages/<newId>`.

### W5 · Reviews  _(SEED: reviews)_

- [x] **Listing reviews section** (on `/rooms/:id`):
  - Header "★ 4.92 · 7 reviews", or a big laurel "4.96 Guest favorite" block when `guestFavorite`.
  - "Overall rating" with 5→1 distribution bars, then 6 category columns with lucide icons:
    - Cleanliness `SprayCan`
    - Accuracy `CircleCheck`
    - Check-in `Key`
    - Communication `MessageSquare`
    - Location `Map`
    - Value `Tag`
    - Each shows a one-decimal average.
  - 6 newest published reviews in a 2-column grid:
    - avatar, first name, "{n} years on Airbnb" / location;
    - small black stars and "· 2 weeks ago · Stayed a few nights";
    - text clamped to 3 lines with "Show more";
    - host response indented with "Response from Tom".
  - **"Show all N reviews" modal** (width 1032px):
    - Left: category summary.
    - Right:
      - "N reviews" heading;
      - sort dropdown: Most recent | Highest rated | Lowest rated;
      - "Search reviews" input with live filtering and matched-term highlighting;
      - scrolling list.
    - Display only; no writes.
  - A listing with 0 reviews shows "No reviews (yet)" with "This host has 37 reviews for other places to stay." (computed).

- [x] **Your reviews `/reviews`** (account menu → Profile → "Reviews", plus notification links):
  - **Tabs:**
    - "Reviews to write": `reviewsDue` cards with a countdown "You have 11 days left" and a "Write a review" dark button.
    - "Past reviews you've written": Emily's reviews with stars, listing name, date and text. Actions "Edit" and "Delete".
    - "Reviews about you": host-to-guest reviews.
  - Empty states: "Nothing to review right now. Reviews you've written will appear here."

- [x] **Write review `/reviews/write/:reservationId`** (full-page, top progress bar, Back/Next footer). Guard: the reservation exists, is past, the window is open, and it is not yet reviewed. Otherwise show "This review is no longer available" with a link to `/reviews`.
  - **Steps:**
    1. Overall stars (required). Hover labels: 1 Terrible, 2 Poor, 3 Okay, 4 Good, 5 Great.
    2. Six category ratings (all required). Validation: "Next" is disabled until all are set.
    3. Public review textarea: 1–1000 chars, live counter "0/1000". "Next" is disabled while empty.
    4. Private note to the host (optional; "Skip").
    5. Summary card with "Edit" links back to each step, then "Submit review".
  - **State writes on submit:**
    - `reviews` unshift `{id: genId('rev'), type:'guest_to_listing', listingId, reservationId, authorId:'user_001', subjectUserId: hostId, overall, ratings:{cleanliness,accuracy,checkIn,communication,location,value}, publicText, privateNote, stayedWith: guests.children||guests.infants ? 'Stayed with kids' : guests.pets ? 'Stayed with a pet' : null, stayLengthText, status:'published', hostResponse:null, createdAt: now, updatedAt:null}`;
    - mark the matching `notifications` (`link` = `/reviews/write/<resId>`) as `read:true`.
  - The listing's rating and count update immediately, because they are derived.
  - Done screen: "Thanks for your review!" with "Back to trips" and "View listing" (the new review appears first under Most recent).

- [x] **Edit / delete own review**:
  - "Edit" opens `/reviews/edit/:reviewId`, the same steps prefilled. **State writes:** overall, ratings, publicText, privateNote, `updatedAt = now`.
  - "Delete" opens a confirm modal: "Delete this review?" / "This can't be undone." **State writes:** `status = 'removed'`. Removed reviews are hidden everywhere, and the reservation becomes reviewable again only if it is still inside the window.

### W6 · Wishlists  _(SEED: wishlists)_

- [x] **Heart button** (cards, map mini card, listing "Save", wishlist detail):
  - **Unsaved, and there are wishlists:** open the **"Save to wishlist"** modal (568px).
    - Grid of tiles: cover, name, "N saved". Each tile shows the cover mosaic.
    - Footer: dark "Create new wishlist".
    - Clicking a tile adds the listing.
    - **State writes:** `wishlists[k].items` unshift `{listingId, addedAt: now, note:''}`; `wishlists[k].updatedAt = now`.
    - Toast: listing thumbnail, "Saved to {name}", and a "Change" link. "Change" reopens the modal in move mode; picking another list moves the item (remove from the old, add to the new).
  - **Unsaved, and there are 0 wishlists:** open the **"Create wishlist"** modal directly.
  - **Saved:** clicking removes it immediately from **all** lists containing it.
    - **State writes:** filter it out of `items`; `updatedAt`.
    - Toast: "Removed from {name}" with an "Undo" action that restores the previous items.
  - Heart animation per DESIGN §8.
  - Limit: 100 items per list. At 100, the tile shows "Full" and is disabled with a tooltip.

- [x] **Create wishlist modal**:
  - Title "Create wishlist". "Name" floating-label input, autofocused, with a "0/50 characters" counter.
  - Footer: "Cancel" text button and dark "Create", disabled when the trimmed name is empty.
  - Hard cap of 50 chars. Duplicate names are allowed, as on Airbnb.
  - **State writes:** `wishlists` unshift `{id: genId('wl'), ownerId:'user_001', name, checkIn:null, checkOut:null, guests:{adults:0,children:0,infants:0,pets:0}, items: listingId ? [{listingId, addedAt: now, note:''}] : [], collaboratorIds:[], createdAt: now, updatedAt: now}`.
  - Toast: "Saved to {name}".

- [x] **Wishlists index `/wishlists`**:
  - H1 "Wishlists" and an "Edit" text button. Edit mode shows a ✕ on each tile → delete confirm, then "Done".
  - Grid: 3–4 columns of tiles (square mosaic, radius 16px; 2×2 when the list has ≥3 items, otherwise a single cover or a grey placeholder with a heart icon), name and "N saved".
  - The first tile is "Recently viewed" (the last viewed photo; subtitle "Today" / "Yesterday" / "N days ago") → `/wishlists/recently-viewed`.
  - Empty state:
    - "Create your first wishlist"
    - "As you search, tap the heart icon to save your favorite places and Experiences to a wishlist."
    - plus the Recently viewed tile.

- [x] **Recently viewed `/wishlists/recently-viewed`**:
  - Grouped by day ("Today", "Yesterday", "Monday, Nov 16"). Cards with hearts.
  - "Edit" mode lets you remove items. **State writes:** remove from `recentlyViewed`.
  - "Clear all" with a confirm. **State writes:** `recentlyViewed = []`.

- [x] **Wishlist detail `/wishlists/:id`**:
  - Split list and OfflineMap.
  - **Header:** "‹" back to `/wishlists`, H1 name, "Share" button, "…" settings button.
  - **Chips under the title:**
    - Dates: "Add dates" or "Dec 12 – 15". Opens the calendar popover with Save / Clear. **State writes:** `wishlists[k].checkIn`, `checkOut`, `updatedAt`.
    - Guests: "Add guests" or "2 guests". Opens the stepper popover. **State writes:** `wishlists[k].guests`, `updatedAt`.
    - When dates are set, cards show the total for those dates, and listings unavailable on those dates show a grey "Unavailable for your dates" line.
  - **Cards:** ListingCard (heart filled) plus a per-item note area:
    - "Add note" link → inline textarea (max 250 chars) with Cancel / Save.
    - Saved notes show in a grey box with an "Edit" link.
    - **State writes:** `items[j].note`, `wishlists[k].updatedAt`.
  - **Settings "…"** (menu or modal titled "Settings"):
    - "Rename" → modal with the name input (50 max) and Save. **State writes:** `name`, `updatedAt`.
    - "Delete this wishlist" → confirm modal: "Delete this wishlist?" / "'{name}' will be permanently deleted." with Cancel and a dark "Delete". **State writes:** remove from `wishlists`, then navigate to `/wishlists`.
  - **Share modal:** "Copy link" (clipboard of `withSid(location.href)`), and "Invite collaborators" (P2).
  - Empty list: "No saves yet", "As you search, tap the heart icon to save your favorite places and Experiences to a wishlist.", and a "Start exploring" button.

---

## P1 — Supporting surfaces

- [x] **Notifications `/notifications`**:
  - List with icon, title, body, relative time ("3 days ago"), and an unread dot.
  - Clicking a notification follows `link`. **State writes:** `notifications[i].read = true`.
  - "Mark all as read". **State writes:** all `read = true`.
  - Each row's "…" menu has "Delete". **State writes:** removes the notification.
  - Empty state: "No notifications".

- [x] **Profile `/users/show/:id`**:
  - **Left sticky card:** big avatar, name, "Superhost" / "Guest", and a stats column ("N Reviews", "4.9★ Rating", "N Years hosting"). Then "{name}'s confirmed information" with ✓ Identity, ✓ Email address, ✓ Phone number.
  - **Right column:**
    - "About {name}": work, languages, lives in, about text.
    - "{name}'s reviews": a carousel from `reviews`. For a host this is guest_to_listing reviews of their listings; for Emily it is host_to_guest reviews.
    - "{name}'s listings": host only; ListingCards.
  - **Own profile (user_001):** an "Edit profile" button opens inline edit fields:
    - About (max 450);
    - Work;
    - Languages (multi-select chips from English, Spanish, French, Portuguese, German, Italian, Japanese, Mandarin);
    - Where I live.
    - **State writes:** `currentUser.about|work|languages|location`.

- [x] **"Become a host" `/host/homes`**:
  - Static marketing page: "Airbnb it. You could earn" with an estimator.
  - The estimator has a nights slider (UI-only) and a location select. It computes `nights × average nightly price of listings in that destination` and shows "$X per month".
  - No signup.

- [x] **Toast + navigation polish**:
  - Every state-writing action shows a confirming toast or page.
  - Browser back and forward work across all flows.
  - Focus rings are visible for keyboard use.

---

## P2 — Secondary Features
<!-- Depth and realism, implement after P1 is complete. -->

- [x] **Experiences tab `/experiences`**:
  - Carousels by city from `experiences`. Card: photo, title, "From $95 / guest", rating.
  - Detail `/experiences/:id`: photo, description, includes, host, and a "Choose a date" slot list (date, time, "5 spots left").
  - Guests stepper (max = spots left), then "Reserve" → confirm modal with the price, then "Confirm".
  - **State writes:**
    - `experienceBookings` unshift `{id, kind:'experience', experienceId, slotId, guestId:'user_001', guests, total: round2(pricePerGuest*guests), status:'confirmed', createdAt}`;
    - the slot's `spotsLeft -= guests`.
  - Shown in Trips Upcoming with an "Experience" tag. Cancel from there. **State writes:** `status:'cancelled'`, `cancelledAt`, `spotsLeft` restored.
- [x] **Services tab `/services`**: same pattern with `services` (kind `service`, priced per session).
- [x] **Change reservation** (trip detail → `/trips/:id/change`):
  - Pick new dates and/or guests, then "Request change" / "Confirm change" with a price-difference summary ("You'll pay $X more" / "You'll get $X back").
  - **State writes:**
    - `reservations[i].alterations` push `{id, from, to, priceDiff, status:'accepted', createdAt}`;
    - update `checkIn`, `checkOut`, `nights`, `guests`, `priceBreakdown`, `amountPaid`;
    - a system message.
- [x] **Account settings `/account-settings`**:
  - Tile grid.
  - **Personal info:** inline edit rows with Edit / Cancel / Save for Legal name, Preferred name, Phone, Email, Address and Emergency contact. Validation: email format, phone digits. **State writes:** `currentUser.*`.
  - **Payments:** list `paymentMethods`.
    - "Add payment method" opens the card form. **State writes:** push.
    - "Set default". **State writes:** `isDefault`.
    - "Remove" (blocked for the default and for any card used on an upcoming reservation, with an explanatory error). **State writes:** remove.
  - **Notifications:** toggles. **State writes:** `preferences.notifications.*`.
  - **Global preferences:** Preferred language, Preferred currency (USD/EUR/GBP/CAD/MXN), Time zone. **State writes:** `preferences.language|currency|timeZone`.
    - Display-only conversion with fixed rates: EUR .92, GBP .79, CAD 1.37, MXN 17.1. Stored amounts stay USD.
  - Login & security, Taxes, Privacy and Travel for work tiles show static informational pages with no actions.
- [x] **Language & currency modal** (globe): tabs "Language and region" | "Currency". Grid choices, with "Translation" toggle on top. **State writes:** same `preferences` fields.
- [x] **Accessibility & host-language filters**: checkbox lists. Requires `listing.accessibility` (seed: `['Step-free guest entrance','Guest entrance wider than 32 inches']` on 15 listings) and `languages`.
- [x] **Map "Search as I move the map"**: checkbox. Drag-panning the SVG filters results to the visible bounds. UI-only, but the results count updates.
- [x] **Report listing**: flag link → reason radio list (Inaccurate or incorrect / Not a real place / Scam / Offensive / Other) → Submit. **State writes:** `reports` push `{id, listingId, reporterId:'user_001', reason, details, createdAt}`.
- [x] **Wishlist collaborators**: Share modal "Invite collaborators" → email input → add a local `collaboratorIds` entry, shown as "Invited · name@email". Store emails as `pending:<email>`.
- [x] **Profile photo upload**: "Edit profile" → "Add photo" → `/upload` → `currentUser.avatarUrl` (the `/files/...` url via `withSid`).
- [x] **Help Center `/help`**:
  - Search input plus 12 local articles: Cancelling your reservation, How refunds work, Changing a reservation, Writing reviews, Wishlists, Messaging your host, Service fees, Payment methods, etc.
  - `/help/article/:id` shows the text.
- [x] **Listing "Similar homes" carousel**: same destination, excluding the current listing.
- [x] **Keyboard shortcuts**: Esc closes any modal or popover; ←/→ in the photo lightbox; Enter submits the search.

---

## Data Seed (implement in createInitialData())
<!-- Exact specs in assets/data_model.md; these are the coverage requirements. -->

- [x] **currentUser**: Emily Carter (user_001), full profile, address, emergency contact.
- [x] **users**: 24 hosts (12 Superhosts, varied response times), 40 reviewer guests, and Airbnb Support (user_900).
- [x] **destinations** (12) and **categories** (16).
- [x] **amenities** catalog: 31 entries in 4 groups.
- [x] **listings**: 60, transcribed from the data_model §7 table. Coverage:
  - Prices from $89 to $1,450. Policies: all 5 cancellation policies present.
  - Types: entire homes and private rooms (3); 29 guest favorite listings; 5 luxe; 3 "New" with 0 reviews.
  - Booking options: a mix of instant-book and request listings; pet-friendly listings; studios (bedrooms 0).
  - Every listing has ≥5 local photos, blocked date ranges, a unique description and 3 highlights.
- [x] **reviews**: ~285 generated (3–8 per listing), plus 5 by Emily (rev_9001–9005) and 5 host→Emily (rev_8001–8005).
  - At least 10 have host responses. Some are mixed (≤3 stars), so sorting by "Lowest rated" is meaningful.
- [x] **reservations**: 17 covering every state.
  - Upcoming: confirmed with full / partial / none refund tiers, a non-refundable rate, a split payment, and a pending request.
  - Past: two with reviews due (11 and 5 days left), one with an expired window, five already reviewed.
  - Cancelled: one by the guest and one by the host. Plus one declined.
- [x] **conversations** (14) and **messages** (~75):
  - 4 unread messages across 3 threads (conv_001, conv_003, conv_007);
  - 1 inquiry, 1 support, 1 archived;
  - system events for confirmed / cancelled / request sent / declined.
- [x] **wishlists**: 5 (2–8 items each). One has dates and guests; two items have notes.
- [x] **recentlyViewed**: 10. **searchHistory**: 4.
- [x] **paymentMethods**: 3 (Visa default, Mastercard, PayPal).
- [x] **notifications**: 8, of which 3 are unread.
- [x] **experiences**: 12, each with 4 slots. **services**: 8. **experienceBookings**: 1.
- [x] **preferences**: USD / en-US; `displayTotalBeforeTaxes:false`.
- [x] **reports**: `[]`.

## Observable State Changes — summary (copy into SCHEMA.md)

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

## Acceptance checklist (dev self-check before handing to playwright)
- [x] `npm run build` passes. `npx vite preview --port 5300` serves `dist/` and the state API works there (`/state`, `/go`).
- [x] Dynamic certification passes. Run from the CUA-Gym repo root, against the built `dist/` and the catalog site name: `python3 factory/hub_tools/dyn_certify.py airbnb`. It loads `/` at 1280×800 with no seed and aborts every cross-origin request. It checks three things:
  - **render**: HTTP 200, more than 50 characters of body text, and no uncaught page errors.
  - **sync**: at least one `/post` call after load. The `loadState` baseline `set` covers this.
  - **idle**: **zero** `/post` calls over 70 s of idling. No autosave effects and no writes on mount.
- [x] `GET /go?sid=x` after booking shows `state_diff.reservations`, `conversations`, `messages` and `notifications`.
- [x] `grep -rniE "mock|clone" src index.html` finds nothing user-visible.
- [x] `grep -rnE "https?://" src index.html` finds no remote asset URLs. Text-only `airbnb.com` mentions in copy are fine.
- [x] SCHEMA.md exists, with every key and the Observable State Changes table.

---

## Out of Scope
<!-- Dev must NOT implement these. -->
- Authentication: login, sign-up, logout, password, 2FA, identity verification. The app starts pre-logged-in as **Emily Carter (user_001)**. "Log out" is not shown.
- Hosting side: "Switch to hosting", host dashboard, listing creation and editing, calendars for hosts, payouts, host replies.
  - Host replies exist only in seed data. No simulated or automatic host replies, and no timed status changes such as auto-accept, auto-decline or auto-expire.
- Real payments, PayPal redirects, real email/SMS, real translation services, real map tiles or geocoding, real file storage. Use the local `/upload` only.
- Gift cards, Airbnb.org, Airbnb Luxe concierge, co-host marketplace, referral payouts.
- Mobile-app-only features: Trips itinerary widgets, push notifications, live activities.
- Any remote fonts, images or scripts.

## Dev verification notes (2026-11-18)

- The initial implementation predated AUDIT.md and TEST.md. This review-fix session read both reports and left them unchanged.
- All P0/P1/P2 implementation items are complete. Build, workflow state checks, session isolation, file upload/download and robust rendering checks pass; see `assets/verification/README.md`.
- The deterministic `3 + (i % 6)` review-generation rule produces 312 catalog reviews plus 10 linked personal/host reviews (322 total); the brief’s approximate 285/290 count is arithmetically lower than its specified rule.
- Independent browser re-testing of the review fixes remains for the playwright agent. Dev regressions exercise Promise-returning scrolling, message send/thread switch/navigation and carousel boundaries through React test rendering. TEST.md has not been modified.

## Review fixes (2026-11-18)

### P0
- [x] **BUG-001**: Keep message scrolling effects from returning a Promise; verify sending, switching threads and unmounting.

### P1
- [x] **AUDIT-001**: Seed the limited cancellation policy and sync SCHEMA.md.
- [x] **BUG-002**: Disable carousel arrows at the actual scroll boundaries and remeasure on resize/content changes.

### P2
- [x] **VISUAL-001**: Match the single-track price range control and prefill its bounds.
- [x] **BUG-003 / BUG-005 / BUG-007**: Correct guest defaults, booking messages and trip date/time/map presentation.
- [x] **BUG-004 / BUG-007**: Match withdrawal and cancellation copy, payment destination and refund visibility.
- [x] **BUG-008**: Match message settings and responsive details visibility.
- [x] **BUG-006 / AUDIT-002 / AUDIT-003 / AUDIT-004**: Remove seed availability conflicts, fill quieter message threads, sync booking schema and move currency setup out of render.

## Round 2 review fixes (2026-11-18)

### P2
- [x] **AUDIT-005**: Use the design warning token for pending reservation status.
- [x] **BUG-009**: Name the host in the seeded pending-request system message.
- [x] **BUG-010**: Show the published review's actual rating on past trips.
- [x] **VISUAL-003**: Fill home carousels with destination homes followed by similar stays, keeping responsive card sizes and real scroll boundaries.
- [x] **VISUAL-004**: Use grey histogram bars for the full price range and darken selected bins only when the range is narrowed.

## Round 3 review fixes (2026-11-18)

### P2
- [x] **BUG-011**: Keep every home carousel within its named destination, preserve the Paris next-month availability filter, and allow arrows only when the local homes overflow. Keep the prescribed seed unchanged.

## Round 4 dev verification (2026-11-18)

- AUDIT.md Round 4 has no open findings; TEST.md Round 4 passes with no open P0/P1 or functional P2 bugs. All implementation items remain checked off.
- `npm run verify` passes workflow persistence, message/carousel regressions, 96 route renders across four injected worlds, and zero additional state posts over 71 idle seconds on port 5300. Evidence: `assets/verification/round4-state-and-render-checks.txt`.
- `npm run build` passes and refreshes this app's `dist/`. The data manager remains byte-identical to the template.
- Optional VISUAL-005 remains an accepted seed-volume trade-off: preserve the prescribed seed and destination-only rows. TEST.md's packaging note still applies to the separate factory dist.

## Round 5 review fixes (2026-11-18)

### P2
- [x] **AUDIT-006**: Document the suggestion-tile neutral and pending-status warning tint in DESIGN.md.
- [x] **VISUAL-006**: Show only the current results page's map pins; preserve map filtering across all matching homes and keep pagination UI-only.

- `npm run verify` passes workflow persistence, message/carousel regressions, 96 route renders and zero extra state posts over 71 idle seconds on port 5300. Evidence: `assets/verification/round5-state-and-render-checks.txt`.
- Targeted React rendering checks pass for page 1/2/4 (18/18/6 pins), matching card ids, closing an old preview on page changes, empty results, retained `sid`, and map-bound filtering across all 60 matching homes. These UI operations call no business actions.
- `npm run build` passes. AUDIT.md and TEST.md remain unchanged for independent re-review. Optional VISUAL-005 remains the accepted seed-volume trade-off.
