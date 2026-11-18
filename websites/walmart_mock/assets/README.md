# Walmart workflow research

Walmart combines a broad retail catalog with local store fulfillment, purchase management, and gift registries. This desktop-first app covers the same customer tasks with responsive layouts and an existing shopper account. Walmart's website and app both support search, pickup and shipping. The app listing also describes native in-store tools. Use keyboard-accessible web controls throughout. [Walmart storefront](https://www.walmart.com/) · [Walmart site and app guide](https://www.walmart.com/help/article/the-walmart-site-and-app-experience/27f2678cb25a40a7b57a359fec3ca67f) · [Walmart app listing](https://apps.apple.com/us/app/walmart-shopping-savings/id338137227)

## Personas and entry points

| Persona | Typical path |
|---|---|
| Weekly shopper | Search for grocery and household products, add quantities, reserve curbside pickup, and place an order. |
| Repeat shopper | Find an order in Purchase history, review or reorder its items, and edit or reschedule an upcoming pickup. |
| Return customer | Open a delivered order, choose eligible items, select refund or replacement and a return method, and review the submitted return. |
| Registry owner | Create a gift registry, choose visibility, add and manage gifts, and copy the recipient link. |
| Gift giver | Find a public registry or use a shared link, inspect requested quantities, and mark gifts as purchased. |

## Feature inventory

| Priority | Feature | Main interaction or requirement |
|---|---|---|
| P0 | Offline scaffold | Vite, React and local assets on port 5308 |
| P0 | Global navigation and routing | Storefront, search, pickup, checkout, purchase history, returns and registry deep links |
| P0 | Harbor state bridge | Shared load/save templates, session isolation and server-visible state |
| P0 | Injected-world rendering | Safe empty, large and sparse states at every route |
| P1 | Product discovery | Department browsing, search, filters, sorting, SKU details and purchase entry points |
| P1 | Cart | Quantity, fulfillment, remove, save for later, and restore |
| P1 | Pickup slot reservation | Store, date, window, explicit hold and release |
| P1 | Checkout and confirmation | Fulfillment review, price breakdown and order placement |
| P1 | Purchase history and order management | Date and status filters, order detail, eligible edits, cancellation and reorder |
| P1 | Pickup rescheduling | One eligible change before the cutoff |
| P1 | Returns | Eligible lines, quantity, reason, resolution, method, review and confirmation |
| P1 | Registry creation and discovery | Create, edit, visibility, find, share and delete |
| P1 | Registry items | Add, adjust requested quantity, remove, and mark purchases |
| P2 | Printable receipt | Order snapshot and masked payment summary |
| P2 | Product gallery and related items | Local alternate photos and department links |

## Major views

