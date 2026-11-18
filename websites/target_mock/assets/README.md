# Target shopping research

Target combines a general merchandise catalog, a store-aware cart, member pricing and order self-service. A shopper can move from search and product availability through checkout, then return to past purchases for pickup instructions, returns and refund status. [Target storefront](https://www.target.com/) · [Create an order](https://www.target.com/help/articles/orders-purchases/create-an-order)

## Shoppers and workflows

| Shopper | Typical path |
| --- | --- |
| Household shopper | Search for a specific item, compare variants and fulfillment, add several items and adjust quantities in Cart. |
| Circle member | Browse eligible Target Circle deals, save or activate a manual benefit, then review savings before paying. |
| Time-sensitive pickup shopper | Check stock at the preferred store or change stores, place an Order Pickup order, add an alternate person, then use Order Details for the hold window and barcode. |
| Returns shopper | Find the correct order and product, submit a partial return, reopen the store barcode or mail label and review the refund status. |

## Product behavior and evidence

- **Catalog and cart.** Target presents product images, ratings, variants, quantities and fulfillment choices on product pages. Order help documents adding and removing products, reviewing quantities and methods, and continuing to checkout. Some items can ship only if the cart meets a merchandise threshold, so quantity and fulfillment can affect whether a cart is valid. Public product pages identify items by TCIN. The plan uses an independent fixture schema and fixed product IDs linked to fixture TCINs. [Brightroom product detail](https://www.target.com/p/-/A-94848881) · [Create an order](https://www.target.com/help/articles/orders-purchases/create-an-order) · [Shipping help](https://www.target.com/help/articles/delivery-options/ship-to-home) · [Current cart route](https://www.target.com/cart)
- **Circle.** Target's current help calls these deals and says most member deals apply automatically. Personalized bonuses and coupons can be saved or activated. The public help directs shoppers to the dashboard, Deals and View saved. Offer terms can depend on an item, a category, a fulfillment method or a minimum spend. The sandbox models one qualifying checkout for its reward bonus fixture. [Target Circle deals](https://www.target.com/help/articles/target-circle/target-circle-offers) · [Promotion terms](https://www.target.com/help/articles/promotions-coupons/current-promotions)
- **Order Pickup.** Target documents website pickup placement, a barcode available from Order Details when ready, alternate pickup people, and eligible item cancellation. The general hold is three days, with a shorter hold for fresh or frozen groceries and one extension available on eligible orders. Target also documents Drive Up availability on the site. This plan implements the in-store Order Pickup flow, including Guest Services and kiosk instructions. [Drive Up and Order Pickup help](https://www.target.com/help/articles/delivery-options/drive-up-order-pickup) · [Orders route](https://www.target.com/orders)
- **Returns.** Target documents starting a return from a past online purchase and using a store barcode or a prepaid mailing label for eligible items. Eligibility and timing vary by item and fulfillment, and the original payment method usually receives the refund. The plan uses per-item eligibility snapshots and preserves quantities and net paid amounts across multiple requests. [Returns help](https://www.target.com/help/articles/returns-exchanges/returns)
- **Desktop and mobile.** The public desktop shop uses search and fulfillment navigation in the header. Target's mobile app adds in-store tools and mobile-specific shopping surfaces. The sandbox exposes the same core web tasks at desktop and narrow widths. It uses normal web keyboard behavior and visible focus, without requiring product-specific shortcuts. [Target storefront](https://www.target.com/) · [Target's App Store listing](https://apps.apple.com/us/app/target-shop-style-save/id297430070) · [Target accessibility](https://www.target.com/c/accessibility/-/N-4ynq1)

## Feature inventory and view map

| Priority | View or surface | Layout and interaction |
| --- | --- | --- |
| P0 | Header, routing and state | Wordmark, site search, navigation band, store context, Purchases and Cart count. Keep the header in one shared shell across routes. Show neutral loading and route-level missing-record states. |
| P0 | Harbor integration and fixture seed | Session-scoped baseline and mutation writes. Seeded guest, catalog, offers, cart, fulfillment history and returns. Local media make the main routes usable offline. |
| P1 | Home, search and product details | Homepage highlights categories and product cards. Search results have faceted navigation and a responsive card grid. Product details place imagery next to variant and fulfillment choices. Quick add and detail add share cart rules. |
| P1 | Store selection | A modal provides a city, ZIP or name search, current-store marker, pickup availability and store selection. Existing pickup rows can be moved explicitly in Cart. |
| P1 | Cart and Save for later | Group active item rows by method and store and put the summary next to them. Keep quantity, method and saved-item actions in the rows. |
| P1 | Circle deals, saved offers and checkout redemption | Deals, Bonuses and View saved use clear active, saved and redeemed states. Present terms beside the activation control. Show projected benefits in cart and actual price allocations on submitted orders. |
| P1 | Checkout and pickup placement | Present pickup store and person, shipping if needed, masked payment and review. Show order number and Order Details link after placement. |
| P1 | Purchase history and pickup management | List order number, date, products, fulfillment and status. Detail view shows status, expiration, store instructions, barcode and available actions. |
| P1 | Return request and tracking | Present quantities, reasons and methods before review. The confirmation shows a barcode or mail label. Existing requests and refund information stay attached to Order Details. |
| P2 | Buy it again and store hours | Reuse cart validation and show store information alongside search results. |

## Reference screenshots

These six captured interfaces illustrate product hierarchy and task controls. The private checkout and purchase detail paths are based on Target Help. The mobile references cover information hierarchy and are identified below. The implementation uses the original layout and styling in [DESIGN.md](../DESIGN.md).

| Reference | Observed visual patterns | Provenance |
| --- | --- | --- |
| [Catalog filters](screenshots/reference/catalog-filters.png) | White desktop page with a top utility strip, horizontal navigation, a promotion, popular filters, a control row and a four-card results grid. Images, prices and red quick-add actions are visually prominent. | [Talking to Computers search case study](https://www.talkingtocomputers.com/using-search-redirects/) |
| [Product detail](screenshots/reference/product-detail.png) | Left-side image grid and a narrow right purchase column. The selected fulfillment tile has an outline, with store and stock details above quantity and Add to cart. | [Growth Memo Target walkthrough](https://www.growth-memo.com/p/target) |
| [Desktop cart](screenshots/reference/cart.png) | Compact product thumbnails, quantity selector and Save for later sit beside fulfillment choices. A narrow summary panel carries checkout and savings. The captured page illustrates a signed-out cart. | [DealNews cart capture](https://www.dealnews.com/features/target/promo-codes/) |
| [Circle bonus](screenshots/reference/circle-bonus.jpg) | A historical desktop and mobile comparison with the reward amount and activation button in the offer card. Use current help for the rules and labels, which have evolved since this capture. | [The Krazy Coupon Lady Circle bonus capture](https://thekrazycouponlady.com/tips/store-hacks/target-christmas-ornaments) · [Current Target Circle help](https://www.target.com/help/articles/target-circle/target-circle-offers) |
| [Pickup ready, mobile](screenshots/reference/pickup-mobile.png) | An overlay puts ready status and store name above the next action and dims the storefront behind it. The original button belongs to the curbside Drive Up flow. The web Order Pickup detail follows the documented barcode path. | [Target Tech Drive Up walkthrough](https://tech.target.com/blog/powering-target-drive-up) · [Target pickup barcode help](https://www.target.com/help/articles/delivery-options/drive-up-order-pickup) |
| [Return options, mobile](screenshots/reference/return-options-mobile.png) | A bottom sheet shows a heading followed by a vertical stack of return methods with icons and short instructions. Store and mail options are visually distinct. | [Target corporate return fact sheet](https://corporate.target.com/press/fact-sheet/2023/04/fast-and-free-all-the-facts-on-returns-with-drive-up) |

## State and scope

The fixed-ID fixture world starts with one Circle member and enough varied product, offer and order records to make searching, filtering and joining records meaningful. Cart lines, offer status and redemptions, pickup groups, return requests and refunds retain structured history through the standard Harbor state API. The pricing and status projections are computed from those records. [Data model and fixture plan](data_model.md)

Authentication, live transactions, carrier integrations, curbside handoff and staff processing sit outside the desktop training flows. A pre-signed-in guest, masked payment, and seeded ready, collected, in-transit and refunded records cover the relevant entry points and hold the runtime offline. [Implementation and acceptance checklist](../TODO.md)
