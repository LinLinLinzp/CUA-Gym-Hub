# Target state model

`src/data/seed.js` exports `createInitialData()` with the twelve top-level keys in `TargetState`. Store JSON primitives, arrays and plain objects. IDs are stable opaque strings, with fixed IDs for seed records and fresh IDs for new records. Dates are ISO UTC strings. All `*Cents` fields are integer USD cents, prices are nonnegative and quantities are positive integers unless a field represents a before or after count of zero. Every new business record includes `actorId` and `createdAt`, including records created as part of one checkout or return submission.

## Catalog and guest

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
  shippingRequiresMinimum: boolean, pickupStockByStoreId: Record<ID, number>
}
```

Seed shopper `guest-maya` is Maya Chen, with `maya.chen@example.com`, a fictional Minneapolis shipping address, preferred store `store-roseville` and Visa ending `4242`. Store records can use labels such as Roseville and Minneapolis NE, with `America/Chicago`, `closingHourLocal: 22` and example rates such as `825` basis points. `prod-brightroom-bin` can have TCIN `91000001` and variant `var-bin-charcoal`, label `Charcoal`, price `1299`, rating `4.6`, `162` reviews, `returnDays: 90` and `/images/brightroom-bin-charcoal.webp`. A final-sale product has `returnMethods: []`. A nonvariant item has one `Standard` variant. Category labels can be derived from current product records.

## Cart and Circle

```ts
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
```

- Cart identity is product ID, variant ID, method and store ID. Shipping lines have `storeId: null`. A merged operation records all participating lines in `before` and the surviving line in `after`. Adds have zero or one matching line in `before`. A complete removal has no `after` line. A store event holds empty line arrays plus the old and new preference in `fromStoreId` and `toStoreId`. A checkout event holds the purchased snapshots in `before`, `after: []` and its `orderId`. Amounts in these snapshots are quantity × current unit price before discount.
- Cart titles and prices are fallback snapshots. Validate against the current catalog before a successful mutation or checkout. Changing the preferred store keeps existing lines linked to their original store. Aggregate quantities when validating the cart. Pickup availability is seeded on-hand less quantities from pending lines at the same store in preparing or unexpired ready pickup records, with a floor of zero. Cart items alone do not reserve inventory. Collected orders are already reflected in on-hand. Shipping validity uses the variant flags and seeded $35 minimum for variants that require it.
- Offer examples are `deal-home-10` (10 percent off Home & Decor), `coupon-bin-200` (200 cents off Brightroom bins) and `bonus-pickup-500` (500 reward cents after a qualifying $30 pickup merchandise subtotal). `percent` values are whole percentages. `fixed` and `reward` values are cents. An offer is active when `startsAt <= now < expiresAt`; evaluate `now` from `new Date()`. Missing rules on an injected offer should fail closed for pricing while preserving browsability when display fields exist.
- A guest/offer pair has at most one `circleOfferStates` record. Save a manual offer without activating it, or directly activate it. Keep `createdAt` and prior timestamps on updates and set the timestamp for the new status. Removed offers may be saved again. Redeemed manual offers cannot be spent again. Automatic deals never require this record. An order creates one redemption per offer that contributed savings or an earned reward.

## Order, pickup and returns

```ts
type OfferDiscount = { offerId: ID, amountCents: number }
type OrderItem = {
  id: ID, productId: ID, variantId: ID, title: string, variantLabel: string,
  quantity: number, unitPriceCents: number, merchandiseCents: number,
  discountCents: number, taxCents: number, paidCents: number,
  offerDiscounts: OfferDiscount[], fulfillment: Fulfillment, storeId: ID | null,
  status: 'placed' | 'collected' | 'delivered' | 'cancelled',
  fulfilledAt?: ISO, returnUntil?: ISO, returnMethods: ReturnMethod[]
}
type Order = Audit & {
  orderNumber: string, status: 'placed' | 'partially_cancelled' | 'cancelled' | 'complete',
  updatedAt: ISO, currency: 'USD', payment: Payment | null,
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

`orders[].id` joins pickup groups, return requests, refunds, Circle redemptions and checkout events. `orders[].items[].id` joins request and refund lines and pickup groups. A mixed order may have multiple pickup groups, one per store. Each requested return creates one refund. Refunds of ready pickup cancellations link to the pickup group. Use generic unavailable labels if optional references are missing. Block mutations whose required references or inputs are missing.

### Pricing and checkout transactions

Use one pure price calculation for cart, review and order placement. Check minimum spend on eligible merchandise before discounts and exclude shipping, tax and reward credits. For each line apply the best eligible automatic item deal, the best category deal and the best activated item coupon in that order. Break equal-value ties by ascending offer ID. A fixed item or category amount applies per eligible unit up to `maxUnits` when present. For offers affecting several lines, spend this cap in stable cart-line ID order. Apply the best eligible order-wide automatic deal next and allocate it by eligible net line value, with remaining cents assigned by ascending line ID. Apply percentage rounding to cents, cap each discount at the remaining eligible value and capture the resulting `offerDiscounts[]`. Earn a bonus on one qualifying checkout. It creates a separate reward redemption and leaves the amount due unchanged. Apply the selected store's fixture tax rate for pickup and the guest's rate for shipping. Charge a single `599` cent shipping fee for shippable merchandise subtotal below `3500`, otherwise free. Pickup is free. The fixture does not tax shipping or refund that fee. `OrderItem.merchandiseCents` is pre-discount and `paidCents = merchandiseCents - discountCents + taxCents`.

Create order, pickup groups, applicable Circle records and cart checkout event in one state update. Prevent double-clicks from creating duplicate orders. Derive display estimates and cart totals from state and do not persist them before checkout. A normal pickup checkout creates `status: 'preparing'`, `paymentStatus: 'authorized'`, `extensionCount: 0`, an estimated ready timestamp and a `placed` event. Ready and collected fixtures supply corresponding timestamps and a synthetic barcode. Apply hold expiration in the view. Most ready orders have three calendar days to pick up. Cold grocery holds end at closing time the next day the seeded store is open. P1 fixtures use stores open daily and allow a single three-calendar-day extension for a ready order without cold groceries and before its deadline. On cancellation, update the selected pickup lines, keep the group active if any remain, and void its authorization if every line is canceled before capture. Preserve original order totals and record any ready-line refund separately. The parent status is `cancelled` when all lines are canceled, `partially_cancelled` when some are canceled, `complete` when all lines are fulfilled and none are canceled, and `placed` otherwise.

### Return quantities and refunds

Determine eligibility from each order line's fulfillment, policy snapshot and return deadline. A collected or delivered line with a current return window and a remaining eligible method can be returned. Effective return quantity is purchased quantity less units reserved by submitted, in-transit or completed returns. Exclude canceled returns from this count. Assign the lowest unused one-based `unitIndexes`, then sum exact portions of the original net merchandise and tax. Split each part by integer quotient, giving the extra cents to the lowest indexes. This prevents partial refunds from exceeding the original payment. For a two-unit line at `1299` each with a `260` discount and `193` tax, index 1 refunds `1266` and index 2 refunds `1265`. For a captured pickup cancellation, use the original net merchandise and tax for all selected uncollected lines. Return and cancellation `refunds[].lines[].merchandiseCents` is net paid merchandise.

For example, `order-1018` can have order number `910000001018`, collected line `order-line-1018-1`, and linked `pickup-1018` at `store-roseville`. `return-1001` can record `reason: 'did_not_fit'`, `method: 'store'`, `unitIndexes: [1]`, `estimatedRefundCents: 1266` and `instructions.barcode: '990000000001'`. `refund-1001` can hold `amountCents: 1266`, frozen masked payment and `status: 'issued'`. Entering the return flow and viewing existing instructions are read-only. Submission creates a return and pending refund together. Use fixtures to demonstrate carrier movement, completed returns and issued refunds. There is no clock-driven fulfillment, return, or refund write.

## Default fixtures

- Return all twelve keys from `createInitialData()`. Use one UTC date anchor derived when building a new default world, with fixed offsets for offers, orders, holds and return dates. This keeps ready and returnable fixtures usable under Harbor's frozen clock. Keep seed IDs, amounts, inventory, relationship links and text fixed. For targeted test worlds inject explicit dates. Compute date comparisons and labels from `new Date()` at render and mutation time.
- `guest` and `stores`: one English-speaking Circle member and six Twin Cities stores, with meaningful name and ZIP searches, pickup service differences and store-specific stock. Seed masked payment and shipping address, with no payment credentials.
- `products`: 54 English items across Household Essentials, Grocery, Home & Decor, Beauty, Electronics and Clothing. Include searchable store brands such as Good & Gather, up & up, Brightroom and Threshold, priced from $2 to $150. Mix color and size variants, pickup quantities, shipping-only stock, a fresh or frozen item, final sale, store-only returns and standard store/mail returns. Include at least two independently selectable in-stock items at the default store and one pickup line eligible at a second store.
- `offers` and Circle history: 36 offers spanning item, category and order deals, coupons and bonuses, with overlapping eligible and ineligible rows and limits. Include active, saved, redeemable, expired and future offers. Ensure an automatic deal and a qualifying manual offer can apply to the same seeded scenario. Seed example manual states and redemptions with valid owner, offer and order references.
- `cart`: three active lines across pickup and shipping and two saved lines. Include an eligible offer and a stock mismatch after a store change. Seed valid example cart history entries and keep `cartEvents` usable if injected as `[]`.
- `orders` and `pickupOrders`: 36 orders in all, with at least 24 pickup groups across preparing, ready, collected, canceled and elapsed holds, plus delivered shipping and mixed fulfillment orders. Include a ready, captured non-grocery pickup with two active lines for edit, extend and cancellation tests and a nonextendable cold grocery pickup. Separate pickup groups preserve their store snapshots.
- `returns` and `refunds`: 24 linked examples, including a partly returned collected order, store barcode, store-only item, mailed return in transit and completed return with an issued refund. Include a delivered order with more than one refundable unit and a different mail-eligible order. Ensure any prior refund amounts respect original paid amounts and quantity allocations.
