# Rippling workflow research

The account serves People Operations, IT inventory administrators, leave reviewers and payroll operators at the fictional Juniper Works organization. Maya Chen is the seeded signed-in administrator. The common link between modules is the employee record, which identifies device holders, time-off requesters and payroll participants.

## Public product references

- HRIS centralizes job, department, employment type, manager, work email and start date. People Operations can add employees and maintain the directory. [Rippling HRIS](https://www.rippling.com/products/hr/hris) · [Worker field reference](https://developer.rippling.com/documentation/rest-api/guides/worker-field-access)
- Inventory operations use device status, condition and location to find stock and assign, unassign or reassign it. [Rippling inventory management](https://www.rippling.com/products/it/inventory-management)
- A time-off request starts pending and can be approved or declined. Approval changes the available balance. Keep request history useful across those decisions. [Rippling developer workflow examples](https://developer.rippling.com/documentation/js-sdk/common-tasks) · [Rippling leave approval and balance behavior](https://www.rippling.com/blog/hr-processes-that-you-should-automate)
- Payroll operators create and review pay runs, including off-cycle runs, and check earnings, taxes and deductions before approval. [Rippling Payroll](https://www.rippling.com/products/payroll) · [Off-cycle payroll overview](https://www.rippling.com/blog/rippling-payroll-review)

## Views and workflow priorities

| Priority | View | Persona and interaction |
| --- | --- | --- |
| P0 | Overview | Any operator can scan four module summaries, then jump to a pending request, a draft payroll run or a module list. |
| P0 | Shell and state | Any operator can open a deep link, refresh or work in an isolated Harbor session. |
| P1 | Employees | People Operations searches the directory, adds or edits a profile, reviews related records and ends employment while retaining history. |
| P1 | Devices | IT searches inventory, registers a unit, checks its holder and confirms assignment, reassignment or return. |
| P1 | Time Off | An administrator submits leave for an employee, checks balances and decides or cancels a request. |
| P1 | Payroll | Payroll creates a draft, adjusts a line, reconciles totals in Review and approves the run. |
| P1 | Verification | Follow the action-to-record mapping in [data_model.md](data_model.md) and the acceptance scenarios in [TODO.md](../TODO.md). |
| P2 | Calendar | Leave reviewers can see approved dates in a month and open a request. |

Each module uses a searchable list or tabbed view, a direct detail route and clearly labelled action forms. The original layout, visual assets and style tokens are specified in [DESIGN.md](../DESIGN.md). Product references inform the workflows and field names.

## Data and scope

Use fixed English synthetic data. Keep employee, device, leave and payroll records linked by stable IDs. Keep history records structured so Harbor can verify the result of an action independently of the UI. See [data_model.md](data_model.md).

The account begins signed in. Authentication, external account integration, real payroll transfers and physical device fulfillment are outside the synthetic workflow scope.

