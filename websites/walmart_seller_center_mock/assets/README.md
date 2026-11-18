# Walmart Seller Center — workflow research

Walmart Marketplace sellers use Seller Center to maintain their listings and fulfill customer orders. This workspace focuses on three roles at the synthetic seller Harbor & Pine Supply. A catalog specialist adds products and adjusts price and stock. A fulfillment associate works the unshipped orders queue, acknowledges orders and posts shipment or cancellation details. A returns specialist checks received quantities and records refunds.

## Public workflow references

- **Catalog.** Walmart's public guidance documents adding a single item, finding a listing by product identifiers, editing its base price, adjusting available inventory at a fulfillment center and retiring listings. The local product form retains the identifiers and offer fields needed to practice this flow. Saving a draft, publishing and retiring take effect on confirmation. [Single-item setup](https://marketplacelearn.walmart.com/ca/guides/Spec%205.0/Add%20Items/Item-spec-5.0-add-a-single-item-full-setup) · [Individual pricing](https://marketplacelearn.walmart.com/guides/Catalog%20management/Price%20management/Update-price-individually-in-Seller-Center?locale=en-US) · [Seller-fulfilled inventory](https://marketplacelearn.walmart.com/guides/Catalog%20management/Seller-fulfilled%20inventory%20management/update-seller-fulfilled-inventory-individually-in-seller-center?locale=en-US) · [Catalog management and retirement](https://marketplacelearn.walmart.com/ca/guides/Getting%20started/Account%20settings/the-catalog-page-in-seller-center)
- **Orders.** Walmart groups orders by fulfillment status and lets sellers acknowledge selected new orders. The shipping workflow records carrier tracking, and cancellation requires a reason. The local workflow applies shipment and cancellation to an order's open lines together. [Acknowledge orders](https://marketplacelearn.walmart.com/guides/Order%2520management/Order%2520status/Acknowledge-orders-in-Seller-Center) · [Tracking requirements](https://marketplacelearn.walmart.com/guides/Policies%20%26%20standards/Shipping%20%26%20fulfillment/Valid-tracking-number-policy) · [Cancel an order](https://marketplacelearn.walmart.com/guides/Order%2520management/Order%2520status/Cancel-an-order-in-Seller-Center)
- **Returns.** Public Walmart guidance connects the return to a purchase order and describes delivery and refund as separate lifecycle milestones. Seller Center's standard refund workflow uses received returns and shows why they were initiated and how refunds were issued. A local Mark received action represents warehouse intake, and the refund confirmation captures the selected quantities and amounts. [Issue a standard refund](https://marketplacelearn.walmart.com/guides/Order%20management/Returns%20%26%20refunds/Issue-a-standard-refund-in-Seller-Center) · [Return lifecycle fields](https://developer.walmart.com/global-marketplace/docs/return-notifications)

## Feature inventory and view layout

| Priority | View or capability | Contents |
|---|---|---|
| P0 | Shared shell and Overview | Horizontal account header and text navigation, seller identity, action cards and linked order and return queues |
| P0 | State, navigation and seed | Harbor state load and save, SID isolation, reloadable detail URLs, offline assets and injected data handling |
| P1 | Catalog list and detail | Search, filters, sort, pagination, thumbnail rows, item content, offer, inventory and chronological activity |
| P1 | Item setup and maintenance | Sectioned form, draft and publishing actions, content edits, price and stock dialogs, retire and republish confirmation |
| P1 | Orders list and detail | Status views, search, dates, multi-select, line quantities, order totals and fulfillment activity |
| P1 | Order fulfillment | Single and bulk acknowledgment, shipment details, cancellation reason and confirmations |
| P1 | Returns list and detail | Status views, reason filter, linked order, receipt state, prior refunds and eligible line quantities |
| P1 | Receipt and refund | Warehouse receipt, quantity-based refund review, amount totals and confirmation |
| P2 | CSV export | Download the current filtered Catalog or Orders list locally |

## Data and assets

The seller account, catalog items, orders, returns and associated activity records are synthetic. Purchase order IDs join returns to orders, and linked line IDs and SKUs retain historical context after catalog edits. Refunds are separate transactions, including for partial quantities. See the [state model](data_model.md).

Follow the [design system](../DESIGN.md) for the original account layout. The implementation can create a local shipping illustration and simple category thumbnails from original artwork or CSS. Consult public guides for documented behavior and terms. Keep runtime interactions within the seeded account and local state API. Authentication, feed uploads, carrier APIs, WFS warehouse management and payment processing are outside this phase.
