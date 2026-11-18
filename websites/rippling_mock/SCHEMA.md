# rippling_mock Schema

- **Base URL** `http://localhost:5395/`
- **Go endpoint** `GET /go?sid=<sid>` returns `initial_state`, `current_state`, and `state_diff`.
- **Inject** `POST /post?sid=<sid>` with `{"action":"set","state":{...}}`.
- **Reset** `POST /post?sid=<sid>` with `{"action":"reset"}` restores the session baseline on the server.

On the first load for a session in a browser profile, the app merges injected objects over defaults and replaces injected arrays in full. The app retains additional injected keys and record fields when it saves. Use `current_state` to read the current records and a fresh session ID for a new injected world.

IDs are strings and the default IDs are fixed. Calendar dates use `YYYY-MM-DD`. `createdAt` and populated `updatedAt` and `approvedAt` are UTC ISO 8601 timestamps. Unfilled relationships and optional record fields created by the app use `null`. An injected record may omit fields. USD amounts are numbers stored in dollars with cent precision. Hours are numbers.

## State Schema

| Top-level key | Shape |
| --- | --- |
| `company` | Object with `id`, `name`, `currency` (USD). |
| `actor` | Object with `id`, `name`, `role`. New action records use its ID, with `acct_maya` as the fallback. |
| `employees[]` | `id`, `name`, `workEmail`, `jobTitle`, `department`, `location`, `employmentType` (full_time, part_time, contractor), `status` (active, terminated), `managerId` (employee ID or null), `startDate`, `endDate`, `endReason`, `actorId`, `createdAt`, `updatedAt`. |
| `employeeChanges[]` | `id`, `employeeId`, `action` (created, edited, terminated), resulting `status`, `changes` (object keyed by changed field, each value has `previous` and `next`), `actorId`, `createdAt`. |
| `devices[]` | `id`, `assetTag`, `serial`, `model`, `category` (laptop, desktop, tablet), `condition` (new, good, fair), `location`, `status` (available, assigned, retired), `assignedEmployeeId`, `actorId`, `createdAt`, `updatedAt`. |
| `deviceAssignments[]` | `id`, `deviceId`, `previousEmployeeId`, `nextEmployeeId`, `action` (assigned, reassigned, unassigned), resulting `status`, `actorId`, `createdAt`. Either employee ID may be null. |
| `ptoRequests[]` | `id`, `employeeId`, `type` (vacation, sick, personal), `startDate`, `endDate`, `hours` (eight per inclusive weekday), `note`, `status` (pending, approved, declined, cancelled), `actorId`, `createdAt`, `updatedAt`. |
| `ptoBalances[]` | `id`, `employeeId`, `type`, `allocatedHours`, `usedHours`. Employee and type identify the matching balance. Remaining hours are calculated from allocated minus used. |
| `ptoActions[]` | `id`, `requestId`, `employeeId`, `action` (approved, declined, cancelled), resulting `status`, `hours`, `balanceDeltaHours`, `note`, `actorId`, `createdAt`. |
| `payrollRuns[]` | `id`, `name`, `type` (regular, off_cycle), `status` (draft, approved), `periodStart`, `periodEnd`, `payDate`, `currency`, `actorId`, `createdAt`, `updatedAt`, `approvedBy`, `approvedAt`, `lineItems[]`, `totals`. |
| `payrollActions[]` | `id`, `runId`, `action` (created, edited, approved), resulting `status`, `employeeIds[]`, `totals`, `actorId`, `createdAt`. |

Each payroll line has `id`, `employeeId`, `baseGross`, `bonus`, `gross`, `taxes`, `deductions`, and `net`. Gross is base gross plus bonus. Net subtracts taxes and deductions from gross. The `totals` object has `gross`, `taxes`, `deductions`, and `net`, summed in cents. Headcount is the number of lines.

### Default IDs

