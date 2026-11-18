# Audible Account Research

Audible is a spoken-audio service where listeners manage an audiobook Library, use membership credits to acquire titles, and save books for later. This project focuses on the account tools behind those activities. The signed-in member, titles, narrators, artwork, and account history are synthetic.

## Primary users

| User | Goal | Starting point |
| --- | --- | --- |
| Regular listener | Find an owned book and update its listening status | Library |
| Member with credits | Check available credits and redeem one for a title | Credit summary or Browse |
| Member reviewing an order | Check eligibility and return a credit purchase | Purchase history |
| Listener planning a queue | Save titles, compare them, and choose one to acquire | Browse, title detail, or Wish List |

## Findings and implementation decisions

- The web Library exposes title organization and finished/unfinished filtering. Purchased titles appear automatically, while included titles have an explicit add action. Use those rules in the account shelf and give each library record a visible listening status. [Audible Library help](https://help.audible.com/s/article/manage-your-library?language=en_US)
- Audible exposes available credits and expiration information in account navigation and Credit summary. Use the rail and header for discovery, with a balance panel and an activity ledger for reconciliation. One credit buys one eligible audiobook through a confirmation. [Audible credits help](https://help.audible.com/s/article/learn-about-credits?language=en_US), [Audible purchase help](https://help.audible.com/s/article/buy-an-audiobook?language=en_US)
- Self-service returns start in Purchase history. The published rules describe eligible credit-funded purchases within 365 days for active Premium members, subject to return restrictions. The sandbox models the restrictions as fixture data and records a new credit with its own expiration. Purchase history includes a refund view. [Audible return help](https://help.audible.com/s/article/return-a-title?language=en_US), [Audible transaction history help](https://help.audible.com/s/article/view-your-transaction-history)
- The Wish List supports saving from search or details, removing entries, and acquiring a title. The scoped account workflow uses a direct credit confirmation from Wish List as well as from the catalog. [Audible Wish List help](https://help.audible.com/s/article/manage-your-wish-list?language=en_US), [Audible purchase help](https://help.audible.com/s/article/buy-an-audiobook?language=en_US)

## Feature inventory

| Priority | Surface | Layout and interactions |
| --- | --- | --- |
| P0 | Shared account frame | Aubergine rail, catalog search, membership identity, and a live credit balance. The responsive header keeps every destination available. |
| P1 | Library | Shelf rows with cover, progress, and source. Search, status filters, sorting, mark finished or unfinished, and remove an included title. |
| P1 | Browse and title detail | Cover-led results with a search field and title links. Detail groups cover, synopsis, author, narrator, and runtime with context-specific Wish List, add, and purchase actions. |
| P1 | Credit summary | Balance panel, available and historical credit records, and dated ledger with links to related orders. Browse and title surfaces support one-credit confirmation. |
| P1 | Purchase and refund history | Receipt rows, order and refund views, time filter, order details, eligibility reasons, and a return confirmation. |
| P1 | Wish List | Saved rows with search, sort, removal, and acquisition actions. |

`DESIGN.md` specifies the original visual system. `data_model.md` defines the nine persisted entity types and their joins. `TODO.md` defines the implementation and test order. Public help articles informed workflow semantics. The account layout and art direction were authored for this project.

The app starts signed in as Maya Chen. Authentication, live payments, full audio streaming, and member support interactions are outside the four seeded workflows.
