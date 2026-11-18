# Recreation.gov workflow research

Recreation.gov lets visitors search federal recreation facilities and book inventory such as a campsite or wilderness permit. Booking windows, quotas, fees and cancellation rules can vary by facility. The account implementation focuses on booking, lottery applications and trip management. [Platform FAQ](https://www.recreation.gov/faq)

## Visitors and workflows

| Priority | Visitor and goal | Product behavior reflected in the plan |
|---|---|---|
| P0 | Returning account holder opens a trip link | The account opens pre-signed-in and routes survive direct navigation and reload. |
| P1 | Camper wants a campsite for a particular set of nights | Location, dates and site fit determine availability. Review booking terms before confirmation. [Campsite reservation guidance](https://www.recreation.gov/articles/list/tips-for-yosemite-reservations/281) |
| P1 | Hiker wants a wilderness permit for a group | Book a trailhead and entry date within published quota and group size limits. Per-person charges can apply. [Wilderness permit example](https://www.recreation.gov/permits/233262) |
| P1 | Visitor wants a high-demand permit | Find an open opportunity, choose eligible dates, submit an application and check for a result. A selected applicant may need to complete additional steps to secure the permit. [Lottery process](https://mobile.recreation.gov/lottery/how-they-work), [Lottery opportunities](https://www.recreation.gov/lottery/available) |
| P1 | Trip holder changes plans | Open the reservation, review retained fees and cancellation eligibility, confirm, and view the resulting refund. Rates and rules are facility specific. [Reservation policies](https://www.recreation.gov/reservation-policies) |
| P2 | Trip holder needs a paper record | Print the local receipt from the reservation detail. |

## Interface handoff

| View | Structure and main actions |
|---|---|
| Account overview | Text brand, account navigation, next trip with a local illustration, recent reservations and a link to lottery activity |
| My reservations | Upcoming, Past and Cancelled tabs; search, filters and date sort; detail links with codes and dates |
| Explore and facility details | Camping and permit modes, filters, result list, inventory, terms, review and booking receipt |
| My lotteries | Application list and status filters, detailed results, claim deadline, review and linked permit receipt |
| Lottery opportunities | Browse by destination and window, review eligibility and fee, rank dates and submit |
| Reservation detail | Trip facts, policy applicability, paid charges, cancellation preview and cancelled receipt |

The [design guide](../DESIGN.md) specifies the original layout, colors and interactions. [Trip landscape](trip-landscape.svg) is locally authored artwork suitable for the overview. The research used public text documentation. The account runs with synthetic information and an offline state API. Local review and confirmation represent charges without collecting payment data.

## Data relationships

RIDB separates facilities, campsites and permit entrances. This plan uses that catalog relationship with synthetic records and adds reservation, lottery application and cancellation records for verification. See the [state model](data_model.md) for fields, examples and fixtures. [RIDB API documentation](https://ridb.recreation.gov/docs)

## Scope

The pre-signed-in account supports finding and managing trips locally. Authentication, live data, payments, email, live maps and account administration are outside the implementation scope.
