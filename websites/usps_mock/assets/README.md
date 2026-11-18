# USPS workflow research

The account brings four mail services into one place. A mover forwards household or business mail, a resident pauses delivery while away, a sender or recipient files an insured package claim, and a renter searches for or renews a PO Box. Jordan Rivera is the synthetic account holder. The [implementation checklist](../TODO.md) is the priority and acceptance reference.

## P0 account shell

Use a persistent service navigation, direct route links and an account home with service shortcuts and recent requests. A signed-in account view provides access to service histories. The home, service index, request detail, and review layouts are defined in the [original design guide](../DESIGN.md). Public references establish terminology and workflow only. All illustrations and fixtures come from local original work. [USPS account support](https://faq.usps.com/articles/Knowledge/USPS-com-Account-Website-Support)

## P1 change of address

USPS distinguishes individual, family and business moves and permanent or temporary forwarding. A temporary initial request may run from 15 to 185 days. Existing requests have confirmation codes and support corrections and cancellation. The account ties management to a visible request in its history. Use a form that starts with move type and forwarding duration, groups the old and new address fields, and gives the user one review before confirmation. In this account, editing is scoped to destination and dates. [Forward Mail](https://www.usps.com/manage/forward.htm) · [Change of Address FAQ](https://faq.usps.com/articles/Knowledge/Change-of-Address-The-Basics)

## P1 Hold Mail

A Hold Mail request applies to the entire address. The USPS service allows 3–30 days and offers carrier delivery or Post Office pickup. A confirmation number identifies the request for changes and cancellation. The app uses address, inclusive dates, and a return option in a short form. Its calendar uses tomorrow as the earliest start and simplifies delivery schedules and cutoffs. Keep the confirmation visible alongside dates and the return method. [Hold Mail FAQ](https://faq.usps.com/articles/FAQ/USPS-Hold-Mail-The-Basics)

## P1 package claims

The domestic process checks filing windows and insured shipment details, collects evidence, and permits saving a claim for later submission. Lost packages have a service-dependent waiting period. Damage and missing contents have a 60-day filing limit. Use a shipment and claimant step, an item and evidence step, and a review. Keep saved drafts in history and persist item quantities, values, and evidence file metadata so a reopened draft remains actionable. [Domestic claims](https://www.usps.com/help/claims.htm) · [Publication 122](https://about.usps.com/policy/pub122.pdf)

## P1 PO Boxes

USPS provides location search, five sizes, 3-, 6- and 12-month terms, availability and location-specific pricing. A 3-month rental requires automatic renewal. Reservation precedes the office visit for keys or access, and existing renters can renew online. Use a location-results view with size availability, a focused reservation form and review, and separate rental detail with linked payment history. For repeatable offline scenarios, active rentals with catalog pricing can be renewed at any time. [Rent a PO Box](https://www.usps.com/manage/po-boxes.htm)

## P2 confirmation printing

Use the individual detail view as the printable receipt. Keep the reference, dates and service summary visible without the app navigation.

## Data and boundaries

Use fixed IDs and plausible English-language data in collections for moves, holds, claims, PO Boxes, office inventory and transactions. Store request fields directly and link related records by ID. The [data model](data_model.md) defines the types and writes used to implement and verify each workflow.

The training flows assume an existing account and stop at synthetic confirmations. Public site research does not require a production account. Identity checks, real communications, actual payment collection, evidence transmission and physical fulfillment are outside the implementation scope.
