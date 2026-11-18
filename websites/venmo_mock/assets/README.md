# Venmo workflow research

The account workspace covers everyday person-to-person payments, reimbursements, shared expenses and monthly records. A household member may pay their roommate for utilities. A dinner organizer may request each friend's share. An account holder may review and export a month's activity.

## Product behavior and app decisions

| Feature | Priority | Product behavior and workspace entry |
| --- | --- | --- |
| Account overview | P0 | The workspace opens to an account with recent activity, available balance and pending requests. Actions launch the composer or split sheet. This layout is an original design choice. |
| Payment | P1 | Venmo's web flow asks for a recipient, amount and note. Funding appears before confirmation. In this workspace, start on Overview or Activity and follow the completed payment into Activity detail. |
| Requests | P1 | A request asks a counterparty to pay. The workspace organizes incoming and outgoing requests on one page, with pay or decline for incoming and remind or cancel for outgoing. A pending request adds no posted transaction. |
| Expense splits | P1 | Venmo supports equal and custom shares, and each other participant receives an individual charge request. The workspace presents both standalone splits and splits of a posted outgoing payment. Detail rows follow each linked request. |
| Monthly statements | P1 | Venmo provides month and year selection and CSV downloads on the web. The workspace previews the same posted payments that go into the downloaded file and records export metadata for verification. |
| Multi-recipient pay or request | P2 | Venmo documents a multi-person composer in its app. Support this after the required single-recipient and split flows are verified. |

## Public sources

- Recipient search, notes and composer actions. [Sending & Requesting Money](https://help.venmo.com/cs/articles/sending-requesting-money-vhel171)
- Confirmation and funding behavior. [Changing Your Payment Method](https://help.venmo.com/cs/articles/changing-your-payment-method-vhel209)
- Completed payments and payment details. [Payments & Requests FAQ](https://help.venmo.com/cs/articles/payments-requests-faq-vhel149)
- Individual split requests, equal and custom shares, reminders and cancellation. [Splitting & Sharing Purchases](https://help.venmo.com/cs/articles/splitting-sharing-purchases-vhel189)
- Declining incoming requests. [Payment from a Stranger](https://help.venmo.com/cs/articles/payment-from-a-stranger-vhel162)
- Monthly web statements and CSV downloads. [Transaction History](https://help.venmo.com/cs/articles/transaction-history-vhel281)

## Interface and state

The activity ledger opens payment detail, including the entry point for splitting a previous payment. Requests detail holds the actions permitted by direction and status. Split detail lists the participants and their linked requests. Statements has a period header, totals and a transaction table. See [DESIGN.md](../DESIGN.md) for the layout and local visual treatment.

The account references synthetic contacts and funding sources. Payments capture posted movement. Requests capture obligations, and splits connect related requests to one expense. Exports record a snapshot of the selected statement. See [data_model.md](data_model.md) for exact shapes.

The workspace starts with a populated personal account. All counterparties and payment instruments are synthetic. Authentication, external account actions and delivery integrations are outside the seed workflows.
