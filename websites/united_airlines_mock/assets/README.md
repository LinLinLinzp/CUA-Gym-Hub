# United Airlines account research

The site serves a signed-in traveler who needs to manage a reservation, pick a different seat, reconcile award activity, or spend credit on a new trip. Avery Morgan is the synthetic account holder. A business traveler may recover a confirmation or file a missing-miles request. A family traveler may assign a seat for each person on several segments. A traveler holding a credit may check expiry before using it on a new booking.

## Public workflow references

- Trip lookup uses a confirmation code and the traveler's last name. Direct bookings appear in the traveler's account. Pair a lookup form with a searchable account trip list in this implementation. [United My Trips FAQ](https://www.united.com/es/us/manageres/mytrips)
- Seat choices depend on fare and availability. United distinguishes standard Economy from options such as Economy Plus. Use per-segment, per-traveler assignments and show price as part of seat selection. [United seating options](https://www.united.com/en/us/deals/flights/seat-options)
- MileagePlus members can earn miles from qualifying flights and partners and use miles toward award travel. Show awards and Premier progress as separate values. Use a request queue for outstanding missing-mile submissions. [United annual report](https://ir.united.com/static-files/6f003675-ff9d-4d53-a6fc-8d011f913956) · [United award travel](https://www.united.com/en/us/book-flight/united-award-travel)
- Future flight credits and electronic travel certificates can be applied toward new tickets. The planned wallet uses the amounts, owner and expiry stored on each synthetic fixture and supports one credit per booking. [United annual report](https://ir.united.com/static-files/6f003675-ff9d-4d53-a6fc-8d011f913956)

## Feature inventory

| Priority | View | Layout and interactions |
| --- | --- | --- |
| P0 | Account Overview | Text wordmark, account navigation and member identity. Use a next-trip card with a route illustration, a mileage summary and a credit summary. Each summary links to its full view. |
| P1 | Book a flight | Search form, selectable cash or award results, traveler entries and a review summary. Display fare, taxes, credit applied and remaining total. Finish with a confirmation number and trip link. |
| P1 | My trips and trip details | Status tabs, a searchable and sortable list, and confirmation-code lookup. Trip detail groups segments with passengers and assignments, payment details and permitted trip actions. |
| P1 | Seat changes | Segment and traveler selectors above the cabin grid. Pair a seat legend with a review panel that shows current and proposed assignment and fee before confirmation. |
| P1 | MileagePlus | Balance and status cards above filterable activity. A Requests section shows submissions and opens a form for an eligible completed segment. |
| P1 | Travel credits | Status tabs above searchable credit cards with expiry dates. A detail view shows redemption history and a Use credit action for eligible credit. |

The visual direction in [DESIGN.md](../DESIGN.md) uses an original route illustration built locally in CSS. Public references inform terminology and workflow semantics. The [data model](data_model.md) specifies synthetic snapshots, stable identifiers, balances and linked events.

Authentication, real payment entry and third-party integrations are outside the account workflow. Booking options and pricing come from local fixtures.
