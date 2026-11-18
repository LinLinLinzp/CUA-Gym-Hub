# Airbnb — Research Summary

> Target: https://www.airbnb.com (guest side, desktop web, 2025 "Summer Release" layout).
> Scenario: consumer / lifestyle spending, Tier A (highest fidelity).
> Companion docs: `../DESIGN.md` (visual tokens), `data_model.md` (state shape + seed), `../TODO.md` (build list).

## 1. Overview

Airbnb is a two-sided marketplace for short-term stays, plus Experiences and Services since 2025. This sandbox
replicates the **guest** side for a signed-in traveller, **Emily Carter** (`user_001`, San Francisco). She:

1. searches stays by destination, dates and guests, then refines with categories, filters and the map;
2. opens a listing, checks the price for her dates, and books it (instant book or request to book);
3. manages her trips (view, cancel with a computed refund, withdraw a pending request);
4. messages hosts (reservation threads, pre-booking inquiries, support);
5. leaves reviews for completed stays (star ratings in 6 categories, a public review and a private note);
6. saves homes to wishlists (create, rename, delete, notes, trip dates).

Hosting tools ("Switch to hosting", listing editor, payouts) are **out of scope**. The "Become a host" link opens a local, static
explanatory page and nothing more.

## 2. Personas & primary workflows

| Persona | Goal | Workflow exercised |
|---|---|---|
| Weekend planner | Find a cabin with a hot tub under $300 near Asheville for 2 adults | Search → category → filters → listing → reserve |
| Family traveller | 2 adults + 2 kids + pet, needs crib and washer | Who stepper (children, pets), amenities filter, guests on the reserve card |
| Budget-conscious | Cancel a trip and understand the refund | Trips → reservation → Cancel → reason → refund summary → confirm |
| Organizer | Collect options for a group trip | Heart → Save to wishlist / Create new → notes → share link |
| Communicator | Ask the host about early check-in, reply to messages | Messages → filter → thread → send / react / attach photo |
| Reviewer | Review last week's stay | Trips (Past) or notification → Write review → stars → text → submit |

## 3. Feature list (priority)

### P0 — shell
- Header with the logo, the Homes / Experiences / Services tabs, "Become a host", a globe button (Language & currency modal) and the ☰ + avatar account menu.
- Search bar:
  - Expanded: large pill on the home page.
  - Compact: pill on other pages, which expands into an overlay on click.
  - Segments: Where (destination suggestions + recent searches), Check in / Check out (2-month calendar, Dates / Months / Flexible tabs), Who (Adults / Children / Infants / Pets steppers).
- Category icon bar with horizontal scroll arrows, a Filters button with an active-count badge, and the "Display total before taxes" toggle.
- Footer: Inspiration tabs, Support / Hosting / Airbnb columns, and the © row with language and currency.
- Store with loadState / saveState, a seed of fixed ids, and the Harbor state API on port **5300**.

### P1 — the five SEED workflows plus their surfaces
1. **Search stays**
   - Results page: list grid of cards and an offline SVG map with price pins. Includes a "Show map" / "Show list" toggle, pagination, and the results count.
   - Filters modal with every filter, a live "Show N places" count, and "Clear all".
   - Listing cards with a photo carousel, heart, "Guest favorite" badge, rating, and price for the selected dates.
   - Each submitted search writes a `searchHistory` record.
2. **Book** (instant book or request to book)
   - Listing page: photo grid, the Show all photos tour, the sticky reserve card (date pickers, guests, price breakdown), Reserve.
   - Checkout "Confirm and pay" / "Request to book":
     - edit dates and guests;
     - refundable vs non-refundable rate;
     - pay in full vs pay part now;
     - choose a saved card or add a new one (validation);
     - message to the host (required for a request);
     - Confirm.
   - Confirmation page.
   - Writes a `reservations` record plus a `conversations` record, a system message and a notification.
3. **Cancel / withdraw**
   - From the trip detail: reasons, a computed refund summary, and a confirm step.
   - Writes `status`, a `cancellation{...}` object, a system message and a notification.
   - A pending request is withdrawn the same way, which writes `status:'withdrawn'`.
