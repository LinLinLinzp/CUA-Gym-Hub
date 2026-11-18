# target_mock Schema

**Base URL** `http://localhost:5309/`  
**Go Endpoint** `GET /go?sid=<sid>` → `{initial_state, current_state, state_diff}`  
**Inject** `POST /post?sid=<sid>` with `{"action":"set","state":{...}}`  
**Reset** `POST /post?sid=<sid>` with `{"action":"reset"}`

`GET /state?sid=<sid>` returns `{stored_state, has_custom_state, sid}`. In dev, reset restores the original server snapshot for that `sid`. A fresh browser context reads the server snapshot on boot. Reloads with an existing browser cache use its local copy. In Harbor, the task runtime supplies the session ID and implements the state endpoints.

## State Schema

| Key | Type | Description |
| --- | --- | --- |
| `guest` | `Guest` | Current Circle member, preferred store and masked checkout details. |
| `stores` | `Store[]` | Store addresses, hours, pickup instructions and tax rates. |
| `products` | `Product[]` | Catalog products and variants with prices and per-store pickup stock. |
| `offers` | `Offer[]` | Automatic offers, manual coupons and bonuses with eligibility rules. |
| `cart` | `Cart` | Active and saved lines plus last change timestamp. |
| `cartEvents` | `CartEvent[]` | Cart and store actions with before and after line details. |
| `circleOfferStates` | `CircleOfferState[]` | Current manual offer status by guest and offer. |
| `circleRedemptions` | `CircleRedemption[]` | Discounts applied and rewards earned on placed orders. |
| `orders` | `Order[]` | Purchases with original payment, amounts, fulfillment and item snapshots. |
| `pickupOrders` | `PickupOrder[]` | Pickup groups linked to order lines, with status and management history. |
| `returns` | `ReturnRequest[]` | Return requests with exact units, amounts, reasons and instructions. |
| `refunds` | `Refund[]` | Line-level refunds for returns and captured pickup cancellations. |

The schema describes `current_state`. Timestamps are ISO UTC strings. Amounts ending in `Cents` are integer USD cents. `actorId` links a record to the guest who made the change. The boot snapshot merges injected objects with defaults and replaces arrays. Each successful state change writes the whole state locally and issues one whole-state POST. Search, filters, catalog browsing, dialogs, review forms, eligibility projections, viewing instructions and printing do not save business state. Optional absent data is omitted from JSON. Use the snapshots in `current_state` for verification, since dev and Harbor can represent `state_diff` differently.

