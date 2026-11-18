# DoorDash account workflow research

The sandbox is a signed-in consumer account for Maya Chen. It supports a repeat diner retrieving receipts or reordering, a host collecting lunch orders, a guest contributing to a shared cart, a customer resolving a missing item, and a subscriber managing DashPass.

| Priority | View | Account behavior and layout |
| --- | --- | --- |
| P0 | Account shell | Horizontal navigation across the four destinations. Open Orders by default and support direct links to specific records and the guest cart. |
| P1 | Orders | Search and filter a chronological history. Open a detail page for receipt, delivery summary, and actions. Review a reorder or confirm cancellation for an eligible order. |
| P1 | Group orders | Search the group list and start a new group. Use the detail page to share a same-session link, see participant carts, close the group, and place the order. The guest link opens a focused view for one participant. |
| P1 | Refunds | Start from the linked order help flow. Choose the problem, quantities and preferred resolution. Track requests in a separate account list with receipt links and status. |
| P1 | DashPass | View membership and payment history. Choose a plan or confirm pause, resume, cancellation, or enrollment in a focused dialog. |

## Public product research

- DoorDash documents retrieving a receipt from a specific order and canceling from the details or Help of a live order. The account uses those entry points with its own receipt layout and a separate reorder review. [Receipts](https://help.doordash.com/en-us/consumers/article/how-do-i-receive-a-receipt-for-my-order) · [Order cancellation](https://help.doordash.com/consumers/s/article/How-do-I-cancel-my-order)
- The consumer workflow starts with a restaurant and a share link. Members contribute items to a collective cart before the organizer closes it and checks out. The local guest route models this within one Harbor session. [Consumer group orders](https://help.doordash.com/en-us/consumers/article/what-is-a-group-order-and-how-can-i-create-one)
- Item issues start at order help. DoorDash describes multiple possible resolutions and associates issued amounts and dates with the order receipt. The sandbox offers a request for credit or original payment with synthetic historical decisions. [Missing or incorrect items](https://help.doordash.com/consumers/s/article/My-order-was-missing-an-item-incorrect-order) · [Credit or refund status](https://help.doordash.com/en-us/consumers/article/how-can-i-check-the-status-of-my-credit-or-refund?ctry=US&divcode=VA)
- DashPass offers monthly and annual plans and shows billing history. Its management flow documents pause and cancellation with a reason, with eligible paid access continuing through the billing period. The fixture uses local billing records and explicit confirmations. [DashPass overview](https://help.doordash.com/en-us/consumers/article/what-is-dashpass) · [Manage and cancel DashPass](https://help.doordash.com/en-us/consumers/article/how-do-i-cancel-my-dashpass-subscription)

## Data and scope

Orders store receipt snapshots. Group orders store participant carts and link to the resulting order. Refund records attach to exact receipt line IDs. DashPass stores current membership with separate change and billing histories. See [data model](data_model.md).

Use the original [design system](../DESIGN.md) and locally authored artwork. Account identity, merchants, menus, people, and payment references are synthetic fixtures. Authentication and external communications are outside the exercise.

