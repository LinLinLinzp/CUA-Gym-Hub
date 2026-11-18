# Best Buy account research

This is a pre-signed-in account surface for a fictional My Best Buy member. It supports shoppers who need to locate and manage a purchase, request a price adjustment, maintain product protection, or track a return. The public references below establish terminology and workflow entry points. The account layout and illustration direction are specified in [DESIGN.md](../DESIGN.md).

## Shoppers and tasks

| Shopper | Primary task |
| --- | --- |
| Customer awaiting a purchase | Find the correct order among prior purchases, view shipping progress, change the pickup person, or cancel eligible items. |
| Customer who found a lower Best Buy price | Identify a specific purchase line, enter the lower offer, and check the submitted request later. |
| Device owner | Find plan coverage, add coverage for an eligible purchase, file a service request, or cancel a plan. |
| Customer returning part of an order | Select eligible items and quantities, choose store or mail, and review the estimated refund. |

## Workflow findings

- **Orders.** Best Buy's public help describes date filtering in order history, tracking from order details, and receipt access from the purchase record. Pickup contacts are editable for qualifying orders. Cancellation becomes unavailable after shipping begins, while pickup has its own cancellation window. [Order history](https://www.bestbuy.com/site/help-topics/view-order-history/pcmcat204400050029.c?id=pcmcat204400050029%2F1000), [tracking](https://www.bestbuy.com/site/help-topics/how-to-track-your-order/pcmcat316000050014.c?id=pcmcat316000050014), [receipts](https://www.bestbuy.com/site/help-topics/getting-receipt-copies/pcmcat204400050026.c?id=pcmcat204400050026), [pickup changes](https://www.bestbuy.com/site/help-topics/how-to-change-shipping/pcmcat316000050009.c?id=pcmcat316000050009%2F), [cancellations](https://www.bestbuy.com/site/help-topics/cancel-your-order/pcmcat203900050004.c?id=pcmcat203900050004).
- **Price match.** Best Buy distinguishes at-purchase competitor matching from post-purchase matching of a lowered Best Buy price. Its help page points shoppers to order details for availability and to chat or phone for review. The account exercise represents post-purchase review as a local request with a pre-tax amount and history. [Price Match Guarantee FAQ](https://www.bestbuy.com/site/price-match-guarantee/best-buy-price-match-guarantee/pcmcat297300050000.c?id=pcmcat297300050000).
- **Protection plans.** Best Buy describes purchase history as an entry point for applicable plan additions. Coverage begins at the later of purchase and receipt. Its support material describes finding plan details, service and repair history, and cancellation. The account exercise locally records a quote confirmation, a service request, and a cancellation. [Geek Squad Protection FAQ](https://www.bestbuy.com/site/geek-squad-protection/geek-squad-protection-faqs/pcmcat748302045943.c?id=pcmcat748302045943).
- **Returns.** Best Buy describes returning eligible products at a store or using a prepaid label, with exclusions for some mail returns. The refund generally goes back to the original payment method. The exercise models eligibility and quantity reservation, a pre-tax estimate, and a local return reference. [Return and exchange policy](https://www.bestbuy.com/site/help-topics/return-exchange-policy/pcmcat260800050014.c?id=pcmcat260800000050000).

## Planned feature inventory and views

| Priority | View or feature | Layout and interaction |
| --- | --- | --- |
| P0 | Account shell and overview | Text masthead, account rail, dark greeting panel, recent orders, and direct service links. Use a shared loading and feedback state. |
| P0 | Harbor integration | Router with session-aware deep links, a shared data store, independently injectable fixtures, and a persistence contract for verifiers. |
| P1 | Orders and order detail | Search and filters over purchase rows, followed by fulfillment and receipt information. Show contextual pickup, cancellation, protection, price match, and return actions. |
| P1 | Price match requests | Searchable history, status, and a line-specific form with price evidence, estimate, and confirmation. |
| P1 | Protection plans and service | Filterable coverage portfolio, detail grouped by coverage and claim history, and add, service, and cancel flows with confirmation. |
| P1 | Returns | Requests with method, status, and estimated refund. Item selection, quantity and reason entry, method selection, review, detail and cancellation. |
| P2 | Local print actions | Print the receipt or a return packing slip using details already available in the account. |

The model centers on `orders[].items[]`. Price match requests, protection plans, and return lines reference purchase line ids. Orders, plans, claims, returns, and event histories carry their own fixed seed identifiers and state schemas. The [data model](data_model.md) defines fields, example values, relationships, and fixture volumes.

The exercise assumes an existing member and historical purchases. Its scope is account support and local recordkeeping. Live commerce, authentication, third-party support and shipment systems, and real payments are outside its scope.
