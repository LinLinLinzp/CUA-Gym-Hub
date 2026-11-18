# Chewy account state model

Export `createInitialData()` from `src/data/seed.js`. Return a fresh JSON object with the keys in this document. Use fixed string IDs and deterministic seed records. `createdAt`, `updatedAt`, `cancelledAt`, and `removedAt` are ISO timestamps. Birthdays and scheduled ship dates use `YYYY-MM-DD`. USD amounts are numeric and rounded through integer cents. New user actions assign stable unique IDs and capture one `new Date().toISOString()` for the entire transition. Use `account.id` as the actor ID.

## Account and saved selections

| Top-level key | Type | Fields and example values |
| --- | --- | --- |
| `account` | Object | `id: 'acct-maya'`, `firstName: 'Maya'`, `lastName: 'Bennett'` |
| `addresses[]` | Array | `id: 'addr-home'`, `label: 'Home'`, `recipient: 'Maya Bennett'`, `line1: '42 Clover Lane'`, optional `line2`, `city: 'Madison'`, `region: 'WI'`, `postalCode: '53703'` |
| `paymentMethods[]` | Array | `id: 'pay-visa'`, `brand: 'Visa'`, `last4: '4242'`, `label: 'Visa ending in 4242'` |
| `products[]` | Array | `id: 'prod-001'`, `name: 'Turkey & Oat Recipe Dry Dog Food'`, `category: 'dog_food'`, `variant: '24 lb bag'`, `unitPrice: 38.99`, `autoshipEligible: true`, `returnable: true`, optional `imageKey: 'dog-food'` |

## Autoships

- `autoships[]` holds plans with `id: 'as-001'`, `name: 'Dog food and dental chews'`, `status: 'active'` or `'cancelled'`, `nextShipDate: '2026-12-03'`, `frequencyWeeks: 4`, `addressId`, `paymentMethodId`, `createdAt`, `actorId`, optional `updatedAt`, `updatedBy`, and `cancelledAt`. Each `items[]` line has `id: 'as-001-item-01'`, `productId`, snapshot `name`, optional `variant` and `imageKey`, `quantity: 1`, `unitPrice: 38.99`, and `returnable: true`.
- `autoshipEvents[]` has `id`, `autoshipId`, `action`, `actorId`, and `createdAt`. Use `date_changed`, `frequency_changed`, `shipment_skipped`, `cancelled`, `item_added`, `item_quantity_changed`, `item_removed`, or `ordered_now`. Store action-specific `previous` and `next` objects using the affected fields. Item changes carry `itemId`, `productId`, quantity and `unitPrice` in the applicable snapshots. Order now also carries `orderId`. If P2 is implemented, use `address_changed` or `payment_changed` with the previous and new saved IDs.
- Search the plan name and item snapshot names. Display plan total from the current items. Keep cadence and date independent. Order now copies plan lines into a new linked order with fresh order-line IDs, removes no historical records, and schedules the next ship date today plus one cadence.

## Orders

- `orders[]` contains `id: 'ord-001'`, `orderNumber: 'CHE-5821047'`, `status: 'processing' | 'shipped' | 'delivered' | 'cancelled'`, `createdAt`, `actorId`, `items[]`, `subtotal: 38.99`, `shipping: 4.95`, `tax: 2.20`, `total: 46.14`, optional `autoshipId`, `sourceOrderId`, `deliveredAt`, `updatedAt`, `updatedBy`, and `cancelledAt`. `address` snapshots the address fields above and `paymentLabel` snapshots the masked label. Store optional `carrier`, `trackingNumber`, and `trackingEvents[]` with `label`, location text, and `createdAt`.
- Order items have `id: 'ord-001-item-01'`, `productId`, `name`, optional `variant` and `imageKey`, `quantity`, `unitPrice`, `returnable`, and `lineTotal`. Store the purchase snapshot on the order so history stays readable even when injected catalog arrays are empty.
- `orderEvents[]` contains `id`, `orderId`, `action: 'cancelled' | 'reordered'`, `actorId`, `createdAt`, and `previousStatus`/`newStatus` for cancellation or `sourceOrderId` and `newStatus` for reorder. Reorder starts with the source order’s line prices, shipping, and tax so a review with unchanged quantities matches the final amount.

## Pets

