# KAYAK Account Research

## Product behaviors

KAYAK Trips gathers itinerary details and booking confirmations into one view. Travelers can add activities manually and keep a trip accessible from desktop and mobile. For this sandbox, model manual itinerary entries and saved booking associations as distinct record types. [KAYAK Trips help](https://www.kayak.com/c/help/account-trips/what-is-kayak-trips.62108.faq)

KAYAK supports tracking flights, stays and rental cars. Its notification center manages active and paused alerts, while its help describes daily and significant-change updates and travel-date expiration. The account design includes a direct create form, informed by the documented mobile profile flow, so the local workflow can start from the account without a separate discovery site. [Create an alert](https://www.kayak.com/c/help/pricing/how-often-are-price-alerts-refreshed.62012.faq) · [Alert behavior](https://www.kayak.com/c/help/pricing/) · [Pause or remove an alert](https://www.kayak.com/c/help/pricing/how-to-remove-price-alerts.62020.faq)

Booking receipts supply the confirmation number and provider details. Suppliers handle changes and cancellations. Preserve the account receipt as a read-only record of supplier details and provide a separate local manual reservation workflow for information the traveler wants to keep with a trip. [Find a confirmation](https://www.kayak.com/c/help/bookings/find-kayak-booking-confirmation.62072.faq) · [Manage a flight reservation](https://www.kayak.com/c/help/bookings/manage-your-flight-reservation.62064.faq)

## Travelers and tasks

| Traveler | Example workflow |
| --- | --- |
| Leisure planner | Create a Lisbon trip, add a market visit and attach the existing guesthouse reservation. |
| Flexible shopper | Track Boston to Lisbon, revise travel dates, then pause the alert while deciding. |
| Frequent traveler | Find a past reservation by confirmation code and read the provider and amount. |
| Traveler organizing an offsite booking | Save a rental confirmation locally, move it to the correct trip, then remove a duplicate saved record. |

## Feature inventory

| Priority | View | Design and interactions |
| --- | --- | --- |
| P0 | Account shell | Persistent KAYAK text masthead, signed-in traveler identity and Trips, Price Alerts, and Bookings navigation. Support direct routes and a compact layout. Load the sid-scoped world before opening a page. |
| P1 | Trips | Feature panel and New trip button above search, time filters, sorting and a grid of trip records. Open a trip by title. |
| P1 | Trip detail | Title, date range and trip notes above an itinerary of manual entries and linked bookings. Add and edit entries, attach existing bookings, or edit and delete the trip. |
| P1 | Price Alerts | Compact header with New alert, filters and rows with tracked route or location, dates, cadence and status. An edit form shows the appropriate fields for the selected alert type. A row offers pause/resume and delete. |
| P1 | Bookings | Searchable receipts and locally saved reservations with source, status and type filters. A detail view groups receipt facts, trip association and notes. Add and edit manual reservations, and use the trip picker from either feature. |
| P2 | Trip and booking detail | Print the itinerary and copy receipt reference/provider text locally. |

## State and assets

Trips own manual itinerary items. Bookings retain their own identities and carry an optional trip ID. Price alerts hold search criteria and a fixed sample price when available. The [data model](data_model.md) defines fields, example records and lifecycle invariants. [TODO.md](../TODO.md) maps browser actions to those fields.

Use the original folio layout and route illustration specified in [DESIGN.md](../DESIGN.md). The references above supply behavior only. All displayed data is synthetic. Use local records and feedback for workflows that would otherwise require authentication, provider transactions, external email or live inventory.
