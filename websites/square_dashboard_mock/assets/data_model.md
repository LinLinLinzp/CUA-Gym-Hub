# Planned Square Dashboard state

`createInitialData()` in `src/data/seed.js` returns a new plain object containing `account`, `locations`, `categories`, `items`, `orders`, `payments`, `refunds`, `destinations`, `balances`, `payouts`, and `payoutEntries`. `account` is an object and all other top-level keys are arrays. Keep all keys JSON-serializable. Arrays provided by Harbor replace defaults and objects merge. Keep unknown fields intact when a user action changes a record.

## Types and record conventions

All IDs, names, notes and statuses are strings. `*At` fields are ISO timestamp strings. New business records use `new Date().toISOString()` and a stable unique ID. Seed records use deterministic IDs and ISO times. `actorId` identifies the seller who last acted on the record, or the author of an immutable event. Amounts, prices and fees are finite USD numbers with at most two decimal digits. Convert to integer cents for arithmetic and comparisons. Stock and quantities are whole numbers. `?` denotes an optional field which may be absent from an injected record. For generated records use the fields described here and apply the documented nulls where relevant.

## Account and reference data

| Record | Fields and example values |
| --- | --- |
| `account` | `merchantId: "m_alder_finch"`, `merchantName: "Alder & Finch Home"`, `actorId: "usr_maya"`, `actorName: "Maya Chen"`, `currency: "USD"`, `timeZone: "America/New_York"` |
| `locations[]` | `id: "loc_riverfront"`, `name: "Riverfront Shop"`, `timeZone?: "America/New_York"` |
| `categories[]` | `id: "cat_ceramics"`, `name: "Ceramics"` |
| `destinations[]` | `id: "dst_riverfront"`, `locationId: "loc_riverfront"`, `name: "Harbor Community Bank"`, `last4: "0418"`, `type: "bank_account"` or `"debit_card"` |
| `balances[]` | `locationId: "loc_riverfront"` (unique), `availableAmount: 1842.65`, `currency: "USD"`, `actorId: "usr_maya"`, `updatedAt: "2026-11-16T15:05:00.000Z"` |

## Items

| Record | Fields and example values |
| --- | --- |
| `items[]` | `id: "itm_001"`, `name: "Speckled Stoneware Mug"`, `description?: "Glazed ceramic, 12 oz"`, `categoryId: "cat_ceramics"` or `null`, `status: "active"` or `"archived"`, `variations: [variation]`, `actorId: "usr_maya"`, `createdAt: "2026-10-04T14:00:00.000Z"`, `updatedAt: "2026-11-15T15:05:00.000Z"` |
| `variation` | `id: "var_001_oat"`, `name: "Oat"`, `sku?: "MUG-SPK-OAT"`, `price: 18`, `stock: 24` |

One item owns one or more variations. Create a `Regular` variant row when opening a new form. When editing, keep the IDs of retained variants. Archive updates the item's status in place so old references still resolve. The item list derives stock and price range from current variants.

## Orders and payments

| Record | Fields and example values |
| --- | --- |
| `orders[]` | `id: "ord_031"`, `orderNumber: "AF-1031"`, `customerName?: "Avery Rivera"`, `locationId: "loc_riverfront"`, `source: "online"` or `"point_of_sale"`, `fulfillmentType: "pickup"` or `"shipping"`, `status: "new"`, `"in_progress"`, `"ready"`, `"completed"` or `"canceled"`, `totalAmount: 36`, `currency: "USD"`, `lineItems: [orderLine]`, `activity: [orderActivity]`, `actorId: "usr_maya"`, `createdAt: "2026-11-15T14:20:00.000Z"`, `updatedAt: "2026-11-15T14:23:00.000Z"` |
| `orderLine` | `id: "line_031_01"`, `itemId?: "itm_001"`, `variationId?: "var_001_oat"`, `name: "Speckled Stoneware Mug"`, `variationName?: "Oat"`, `quantity: 2`, `unitPrice: 18`, `totalAmount: 36` |
| `orderActivity` | `id: "evt_031_02"`, `type: "status_changed"`, `fromStatus: "new"`, `toStatus: "in_progress"`, `actorId: "usr_maya"`, `createdAt: "2026-11-15T14:23:00.000Z"`. A seed creation event may use `type: "created"` and `fromStatus: null`. |
| `payments[]` | `id: "pay_031"`, `orderId: "ord_031"`, `locationId: "loc_riverfront"`, `receiptNumber: "R-1031"`, `method: "card"` or `"cash"`, `cardLast4?: "7318"`, `status: "paid"`, `"pending"` or `"failed"`, `amount: 36`, `currency: "USD"`, `refundedAmount: 18`, `refundStatus: "none"`, `"partial"` or `"full"`, `actorId: "usr_maya"`, `createdAt: "2026-11-15T14:21:00.000Z"`, `updatedAt: "2026-11-16T15:05:00.000Z"` |

