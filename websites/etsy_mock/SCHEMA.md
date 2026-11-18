# etsy_mock Schema

**Base URL**: `http://localhost:5312/`  
**Go Endpoint**: `GET /go?sid=<sid>` → `{initial_state, current_state, state_diff}`  
**Inject**: `POST /post?sid=<sid>` with body `{"action":"set","state":{...}}`  
**Reset**: `POST /post?sid=<sid>` with body `{"action":"reset"}`

`GET /state?sid=<sid>` returns `{stored_state, has_custom_state, sid}`. The first `set` establishes the session baseline. Later writes preserve that baseline, and `reset` restores it. Each changed top-level field in `state_diff` has a `modified` entry containing its current value, or an `added` entry for a new key. A user action commits the full state through the shared store.

## State Schema

### Conventions

- IDs are unique strings with a stable entity prefix. Default IDs and all default date values are literal or deterministic. New records use unique IDs and `new Date().toISOString()` for creation and update times. A `?` after a field name indicates it can be absent in injected data.
- All prices and monetary amounts are numbers in major currency units. Calculate in integer cents and then serialize once. `currency` is an ISO currency code, with `USD` as the default account currency. Quantities and stock are nonnegative integers, with a minimum of one for purchased or requested lines.
- References use entity IDs. Retail and support records retain display snapshots so that a removed listing or shop can still appear in historical views. Treat missing arrays as empty and render missing joins and optional text with local fallbacks. Resolve missing or ineligible targets at submit time and report the issue without writing.
- Every entity is a plain object. `buyer` is a top-level object and all other top-level collections below are arrays. Optional UI state, such as unsent drafts, filters, and return form selections, stays outside Harbor state.

### Buyer and marketplace

| Top-level key | Fields and types | Example values and relationships |
| --- | --- | --- |
| `buyer` | `id: string`, `name: string`, `email: string`, `currency: string`, `addresses: Address[]`, `paymentMethods: PaymentMethod[]`, `defaultAddressId?: string`, `defaultPaymentMethodId?: string`, `favoriteItemsVisibility?: Visibility`, `favoriteShopsVisibility?: Visibility`, `updatedAt?: ISO string` | `buyer_mara`, Mara Bennett, `mara.bennett@example.com`, `USD`, `private` |
| `shops` | `id: string`, `name: string`, `ownerName?: string`, `location?: string`, `description?: string`, `image?: string`, `rating?: number`, `reviewCount?: integer`, `createdAt?: ISO string` | `shop_lark_clay`, Lark & Clay Studio, Asha Reed, Asheville NC, 4.8 |
| `listings` | `id: string`, `shopId: string`, `title: string`, `description?: string`, `category?: string`, `tags?: string[]`, `image?: string`, `price: number`, `currency: string`, `stock: integer`, `variants?: VariantGroup[]`, `personalization?: { required: boolean, prompt: string, maxLength: integer }`, `shippingPrice?: number`, `deliveryDays?: [integer, integer]`, `returnPolicy?: ReturnPolicy`, `createdAt?: ISO string`, `updatedAt?: ISO string`, `updatedBy?: string` | `listing_oat_mug`, linked to `shop_lark_clay`, Oat Glaze Stoneware Mug, Home & Living, `29.50`, stock `9`, finish “Oat” or “Juniper”, `shippingPrice: 5.25`, `deliveryDays: [4, 8]` |

- `Address` has `id`, `name`, `line1`, optional `line2`, `city`, `region`, `postalCode`, and `country`, all strings. Example synthetic address `addr_mara_home`, Mara Bennett, 24 Linden Row, Portland, OR, 97214, US.
- `PaymentMethod` has `id`, `brand`, `last4`, and optional `label`, all strings. Example `pay_mara_visa`, Visa ending in 4242. Checkout accepts a known saved method and stores the same masked values in its receipt snapshot.
- `VariantGroup` has `id`, `name`, and `options: { id: string, label: string }[]`. Example `finish`, Finish, `oat` and `juniper`. Chosen variants use `{ groupId, optionId, label }[]` in cart and order lines.
- `ReturnPolicy` has `accepted: boolean`, `windowDays?: integer`, and `summary?: string`. Example `true`, `30`, “Contact the shop about your return within 30 days of delivery.” Visibility is `private` or `public`.

