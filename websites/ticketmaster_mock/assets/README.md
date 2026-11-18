# Account workflow research

This pre-signed-in ticket account supports fans retrieving an order or receipt, sharing seats with companions, managing a resale listing, and tracking a refund after an event change. The workspace uses synthetic English records and original local event art. The layout and tokens are in [DESIGN.md](../DESIGN.md).

## Feature inventory

| Priority | View | Fan task and layout | Observable collection |
| --- | --- | --- | --- |
| P0 | Account shell | Move among Orders, Transfers, My Listings and Refunds using the account nav | Harbor baseline on first load |
| P1 | Orders and order detail | Find an event or order number, inspect assigned seats and the itemized receipt, save an order for repeat access | `orderSaves` |
| P1 | Transfers | Pick seats on an order, send to a companion, cancel an outgoing invitation or accept an incoming invitation. Use a status-filterable activity list, with order links and contextual controls | `transfers`, `tickets` |
| P1 | My Listings | List seats from an order, check prices and payout destination in review, then manage active listings in a status-filterable ledger | `listings`, `tickets` |
| P1 | Refunds | Review and submit an eligible order refund. Inspect status, amount and destination in the refunds ledger | `refunds`, `orders`, `tickets` |

## Public workflow findings

- The order is the entry point for seat details and the itemized purchase receipt. Use the confirmation number as a search key. **Save order** is a sandbox account convenience that gives the Orders workflow an explicit and reversible persistence action. [Ticket purchases](https://help.ticketmaster.com/hc/en-us/articles/9787464969873-Where-can-I-view-my-ticket-purchases), [Receipt and confirmation number](https://help.ticketmaster.com/hc/en-us/articles/9757577622417-How-do-I-find-my-receipt-or-order-confirmation-number)
- Transfers can cover selected seats. A pending outgoing transfer can be canceled by the sender. A recipient can accept an incoming transfer. In the sandbox the inbound list provides the acceptance entry point. [Ticket Transfer](https://help.ticketmaster.com/hc/en-us/articles/9786975926673-How-does-Ticket-Transfer-work?language=en_US)
- Resale starts with ticket selection, price and payout details. Active listings can be edited or removed before a sale. Sold records are visible in history. [Sell tickets](https://help.ticketmaster.com/hc/en-us/articles/9672915828881-How-do-I-sell-tickets?ac_link=BLOG_mls-tickets), [Edit or remove a listing](https://help.ticketmaster.com/hc/en-us/articles/9670420738577-How-do-I-edit-or-remove-tickets-listed-for-resale)
- Refund availability depends on organizer approval and the refund window. Cancellation usually follows the automatic route. A self-service request shows the original payment method as the destination. [Refund eligibility](https://help.ticketmaster.com/hc/en-us/articles/9672063923345-How-do-I-know-if-my-order-is-eligible-for-refunds), [Request a refund](https://help.ticketmaster.com/hc/en-us/articles/9672441081105-How-do-I-request-a-refund), [Canceled events](https://help.ticketmaster.com/hc/en-us/articles/9784845658641-What-happens-if-my-event-is-canceled)

## Data and scope

Orders refer to events and own seats through their order ids. Transfers, listings and refunds reference both orders and seats. Explicit eligibility and per-seat holds determine available actions. [The data model](data_model.md) defines the records and write effects.

The account starts with a seeded identity and masked payment and payout methods. Browsing a ticket catalog, checkout, authentication, communications, barcodes valid for entry, banking and actual ticket fulfillment are outside this account scenario. Mutable activities occur through confirmed UI actions, with completed and processing history supplied by seed or injected state.
