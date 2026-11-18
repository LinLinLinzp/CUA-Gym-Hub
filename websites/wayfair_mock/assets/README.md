# Wayfair account research and feature inventory

## Account purpose

The account gives a household one place to find past and current orders, track shipments, book large-item deliveries and manage requests after delivery. The signed-in customer is Ava Morgan. Product names, prices, addresses, order numbers and activity are synthetic.

## Public workflow references

| Workflow | What Wayfair documents | Application decision |
| --- | --- | --- |
| Orders | Customers can look up an order by number or browse their history, then see shipment and item details. Package tracking starts from My Orders. [Account information](https://www.wayfair.com/v/customer_service/account_settings) · [Shipping information](https://www.wayfair.com/customerservice/shipping_info.php) | Add product-name and SKU search, status and year filters, separate timelines for split shipments, and a cancellation flow for unshipped items. |
| Scheduled delivery | The help center lists order delivery updates and special delivery instructions. Wayfair's shareholder letter describes choosing a delivery date and time for large items. [Help and Contact](https://www.wayfair.com/help-and-contact) · [Shareholder letter](https://investor.wayfair.com/files/doc_earnings/2023/q4/generic/2023-Shareholder-Letter.pdf) | Offer synthetic freight slots, review the booking and delivery instructions, and retain appointment history after a reschedule or cancellation. |
| Damage claims | The help center directs customers to report a problem or seek a replacement and distinguishes damaged items from missing parts and other problems. [Help and Contact](https://www.wayfair.com/help-and-contact) | Give damage its own workflow so a customer can identify the affected item and quantity, describe the issue and request a resolution. |
| Returns | The help center describes returns for most items within 30 days of delivery, starting or modifying a return, and refund guidance. [Help and Contact](https://www.wayfair.com/help-and-contact) | Check individual line eligibility, collect reasons and handoff method, then show the expected refund total and request history. |

The calendar rules, eligibility flags, return fees, evidence limits and state model are design choices for this sandbox. The research used public text. [DESIGN.md](../DESIGN.md) defines an original account layout and locally produced artwork for implementation.

## Customer scenarios

- A customer furnishing several rooms searches an order number or product name, compares the status of two shipments, and cancels an unshipped item while keeping the rest of the order.
- A customer receiving a sofa looks for a Friday window, adds instructions about an entryway, and moves the delivery after a schedule change.
- A customer who received two lamps reports one damaged unit, requests a replacement, and locates the claim by its reference.
- A customer returning a rug looks up the eligible delivery, compares the expected refund with the fee, and revisits the request to check handoff instructions.

## Layout and interactions by view

| Priority | Feature | Layout and interactions |
| --- | --- | --- |
| P0 | Account frame | Plain Wayfair brand text, visible account navigation, loading and recovery states, plus responsive layout across every route. |
| P1 | Account overview | A welcome panel, the next scheduled delivery, open claims and returns, and links to recent orders. Each summary takes the customer to its full view. |
| P1 | Order history | Search and filter controls above stacked order cards with status, date, reference, item previews and total. Pagination keeps large histories navigable. |
| P1 | Order detail and cancellation | Group line items under shipping sections. Show tracking, address, a payment summary and item-level service links. The cancellation dialog presents selected units, reason and estimated credit before saving. |
| P1 | Deliveries | Appointment and shipment list with current windows and booking actions. Shipment details show the address, items, event timeline and appointment history. Date and time selection, delivery notes, review, reschedule and cancellation share one flow. |
| P1 | Damage claims | A case list with status filters, an item-first reporting dialog, and a detail view with reference, request description, photographed-file names, requested resolution and status. |
| P1 | Returns | A request list with a start action, a dialog with line selection and refund review, and detail with return reference, handoff instructions, amounts and cancellation when available. |
| P2 | Service search and sorting | Search and sort past claims and returns when reference IDs or old requests are hard to locate. |
| P2 | Copy identifiers | Copy common references from their detail views. |

## Data model

The account owns orders. Order lines reference shipments, including separate shipments for items from the same purchase. The service histories link appointments to shipments, claims to individual lines, returns to one or more lines and cancellations to the affected order and quantities. The [state model](data_model.md) defines the relationships, sample records, eligibility calculations and fields observable through `/go`.

## Scope

The account begins signed in so the scenarios start at order management. Shopping, checkout, sign-in, card management and outside customer-support systems are outside the account workflows. Evidence photos use local selection and preview during entry, with file metadata in the saved claim. The state API is the app's persistence boundary.
