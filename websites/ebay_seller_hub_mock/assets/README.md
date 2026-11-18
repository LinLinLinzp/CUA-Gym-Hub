# Seller Hub workflow research

The workspace supports a small online seller who manages inventory and promotions, and a fulfillment operator who handles shipment and returns. Juniper Relay is the synthetic seller account. The default screen is Overview with operational counts and direct links into each queue. The four workflow destinations are peers in a persistent navigation rail. This is the local product model for each view.

| Priority | View | Layout and daily tasks |
| --- | --- | --- |
| P0 | Shell and Overview | Plain text brand, account name, persistent workflow navigation, welcome panel, and useful queue counts. |
| P1 | Listings | Status filters above the inventory table, common create and revise editor, confirmation for ending listings, and an action to relist. |
| P1 | Orders | Fulfillment queues with searchable order references, buyer and line summaries, and detail actions for shipment, tracking, and cancellation. |
| P1 | Returns | Operational queue with reason and requested amount, detail view with related order and return lines, and state-specific actions for approval, receipt, and refunds. |
| P1 | Promotions | Searchable schedule with offer types and statuses, and a guided editor for rules, eligible listings, and dates. |
| P2 | Navigation shortcuts and activity | Filtered queue entry points, recent seller activity, and links between related records. |

## Public references

- eBay documents the overview, paid-order fulfillment, and creation and revision of inventory. Active, draft, and ended inventory each have a clear operational purpose, and ending a fixed-price listing works on individual items and batches. [Seller Hub overview](https://www.ebay.com/sellercenter/selling/how-to-sell/seller-hub), [revise a listing](https://www.ebay.com/help/listings/revising-listing/revise-listing?id=4356), [end a listing](https://www.ebay.com/help/selling/managing-active-listings/ending-listing-early?id=4146)
- Tracking requires a number and carrier and advances the fulfillment state. A seller can also confirm shipment directly. Cancellation requires a reason and refunds paid orders. [Order tracking](https://www.ebay.com/help/selling/managing-orders/resolving-issues-with-buyers?id=4088), [cancellation](https://www.ebay.com/help/selling/posting-items/canceling-order?id=4136)
- Return decisions include acceptance, sending a full refund, and making one partial refund offer. The local workflow records an offer as pending and uses a seller action to mark physical receipt. [Handle a return](https://www.ebay.com/help/selling/managing-returns-refunds/handling-return-requests/handling-return-requests?id=4115)
- Sale events, order discounts, and coupons use distinct eligibility and offer rules. The local promotion editor uses inventory selection and saved dates. [Seller Hub Discounts](https://www.ebay.com/sellercenter/growth/seller-hub-discounts), [sale events](https://www.ebay.com/sellercenter/growth/seller-hub-discounts/sale-events), [order discounts](https://www.ebay.com/sellercenter/growth/seller-hub-discounts/order-size-discounts)

## Data and boundaries

Listings are inventory records. Orders store purchased item snapshots and link back to listings. Returns point to the order and affected order lines. Refunds capture money and quantities. Promotions point to eligible listing IDs. Activity records identify the actor, action, entity, and time. See [data_model.md](data_model.md) for fields, example values, and fixture counts.

Account authentication, external fulfillment, payment transactions, buyer notifications, and checkout are outside this sandbox. Public help text informed the workflows. The visual design and assets are original and local, with implementation guidance in [DESIGN.md](../DESIGN.md).
