# OpenTable workflow research

The signed-in diner account brings together five moments in a meal's lifecycle: finding a table, confirming a booking, managing the reservation, reviewing the visit and using Dining Points. New diners need a clear path from an empty Upcoming list to available times. Returning diners need quick access to a reservation they can change. Frequent diners need to distinguish points they can spend from points associated with upcoming plans.

## Public product behavior

- **Finding and booking a table.** OpenTable's diner help describes searching by location, cuisine, date, time and party size, choosing among available times and receiving a confirmation with the booking details. Confirmed bookings appear in Upcoming Reservations. [OpenTable booking guide](https://help.opentable.com/s/article/How-do-I-make-a-reservation-1505260085031?language=en_US)
- **Changing plans.** Diners usually open an upcoming reservation to modify or cancel it. Date, time, party size and special requests are familiar inputs, and policy and availability govern what can change. The synthetic venues use simplified policies that allow self-service edits and cancellation before the scheduled start. [OpenTable reservation self-service guide](https://help.opentable.com/s/article/What-can-a-restaurant-help-me-with?language=en_US)
- **Reviewing a visit.** A diner can leave a review through their account after being seated. OpenTable supports star-only ratings and written reviews. The planned app links each review to a completed reservation and allows a single submission per visit. [OpenTable review guidance](https://support.opentable.com/s/article/Respond-to-Reviews-Feature?language=en_US)
- **Earning and redeeming points.** Eligible honored reservations earn points. The points overview shows the balance and activity, and diners confirm a redemption after seeing its cost and value. The two planned U.S. dining credit tiers use the documented 2,000 points for $16 and 5,000 points for $40. [OpenTable points guide](https://help.opentable.com/s/article/redeempoints?language=en_US)

## Feature inventory and screen layout

| Priority | Screen or workflow | Layout and interaction |
| --- | --- | --- |
| P0 | Account shell | Text wordmark, responsive account navigation, diner identity, shared boot and feedback states, direct links and session-scoped state. |
| P1 | Reservation list | Upcoming, Past and Canceled tabs with search. The next upcoming booking gets a date tile and broad food crop. Compact rows work for larger histories. |
| P1 | Discovery and booking | Filter bar, restaurant cards with local imagery and selectable times, restaurant detail and booking confirmation. The final summary displays the selected slot and any prospective points. |
| P1 | Modify reservation | Prefilled editor launched from the detail page. Date and party changes update the available times. An explicit save returns to the same reservation detail. |
| P1 | Cancel reservation | Detail-page action opens a confirmation dialog. The canceled row and the original confirmation code remain accessible through the Canceled tab. |
| P1 | Review a visit | To review lists eligible completed visits. My reviews shows submitted ratings and comments. Accessible rating controls and a comment field form the review editor. |
| P1 | Points activity | Balance and pending subtotal above signed ledger entries. Earned and Redeemed filters retain useful links to related bookings or credits. |
| P1 | Redeem points | Reward tiles show cost and currency value. Confirming an affordable reward issues a credit and posts one matching debit. |
| P2 | Calendar export | Generate a local calendar download from confirmed booking detail as optional follow-on work. |

## Data and visual handoff

`account` owns the diner activity. `restaurants` supply local schedules and descriptive details, `reservations` retain booking status and links, and `reservationEvents` record transitions. `reviews` attach to visits. `rewardOptions`, `pointTransactions` and `pointRedemptions` provide the reward catalogue, ledger and issued credits. [Data model](data_model.md)

Use the original dining-journal design for visual implementation. Public support material supplies workflow evidence. Use locally authored food imagery and fallback treatments from the design guide for rendering. [Design guide](../DESIGN.md)

The signed-in shell uses a synthetic diner and synthetic venues. Authentication, staff operations, communications, payment collection and fulfillment are outside this account workflow. State API traffic stays local during functional testing.
