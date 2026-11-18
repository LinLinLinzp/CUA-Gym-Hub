# Seller Hub planned state model

Implement these JSON shapes in `src/data/seed.js` and document the final model in `SCHEMA.md`. Keys described as optional may be absent in injected data. The seed has fixed IDs and ISO dates. User-created records use unique ID values and ISO timestamps from the current runtime clock. USD values below are numbers rounded to cents. Display formatted values at the UI layer.

## Top-level shape

| Key | Type | Example or purpose |
| --- | --- | --- |
| seller | object | `{ id: "seller-001", name: "Juniper Relay", username: "juniper_relay", currency: "USD" }`. All fields are strings. |
| listings | array | The inventory being managed. |
| orders | array | Purchased line snapshots and fulfillment state. |
| returns | array | Buyer requests and seller resolution state. |
| refunds | array | Issued refunds and open offers, with amounts per affected line. |
| promotions | array | Discount terms, eligible inventory, and publish dates. |
| activity | array | Structured seller events associated with an entity ID. |

Each inventory, order, return, promotion, and refund record has string `id`, `createdAt` (e.g. `2026-11-11T14:00:00.000Z`), and `actorId` (e.g. `seller-001` for seller creation or `buyer-009` for a seeded buyer-created order or return). Mutable entities carry `updatedAt` on changes. Each seller event carries the seller's actor ID even when the original record has a different creator. Lifecycle timestamps and related fields are absent until applicable.

### Listing

- `id` string `lst-001`, `sku` string `HM-104`, `title` string `Ceramic Desk Lamp, Sage`, `category` string `Home & Living`, `condition` string `Very good`, `description` string `Matte ceramic base with linen shade.`, `thumbnail` optional string `/products/desk-lamp.svg`.
- `price` number `64.50`, `quantity` integer `7`, `status` enum `active | draft | ended`. Permissive draft validation supports missing publish fields.
- Lifecycle fields `publishedAt`, `endedAt`, `relistedAt` are optional ISO strings. Relisting keeps the ID and refreshes publish and relist timestamps. An earlier stop remains visible in activity.

### Order

- `id` string `ord-014`, `orderNumber` string `18-20461-10014`, `status` enum `awaiting_shipment | shipped | canceled`, `paymentStatus` enum `paid | refunded`, `paidAt` ISO string.
- `buyer` object with string `id`, `name`, `username` (e.g. `buyer-009`, `Avery Finch`, `averyf09`). `shipTo` optional object with string `name`, `line1`, `city`, `region`, `postalCode`, `country` (e.g. Avery Finch, 18 Sample Lane, Portland, OR, 97201, US).
- `lines` array with string `id`, `listingId`, `title`, `sku`, integer `quantity`, and numbers `unitPrice`, `lineTotal`. Example `{ id: "ol-014-1", listingId: "lst-001", title: "Ceramic Desk Lamp, Sage", sku: "HM-104", quantity: 1, unitPrice: 64.50, lineTotal: 64.50 }`. Keep purchased titles and prices stable across listing changes.
- `subtotal`, `shipping`, `tax`, `total` numbers, e.g. `64.50`, `5.50`, `0`, `70.00`. Preserve original amounts when marking a refund.
- `shippedAt` optional ISO string. `tracking` optional object with string `carrier`, `number`, `updatedAt`, e.g. `USPS`, `9400111200990000000001`, and the tracking save time. `canceledAt` optional ISO string and `cancellationReason` optional string such as `Buyer requested cancellation`.

### Return

- `id` string `ret-008`, `orderId` string `ord-014`, `reason` string `Arrived damaged`, `buyerNote` optional string `The shade was bent in the box.`, `status` enum `requested | accepted | received | offer_sent | refunded`. The Closed queue includes refunded cases.
- `lines` array with string `orderLineId` and `listingId`, integer `quantity`, number `amount` (e.g. `ol-014-1`, `lst-001`, `1`, `64.50`). `requestedAmount` numeric maximum, equal to the sum of return lines and any separately identified shipping and tax components. For seed cases, use line amounts only.
- Optional `acceptedAt`, `receivedAt`, `resolvedAt`, and `offeredAt` ISO strings. Optional `returnShippingPayer` enum `buyer | seller`, `authorizationNumber` string `RMA-308`, and string `refundId` or `partialOfferId` pointing at the corresponding record.