```ts
type ID = string
type ISO = string
type Fulfillment = 'shipping' | 'pickup'
type ReturnMethod = 'store' | 'mail'
type Payment = { id: ID, brand: string, last4: string }
type Address = { line1: string, city: string, region: string, postalCode: string }
type Audit = { id: ID, actorId: ID, createdAt: ISO }

type Guest = {
  id: ID, firstName: string, lastName: string, email: string,
  circleMember: boolean, preferredStoreId: ID | null, updatedAt: ISO,
  shippingAddress: Address | null, shippingTaxBasisPoints: number,
  payment: Payment | null
}
type Store = {
  id: ID, name: string, address: Address, pickupEnabled: boolean,
  pickupInstructions: string, closingHourLocal: number,
  timeZone: string, taxBasisPoints: number, hoursText?: string
}
type Product = {
  id: ID, tcin: string, title: string, brand: string,
  categoryId: ID, categoryLabel: string, description: string,
  imagePath: string, keywords: string[], rating: number, reviewCount: number,
  returnDays: number, returnMethods: ReturnMethod[],
  freshOrFrozen: boolean, variants: Variant[]
}
type Variant = {
  id: ID, label: string, priceCents: number, shippingAvailable: boolean,
  shippingRequiresMinimum: boolean, pickupStockByStoreId: Record<ID, number>,
  imagePath?: string
}

type CartLine = Audit & {
  productId: ID, variantId: ID, title: string, variantLabel: string,
  quantity: number, unitPriceCents: number, fulfillment: Fulfillment,
  storeId: ID | null, updatedAt: ISO
}
type Cart = { items: CartLine[], savedItems: CartLine[], updatedAt: ISO }
type CartEventLine = {
  lineId: ID, productId: ID, variantId: ID, fulfillment: Fulfillment,
  storeId: ID | null, quantity: number, unitPriceCents: number, amountCents: number
}
type CartEvent = Audit & {
  action: 'add' | 'quantity_change' | 'fulfillment_change' | 'remove' |
    'save_for_later' | 'move_to_cart' | 'store_select' | 'checkout',
  source: 'catalog' | 'product' | 'cart' | 'store_selector' | 'checkout' | 'buy_again',
  before: CartEventLine[], after: CartEventLine[],
  fromList: 'items' | 'savedItems' | null, toList: 'items' | 'savedItems' | null,
  fromStoreId?: ID | null, toStoreId?: ID | null, orderId?: ID
}
type Offer = {
  id: ID, kind: 'deal' | 'coupon' | 'bonus',
  scope: 'item' | 'category' | 'order', title: string, terms: string,
  productIds: ID[], categoryIds: ID[], fulfillment: Fulfillment[],
  startsAt: ISO, expiresAt: ISO, minSpendCents: number,
  valueType: 'percent' | 'fixed' | 'reward', value: number,
  maxUnits?: number
}
type CircleOfferState = Audit & {
  offerId: ID, status: 'saved' | 'active' | 'removed' | 'redeemed',
  updatedAt: ISO, savedAt?: ISO, activatedAt?: ISO, removedAt?: ISO, redeemedAt?: ISO
}
type CircleRedemption = Audit & {
  offerId: ID, orderId: ID, orderLineIds: ID[],
  kind: 'discount' | 'reward', status: 'applied' | 'earned',
  discountCents: number, rewardCents: number
}

type OfferDiscount = { offerId: ID, amountCents: number }
type OrderItem = {
  id: ID, actorId?: ID, createdAt?: ISO,
  productId: ID, variantId: ID, title: string, variantLabel: string,
  quantity: number, unitPriceCents: number, merchandiseCents: number,
  discountCents: number, taxCents: number, paidCents: number,
  offerDiscounts: OfferDiscount[], fulfillment: Fulfillment, storeId: ID | null,
  status: 'placed' | 'collected' | 'delivered' | 'cancelled',
  fulfilledAt?: ISO, returnUntil?: ISO, returnMethods: ReturnMethod[]
}
type Order = Audit & {
  orderNumber: string, status: 'placed' | 'partially_cancelled' | 'cancelled' | 'complete',
  updatedAt: ISO, currency: 'USD', payment: Payment | null,
  guestSnapshot?: { id: ID, firstName?: string, lastName?: string, email?: string },
  shippingAddress: Address | null, items: OrderItem[],
  subtotalCents: number, discountCents: number, shippingCents: number,
  taxCents: number, totalCents: number, offerIds: ID[]
}
type PickupPerson = { fullName: string, email: string }
type RefundLine = {
  orderLineId: ID, productId: ID, quantity: number,
  merchandiseCents: number, taxCents: number, amountCents: number
}
type PickupEvent = Audit & {
  action: 'placed' | 'edit_person' | 'extend' | 'cancel_items',
  orderId: ID, pickupOrderId: ID, storeId: ID,
  previousPerson?: PickupPerson | null, nextPerson?: PickupPerson,
  previousHoldUntil?: ISO, nextHoldUntil?: ISO,
  lines?: RefundLine[], amountCents?: number, refundId?: ID
}
type PickupOrder = Audit & {
  orderId: ID, storeId: ID, storeName: string, storeAddress: Address,
  pickupInstructions: string, orderLineIds: ID[],
  status: 'preparing' | 'ready' | 'collected' | 'cancelled',
  alternatePickupPerson: PickupPerson | null, updatedAt: ISO,
  estimatedReadyAt?: ISO, readyAt?: ISO, holdUntil?: ISO, collectedAt?: ISO,
  hasFreshOrFrozen: boolean, extensionCount: number,
  paymentStatus: 'authorized' | 'captured' | 'voided',
  barcode?: string, events: PickupEvent[]
}
type ReturnLine = RefundLine & {
  unitIndexes: number[],
  reason: 'changed_mind' | 'wrong_item' | 'damaged' | 'did_not_fit' | 'other'
}
type ReturnRequest = Audit & {
  orderId: ID, returnNumber: string, method: ReturnMethod,
  status: 'submitted' | 'in_transit' | 'completed' | 'cancelled', updatedAt: ISO,
  lines: ReturnLine[], estimatedRefundCents: number, refundId: ID,
  instructions: { barcode?: string, labelNumber?: string, carrier?: string }
}
type Refund = Audit & {
  source: 'return' | 'pickup_cancellation', orderId: ID,
  returnId?: ID, pickupOrderId?: ID, status: 'pending' | 'issued' | 'cancelled',
  currency: 'USD', payment: Payment | null,
  lines: RefundLine[], amountCents: number, updatedAt: ISO, issuedAt?: ISO
}
type TargetState = {
  guest: Guest, stores: Store[], products: Product[], offers: Offer[], cart: Cart,
  cartEvents: CartEvent[], circleOfferStates: CircleOfferState[],
  circleRedemptions: CircleRedemption[], orders: Order[], pickupOrders: PickupOrder[],
  returns: ReturnRequest[], refunds: Refund[]
}
```

