# Delta account workflow research

The workspace starts with Avery Morgan's synthetic Delta account. A traveler can find an existing itinerary, manage eligible bookings, review SkyMiles activity or request missing mileage, and use an eCredit toward a new flight. The screens use the custom layout in [DESIGN.md](../DESIGN.md). Original local artwork can be drawn as itinerary lines and markers using CSS.

## Travelers and scenarios

- A traveler with a schedule conflict needs to locate a booking, compare new flight options and know the price before committing.
- A traveler abandoning an itinerary needs to review cancellation proceeds and locate any resulting eCredit in the wallet.
- A frequent traveler needs to reconcile a flight with their mileage activity and submit a missing-credit request.
- A traveler with unused ticket value needs to find the credit, verify its expiration and understand the balance before confirming the next booking.

## Feature inventory

| Priority | Feature | Layout and flow |
| --- | --- | --- |
| P0 | Account shell | Desktop rail and responsive header with My Trips, SkyMiles and eCredits, each with direct navigation and preserved sid. |
| P0 | Harbor state | Neutral boot screen, loaded and injected JSON, user-driven changes, reliable deep links and a JSON state snapshot at /go. |
| P1 | My Trips | Next departure panel, Upcoming/Past/Canceled tabs, searchable and sortable trip lists, record lookup and an itinerary detail page. A traveler can add an unlinked booking after matching a ticket or confirmation and names. |
| P1 | Change flight | Itinerary action opens a segment and date selector. Results show flight times and price impact, followed by a review screen and confirmation. |
| P1 | Cancel trip | Itinerary action opens a review of affected flights and settlement, followed by confirmation and a credit or refund reference where applicable. |
| P1 | SkyMiles | Balance, tier, MQDs, activity filters and a missing-mileage request form with request history. |
| P1 | eCredits wallet | Available, expired and used views, issue and expiration details, and lookup and add for unlinked credits. |
| P1 | eCredit redemption | Wallet selection leads to route/date search, results, review of credit allocation and amount due, then a linked trip confirmation. |

## Public product references

- My Trips supports confirmation or ticket lookup with traveler names. The account flow adds a local linking step so a matched itinerary can be saved for future visits. [Delta Find Your Trip](https://www.delta.com/my-trips/search)
- Delta's servicing flow starts from itinerary details. A change can require a fare difference or leave value for an eCredit. A cancellation has a separate review step and may refund the original payment or issue eCredit depending on the ticket. The fixture model expresses eligibility and fee rules as fare fields. [Delta change and cancellation guide](https://www.delta.com/intl/en/travel-planning-center/change-or-cancel-your-trip/how-to-cancel-or-change-your-flight)
- SkyMiles members can track MQDs and request credit for a flown Delta ticket using its ticket number. The workspace records a submitted request and displays its link to the booked trip. [Delta SkyMiles support](https://www.delta.com/us/en/need-help/support-skymiles) · [SkyMiles program rules](https://www.delta.com/us/en/skymiles/program-resources/program-rules)
- Account-linked eCredits can be viewed together. The documented redemption sequence is look up, validate holder, select, shop, review and confirm. This phase uses one credit per checkout and local flight offers. [Delta eCredit terms](https://www.delta.com/us/en/booking-information/ecredits-certificates-gift-cards) · [Delta eCredit rebooking guide](https://www.delta.com/us/en/change-cancel/how-to-rebook)

## Data and scope

[Data model](data_model.md) defines account, booking, synthetic inventory, credit, mileage and action records. Attaching a booking or credit records its account association. Changes and cancellations preserve audit events and settlement links. A request stores the ticket relationship and submission status. Redemption consumes the selected wallet balance and creates a booking in one update.

The signed-in starting state keeps training focused on trip servicing and account activity. The scope excludes authentication, live airline inventory, payment collection, external messaging, award booking and general flight shopping. The [canonical implementation plan](../TODO.md) includes the state writes and verification cases for each workflow.
