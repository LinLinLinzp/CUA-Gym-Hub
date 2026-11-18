# Square Dashboard workflow research

The workspace serves an English-speaking U.S. store operator who maintains a catalog, fulfills orders, resolves customer refunds, and reconciles incoming transfers. Alder & Finch Home, the team, customers and financial details are synthetic. The research is based on Square’s public documentation. `DESIGN.md` specifies the original visual system and `TODO.md` defines the implementation scope.

## Operators and their work

| Operator | Typical work |
| --- | --- |
| Catalog manager | Look up items by name or SKU, add a new product and maintain variant pricing and stock. |
| Fulfillment lead | Find active orders by location and channel, read purchased quantities, and advance each order to ready or completed. |
| Customer support lead | Find the original payment, calculate the remaining refundable amount, issue a refund, and review the reason and items. |
| Owner or bookkeeper | Review available funds, check transfer status and destination, and reconcile payout entries or initiate an instant transfer. |

## Feature inventory

| Priority | Feature | Planned view |
| --- | --- | --- |
| P0 | Account shell and deep links | Plum global bar with the Square text brand, direct links to each workspace, and signed-in account context. |
| P0 | Harbor state lifecycle | Neutral boot screen, injected-state compatibility, scoped sessions, and one centralized write per committed user action. |
| P1 | Overview | Sales chart and recent orders in the main column, location balance and transfer shortcut in the secondary column. |
| P1 | Item library | Search and filter above the catalog table. Dedicated item editor with inline variant rows and archive/restore confirmation. |
| P1 | Order fulfillment | Order list with status and location filters. Detail with line items, payment context, activity and the next valid action. |
| P1 | Refund issuance and history | Transaction discovery and refund history share a workspace. Refund review presents eligible lines or an entered amount, reason, total and destination. |
| P1 | Payout history and instant transfer | Location balance above transfer history. Detail shows fee, net and settlement activity. The transfer form provides an amount and destination review before confirmation. |
| P2 | Payout CSV | Local export of filtered transfer rows for reconciliation. |

## Behavioral references

- Item variations represent purchasable forms of the same product and can have separate prices and SKUs. The local catalog uses a compact variant editor and keeps historical order pricing in the order records. [Square item variations guide](https://squareup.com/help/us/en/article/6689-item-options) · [Square order line items](https://developer.squareup.com/docs/orders-api/how-it-works)
- Square documents fulfillment progression and an order activity history. The local order view uses a single next action and writes a structured event when fulfillment moves. [Square fulfillment guide](https://squareup.com/help/us/en/article/6923-pickup-orders-on-square-point-of-sale)
- Square documents full, itemized and amount-based refunds attached to a payment. The local form supports those paths and enforces the remaining payment cap. [Square refund guide](https://squareup.com/help/us/en/article/6116-process-refunds) · [Square refund payment reference](https://developer.squareup.com/reference/square/refunds/refund-payment)
- Square describes transfers as payouts, with entries for payment and refund reconciliation. The local account supports history and one instant transfer path using seeded balance and masked destinations. [Square transfer options](https://squareup.com/help/us/en/article/3807-deposit-options-with-square) · [Square payout overview](https://developer.squareup.com/docs/payouts-api/overview)

## Data and scope

Items own their variants. Orders snapshot what was sold, and payments and refunds link back to those orders. Payouts link to merchant locations and masked destinations and can have settlement entries. `data_model.md` defines these relationships and the planned write fields. The account is pre-signed-in and the app ships as an offline workspace. Authentication, financial integrations, customer contact, and background settlement are outside scope.