### Cart and orders

| Top-level key | Fields and types | Example values and relationships |
| --- | --- | --- |
| `cartItems` | `id: string`, `buyerId: string`, `listingId: string`, `shopId: string`, `quantity: integer`, `unitPrice: number`, `currency: string`, `variants?: VariantSelection[]`, `personalization?: string`, `createdAt: ISO string`, `updatedAt?: ISO string` | `cart_oat_mug`, references `buyer_mara`, `listing_oat_mug`, `shop_lark_clay`, quantity `2` at `29.50` each |
| `cartActivity` | `id: string`, `actorId: string`, `cartItemId: string`, `listingId: string`, `shopId: string`, `action: string`, `previousQuantity: integer`, `quantity: integer`, `unitPrice: number`, `currency: string`, `orderId?: string`, `createdAt: ISO string` | `added`, `quantity_changed`, `removed`, or `purchased`. A removed line has quantity `0`, and a purchased line references its order |
| `orders` | `id: string`, `orderNumber: string`, `buyerId: string`, `shopId: string`, `shopName: string`, `status: string`, `source: string`, `items: OrderItem[]`, `currency: string`, `subtotal: number`, `shipping: number`, `tax: number`, `total: number`, `shippingAddress?: Address`, `paymentMethod?: PaymentMethod`, `estimatedDeliveryStartAt?: ISO string`, `estimatedDeliveryEndAt?: ISO string`, `deliveredAt?: ISO string`, `createdAt: ISO string` | `order_1007`, `ET-1007`, `delivered`, `cart` or `buy_now`, items `59.00`, shipping `5.25`, tax `0.00`, total `64.25`. Other seeded statuses include `paid`, `shipped`, and `cancelled` |

`OrderItem` has `id`, `listingId`, `title`, optional `image`, `quantity`, `unitPrice`, `lineTotal`, optional `variants`, optional `personalization`, and optional `returnPolicy`. Example `line_1007_mug`, Oat Glaze Stoneware Mug, quantity `2`, `unitPrice: 29.50`, `lineTotal: 59.00`. Checkout validates current listing prices, configurations, and aggregate stock. It calculates totals per shop and uses that shop's highest listed shipping charge once, with sandbox tax of zero. A checkout uses one currency. Each end of the delivery estimate uses the highest corresponding bound across the shop's listings, added to the purchase time. Receipt and support math use the order snapshots.

The Buy it now draft lives in session storage under `etsy:buy-now:<sid>` (or `etsy:buy-now:_default`). It survives a reload and is cleared after successful checkout. Cart checkout validates stock across all configurations of each listing and deducts the aggregate in the successful purchase commit.

### Messages and order help

| Top-level key | Fields and types | Example values and relationships |
| --- | --- | --- |
| `threads` | `id: string`, `buyerId: string`, `shopId: string`, `listingId?: string`, `orderId?: string`, `subject: string`, `unread: boolean`, `lastMessageId?: string`, `createdAt: ISO string`, `updatedAt: ISO string`, `readAt?: ISO string`, `updatedBy?: string` | `thread_1007`, “Help with order ET-1007”, `unread: true`; buyer, shop and order identify the matching thread |
| `messages` | `id: string`, `threadId: string`, `actorId: string`, `actorType: 'buyer' \| 'shop'`, `body: string`, `listingId?: string`, `orderId?: string`, `helpRequestId?: string`, `createdAt: ISO string` | `message_1007_a`, references `thread_1007`, “One of the mugs arrived with a cracked handle.” |
| `helpRequests` | `id: string`, `orderId: string`, `buyerId: string`, `shopId: string`, `threadId: string`, `messageId: string`, `reason: string`, `desiredResolution: string`, `body: string`, `lines: SupportLine[]`, `status: 'sent'`, `createdAt: ISO string` | `help_1007`, `damaged`, `return`, one unit of `line_1007_mug` |
| `returnRequests` | `id: string`, `helpRequestId: string`, `orderId: string`, `buyerId: string`, `shopId: string`, `reason: string`, `resolution: 'return' \| 'exchange' \| 'refund'`, `status: string`, `lines: SupportLine[]`, `requestedAmount: number`, `currency: string`, `createdAt: ISO string` | `return_1007`, `requested`, `requestedAmount: 29.50`, references `order_1007` and `help_1007` |

