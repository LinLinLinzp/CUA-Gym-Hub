# IKEA account research

This account experience gives a signed-in customer one place to manage a cart, arrange home services and return a purchase. The product research uses public IKEA US guidance. The design uses an original account layout, synthetic records and original local artwork specified in [DESIGN.md](../DESIGN.md).

## Users and entry points

- **Furniture shopper.** Searches by product name or article number, adds items, adjusts quantities, reviews delivery and optionally books assembly while checking out. IKEA describes this sequence as adding items, choosing fulfillment and reviewing the order. [Placing an order in the IKEA app](https://www.ikea.com/us/en/customer-service/knowledge/articles/8bb415f5-2e78-4c5d-g2e8-fd510g01ggc1.html)
- **Customer coordinating a move or installation.** Needs the scheduled delivery window, the assembly time and the products covered by each. IKEA's checkout guidance checks service by postal code and asks customers to choose separate delivery and assembly dates. The order help page also describes tracking and delivery rescheduling. [Assembly service](https://www.ikea.com/us/en/customer-service/knowledge/articles/ff2a1f30-b293-43b5-b802-4e061ea0d904.html), [Order management](https://www.ikea.com/us/en/customer-service/track-manage-order/)
- **Customer returning part of a purchase.** Looks up an order, selects the affected items and provides a reason. IKEA describes eligible parcel requests from Purchase History or Purchase Details and an in-store express return started from a receipt or order number. [Self-service parcel returns](https://www.ikea.com/us/en/customer-service/knowledge/articles/1692b58e-80ff-419f-a713-cb9c7c986037.html), [In-store returns](https://www.ikea.com/us/en/customer-service/knowledge/articles/f41bb8c6-dab2-44c9-b6a7-a9f84be811b6.html)

## Feature inventory

| Priority | View | Contents and interaction |
| --- | --- | --- |
| P0 | Account overview | Header with cart quantity and profile. Account navigation, custom living-room hero, workflow entry cards and recent purchases based on actual records. |
| P0 | Runtime and routing | Neutral boot screen, session-aware routes and fallback states for missing data or IDs. |
| P1 | Product catalog and cart | Search and category filter over product tiles. Cart rows with quantity control and removal. Summary with total and checkout action. |
| P1 | Delivery checkout | Labeled address fields, service windows, and price and order review. On confirmation, show a reference and links to the order and service. |
| P1 | Assembly booking | Choose eligible items and quantities, accept service terms and select a time after delivery. Entry points are checkout and eligible order details. |
| P1 | Delivery and assembly management | Upcoming and past appointment rows, plus detail with item references, address, time, rescheduling and cancellation. |
| P1 | Purchase and return history | Filterable purchase list, order details with service and return actions, and a linked list of return requests. |
| P1 | Start a return | Order selection, line quantities, condition, reason, method, refund estimate and confirmation reference. |
| P2 | Status timeline | Show dated milestones taken from recorded status history. |

## Data and scope

Products drive cart lines. Checkout captures product and address snapshots, then links the order to separate delivery and assembly records. Returns reference original order lines and leave the order unchanged. Account widgets derive counts and summaries from the same records used by the detail screens. [Data model](data_model.md)

Prices, scheduling windows, addresses, return fees and availability rules are synthetic application fixtures. Authentication, real payments, external booking providers, carrier labels and customer communications are outside the seed workflows.
