# Rippling Harbor state model

This is the proposed shape for `createInitialData()` and `SCHEMA.md`. Keep these eleven top-level keys when saving. Retain additional injected keys. Unresolved cross-record links display the available ID. Optional values may be absent in injected records. Use array and field fallbacks in views without writing normalized data during load or render.

## Top-level keys and example records

The examples below show JSON-shaped records. IDs and labels are strings, dates use `YYYY-MM-DD`, action timestamps are UTC ISO strings, and quantities are numbers. Monetary values are USD numbers in dollars, rounded to two decimal places. Calculate totals in integer cents and convert back to dollars for storage. Use `null` for intentionally empty links and dates. Generate new unique IDs at confirmed submission and keep seed IDs fixed.

### `company` object and `actor` object

```json
{
  "company": {"id":"co_juniper","name":"Juniper Works","currency":"USD"},
  "actor": {"id":"acct_maya","name":"Maya Chen","role":"Workspace administrator"}
}
```

The signed-in actor is a synthetic account identity independent of the employee array. Write `actor.id` into new business records as `actorId`. Use the seeded actor as a display and attribution fallback when an injected actor omits its identifier.

### `employees` array

```json
{
  "id":"emp_014","name":"Nora Patel","workEmail":"nora.patel@juniper.example",
  "jobTitle":"Product Designer","department":"Design","location":"New York",
  "employmentType":"full_time","status":"active","managerId":"emp_004",
  "startDate":"2024-06-10","endDate":null,"endReason":null,
  "actorId":"acct_maya","createdAt":"2024-05-20T14:00:00.000Z","updatedAt":null
}
```

Employment types are `full_time`, `part_time` and `contractor`. Statuses are `active` and `terminated`. Manager is nullable and points to an employee. Guard against self-selection and management cycles. Ending employment changes the profile and preserves its linked history. Existing device assignments stay accessible to IT for explicit return or transfer.

### `employeeChanges` array

```json
{
  "id":"ech_012","employeeId":"emp_014","action":"edited","status":"active",
  "changes":{"jobTitle":{"previous":"Associate Product Designer","next":"Product Designer"}},
  "actorId":"acct_maya","createdAt":"2025-08-11T16:45:00.000Z"
}
```

Actions are `created`, `edited` and `terminated`. `status` is the resulting employee status. For creation, capture initial business fields in `changes` with `previous: null`. For updates, record the actual changed business fields, using null for cleared optional values. Leave an unchanged form submission out of history.

### `devices` array

```json
{
  "id":"dev_023","assetTag":"JW-1023","serial":"JNW6M023","model":"ThinkPad T14",
  "category":"laptop","condition":"good","location":"New York","status":"assigned",
  "assignedEmployeeId":"emp_014","actorId":"acct_maya",
  "createdAt":"2025-01-08T15:00:00.000Z","updatedAt":"2025-02-10T18:30:00.000Z"
}
```

Categories are `laptop`, `desktop` and `tablet`. Conditions are `new`, `good` and `fair`. Statuses are `available`, `assigned` and `retired`. Normalize tag and serial for case-insensitive uniqueness. Show the current assignee from `assignedEmployeeId` and use the assignment collection for history.

### `deviceAssignments` array

```json
{
  "id":"das_019","deviceId":"dev_023","previousEmployeeId":null,
  "nextEmployeeId":"emp_014","action":"assigned","status":"assigned",
  "actorId":"acct_maya","createdAt":"2025-02-10T18:30:00.000Z"
}
```

Actions are `assigned`, `reassigned` and `unassigned`. `status` is the resulting inventory status. An unassignment records `nextEmployeeId: null` and `status: "available"`. A reassignment records both employee IDs in one event.

### `ptoRequests` array

```json
{
  "id":"pto_017","employeeId":"emp_014","type":"vacation",
  "startDate":"2026-11-23","endDate":"2026-11-24","hours":16,
  "note":"Family visit","status":"pending","actorId":"acct_maya",
  "createdAt":"2026-11-16T17:00:00.000Z","updatedAt":null
}
```

Types are `vacation`, `sick` and `personal`. Statuses are `pending`, `approved`, `declined` and `cancelled`. For this dataset, count eight hours per weekday in the inclusive date range using calendar-date arithmetic. Check overlap against pending and approved ranges for the employee regardless of type. Check balance availability at approval. Declined and cancelled requests stay visible as history.

### `ptoBalances` array

```json
{
  "id":"bal_014_vac","employeeId":"emp_014","type":"vacation",
  "allocatedHours":120,"usedHours":32
}
```

There is at most one balance per employee and type. Remaining hours are derived as allocated minus used. For an approved request with an incomplete injected balance row, return a clear validation message if its cancellation would require an unavailable row or result in negative used hours. Pending cancellation never adjusts the balance.

### `ptoActions` array

```json
{
  "id":"pac_018","requestId":"pto_017","employeeId":"emp_014","action":"approved",
  "status":"approved","hours":16,"balanceDeltaHours":16,"note":null,
  "actorId":"acct_maya","createdAt":"2026-11-18T16:00:00.000Z"
}
```