- `pets[]` has `id: 'pet-001'`, `name: 'Juniper'`, `species: 'Dog'`, optional `breed: 'Australian Shepherd mix'`, `birthday: '2020-04-18'`, `weightLbs: 43.5`, `notes: 'Prefers soft training treats.'`, and `imageKey: 'dog-03'`. Include `status: 'active' | 'removed'`, `actorId`, `createdAt`, and optional `updatedAt`, `updatedBy`, and `removedAt`. Treat unspecified status as active when rendering injected records.
- `petEvents[]` has `id`, `petId`, `action: 'created' | 'updated' | 'removed'`, `actorId`, `createdAt`, and `previous`/`next` snapshots where applicable. Include the edited profile fields or the removal status in the snapshots. A removed profile stays addressable and leaves the active gallery.

## Returns

- `returns[]` has `id: 'ret-001'`, `returnNumber: 'RET-10428'`, `orderId`, `status: 'requested' | 'in_transit' | 'refunded'`, `refundMethod: 'original_payment' | 'account_credit'`, `items[]`, `itemsAmount: 18.50`, `shippingRefund: 0`, `taxRefund: 1.02`, `refundAmount: 19.52`, `actorId`, `createdAt`, and optional `refundedAt` and offline `instructions` text.
- Each return line has `orderItemId`, `productId`, snapshot `name`, `quantity: 1`, `unitPrice: 18.50`, `amount: 18.50`, and `reason: 'wrong_size'`. Suggested reasons include wrong size, damaged, incorrect item, and no longer needed.
- Use delivered status, the purchase date, the line returnable flag, and prior linked returns to determine eligibility. Use `createdAt` for the 365-day purchase window when available and support sparse delivered records without crashing. Calculate remaining quantity from previously submitted lines. Allocate tax proportionally to the merchandise amount and reconcile rounding on the last eligible full-return submission. Refund shipping once if the submission completes the return of the entire order. Use the same calculation for review and the resulting record. Keep previous return statuses as seeded or injected. New submissions start `requested` and the workflow performs no automatic status transitions.

## Deterministic initial data

| Collection | Target | Coverage |
| --- | ---: | --- |
| `addresses`, `paymentMethods` | 3 each | Home, cabin, and foster supplies destination. Three masked synthetic payment labels |
| `products` | 48 | Dog food, cat food, litter, chews, grooming, toys, small-animal supplies, and nonreturnable examples |
| `autoships` | 24 | Mix active household deliveries and historical cancellations. Use varied frequencies, destinations, and plan sizes |
| `orders` | 48 | Delivered, shipped, processing, and cancelled. Recent and older orders, both repeat deliveries and one-off purchases, with prices and quantities that reconcile |
| `pets` | 24 | Resident and foster pets, including dogs, cats, rabbits, birds, and other species. Include a few missing optional details |
| `returns` | 24 | Requested, in transit, and refunded. Include open eligible quantities, fully returned lines, and partial returns. Leave recent delivered orders with no prior returns |
| `autoshipEvents`, `orderEvents`, `petEvents` | As applicable | Seed coherent history or empty arrays. Capture future actions through store mutations |

Use IDs such as `prod-001`, `as-001`, `ord-001`, `pet-001`, and `ret-001`. Give `as-001` an active two-item plan, `ord-001` a recent delivered order with at least two eligible items including one with multiple units, `ord-002` a shipped order with tracking, and `ord-003` a processing order. Keep the first pet easy to find and edit. Use a documented fixed seed reference date and render any relative wording against the runtime clock. Include only compact local artwork keys in persisted records.

## Relationships and injected worlds

- `orders[].autoshipId` points to the plan that placed the order. `orders[].sourceOrderId` points to the original purchase when reordered. Returns point to the purchase and its line IDs. Event records point to their subject and the acting account. Plan address and payment references point to saved selections.
- Restore defaults only through the supplied loader’s object merge. Read an injected empty list as empty. Display missing labels, optional fields, and unresolved lookups gracefully from snapshots or neutral placeholders. Sort copies and derive summaries without altering loaded state.
- Validate against current records at submission and apply each successful user action as one store update. Keep search queries, filters, dialogs, selections, and review drafts in view state. See `../TODO.md` for the expected write set and `../SCHEMA.md` after implementation for the exact implemented shape.
