# Account state model

Use these shapes for `createInitialData()` and document the final implementation in `../SCHEMA.md`. All money fields are numeric USD, rounded to cents. Quantities and durations are positive integers. IDs are stable strings across edits. Use fixed seed timestamps and `new Date().toISOString()` when recording a user action. `actorId` and `updatedBy` reference `account.id`.

## Top-level keys and record shapes

Examples show representative types and values. Fields marked optional may be omitted by fixtures. An injected array replaces its seeded collection. Render safely when relationships are missing, and use stored names and prices for historical records. Preserve unrecognized fields on updates.

| Key | Type and example fields |
| --- | --- |
| `account` | Object with `id: "account-casey-morgan"`, `name: "Casey Morgan"`, `email: "casey.morgan@example.test"`, `preferredStoreId: "store-north-ridge"` (optional). |
| `stores` | Array of `{ id: "store-north-ridge", name: "North Ridge Rental Center", address: "1200 Ridgeway Ave, North Ridge, OH 44010" }`. Addresses are synthetic. |
| `products` | Array of `{ id: "product-deck-screws", sku: "71000421", name: "Exterior Deck Screws, 1 lb.", category: "Hardware", unitPrice: 12.98 }`. Optional `imageKey` resolves to local artwork. |
| `orders` | Array of `{ id: "order-10401", orderNumber: "HD-10401", actorId: "account-casey-morgan", createdAt: "2026-11-12T15:30:00.000Z", status: "delivered", fulfillment: "ship_to_home", items: [OrderItem], subtotal: 33.96, tax: 2.72, shipping: 0, total: 36.68 }`. Optional `storeId`, `deliveryAddress`, `carrier`, `trackingNumber`, `fulfilledAt`, `cancellation`. |
| `rentalTools` | Array of `{ id: "tool-floor-sander", name: "Drum Floor Sander", category: "Floor Care", rates: { fourHours: 49, daily: 69, weekly: 276 }, depositAmount: 75, storeIds: ["store-north-ridge"] }`. Optional `imageKey` resolves to local artwork. |
| `rentals` | Array of `{ id: "rental-2001", toolId: "tool-floor-sander", toolName: "Drum Floor Sander", storeId: "store-north-ridge", pickupAt: "2026-11-22T15:00:00.000Z", durationHours: 24, quantity: 1, estimatedAmount: 69, depositAmount: 75, status: "reserved", actorId: "account-casey-morgan", createdAt: "2026-11-16T15:00:00.000Z" }`. Optional `cancellation`. |
| `projectLists` | Array of `{ id: "list-3001", name: "Deck Refresh", description: "Replace weathered fasteners and finish the boards.", status: "active", items: [ProjectListItem], actorId: "account-casey-morgan", createdAt: "2026-11-10T15:00:00.000Z", updatedAt: "2026-11-10T15:00:00.000Z" }`. Optional `updatedBy`. |
| `returns` | Array of `{ id: "return-4001", orderId: "order-10401", method: "in_store", storeId: "store-north-ridge", status: "requested", items: [ReturnItem], refundAmount: 12.98, actorId: "account-casey-morgan", createdAt: "2026-11-14T15:00:00.000Z" }`. `storeId` is optional. |

| Nested record | Fields |
| --- | --- |
| `OrderItem` | `{ id: "line-10401-1", productId: "product-deck-screws", sku: "71000421", name: "Exterior Deck Screws, 1 lb.", quantity: 2, unitPrice: 12.98, returnMethods: ["in_store", "mail"] }`. `returnMethods` is optional and defaults to `in_store` and `mail` for shipped orders, or `in_store` for pickup and store purchases. An explicit `[]` makes the line ineligible. Optional `returnBy` is an inclusive `YYYY-MM-DD` date. |
| `OrderCancellation` | `{ reason: "ordered_by_mistake", actorId: "account-casey-morgan", createdAt: "2026-11-18T16:20:00.000Z" }`. Other reason codes `changed_mind`, `no_longer_needed`, `other`. |
| `RentalCancellation` | `{ actorId: "account-casey-morgan", createdAt: "2026-11-18T16:30:00.000Z" }`. |
| `ProjectListItem` | `{ id: "list-line-3001-1", productId: "product-deck-screws", sku: "71000421", name: "Exterior Deck Screws, 1 lb.", quantity: 3, unitPrice: 12.98, note: "Use on the stair treads.", status: "active", actorId: "account-casey-morgan", createdAt: "2026-11-10T15:00:00.000Z", updatedAt: "2026-11-10T15:00:00.000Z" }`. Optional `updatedBy`. |
| `ReturnItem` | `{ orderItemId: "line-10401-1", productId: "product-deck-screws", quantity: 1, reason: "no_longer_needed", unitPrice: 12.98, amount: 12.98 }`. Other reason codes `wrong_item`, `damaged`, `did_not_fit`, `other`. |

