# Grubhub account research and feature inventory

This sandbox starts in the signed-in account of fictional diner Maya Torres. Orders anchor the account. Each receipt provides the relevant ways to reorder food, manage a scheduled delivery, or request help with a delivered order. The restaurant catalog, bag and checkout support placing a new delivery or repeating an earlier one.

## Public workflow references

- Grubhub describes order history as a place to view receipts and reorder with edits. Use a searchable account history, self-contained receipts and an editable bag before confirmation. [Grubhub diner FAQ](https://www.grubhub.com/help/faq/yelp)
- Grubhub documents choosing a date and arrival time during the order flow, based on restaurant availability. Diners can schedule a repeat order and edit or cancel under stated conditions. The sandbox uses a four-day calendar and its own deterministic set of 30-minute bookable windows. [Grubhub preorder guide](https://www.grubhub.com/eat/preorder_demo)
- Grubhub documents refund review and eligible kinds of order issues, including missing items, preparation errors and delivery problems. The sandbox gives diners a local request form and a case history, with a saved request and a linked receipt. Its amount computation and case transitions are defined for synthetic receipts in the state model. [Grubhub diner refund and adjustment policy](https://get.grubhub.com/help-center/grubhub-restaurant-policies/)

The visual reference for implementation is the original layout and local artwork specification in [DESIGN.md](../DESIGN.md). The public references describe behavior and terminology.

## Personas and routes

| Diner task | Entry point and progression |
| --- | --- |
| Find what I paid for a previous order | Open `/orders`, choose Past, search by restaurant or order number, then open `/orders/:orderId` to read the receipt. |
| Reorder last week's dinner | Open a past receipt, choose Reorder, adjust the bag, then complete checkout for ASAP delivery. A first-time order starts at `/restaurants` and uses the same checkout. |
| Reserve tomorrow's lunch delivery | Start from `/scheduled`, browse or reopen the current bag, select Schedule for later at checkout, and place the order. The booked window appears in the account and receipt. |
| Move or cancel a scheduled delivery | Open an eligible upcoming delivery, review the current window and confirm a replacement slot or cancellation. |
| Report a missing item and review the request | Start from a delivered receipt or `/refunds`, select the affected line and quantity, review the amount, and submit. Open `/refunds/:refundId` to review the saved case. |

## Feature inventory

| Priority | View | Content and interaction |
| --- | --- | --- |
| P0 | Shared shell | Text brand, account navigation, catalog link and bag count. Route loading, hard reload, empty-state recovery and session-aware links. |
| P0 | State and seed | One Harbor-backed store, deterministic synthetic fixtures, session isolation, injected data tolerance and action-by-action verifier fields. |
| P1 | Orders | Searchable and sortable cards with status and time filters. Receipt view shows line items, amounts, delivery and masked payment. Receipt actions follow order eligibility. |
| P1 | Restaurants, bag and checkout | Search restaurants and dishes. Add from local menus or past orders, edit quantities, review billing, then confirm an ASAP order or schedule one. |
| P1 | Scheduled deliveries | Upcoming cards sorted by window, archived cards, a local calendar and slot picker, reschedule and cancel confirmations, and receipt links. |
| P1 | Refunds | Case search and filters, an order picker, a form for item or full-order requests and an itemized case detail. |
| P2 | Receipts | Print the displayed receipt using print-specific styling. |

## Data and scope

One account provides saved addresses and masked payment methods. The catalog supplies menu lines to the bag, and checkout snapshots them into orders. Each schedule links to an order and keeps a history of window changes. Refunds reference order line IDs and record units and amounts, allowing partial refunds and subsequent requests for the remaining charge. [State model](data_model.md)

Use synthetic diners, restaurant names and prices throughout. Authentication, payment settlement, merchant tools, driver tools, live support, remote assets and outbound communications sit outside the account workflow. [Implementation priorities](../TODO.md)

## Juniper Rice Kitchen

The original food photograph is packaged at `public/images/rice-kitchen.png`. It was created with the built-in ImageGen tool.

Prompt

> Create one original photorealistic editorial food hero photograph for a local restaurant demo, horizontal 3:2. Modern Korean neighborhood restaurant on a warm pale-oak tabletop. Overhead at a 35-degree angle, daylight, a generously sized charcoal ceramic bowl of grilled chicken rice with pickled cucumber, scallions and sesame in the lower center with a scallion pancake on a small cream plate and subtle side dish around it. Delicious and candid, cafe food photography, clean edges on each side, background composed so a wide 4:1 center crop still contains the hero ingredients. No writing, lettering, marks, overlays, restaurant branding or people. Create a unique composition and do not reference any existing restaurant or food-delivery site layout.
