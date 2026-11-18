# California DMV — TODO

> Status — DEV COMPLETE
>
> Last updated by dev agent on 2026-11-18
>
> [Research and visual references](assets/README.md) · [Design](DESIGN.md) · [Data model](assets/data_model.md) · [Harbor runtime contract](../../HARBOR_CONTRACT.md)

## Status legend

- [ ] Not started
- [~] In progress
- [x] Done

## P0 — Core shell and Harbor runtime

- [x] **Scaffold and run on port 5509.** Build a React + Vite SPA with a tracked `package-lock.json`. Set `server.port: 5509` and `server.strictPort: true` so a collision fails explicitly. Use the California DMV name in UI and document titles. Bundle fonts, icons, illustrations and styles locally and confirm the resulting `dist/` runs offline with Harbor's state API.
- [x] **Build the public portal and MyDMV frame.** Use the distinct layout in [DESIGN.md](DESIGN.md) and the official reference pages for service wording and workflow order. On desktop, place the California DMV wordmark and MyDMV utility above the primary navigation. Below, place the page title, three service shortcuts and a compact footer. Use the online services directory for a second path to all three workflows, with Renew, Apply/Request and Appointment groups. The mobile menu collapses at 760px, keeps the same destinations and returns focus to its trigger. Start signed in as the synthetic profile. MyDMV shows the signed-in name, DL/ID, Garage and transaction shortcuts. Use functional internal links and a read-only service directory search backed by local titles and keywords.
- [x] **Define stable deep links.** Use the route table below. Wrap every page in state and UI providers. Refresh direct `?sid=` links and confirmation URLs successfully. A start page or a clear empty view should appear when a valid URL lacks a required draft or record. Preserve previous-step form inputs and Back behavior during a wizard session, and avoid placing plate, VIN, address or contact values in URLs.
- [x] **Wire Harbor state once.** Copy `../../templates/dataManager.js` verbatim into `src/utils/dataManager.js` and import `stateApi(createInitialData)` from `../../templates/state-api.js` in `vite.config.js` (paths here are relative to the app root). Implement `src/data/seed.js` per [data model](assets/data_model.md). Await `loadState('california_dmv_mock', createInitialData)` before rendering routes and use a neutral loading view. Send one whole-state `saveState()` per successful user transaction from the store boundary after validating against current state. Keep UI drafts and read-only actions local to the UI. Guard duplicate commits. Keep `?sid=` on router navigation and use `withSid()` on links outside the router. Use the template's JSON `GET /go` response (`initial_state`, `current_state`, `state_diff`) in development and the equivalent Harbor endpoint on `dist/`.
- [x] **Render injected worlds and idle cleanly.** Use ID lookups with missing-record and missing-optional-field handling. Explicitly exercise empty, singleton and hundreds-of-record arrays, unknown confirmation IDs and a missing optional mailing address. Respect array replacement and object merge. Use `new Date()` for time-relative logic and ISO write timestamps. Read-only status, filters, help, idle and reload after the baseline load produce zero additional writes.
- [x] **Document and certify the implementation.** [SCHEMA.md](SCHEMA.md) documents the state and observable writes. `npm run build` passed. `python3 hub_tools/dyn_certify.py california_dmv` passed render, baseline sync, idle and hydration checks. Certification used a temporary factory layout because the adjacent checkout is read-only. The three seed workflows have `WORKFLOWS: PASS` in [TEST.md](TEST.md). Dev regression checks on port 5509 covered stale tabs, failed and ambiguous writes, credential hydration, and confirmation reload. The encoded renewal URL returned HTTP 200 on direct requests in the built Harbor runtime.

### Route table

