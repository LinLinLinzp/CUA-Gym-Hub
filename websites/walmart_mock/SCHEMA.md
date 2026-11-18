# walmart_mock Schema

| Development API | Value |
| --- | --- |
| Base URL | `http://localhost:5308/` |
| Go endpoint | `GET /go?sid=<sid>` returns `{initial_state, current_state, state_diff}` |
| Read | `GET /state?sid=<sid>` returns the complete current snapshot in `stored_state` |
| Inject | `POST /post?sid=<sid>` with `{"action":"set","state":{...}}` |
| Reset | `POST /post?sid=<sid>` with `{"action":"reset"}` restores the server's original baseline. Open a fresh browser context to load the restored server snapshot. |

`state_diff` is keyed by root field. A changed or new field carries its full `modified` or `added` value. A partial injected baseline can yield diff entries when the startup POST fills in defaults. For a comparison from the hydrated world, capture `current_state` after startup and compare the relevant fields after acting.

Injected arrays replace the corresponding default arrays. Injected objects merge recursively. User commits carry forward additional injected root keys. On a fresh browser session, the shared Harbor template submits one merged baseline. Each accepted business action updates the local snapshot and starts one full-snapshot POST. Rejected actions, drafts, navigation, filters, and clipboard operations leave state unchanged. For persistence checks, inspect `/go.current_state` after the POST completes.

## State Schema

In the tables, `?` marks an optional field. Record references are IDs unless the field contains a snapshot. A mutable record’s creation and update metadata is `actorId`, `createdAt`, `updatedBy`, and `updatedAt`. An event has `id`, `type`, `actorId`, and `createdAt` plus the event-specific fields below.

IDs are strings, action timestamps are UTC ISO strings, and USD amounts are numbers calculated in integer cents.

| Key | Type | Description |
| --- | --- | --- |
| `profile` | object | `id`, `name`, `email`, `preferredStoreId?`, `addresses[]`, `paymentSummary?` |
| `catalog` | array | `id`, `title`, `brand`, `department`, `description?`, `variant?`, `imagePath?`, `galleryPaths[]?`, `featured?`, `seller`, `price`, `previousPrice?`, `taxRate`, `maxOrderQty`, `shippingStock`, `pickupStockByStore` (object keyed by store ID), `registryEligible`, `returnPolicy?` |
| `stores` | array | `id`, `name`, `address`, `timezone`, `pickupEnabled` |
| `pickupSlots` | array | `id`, `storeId`, `startAt`, `endAt`, `capacity`, `filled`, `fee`, `enabled` |
| `cart` | object | `id`, `ownerId`, `pickupReservationId` (ID or null), `lines[]`, `events[]` |
| `pickupReservations` | array | `id`, `cartId?`, `orderId?`, `storeId`, `slotId`, `status` (`held`, `booked`, `released`), `fee`, `expiresAt?`, `releaseReason?` (`changed`, `user_released`, `rescheduled`, `order_canceled`), creation and update metadata |
| `orders` | array | `id`, `orderNumber`, `ownerId`, `status` (`placed`, `preparing`, `ready_for_pickup`, `shipped`, `delivered`, `picked_up`, `canceled`), `fulfillmentMode` (`pickup`, `shipping`, or historical `delivery`), `lines[]`, `totals`, `paymentSummary?`, `shippingAddress?`, `storeId?`, `slotId?`, `pickupReservationId?`, `pickupPerson?` (or null), `editCutoffAt?`, `rescheduleCount?`, `fulfilledAt?`, `trackingNumber?`, `events[]`, creation and update metadata |
| `returns` | array | `id`, `returnNumber`, `orderId`, `actorId`, `createdAt`, `status` (`submitted`, `completed`, `canceled`), `method`, `instructionsCode`, `lines[]`, `refundEstimate`, `pickupAppointment?` |
| `registries` | array | `id`, `ownerId`, `name`, `registrantName`, `type` (`baby`, `wedding`, `classroom`), `eventDate` (ISO calendar date), `addressId?`, `visibility` (`public`, `private`), `status` (`active`, `deleted`), `items[]`, `events[]`, creation and update metadata |

