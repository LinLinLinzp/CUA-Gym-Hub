# California DMV research handoff

The California Department of Motor Vehicles licenses drivers, registers vehicles and operates online transactions alongside field offices. The portal's Online Services directory, MyDMV account, office finder and dedicated transaction entry pages provide multiple ways to start a task. The implementation plan lives in [TODO.md](../TODO.md), with [design tokens](../DESIGN.md) and a [proposed state model](data_model.md). [CA.gov department profile](https://www.ca.gov/departments/220/) · [DMV Online Services](https://www.dmv.ca.gov/portal/dmv-online/)

## Residents and their tasks

| Resident | Primary tasks | Information needed |
| --- | --- | --- |
| First-time driver or resident with an in-person requirement | Find a compatible office, book a visit or drive test, look up the booking and cancel if plans change | Service type, city or ZIP, available local time and contact details |
| Vehicle or vessel owner | Identify a registration, review fees and delivery address, pay, and retrieve the receipt or status | Plate or CF number, VIN/HIN suffix, registration and payment choice |
| Resident who moved | Select DL/ID, Garage vehicle registration or both, review address fields and check the request's status | Old and new residential addresses, optional mailing address and affected records |

## Workflow research and implementation decisions

### Appointments

The appointments landing page directs routine transactions toward online services and offers office visits for eligible reasons and separate drive-test entry points. The office selection view has a City or ZIP Code field, result cards with name, hours, address and Select Location, and a map beside the list on desktop. The appointment lookup shows required first name, last name and phone plus optional email, and supports reviewing or cancelling a booking. [Service selection](https://www.dmv.ca.gov/portal/appointments/) · [Office selection](https://www.dmv.ca.gov/portal/appointments/select-appointment-type/?option=CID) · [Appointment lookup](https://www.dmv.ca.gov/portal/appointments/appt-edit/)

Implement service → office → date/time → contact → review → confirmation. Source service compatibility and availability from the local offices and appointment slots. Show saved results and use a cancellation dialog that identifies the booking. A scheduled appointment occupies its slot, and cancellation releases it while preserving the history row. The calendar, review and confirmation screens use the proposed shared form components. The optional map uses local fixture positions.

### Registration renewal

The renewal landing asks for the license plate or CF number, VIN/HIN suffix and payment details. The public entry accepts up to eight plate characters, displays a VIN/HIN help disclosure with labeled examples and uses Continue to proceed. Online eligibility depends in part on whether applicable insurance and smog information is on file. The separate status flow identifies the vehicle by plate and either VIN/HIN suffix or registered owner name. [Renewal introduction](https://www.dmv.ca.gov/portal/vehicle-registration/vehicle-registration-renewal/) · [Public application entry](https://www.dmv.ca.gov/wasapp/vrir/start.do?localeName=en) · [Registration status](https://www.dmv.ca.gov/portal/vehicle-registration/vehicle-registration-status/)

The public shopping cart page describes card and bank payment, including a 1.95% card processing fee and a single-transaction limit for bank payment. For this task, implement a one-item cart and two built-in sample methods. The post-lookup vehicle, review, checkout and receipt screens use the proposed shared components. Link from the address review to the address change service. The final commit records the fee breakdown and confirmed mailing address, advances the linked registration and consumes the offer. [Shopping Cart](https://www.dmv.ca.gov/portal/shopping-cart/)

### Address change

The public entry links to MyDMV. It asks residents to have old and new addresses ready and use the Garage for vehicle records. The guidance allows DL/ID and vehicle registration together, up to three owned vehicles with the same address, and a PO box as an optional mailing address. It gives an estimate of up to three days and tells residents where to check status. [Change of Address](https://www.dmv.ca.gov/portal/online-change-of-address-coa-system/) · [MyDMV overview](https://www.dmv.ca.gov/portal/mydmv-account/)

The signed-in Garage, target picker, address form, review and history are proposed screens informed by those public pages. Use the current profile and local ownership relationships for target selection. Record a submitted request, show its details and status under MyDMV, and keep the confirmed addresses available to registration renewal while processing is pending. Completed requests appear through fixtures, which makes both statuses available to tasks with a frozen clock.

## Feature inventory

| Priority | Feature | Main UI and interaction |
| --- | --- | --- |
| P0 | Portal home and navigation | California DMV masthead, three service shortcuts, stable route links and collapsed mobile menu |
| P0 | Online Services directory | Grouped service links and case-insensitive local service search |
| P0 | Signed-in MyDMV | Garage, DL/ID summary, activity links and account shortcuts |
| P0 | Harbor and offline runtime | Await initialization, scoped state sync, verifier API, direct links and data-shape handling |
| P1 | Book an appointment | Service cards, office results, date/time picker, contact form, review and confirmation |
| P1 | View and cancel appointments | Four-field lookup, filtered appointment history, explicit cancellation and released time slot |
| P1 | Renew a registration | Plate/CF and VIN/HIN form, help disclosure, eligibility results, fee summary, cart, payment review and receipt |
| P1 | Check registration status | Vehicle and alternate identifier lookup, latest recorded status and receipt link |
| P1 | Submit address change | Credential and Garage selection, previous and new addresses, separate mailing choice, review and confirmation |
| P1 | Check address change status | MyDMV list and request details with recorded status |
| P2 | Expanded office finder | Search and service filters, location detail, offline map and preselected scheduling entry |
| P2 | Service help and printing | Expandable guidance and print views for saved confirmations |

## Visual references

These are research captures of the official public site. Use the visual measurements and component properties in [DESIGN.md](../DESIGN.md) for the app. Desktop captures were retrieved via Thum.io at 1440px output width. The mobile home and expanded VIN help were captured via Microlink. The app's own transaction screens use the service flow and design specified in the handoff. [Thum.io capture options](https://www.thum.io/documentation/api/url) · [Microlink screenshot API](https://microlink.io/docs/api/parameters/screenshot)

| Screenshot | What to look at | Official source |
| --- | --- | --- |
| [Home, desktop](screenshots/home-desktop.png) | Blue utility header, white transaction navigation, prominent main task and central service search. | [California DMV home](https://www.dmv.ca.gov/) |
| [Home, mobile](screenshots/home-mobile.png) | Compact logo and menu row, full-width featured action and a vertical service stack. | [California DMV home](https://www.dmv.ca.gov/portal/) |
| [Online Services](screenshots/online-services-desktop.png) | Page heading and advisory band, with Renew and Apply/Request link groups below. | [Online Services](https://www.dmv.ca.gov/portal/dmv-online/) |
| [Public MyDMV](screenshots/mydmv-public-desktop.png) | Narrow intro column alongside a wider benefits card identifying Garage, DL/ID and address management. | [MyDMV Account](https://www.dmv.ca.gov/portal/mydmv-account/) |
| [Appointments overview](screenshots/appointments-desktop.png) | Two-column guidance surface followed by service selection and drive-test cards. | [Appointments](https://www.dmv.ca.gov/portal/appointments/) |
| [Appointment offices](screenshots/appointment-office-desktop.png) | Selected transaction opens at the location results. Office names, addresses, hours and buttons sit beside a searchable map. | [Appointment office selection](https://www.dmv.ca.gov/portal/appointments/select-appointment-type/?option=CID) |
| [Appointment lookup](screenshots/appointment-lookup-desktop.png) | Bordered card with a two-column set of name/email/phone inputs and primary/secondary actions. | [View Appointment](https://www.dmv.ca.gov/portal/appointments/appt-edit/) |
| [Locations](screenshots/locations-desktop.png) | Office search card with city/ZIP and distance, location type and service filters. | [Locations](https://www.dmv.ca.gov/portal/locations/) |
| [Renewal landing](screenshots/renewal-landing-desktop.png) | Two-line service title, primary call to action, numbered requirements card and FAQ rows. | [Vehicle Registration Online Renewal](https://www.dmv.ca.gov/portal/vehicle-registration/vehicle-registration-renewal/) |
| [Renewal entry](screenshots/renewal-entry-desktop.png) | Compact application masthead, sparse left-aligned plate and VIN/HIN fields, helper copy and paired form actions. | [Online Registration Renewal](https://www.dmv.ca.gov/wasapp/vrir/start.do?localeName=en) |
| [Renewal VIN help](screenshots/renewal-vin-help-desktop.png) | Expanded inline help shows annotated sample renewal notice and registration card, with the identifiers highlighted. | [Online Registration Renewal](https://www.dmv.ca.gov/wasapp/vrir/start.do?localeName=en) |
| [Shopping cart introduction](screenshots/shopping-cart-desktop.png) | Checkout entrance beside payment requirements and processing-fee information. | [Shopping Cart](https://www.dmv.ca.gov/portal/shopping-cart/) |
| [Registration status](screenshots/registration-status-desktop.png) | Status CTA with alternate lookup identifiers in the requirements card. | [Vehicle Registration Status](https://www.dmv.ca.gov/portal/vehicle-registration/vehicle-registration-status/) |
| [Address change landing](screenshots/address-landing-desktop.png) | Main action, processing estimate and requirements, followed by eligibility guidance. | [Change of Address](https://www.dmv.ca.gov/portal/online-change-of-address-coa-system/) |

## State and scope

The model links the signed-in profile and credential to Garage vehicles, registrations, renewal receipts and address requests. Appointments link to offices and slots. Filter, search and lookup behavior is driven by seeded records. Verifiers use structured fields in [Observable State Changes](data_model.md#observable-state-changes). A submitted renewal records both its receipt and its registration update. An address change request records affected products and old/new addresses, while the status view reads the request.

Authentication, identity checks, payment processing, outbound communications, remote maps, voter registration submissions and placard or credential issuance sit outside this training scope. The session starts as Maya Chen with local sample records. The mobile design follows the responsive public website, which DMV identifies as its online-service entry after retiring the older CA DMV Mobile App. [DMV mobile app notice](https://qr.dmv.ca.gov/portal/mobile-app/) · [DMV accessibility guidance](https://www.dmv.ca.gov/portal/accessibility/)
