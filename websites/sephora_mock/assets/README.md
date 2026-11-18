# Sephora account research and implementation notes

The workspace represents a signed-in U.S. Beauty Insider member. It supports three recurring tasks: checking an order and its shipment, understanding or spending points, and sending back part of an order. The product behavior comes from public Sephora help and loyalty documentation. `../DESIGN.md` defines the original visual composition and local art direction.

## Product behavior

| Member intent | Public product behavior | Account implementation |
| --- | --- | --- |
| Review a recent purchase or locate a package | Order history links to details and discrete shipment tracking. Recent unshipped orders can have a short cancellation window. | Searchable local history, order and shipment details, and confirmed cancellation of eligible unfulfilled orders. |
| Understand or use points | Beauty Bank includes points earned on fulfilled merchandise. Rewards spend points and completed returns remove associated earned points. Premium rewards can support points-only redemption. | A signed ledger, points balance, and local premium reward confirmation. Merchandise-linked rewards are visible with their requirement. |
| Send back selected products | Eligible mail returns use proof of purchase, selected items, reasons, and mail-back instructions. Completion and refund follow processing. | A delivered order provides proof of purchase. Select lines and quantities, review estimates, submit a case, then inspect persisted status. Completed fixtures show refunds and points reversals. |

Order tracking and cancellation reference. [Sephora Order Status & History](https://www.sephora.com/beauty/order-status)

Earning and redemption reference. [Sephora Beauty Insider Terms & Conditions](https://www.sephora.com/beauty/beautyinsider-terms-conditions) and [Beauty Insider overview](https://www.sephora.com/beauty/loyalty-program)

Return window, item reasons, mailing, and refund processing reference. [Sephora Returns & Exchanges](https://www.sephora.com/beauty/returns-exchanges)

## Priority and views

| Priority | View | Main content |
| --- | --- | --- |
| P0 | Account shell | Text wordmark, responsive navigation, session bootstrap, and route/error handling |
| P0 | Overview | Member greeting, recent orders, points snapshot, active return summary, and links to each full view |
| P1 | Orders | Search, filters, and order rows with date, status, item summary, and total |
| P1 | Order details | Item list, payment summary, shipment timeline, eligible cancellation, and Start a return |
| P1 | Beauty Insider | Membership and balance, dated activity and filters, reward catalog, confirmation, and redemption result |
| P1 | Returns | Search and status filters, return rows, and picker for eligible orders |
| P1 | New return and return details | Item and quantity selection, reasons, refund estimate, confirmation, then return timeline and mail-back or completed refund details |

The synthetic fixture links an account to orders, shipments, rewards, point transactions, and returns. Each order line has its own ID so partial returns and repeated orders for the same product remain distinguishable. The important state changes are cancellation, reward redemption, and mail return submission. See [data model](data_model.md) and [acceptance checklist](../TODO.md).

Start with the member signed in. Keep fulfillment, payment, and mail tracking within the local fixture. Full checkout, external labels, authentication, and store or gift returns are outside the account workflows.
