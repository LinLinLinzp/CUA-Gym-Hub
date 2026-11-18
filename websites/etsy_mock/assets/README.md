# Etsy buyer account research

The account serves a shopper who wants to find independent goods, communicate with a seller, recover from an order issue, or keep a shortlist. The default buyer is Mara Bennett, whose orders span fictional studios and whose conversations and lists contain synthetic content.

## Workflow findings

- **Shop and buy.** Search keywords connect shoppers with item and shop results. Category, price, and sort cover the main narrowing patterns. A listing supports a cart purchase or quick checkout, and checkout verifies delivery and payment before placing an order. [Search items and shops](https://help.etsy.com/hc/en-gb/articles/115015627947-How-to-Search-for-Items-and-Shops-on-Etsy) · [Purchase an item](https://help.etsy.com/hc/en-us/articles/115013196707-How-to-Purchase-an-Item-On-Etsy)
- **Ask a seller.** Before checkout, the listing offers a direct message. After checkout, Purchases offers order help with issue details and a desired resolution. Preserve the context that distinguishes these conversations in the inbox. [Contact a shop](https://help.etsy.com/hc/en-us/articles/115013328428-How-to-Contact-a-Shop) · [Get help with an order](https://help.etsy.com/hc/en-us/articles/4402660818583-How-to-Get-Help-with-An-Order)
- **Request a return or escalate a case.** Return and exchange conversations go to the seller and reflect the shop's policy for the item. A buyer who has already asked for help can escalate a qualifying order to Etsy after the delivery window and waiting period. The case log is the follow-up surface and the buyer can close a resolved case. [Return or exchange an item](https://help.etsy.com/hc/en-us/articles/115015440807-How-to-Return-or-Exchange-an-Item-on-Etsy) · [Open a case](https://help.etsy.com/hc/en-us/articles/5745586898199-How-to-Open-a-Case)
- **Keep favorites.** Buyers can save items, follow shops, and organize items into named collections. Favorite items can be searched, and a sold-out item can stay in a list. [Keep track of items and shops](https://help.etsy.com/hc/en-us/articles/115015439627-How-to-Keep-Track-of-Items-and-Shops-You-Love)
- **Model references.** Etsy's developer documentation distinguishes listings, shops, order receipts, and transactions. The local schema uses stable string IDs and embeds purchase-time snapshots in order lines. [Etsy Open API reference](https://developers.etsy.com/documentation/reference/)

## Feature inventory and screen layout

| Priority | Surface | Contents and interaction |
| --- | --- | --- |
| P0 | Account overview and navigation | Etsy text wordmark, search and cart in masthead, account navigation rail, welcome panel, latest order/messages, saved-item preview |
| P0 | Runtime and routing | Neutral load state, sid-preserving routes, provider-backed views, local assets, status and empty states for each view |
| P1 | Search, listing, and shop | Search with filters above a card grid, listing media beside purchase controls, shop profile with listings and contact/follow actions |
| P1 | Cart, checkout, and receipts | Items grouped by seller, quantities and totals, synthetic shipping and payment, review and confirm, links to purchases |
| P1 | Purchases and order help | Searchable purchase history, order receipt, and a single-column help form with affected item, resolution, details, and policy |
| P1 | Messages | Searchable conversation list, unread state, linked listing or order context, message history and reply composer |
| P1 | Cases | Case index and receipt links, eligibility callout, escalation form, case status and chronological case log |
| P1 | Favorites | Separate items, shops, and collections views, favorites search, collection membership picker, and collection editing |
| P2 | Favorites privacy | Saved-item and shop visibility fields with an explicit Save action |

The [state model](data_model.md) maps these screens to buyer, catalog, cart, receipt, conversations, support, and saved-target records. [TODO.md](../TODO.md) defines build order and acceptance checks, and [DESIGN.md](../DESIGN.md) defines the original visual system. Use the public guides for interaction semantics and create local artwork for the account design. Authentication, seller tools, payment integrations, and the regional or digital-order branches of marketplace policy are outside this buyer-account scope.