### Default IDs

| Records | IDs and examples |
| --- | --- |
| Guest and payment | `guest-maya`, `payment-visa-4242` |
| Stores | `store-roseville`, `store-minneapolis-ne`, `store-midway`, `store-shoreview`, `store-richfield`, `store-downtown` |
| Products and variants | 54 products, including `prod-brightroom-bin` with `var-bin-charcoal` and `var-bin-clear`. |
| Offers | 36 offers, including `deal-home-10`, `coupon-bin-200` and `bonus-pickup-500`. |
| Cart and Circle history | `cart-line-1`–`cart-line-5`, `cart-event-seed-1`–`cart-event-seed-5`, `circle-state-seed-1`, `circle-state-seed-2`, `redemption-seed-1` |
| Orders and pickups | `order-1001`–`order-1036`, 26 pickup groups including ready `pickup-1001` and collected `pickup-1018`. |
| Returns and refunds | `return-1001`–`return-1024` and `refund-1001`–`refund-1024`. |

## Minimal Inject Example

Inject this state under a fresh `sid` to start with an empty cart and preserve the seeded catalog, offers and purchases.

```json
{
  "cart": { "items": [], "savedItems": [] },
  "cartEvents": []
}
```

## Record relationships

- `cart.items[]` and `cart.savedItems[]` refer to catalog products and variants, and to a store for pickup. Shipping uses `storeId: null`. Cart events retain line IDs and quantities. At write time they derive both sides’ unit price and extended price from the current catalog when available and otherwise use the line snapshot. A merge records both original line IDs and the surviving line ID.
- `circleOfferStates[].actorId` and `offerId` identify a manual benefit. `circleRedemptions[].orderId` and `orderLineIds[]` reference the purchase. A contributing discount appears in `orders[].items[].offerDiscounts[]`. A reward has `kind: 'reward'` with no amount deducted from the order.
- `pickupOrders[].orderId` links to `orders[].id`. A pickup group references its order lines by `orderLineIds[]` and preserves the store details. `expired` is a projection of a ready pickup with an elapsed hold.
- `returns[].refundId` and `refunds[].returnId` link the two records created by a return. Pickup refunds instead link through `refunds[].pickupOrderId`. Refunds snapshot the original masked payment. Each detail row links to `orders[].items[].id` through `orderLineId`. Return requests store exact one-based unit indexes. Each unit carries its original proportional share of paid merchandise and tax, with remainder cents assigned to the earliest indexes.
- Amounts on an order preserve its original checkout totals after cancellations or returns. Returnable quantities exclude the units reserved by submitted, in-transit and completed returns.

## Observable State Changes (for LLM evaluation)

