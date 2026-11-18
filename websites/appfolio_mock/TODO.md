# AppFolio — TODO

> Status: READY FOR CERTIFICATION  
> Last updated by plan agent on 2026-11-18  
> [Design](DESIGN.md) · [Workflow research](assets/README.md) · [Data model](assets/data_model.md)

## Status legend

- [ ] Open
- [~] In progress
- [x] Done

## P0 — Shell and Harbor

- [x] **Vite and React.** Scaffold in this directory, keep the npm lockfile, and configure the dev server for port `5439` with strict port binding. Use same-origin links and bundle all assets. The browser title is AppFolio Property Manager. Verify `npm run build` and direct entry to a nested route in the built app.
- [x] **State and API.** Copy `templates/dataManager.js` unchanged into `src/utils/dataManager.js` and wire the unchanged `templates/state-api.js` plugin with the `createInitialData` export from `src/data/seed.js`. Await `loadState('appfolio', createInitialData)` before rendering routes. After boot, only a successful user-initiated business action may call `saveState`, once with the complete updated state through a shared store action. Keep /state, /post and /go as template HTTP endpoints. An idle tab, navigation, filters, invalid forms and canceled dialogs must write no state.
- [x] **Shell and routing.** Start pre-signed-in as property manager Jordan Ellis at Cedarline Property Services. Provide Overview, Properties, Leases, Work Orders and Rent navigation with the layout in DESIGN.md. Use the list and detail routes below, preserve `sid` across all navigation and reloads, and use `withSid()` for links leaving the SPA router. Handle missing records with a safe link back to the list. Provide a readable loading state and put all routes inside their required providers.
- [x] **Deterministic seed and injection.** Use fixed IDs and the record counts in the data model. Handle empty, singleton and large injected arrays, optional fields and unresolved references. Preserve unknown injected data in the whole-state write. Use the runtime clock for relative dates, and do not write derived values on boot or on date changes.
- [x] **Verifier handoff.** Write implementation-aligned `SCHEMA.md` with all top-level keys, record shapes and an **Observable State Changes** table specifying exact fields and linked IDs for each mutation. Check on localhost with separate session IDs for baseline, injection, mutation and isolation. Run the checklist below in Playwright, then document the observed state changes and results in `TEST.md` during the test phase.

## P1 — Core workflows

- [x] **Overview** (`/`). Show property and unit counts, leases ending in the next 30 days, active work orders and outstanding rent. Provide up to five urgent open orders and up to five upcoming lease expirations, with links to detail and filtered lists. Use the same selectors as the destination screens. **State writes** — none.
- [x] **Properties** (`/properties`, `/properties/:id`). Search by name, address or city. Filter by type and status, and sort by name or city. Each row shows address, type, active unit count and occupied unit count. Details show address, notes, units and linked leases and work orders. **Add property** and **Edit property** open labeled forms for name, address, type, status and notes. **Add unit** and **Edit unit** on the detail page capture the label, beds, baths, market rent, rent-ready flag and status. Require a unique unit label within that property and prevent archiving property/unit records while a current or future non-ended lease is linked. **State writes** — append or update `properties[]` and `units[]` with the fields in the data model, including `units[].propertyId` and audit metadata. Occupancy is derived from leases.
- [x] **Leases** (`/leases`, `/leases/:id`). Search by resident, property or unit. Filter by property and phase, including an Ends within 30 days view, and sort by end date. Show resident, unit, term, monthly rent and phase, and link details to the property and rent ledger. **New lease** lets the user select an active property and unit and enter resident name, optional email, term, rent and deposit. **Edit lease** updates resident/contact and term amounts. **Renew lease** defaults to the day after the original end date and creates a linked successor while retaining the original term. **End lease** records the confirmed end date and reason. Reject invalid dates, negative amounts, inactive locations and overlapping periods on a unit. **State writes** — append or update `leases[]`; a renewal appends `renewedFromLeaseId`, and ending sets `endedOn` and `endReason` on the original lease. Use audit metadata for each action.
- [x] **Work orders** (`/work-orders`, `/work-orders/:id`). Search by order ID, summary or address. Filter by property, priority and status, and sort by newest or priority. Show title, location, assignee, scheduled date and status. **New work order** accepts a property, optional unit, summary, description, category, priority and permission to enter. **Edit work order** updates intake fields. From detail, support **Assign**, **Schedule**, **Start work**, **Complete**, and **Cancel**, with the transitions and checks in the data model. **State writes** — append or update `workOrders[]`; each status action updates `status` and its corresponding assignee, schedule or completion field(s), appends a structured `history[]` event, and updates audit metadata.
- [x] **Rent** (`/rent`, `/rent/:leaseId`). Show one ledger per lease, with monthly rent, charges, receipts and outstanding amount. Search resident, property or unit, filter by property and balance, and sort by balance or resident. Ledger detail shows transaction date, type, description, amount and running balance, with a link to the lease. **Post charge** creates a positive rent or fee charge for a lease with description, posting date and due date. **Record payment** selects an open charge for that lease and records a full or partial payment with date, method and optional reference. Validate positive cents and prevent payment above that charge's outstanding balance. **State writes** — append to `rentCharges[]` or `rentPayments[]`, both with `leaseId` and audit metadata. Payments store `chargeId`, amount, method and status. Balances and paid/partial/overdue labels derive from the records.

## P2 — Optional

No P2 features are required for the seed. Finish and verify every P0 and P1 item first.

## Data seed

- [x] Implement the fixed inventory in [the data model](assets/data_model.md#seed-inventory), with English names, varied properties, terms and due dates, and enough records for meaningful filtering across all four workflows.

## Playwright handoff

Use the Node Playwright installation from `PILOT_PLAYWRIGHT` and installed Chromium. Start any persistent Vite process with `Start-Process -WindowStyle Hidden`, an absolute Vite entry point, and the target site as its working directory. Run browser and API checks only against localhost port 5439. Keep scratch scripts gitignored or remove them.

1. Create and edit a property, add and edit a unit, clear filters to find both, then reload and inspect `current_state.properties` and `current_state.units` from `GET /go?sid=…`.
2. Create a lease on the new unit, edit rent, renew and end the original term without overlapping the successor. Check both `leases` records, the renewal link, the end metadata and exclusion of invalid overlapping saves.
3. Create a work order for the unit, assign, schedule, start and complete it. Check fields and history in `workOrders`. Also cancel a separate open order and verify the cancellation fields.
4. Post a charge on the lease and record partial then final payments. Check `rentCharges` and `rentPayments` links and amounts, derived balances after each write, and that an overpayment makes no state change.
5. Open each detail directly with a fresh browser context and reload it. Inject empty arrays, a singleton with missing optional data, and large lists under separate session IDs. Check the default world in a separate session and verify zero idle or read-only posts after the baseline settles.

## Out of scope

Authentication, resident and vendor portals, real payments or bank data, external communications, applicant screening, document signatures, and production services are outside this exercise. The parent runner handles Docker certification and commits after the testing phase.