4. **Guest–host messages**
   - Inbox with filters (All / Unread / Traveling / Support / Archived), search, star, archive and mark unread.
   - Thread: send text, attach photo (`/upload`), reactions, unsend, translate toggle.
   - Details panel shows the reservation.
   - "Message host" on the listing creates an inquiry thread.
   - Opening a thread marks its messages read.
5. **Reviews**
   - Reviews page with two tabs, "Reviews to write" (window countdown) and "Past reviews you've written".
   - Multi-step write flow: overall stars → 6 category stars → public review (min 1 char, max 1000) → private note → submit.
   - The review appears on the listing, and the listing rating and count are derived from it.
   - Edit or delete your published review.
   - The listing's reviews modal has category bars, search and sort.
6. **Wishlists**
   - The heart opens "Save to wishlist" (existing lists plus "Create new wishlist").
   - A toast "Saved to X" offers a "Change" action. Un-hearting removes the listing from its list.
   - Wishlists index with a "Recently viewed" tile.
   - Detail page: map, notes per item, dates and guests for the list, Rename / Delete through the settings menu, and Share (copy link).

### P1 — supporting surfaces
- Trips page with Upcoming / Past / Cancelled tabs.
- Notifications page.
- User profile page for a host or for yourself.

### P2 — depth
- Experiences and Services tabs: browse cards, a detail page, slot selection, and booking.
- Account settings:
  - Personal info: inline edit.
  - Payments: add, remove, or set default card.
  - Preferences and notifications toggles.
- Change reservation (alter dates or guests, with a price difference).
- Host language and Accessibility filter accordions.
- Map zoom buttons and "Search as I move the map".
- Language & currency modal (the currency changes formatting only).
- Help Center (static article list with search).
- Share dialogs (copy link, with a local "copied" state).
- Profile photo upload.
- Review host responses.
- Wishlist collaborators (invite by email, local only).

## 4. View-by-view layout notes (with reference screenshots)

All screenshots are in `screenshots/`. Older screenshots (2022–2023) show "Stays / Experiences / Online
Experiences" tabs. The 2025 version renames these to **Homes / Experiences / Services** with small illustrated
icons; build the 2025 version.

### 4.1 Home (`/`)
**References:** `home_searchbar_guest_picker.jpg`, `home_category_bar_grid.jpg`, `home_grid_cards_closeup.jpg`.

**Header**
- Logo (Rausch) at left.
- Centred tabs with icons; the active tab has a black underline.
- Right side: "Become a host", globe, and the ☰ + avatar pill.