| Records | Default IDs |
| --- | --- |
| Company and actor | `co_juniper` and `acct_maya` |
| Employees and employee changes | `emp_001`–`emp_048` and `ech_001`–`ech_004` |
| Devices and assignments | `dev_001`–`dev_056` and `das_001`–`das_035` |
| PTO requests, balances, and decisions | `pto_001`–`pto_048`, `bal_<employee index>_<type>` (e.g. `bal_1_vacation`), and `pac_001`–`pac_040` |
| Pay runs, lines, and actions | `pay_001`–`pay_026`, `pl_<run index>_<line index>` (e.g. `pl_1_1`), and `pya_001`–`pya_048` |

## Minimal Inject Example

The following `state` creates a company with one employee and empty operational collections. Omitted fields in the employee profile display fallback values.

```json
{
  "company": {"name": "Lakefront Design"},
  "employees": [{"id": "emp_lake_1", "name": "Jamie Torres", "status": "active"}],
  "employeeChanges": [],
  "devices": [],
  "deviceAssignments": [],
  "ptoRequests": [],
  "ptoBalances": [],
  "ptoActions": [],
  "payrollRuns": [],
  "payrollActions": []
}
```

## Observable State Changes

| Confirmed user action | Fields written |
| --- | --- |
| Add employee | Append an active `employees[]` record and an `employeeChanges[]` event with `action=created` and `previous: null` for each initial business field. |
| Edit employee | Update changed profile fields and `employees[].updatedAt`. Append `employeeChanges[]` with `action=edited` and the previous and next values of each changed field. |
| End employment | Update `employees[].status=terminated`, `endDate`, `endReason`, and `updatedAt`. Append an `employeeChanges[]` termination event and retain the employee's linked records. |
| Add device | Append a `devices[]` record with `status=available`, null `assignedEmployeeId`, actor, and creation timestamp. |
| Assign device | Update `devices[].assignedEmployeeId`, `status=assigned`, and `updatedAt`. Append `deviceAssignments[]` with `action=assigned`, null previous employee, and the new holder. |
| Reassign device | Set the new holder, assigned status, and update timestamp on the device. Append `deviceAssignments[]` with `action=reassigned` and both employee IDs. |
| Unassign device | Set null holder, available status, and update timestamp on the device. Append `deviceAssignments[]` with `action=unassigned`, the previous holder, and null next employee. |
| Request time off | Append a `ptoRequests[]` record with the employee, type, dates, calculated hours, note, `status=pending`, actor, and timestamp. |
| Approve time off | Set `ptoRequests[].status=approved` and `updatedAt`. Increase the matching `ptoBalances[].usedHours` by the request hours. Append `ptoActions[]` with `action=approved` and positive `balanceDeltaHours`. |
| Decline time off | Set decline status and update timestamp on the request. Append `ptoActions[]` with `action=declined`, the required reason in `note`, and zero `balanceDeltaHours`. |
| Cancel time off | Set cancellation status and update timestamp on the request. Append `ptoActions[]` with `action=cancelled`. For approved leave, subtract original hours from the matching `ptoBalances[].usedHours` and log the negative delta. For pending leave, log a zero delta. |
| Create payroll draft | Append a `payrollRuns[]` record with metadata, line items, totals, `status=draft`, actor, and timestamp. Append `payrollActions[]` with `action=created`, all participant IDs, and a totals snapshot. |
| Edit payroll draft | Update `payrollRuns[].lineItems`, `totals`, and `updatedAt`. Append `payrollActions[]` with `action=edited`, known affected participant IDs, and a totals snapshot. Removing an incomplete line without an employee ID can produce an empty `employeeIds` array. A totals-only reconciliation attributes the edit to all included participants. |
| Approve payroll | Set `payrollRuns[].status=approved`, `approvedBy`, `approvedAt`, and `updatedAt`. Append `payrollActions[]` with `action=approved`, all participant IDs, and a totals snapshot. |

An event shares the actor and action timestamp with the business change it records. One successful action saves one complete snapshot. Rejected validations, unchanged edits, current-holder reassignment, dismissed confirmations, payroll review, and view controls leave persisted state untouched.
