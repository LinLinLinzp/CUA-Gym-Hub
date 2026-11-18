# Chewy account workflow research

The account centers on recurring deliveries, order history, pets, and returns. The signed-in synthetic account represents a household that buys repeat supplies and maintains profiles for its own and foster pets. Typical tasks include moving a delivery away from a trip, finding a shipment by order number, updating a foster pet’s profile, and returning one item from a multi-line purchase.

## Public product behavior

- **Autoship.** Chewy describes recurring shipments with editable dates, items, address, and payment method. Changing cadence takes effect after the next scheduled order. Skipping one shipment and canceling the plan are separate actions. [Autoship overview](https://www.chewy.com/customer-care/autoship/autoship-overview) · [Managing Autoship](https://www.chewy.com/b/autoship-save-15682?error=error_code) · [Cancel an Autoship](https://www.chewy.com/customer-care/autoship/creating-or-updating-autoship/cancel-an-autoship)
- **Orders.** Order History shows packing, shipped, and delivered states, with carrier tracking linked once available. The local account represents tracking with fixed carrier details and events. [Tracking order status](https://www.chewy.com/customer-care/shipping-and-tracking/tracking-your-order/tracking-order-status)
- **Pet profiles.** Chewy identifies name, breed, and birthday as pet profile fields and supports profiles for many species. Weight, notes, and the removal confirmation are local workflow design choices. [Chewy’s Year in Pets](https://www.chewy.com/education/dog/general/year-in-pets)
- **Returns.** Eligible delivered items can enter a return from Order History. Customers can view return details later and may choose the original payment method or account credit. Chewy describes a 365-day window and refunds of shipping fees for complete-order returns. [Making a return](https://www.chewy.com/customer-care/returns/making-a-return) · [Return policy](https://www.chewy.com/customer-care/returns/return-policy)

## Views and priorities

| Priority | View | Layout and interactions | Primary data |
| --- | --- | --- | --- |
| P0 | Account shell | Text brand and signed-in name in the header, left navigation on desktop, compact navigation on mobile, neutral loading and recovery views | `account` |
| P0 | Overview | Featured upcoming delivery above compact recent order rows and a small pet gallery | `autoships`, `orders`, `pets` |
| P1 | Autoship | Search and status filter above plan cards. Plan detail shows schedule, destination, items, and schedule and item editing controls | `autoships`, `autoshipEvents`, `products`, `orders` |
| P1 | Order History | Search, status filter, and sort above status-led rows. Detail shows fulfillment, line items, totals, actions, and linked returns | `orders`, `orderEvents`, `returns` |
| P1 | Pet Profiles | Species filter and name search above a portrait gallery. Detail supports edit and confirmed removal | `pets`, `petEvents` |
| P1 | Returns | Searchable history with statuses and order links. The request page shows eligible item quantities, reasons, refund destination, and review | `orders`, `returns` |
| P2 | Delivery preferences | Saved destination and masked payment selectors inside Autoship detail | `addresses`, `paymentMethods`, `autoships`, `autoshipEvents` |

`DESIGN.md` defines the original layout and local artwork direction. `data_model.md` specifies the planned records and deterministic seed. The dev handoff is `../TODO.md`.

Authentication, external messaging, and live payment or carrier connections are outside the account exercise. The seeded session provides enough data to use each workflow offline through the Harbor state API.