Default paid orders have one payment, found by `payments[].orderId`. For an injected order with multiple payments show each and require selection before refunding. Fulfillment status stays independent of payment status. Seed order totals sum line totals and the fixtures have no separate tax, tip, or discount component. Treat line data as the purchase snapshot even if its catalog item changed or was archived.

## Refunds

| Record | Fields and example values |
| --- | --- |
| `refunds[]` | `id: "ref_009"`, `orderId: "ord_031"` or `null` when the payment has no order link, `paymentId: "pay_031"`, `locationId: "loc_riverfront"`, `mode: "itemized"`, `"full"` or `"custom"`, `status: "completed"`, `"pending"` or `"failed"`, `amount: 18`, `currency: "USD"`, `reason: "Customer return"`, `lineItems: [refundLine]`, `actorId: "usr_maya"`, `createdAt: "2026-11-16T15:05:00.000Z"` |
| `refundLine` | `orderLineId: "line_031_01"`, `itemId?: "itm_001"`, `variationId?: "var_001_oat"`, `name: "Speckled Stoneware Mug"`, `quantity: 1`, `amount: 18` |

Refund against a paid payment. For the total previously refunded, use the higher of its stored `refundedAmount` and the sum of completed refunds linked to that payment. This avoids counting recorded refunds twice and supports injected payment snapshots with incomplete history. Subtract that total from the payment amount and clamp the remaining balance to zero. The local confirm creates a completed refund and updates `refundedAmount` to the previous refunded total plus the new amount. Compute `refundStatus` from the amount refunded compared with the original paid amount.

For an itemized refund subtract previously completed line quantities from the sold quantity. Allocate each line's gross cents across its units, giving the remainder cents to the first units, and compute selected amounts from the remaining units. Reject the selection if the sum exceeds the remaining payment amount. Custom amount refunds carry zero line records. A full refund uses all remaining refundable cents and includes the remaining sold line quantities when their computed sum equals that amount and the quantities can be attributed to the selected payment. Otherwise leave `lineItems` empty. For multiple payments against one order, keep the amount-based modes and disable itemization unless the payment can be tied to specific lines. Only expose itemization when price, quantity and attribution data are available.

## Payouts and settlement entries

| Record | Fields and example values |
| --- | --- |
| `payouts[]` | `id: "po_012"`, `locationId: "loc_riverfront"`, `destinationId: "dst_riverfront"`, `method: "instant"` or `"standard"`, `status: "pending"`, `"completed"` or `"failed"`, `amount: 120`, `feeAmount: 2.34`, `netAmount: 117.66`, `currency: "USD"`, `actorId: "usr_maya"`, `createdAt: "2026-11-16T15:05:00.000Z"`, `updatedAt: "2026-11-16T15:05:00.000Z"`, `estimatedArrivalAt?: "2026-11-16T15:15:00.000Z"` |
| `payoutEntries[]` | `id: "pe_012_01"`, `payoutId: "po_012"`, `type: "payment"` or `"refund"`, `paymentId: "pay_031"`, `refundId?: "ref_009"`, `grossAmount: -18`, `feeAmount: 0`, `netAmount: -18`, `currency: "USD"`, `createdAt: "2026-11-16T15:05:00.000Z"` |

Transfer amount is the gross amount debited from the location's balance. Fee is `round(grossCents × 195 / 10000)` cents and the recipient gets gross minus fee. Require a destination for the selected location, a net amount of at least $25 and a gross amount no greater than the available balance. Apply these fixed scenario rules consistently in the edit and review steps. New records start pending with an estimated arrival ten minutes after confirmation and an empty settlement-entry view. Payout history entries are seeded separately. Historical settlement entry net amounts sum to the payout gross where entries are available. The available balances represent funds reserved for the local transfer workflow. New refunds update the payment and refund ledger. They do not post new settlement entries.

## Seed fixtures and verification

- Use two locations and five categories. Seed 36 catalog items with price and inventory variation, including a zero-stock variant and several archived items. Seed 72 orders and at least 60 payments across both locations and channels. Build 26 refunds against eligible seeded payments and 30 payouts across both locations. Seed stable relationships with no dangling links and use fixed dates across several weeks. Restore the unfiltered list on an initial visit so fixed fixtures are visible under a different task clock.
- Include an active item with two variants, an editable archived item, a `new` pickup and a separate `in_progress` shipping order. Include three untouched paid orders for full, custom and itemized refund tests, a partially refunded payment with remaining line quantity, and one fully refunded payment. Give each location a linked destination. Include a completed historical payout with both payment and refund entries and at least one pending and one failed payout.
- Use a fresh browser context or a unique `sid` for injected test worlds so the template's same-session browser cache does not mask an injection. Assert stored values from `/go?sid=...` after waiting for the corresponding commit POST. Check the exact fields listed in `TODO.md`, including linked IDs, transaction amounts, and the before/after balance. Publish the final record shapes and action-to-field mapping in `SCHEMA.md` once app behavior is verified.