**Search pill**
- Large pill below the header, about 850px wide and 66px tall. Segments: **Where** "Search destinations" | **Check in** "Add dates" | **Check out** "Add dates" | **Who** "Add guests", then a Rausch search button.
- Clicking a segment turns the pill grey (#EBEBEB), raises the active segment as white, and opens a white panel with a 32px radius.
  - **Where**: "Recent searches" then "Suggested destinations". Each row has a 48px rounded-square icon, a bold name and a grey blurb.
  - **Dates**: a 2-month calendar with Dates / Months / Flexible tabs and "Exact dates / ±1 / ±2 / ±3 / ±7 days" chips.
  - **Who**: steppers for Adults "Ages 13 or above", Children "Ages 2–12", Infants "Under 2" and Pets ("Bringing a service animal?" link).

**Body (2025)**
- Horizontal carousels, e.g.:
  - "Popular homes in Asheville ›"
  - "Available next month in Paris ›"
  - "Stay in Joshua Tree ›"
  - "Homes in Lisbon ›"
  - "Guests also checked out Lake Tahoe ›"
  - "Places to stay in Miami ›"
- Each row has 7 cards (fewer on narrower screens) and 32px circle arrow buttons at the right.
- Card content:
  - square-ish image (radius 16px), "Guest favorite" badge and heart;
  - "Cabin in Asheville" (600);
  - "$612 for 2 nights · ★ 4.92" in grey.
- The older layout (category icon bar plus a 4–6 column grid) is in the screenshots and is used on the **search** page.

### 4.2 Search results (`/s/:slug/homes`)
**References:** `search_results_map_filters_modal.jpg`, `search_results_grid_map_video.jpg`, `search_flexible_dates_map.jpg`.

**Header and bars**
- Compact header shows the search summary pill: "Lake Tahoe | Nov 30 – Dec 3 | 2 guests" with a search icon.
- Category bar below, then the Filters button (pill with a sliders icon and a count badge) and the "Display total before taxes" switch.

**List column (~58%)**
- Heading: "5 homes in Lake Tahoe" (or "Over 60 homes" for Anywhere).
- Card grid with 3 columns.
  - Card lines: "Cabin in South Lake Tahoe", "Cozy Pine Cabin w/ Hot Tub…", "3 bedrooms · 4 beds", and "Free cancellation" (if applicable).
  - Price line: "$867 for 3 nights" underlined, with "★ 4.92 (7)" at the top right.
- Paginator, then the footer.

**Map column (~42%)**
- Sticky and full height, with price pins.
- Selecting a pin opens a mini card: image carousel, close ✕, heart, title, rating and price.
- Floating zoom controls and a "Search as I move the map" checkbox are P2.

**Below 950px:** the map hides, and a floating black "Show map" pill toggles to a full map with a "Show list" pill.

### 4.3 Filters modal
**References:** `filters_*.jpg` (7 images) and `search_results_map_filters_modal.jpg`.

Centred modal, 780px wide. Header has ✕ at left and "Filters" centred. Scrolling body, in order:
1. **Recommended for you**: 4 tiles (e.g. "Free cancellation", "Hot tub", "Pool", "Self check-in").
2. **Type of place**: segmented "Any type | Room | Entire home".
3. **Price range**:
   - "Nightly prices before fees and taxes" with a 40-bar histogram (bars inside the range dark grey #222, outside #DDDDDD).
   - Dual-thumb slider (28px white circles with shadow).
   - Minimum / Maximum pill inputs "$10" and "$1,500+".
4. **Rooms and beds**: Bedrooms / Beds / Bathrooms rows with "Any" + steppers.
5. **Amenities**:
   - Chips with icons: Wifi, Kitchen, Washer, Dryer, Air conditioning, Heating.
   - "Show more" expands Features / Location / Safety groups.
6. **Booking options**: Instant Book, Self check-in, Allows pets and Free cancellation, as chips (2025). Older UI used toggles with descriptions.
7. **Standout stays**: two bordered cards with an icon, title and grey subtitle.
   - "Guest favorite" — "The most loved homes on Airbnb".
   - "Luxe" — "Luxury homes with elevated design".
8. **Property type**: cards House / Apartment / Guesthouse / Hotel (Hotel is disabled at 0 results; still clickable, giving 0).
9. **Accessibility features** and **Host language**: collapsible accordions with checkbox lists.

Footer: "Clear all" underlined at left, and a black "Show 23 places" at right (the count recomputes live). The count is shown as "Show 1,000+ places" only if more than 1,000 match.

### 4.4 Listing page (`/rooms/:id`)
**Reference:** `listing_page_laptop.jpg`. Layout below comes from product knowledge.

**Top and photos**
- Title row: H1 26px at left; "Share" and "Save" (heart) underlined icon-text buttons at right.
- Photo grid, 1120px wide and 560px tall: a large left photo plus a 2×2 grid. Corners round only on the outside (12px). Image hover darkens it 15%.
- "Show all photos" white button with a grid icon, bottom-right.

**Left column**
1. "Entire cabin in South Lake Tahoe, California" (22px/600), then "6 guests · 3 bedrooms · 4 beds · 2 baths".
2. Rating line:
   - Guest favorite listings get a bordered box: laurel "Guest favorite" | "One of the most loved homes on Airbnb, according to guests" | "4.96 ★★★★★" | "128 Reviews".
   - Otherwise: "★ 4.81 · 37 reviews" link.
3. Host row: 40px avatar, "Hosted by Michael", "Superhost · 9 years hosting".
4. Highlights (3 rows with icons).
5. Description, clamped to 6 lines, with a "Show more ›" modal.
6. "Where you'll sleep": a small photo card per bedroom.
7. "What this place offers": 10 amenities in 2 columns, then "Show all 23 amenities". The modal groups items and strikes through the "Not included" ones.
8. Calendar: "3 nights in South Lake Tahoe" with a "Nov 30, 2026 – Dec 3, 2026" subtitle, a 2-month inline calendar and "Clear dates". Unavailable days are struck through and grey.

**Right column**
- Sticky reserve card (372px, radius 12px, shadow).
- "$289 night" with ~~$320~~ if discounted, or "Add dates for prices".
- 2×2 grid box: CHECK-IN | CHECKOUT, then GUESTS (full width, dropdown).
- Reserve gradient button (or "Check availability" when there are no dates), then "You won't be charged yet".
- Breakdown lines (underlined labels open explanation popovers):
  - "$289 x 3 nights $867"
  - "Weekly stay discount −$…"
  - "Cleaning fee $150"
  - "Airbnb service fee $144.42"
  - "Taxes $101.70"
- Hr, then "Total $1,263.12".
- Below the card: "Report this listing" flag link. P2: it opens a reason modal and writes a `reports` record.

**Full-width sections**
- **Reviews**: big "★ 4.92 · 7 reviews"; 7 columns with "Overall rating" bars plus 6 category scores with icons; 6 review cards in 2 columns (avatar, name, location, stars, "2 weeks ago · Stayed a few nights", text clamped, "Show more"); "Show all 7 reviews" button.
  - The modal (`reviews_modal_mobile.jpg`) has category bars at left and, at right, a search box, a sort dropdown (Most recent / Highest rated / Lowest rated) and the review list.
- **Where you'll be**: offline SVG map with a Rausch circle marker (exact address hidden until booked), "South Lake Tahoe, California, United States" and the neighbourhood text.
- **Meet your host**: card with a big avatar, name, Superhost badge, a stat column (Reviews, Rating, Years hosting), host details (response rate, responds within…), "Message host" dark button, and a note about protecting payments.
- **Things to know**: 3 columns (House rules, Safety & property, Cancellation policy), each with "Show more ›" opening a modal.

A sticky sub-nav appears after scrolling past the photos: Photos · Amenities · Reviews · Location on the left; price and a small Reserve button on the right.

### 4.5 Checkout (`/book/stays/:id`)
No screenshot; layout from product knowledge.

**Top:** "‹" back circle, then H1 "Confirm and pay" (or "Request to book").

**Left column**
- A "This is a rare find" banner if the listing is guest favorite.
- **Your trip**:
  - Dates "Nov 30 – Dec 3" with "Edit", which opens a calendar modal.
  - Guests "2 guests" with "Edit", which opens the stepper modal.
- **Choose how to pay**: radio cards.
  - "Pay $1,263.12 now".
  - "Pay part now, part later: $631.56 due today, $631.56 on Nov 16. No extra fees."
- **Choose a rate** (if `nonRefundableOption`): radio cards.
  - "Non-refundable · $1,136.81 total".
  - "Refundable · $1,263.12 total — Free cancellation before Nov 25".
- **Pay with**: a saved-cards dropdown (brand icon "Visa •••• 4242") or "Add a new card".
  - New card: stacked inputs for Card number / Expiration / CVV, then ZIP code and Country/region select.
- **Required for your trip**:
  - "Message the host" ("Share why you're traveling, who's coming with you, and what you love about the space."), required for a request to book. It opens a textarea with the host avatar.
  - Phone number (pre-filled, "Edit").
- **Cancellation policy**: text plus "Learn more".
- **Ground rules**: bullets.
- Fine print: "By selecting the button below, I agree to the Host's House Rules, Ground rules for guests, Airbnb's Rebooking and Refund Policy…".
- Pink gradient "Confirm and pay" or "Request to book".

**Right column (sticky card)**
- 104×96 thumbnail, the title, "★ 4.92 (7) · Superhost".
- Hr, then "Price details" lines.
- Hr, then "Total (USD)".

### 4.6 Reservation confirmed (`/trips/:id/confirmation`)
**Reference:** `reservation_confirmed.jpg`.
- Header "Your reservation is confirmed" (or "Request sent" for a request).
- "You're going to South Lake Tahoe!" with a big photo.
- Check-in "Sun, Nov 30, 4:00 PM" and Checkout "Wed, Dec 3, 10:00 AM".
- Reservation code, address (shown only once confirmed), "Message host", "View trip", and "Add to calendar" (P2: downloads a local .ics generated in the browser).

### 4.7 Trips (`/trips`) and trip detail (`/trips/:id`)
**Trips page**
- H1 "Trips". Tabs: Upcoming | Past | Cancelled.
- Upcoming cards are large: photo left, then city, host and dates, plus a status pill ("Confirmed", "Request pending" in amber).
- "Where you've been" is a grid of small cards (thumbnail, city, "Hosted by X", dates) with a "Write a review" link when a review is due.
- Empty states: "No trips booked…yet!" with a "Start searching" button.

**Trip detail page**
- Left panel: photo, "Check-in / Checkout" times, "Reservation details" (who's coming, confirmation code, cancellation policy).
- Actions:
  - Message host; Show listing; Get receipt (receipt modal).
  - Change reservation (P2); Cancel reservation; Withdraw request (when pending).
- Right panel: offline map with the address.

**Cancel flow** (`/trips/:id/cancel`)
1. **Step 1:** "Why do you need to cancel?" radio list, then Next.
2. **Step 2:** "Confirm cancellation". Summary card with dates and policy, then "Refund details":
   - "You paid $1,263.12";
   - "Your refund $1,263.12" (or partial / none, with an explanation per tier);
   - optional "Message to host" textarea;
   - Back; "Cancel reservation" (dark #222 button).
3. **Done:** "Your reservation is cancelled", with refund text and a "Back to trips" button.

### 4.8 Wishlists (`/wishlists`, `/wishlists/:id`)
**Index**
- H1 "Wishlists" with an "Edit" text button at right (P2: shows ✕ on tiles for quick delete).
- Grid of tiles: 2×2 photo mosaic (radius 16px), name (600), "6 saved".
- The first tile is "Recently viewed" ("Today").

**Detail**
- Split layout: list column at left and map at right.
- Header: back arrow, list name, a "…" settings menu (Rename, Delete), and a Share button.
- Chips: dates ("Add dates" / "Nov 30 – Dec 3") and guests ("Add guests").
- Grid of listing cards with an "Add note" link beneath each one. A note shows as a grey box with an Edit button.

**Save to wishlist modal**
- "Save to wishlist" title with ✕; a 3-column grid of list tiles (cover + name + count).
- Footer: dark "Create new wishlist".

**Create modal**
- Single "Name" input with a "0/50 characters" counter.
- Footer: "Cancel" text button and a dark "Create" button, disabled while empty.

### 4.9 Messages (`/messages`, `/messages/:id`)
**References:** `messages_inbox_mobile.jpg`, `messages_thread_mobile*.jpg`. These are older mobile shots; build the 2024 desktop three-pane version.

**Left pane: "Messages"**
- Search icon and settings gear.
- Filter chips: All | Traveling | Support. The overflow "…" menu has Unread, Starred and Archived.
- Rows:
  - 48px host avatar, with the listing photo overlapping;
  - name (bold if unread);
  - last message preview (1 line);
  - "Confirmed · Nov 30 – Dec 3 · Asheville" grey line;
  - date at top-right;
  - unread dot.

**Centre pane**
- Header: host name, plus a "Show details" / "Hide details" button.
- Messages grouped by day ("Today", "Yesterday", "Nov 12").
- Composer at the bottom: a pill input "Write a message…", a "+" button (attach a photo, opening the file picker), and a send arrow button that turns black when there is text.
- Hovering a message shows a reactions bar (👍 ❤️ 😂 😮 🙏 +) and a "…" menu (Copy, Translate, Unsend — own messages only).

**Right pane: "Reservation"**
- Listing photo, title and status.
- Check-in and checkout, guests, confirmation code.
- "Total cost $1,263.12".
- Buttons: "Show listing", "View trip", "Get receipt".
- For an inquiry: "Book" (goes to the listing with dates).

### 4.10 Reviews (`/reviews` and `/reviews/write/:reservationId`)
**Your reviews (`/reviews`)**
- H1 "Reviews". Tabs: "Reviews to write" | "Past reviews you've written" | "Reviews about you".
- To write: a card per due reservation with the photo, "You have 11 days left to write a review for Michael's place", and "Write a review".
- Past: list with stars, text, date, and "Edit" / "Delete".

**Write flow** (full-page; progress bar at top; footer with Back and Next)
1. "How was your stay at {title}?": large 5-star selector, plus "Great/Good/Okay/Poor/Terrible" labels on hover.
2. "Rate your stay in these areas": 6 categories, each with a 5-star row and a short helper ("Cleanliness — Did the place look and feel clean?").
3. "Write a public review": textarea (1–1000 chars) with a counter. Helper: "Tell future guests about your stay."
4. "Write a private note to {host}": optional textarea; can be skipped.
5. Review & submit summary, then Submit.
6. Done: "Thanks for your review!"

### 4.11 Profile, notifications, account
**Profile (`/users/show/:id`)**
- Left card: avatar, name, "Guest" / "Superhost", stats.
- "Verified identity" box.
- Right column: About, "Where I've been" (P2), and "Reviews about {name}" carousel.
- For a host profile, also "{name}'s listings".

**Notifications (`/notifications`)**
- A list with "Mark all as read".

**Account (`/account-settings`)**
- Tile grid: Personal info, Login & security (static, auth is out of scope: show text only, no actions), Payments & payouts, Taxes (static), Notifications, Privacy (toggles), Global preferences, Travel for work (static).
- Only Personal info, Payments, Notifications and Global preferences are interactive (P2).

## 5. Data model overview

See `data_model.md`. Top-level keys:

`currentUser, users, destinations, categories, amenities, listings(60), reviews(~290), reservations(17), conversations(14), messages(~75), wishlists(5), recentlyViewed(10), searchHistory(4), paymentMethods(3), notifications(8), experiences(12), services(8), experienceBookings(1), preferences`.

Ratings and counts are derived from `reviews`. Price and refund come from the shared `computePrice` / `computeRefund` functions.

## 6. Offline assets

- `listing_photos/` has **88 JPGs** (≤1000px, ~9.5MB):
  - exteriors: cabin, A-frame, beach, desert, farm, lake, treehouse, tiny home, villa;
  - interiors: living, bedroom, kitchen, bathroom, loft;
  - outdoor: patio, pool, spa.
- **The dev agent must copy them to `public/images/listings/`** and reference them as `/images/listings/<file>.jpg`.
- There are no remote images anywhere. Avatars are SVG/CSS initials.
- The map is a locally drawn SVG. There are no tiles.
- The logo is an inline SVG. The font is `@fontsource-variable/dm-sans` (see DESIGN.md).

## 7. Deliberately skipped

- Login, sign-up, logout, password, 2FA, identity verification flows. The account menu omits "Log out", because Harbor completeness forbids dead controls.
- Real payments, real emails/SMS, real map tiles, real translation. Translate swaps to a pre-written English text, or shows "(Translated)" for already-English text.
- Host dashboard ("Switch to hosting"), listing creation, payouts. "Become a host" goes to a static marketing page `/host/homes` with no forms.
- Airbnb gift cards and Airbnb.org.
- Clock-driven changes: no auto-confirm of pending requests and no auto-expiry. Statuses change only through user actions.

## 8. Sources

- https://news.airbnb.com/airbnb-2025-summer-release/ — Homes/Experiences/Services tabs, redesigned home
- https://www.airbnb.com/help/article/3740 — wishlists
- https://www.airbnb.com/help/article/1236 — cancellation of reservation (guest)
- https://www.airbnb.com/resources/hosting-homes/a/getting-the-most-out-of-the-messages-tab-678 — messages redesign (filters, reactions, edit/unsend)
- https://www.hostfully.com/blog/airbnb-review-policy/ — reviews: 14-day window, categories, double-blind
- https://trvlguides.com/articles/change-cancel-airbnb-booking — guest cancel & change flow
- https://hello.pricelabs.co/blog/airbnb-service-fee/ — service fee split vs. total-price model
- https://styles.refero.design/style/c2325884-4391-4688-85cd-e143f5107517 — Airbnb web style tokens
- https://designsystems.one/design-systems/airbnb-design — DLS overview
- https://github.com/Wazzabeam98/galloway-getawayas/pull/297 — Airbnb-like UI implementation notes