| Path | View |
| --- | --- |
| `/`, `/portal/` | Home |
| `/portal/dmv-online/` | Online Services and local service search |
| `/portal/mydmv-account/` | MyDMV dashboard and Garage |
| `/portal/appointments/`, `/portal/appointments/select-appointment-type/` | Appointment types and manage entry. Resolve supported `option` values such as `CID` and `RDL` to an office visit flow. |
| `/portal/appointments/schedule/` | Local office → date and time → contact → review wizard. Accept the public capitalized `/portal/appointments/Schedule/` route too. |
| `/portal/appointments/appt-edit/` | View and cancel appointments |
| `/portal/appointments/confirmation/:id` | Saved appointment details |
| `/portal/locations/` | Field office finder and scheduling links |
| `/portal/vehicle-registration/vehicle-registration-renewal/` | Vehicle renewal introduction |
| `/wasapp/vrir/start%2Edo` | Vehicle identification → fees and address → cart → payment → review. Use the encoded dot in Harbor start URLs and fixtures. |
| `/portal/vehicle-registration/vehicle-registration-status/` | Renewal status lookup |
| `/portal/shopping-cart/` | Current local renewal draft and checkout entry |
| `/portal/vehicle-registration/receipt/:id` | Saved renewal receipt |
| `/portal/online-change-of-address-coa-system/` | Address change introduction |
| `/portal/mydmv-account/change-of-address/` | Targets → address → review |
| `/portal/mydmv-account/change-of-address/status/` | Signed-in address change history |
| `/portal/mydmv-account/change-of-address/status/:id` | Saved request, confirmation and status details |
| `/state`, `/post`, `/go` | Template endpoints serviced before frontend routing |

## P1 — Primary workflows

- [x] **Appointments — schedule an office visit or a drive test.** Use service selection to enter the wizard. Include first-time REAL ID, DL/ID application or renewal requiring an office visit, and automobile, commercial and motorcycle driving tests. Show compatible field offices as selectable cards with name, address and hours. Search by case-insensitive city, office name or ZIP prefix and expose a clear empty result. Show available dates and local morning/afternoon time slots. Require first and last name and phone, with optional email. Show office, service, date, time and contact on review. Confirm once, show a durable confirmation code and link to View Appointment. Treat occupied or past slots as unavailable and recheck the selected office, service and slot before saving. **Writes** one `appointments[]` record with `id`, `actorId`, `serviceType`, `officeId`, `slotId`, `date`, `time`, `timeZone`, `contact`, `confirmationCode`, `status: scheduled` and `createdAt`.
- [x] **Appointments — view and cancel.** Look up by first name, last name and phone, with optional email as an additional match when supplied. Normalize case and phone punctuation. Show matching appointment details and status with soonest upcoming first and history below it. Offer cancellation on an owned future scheduled appointment. Use an explicit confirmation dialog and return to the result with its status visible. Release capacity by deriving occupancy from scheduled appointments. Cancelling the same appointment twice or dismissing the dialog leaves the existing record intact. **Writes** the matched `appointments[id].status: cancelled` and `appointments[id].cancelledAt` in place.
- [x] **Registration renewal — identify, review and pay.** Enter License plate or CF number and VIN/HIN suffix, normalize case, validate format, and supply an expandable Show Me How panel. Distinguish no match, already renewed, no offer and missing insurance/smog where the requirements apply. For a match, show vehicle, current and proposed expiration, itemized fees and the confirmed mailing address. Link to Change Address when needed. Carry the draft into a one-item cart, show card or bank payment and itemize the mock card processing fee before review. Use built-in sample payment options and display the method on a durable receipt. Prevent repeat payment against the same renewal offer. **Writes in one transaction** one `registrationRenewals[]` record with `id`, `actorId`, `vehicleId`, `registrationId`, `offerId`, `previousExpirationDate`, `newExpirationDate`, `feeLines`, `subtotal`, `processingFee`, `total`, `paymentMethod`, `mailingAddress`, `confirmationCode`, `status: paid` and `createdAt`. Update the linked `registrations[id].expirationDate`, `.status: active`, `.renewalOffer: null` and `.lastRenewalId`.
- [x] **Registration renewal — check status.** Provide a plate/CF plus VIN/HIN suffix or registered owner lookup. Show the latest matching renewal with its saved status, confirmation code and receipt link. Offer helpful no-match and no-renewal states. Lookup, review, cancel-before-payment and print actions have no domain writes.
- [x] **Address change — submit for DL/ID, vehicle registration, or both.** Start from the public page or MyDMV. Show the current address for each eligible selected target. Allow up to three owned Garage vehicles with the same current address. Let the user enter a new residential address and optionally a distinct mailing address. Validate required fields, ZIP and state. Accept a PO box for mailing and require a street address for a residential or vehicle location field. Use the account eligibility flag and require a California residential address when the selected credential is a California CDL. Keep personal inputs in the wizard, offer edit links from review, and require explicit Submit. Show confirmation code, exact target list and processing guidance. **Writes** one `addressChangeRequests[]` record with `id`, `actorId`, `credentialId` (null for vehicle-only), `vehicleIds`, `registrationIds`, `previousAddresses`, `newResidentialAddress`, `newMailingAddress`, `confirmationCode`, `status: submitted` and `createdAt`. Use the request as the pending record while the confirmed credential and registration addresses continue to supply other services.
- [x] **Address change — check MyDMV status.** List the signed-in resident's requests newest first and open a summary by ID. Show affected products, confirmation, submission date and Submitted or Completed based on stored state. Seed both statuses and expose a concise empty state. Status lookup, summary printing and display of the processing estimate have no domain writes.

