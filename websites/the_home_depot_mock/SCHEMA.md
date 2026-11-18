
# the_home_depot_mock Schema

**Base URL** `http://localhost:5315/`  
**Go endpoint** `GET /go?sid=<sid>` returns `{initial_state, current_state, state_diff}`  
**Read stored state** `GET /state?sid=<sid>` returns `{stored_state, has_custom_state, sid}`  
**Inject** `POST /post?sid=<sid>` with `{"action":"set","state":{...}}`  
**Reset** `POST /post?sid=<sid>` with `{"action":"reset"}` restores the initial snapshot on the local Vite server.

Each mutation reads the SID's current state through `/state` before validating the action. Each successful confirmation sends the complete state through the shared data manager. Loading an uncached SID sends a baseline `set`. Refreshing a cached SID reads localStorage. Inject with a fresh SID to exercise a new fixture. Injected arrays replace defaults, object fields merge, and unrelated fields survive user actions. Viewing, searching, filtering, editing a draft, reviewing, dismissing and failing validation send no `set_current`.

## State Schema

| Key | Type | Record fields |
| --- | --- | --- |
| `account` | Object | `id`, `name`, `email`, optional `preferredStoreId` |
| `stores` | Array | `id`, `name`, `address` |
| `products` | Array | `id`, `sku`, `name`, `category`, `unitPrice` |
| `orders` | Array | `id`, `orderNumber`, `actorId`, `createdAt`, `status`, `fulfillment`, `items[]`, `subtotal`, `tax`, `shipping`, `total`; optional `storeId`, `deliveryAddress`, `carrier`, `trackingNumber`, `fulfilledAt`, `cancellation` |
| `rentalTools` | Array | `id`, `name`, `category`, `rates.{fourHours,daily,weekly}`, `depositAmount`, `storeIds[]`; optional `imageKey` |
| `rentals` | Array | `id`, `toolId`, `toolName`, `storeId`, `pickupAt`, `durationHours`, `quantity`, `estimatedAmount`, `depositAmount`, `status`, `actorId`, `createdAt`; optional `cancellation` |
| `projectLists` | Array | `id`, `name`, `description`, `status`, `items[]`, `actorId`, `createdAt`, `updatedAt`; optional `updatedBy` |
| `returns` | Array | `id`, `orderId`, `method`, `status`, `items[]`, `refundAmount`, `actorId`, `createdAt`; optional `storeId` for in-store drop-off |

| Nested record | Fields |
| --- | --- |
| `orders[].items[]` | `id`, `productId`, `sku`, `name`, `quantity`, `unitPrice`; optional `returnMethods[]`, `returnBy` |
| `orders[].cancellation` | `reason`, `actorId`, `createdAt` |
| `rentals[].cancellation` | `actorId`, `createdAt` |
| `projectLists[].items[]` | `id`, `productId`, `name`, `sku`, `unitPrice`, `quantity`, `note`, `status`, `actorId`, `createdAt`, `updatedAt`; optional `updatedBy` |
| `returns[].items[]` | `orderItemId`, `productId` (nullable if unavailable on the source line), `quantity`, `reason`, `unitPrice`, `amount` |

IDs are strings. Relationship fields reference the corresponding entity IDs. `actorId` and `updatedBy` reference `account.id`. New record IDs use a type prefix and a random 128-bit hexadecimal suffix. Timestamps are ISO 8601 strings generated at confirmation. The inclusive optional `returnBy` is a local calendar date in `YYYY-MM-DD` format. Amounts are numeric USD and calculated amounts round to cents. Quantities and durations are positive integers.

- Order statuses are `processing`, `shipped`, `ready_for_pickup`, `picked_up`, `delivered`, `purchased` and `cancelled`. Fulfillment values are `ship_to_home`, `store_pickup` and `in_store`. Cancellation reasons are `ordered_by_mistake`, `changed_mind`, `no_longer_needed` and `other`.
- Rental statuses are `reserved`, `active`, `completed` and `cancelled`. Duration values `4`, `24` and `168` map to `fourHours`, `daily` and `weekly` respectively. The estimate is the selected rate for quantity `1`. The deposit is recorded separately. Only reserved and active bookings block overlapping half-open time ranges for the same tool and store.
- List statuses are `active` and `deleted`. Material statuses are `active` and `removed`. Legacy lists and material lines with absent status are treated as active. The displayed materials estimate is derived from active quantities and unit prices.
- Return statuses are `requested`, `in_transit`, `received`, `refunded` and `cancelled`. Methods are `in_store` and `mail`. When `returnMethods` is omitted, shipments default to both methods and other orders default to in-store. An empty array excludes the line. Cancelled requests release the associated quantity. Reasons are `no_longer_needed`, `wrong_item`, `damaged`, `did_not_fit` and `other`.

