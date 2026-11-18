# Account workflow research

The account workspace serves a DIY shopper with past purchases, materials to organize, equipment to reserve and items to return. Casey Morgan is a synthetic signed-in user. A homeowner can reopen an order for pickup or tracking, a weekend renovator can assemble a deck materials list and reserve equipment, and a shopper can request a partial return.

## Feature inventory

| Priority | View | User-facing behavior |
| --- | --- | --- |
| P0 | Account Overview | Persistent account destinations, recent purchases and shortcuts to open workflow views. The public account dashboard groups recent orders and product lists under the account. [Account dashboard](https://www.homedepot.com/myaccount/dashboard) |
| P1 | Orders | Search and filter purchases, open a receipt and view local shipment or pickup status. Eligible purchases can be cancelled before shipment or pickup. Keep the confirmation in the account and retain receipt details. [Customer support answers](https://www.homedepot.com/c/Customer_Support_Answers) |
| P1 | Tool Rental | Search equipment and check store availability. Select a pickup slot and duration, review a separate deposit, and manage reservations in the account. The public rental FAQ informs pickup, deposits and reservation management. [Tool Rental FAQ](https://www.homedepot.com/c/Tool_Rental_FAQ) |
| P1 | Project Lists | Create or rename a saved list, search for materials, edit quantities and notes, and remove lines or lists. Public list guidance describes creating lists, adding materials and recording notes. [How to Create a List](https://www.homedepot.com/c/create-a-list) |
| P1 | Returns | Begin with an eligible order, select specific quantities, and choose store drop-off or mail where supported. Review a refund estimate and track the saved request. Public return guidance connects order details to these return methods. [Return Policy](https://www.homedepot.com/c/Return_Policy?emt=ppsms_sdp_2506) |

P2 is unscheduled. The account slice uses simplified fixtures and rules for the workflows above. Authentication, payment processing, identity verification, tool delivery, carrier links, real return labels and notifications are outside the local account experience.

## View layouts

- **Overview.** Horizontal navigation over a workbench illustration and account heading, with recent transactions and direct links to the four account areas.
- **Orders.** Search/filter bar over rows showing order reference, date, status, fulfillment and total. Details place line items beside the order summary and applicable actions.
- **Tool Rental.** Equipment cards show price, category and store availability. The reservation form groups schedule and estimate. My Reservations provides date, status, location and a link to manage each booking.
- **Project Lists.** Searchable cards show title, item count and update date. The detail view puts materials and estimated cost beneath the title and **Add materials** action.
- **Returns.** History shows return reference, source order, status and estimated amount. The creation view guides the user through line quantities, reasons, method and review. Detail shows instructions for the chosen method.

See [DESIGN.md](../DESIGN.md) for the original visual system. The visual assets are to be authored locally for this account workspace. Public documentation supplies the workflow references.

## Data overview

Orders retain historical product snapshots. Returns reference specific order lines. Reservations link a tool to a store and pickup time. Project lists hold editable product snapshots with quantities and notes. A synthetic account identifies the actor on user changes. See [data_model.md](data_model.md) for schema and representative fixtures, and [TODO.md](../TODO.md) for acceptance criteria.