`SupportLine` contains `orderItemId: string`, `listingId: string`, `quantity: integer`, `unitPrice: number`, and `amount: number`. Multiply quantity by the order-item unit price for the requested merchandise amount. Use the item snapshots even if the listing was edited or removed. A return, exchange, or refund request records what the buyer asked for, with the corresponding request status. Delivery and payment fields still describe the purchase.

Use scope `(buyerId, shopId, orderId)` for order threads, `(buyerId, shopId, listingId)` for listing threads, and `(buyerId, shopId)` with neither context ID for shop-level threads. Plain messages and help messages share a chronological inbox, with help messages identified by `helpRequestId`.

### Cases

| Top-level key | Fields and types | Example values and relationships |
| --- | --- | --- |
| `cases` | `id: string`, `orderId: string`, `helpRequestId: string`, `buyerId: string`, `shopId: string`, `reason: string`, `details: string`, `refundPreference: string`, `lines: SupportLine[]`, `requestedAmount: number`, `currency: string`, `status: 'open' \| 'closed'`, `log: CaseLogEntry[]`, `createdAt: ISO string`, `updatedAt: ISO string`, `updatedBy?: string`, `closedAt?: ISO string` | `case_1009`, `damaged`, `original_payment`, `open`, linked to `order_1009` and `help_1009` |

`CaseLogEntry` contains `id: string`, `actorId: string`, `actorType: 'buyer' \| 'shop' \| 'etsy'`, `action: 'opened' \| 'commented' \| 'closed'`, optional `body: string`, and `createdAt: ISO string`. For case opening, allow `damaged`, `not_as_described`, and `non_delivery`. Show the earliest possible escalation from the later of `estimatedDeliveryEndAt` and 48 hours after the earliest matching seller help request. Compare to `new Date()` when rendering the screen or submitting. If an order lacks eligibility data, keep Help with order available and explain the missing precondition. Use one open case per order and surface it instead of creating a duplicate. The local workflow models the delivery and prior-contact gates and keeps eligible historical fixtures accessible for testing.

### Favorites and collections

| Top-level key | Fields and types | Example values and relationships |
| --- | --- | --- |
| `favorites` | `id: string`, `buyerId: string`, `targetType: 'listing' \| 'shop'`, `targetId: string`, `createdAt: ISO string` | `fav_001`, `listing`, `listing_oat_mug`; active rows are unique per buyer, target type, and target ID |
| `collections` | `id: string`, `buyerId: string`, `name: string`, `visibility: Visibility`, `createdAt: ISO string`, `updatedAt?: ISO string`, `updatedBy?: string` | `collection_slow_mornings`, Slow Mornings, `private` |
| `collectionItems` | `id: string`, `collectionId: string`, `listingId: string`, `buyerId: string`, `createdAt: ISO string` | `membership_0_0`, `collection_slow_mornings`, `listing_oat_mug`; unique per collection and listing |
| `favoriteActivity` | `id: string`, `actorId: string`, `action: string`, `targetType?: 'listing' \| 'shop'`, `targetId?: string`, `favoriteId?: string`, `collectionId?: string`, `collectionItemId?: string`, `name?: string`, `visibility?: Visibility`, `favoriteItemsVisibility?: Visibility`, `favoriteShopsVisibility?: Visibility`, `createdAt: ISO string` | `favorited`, `unfavorited`, `followed`, `unfollowed`, `collection_created`, `collection_updated`, `collection_item_added`, `collection_item_removed`, and optional `privacy_updated` |

### Default IDs

- Buyer `buyer_mara`, address `addr_mara_home`, and payment method `pay_mara_visa`.
- Shop `shop_lark_clay` and listing `listing_oat_mug`, with variant group `finish` and options `oat` and `juniper`.
- Orders `order_1001` through `order_1024`. Order `order_1007` includes `line_1007_mug`, thread `thread_1007`, help request `help_1007`, and return request `return_1007`.
- Open case `case_1009` and closed case `case_1010`.
- Favorites `fav_001` through `fav_026`. Collections `collection_slow_mornings`, `collection_paper_drawer`, and `collection_little_gifts`, including membership `membership_0_0`.