| Nested record | Fields |
| --- | --- |
| Address | `id`, `recipient?`, `line1`, `line2?`, `city`, `region`, `postalCode`, `label?`, `timezone?` |
| Payment summary | `brand`, `last4` |
| Product snapshot | `title`, `variant?`, `seller?`, `imagePath?` |
| Return policy | `windowDays`, `methods[]` (`store`, `mail`, `scheduled_pickup`, `fedex_dropoff`), `resolutions[]` (`refund`, `replacement`) |
| `cart.lines[]` | `id`, `productId`, `quantity`, `fulfillmentMode` (`pickup`, `shipping`), `status` (`active`, `saved`), creation and update metadata |
| `cart.events[]` | Event type `added`, `quantity_changed`, `fulfillment_changed`, `saved`, `restored`, `removed`, `checkout` or `reordered`. Fields `orderId?` and `changes[]`, each with `lineId`, `productId`, `unitPrice` (number or null), `before` and `after` (each null or an object with `quantity`, `fulfillmentMode`, `status`) |
| `orders[].lines[]` | `id`, `productId`, `product` (snapshot), `quantity`, `unitPrice`, `taxRate`, `lineSubtotal`, `lineTax`, `returnPolicy?` (snapshot) |
| `orders[].totals` | `subtotal`, `tax`, `fulfillmentFee`, `total`, `currency` (`USD`) |
| `orders[].pickupPerson` | `name`, `email` |
| `returns[].lines[]` | `id`, `orderLineId`, `productId`, `quantity`, `reason`, `resolution`, `comment?`, `unitPrice`, `refundSubtotal`, `refundTax`, `refundAmount` |
| `returns[].pickupAppointment` | `address` (original order address snapshot), `startAt`, `endAt` |
| `registries[].items[]` | `id`, `productId`, `product` (snapshot), `status` (`active`, `removed`), `quantityRequested`, `quantityPurchased`, `purchases[]`, creation and update metadata |
| `registries[].items[].purchases[]` | `id`, `quantity`, `giverName`, `retailer`, `reference?`, `unitPrice?` (the current Walmart catalog price when present), `actorId`, `createdAt` |
| `registries[].events[]` | Event type `created`, `updated`, `deleted`, `item_added`, `item_updated`, `item_removed` or `item_purchased`. Fields `itemId?`, `productId?`, `purchaseId?`, and `changes[]` with `field`, `before`, and `after` |

| `orders[].events[].type` | Additional fields |
| --- | --- |
| `placed` | `status`, `totals`, `pickupReservationId?` |
| `items_edited` | `lineChanges[]` with `orderLineId`, `productId`, `beforeQuantity`, `afterQuantity`, `unitPrice`. Also `beforeTotals`, `afterTotals` |
| `pickup_person_updated` | `beforePickupPerson`, `afterPickupPerson` |
| `canceled` | `previousStatus`, `status`, `pickupReservationId?` |
| `rescheduled` | `previousSlotId`, `slotId`, `previousReservationId`, `pickupReservationId`, `beforeTotals`, `afterTotals` |

### Default IDs

| Records | Seeded IDs |
| --- | --- |
| Shopper and addresses | `user-maya`, `address-home`, `address-office` |
| Cart | `cart-maya`, with `cart-line-001` through `cart-line-007` |
| Catalog | 72 SKU IDs, including `sku-coffee-12oz`, `sku-headphones-black`, and `sku-diapers-size3-84` |
| Stores | `store-rogers`, `store-bentonville`, `store-lowell`, `store-springdale` |
| Pickup windows | 72 slot IDs, including `slot-rogers-d01-0900` and `slot-rogers-d00-next` |
| Pickup reservations | `reservation-001` through `reservation-026` |
| Orders | `order-001` through `order-036`. The first is editable, the second is locked, and the third has a partial return. |
| Returns | `return-001` through `return-024` |
| Registries | `registry-maya-baby`, `registry-maya-wedding`, and `registry-003` through `registry-030` |

## Minimal Inject Example

Send this body to `POST /post?sid=walmart-example`, then open `/item/sku-audit-mug?sid=walmart-example` in a fresh browser context. This fixture starts with one shippable item and an empty cart. Shopper and cart identity come from the defaults.

```json
{
  "action": "set",
  "state": {
    "catalog": [
      {
        "id": "sku-audit-mug",
        "title": "Stoneware Mug",
        "brand": "Mainstays",
        "department": "Home",
        "seller": "Walmart",
        "price": 4.98,
        "taxRate": 0.08,
        "maxOrderQty": 4,
        "shippingStock": 12,
        "pickupStockByStore": {},
        "registryEligible": true
      }
    ],
    "cart": { "lines": [], "events": [] },
    "stores": [],
    "pickupSlots": [],
    "pickupReservations": [],
    "orders": [],
    "returns": [],
    "registries": []
  }
}
```

## Observable State Changes (for LLM evaluation)

