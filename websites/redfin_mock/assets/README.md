# Redfin account workflow research

The account serves a signed-in buyer who is narrowing a shortlist, coordinating showings, preparing an offer, or following up with a local agent. Avery Morgan, the synthetic account holder, is comparing Seattle-area properties across neighborhoods and home types. The design uses an account overview to surface the buyer’s latest activity and dedicated routes to work through longer lists.

| Priority | Workflow | Product behavior and implementation direction |
| --- | --- | --- |
| P0 | My Redfin | The overview pairs a Saved homes preview with upcoming tour, offer, and conversation summaries. The masthead shows the Redfin name and the account holder. |
| P1 | Saved homes | Redfin lets buyers favorite listings with a heart and find them again in their account. Use a single Saved homes collection, with the same toggle on browse cards and listing detail, plus searchable saved results. [Favorites & Favorite Lists](https://support.redfin.com/hc/en-us/articles/12559140934939-Favorites-Favorite-Lists) |
| P1 | Tours | Redfin takes a listing-specific request for a date, time, and optional notes. Its documentation describes in-person and video options and a confirmation step after requesting. Use a request form and an account queue with Upcoming and History views. Reschedule and cancel are local queue actions. [Scheduling a Tour](https://support.redfin.com/hc/en-us/articles/360001432232-Scheduling-a-Tour) |
| P1 | Offers | Redfin provides a listing-level Start an Offer entry and collects proposed terms before acknowledging receipt of an offer request. Use a draft and request form, plus an account queue for checking status or withdrawing a submitted request. [Starting An Offer](https://support.redfin.com/hc/en-us/articles/360018430612-Starting-An-Offer) |
| P1 | Agent messages | Redfin documents contacting agents through a form and asking questions about a home or neighborhood. Use a local inbox with property-linked conversations, unread indicators, replies, and new messages. The inbox is a design decision for the seed workflow. [Buying FAQ](https://support.redfin.com/hc/en-us/articles/360001433192-Buying-FAQ) · [Redfin product announcement](https://www.redfin.com/news/redfin-launches-completely-redesigned-iphone-app/) |
| P2 | Listing gallery | Extend the listing detail with a keyboard-accessible gallery using the same local image set. |

## View inventory

- **Overview** shows a preview of recent saves beside a compact activity stack. Empty sections lead to the action that creates the relevant record.
- **Browse and listing detail** provide a searchable inventory, useful filters, property facts, and entry points for saving, requesting a tour, starting an offer, and asking an agent.
- **Saved homes** uses the browse card component so listing facts and the save toggle behave consistently. Sort and query operate on active saves only.
- **Tours and Offers** use filterable rows with searchable addresses, textual statuses, and a details panel for terms and actions.
- **Messages** pairs a conversation list with a thread and reply composer. The list collapses to a separate route on narrow screens.

## Data and scope

The account, agents, and inventory supply context for saved homes, tours, offers, conversations, and messages. The mutation records join back to the listing and acting account by fixed or newly generated IDs. See [the state model](data_model.md) for record shapes, desired seed distributions, and observable writes.

Scope centers on the four workflows in the seed. Skip identity checks, authentication, notification delivery, shared lists, live maps, and legal transaction execution. Follow [the original design direction](../DESIGN.md) for the interface and local imagery.