### Default IDs

| Entity | IDs |
| --- | --- |
| Account | `account-casey-morgan` |
| Stores | `store-north-ridge`, `store-willow-creek`, `store-maple-heights` |
| Products | 36 `product-<key>` records with SKUs `71000421`–`71000456`. The first is `product-deck-screws`. See the product keys in [seed.js](src/data/seed.js). |
| Orders | `order-10401`–`order-10436`, with two lines per order named `line-<order number>-1` and `line-<order number>-2`. |
| Rental tools | 30 `tool-<name>` records. Use the lowercase name with spaces replaced by hyphens, with `tool-floor-sander` for Drum Floor Sander. |
| Reservations | `rental-2001`–`rental-2024` |
| Project lists | `list-3001`–`list-3024`, with material IDs `list-line-<list number>-<one-based position>` |
| Returns | `return-4001`–`return-4024`. Lines reference the original `orderItemId`. |

### Minimal Inject Example

The following request body creates an empty account workspace. The account name overrides the default name, and omitted account fields come from the seed.

```json
{
  "action": "set",
  "state": {
    "account": { "name": "Jordan Reed" },
    "stores": [],
    "products": [],
    "orders": [],
    "rentalTools": [],
    "rentals": [],
    "projectLists": [],
    "returns": []
  }
}
```

## Observable State Changes (for LLM evaluation)

Each row refers to a record matched by stable `id`. The action time is the current clock time and the actor is the current account.

| Confirmed action | Fields written in `current_state` |
| --- | --- |
| Confirm order cancellation | `orders[].status = "cancelled"` and `orders[].cancellation = { reason, actorId, createdAt }`. |
| Confirm reservation | Append `rentals[]` with fresh `id`, selected `toolId`, snapshotted `toolName`, selected `storeId` and `pickupAt`, `durationHours`, `quantity = 1`, `estimatedAmount`, `depositAmount`, `status = "reserved"`, `actorId` and `createdAt`. |
| Confirm reservation cancellation | `rentals[].status = "cancelled"` and `rentals[].cancellation = { actorId, createdAt }`. |
| Create list | Append `projectLists[]` with fresh `id`, trimmed `name` and `description`, `status = "active"`, `items = []`, `actorId`, `createdAt` and `updatedAt = createdAt`. |
| Save list | Set `projectLists[].name`, `description`, `updatedAt` and `updatedBy`. |
| Add material | Append `projectLists[].items[]` with fresh `id`, `productId`, snapshotted `name`, `sku` and `unitPrice`, selected `quantity`, trimmed `note`, `status = "active"`, `actorId`, `createdAt` and `updatedAt = createdAt`. For a matching active product, increment its existing `quantity`, replace `note` when supplied, and stamp its `updatedAt` and `updatedBy`. Stamp the parent `updatedAt` and `updatedBy` in either case. |
| Save material | Set `projectLists[].items[].quantity`, `note`, `updatedAt` and `updatedBy`. Stamp the parent `updatedAt` and `updatedBy`. |
| Remove material | Set `projectLists[].items[].status = "removed"` and stamp `updatedAt` and `updatedBy` on the item and its parent list. |
| Delete list | Set `projectLists[].status = "deleted"`, `updatedAt` and `updatedBy`. |
| Submit return | Append `returns[]` with fresh `id`, `orderId`, `method`, `storeId` if selected for in-store drop-off, `status = "requested"`, `actorId`, `createdAt`, `items[]` and the sum of item amounts in `refundAmount`. Each item has `orderItemId`, `productId`, `quantity`, `reason`, `unitPrice` and the rounded `amount = quantity × unitPrice`. |