## Status, eligibility and calculations

- Orders use `processing`, `shipped`, `ready_for_pickup`, `picked_up`, `delivered`, `purchased` and `cancelled`. Fulfillment uses `ship_to_home`, `store_pickup` and `in_store`. Orders in `processing` or `ready_for_pickup` can be cancelled. Returns start from `delivered`, `picked_up` or `purchased` orders with eligible quantities.
- Rentals use `reserved`, `active`, `completed` and `cancelled`. Offer 4, 24 and 168 hour durations using the associated fixed rate. Pickup time must be in the future according to `new Date()`. Compare proposed and existing half-open time ranges for overlap at the same store and tool, counting `reserved` and `active` bookings. The estimate excludes the separate deposit. Default reservation quantity is one.
- Project lists use `active` and `deleted`. Material lines use `active` and `removed`. Treat absent legacy list and line status as `active` when rendering. A re-add merges with an active line for the same `productId` or creates a fresh line if the prior matching item was removed. Sum active quantities times snapshotted unit prices for the displayed materials estimate.
- Returns use `requested`, `in_transit`, `received`, `refunded` and `cancelled`. Compute remaining quantity per order line by subtracting the sum of that line in non-cancelled returns for the same order. Check explicit `returnBy` against the current date when present. Show only methods supported by every selected line and retain a selected store drop-off location when applicable. The synthetic refund estimate sums rounded merchandise amounts for the selected quantities. Include at least one eligible fixture without a return deadline for tests running with a frozen clock.
- Missing optional labels, addresses, dates, rates or item arrays render as an empty state or a descriptive fallback. Keep receipt contents readable when products disappear. Require enough source data to make a valid new transaction and explain unavailable actions. Fixed seed status stays explicit and time-relative text uses the runtime clock at render time.

## Seed fixture matrix

Use stable IDs and diverse English labels throughout. These examples are anchors for browser tests and injected-world tasks.

| Entity | Minimum and cases |
| --- | --- |
| Orders | 36 across shipping, pickup and in-store purchases, spanning recent and older dates. `order-10401` is delivered with two returnable deck-screw units, one already requested on `return-4001`, and one non-returnable $8 line. `order-10402` is a processing order eligible for cancellation. Include shipped orders with synthetic tracking, a ready-for-pickup order, completed orders with eligible stock, and a cancelled order. |
| Rental tools and stores | 30 tools across floor care, lawn and garden, power tools and moving equipment. Three synthetic stores with differing inventory. `tool-floor-sander` is searchable as Drum Floor Sander and available at `store-north-ridge`. Include tools available at just one store and tools with broader availability. |
| Rental reservations | 24 across reserved, active, completed and cancelled states with linked tools and stores. Include at least one reserved booking for the sander to verify conflict handling. Test a reservation using a future slot relative to the test clock. |
| Project lists and materials | 24 lists from small repairs to room renovations, including empty lists and several with five or more items. Seed active and deleted lists, varied quantities and notes, and at least 36 searchable catalog products. Include `list-3001`, Deck Refresh. |
| Returns | 24 across the return statuses and both methods, with partial and multi-line examples. Link every item to a real order line and respect each ordered quantity. Include a cancelled request that releases quantity and an order with no units remaining. |

## Observable state changes

| Confirmed user action | Write |
| --- | --- |
| Cancel order | Match `orders[].id`, set `status` to `cancelled`, and set `cancellation` with `reason`, `actorId` and `createdAt`. |
| Reserve equipment | Append a complete `rentals[]` record with status `reserved`, a fresh ID, the selected tool and store, pickup time, duration, quantity and numeric estimate and deposit. |
| Cancel reservation | Match `rentals[].id`, set `status` to `cancelled`, and set `cancellation` with `actorId` and `createdAt`. |
| Create project list | Append a complete `projectLists[]` record with status `active`, a fresh ID and empty `items`. |
| Rename or describe list | Set `name` and `description` on the matching list and stamp `updatedAt` and `updatedBy`. |
| Add material | Append a complete item with status `active` and a fresh ID or increment the matching active item's `quantity` and stamp its `updatedAt` and `updatedBy`. Stamp the parent list on either path. |
| Edit or remove material | Set the matching item's `quantity` and `note` on edit or `status` to `removed` on removal. Stamp both item and list with `updatedAt` and `updatedBy`. |
| Delete list | Set list `status` to `deleted`, and stamp `updatedAt` and `updatedBy`. |
| Request return | Append a complete `returns[]` record with status `requested`, a fresh ID, original order ID and line IDs, reasons, quantities, method and refund estimate. |

All view-only actions use transient UI state. The template's initial `set` establishes the baseline for `/go`; successful user mutations use `set_current` via the shared manager.