| User action | Field paths written | Observable evidence |
| --- | --- | --- |
| Select My store | `guest.preferredStoreId`, `guest.updatedAt`, `cartEvents[]` | The appended `store_select` event has `source: 'store_selector'`, `fromStoreId` and `toStoreId`. |
| Add from catalog, product or Buy it again | `cart.items[]`, `cart.updatedAt`, `cartEvents[]` | The `add` event identifies its source and quantity snapshots. Identical fulfillment keys merge. |
| Change cart quantity | `cart.items[].quantity`, `cart.items[].updatedAt`, `cart.items[].title`, `cart.items[].variantLabel`, `cart.items[].unitPriceCents`, `cart.updatedAt`, `cartEvents[]` | The `quantity_change` event records the original and new quantity. |
| Change cart fulfillment or its pickup store | `cart.items[]`, `cart.updatedAt`, `cartEvents[]` | The `fulfillment_change` event carries both methods and store IDs in line snapshots. |
| Save for later | `cart.items[]`, `cart.savedItems[]`, `cart.updatedAt`, `cartEvents[]` | A `save_for_later` event moves the snapshot from `items` to `savedItems`. |
| Move to cart | `cart.savedItems[]`, `cart.items[]`, `cart.updatedAt`, `cartEvents[]` | A `move_to_cart` event records the restored line or merge. |
| Remove cart or saved item | `cart.items[]` or `cart.savedItems[]`, `cart.updatedAt`, `cartEvents[]` | The `remove` event identifies `fromList` and has an empty `after[]`. |
| Save, apply, activate or remove a manual Circle offer | `circleOfferStates[]`, `circleOfferStates[].status`, `circleOfferStates[].updatedAt`, `circleOfferStates[].savedAt`, `circleOfferStates[].activatedAt` or `circleOfferStates[].removedAt` | One guest/offer row retains its original creation data and previous action timestamps. |
| Place order | `orders[]` including `.items[]`, `.guestSnapshot`, `.payment`, `.shippingAddress` and totals, `pickupOrders[]` including `.alternatePickupPerson`, `.orderLineIds[]` and `.events[]`, `cart.items[]`, `cart.updatedAt`, `cartEvents[]` | Pickup groups start preparing and authorized. The cart is cleared in the same save as the order and the `checkout` event. |
| Apply an eligible Circle benefit when placing order | `orders[].offerIds[]`, `orders[].discountCents`, `orders[].items[].offerDiscounts[]`, `orders[].items[].discountCents`, `circleRedemptions[]`, `circleOfferStates[].status`, `circleOfferStates[].redeemedAt`, `circleOfferStates[].updatedAt` | Eligible automatic deals and active coupons allocate discounts to order lines. An earned bonus writes a reward redemption. Contributing manual benefits become redeemed. |
| Edit pickup person | `pickupOrders[].alternatePickupPerson`, `pickupOrders[].updatedAt`, `pickupOrders[].events[]`, `orders[].updatedAt` | The `edit_person` event contains before and after people. |
| Extend pickup | `pickupOrders[].holdUntil`, `pickupOrders[].extensionCount`, `pickupOrders[].updatedAt`, `pickupOrders[].events[]`, `orders[].updatedAt` | The `extend` event contains both deadlines. |
| Cancel pickup items | `orders[].items[].status`, `orders[].status`, `orders[].updatedAt`, `pickupOrders[].updatedAt`, `pickupOrders[].events[]`, and when the group is exhausted `pickupOrders[].status` and any authorization `pickupOrders[].paymentStatus` | The `cancel_items` event records line amounts and the related refund ID when captured. |
| Refund a captured pickup cancellation | `refunds[]` | The appended record has `source: 'pickup_cancellation'`, `pickupOrderId`, exact amount and line snapshots, and `status: 'pending'`. |
| Submit return | `returns[]` including `.lines[].unitIndexes[]`, `.lines[].reason`, `.method`, `.instructions` and `.refundId`, and `refunds[]` including `.lines[]`, `.payment`, `.amountCents` and `.returnId` | One save creates a submitted request and its pending `source: 'return'` refund. The selected quantities and initial paid amounts determine the refund. |