## Minimal Inject Example

Send this body to `POST /post?sid=<sid>` before opening a fresh browser session. Orders and conversations start empty while omitted keys retain their seed defaults.

```json
{
  "action": "set",
  "state": {
    "orders": [],
    "threads": [],
    "messages": [],
    "helpRequests": [],
    "returnRequests": [],
    "cases": []
  }
}
```

## Observable State Changes (for LLM evaluation)

| User action | Required writes |
| --- | --- |
| Add to cart | Insert `cartItems[]` or increase `cartItems[].quantity` for the same listing, variant selections, and personalization. Set `updatedAt`. Append `cartActivity[]` with `action: added` for a new line (previous quantity zero), or `quantity_changed` for a merge. |
| Edit or remove a cart line | Edit `cartItems[].quantity` and `updatedAt` or delete that line. Append `cartActivity[]` with `action: quantity_changed` or `removed`. Removal has `quantity: 0`. |
| Place order | Append `orders[]` per shop with `status: paid`, `source: cart` or `buy_now`, item/address/payment snapshots, shipping, tax, total, and dates. Decrement `listings[].stock` and set its `updatedAt` and `updatedBy`. Cart checkout deletes purchased `cartItems[]` and appends `cartActivity[]` with `action: purchased`, `orderId` and `quantity: 0`. |
| Send a seller message or reply | Insert or reuse `threads[]` and set `threads[].updatedAt`, `updatedBy`, and `lastMessageId`. Append `messages[]` with `actorType: buyer`, trimmed `body`, and applicable context IDs. |
| Open an unread thread or mark it read | Set `threads[].unread: false`, `readAt`, and `updatedBy`. Preserve `updatedAt` and `lastMessageId`. |
| Send an order help request | Append `helpRequests[]` with `status: sent`, selected `lines`, and its `threadId` and `messageId`. The order thread and its new message update as above, with the message carrying `helpRequestId` and `orderId`. |
| Request a return, exchange, or refund | Also append `returnRequests[]` with `status: requested`, `helpRequestId`, `orderId`, selected `lines`, `currency`, and `requestedAmount` for the selected merchandise. |
| Open a case | Append `cases[]` with `status: open`, qualifying `helpRequestId`, line quantities, requested amount, and refund preference. Create the first `cases[].log[]` entry with `action: opened`. |
| Comment on or close a case | Append `cases[].log[]` with `action: commented` and its body or `action: closed`. Set `cases[].updatedAt`, `updatedBy`, and on close set `status: closed` and `closedAt`. |
| Favorite or unfavorite an item, follow or unfollow a shop | Insert/remove `favorites[]`. Append `favoriteActivity[]` with `action: favorited`, `unfavorited`, `followed`, or `unfollowed`, plus `targetType`, `targetId`, and `favoriteId`. |
| Create or edit a collection | Insert/update `collections[]` with `name`, `visibility`, `updatedAt`, and `updatedBy`. Append `favoriteActivity[]` with `action: collection_created` or `collection_updated`, `collectionId`, `name`, and `visibility`. |
| Add or remove a collection item | Insert/remove `collectionItems[]` and append `favoriteActivity[]` with `action: collection_item_added` or `collection_item_removed`, `collectionId`, `collectionItemId`, `targetType: listing`, and `targetId`. This membership persists through an unfavorite action. |
| Save favorites privacy | Set `buyer.favoriteItemsVisibility`, `buyer.favoriteShopsVisibility` and `buyer.updatedAt` on change. Append `favoriteActivity[]` with `action: privacy_updated` and both visibility values. |

`src/data/seed.js` seeds these 15 keys with 36 listings, 24 shops, 24 orders, 24 threads, 48 messages, 26 favorites, three collections, nine memberships, three help and return requests, and two cases. Order `order_1007` is eligible to open a case, `order_1008` has two purchased units and no seller help request, and `order_1009` already has an open case. Draft interactions, navigation, time-derived badges, and idle views stay in the browser.
