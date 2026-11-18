# Rippling account workspace — TODO

> Status — VERIFIED LOCALLY  
> Updated by the plan agent on 2026-11-18  
> See [research](assets/README.md), [data model](assets/data_model.md) and [design](DESIGN.md).

## Status legend

- [ ] Not started
- [~] In progress
- [x] Done

## P0 — Shell and Harbor runtime

- [x] **Scaffold and serve.** Use Vite and React with a lockfile and strict localhost port 5395 for dev and preview. Register the unchanged root template `stateApi(createInitialData)` in Vite and copy `templates/dataManager.js` unchanged to `src/utils/dataManager.js`. The middleware serves JSON at `/state`, `/post` and `/go`. Run `npm run build`.
- [x] **Load and persist.** Show neutral loading while awaiting `loadState(APP, createInitialData)` before rendering routes. Centralize `saveState(APP, nextState)` once per successful user business action, updating related records in a single snapshot. Preserve unknown injected keys and untouched fields. Form drafts, sorting, filters and other view state stay in memory or the URL. Use `new Date()` for current-relative labels and action timestamps. Idle tabs issue zero writes.
- [x] **Navigation.** Implement the top navigation and workspaces in [DESIGN.md](DESIGN.md). Provide `/`, `/employees`, `/employees/:employeeId`, `/devices`, `/devices/:deviceId`, `/time-off`, `/time-off/:requestId`, `/payroll` and `/payroll/:runId`. Nest all routes in required providers. Preserve `?sid=` on router navigation and use `withSid()` for links outside the router. Support direct loads, reloads and a return link for missing records.
- [x] **Injected worlds.** Cover empty, single-record, large and partial datasets. Derive filter options and counts from available records, fall back to related IDs when labels are unavailable, and explain disabled actions when required records are missing. Offer accessible keyboard navigation, validation messages and focus restoration.

## P1 — Required workflows

- [x] **Employees.** Search name, email and title. Filter department, status and employment type, and sort name or start date. Show linked devices and time-off requests in the employee detail. Add and edit name, work email, title, department, location, employment type, start date and optional manager. Validate required fields, case-insensitive unique work email and valid manager and dates. Confirm end employment with date and optional reason. Creation appends `employees[]`. Editing updates profile fields and `updatedAt`. Ending writes `status`, `endDate`, `endReason` and `updatedAt`. Each action appends `employeeChanges[]` with employee ID, actor, status, timestamp and changed values.
- [x] **Devices.** Search asset tag, serial, model and assignee. Filter category, status and location. Show current holder and assignment history. Add device collects asset tag, serial, model, category, condition and location and validates unique tag and serial. It appends `devices[]` with available status and a null assignee. Assign or Reassign selects an active employee. Confirm both transfers and unassignments. Each move updates `devices[].status`, `assignedEmployeeId` and `updatedAt`, and appends `deviceAssignments[]` with device ID, previous and next employee IDs, action, status, actor and timestamp. Retired devices cannot be assigned. Choosing the current holder leaves state untouched.
- [x] **PTO.** Show Requests and Balances. Filter requests by employee, type and status and sort by start date. Show allocated, used and remaining hours. New request selects employee, type and inclusive dates with a weekday-hours preview and optional note. Validate date order, at least one weekday and no overlap with pending or approved employee requests. Submission appends `ptoRequests[]` with dates, hours, initial pending status, actor and timestamp. Approve or decline pending requests, requiring a decline reason. Confirm cancellation of pending or approved requests. Decisions update request `status` and `updatedAt` and append `ptoActions[]` with request and employee IDs, affected hours, actor, status, timestamp and optional note. Approval increases `ptoBalances[].usedHours` after checking available balance. Cancelling approved leave decreases used hours by the original request hours. A missing balance prevents approval.
- [x] **Payroll.** Search name, filter status and type, and show period, pay date, headcount and gross. Create regular or off-cycle draft with name, period start/end, pay date and one or more unique active employees. Capture per-person base gross, taxes, deductions and optional bonus. Require ordered dates, pay date on or after period end, nonnegative money and nonnegative net. Creation appends `payrollRuns[]` with draft status, line items, totals, actor and timestamp. Editing a draft saves `lineItems`, `totals` and `updatedAt`. Review shows gross, taxes, deductions and net before confirmation. Approve payroll writes `status: "approved"`, `approvedBy`, `approvedAt` and `updatedAt`. Approved runs are read-only. Each step appends `payrollActions[]` with run ID, affected employee IDs, monetary totals, actor, status and timestamp. Keep all payroll actions inside the synthetic account.
- [x] **Verifier evidence.** Write `SCHEMA.md` with every top-level key and an Observable State Changes table tied to implementation. Use Node Playwright from `PILOT_PLAYWRIGHT` and installed Chromium on localhost port 5395. Start persistent Vite from the site directory using `Start-Process -WindowStyle Hidden` and an absolute Vite entry point. Keep test scratch ignored or remove it. Exercise every business action in the data model's Observable State Changes table and assert exact `/go?sid=...` records, including reversals and duplicate-action guards. Check deep links, reload, separate sessions, injected empty/single/large/partial worlds, idle network and the build. Document outcomes and modified fields in `TEST.md` for the parent runner's Docker certification.

## P2 — Optional depth

- [x] **Time-off calendar.** Derive a month view from approved requests with employee and type filters and links to request details. Month navigation stays in view state.

## Data seed

- [x] Seed at least 48 employees, 56 devices, 48 PTO requests, 100 employee/type balance rows and 26 payroll runs. Use fixed IDs and dates, coherent links, varied statuses and several actionable pending requests and payroll drafts. See the [coverage matrix](assets/data_model.md).

## Out of scope

- Authentication, real payments, tax filings, device ordering and remote operations.
- External services and network resources at app runtime. Harbor provides the persistence interface.

