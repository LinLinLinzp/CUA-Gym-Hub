# Workflow research

AppFolio Property Manager combines portfolio records with leasing, maintenance and accounting. This local workspace represents a staff account at Cedarline Property Services with synthetic English data. The design of the interface, layout and visuals is specified in [DESIGN.md](../DESIGN.md).

## Staff workflows

| Staff role | Typical task |
| --- | --- |
| Portfolio manager | Find a property, add a unit and review its current occupancy and maintenance |
| Leasing coordinator | Check term expirations, create a lease for an available unit and record a renewal |
| Maintenance coordinator | Triage a request, assign a vendor, schedule it and record completion |
| Receivables specialist | Post rent charges, record partial or full receipts and reconcile open balances |

The workspace opens under one staff account so the user can carry work across these roles without switching accounts.

## Feature inventory

| Priority | View | Planned behavior |
| --- | --- | --- |
| P0 | Account shell | Horizontal section navigation, pre-signed-in staff identity, SID-preserving detail links and session state |
| P1 | Overview | Counts and open balances with direct entry to urgent work orders and upcoming expirations |
| P1 | Properties | Searchable property register and unit lists. Property detail links to associated leases and work orders. Add and edit actions live in the page header and on the units section. |
| P1 | Leases | Filterable term register with resident, property, unit and rent. A detail view groups dates and amounts with edit, renew and end actions. |
| P1 | Work Orders | Priority and status queues open into a location and issue summary, action controls and chronological history. |
| P1 | Rent | Account balance register opens to a dated lease ledger with post-charge and record-payment actions. |

See [TODO.md](../TODO.md) for acceptance criteria and state writes. The [data model](data_model.md) links properties to units and lease terms, work orders to a location and assignee, and payments to the charges they settle.

## Public product references

- Properties and units have separate IDs. Occupancy records connect leases to residents and unit locations. The public ledger model associates charges and payments with occupancy. The local model uses each lease ID as the ledger key. [AppFolio Stack API reference](https://www.appfolio.com/stack/partners/api)
- Work management spans intake, assignment, scheduling and completion. Location, priority, permission to enter, vendor and schedule fields give the local workflow enough detail for realistic triage. [AppFolio maintenance](https://www.appfolio.com/property-manager/maintenance)
- Leasing spans initial agreements and renewals. The staff workflow here records structured terms and keeps the original term linked to its successor. [AppFolio leasing](https://www.appfolio.com/property-manager/marketing-leasing) · [AppFolio renewal guidance](https://www.appfolio.com/blog/leasing-kpis-every-property-manager-should-track)
- Accounting and rent collection are part of the main management product. A per-lease ledger with local receipt recording covers the seed's rent workflow. [AppFolio accounting and reporting](https://www.appfolio.com/property-manager/accounting-reporting) · [AppFolio rental accounting](https://www.appfolio.com/rental-accounting-automation)

The local scope is limited to staff recordkeeping for the four seed workflows. Authentication, production accounts, banking, signatures and portal communications require separate systems and are outside that scope.