| User action | Fields written |
| --- | --- |
| Add a product from a card or item page | Append or merge `cart.lines[]` with `productId`, `quantity`, `fulfillmentMode`, `status: active` and metadata. Append `cart.events[]` of type `added`. |
| Increase or decrease cart quantity | Update `cart.lines[].quantity`, `updatedBy`, `updatedAt`. Append `cart.events[]` of type `quantity_changed`. |
| Switch cart fulfillment | Update `cart.lines[].fulfillmentMode` and update metadata. If merging, increase the destination line’s `quantity` and remove the source row. Append `cart.events[]` of type `fulfillment_changed` with all affected rows. |
| Save a cart line or move it back | Update `cart.lines[].status` and update metadata. If restoring into an active line of the same product and mode, increase the destination quantity and remove the saved row. Append `cart.events[]` of type `saved` or `restored`. |
| Remove cart line | Drop the relevant `cart.lines[]` entry. Append `cart.events[]` of type `removed` with the previous values and `changes[].after: null`. |
| Reserve or change a pickup window | Append a `pickupReservations[]` hold with cart, store, slot, fee, expiry, and metadata. Set `cart.pickupReservationId` to the new ID. A previous hold receives `status: released`, `releaseReason: changed`, `updatedAt` and `updatedBy`. |
| Release a cart hold | Clear `cart.pickupReservationId`. Set the prior hold’s `pickupReservations[].status: released`, `releaseReason: user_released`, `updatedAt` and `updatedBy`. |
| Place shipping order | Append `orders[]` with `status: placed`, `fulfillmentMode: shipping`, item snapshots, `totals`, `shippingAddress`, `paymentSummary`, metadata and `events[].type: placed`. Remove the shipping group from `cart.lines[]`; append `cart.events[].type: checkout` with `orderId` and removed-line changes. |
| Place pickup order | Append `orders[]` with `status: placed`, `fulfillmentMode: pickup`, item snapshots, `totals`, `paymentSummary`, metadata and `events[].type: placed`. Store `storeId`, `slotId`, `pickupReservationId`, `editCutoffAt`, `rescheduleCount: 0` and `pickupPerson` on the order. Update the held record to `pickupReservations[].status: booked`, set its `orderId` and update metadata, clear `cart.pickupReservationId`, remove only pickup lines from `cart.lines[]`, and append the linked `cart.events[].type: checkout` event. |
| Edit a pickup order’s items | Replace `orders[].lines[]` and `orders[].totals`. Set `orders[].updatedAt` and `updatedBy`; append `orders[].events[].type: items_edited` with quantity and total changes. |
| Edit alternate pickup person | Set `orders[].pickupPerson` and update metadata. Append `orders[].events[].type: pickup_person_updated` with prior and new values. |
| Cancel an eligible order | Set `orders[].status: canceled` and update metadata. Append `orders[].events[].type: canceled`. If linked to a booking, set `pickupReservations[].status: released`, `releaseReason: order_canceled`, `updatedAt` and `updatedBy`. |
| Buy again | Add eligible quantities to `cart.lines[]`. Append `cart.events[].type: reordered` with original `orderId` and each changed line. |
| Reschedule pickup | Append a new `pickupReservations[]` booking with `orderId`. Release the old booking with `releaseReason: rescheduled` and update metadata. Set `orders[].slotId`, `pickupReservationId`, `editCutoffAt`, `rescheduleCount`, `totals`, `updatedAt` and `updatedBy`; append `orders[].events[].type: rescheduled` with both slot and booking IDs and before/after totals. |
| Submit return | Append `returns[]` with `orderId`, `status: submitted`, actor and time, return number, instruction code, method, `refundEstimate`, each selected `lines[]` record, and `pickupAppointment` for scheduled pickup. |
| Create registry | Append `registries[]` with event details, owner and gift address IDs, visibility, `status: active`, metadata, empty `items[]` and `events[].type: created`. |
| Edit or delete registry | Update the registry’s changed fields and `updatedBy`, `updatedAt`; append `registries[].events[].type: updated` or `deleted`. Deletion sets `registries[].status: deleted`. |
| Add gift or change requested quantity | Append a new `registries[].items[]` row or update an active item’s `quantityRequested` and update metadata. Update the parent registry’s metadata and append `registries[].events[].type: item_added` or `item_updated` with changed fields. |
| Remove gift | Set `registries[].items[].status: removed` and update item and registry metadata. Append `registries[].events[].type: item_removed`. |
| Record gift purchase as owner or recipient | Increment `registries[].items[].quantityPurchased`. Append `registries[].items[].purchases[]` with quantity, giver, retailer, actor, time, optional reference, and current Walmart catalog price when available. Update item and registry metadata. Append `registries[].events[].type: item_purchased` with item, product and purchase IDs and changed quantity. |

A pickup hold uses its creation time plus 60 minutes, capped at the slot start. Slot availability derives from capacity, `filled`, upcoming bookings, and unexpired holds. Expiration, return eligibility, and remaining gift quantities are derived at read and commit time.