- **Storefront, search and item detail.** The public site keeps catalog search close to fulfillment, purchase history and registry links. The planned site brings those entry points into a two-row navigation header. Home puts departments and product rows below a pickup shortcut. Search uses result cards with quantity, price and fulfillment context. An item page pairs the product image with selectable quantity, available fulfillment and registry eligibility. [Walmart storefront](https://www.walmart.com/) · [Walmart site and app guide](https://www.walmart.com/help/article/the-walmart-site-and-app-experience/27f2678cb25a40a7b57a359fec3ca67f)
- **Cart and checkout.** Use grouped line items, a Saved for later section, and a totals panel. The real site supports selecting an individual fulfillment group and checkout across groups. The app implements checkout for one chosen group at a time, leaving active lines in the other group available for another order. The confirmation gives the order number and a direct details link. [Walmart site and app guide](https://www.walmart.com/help/article/the-walmart-site-and-app-experience/27f2678cb25a40a7b57a359fec3ca67f) · [Saved for later on Walmart](https://www.walmart.com/c/kp/saved-for-later-items-list-in-my-account)
- **Reserve a time.** Show store, dates, time ranges, availability and fees. Reserve is explicit and the selection carries into checkout. Use a 60-minute hold as an app rule, with a shorter hold when a window starts soon. Walmart describes one pickup reschedule before the order's cutoff. Show the cutoff on order detail and validate it on save. [Walmart fulfillment options](https://www.walmart.com/cp/fulfillment-options/1987240) · [Pickup changes and exceptions](https://www.walmart.com/help/article/pickup-and-delivery-changes-and-exceptions/97461ebd27b04ab78cfa1ca3de480a83)
- **Purchase history and details.** List orders by date with number, fulfillment, item preview, total, status and a details link. The detail view shows the history and permitted next actions. Pickup edits can change eligible quantities or pickup person before cutoff. Shipping tracking uses seeded details. Canceling a booking and reordering represent distinct user actions with linked state changes. [Edit or cancel an order](https://www.walmart.com/help/article/edit-or-cancel-walmartn-order/2c7e3d99812044f8aaa65aee0eae3d1c) · [Track your order](https://www.walmart.com/help/article/track-your-order/143cf6e1d8cb48e6a1ed840409881235)
- **Returns.** Start from order details and place selection, per-item details, method and review in one focused flow. Reason and resolution are per item. Eligible methods depend on the purchased line, and submitted or completed quantities reduce what can be returned again. The app shows the request, its estimate and method instructions on a separate detail route. [Start an online return](https://www.walmart.com/help/article/start-return-online/a760300a0bfb4cd4891e43f092c8bd18) · [Walmart standard return policy](https://www.walmart.com/help/article/walmarts-price-match-policy/adc0dfb692954e67a4de206fb8d9e03a)
- **Registry.** The landing page gives My registries and Find a registry distinct paths. Create and Manage forms share the core event fields. The owner sees gift item management and the recipient sees purchased versus requested counts. A gift-giver records quantity, name and retailer. Product-to-registry addition uses a target picker and explicit save. [Gift Registry](https://www.walmart.com/cp/gifts-registry/1094765) · [Create a registry](https://www.walmart.com/help/article/creating-a-gift-registry-or-wishlist/b4a2add01eff49f6b1625ad544f2452d) · [Manage a registry](https://www.walmart.com/help/article/managing-a-gift-registry-or-wishlist/3e2ce30504b04a1285a5c5c30075e199) · [Manage gift items](https://www.walmart.com/help/article/adding-and-managing-gift-registry-or-wishlist-items/3e3dbb8a31494b4facb2d7c6c03fe42b) · [Mark an item as purchased](https://www.walmart.com/help/article/marking-an-item-as-purchased-for-gift-givers/3c40811052794a02a119a94351171937)

## Visual references

These files record interaction and information hierarchy from public sources. The intended layout and implementation tokens are in [DESIGN.md](../DESIGN.md).

| Reference file | Visible UI and provenance |
|---|---|
| [storefront-services.jpg](screenshots/reference/storefront-services.jpg) | Desktop capture with wordmark, catalog search, account and Cart along the masthead. The layered services menu exposes the Registry entry, with a pickup shortcut on the page below. [Refero capture](https://images.refero.design/screenshots/walmart.com/desktop/14e40ce6-f237-4cae-8369-112343c24444_thumb.jpg) |
| [cart-pickup-checkout.jpg](screenshots/reference/cart-pickup-checkout.jpg) | Desktop walkthrough with fulfillment tabs, a product card with Add, a cart summary, and pickup appointment review. Walmart Business guide, PDF page 11. [Walmart buyer guide](https://i5.walmartimages.com/dfw/4ff9c6c9-fd75/k2-_ea1f444c-ce15-4e3d-a05a-493008537f6d.v1.pdf#page=11) |
| [purchase-history.jpg](screenshots/reference/purchase-history.jpg) | History row, order details with status timeline and return entry point, and an itemized receipt with a totals column. Walmart Business guide, PDF page 8. [Walmart buyer guide](https://i5.walmartimages.com/dfw/4ff9c6c9-fd75/k2-_ea1f444c-ce15-4e3d-a05a-493008537f6d.v1.pdf#page=8) |
| [reserve-a-time.jpg](screenshots/reference/reserve-a-time.jpg) | Crop of the mobile scheduling view showing service tabs, address, date selector, radio rows with fees, and Reserve. The selected mode in the illustration is delivery. The date, window and review hierarchy also informs the pickup picker. [Walmart investor presentation](https://corporate.walmart.com/content/dam/corporate/documents/newsroom/events/walmart-investment-community-meeting-and-q-a-session/2025-Walmart-Investment-Community-Meeting-Presentation.pdf#page=124) |
| [registry-item-controls.jpg](screenshots/reference/registry-item-controls.jpg) | Gift entry, registry selection dialog, and an item card showing purchased versus requested counts and Manage/Remove actions. The guide depicts a nonprofit registry. The app uses the consumer help articles for owner and recipient rules. [Walmart.org registry guide](https://www.walmart.org/content/dam/walmart-org/documents/what-we-do/strengthening-community/spark-good/spark-good-getting-started/Spark-Good-Registry-and-Round-Up.pdf#page=15) |

## Data and scope

The shopper links to their cart, orders, and owned registries. Store windows and reservations have separate IDs so the verifier can track a hold through booking, release or rescheduling. Orders retain product and price snapshots. Returns link to the original order lines. Registries retain requested and purchased quantities and who recorded each purchase. The Marketplace API's line items, quantities, charges and fulfillment fields informed the order shape. The app uses its own Harbor schema. [Walmart order data documentation](https://developer.walmart.com/us-marketplace/docs/get-an-order)

The app starts with Maya Thompson's seeded account and supports multiple injected worlds. Account creation, memberships, external payment and carrier systems, and store check-in are outside this plan. Checkout, cancellation and return requests run on local records with no real-world transactions. See [data_model.md](data_model.md) for field definitions and [TODO.md](../TODO.md) for the per-action state writes and acceptance checks.

## Local catalog imagery

The built-in ImageGen tool created two studio photography contact sheets. The 32 cropped WebP images are in [public/images](../public/images) and are served with the app. Pack-size variants can share a product photo.

<details>
<summary>ImageGen prompts</summary>

**Contact sheet 1**

> Product-mockup use case. Square contact sheet of studio retail product photographs in a mathematically regular invisible 4 column by 4 row grid, pure white seamless backdrop, each product centered inside its own equal 25%-width square cell with very generous white margin so cells can be cut apart automatically. Exactly sixteen isolated items. Row 1 left to right: blue medium roast ground coffee canister, bright bunch of bananas, wide pasta jar with tomato sauce, green paper towel multipack. Row 2: turquoise laundry detergent bottle, blue dish soap bottle, black over-ear wireless headphones, small light gray Bluetooth speaker. Row 3: black countertop air fryer, sage folded cotton towels, clear glass food containers, white and teal baby diaper pack. Row 4: pair of baby bottles, colorful wooden block set, coral and white skincare bottle, tan and teal dry dog food bag. Photorealistic e-commerce thumbnail photography, distinct commercial package colors, avoid logos and prominent legible text, preserve grid and white gutters, no other objects.

**Contact sheet 2**

> Product-mockup use case. One square product photography contact sheet that will be split into a strict 4 by 4 grid. Each of sixteen items must be centered in its respective square with pure white backgrounds, generous white margins, no boundary lines, no logos or watermarks. Row 1 from left: medium roast coffee canister in dark blue at a rear 3/4 angle with ground coffee beside it, cylindrical oats carton, strawberry yogurt cups, gallon milk jug. Row 2: green wrapped pack of paper towels from side, toilet paper multipack, blue spray cleaner, silver USB C cable coiled. Row 3: black over-ear headphones photographed folded from side, compact black smart television without stand accessories, black air fryer from a three-quarter side angle, cream striped bedding set. Row 4: colorful toddler push walker toy, plush brown teddy bear, light-green shampoo bottle, small blue pouch of cat treats. High quality photoreal studio e-commerce listings with white backdrop.

</details>