### Refund or refund offer

- `id` string `ref-008`, `orderId` string `ord-014`, optional `returnId` string `ret-008`, `kind` enum `return_full | return_partial | cancellation`, `status` enum `issued | offered`, and optional `note` string `Partial refund for cosmetic damage.`.
- `lines` array with string `orderLineId`, string `listingId`, integer `quantity`, and numeric `amount` allocated to that line. `shippingAmount`, `taxAmount`, and `totalAmount` are numeric. Total is line allocations plus shipping and tax. For a partial offer, allocate cents across eligible lines in stable order and cap each allocation by its line maximum. Avoid double refunding issued amounts across returns on the same order. An offer leaves payment status intact. A full return may set the order's `paymentStatus` to `refunded` and update `updatedAt` only if issued refunds reach the entire paid amount.

### Promotion

- `id` string `promo-006`, `name` string `Workshop Weekend`, `type` enum `sale_event | order_discount | coupon`, persisted `status` enum `draft | scheduled | active | ended`.
- `discount` object with `kind` enum `percent | fixed` and numeric `value` such as `15`. `listingIds` string array such as `["lst-001", "lst-027"]`. `code` optional string `WORKSHOP15`, `minimumOrderTotal` optional number `75`. Keep the code unique case-insensitively and normalize it to uppercase.
- `startsAt`, `endsAt`, `publishedAt`, and `endedAt` ISO strings when applicable. Drafts can omit dates. For scheduled or active records, display Scheduled before `startsAt`, Active from start to end, and Ended at or after `endsAt`. Explicitly ended records keep their status after any clock change. Drafts keep Draft regardless of dates. Ending early stores its own timestamp and preserves the configured date range.

### Activity

- `id` string `evt-018`, `type` string such as `return_accepted` (see `TODO.md`), `entityType` enum `listing | order | return | promotion`, `entityId` string `ret-008`, `actorId` string `seller-001`, `createdAt` ISO string.
- Optional `details` object with typed action fields where relevant, e.g. `{ previousStatus: "requested", status: "accepted", orderId: "ord-014" }` or `{ refundId: "ref-008", amount: 64.5 }`. The entity and refund arrays hold the authoritative commercial fields.

## Seed coverage

| Record | Count | Distribution |
| --- | --- | --- |
| Listings | 48 | 33 active, 8 drafts, 7 ended. Use 5 or more categories with deliberate SKU families and varied price, stock, and condition. Include low stock, one zero-stock draft, and ended items eligible for relisting. |
| Orders | 42 | 14 awaiting shipment, 24 shipped, 4 canceled. Vary carrier, synthetic buyer, dates, and line counts. Include untracked shipped orders and at least two paid awaiting-shipment fixtures for independent shipment and cancellation tests. |
| Returns | 26 | 9 requested, 6 accepted, 5 received, 2 offer sent, 4 refunded. Relate to shipped orders and vary reasons and quantities. Use distinct order lines when placing multiple returns on the same order. |
| Promotions | 24 | 8 drafts, 5 scheduled, 6 active, 5 ended at the reference fixture date, mixed across all three offer types. Include well-separated dates, distinct codes, and representative inventory sets. Cover start/end boundaries with explicitly injected dates and a controlled test clock. |
| Refunds | 10 | 4 paid cancellations, 4 issued return refunds, 2 outstanding partial offers. Match totals and statuses to their source records. |
| Activity | 12 | Coherent fixed events across all four workflow types, linked to existing records and sorted by event timestamp in the UI. |

On read, use empty arrays for unavailable lists and placeholders for missing display fields. Respect arrays injected by Harbor. Resolve references via ID when possible and use stored display snapshots or a readable fallback ID if the referenced record is absent. Present an inline reason when missing data prevents a valid monetary mutation. Filter and sort without mutating source arrays.