Actions are `approved`, `declined` and `cancelled`. `balanceDeltaHours` measures the change to used hours, positive for approval, negative for reversal and zero for actions that leave balance unchanged. A decline note stores the reason. Initial submission is observable directly on the request.

### `payrollRuns` array

```json
{
  "id":"pay_026","name":"November 2026 bonus","type":"off_cycle","status":"draft",
  "periodStart":"2026-11-01","periodEnd":"2026-11-15","payDate":"2026-11-20",
  "currency":"USD","actorId":"acct_maya","createdAt":"2026-11-16T16:00:00.000Z",
  "updatedAt":null,"approvedBy":null,"approvedAt":null,
  "lineItems":[{"id":"pl_026_014","employeeId":"emp_014","baseGross":0,
    "bonus":1500,"gross":1500,"taxes":330,"deductions":20,"net":1150}],
  "totals":{"gross":1500,"taxes":330,"deductions":20,"net":1150}
}
```

Types are `regular` and `off_cycle`. Statuses are `draft` and `approved`. A run has one line per selected employee. `gross` is base gross plus bonus. `net` is gross minus taxes and deductions. Run totals sum the corresponding line fields and headcount is derived from the line array. Amount fields use synthetic values entered by the operator. Keep historical participants linked by ID even if their employment later ends.

### `payrollActions` array

```json
{
  "id":"pya_026","runId":"pay_026","action":"created","status":"draft",
  "employeeIds":["emp_014"],"totals":{"gross":1500,"taxes":330,"deductions":20,"net":1150},
  "actorId":"acct_maya","createdAt":"2026-11-16T16:00:00.000Z"
}
```

Actions are `created`, `edited` and `approved`. `employeeIds` lists all included employees at creation or approval and affected employees for a draft line edit. Store totals as a snapshot in each event. Approval attribution fields use the same actor and timestamp as the event.

## Observable state changes

| Confirmed user action | Fields visible through `/go` |
| --- | --- |
| Add employee | Append `employees[]` and `employeeChanges[]` with `action=created`. |
| Edit employee | Update edited profile fields and `employees[].updatedAt`. Append `employeeChanges[]` with previous and next values. |
| End employment | Update `employees[].status`, `endDate`, `endReason` and `updatedAt`. Append `employeeChanges[]` with `action=terminated`. |
| Add device | Append `devices[]` with `status=available`, actor, creation time and null assignee. |
| Assign, reassign or unassign | Update `devices[].assignedEmployeeId`, `status` and `updatedAt`. Append matching `deviceAssignments[]` history. |
| Request time off | Append `ptoRequests[]` with `status=pending`, employee ID, type, range, hours, note, actor and creation time. |
| Approve time off | Set `ptoRequests[].status=approved` and update `updatedAt`. Increase matching `ptoBalances[].usedHours` and append `ptoActions[]` with the positive delta. |
| Decline time off | Set `ptoRequests[].status=declined` and update `updatedAt`. Append `ptoActions[]` with reason and zero delta. |
| Cancel time off | Set `ptoRequests[].status=cancelled` and update `updatedAt`. Append `ptoActions[]`. An approved request also decreases matching `ptoBalances[].usedHours` and records a negative delta. |
| Create payroll draft | Append `payrollRuns[]` with initial line items, totals, `status=draft`, actor and creation time. Append `payrollActions[]` with `action=created`. |
| Edit draft earnings | Update `payrollRuns[].lineItems`, `totals` and `updatedAt`. Append `payrollActions[]` with `action=edited`. |
| Approve payroll | Set `payrollRuns[].status=approved`, `approvedBy`, `approvedAt` and `updatedAt`. Append `payrollActions[]` with `action=approved`. |

A rejected validation, cancelled confirmation, unchanged edit, already applied decision or read-only review leaves Harbor state untouched. Recheck the applicable status and related records at commit time. Save all records associated with one successful action together.

## Seed coverage

| Collection | Default coverage |
| --- | --- |
| Employees | 48 or more. Six departments, four locations, all employment types, multiple managers, a few terminated staff and several active employees without assigned devices. |
| Devices | 56 or more. Mix MacBook, ThinkPad, Dell and Surface models across categories and conditions, with at least 12 available and some retired. Match every assigned device to an employee. |
| PTO | 48 or more requests across four statuses and three types, including multiple pending requests with sufficient balance and approved requests that can be cancelled. Seed at least 100 employee/type balance rows. Include every approved request in seeded used hours. |
| Payroll | 26 or more runs covering regular and off-cycle cases, with several editable drafts and varied line counts. Keep seeded run totals equal to line totals. |
| Histories | Include representative changes in each history array, with IDs and timestamps consistent with parent records. Leave all baseline values deterministic. |

Use stable prefixes such as `emp_`, `dev_`, `pto_` and `pay_`. Make dates broad enough for list filters and historical views. Use fixed amounts, dates, names and IDs across fresh sessions. Use the runtime clock only for relative labels and committed user actions.