### Workflow verification

The store also writes an operation UUID with each confirmed booking, cancellation, payment and address change so a retry can recover a saved transaction. See [SCHEMA.md](SCHEMA.md#observable-state-changes-for-llm-evaluation).

| Workflow | Playwright path on `localhost:5509` | Required evidence |
| --- | --- | --- |
| Appointments | Pick a test service, filter for Sacramento, choose a future free slot, confirm and reload. Find it by saved contact, dismiss the first cancellation prompt and confirm the second. Reopen the date picker. | One new scheduled record after booking. Same record ID and confirmation after cancellation, with the new status and timestamp. The released slot is available again. |
| Registration renewal | Look up `8TYC214` / `24680`, review fees, select card and confirm. Reload the receipt and find it through status lookup. Attempt the same renewal again. | One $269.15 paid receipt and the linked registration changes, with no second payment. Test the bank fee calculation separately in a fresh session. |
| Address change | Select Maya's DL and two eligible Garage vehicles. Check rejection of a vehicle with a different current address and of a residential PO box. Enter a new street address and a mailing PO box, submit, then reload and open the saved request from MyDMV. | One submitted request with all three affected records, their previous-address snapshots and both proposed addresses. Status lookup preserves the recorded submission. |

Use separate test session IDs for the three rows. Check the baseline and exact writes against the [observable state table](assets/data_model.md#observable-state-changes) via `/go`. Exercise DL/ID-only and registration-only address selections, a missing renewal identifier, a blocked offer, and an appointment lookup that returns no results.

## P2 — Secondary features

- [x] **Office finder depth.** Add a standalone searchable office directory with service filters, hours, address and an appointment link that preselects an eligible office. Offer an offline list/map view with locally drawn pins keyed by office ID and region markers, sharing the selection state across modes. Office browsing is read-only.
- [x] **Service help.** Add expandable eligibility and before-you-begin guidance to the three introductions and an in-app print layout for receipts and request summaries. Link between related supported services. All these interactions are read-only.

## Data seed

- [x] Create **36 offices and at least 144 appointment slots** with fixed IDs. Cover Bay Area, Sacramento region, Central Valley, Los Angeles, Inland Empire, Orange County and San Diego. Include multiple offices for a city/ZIP search, office-level service differences, booked and available times and an office with no future times.
- [x] Create **48 vehicles and 48 linked registrations** across plausible synthetic owners. Give the default profile four Garage vehicles, three at the same confirmed address and one at a different address. Include due, expired and renewed records, eligible passenger vehicles, a trailer with no insurance requirement, one short vessel HIN, one insurance block and one smog block. Include at least one eligible due vehicle in the default Garage and make its synthetic plate and VIN suffix discoverable there.
- [x] Create **36 appointments, 36 renewal receipts and 36 address change requests** with fixed IDs, time-distributed synthetic history, searchable confirmation codes and mixed statuses. Give the default profile an upcoming booking that can be managed, prior receipts and both submitted and completed requests. Include one accessible positive fixture and an actionable error path in every workflow. See [fixture requirements](assets/data_model.md#fixture-requirements).

## Out of scope

Authentication, identity verification, real payments, mail or SMS delivery, remote location services, government integrations, credential issuance, voter registration submissions and placard address change. The simulated services use the data and state endpoints defined by Harbor.
